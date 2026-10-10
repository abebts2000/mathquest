\set ON_ERROR_STOP 1
insert into auth.users values ('11111111-1111-1111-1111-111111111111'), ('22222222-2222-2222-2222-222222222222'), ('33333333-3333-3333-3333-333333333333');
-- Family A (user 1)
set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
create temp table t(k text, v text); grant all on t to authenticated;
insert into t select 'a_kid', id::text from save_kid(null, 'Mia', '#e8590c', 'g3', 3, 120, 900);
-- Family B (user 2)
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
insert into t select 'b_kid', id::text from save_kid(null, 'Sam', '#0f8b8d', 'g7', 1, 40, 200);
reset role;
insert into t select 'a_code', code from kids where name = 'Mia';
insert into t select 'b_code', code from kids where name = 'Sam';
select k, v from t order by k;

-- direct table access is denied
set role authenticated; set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
do $$ begin perform * from kids; raise exception 'FAIL: direct select allowed'; exception when insufficient_privilege then raise notice 'ok: direct select denied'; end $$;
do $$ begin update kids set name = 'x'; raise exception 'FAIL: direct update allowed'; exception when insufficient_privilege then raise notice 'ok: direct update denied'; end $$;

-- B cannot act as A's kid
do $$ begin perform send_friend_request((select v::uuid from t where k='a_kid'), 'XXXXXX'); raise exception 'FAIL: impersonation allowed'; exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; raise notice 'ok: cannot use another family''s kid (%)', sqlerrm; end $$;
-- B cannot overwrite A's kid via save_kid (creates a new row instead)
select 'save_kid foreign id makes new row' as test, (select id from save_kid((select v::uuid from t where k='a_kid'), 'Hacker', '#000000', 'g3', 0, 0, 0)) <> (select v::uuid from t where k='a_kid') as ok;
select delete_kid(id) from save_kid(null, 'Tmp', '#000000', 'g3', 0, 0, 0);

-- B sends to A by code (lowercase + spaces tolerated)
select 'send' as test, send_friend_request((select v::uuid from t where k='b_kid'), ' ' || lower((select v from t where k='a_code')) || ' ') as result;
select 'send again' as test, send_friend_request((select v::uuid from t where k='b_kid'), (select v from t where k='a_code')) as result;
select 'bad code' as test, send_friend_request((select v::uuid from t where k='b_kid'), 'ZZZZZZ') as result;
select 'self' as test, send_friend_request((select v::uuid from t where k='b_kid'), (select v from t where k='b_code')) as result;
-- B sees outgoing without stats
select 'B overview' as test, kind, name, streak, week_xp from friend_overview((select v::uuid from t where k='b_kid'));
-- B cannot accept its own outgoing request
do $$ begin perform respond_friend_request((select request_id from friend_overview((select v::uuid from t where k='b_kid')) limit 1), true); raise exception 'FAIL: sender accepted'; exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; raise notice 'ok: sender cannot approve (%)', sqlerrm; end $$;

-- A sees incoming (no stats yet) and approves
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select 'A overview before' as test, kind, name, streak from friend_overview((select v::uuid from t where k='a_kid'));
select respond_friend_request((select request_id from friend_overview((select v::uuid from t where k='a_kid')) where kind='incoming'), true);
select 'A overview after' as test, kind, name, streak, week_xp, total_xp from friend_overview((select v::uuid from t where k='a_kid'));
-- stats update shows to friend
select 1 from save_kid((select v::uuid from t where k='a_kid'), 'Mia', '#e8590c', 'g3', 4, 150, 950);
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select 'B sees A stats' as test, kind, name, streak, week_xp from friend_overview((select v::uuid from t where k='b_kid'));

-- Stranger (user 3) cannot see either family's overview
set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
do $$ begin perform friend_overview((select v::uuid from t where k='a_kid')); raise exception 'FAIL: stranger read'; exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; raise notice 'ok: stranger cannot read (%)', sqlerrm; end $$;
-- Stranger requests A; A declines
insert into t select 'c_kid', id::text from save_kid(null, 'Ivy', '#7048e8', 'geo', 0, 0, 0);
select 'C send' as test, send_friend_request((select v::uuid from t where k='c_kid'), (select v from t where k='a_code'));
-- Reverse-pending: A sends to C's code while C->A pending => accepted (A's parent approved)
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
reset role; insert into t select 'c_code', code from kids where name = 'Ivy'; set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select 'A sends back' as test, send_friend_request((select v::uuid from t where k='a_kid'), (select v from t where k='c_code'));
select 'A friends' as test, kind, name from friend_overview((select v::uuid from t where k='a_kid')) order by name;
-- A removes C
select remove_friend((select v::uuid from t where k='a_kid'), (select v::uuid from t where k='c_kid'));
select 'A friends after remove' as test, kind, name from friend_overview((select v::uuid from t where k='a_kid')) order by name;
-- anon role cannot call functions
reset role; set role anon;
do $$ begin perform friend_overview(gen_random_uuid()); raise exception 'FAIL: anon allowed'; exception when insufficient_privilege then raise notice 'ok: anon denied'; end $$;
reset role;
select 'ALL FRIENDS TESTS PASSED' as done;
