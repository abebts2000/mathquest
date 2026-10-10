/* MathQuest celebrations: a different full-screen effect for every correct answer.
   17 effects drawn on one canvas (shapes and lights only), picked from a shuffle bag so none repeats
   until all have played, with a random palette, position and direction each time. Browser only. */
(function () {
  'use strict';
  const TAU = Math.PI * 2;
  const PALETTES = [
    ['#ff3d6e', '#ffc928', '#3ccf6e', '#2f9bff', '#b05cff'],
    ['#ff6ec7', '#7df9ff', '#fffb7d', '#b388ff', '#69f0ae'],
    ['#ff9a3c', '#ff5e62', '#ffd36b', '#ff7eb3', '#ffe29a'],
    ['#00c6ff', '#3d7bff', '#7afcff', '#a0e7e5', '#ffffff'],
    ['#ffd700', '#ffb000', '#fff3b0', '#ffe066', '#ffffff'],
    ['#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#32ade6', '#af52de'],
    ['#c084fc', '#f0abfc', '#a5b4fc', '#67e8f9', '#fde68a'],
    ['#00ff9d', '#00e1ff', '#ff00e6', '#fff200', '#ff5c00']
  ];
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const fade = (k) => (k < 0.12 ? k / 0.12 : k > 0.75 ? Math.max(0, (1 - k) / 0.25) : 1);
  function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a))})`; }
  function star(g, x, y, r, rot, points = 5, inner = 0.45) {
    g.beginPath();
    for (let i = 0; i < points * 2; i++) { const rr = i % 2 ? r * inner : r; const a = rot + (i * Math.PI) / points - Math.PI / 2; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    g.closePath();
  }
  function poly(g, x, y, r, sides, rot) { g.beginPath(); for (let i = 0; i < sides; i++) { const a = rot + (i * TAU) / sides; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } g.closePath(); }
  function cloud(g, x, y, s) { g.fillStyle = '#ffffff'; for (const [dx, dy, r] of [[-0.6, 0, 0.5], [0, -0.3, 0.65], [0.6, 0, 0.5], [0, 0.1, 0.55]]) { g.beginPath(); g.arc(x + dx * s, y + dy * s, r * s, 0, TAU); g.fill(); } }
  const dim = (g, W, H, a) => { g.fillStyle = `rgba(12,6,32,${a})`; g.fillRect(0, 0, W, H); };

  let cv = null, g = null, W = 0, H = 0, effects = [], raf = 0, lastT = 0;
  function ensure() {
    if (cv) return;
    cv = document.createElement('canvas'); cv.className = 'celebrate-fx'; cv.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cv); g = cv.getContext('2d'); size(); window.addEventListener('resize', size);
  }
  function size() { const dpr = Math.min(2, window.devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); }
  function frame(t) {
    const dt = Math.min(50, t - (lastT || t)) || 16; lastT = t;
    g.clearRect(0, 0, W, H);
    effects = effects.filter((e) => {
      e.age += dt; const k = e.age / e.dur; if (k >= 1) return false;
      g.save(); try { e.draw(g, k, dt, e.age); } catch (err) { g.restore(); return false; } g.restore(); return true;
    });
    if (effects.length) raf = requestAnimationFrame(frame);
    else { raf = 0; lastT = 0; window.removeEventListener('resize', size); cv.remove(); cv = null; }
  }

  // ---------- Effects: each returns { dur, draw(g, k 0..1, dt ms, age ms) } ----------
  const FX = {
    disco(P, n) {
      const r = Math.min(W, H) * 0.11 + 18, cx = rnd(W * 0.3, W * 0.7), spin = pick([-1, 1]);
      const spots = Array.from({ length: Math.round(34 * n) }, () => ({ a: rnd(0, TAU), d: rnd(0.15, 1), c: pick(P), s: rnd(4, 11) }));
      return { dur: 2100, draw(g, k, dt, age) {
        const f = fade(k), e = 1 - Math.pow(1 - Math.min(1, k / 0.2), 3), cy = -r + e * r * 2.5, rot = age * 0.0016 * spin;
        dim(g, W, H, 0.3 * f);
        g.globalCompositeOperation = 'lighter';
        const L = Math.hypot(W, H);
        for (let i = 0; i < 10; i++) {
          const a = rot * 1.2 + (i * TAU) / 10; g.fillStyle = hexA(P[i % P.length], 0.15 * f);
          g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a - 0.06) * L, cy + Math.sin(a - 0.06) * L); g.lineTo(cx + Math.cos(a + 0.06) * L, cy + Math.sin(a + 0.06) * L); g.closePath(); g.fill();
        }
        for (const s of spots) { const a = s.a + rot * 2.2, R = s.d * Math.max(W, H) * 0.65; g.fillStyle = hexA(s.c, 0.75 * f); g.beginPath(); g.arc(cx + Math.cos(a) * R, cy + H * 0.3 + Math.sin(a) * R * 0.7, s.s, 0, TAU); g.fill(); }
        g.globalCompositeOperation = 'source-over';
        g.strokeStyle = hexA('#d4d4e0', f); g.lineWidth = 2; g.beginPath(); g.moveTo(cx, 0); g.lineTo(cx, cy - r); g.stroke();
        g.globalAlpha = f; g.save(); g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.clip();
        g.fillStyle = '#5b6075'; g.fillRect(cx - r, cy - r, 2 * r, 2 * r);
        const rows = 9;
        for (let i = 0; i < rows; i++) {
          const lat = -Math.PI / 2 + ((i + 0.5) * Math.PI) / rows, y = cy + Math.sin(lat) * r, rr = Math.cos(lat) * r, th = (r * 2) / rows;
          const cols = Math.max(4, Math.round(16 * Math.cos(lat)));
          for (let j = 0; j < cols; j++) {
            const lon = (j / cols) * TAU + rot * 3, cz = Math.cos(lon); if (cz < 0.05) continue;
            const w = (TAU / cols) * rr * cz * 0.88, sh = 0.5 + 0.5 * Math.sin(lon * 3 + i * 1.7 + age * 0.012);
            g.fillStyle = sh > 0.9 ? P[(i + j) % P.length] : `hsl(232,12%,${40 + sh * 50}%)`;
            g.fillRect(cx + Math.sin(lon) * rr - w / 2, y - th * 0.44, w, th * 0.88);
          }
        }
        const hl = g.createRadialGradient(cx - r * 0.4, cy - r * 0.45, 2, cx, cy, r);
        hl.addColorStop(0, 'rgba(255,255,255,.85)'); hl.addColorStop(0.3, 'rgba(255,255,255,.08)'); hl.addColorStop(1, 'rgba(0,0,0,.4)');
        g.fillStyle = hl; g.fillRect(cx - r, cy - r, 2 * r, 2 * r); g.restore();
      } };
    },
    fireworks(P, n) {
      const rockets = Array.from({ length: Math.round(rnd(3, 5) * n) }, (_, i) => ({ x: rnd(W * 0.12, W * 0.88), y: H + 10, ty: rnd(H * 0.12, H * 0.42), t0: i * rnd(90, 190), vy: -rnd(0.95, 1.35), c: pick(P), c2: pick(P), kind: pick(['round', 'ring', 'willow', 'double']), parts: null, flash: 0 }));
      return { dur: 2300, draw(g, k, dt, age) {
        dim(g, W, H, 0.22 * fade(k));
        g.globalCompositeOperation = 'lighter';
        for (const r of rockets) {
          if (age < r.t0) continue;
          if (!r.parts) {
            r.y += r.vy * dt; g.strokeStyle = hexA(r.c, 0.95); g.lineWidth = 3; g.beginPath(); g.moveTo(r.x, r.y); g.lineTo(r.x, r.y + 22); g.stroke();
            if (r.y <= r.ty) {
              const N = r.kind === 'ring' ? 50 : 72; r.parts = []; r.flash = 1;
              for (let j = 0; j < N; j++) { const a = (j / N) * TAU + rnd(-0.05, 0.05), sp = r.kind === 'ring' ? 0.33 : rnd(0.08, 0.4); r.parts.push({ x: r.x, y: r.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, c: r.kind === 'double' && j % 2 ? r.c2 : r.c }); }
            }
          } else {
            if (r.flash > 0) { g.fillStyle = hexA('#ffffff', r.flash * 0.45); g.beginPath(); g.arc(r.x, r.y, 50 * (1 - r.flash) + 8, 0, TAU); g.fill(); r.flash -= dt / 220; }
            const grav = r.kind === 'willow' ? 0.00013 : 0.00035, decay = dt / (r.kind === 'willow' ? 1500 : 1100);
            for (const p of r.parts) {
              p.vx *= 0.985; p.vy = p.vy * 0.985 + grav * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= decay; if (p.life <= 0) continue;
              g.strokeStyle = hexA(p.c, p.life); g.lineWidth = 2.4; g.beginPath(); g.moveTo(p.x - p.vx * 45, p.y - p.vy * 45); g.lineTo(p.x, p.y); g.stroke();
              if (Math.random() < 0.25) { g.fillStyle = hexA('#ffffff', p.life); g.fillRect(p.x, p.y, 2, 2); }
            }
          }
        }
      } };
    },
    balloons(P, n) {
      const bs = Array.from({ length: Math.round(rnd(9, 13) * n) }, () => ({ x: rnd(0, W), y: H + rnd(40, 300), r: rnd(22, 38), v: rnd(0.38, 0.62), w: rnd(0, TAU), c: pick(P) }));
      return { dur: 2400, draw(g, k, dt, age) {
        g.globalAlpha = k > 0.85 ? (1 - k) / 0.15 : 1;
        for (const b of bs) {
          b.y -= b.v * dt; const x = b.x + Math.sin(age * 0.003 + b.w) * 12, y = b.y, ry = b.r * 1.2;
          g.strokeStyle = 'rgba(120,120,140,.75)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, y + ry + 4);
          for (let s = 1; s <= 7; s++) g.lineTo(x + Math.sin(age * 0.006 + s + b.w) * 5, y + ry + 4 + s * 9); g.stroke();
          g.fillStyle = b.c; g.beginPath(); g.ellipse(x, y, b.r, ry, 0, 0, TAU); g.fill();
          g.beginPath(); g.moveTo(x - 5, y + ry + 6); g.lineTo(x + 5, y + ry + 6); g.lineTo(x, y + ry - 2); g.closePath(); g.fill();
          g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 2; g.beginPath(); g.ellipse(x, y, b.r, ry, 0, 0, TAU); g.stroke();
          g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.ellipse(x - b.r * 0.35, y - b.r * 0.45, b.r * 0.2, b.r * 0.34, -0.5, 0, TAU); g.fill();
        }
      } };
    },
    starburst(P, n) {
      const cx = rnd(W * 0.3, W * 0.7), cy = rnd(H * 0.3, H * 0.55), N = Math.round(18 * n);
      const st = Array.from({ length: N }, (_, i) => ({ a: (i / N) * TAU + rnd(-0.2, 0.2), sp: rnd(0.25, 0.6), r: rnd(9, 20), rot: rnd(0, TAU), vr: rnd(-0.012, 0.012), c: pick(P), pts: pick([4, 5, 5, 6]) }));
      return { dur: 1500, draw(g, k, dt, age) {
        const f = fade(k), fl = Math.max(0, 1 - k * 3);
        if (fl > 0) { g.globalCompositeOperation = 'lighter'; const gr = g.createRadialGradient(cx, cy, 0, cx, cy, 170); gr.addColorStop(0, hexA('#ffffff', 0.85 * fl)); gr.addColorStop(1, hexA('#ffffff', 0)); g.fillStyle = gr; g.fillRect(cx - 170, cy - 170, 340, 340); g.globalCompositeOperation = 'source-over'; }
        g.globalAlpha = f;
        for (const s of st) {
          const d = s.sp * age * (1 - k * 0.4); s.rot += s.vr * dt;
          g.fillStyle = s.c; star(g, cx + Math.cos(s.a) * d, cy + Math.sin(s.a) * d + age * age * 0.00008, s.r * (0.6 + k), s.rot, s.pts); g.fill();
          g.lineWidth = 2.5; g.strokeStyle = 'rgba(26,16,51,.55)'; g.stroke();
        }
      } };
    },
    rainbow(P, n) {
      const cols = ['#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#32ade6', '#5856d6', '#af52de'];
      const cx = W / 2, cy = H * rnd(0.62, 0.75), R = Math.min(W * 0.47, H * 0.45), dir = pick([1, -1]), bw = R * 0.075;
      const sp = Array.from({ length: Math.round(40 * n) }, () => ({ t: Math.random(), off: rnd(-1, 1), s: rnd(2, 4) }));
      return { dur: 2000, draw(g, k, dt, age) {
        const f = fade(k), sweep = Math.min(1, k / 0.4);
        g.globalAlpha = f * 0.88; g.lineCap = 'butt';
        cols.forEach((c, i) => { g.strokeStyle = c; g.lineWidth = bw + 1; g.beginPath(); if (dir > 0) g.arc(cx, cy, R - i * bw, Math.PI, Math.PI + Math.PI * sweep); else g.arc(cx, cy, R - i * bw, 0, -Math.PI * sweep, true); g.stroke(); });
        g.globalAlpha = f; cloud(g, cx - R + bw * 3, cy + bw, R * 0.2); cloud(g, cx + R - bw * 3, cy + bw, R * 0.2);
        g.globalCompositeOperation = 'lighter';
        for (const s of sp) {
          if (s.t > sweep) continue;
          const a = dir > 0 ? Math.PI + Math.PI * s.t : -Math.PI * s.t, r = R - bw * 3 + s.off * bw * 4.5;
          g.fillStyle = hexA('#ffffff', f * (0.5 + 0.5 * Math.sin(age * 0.02 + s.t * 50))); star(g, cx + Math.cos(a) * r, cy + Math.sin(a) * r, s.s * 2, age * 0.004, 4, 0.3); g.fill();
        }
      } };
    },
    lasers(P, n) {
      const top = Math.random() < 0.4, cnt = pick([2, 3, 4]), base = top ? Math.PI / 2 : -Math.PI / 2, L = Math.hypot(W, H);
      return { dur: 1800, draw(g, k, dt, age) {
        const f = fade(k); dim(g, W, H, 0.3 * f); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
        for (let i = 0; i < cnt; i++) {
          const x = (W * (i + 1)) / (cnt + 1), y = top ? 0 : H;
          for (let b = 0; b < 2 * n; b++) {
            const a = base + Math.sin(age * 0.003 * (1 + i * 0.35) + i * 2 + b * 2.4) * 0.8, c = P[(i * 2 + b) % P.length];
            const x2 = x + Math.cos(a) * L, y2 = y + Math.sin(a) * L;
            g.strokeStyle = hexA(c, 0.22 * f); g.lineWidth = 14; g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke();
            g.strokeStyle = hexA(c, 0.95 * f); g.lineWidth = 3; g.stroke();
          }
          const gr = g.createRadialGradient(x, y, 0, x, y, 40); gr.addColorStop(0, hexA('#ffffff', f)); gr.addColorStop(1, hexA(P[i % P.length], 0)); g.fillStyle = gr; g.fillRect(x - 40, y - 40, 80, 80);
        }
      } };
    },
    bubbles(P, n) {
      const bs = Array.from({ length: Math.round(24 * n) }, () => ({ x: rnd(0, W), y: H + rnd(0, 220), r: rnd(10, 30), v: rnd(0.28, 0.55), w: rnd(0, TAU), pop: rnd(0.45, 0.92), c: pick(P), pt: 0, px: 0 }));
      return { dur: 2100, draw(g, k, dt, age) {
        for (const b of bs) {
          if (k < b.pop) {
            b.y -= b.v * dt; const x = b.x + Math.sin(age * 0.004 + b.w) * 10; b.px = x;
            const gr = g.createRadialGradient(x, b.y, b.r * 0.2, x, b.y, b.r); gr.addColorStop(0, hexA(b.c, 0.05)); gr.addColorStop(0.8, hexA(b.c, 0.3)); gr.addColorStop(1, hexA(b.c, 0.6));
            g.fillStyle = gr; g.beginPath(); g.arc(x, b.y, b.r, 0, TAU); g.fill();
            g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 1.5; g.stroke();
            g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.arc(x - b.r * 0.4, b.y - b.r * 0.4, b.r * 0.18, 0, TAU); g.fill();
          } else if ((b.pt += dt) < 260) {
            const t = b.pt / 260; g.strokeStyle = hexA(b.c, 1 - t); g.lineWidth = 2;
            g.beginPath(); g.arc(b.px, b.y, b.r * (1 + t * 0.6), 0, TAU); g.stroke();
            for (let i = 0; i < 6; i++) { const a = (i * TAU) / 6; g.beginPath(); g.moveTo(b.px + Math.cos(a) * b.r * (1 + t), b.y + Math.sin(a) * b.r * (1 + t)); g.lineTo(b.px + Math.cos(a) * b.r * (1.3 + t), b.y + Math.sin(a) * b.r * (1.3 + t)); g.stroke(); }
          }
        }
      } };
    },
    rocket(P, n) {
      const ltr = Math.random() < 0.5, y0 = H * rnd(0.65, 0.85), y1 = H * rnd(0.1, 0.3), smoke = [], stars = [], sc = 1.4;
      const pos = (e) => [ltr ? -90 + (W + 180) * e : W + 90 - (W + 180) * e, y0 + (y1 - y0) * e - Math.sin(e * Math.PI) * H * 0.12];
      return { dur: 1900, draw(g, k, dt, age) {
        const t = Math.min(1, k / 0.85), e = t * t * (3 - 2 * t), [x, y] = pos(e), [x2, y2] = pos(Math.min(1, e + 0.01)), a = Math.atan2(y2 - y, x2 - x || (ltr ? 1 : -1));
        if (t < 1) for (let i = 0; i < 2 * n; i++) {
          smoke.push({ x: x - Math.cos(a) * 30, y: y - Math.sin(a) * 30, vx: -Math.cos(a) * 0.08 + rnd(-0.05, 0.05), vy: -Math.sin(a) * 0.08 + rnd(-0.05, 0.05), life: 1, r: rnd(6, 13) });
          if (Math.random() < 0.6) stars.push({ x: x - Math.cos(a) * 30, y: y - Math.sin(a) * 30, life: 1, c: pick(P), r: rnd(4, 9), rot: rnd(0, TAU), vx: rnd(-0.1, 0.1), vy: rnd(-0.1, 0.1) });
        }
        for (const s of smoke) { s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt / 900; s.r += dt * 0.02; if (s.life > 0) { g.fillStyle = `rgba(240,240,250,${s.life * 0.55})`; g.beginPath(); g.arc(s.x, s.y, s.r, 0, TAU); g.fill(); } }
        for (const s of stars) { s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt / 1000; if (s.life > 0) { g.fillStyle = hexA(s.c, s.life); star(g, s.x, s.y, s.r, s.rot + age * 0.004); g.fill(); } }
        if (t >= 1) return;
        g.translate(x, y); g.rotate(a); g.scale(sc, sc);
        const fl = rnd(16, 30); g.fillStyle = '#ff8a1f'; g.beginPath(); g.moveTo(-26, -8); g.lineTo(-26 - fl, 0); g.lineTo(-26, 8); g.closePath(); g.fill();
        g.fillStyle = '#ffe066'; g.beginPath(); g.moveTo(-26, -4); g.lineTo(-26 - fl * 0.6, 0); g.lineTo(-26, 4); g.closePath(); g.fill();
        g.lineWidth = 2.5; g.strokeStyle = '#1a1033'; g.lineJoin = 'round';
        g.fillStyle = '#ef4444'; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(-12, 10 * s); g.lineTo(-30, 22 * s); g.lineTo(-24, 9 * s); g.closePath(); g.fill(); g.stroke(); }
        g.fillStyle = '#f1f5f9'; g.beginPath(); g.moveTo(34, 0); g.quadraticCurveTo(20, -14, -26, -11); g.lineTo(-26, 11); g.quadraticCurveTo(20, 14, 34, 0); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = '#ef4444'; g.beginPath(); g.moveTo(34, 0); g.quadraticCurveTo(28, -8, 20, -10.5); g.lineTo(20, 10.5); g.quadraticCurveTo(28, 8, 34, 0); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = '#38bdf8'; g.beginPath(); g.arc(4, 0, 6, 0, TAU); g.fill(); g.stroke();
      } };
    },
    treasure(P, n) {
      const cs = Array.from({ length: Math.round(26 * n) }, () => ({ x: rnd(0, W), y: -rnd(20, H * 0.6), vy: rnd(0.1, 0.3), vx: rnd(-0.05, 0.05), r: rnd(10, 16), spin: rnd(0, TAU), vs: rnd(0.008, 0.02), gem: Math.random() < 0.4, c: pick(P) }));
      return { dur: 1900, draw(g, k, dt, age) {
        g.globalAlpha = k > 0.85 ? (1 - k) / 0.15 : 1;
        for (const c of cs) {
          c.vy += 0.0005 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.spin += c.vs * dt; const sx = Math.cos(c.spin);
          g.save(); g.translate(c.x, c.y);
          if (c.gem) {
            g.scale(Math.abs(sx) * 0.8 + 0.2, 1); g.fillStyle = c.c; g.strokeStyle = '#1a1033'; g.lineWidth = 2;
            g.beginPath(); g.moveTo(-c.r, -c.r * 0.3); g.lineTo(-c.r * 0.5, -c.r); g.lineTo(c.r * 0.5, -c.r); g.lineTo(c.r, -c.r * 0.3); g.lineTo(0, c.r); g.closePath(); g.fill(); g.stroke();
            g.fillStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.moveTo(-c.r * 0.5, -c.r); g.lineTo(0, -c.r * 0.3); g.lineTo(-c.r, -c.r * 0.3); g.closePath(); g.fill();
          } else {
            g.scale(Math.max(0.08, Math.abs(sx)), 1);
            g.fillStyle = '#c98a00'; g.beginPath(); g.arc(0, 2, c.r, 0, TAU); g.fill();
            g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(0, 0, c.r, 0, TAU); g.fill();
            g.strokeStyle = '#e0a800'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, c.r * 0.68, 0, TAU); g.stroke();
            if (sx > 0) { g.fillStyle = '#e0a800'; star(g, 0, 0, c.r * 0.45, 0); g.fill(); }
          }
          g.restore();
          if (Math.random() < 0.15) { g.fillStyle = '#ffffff'; star(g, c.x + rnd(-14, 14), c.y + rnd(-14, 14), 3, 0, 4, 0.3); g.fill(); }
        }
      } };
    },
    streamers(P, n) {
      const ps = [];
      for (const side of [0, 1]) {
        const x = side ? W + 10 : -10, y = H * rnd(0.75, 0.95);
        for (let i = 0; i < Math.round(42 * n); i++) {
          const a = side ? -Math.PI + rnd(0.3, 0.95) : -rnd(0.3, 0.95), sp = rnd(0.6, 1.25);
          ps.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, c: pick(P), w: rnd(6, 12), h: rnd(10, 18), rot: rnd(0, TAU), vr: rnd(-0.02, 0.02), ph: rnd(0, TAU), kind: pick(['rect', 'curl', 'dot', 'rect']) });
        }
      }
      return { dur: 2200, draw(g, k, dt, age) {
        g.globalAlpha = k > 0.8 ? (1 - k) / 0.2 : 1;
        for (const p of ps) {
          p.vx *= 0.985; p.vy = p.vy * 0.985 + 0.0011 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
          g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.fillStyle = p.c; g.strokeStyle = p.c;
          if (p.kind === 'rect') { g.scale(Math.sin(age * 0.012 + p.ph), 1); g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); }
          else if (p.kind === 'dot') { g.beginPath(); g.arc(0, 0, p.w / 2, 0, TAU); g.fill(); }
          else { g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); for (let s = 0; s <= 12; s++) g.lineTo(s * 2.2 - 13, Math.sin(s * 0.9 + age * 0.015 + p.ph) * 5); g.stroke(); }
          g.restore();
        }
      } };
    },
    rings(P, n) {
      const cx = rnd(W * 0.25, W * 0.75), cy = rnd(H * 0.25, H * 0.6), shape = pick(['circle', 'square', 'hex', 'star', 'triangle']), spin = pick([-1, 1]);
      const rs = Array.from({ length: Math.round(6 * n) }, (_, i) => ({ t0: i * 110, c: P[i % P.length] }));
      const sp = Array.from({ length: 36 }, () => ({ a: rnd(0, TAU), v: rnd(0.15, 0.45), c: pick(P) }));
      const M = Math.max(W, H) * 0.7;
      return { dur: 1600, draw(g, k, dt, age) {
        g.globalCompositeOperation = 'lighter'; g.lineJoin = 'round';
        for (const r of rs) {
          const t = (age - r.t0) / 950; if (t <= 0 || t >= 1) continue;
          const R = 20 + t * M, rot = t * 1.5 * spin;
          if (shape === 'circle') { g.beginPath(); g.arc(cx, cy, R, 0, TAU); }
          else if (shape === 'star') star(g, cx, cy, R, rot, 5, 0.55);
          else poly(g, cx, cy, R, shape === 'square' ? 4 : shape === 'hex' ? 6 : 3, rot);
          g.strokeStyle = hexA(r.c, 0.25 * (1 - t)); g.lineWidth = 18 * (1 - t) + 4; g.stroke();
          g.strokeStyle = hexA(r.c, 1 - t); g.lineWidth = 4 * (1 - t) + 1.5; g.stroke();
        }
        for (const s of sp) { const d = s.v * age; g.fillStyle = hexA(s.c, 1 - k); g.beginPath(); g.arc(cx + Math.cos(s.a) * d, cy + Math.sin(s.a) * d, 3, 0, TAU); g.fill(); }
      } };
    },
    comets(P, n) {
      const dir = pick([1, -1]), ang = dir > 0 ? 0.6 : Math.PI - 0.6;
      const cs = Array.from({ length: Math.round(8 * n) }, (_, i) => ({ t0: i * rnd(60, 150), x: dir > 0 ? rnd(-W * 0.4, W * 0.6) : rnd(W * 0.4, W * 1.4), y: -rnd(20, H * 0.35), v: rnd(0.9, 1.4), c: pick(P), L: rnd(110, 200) }));
      return { dur: 1700, draw(g, k, dt, age) {
        dim(g, W, H, 0.25 * fade(k)); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
        for (const c of cs) {
          if (age < c.t0) continue;
          const d = (age - c.t0) * c.v, x = c.x + Math.cos(ang) * d, y = c.y + Math.sin(ang) * d, tx = x - Math.cos(ang) * c.L, ty = y - Math.sin(ang) * c.L;
          const gr = g.createLinearGradient(tx, ty, x, y); gr.addColorStop(0, hexA(c.c, 0)); gr.addColorStop(1, hexA(c.c, 0.95));
          g.strokeStyle = gr; g.lineWidth = 5; g.beginPath(); g.moveTo(tx, ty); g.lineTo(x, y); g.stroke();
          g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x, y, 4.5, 0, TAU); g.fill();
          g.fillStyle = hexA(c.c, 0.35); g.beginPath(); g.arc(x, y, 11, 0, TAU); g.fill();
        }
      } };
    },
    fountain(P, n) {
      const glyphs = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '+', '×', '÷', '=', '✓', '★', 'π', '%', '√'];
      const ox = W * rnd(0.3, 0.7), total = Math.round(38 * n), ps = []; let emitted = 0;
      return { dur: 2000, draw(g, k, dt) {
        while (emitted < total * Math.min(1, k / 0.4)) { const a = -Math.PI / 2 + rnd(-0.45, 0.45), sp = rnd(0.9, 1.35); ps.push({ x: ox, y: H + 10, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, gl: pick(glyphs), c: pick(P), s: rnd(22, 42), rot: 0, vr: rnd(-0.008, 0.008) }); emitted++; }
        g.globalAlpha = k > 0.85 ? (1 - k) / 0.15 : 1; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
        for (const p of ps) {
          p.vy += 0.0016 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
          g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.font = `900 ${p.s}px "Lilita One", "Fredoka", system-ui, sans-serif`;
          g.lineWidth = 5; g.strokeStyle = '#1a1033'; g.strokeText(p.gl, 0, 0); g.fillStyle = p.c; g.fillText(p.gl, 0, 0); g.restore();
        }
      } };
    },
    galaxy(P, n) {
      const cx = W / 2 + rnd(-W * 0.15, W * 0.15), cy = H * rnd(0.35, 0.5), arms = pick([2, 3, 4, 5]), dirn = pick([1, -1]), M = Math.min(W, H) * 0.48;
      const ps = Array.from({ length: Math.round(140 * n) }, (_, i) => ({ arm: i % arms, d: Math.random(), off: rnd(-0.3, 0.3), s: rnd(1.6, 4.2), c: pick(P) }));
      return { dur: 1800, draw(g, k, dt, age) {
        const f = fade(k), spread = Math.min(1, k / 0.35), rot = age * 0.0022 * dirn;
        dim(g, W, H, 0.25 * f); g.globalCompositeOperation = 'lighter';
        const gr = g.createRadialGradient(cx, cy, 0, cx, cy, 90); gr.addColorStop(0, hexA('#ffffff', 0.9 * f)); gr.addColorStop(0.4, hexA(P[0], 0.4 * f)); gr.addColorStop(1, hexA(P[0], 0)); g.fillStyle = gr; g.fillRect(cx - 90, cy - 90, 180, 180);
        for (const p of ps) {
          const R = p.d * M * spread * (1 + k * 0.3), a = (p.arm * TAU) / arms + p.d * 3.4 * dirn + p.off + rot;
          g.fillStyle = hexA(p.c, f * (1 - p.d * 0.45)); g.beginPath(); g.arc(cx + Math.cos(a) * R, cy + Math.sin(a) * R * 0.78, p.s, 0, TAU); g.fill();
        }
      } };
    },
    planes(P, n) {
      const ps = Array.from({ length: Math.round(rnd(3, 5) * n) }, (_, i) => ({ t0: i * 130, y: H * rnd(0.15, 0.7), ltr: Math.random() < 0.5, loop: Math.random() < 0.6, c: pick(P), trail: [] }));
      const at = (p, u) => {
        const s = p.ltr ? 1 : -1, bx = p.ltr ? -60 + (W + 120) * u : W + 60 - (W + 120) * u;
        if (p.loop && u > 0.4 && u < 0.6) { const ph = ((u - 0.4) / 0.2) * TAU; return [bx + s * 55 * Math.sin(ph), p.y - 55 * (1 - Math.cos(ph))]; }
        return [bx, p.y + Math.sin(u * TAU) * 24];
      };
      return { dur: 2000, draw(g, k, dt, age) {
        g.globalAlpha = k > 0.9 ? (1 - k) / 0.1 : 1;
        for (const p of ps) {
          const u = (age - p.t0) / 1650; if (u <= 0 || u > 1.05) continue;
          const [x, y] = at(p, Math.min(1, u)), [x2, y2] = at(p, Math.min(1, u + 0.01)); p.trail.push([x, y]); if (p.trail.length > 34) p.trail.shift();
          g.setLineDash([6, 6]); g.strokeStyle = hexA(p.c, 0.8); g.lineWidth = 2.5; g.beginPath(); p.trail.forEach(([tx, ty], i) => (i ? g.lineTo(tx, ty) : g.moveTo(tx, ty))); g.stroke(); g.setLineDash([]);
          g.save(); g.translate(x, y); g.rotate(Math.atan2(y2 - y, x2 - x)); g.scale(1.5, 1.5);
          g.fillStyle = '#ffffff'; g.strokeStyle = '#1a1033'; g.lineWidth = 1.6; g.lineJoin = 'round';
          g.beginPath(); g.moveTo(16, 0); g.lineTo(-11, -10); g.lineTo(-5, 0); g.lineTo(-11, 10); g.closePath(); g.fill(); g.stroke();
          g.strokeStyle = p.c; g.lineWidth = 2; g.beginPath(); g.moveTo(16, 0); g.lineTo(-5, 0); g.stroke(); g.restore();
        }
      } };
    },
    checkmark(P, n) {
      const cx = W / 2 + rnd(-W * 0.1, W * 0.1), cy = H * rnd(0.32, 0.45), s = Math.min(W, H) * 0.2, c = pick(P);
      const pts = [[cx - s * 0.55, cy], [cx - s * 0.15, cy + s * 0.4], [cx + s * 0.6, cy - s * 0.45]];
      const l1 = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]), l2 = Math.hypot(pts[2][0] - pts[1][0], pts[2][1] - pts[1][1]);
      const sp = Array.from({ length: Math.round(28 * n) }, (_, i) => ({ a: (i / 28) * TAU + rnd(-0.1, 0.1), v: rnd(0.2, 0.5), c: pick(P), r: rnd(4, 9) }));
      return { dur: 1500, draw(g, k, dt, age) {
        const f = fade(k), prog = Math.min(1, k / 0.32), d = prog * (l1 + l2), pop = k > 0.32 ? 1 + Math.sin(Math.min(1, (k - 0.32) / 0.15) * Math.PI) * 0.15 : 1;
        g.globalAlpha = f; g.translate(cx, cy); g.scale(pop, pop); g.translate(-cx, -cy);
        const t2 = Math.max(0, k - 0.32) / 0.68;
        if (t2 > 0) { g.strokeStyle = hexA(c, (1 - t2) * 0.8); g.lineWidth = 8 * (1 - t2) + 2; g.beginPath(); g.arc(cx, cy, s * (0.8 + t2 * 1.2), 0, TAU); g.stroke(); }
        g.lineCap = 'round'; g.lineJoin = 'round';
        const path = () => { g.beginPath(); g.moveTo(...pts[0]); if (d <= l1) g.lineTo(pts[0][0] + (pts[1][0] - pts[0][0]) * (d / l1), pts[0][1] + (pts[1][1] - pts[0][1]) * (d / l1)); else { g.lineTo(...pts[1]); const u = (d - l1) / l2; g.lineTo(pts[1][0] + (pts[2][0] - pts[1][0]) * u, pts[1][1] + (pts[2][1] - pts[1][1]) * u); } };
        path(); g.strokeStyle = '#1a1033'; g.lineWidth = s * 0.24; g.stroke(); path(); g.strokeStyle = c; g.lineWidth = s * 0.16; g.stroke();
        if (t2 > 0) for (const p of sp) { const dd = p.v * (age - 480); g.fillStyle = hexA(p.c, 1 - t2); star(g, cx + Math.cos(p.a) * dd, cy + Math.sin(p.a) * dd, p.r, age * 0.005); g.fill(); }
      } };
    }
  };
  const NAMES = Object.keys(FX);

  // ---------- Shuffle bag: no effect repeats until every one has played ----------
  let bag = [], last = '', lastPal = -1;
  function next() {
    if (!bag.length) { bag = NAMES.slice().sort(() => Math.random() - 0.5); if (bag[bag.length - 1] === last) bag.unshift(bag.pop()); }
    return (last = bag.pop());
  }
  function palette() { let i; do { i = Math.floor(Math.random() * PALETTES.length); } while (i === lastPal); lastPal = i; return PALETTES[i]; }
  const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function playNamed(name, opts = {}) {
    if (reduced() || !FX[name]) return null;
    ensure();
    const n = opts.combo >= 5 ? 1.5 : opts.combo >= 3 ? 1.2 : 1;
    const e = FX[name](palette(), n); e.age = 0; e.name = name;
    if (effects.length > 1) effects.shift(); // never stack more than two
    effects.push(e);
    if (!raf) raf = requestAnimationFrame(frame);
    if (window.__MQ_TEST__) (window.__MQ_TEST__.fx = window.__MQ_TEST__.fx || []).push(name);
    return name;
  }
  // Big moments (every 5 in a row) get two effects at once.
  function play(opts = {}) {
    const a = playNamed(next(), opts);
    if (opts.combo && opts.combo % 5 === 0) setTimeout(() => playNamed(next(), opts), 250);
    return a;
  }
  window.MathQuestCelebrate = { play, playNamed, names: NAMES };
})();
