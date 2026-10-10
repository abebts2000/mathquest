/* MathQuest game layer: sound effects, haptics, the mascot, confetti, XP rules and daily quests. Browser only. */
(function () {
  'use strict';
  const { h, svg } = window.MathQuestDOM;

  // ---------- XP rules ----------
  const XP = { correct: 5, comboEvery: 5, comboBonus: 5, finish: 20, perfect: 15 };
  const DAILY_XP_GOAL = 100;
  const LESSON_LEN = 10;

  // Crowns: 1 at SmartScore 40, 2 at 75, 3 (gold) at 100.
  const crownsFor = (score) => (score >= 100 ? 3 : score >= 75 ? 2 : score >= 40 ? 1 : 0);

  // Daily quests, computed from the day's log { xp, answered, correct, bestCombo, lessons, perfect }.
  const QUESTS = [
    { id: 'xp', title: 'Earn 60 XP', goal: 60, of: (d) => d.xp || 0 },
    { id: 'combo', title: 'Get 5 in a row', goal: 5, of: (d) => d.bestCombo || 0 },
    { id: 'lessons', title: 'Finish 2 lessons', goal: 2, of: (d) => d.lessons || 0 },
    { id: 'perfect', title: 'Ace a lesson with no mistakes', goal: 1, of: (d) => d.perfect || 0 }
  ];
  function questsFor(day, dateKey) {
    // Three quests a day, rotating so the set changes daily.
    const n = Number(String(dateKey).replace(/\D/g, '')) || 0;
    const drop = n % QUESTS.length;
    return QUESTS.filter((_, i) => i !== drop).map((q) => ({ id: q.id, title: q.title, goal: q.goal, have: Math.min(q.goal, q.of(day || {})) }));
  }

  // ---------- Sound (synthesised with Web Audio; no files) ----------
  let actx = null, muted = false;
  function ctx() {
    if (muted) return null;
    try {
      if (!actx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; actx = new AC(); }
      if (actx.state === 'suspended') actx.resume();
      return actx;
    } catch (e) { return null; }
  }
  function tone(freq, start, dur, type = 'sine', vol = 0.18, slideTo) {
    const c = ctx(); if (!c) return;
    const t0 = c.currentTime + start;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(c.destination); o.start(t0); o.stop(t0 + dur + 0.05);
  }
  const sfx = {
    tap() { tone(660, 0, 0.05, 'triangle', 0.06); },
    correct(combo = 0) {
      const lift = Math.pow(2, Math.min(combo, 8) / 24); // each combo step nudges the pitch up
      tone(784 * lift, 0, 0.12, 'sine', 0.2); tone(1175 * lift, 0.09, 0.22, 'sine', 0.2); tone(1568 * lift, 0.09, 0.22, 'triangle', 0.05);
    },
    wrong() { tone(311, 0, 0.16, 'triangle', 0.18); tone(233, 0.13, 0.28, 'triangle', 0.18, 196); },
    combo() { [880, 1109, 1319, 1760].forEach((f, i) => tone(f, i * 0.06, 0.14, 'square', 0.05)); },
    complete() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.3, 'triangle', 0.16)); tone(1568, 0.48, 0.5, 'sine', 0.12); },
    streak() { [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.08, 0.25, 'sawtooth', 0.05)); },
    chest() { [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, i * 0.07, 0.2, 'sine', 0.12)); }
  };
  function setMuted(m) { muted = !!m; }
  function buzz(pattern) { try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) { /* not allowed here */ } }

  // ---------- Mascot: "Pip", a cheerful number block ----------
  // states: idle | happy | sad | cheer | think
  function mascot(state = 'idle', size = 96, color = 'var(--accent)') {
    const s = svg('svg', { viewBox: '0 0 120 120', width: size, height: size, class: 'pip pip-' + state, 'aria-hidden': 'true' });
    const body = svg('g', { class: 'pip-body' });
    body.append(
      svg('ellipse', { cx: 60, cy: 112, rx: 30, ry: 5, fill: 'var(--ink)', opacity: '.12', class: 'pip-shadow' }),
      svg('rect', { x: 26, y: 20, width: 68, height: 76, rx: 22, fill: color }),
      svg('rect', { x: 26, y: 20, width: 68, height: 76, rx: 22, fill: 'url(#pipShine)' }),
      svg('rect', { x: 38, y: 96, width: 12, height: 12, rx: 6, fill: color }),
      svg('rect', { x: 70, y: 96, width: 12, height: 12, rx: 6, fill: color }));
    const defs = svg('defs', {}, svg('linearGradient', { id: 'pipShine', x1: 0, y1: 0, x2: 0, y2: 1 },
      svg('stop', { offset: '0', 'stop-color': '#fff', 'stop-opacity': '.35' }), svg('stop', { offset: '.6', 'stop-color': '#fff', 'stop-opacity': '0' })));
    const armL = svg('rect', { class: 'pip-arm-l', x: 12, y: 54, width: 20, height: 10, rx: 5, fill: color });
    const armR = svg('rect', { class: 'pip-arm-r', x: 88, y: 54, width: 20, height: 10, rx: 5, fill: color });
    const face = svg('g', { class: 'pip-face' });
    if (state === 'happy' || state === 'cheer') {
      face.append(
        svg('path', { d: 'M42 52 q6 -8 12 0', stroke: '#fff', 'stroke-width': 5, fill: 'none', 'stroke-linecap': 'round' }),
        svg('path', { d: 'M66 52 q6 -8 12 0', stroke: '#fff', 'stroke-width': 5, fill: 'none', 'stroke-linecap': 'round' }),
        svg('path', { d: 'M46 66 q14 16 28 0 z', fill: '#fff' }));
    } else if (state === 'sad') {
      face.append(
        svg('circle', { cx: 48, cy: 54, r: 6, fill: '#fff' }), svg('circle', { cx: 72, cy: 54, r: 6, fill: '#fff' }),
        svg('circle', { cx: 48, cy: 56, r: 3, fill: 'var(--ink)' }), svg('circle', { cx: 72, cy: 56, r: 3, fill: 'var(--ink)' }),
        svg('path', { d: 'M40 44 l14 4 M80 44 l-14 4', stroke: '#fff', 'stroke-width': 3.5, 'stroke-linecap': 'round' }),
        svg('path', { d: 'M50 76 q10 -8 20 0', stroke: '#fff', 'stroke-width': 4.5, fill: 'none', 'stroke-linecap': 'round' }));
    } else {
      const eyes = svg('g', { class: 'pip-eyes' },
        svg('circle', { cx: 48, cy: 54, r: 7, fill: '#fff' }), svg('circle', { cx: 72, cy: 54, r: 7, fill: '#fff' }),
        svg('circle', { cx: state === 'think' ? 51 : 49, cy: state === 'think' ? 51 : 55, r: 3.6, fill: 'var(--ink)' }),
        svg('circle', { cx: state === 'think' ? 75 : 73, cy: state === 'think' ? 51 : 55, r: 3.6, fill: 'var(--ink)' }));
      face.append(eyes, svg('path', { d: state === 'think' ? 'M52 74 h16' : 'M50 70 q10 9 20 0', stroke: '#fff', 'stroke-width': 4.5, fill: 'none', 'stroke-linecap': 'round' }));
    }
    face.append(svg('circle', { cx: 40, cy: 66, r: 4, fill: '#fff', opacity: '.25' }), svg('circle', { cx: 80, cy: 66, r: 4, fill: '#fff', opacity: '.25' }));
    body.append(armL, armR, face);
    s.append(defs, body);
    return s;
  }

  // ---------- Visual effects ----------
  const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function confetti(opts = {}) {
    if (reduced()) return;
    const c = h('canvas', { class: 'confetti' }); document.body.appendChild(c);
    const g = c.getContext('2d'); const dpr = window.devicePixelRatio || 1;
    const W = innerWidth, H = innerHeight; c.width = W * dpr; c.height = H * dpr; g.scale(dpr, dpr);
    const cols = ['#ff7a1a', '#14b8a6', '#8b5cf6', '#facc15', '#3b82f6', '#22c55e', '#ec4899'];
    const n = opts.count || 160, ox = opts.x != null ? opts.x : W / 2, oy = opts.y != null ? opts.y : H * 0.3;
    const bits = Array.from({ length: n }, () => ({ x: ox, y: oy, vx: (Math.random() - 0.5) * 16, vy: -Math.random() * 15 - 5, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, c: cols[(Math.random() * cols.length) | 0], s: 6 + Math.random() * 7, round: Math.random() < 0.3 }));
    let f = 0;
    (function tick() {
      g.clearRect(0, 0, W, H);
      for (const b of bits) {
        b.vy += 0.38; b.vx *= 0.99; b.x += b.vx; b.y += b.vy; b.r += b.vr;
        g.save(); g.translate(b.x, b.y); g.rotate(b.r); g.fillStyle = b.c;
        if (b.round) { g.beginPath(); g.arc(0, 0, b.s / 3, 0, 7); g.fill(); } else g.fillRect(-b.s / 2, -b.s / 4, b.s, b.s / 2);
        g.restore();
      }
      if (++f < 130) requestAnimationFrame(tick); else c.remove();
    })();
  }
  // Floating "+5 XP" from an element.
  function floatText(fromEl, text, cls = '') {
    if (!fromEl) return;
    const r = fromEl.getBoundingClientRect();
    const t = h('div', { class: 'float-text ' + cls, style: { left: r.left + r.width / 2 + 'px', top: Math.max(r.top, 60) + 'px' } }, text);
    document.body.appendChild(t); setTimeout(() => t.remove(), 1100);
  }
  // Count a number up inside an element.
  function countUp(el, to, ms = 900, fmt = (v) => String(v)) {
    if (reduced()) { el.textContent = fmt(to); return; }
    const t0 = performance.now();
    (function step(t) {
      const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(Math.round(to * e));
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }
  function restartAnim(el, cls) { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }

  // Flame icon for streaks (lit or grey).
  function flame(lit = true, size = 26) {
    return svg('svg', { viewBox: '0 0 24 24', width: size, height: size, class: 'flame' + (lit ? ' lit' : ''), 'aria-hidden': 'true' },
      svg('path', { d: 'M12 2c1 3.5 5 6 5 11a5 5 0 0 1-10 0c0-2.2 1-3.8 2.2-5 .2 1.7 1 2.8 2.3 3.2C11 8.5 11 5 12 2z', fill: lit ? '#ff8a1f' : 'var(--line)' }),
      svg('path', { d: 'M12 12.5c.6 1.4 2.3 2.4 2.3 4.4a2.3 2.3 0 0 1-4.6 0c0-1.3.9-2.2 1.6-2.8.1.6.4 1 .7 1.1-.3-1-.3-1.8 0-2.7z', fill: lit ? '#ffd23f' : 'var(--surface-2)' }));
  }
  function gem(size = 22) {
    return svg('svg', { viewBox: '0 0 24 24', width: size, height: size, 'aria-hidden': 'true' },
      svg('path', { d: 'M6 3h12l4 6-10 12L2 9z', fill: '#3b82f6' }), svg('path', { d: 'M6 3l3 6h6l3-6M2 9h20M9 9l3 12 3-12', fill: 'none', stroke: '#bfdbfe', 'stroke-width': 1.2 }));
  }
  function crownIcon(level, size = 18) {
    const fills = ['var(--line)', '#d08a4c', '#a8b3c4', '#f5b800'];
    return svg('svg', { viewBox: '0 0 24 24', width: size, height: size, 'aria-hidden': 'true' },
      svg('path', { d: 'M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z', fill: fills[level] || fills[0], stroke: 'rgba(0,0,0,.18)', 'stroke-width': 1 }));
  }
  function chest(open = false, size = 64) {
    return svg('svg', { viewBox: '0 0 64 64', width: size, height: size, class: 'chest' + (open ? ' open' : ''), 'aria-hidden': 'true' },
      svg('rect', { x: 8, y: 28, width: 48, height: 28, rx: 5, fill: '#c2711f' }),
      svg('rect', { x: 8, y: 28, width: 48, height: 6, fill: '#a35a12' }),
      svg('g', { class: 'chest-lid' }, svg('path', { d: 'M8 30v-8a10 10 0 0 1 10-10h28a10 10 0 0 1 10 10v8z', fill: '#e08a2c' }), svg('rect', { x: 8, y: 24, width: 48, height: 6, fill: '#f0a64a' })),
      svg('rect', { x: 28, y: 26, width: 8, height: 12, rx: 2, fill: '#f5c542', stroke: '#a35a12', 'stroke-width': 1.5 }));
  }

  window.MathQuestGame = { XP, DAILY_XP_GOAL, LESSON_LEN, crownsFor, questsFor, sfx, setMuted, buzz, mascot, confetti, floatText, countUp, restartAnim, flame, gem, crownIcon, chest };
})();
