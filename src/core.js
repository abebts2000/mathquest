/* MathQuest core: registry, seeded RNG, math utils, answer checking. DOM-free (runs in Node too). */
(function (root) {
  'use strict';
  const tracks = [];

  // ---------- Seeded RNG (mulberry32) ----------
  function makeRng(seed) {
    let s = (seed >>> 0) || 1;
    const next = () => {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const rng = {
      seed,
      float: next,
      int(a, b) { if (b < a) [a, b] = [b, a]; return a + Math.floor(next() * (b - a + 1)); },
      nonzero(a, b) { let v; do { v = rng.int(a, b); } while (v === 0); return v; },
      bool(p = 0.5) { return next() < p; },
      pick(arr) { return arr[Math.floor(next() * arr.length)]; },
      shuffle(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
      sample(arr, k) { return rng.shuffle(arr).slice(0, k); }
    };
    return rng;
  }

  // ---------- Utils ----------
  const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };
  const lcm = (a, b) => Math.abs(a * b) / gcd(a, b);
  function simplify(n, d) { if (d < 0) { n = -n; d = -d; } const g = gcd(n, d); return { n: n / g, d: d / g }; }
  function round(x, dp = 2) { const f = Math.pow(10, dp); return Math.round((x + Number.EPSILON) * f) / f; }
  function fmt(x) {
    if (typeof x !== 'number' || !isFinite(x)) return String(x);
    const r = round(x, 4);
    const neg = r < 0; const abs = Math.abs(r);
    let [i, f] = String(abs).split('.');
    if (String(abs).includes('e')) { i = abs.toFixed(0); f = undefined; }
    i = i.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (neg ? '-' : '') + i + (f ? '.' + f : '');
  }
  function frac(n, d) {
    if (d === 1) return String(n);
    if (n === 0) return '0';
    const neg = (n < 0) !== (d < 0);
    return (neg ? '-' : '') + '\\frac{' + Math.abs(n) + '}{' + Math.abs(d) + '}';
  }
  function mixedLatex(n, d) {
    const s = simplify(n, d);
    const neg = s.n < 0; const an = Math.abs(s.n);
    if (s.d === 1) return (neg ? '-' : '') + an;
    const w = Math.floor(an / s.d), r = an % s.d;
    return (neg ? '-' : '') + (w ? w : '') + '\\frac{' + r + '}{' + s.d + '}';
  }
  function choicesFrom(correct, distractors, rng) {
    const c = String(correct);
    const seen = new Set([c]);
    const ds = [];
    for (const d of distractors) { const s = String(d); if (!seen.has(s)) { seen.add(s); ds.push(s); } }
    const options = rng.shuffle([c].concat(ds.slice(0, 4)));
    return { options, answer: options.indexOf(c) };
  }
  const NAMES = ['Maya', 'Leo', 'Ava', 'Sam', 'Zara', 'Eli', 'Nia', 'Omar', 'Ruby', 'Kai', 'Lena', 'Theo', 'Amara', 'Dev', 'Iris', 'Jonah', 'Selam', 'Marco', 'Hana', 'Felix'];
  const ITEMS = [['apple', 'apples'], ['sticker', 'stickers'], ['marble', 'marbles'], ['cookie', 'cookies'], ['pencil', 'pencils'], ['shell', 'shells'], ['book', 'books'], ['card', 'cards'], ['balloon', 'balloons'], ['muffin', 'muffins'], ['seed', 'seeds'], ['bead', 'beads']];
  const util = {
    gcd, lcm, simplify, round, fmt, frac, mixedLatex, choicesFrom,
    name: (rng) => rng.pick(NAMES),
    item: (rng) => { const p = rng.pick(ITEMS); return { one: p[0], many: p[1] }; }
  };

  // ---------- Answer parsing & checking ----------
  function parseNumber(s) {
    if (typeof s === 'number') return s;
    if (s == null) return NaN;
    s = String(s).trim().replace(/,/g, '').replace(/^\+/, '').replace(/−/g, '-');
    if (s === '' || s === '-' || s === '.') return NaN;
    if (/^-?\d+\s*\/\s*\d+$/.test(s)) { const [a, b] = s.split('/').map(Number); return b ? a / b : NaN; }
    return /^-?(\d+\.?\d*|\.\d+)$/.test(s) ? Number(s) : NaN;
  }
  const near = (a, b, tol = 1e-6) => typeof a === 'number' && isFinite(a) && Math.abs(a - b) <= tol;

  function defaultCheck(problem, resp) {
    const a = problem.answer, t = problem.input.type;
    switch (t) {
      case 'number': return near(parseNumber(resp), a);
      case 'fraction': {
        if (!resp || !resp.d) return false;
        if (resp.n * a.d !== a.n * resp.d) return false;
        if (problem.input.requireSimplest) return gcd(resp.n, resp.d) === 1;
        return true;
      }
      case 'choice': return resp === a;
      case 'multi': return Array.isArray(resp) && resp.length === a.length && a.every((v, i) => near(parseNumber(resp[i]), v));
      case 'numberline': return near(resp, a, (problem.input.step || 1) / 2 - 1e-9);
      case 'clock': return !!resp && resp.h === a.h && resp.m === a.m;
      case 'point': return !!resp && resp.x === a.x && resp.y === a.y;
      case 'order': return Array.isArray(resp) && resp.length === a.length && a.every((v, i) => v === resp[i]);
      default: return false;
    }
  }
  function check(problem, resp) {
    try { return typeof problem.check === 'function' ? !!problem.check(resp) : defaultCheck(problem, resp); }
    catch (e) { return false; }
  }

  // ---------- SmartScore-style mastery ----------
  // Gains shrink as score rises; misses cost more in the challenge zone (90+).
  function updateScore(score, correct) {
    if (correct) {
      const gain = score < 50 ? 9 : score < 70 ? 7 : score < 80 ? 5 : score < 90 ? 3 : score < 95 ? 2 : 1;
      return Math.min(100, score + gain);
    }
    const loss = score < 30 ? 2 : score < 60 ? 4 : score < 80 ? 6 : score < 90 ? 8 : 10;
    return Math.max(0, score - loss);
  }
  const levelFor = (score) => (score < 40 ? 1 : score < 75 ? 2 : 3);

  const api = {
    version: '1.0',
    tracks,
    registerTrack(t) {
      const i = tracks.findIndex((x) => x.id === t.id);
      if (i >= 0) tracks[i] = t; else tracks.push(t);
    },
    makeRng, util, parseNumber, check, defaultCheck, updateScore, levelFor
  };
  root.MathQuest = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
