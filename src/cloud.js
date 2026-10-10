/* MathQuest cloud client for friends (Supabase). No SDK: anonymous sign-in + RPC calls over fetch.
   Every device signs in anonymously; the session is kept in localStorage. All data access goes
   through the security-definer functions in supabase/schema.sql. */
(function () {
  'use strict';
  const cfg = window.MQ_CONFIG || {};
  const base = (cfg.supabaseUrl || '').replace(/\/+$/, '');
  const key = cfg.supabaseAnonKey || '';
  const enabled = !!(base && key && typeof fetch === 'function');
  const SKEY = 'mathquest.auth.v1';
  let session = null;
  try { session = JSON.parse(localStorage.getItem(SKEY) || 'null'); } catch (e) { session = null; }
  const keep = (s) => { session = s; try { localStorage.setItem(SKEY, JSON.stringify(s)); } catch (e) { /* ignore */ } };

  async function post(path, body, token) {
    const res = await fetch(base + path, {
      method: 'POST',
      headers: { apikey: key, Authorization: 'Bearer ' + (token || key), 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
    });
    const text = await res.text();
    let data = null; try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
    if (!res.ok) {
      const msg = (data && (data.message || data.msg || data.error_description || data.error)) || ('HTTP ' + res.status);
      const err = new Error(msg); err.status = res.status; throw err;
    }
    return data;
  }
  async function signIn() {
    const s = await post('/auth/v1/signup', { data: {} });
    if (!s || !s.access_token) throw new Error('Sign-in failed. Check that anonymous sign-ins are enabled in Supabase.');
    keep({ access_token: s.access_token, refresh_token: s.refresh_token, expires_at: s.expires_at || Math.floor(Date.now() / 1000) + (s.expires_in || 3600), user: s.user && s.user.id });
  }
  async function refresh() {
    try {
      const s = await post('/auth/v1/token?grant_type=refresh_token', { refresh_token: session.refresh_token });
      keep({ access_token: s.access_token, refresh_token: s.refresh_token, expires_at: s.expires_at || Math.floor(Date.now() / 1000) + (s.expires_in || 3600), user: s.user && s.user.id });
    } catch (e) {
      if (e.status && e.status < 500) await signIn(); // refresh token is gone: start a new anonymous identity
      else throw e;
    }
  }
  let pending = null;
  function ready() {
    if (!enabled) return Promise.reject(new Error('Friends are not set up.'));
    if (pending) return pending;
    const now = Math.floor(Date.now() / 1000);
    if (session && session.access_token && session.expires_at > now + 60) return Promise.resolve();
    pending = (session && session.refresh_token ? refresh() : signIn()).finally(() => { pending = null; });
    return pending;
  }
  async function rpc(fn, args, retried) {
    await ready();
    try { return await post('/rest/v1/rpc/' + fn, args, session.access_token); }
    catch (e) {
      if (e.status === 401 && !retried) { session.expires_at = 0; return rpc(fn, args, true); }
      throw e;
    }
  }

  window.MathQuestCloud = {
    enabled,
    // Create or update a kid's public card. Returns { id, code }.
    async saveKid(id, k) {
      const rows = await rpc('save_kid', { p_id: id || null, p_name: k.name, p_color: k.color, p_track: k.track, p_streak: k.streak | 0, p_week_xp: k.weekXp | 0, p_total_xp: k.totalXp | 0 });
      return Array.isArray(rows) ? rows[0] : rows;
    },
    deleteKid: (id) => rpc('delete_kid', { p_id: id }),
    overview: (kidId) => rpc('friend_overview', { p_kid: kidId }),
    sendRequest: (kidId, code) => rpc('send_friend_request', { p_kid: kidId, p_code: code }),
    respond: (requestId, accept) => rpc('respond_friend_request', { p_request: requestId, p_accept: !!accept }),
    remove: (kidId, otherId) => rpc('remove_friend', { p_kid: kidId, p_other: otherId })
  };
})();
