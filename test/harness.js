#!/usr/bin/env node
/* Validates track files against CONTRACT.md.
   Usage: node test/harness.js src/tracks/grade3.js [more files...]   (no args = all tracks) */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
let katex = null;
for (const p of [path.join(__dirname, '../vendor/katex/katex.min.js'), 'katex', '/opt/npm-tools/node_modules/katex']) {
  try { katex = require(p); break; } catch (e) { /* try next */ }
}

const ROOT = path.join(__dirname, '..');
const N = Number(process.env.N || 300);
let files = process.argv.slice(2);
if (!files.length) files = fs.readdirSync(path.join(ROOT, 'src/tracks')).filter((f) => f.endsWith('.js')).map((f) => path.join('src/tracks', f));

const ctx = { console, Math: Object.create(Math) };
// Forbid Math.random in generators: make it throw while generating.
let generating = false;
const realRandom = Math.random;
ctx.Math.random = () => { if (generating) throw new Error('Math.random used inside generate(); use rng'); return realRandom(); };
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/core.js'), 'utf8'), ctx, { filename: 'core.js' });
const MQ = ctx.MathQuest;

let failures = 0;
const fail = (msg) => { failures++; if (failures <= 60) console.log('  ✗ ' + msg); };

function checkText(label, s, where) {
  if (typeof s !== 'string') return fail(`${where}: ${label} is not a string`);
  if (/\bundefined\b|\bNaN\b|\[object Object\]|\bInfinity\b/.test(s)) fail(`${where}: ${label} contains undefined/NaN/Infinity: ${s.slice(0, 140)}`);
  const stripped = s.replace(/\\\$/g, '');
  const dollars = (stripped.match(/\$/g) || []).length;
  if (dollars % 2) return fail(`${where}: ${label} has unbalanced $: ${s.slice(0, 140)}`);
  if (katex) {
    const parts = stripped.split('$');
    for (let i = 1; i < parts.length; i += 2) {
      try { katex.renderToString(parts[i], { throwOnError: true }); }
      catch (e) { fail(`${where}: ${label} KaTeX error in "${parts[i]}": ${e.message.split('\n')[0]}`); }
    }
  }
}
function checkSvg(s, where) {
  if (typeof s !== 'string' || !/^\s*<svg[\s>]/.test(s)) return fail(`${where}: figure must start with <svg`);
  if (!/viewBox=/.test(s)) fail(`${where}: figure missing viewBox`);
  if (/NaN|undefined/.test(s)) fail(`${where}: figure contains NaN/undefined`);
  const stack = [];
  const re = /<\/?([a-zA-Z][\w:-]*)\b[^>]*?(\/?)>/g; let m;
  const body = s.replace(/<!--[\s\S]*?-->/g, '');
  while ((m = re.exec(body))) {
    const tag = m[1];
    if (m[0].startsWith('</')) { if (stack.pop() !== tag) return fail(`${where}: figure has mismatched </${tag}>`); }
    else if (!m[2]) stack.push(tag);
  }
  if (stack.length) fail(`${where}: figure has unclosed <${stack.join('>, <')}>`);
}

function validInput(p, where) {
  const t = p.input && p.input.type, a = p.answer, i = p.input || {};
  switch (t) {
    case 'number': if (typeof a !== 'number' || !isFinite(a)) fail(`${where}: number answer invalid: ${a}`); break;
    case 'fraction': if (!a || !Number.isInteger(a.n) || !Number.isInteger(a.d) || a.d <= 0) fail(`${where}: fraction answer must be {n,d} ints with d>0: ${JSON.stringify(a)}`); break;
    case 'choice':
      if (!Array.isArray(i.options) || i.options.length < 2 || i.options.length > 5) fail(`${where}: choice needs 2–5 options`);
      else {
        if (new Set(i.options.map(String)).size !== i.options.length) fail(`${where}: duplicate choice options: ${JSON.stringify(i.options)}`);
        if (!Number.isInteger(a) || a < 0 || a >= i.options.length) fail(`${where}: choice answer out of range`);
        i.options.forEach((o, k) => checkText('option ' + k, String(o), where));
      }
      break;
    case 'multi': if (!Array.isArray(i.fields) || !Array.isArray(a) || a.length !== i.fields.length) fail(`${where}: multi fields/answer mismatch`); break;
    case 'numberline':
      if (![i.min, i.max, i.step].every((v) => typeof v === 'number' && isFinite(v)) || i.max <= i.min || i.step <= 0) fail(`${where}: numberline needs min<max, step>0`);
      else if (a < i.min - 1e-9 || a > i.max + 1e-9) fail(`${where}: numberline answer ${a} outside [${i.min},${i.max}]`);
      else if (Math.abs(Math.round((a - i.min) / i.step) * i.step + i.min - a) > 1e-6) fail(`${where}: numberline answer ${a} not on a tick`);
      break;
    case 'clock': if (!a || !(a.h >= 1 && a.h <= 12) || !(a.m >= 0 && a.m <= 59) || !Number.isInteger(a.h) || !Number.isInteger(a.m)) fail(`${where}: clock answer invalid ${JSON.stringify(a)}`); break;
    case 'point':
      if (!a || !Number.isInteger(a.x) || !Number.isInteger(a.y)) fail(`${where}: point answer must be integers`);
      else if (a.x < i.xmin || a.x > i.xmax || a.y < i.ymin || a.y > i.ymax) fail(`${where}: point answer outside grid`);
      break;
    case 'order':
      if (!Array.isArray(i.items) || !Array.isArray(a) || a.length !== i.items.length || new Set(a).size !== a.length) fail(`${where}: order items/answer invalid`);
      else i.items.forEach((o, k) => checkText('item ' + k, String(o), where));
      break;
    default: fail(`${where}: unknown input type ${t}`);
  }
}

const seenIds = new Set();
for (const f of files) {
  const before = MQ.tracks.length;
  try { vm.runInContext(fs.readFileSync(path.resolve(ROOT, f), 'utf8'), ctx, { filename: f }); }
  catch (e) { fail(`${f}: failed to load: ${e.stack.split('\n').slice(0, 3).join(' | ')}`); continue; }
  const tr = MQ.tracks[MQ.tracks.length - 1];
  if (MQ.tracks.length === before && !tr) { fail(`${f}: did not register a track`); continue; }
  console.log(`\n${f} → track "${tr.id}" (${tr.title})`);
  if (!Array.isArray(tr.skills) || tr.skills.length < 5) fail(`${tr.id}: needs at least 5 skills`);
  if (!Array.isArray(tr.labs) || tr.labs.length < 1) fail(`${tr.id}: needs at least 1 lab`);
  const labIds = new Set((tr.labs || []).map((l) => l.id));
  for (const l of tr.labs || []) {
    if (!l.id || !l.title || typeof l.mount !== 'function') fail(`${tr.id}: lab missing id/title/mount`);
  }
  for (const sk of tr.skills || []) {
    const where0 = sk.id || '(no id)';
    if (!sk.id || !sk.id.startsWith(tr.id + '-')) fail(`${where0}: id must start with "${tr.id}-"`);
    if (seenIds.has(sk.id)) fail(`${where0}: duplicate skill id`); seenIds.add(sk.id);
    for (const k of ['title', 'strand', 'ccss', 'blurb']) if (!sk[k]) fail(`${where0}: missing ${k}`);
    if (sk.lab && !labIds.has(sk.lab)) fail(`${where0}: lab "${sk.lab}" not defined in this track`);
    if (typeof sk.generate !== 'function') { fail(`${where0}: missing generate`); continue; }
    const stats = [];
    for (const level of [1, 2, 3]) {
      const prompts = new Set(); const types = new Set();
      for (let i = 0; i < N; i++) {
        const seed = level * 100003 + i * 7919 + 17;
        const where = `${sk.id} L${level} seed=${seed}`;
        let p;
        generating = true;
        try { p = sk.generate(MQ.makeRng(seed), level); }
        catch (e) { generating = false; fail(`${where}: generate threw: ${e.message}`); continue; }
        generating = false;
        if (!p || typeof p !== 'object') { fail(`${where}: no problem returned`); continue; }
        checkText('prompt', p.prompt, where);
        if (!Array.isArray(p.explanation) || p.explanation.length < 1) fail(`${where}: explanation must be a non-empty array`);
        else p.explanation.forEach((s, k) => checkText('explanation[' + k + ']', s, where));
        if (p.hint != null) checkText('hint', p.hint, where);
        if (p.figure != null) checkSvg(p.figure, where);
        validInput(p, where);
        // determinism
        const p2 = sk.generate(MQ.makeRng(seed), level);
        if (p2.prompt !== p.prompt) fail(`${where}: not deterministic for the same seed`);
        if (!MQ.check(p, p.answer)) fail(`${where}: its own answer fails check. answer=${JSON.stringify(p.answer)} prompt=${String(p.prompt).slice(0, 120)}`);
        // a clearly wrong answer must fail
        const wrong = { number: 987654.321, fraction: { n: 987654, d: 1 }, choice: -1, multi: [987654.3], numberline: 1e9, clock: { h: 13, m: 99 }, point: { x: 999, y: 999 }, order: [] }[p.input && p.input.type];
        if (wrong !== undefined && MQ.check(p, wrong)) fail(`${where}: an obviously wrong answer passes check`);
        prompts.add(p.prompt + (p.figure || ''));
        types.add(p.input && p.input.type);
      }
      stats.push(`L${level}: ${prompts.size}/${N} unique, inputs=[${[...types].join(',')}]`);
      if (prompts.size < Math.min(40, N / 4)) fail(`${sk.id} L${level}: too little variety (${prompts.size} unique of ${N})`);
    }
    console.log(`  • ${sk.id}  ${stats.join('  ')}`);
  }
}
console.log(failures ? `\nFAILED with ${failures} problem(s).` : `\nALL CHECKS PASSED${katex ? '' : ' (KaTeX not found: math syntax not validated)'}.`);
process.exit(failures ? 1 : 0);
