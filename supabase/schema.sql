-- MathQuest friends: run this once in your Supabase project's SQL Editor.
-- Design: every device signs in anonymously; each kid profile is a row owned by that sign-in.
-- Tables are locked down with row-level security and NO direct table policies: the app can only
-- reach data through the functions below, which check ownership and reveal the minimum
-- (a friend's display name, colour, track, streak and XP; never who owns them).

create extension if not exists pgcrypto;

-- ---------- Friend codes: 6 characters, no look-alikes (0/O, 1/I/L) ----------
create or replace function public.new_friend_code() returns text
language plpgsql volatile set search_path = public, extensions as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  out text := '';
  b bytea := gen_random_bytes(6);
begin
  for i in 0..5 loop
    out := out || substr(alphabet, (get_byte(b, i) % length(alphabet)) + 1, 1);
  end loop;
  return out;
end $$;

-- ---------- Tables ----------
create table if not exists public.kids (
  id         uuid primary key default gen_random_uuid(),
  owner      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name       text not null check (char_length(btrim(name)) between 1 and 20),
  color      text not null default '#2563d9' check (color ~ '^#[0-9a-fA-F]{6}$'),
  track      text not null default 'g3' check (track in ('g3', 'g7', 'geo')),
  code       text not null unique default public.new_friend_code(),
  streak     int  not null default 0 check (streak between 0 and 100000),
  week_xp    int  not null default 0 check (week_xp between 0 and 1000000),
  total_xp   int  not null default 0 check (total_xp between 0 and 100000000),
  updated_at timestamptz not null default now()
);
create index if not exists kids_owner on public.kids (owner);

create table if not exists public.friendships (
  id         uuid primary key default gen_random_uuid(),
  from_kid   uuid not null references public.kids(id) on delete cascade,
  to_kid     uuid not null references public.kids(id) on delete cascade,
  status     text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  check (from_kid <> to_kid)
);
create unique index if not exists friendships_pair on public.friendships (least(from_kid, to_kid), greatest(from_kid, to_kid));
create index if not exists friendships_to on public.friendships (to_kid);

alter table public.kids enable row level security;
alter table public.friendships enable row level security;
-- No policies on purpose: direct reads/writes are denied; use the functions below.
revoke all on public.kids, public.friendships from anon, authenticated;

-- ---------- Helpers ----------
create or replace function public.mq_owns(p_kid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from kids where id = p_kid and owner = auth.uid());
$$;

-- ---------- Save (create or update) a kid profile; returns its id and friend code ----------
create or replace function public.save_kid(
  p_id uuid, p_name text, p_color text, p_track text, p_streak int, p_week_xp int, p_total_xp int
) returns table (id uuid, code text)
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if p_id is not null and mq_owns(p_id) then
    return query
      update kids k set name = btrim(p_name), color = p_color, track = p_track,
             streak = greatest(p_streak, 0), week_xp = greatest(p_week_xp, 0), total_xp = greatest(p_total_xp, 0), updated_at = now()
       where k.id = p_id
      returning k.id, k.code;
  else
    if (select count(*) from kids where owner = auth.uid()) >= 12 then raise exception 'too many profiles'; end if;
    return query
      insert into kids (name, color, track, streak, week_xp, total_xp)
      values (btrim(p_name), p_color, p_track, greatest(p_streak, 0), greatest(p_week_xp, 0), greatest(p_total_xp, 0))
      returning kids.id, kids.code;
  end if;
end $$;

create or replace function public.delete_kid(p_id uuid) returns void
language sql security definer set search_path = public as $$
  delete from kids where id = p_id and owner = auth.uid();
$$;

-- ---------- Friend requests ----------
-- Returns: 'sent', 'accepted' (they had already asked us), 'already', 'not_found', 'self', 'limit'
create or replace function public.send_friend_request(p_kid uuid, p_code text) returns text
language plpgsql security definer set search_path = public as $$
declare
  target uuid;
  existing friendships%rowtype;
begin
  if not mq_owns(p_kid) then raise exception 'not your profile'; end if;
  select id into target from kids where code = upper(btrim(p_code));
  if target is null then return 'not_found'; end if;
  if target = p_kid then return 'self'; end if;
  select * into existing from friendships
   where least(from_kid, to_kid) = least(p_kid, target) and greatest(from_kid, to_kid) = greatest(p_kid, target);
  if found then
    if existing.status = 'pending' and existing.to_kid = p_kid then
      update friendships set status = 'accepted' where id = existing.id;  -- our parent approved by sending
      return 'accepted';
    end if;
    return 'already';
  end if;
  if (select count(*) from friendships where from_kid = p_kid and status = 'pending') >= 20 then return 'limit'; end if;
  insert into friendships (from_kid, to_kid) values (p_kid, target);
  return 'sent';
end $$;

-- Accept or decline an incoming request (only the receiving kid's owner can).
create or replace function public.respond_friend_request(p_request uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = public as $$
declare r friendships%rowtype;
begin
  select * into r from friendships where id = p_request and status = 'pending';
  if not found or not mq_owns(r.to_kid) then raise exception 'request not found'; end if;
  if p_accept then update friendships set status = 'accepted' where id = p_request;
  else delete from friendships where id = p_request; end if;
end $$;

-- Remove a friend or cancel a request, from either side.
create or replace function public.remove_friend(p_kid uuid, p_other uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not mq_owns(p_kid) then raise exception 'not your profile'; end if;
  delete from friendships
   where least(from_kid, to_kid) = least(p_kid, p_other) and greatest(from_kid, to_kid) = greatest(p_kid, p_other);
end $$;

-- Everything one kid's Friends card needs.
-- kind: 'friend' (accepted), 'incoming' (waiting for our approval), 'outgoing' (waiting for theirs).
-- Stats are only revealed for accepted friends.
create or replace function public.friend_overview(p_kid uuid)
returns table (kind text, request_id uuid, kid_id uuid, name text, color text, track text, streak int, week_xp int, total_xp int, updated_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not mq_owns(p_kid) then raise exception 'not your profile'; end if;
  return query
    select case when f.status = 'accepted' then 'friend' when f.to_kid = p_kid then 'incoming' else 'outgoing' end,
           f.id, o.id, o.name, o.color, o.track,
           case when f.status = 'accepted' then o.streak end,
           case when f.status = 'accepted' then o.week_xp end,
           case when f.status = 'accepted' then o.total_xp end,
           case when f.status = 'accepted' then o.updated_at end
      from friendships f
      join kids o on o.id = case when f.from_kid = p_kid then f.to_kid else f.from_kid end
     where f.from_kid = p_kid or f.to_kid = p_kid
     order by 1, o.week_xp desc, o.name;
end $$;

-- ---------- Permissions: only signed-in (anonymous) users may call the functions ----------
revoke all on function public.new_friend_code(), public.mq_owns(uuid), public.save_kid(uuid, text, text, text, int, int, int),
  public.delete_kid(uuid), public.send_friend_request(uuid, text), public.respond_friend_request(uuid, boolean),
  public.remove_friend(uuid, uuid), public.friend_overview(uuid) from public, anon;
grant execute on function public.save_kid(uuid, text, text, text, int, int, int), public.delete_kid(uuid),
  public.send_friend_request(uuid, text), public.respond_friend_request(uuid, boolean),
  public.remove_friend(uuid, uuid), public.friend_overview(uuid) to authenticated;
