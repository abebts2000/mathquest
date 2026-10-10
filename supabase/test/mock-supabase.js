#!/usr/bin/env node
/* A tiny stand-in for Supabase's auth + RPC endpoints, backed by a local Postgres via psql.
   Only for tests. Usage: PGHOST=... PGPORT=... PGDATABASE=mq node supabase/test/mock-supabase.js [port] */
'use strict';
const http = require('http');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const PORT = Number(process.argv[2] || 54321);
const TABLE_FNS = new Set(['save_kid', 'friend_overview']);

function psql(sql) {
  return execFileSync('psql', ['-X', '-q', '-At', '-v', 'ON_ERROR_STOP=1', '-U', process.env.PGUSER || 'postgres', '-c', sql], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}
const lit = (v) => v === null || v === undefined ? 'null' : typeof v === 'boolean' ? String(v) : typeof v === 'number' ? String(v) : "'" + String(v).replace(/'/g, "''") + "'";
function send(res, code, body) {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(body === undefined ? '' : JSON.stringify(body));
}
function tokens(uid) { return { access_token: 'tok.' + uid, refresh_token: 'ref.' + uid, expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: uid } }; }

http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'apikey, authorization, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' });
    return res.end();
  }
  let raw = '';
  req.on('data', (c) => (raw += c));
  req.on('end', () => {
    let body = {}; try { body = raw ? JSON.parse(raw) : {}; } catch (e) { return send(res, 400, { message: 'bad json' }); }
    const url = new URL(req.url, 'http://x');
    try {
      if (url.pathname === '/auth/v1/signup') {
        const uid = crypto.randomUUID(); psql(`insert into auth.users values ('${uid}')`);
        return send(res, 200, tokens(uid));
      }
      if (url.pathname === '/auth/v1/token') {
        const uid = String(body.refresh_token || '').replace(/^ref\./, '');
        if (!/^[0-9a-f-]{36}$/.test(uid)) return send(res, 400, { error: 'invalid_grant' });
        return send(res, 200, tokens(uid));
      }
      const m = url.pathname.match(/^\/rest\/v1\/rpc\/(\w+)$/);
      if (m) {
        const uid = String(req.headers.authorization || '').replace(/^Bearer tok\./, '');
        if (!/^[0-9a-f-]{36}$/.test(uid)) return send(res, 401, { message: 'JWT invalid' });
        const fn = m[1];
        const args = Object.entries(body).map(([k, v]) => `${k} => ${lit(v)}`).join(', ');
        const call = TABLE_FNS.has(fn) ? `select coalesce(json_agg(r), '[]'::json) from public.${fn}(${args}) r` : `select to_json(public.${fn}(${args}))`;
        const out = psql(`set role authenticated; set request.jwt.claim.sub = '${uid}'; ${call}`);
        return send(res, 200, out === '' ? null : JSON.parse(out));
      }
      send(res, 404, { message: 'not found' });
    } catch (e) {
      const msg = String(e.stderr || e.message).split('\n').find((l) => /ERROR/.test(l)) || 'error';
      send(res, 400, { message: msg.replace(/^.*ERROR:\s*/, '') });
    }
  });
}).listen(PORT, () => console.log('mock supabase on ' + PORT));
