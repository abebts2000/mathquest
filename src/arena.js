/* MathQuest arenas: a moving canvas background that upgrades as a kid earns trophies.
   Each arena has its own colours, floating math symbols, speed and effects; higher arenas get busier. */
(function () {
  'use strict';
  const ARENAS = [
    { name: 'Chalk Meadow', at: 0, sky: ['#9be8c0', '#3fa877'], glyphs: '+−×÷', count: 14, speed: 0.22, fx: 'stripes' },
    { name: 'Fraction Falls', at: 50, sky: ['#8fdcff', '#2b7fd6'], glyphs: '½⅓¼¾=', count: 18, speed: 0.28, fx: 'bubbles' },
    { name: 'Pyramid Dunes', at: 120, sky: ['#ffd98a', '#e8833a'], glyphs: '△∠°▲', count: 22, speed: 0.34, fx: 'stripes' },
    { name: 'Volcano Peak', at: 220, sky: ['#ff8f6b', '#a8203a'], glyphs: '∑%π!', count: 26, speed: 0.42, fx: 'embers' },
    { name: 'Crystal Caves', at: 350, sky: ['#c4b5fd', '#5b21b6'], glyphs: '◆√∞◇', count: 30, speed: 0.5, fx: 'sparkles' },
    { name: 'Starfield', at: 550, sky: ['#312e81', '#0b0a24'], glyphs: '∞πθ★', count: 36, speed: 0.58, fx: 'stars' },
    { name: 'Golden Galaxy', at: 800, sky: ['#ffd76a', '#7c3aed'], glyphs: '★♛∞π', count: 44, speed: 0.68, fx: 'rays' }
  ];
  const tierFor = (trophies) => { let t = 0; ARENAS.forEach((a, i) => { if (trophies >= a.at) t = i; }); return t; };

  let canvas = null, ctx = null, W = 0, H = 0, dpr = 1, tier = -1, parts = [], fx = [], raf = 0, last = 0, acc = 0, t0 = performance.now();
  const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dark = () => {
    const a = document.documentElement.getAttribute('data-theme');
    if (a) return a === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  };

  function mount() {
    if (canvas) return;
    canvas = document.createElement('canvas');
    canvas.className = 'arena-bg'; canvas.setAttribute('aria-hidden', 'true');
    const wash = document.createElement('div'); wash.className = 'arena-wash';
    document.body.prepend(wash); document.body.prepend(canvas);
    ctx = canvas.getContext('2d');
    resize(); window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) loop(performance.now()); });
  }
  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1); W = innerWidth; H = innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (tier >= 0) seed(); draw(performance.now());
  }
  function seed() {
    const A = ARENAS[tier];
    const n = Math.round(A.count * Math.min(1.4, Math.max(0.6, (W * H) / (420 * 860))));
    parts = Array.from({ length: n }, () => ({
      x: Math.random() * W, y: Math.random() * H, s: 16 + Math.random() * 30, r: Math.random() * 6.28,
      vr: (Math.random() - 0.5) * 0.01, v: 0.5 + Math.random(), g: A.glyphs[Math.floor(Math.random() * A.glyphs.length)], a: 0.18 + Math.random() * 0.22
    }));
    fx = Array.from({ length: A.fx === 'stars' ? 70 : A.fx === 'rays' ? 0 : 24 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: 1 + Math.random() * 3, v: 0.3 + Math.random(), p: Math.random() * 6.28 }));
  }
  function shade(hex, k) {
    const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    return `rgb(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)})`;
  }
  function draw(now) {
    if (!ctx || tier < 0) return;
    const A = ARENAS[tier], k = dark() ? 0.42 : 1, t = (now - t0) / 1000;
    const grd = ctx.createLinearGradient(0, 0, W * 0.4, H);
    grd.addColorStop(0, shade(A.sky[0], k)); grd.addColorStop(1, shade(A.sky[1], k));
    ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
    // diagonal moving stripes (all arenas get a faint version; 'stripes' arenas a bold one)
    ctx.save(); ctx.globalAlpha = A.fx === 'stripes' ? 0.12 : 0.06; ctx.fillStyle = '#fff';
    const off = (t * 22 * A.speed * 3) % 80;
    ctx.translate(-H, 0); ctx.rotate(-0.5);
    for (let x = -off; x < W + H * 2; x += 80) ctx.fillRect(x, -H, 34, H * 4);
    ctx.restore();
    if (A.fx === 'rays') {
      ctx.save(); ctx.translate(W / 2, H * 0.32); ctx.rotate(t * 0.08); ctx.globalAlpha = 0.12; ctx.fillStyle = '#fff';
      for (let i = 0; i < 18; i++) { ctx.rotate(Math.PI / 9); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-40, -Math.max(W, H)); ctx.lineTo(40, -Math.max(W, H)); ctx.fill(); }
      ctx.restore();
    }
    // effects layer
    for (const f of fx) {
      ctx.save();
      if (A.fx === 'bubbles') { ctx.globalAlpha = 0.25; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 3, 0, 7); ctx.stroke(); }
      else if (A.fx === 'embers') { ctx.globalAlpha = 0.35 + 0.3 * Math.sin(t * 3 + f.p); ctx.fillStyle = '#ffd36b'; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 7); ctx.fill(); }
      else if (A.fx === 'sparkles' || A.fx === 'stars') { ctx.globalAlpha = 0.25 + 0.6 * Math.abs(Math.sin(t * 1.6 + f.p)); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (A.fx === 'stars' ? 0.7 : 1), 0, 7); ctx.fill(); }
      ctx.restore();
    }
    // floating math glyphs
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const p of parts) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
      ctx.globalAlpha = p.a; ctx.font = `900 ${p.s}px "Lilita One", "Fredoka", system-ui, sans-serif`;
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(26,16,51,.35)'; ctx.strokeText(p.g, 0, 0);
      ctx.fillStyle = '#fff'; ctx.fillText(p.g, 0, 0);
      ctx.restore();
    }
  }
  function step(dt) {
    const A = ARENAS[tier], s = A.speed * dt * 0.06;
    for (const p of parts) {
      p.x += s * p.v * 0.6; p.y -= s * p.v; p.r += p.vr * dt * 0.06;
      if (p.y < -40) { p.y = H + 40; p.x = Math.random() * W; }
      if (p.x > W + 40) p.x = -40;
    }
    for (const f of fx) {
      if (A.fx === 'bubbles' || A.fx === 'embers') { f.y -= f.v * dt * 0.05 * (A.fx === 'embers' ? 1.6 : 1); f.x += Math.sin((f.y + f.p * 50) / 40) * 0.3; if (f.y < -10) { f.y = H + 10; f.x = Math.random() * W; } }
      else if (A.fx === 'stars') { f.x -= f.v * dt * 0.01; if (f.x < -5) f.x = W + 5; }
    }
  }
  function loop(now) {
    cancelAnimationFrame(raf);
    if (document.hidden || reduced() || tier < 0) { draw(now); return; }
    acc += Math.min(100, now - (last || now)); last = now;
    if (acc >= 33) { step(acc); draw(now); acc = 0; } // ~30fps keeps phones cool
    raf = requestAnimationFrame(loop);
  }
  function set(t, mode) {
    mount();
    document.body.classList.toggle('arena-calm', mode === 'lesson');
    document.body.dataset.arena = String(t);
    if (t === tier) return;
    tier = t; seed(); last = 0; acc = 0; draw(performance.now()); loop(performance.now());
  }
  window.MathQuestArena = { ARENAS, tierFor, set };
})();
