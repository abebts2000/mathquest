/* MathQuest mascots: 15 original characters, 5 per grade, drawn as SVG.
   Grade 3 = cute and round, Grade 7 = sporty and bold, Geometry = sleek and angular.
   Each one evolves through 3 stages (Rookie → Pro → Legend) as the kid earns trophies. Browser only. */
(function () {
  'use strict';
  const S = (t, a, ...k) => window.MathQuestDOM.svg(t, a, ...k);
  const OL = '#1a1033', W = '#ffffff';
  const mix = (c, p, w = '#000') => `color-mix(in srgb, ${c} ${p}%, ${w})`;
  const st = (fill, sw = 3, extra = '') => `fill:${fill};stroke:${OL};stroke-width:${sw};stroke-linejoin:round;${extra}`;
  const P = (d, fill, sw = 3, a = {}) => S('path', Object.assign({ d, style: st(fill, sw) }, a));
  const R = (x, y, w, h, rx, fill, sw = 3, a = {}) => S('rect', Object.assign({ x, y, width: w, height: h, rx, style: st(fill, sw) }, a));
  const C = (cx, cy, r, fill, sw = 3, a = {}) => S('circle', Object.assign({ cx, cy, r, style: st(fill, sw) }, a));
  const E = (cx, cy, rx, ry, fill, sw = 3, a = {}) => S('ellipse', Object.assign({ cx, cy, rx, ry, style: st(fill, sw) }, a));
  const POLY = (pts, fill, sw = 3, a = {}) => S('polygon', Object.assign({ points: pts, style: st(fill, sw) }, a));
  const shine = (cx, cy, rx, ry, rot = -20) => S('ellipse', { cx, cy, rx, ry, transform: `rotate(${rot} ${cx} ${cy})`, fill: W, opacity: '.32' });
  const shadow = (y = 112, rx = 30) => S('ellipse', { class: 'pip-shadow', cx: 60, cy: y, rx, ry: 5, fill: OL, opacity: '.14' });
  const arms = (c, y = 54, x1 = 12, x2 = 88) => [R(x1, y, 20, 10, 5, c, 2.5, { class: 'pip-arm-l' }), R(x2, y, 20, 10, 5, c, 2.5, { class: 'pip-arm-r' })];

  // ---------- Faces ----------
  function arcEye(x, y, col = W, w = 5) { return S('path', { d: `M${x - 6} ${y + 1} q6 -9 12 0`, stroke: col, 'stroke-width': w, fill: 'none', 'stroke-linecap': 'round' }); }
  function face(type, state, o) {
    const ex1 = o.ex1 || 48, ex2 = o.ex2 || 72, ey = o.ey || 54, my = o.my || 70, eye = o.eye || '#22d3ee', mid = (ex1 + ex2) / 2;
    const g = S('g', { class: 'pip-face' });
    const happy = state === 'happy' || state === 'cheer';
    const line = (d, col = W, w = 4.5) => S('path', { d, stroke: col, 'stroke-width': w, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
    if (type === 'cute') {
      if (happy) g.append(arcEye(ex1, ey), arcEye(ex2, ey));
      else {
        const dx = state === 'think' ? 2.5 : 0.5, dy = state === 'think' ? -3 : state === 'sad' ? 2.5 : 1;
        const eyes = S('g', { class: state === 'idle' ? 'pip-eyes' : '' });
        for (const x of [ex1, ex2]) eyes.append(C(x, ey, 7.5, W, 2), S('circle', { cx: x + dx, cy: ey + dy, r: 3.8, fill: OL }), S('circle', { cx: x + dx + 1.4, cy: ey + dy - 1.6, r: 1.3, fill: W }));
        g.append(eyes);
        if (state === 'sad') g.append(line(`M${ex1 - 8} ${ey - 11} l12 4 M${ex2 + 8} ${ey - 11} l-12 4`, OL, 3));
      }
      if (!o.noMouth) {
        if (happy) g.append(S('path', { d: `M${ex1 - 1} ${my - 4} Q${mid} ${my + 14} ${ex2 + 1} ${my - 4} Z`, fill: W, stroke: OL, 'stroke-width': 2 }));
        else if (state === 'sad') g.append(line(`M${mid - 9} ${my + 4} q9 -8 18 0`, OL, 3.5));
        else if (state === 'think') g.append(line(`M${mid - 7} ${my + 1} h14`, OL, 3.5));
        else g.append(line(`M${mid - 9} ${my - 1} q9 9 18 0`, OL, 3.5));
      }
      g.append(S('circle', { cx: ex1 - 9, cy: my - 2, r: 4, fill: '#ff7eb3', opacity: '.55' }), S('circle', { cx: ex2 + 9, cy: my - 2, r: 4, fill: '#ff7eb3', opacity: '.55' }));
    } else if (type === 'cool') {
      if (happy) {
        g.append(arcEye(ex1, ey, W, 5.5), arcEye(ex2, ey, W, 5.5), line(`M${ex1 - 8} ${ey - 11} l12 -2 M${ex2 + 8} ${ey - 11} l-12 -2`, OL, 3.5));
        if (!o.noMouth) g.append(S('path', { d: `M${ex1 - 2} ${my - 3} L${ex2 + 2} ${my - 3} Q${mid} ${my + 12} ${ex1 - 2} ${my - 3} Z`, fill: W, stroke: OL, 'stroke-width': 2.5 }), line(`M${ex1 + 2} ${my - 3} h${ex2 - ex1 - 4}`, OL, 1.5));
      } else {
        const sad = state === 'sad', think = state === 'think';
        const eyes = S('g', { class: state === 'idle' ? 'pip-eyes' : '' });
        for (const x of [ex1, ex2]) eyes.append(R(x - 7, ey - (sad ? 2 : 5), 14, sad ? 7 : 10, 4, W, 2), S('circle', { cx: x + (think ? 2 : 1), cy: ey + (think ? -1.5 : sad ? 1.5 : 0.5), r: 3.2, fill: OL }));
        g.append(eyes);
        const b = sad ? `M${ex1 - 8} ${ey - 6} l13 -5 M${ex2 + 8} ${ey - 6} l-13 -5` : think ? `M${ex1 - 8} ${ey - 9} l13 3 M${ex2 - 6} ${ey - 13} l14 -2` : `M${ex1 - 8} ${ey - 10} l13 4 M${ex2 + 8} ${ey - 10} l-13 4`;
        g.append(line(b, OL, 4));
        if (!o.noMouth) g.append(line(sad ? `M${mid - 8} ${my + 3} q8 -6 16 0` : think ? `M${mid - 6} ${my} h12` : `M${mid - 9} ${my} q10 6 19 -3`, W, 4));
      }
    } else if (type === 'visor') {
      const w = ex2 - ex1 + 30;
      g.append(R(mid - w / 2, ey - 10, w, 20, 10, '#0b1020', 3));
      const glow = (el) => { el.setAttribute('style', `filter: drop-shadow(0 0 3px ${eye})`); return el; };
      if (happy) g.append(glow(arcEye(ex1, ey + 1, eye, 4)), glow(arcEye(ex2, ey + 1, eye, 4)));
      else if (state === 'sad') g.append(glow(line(`M${ex1 - 6} ${ey - 2} l12 4 M${ex2 + 6} ${ey - 2} l-12 4`, eye, 4)));
      else {
        const eyes = S('g', { class: state === 'idle' ? 'pip-eyes' : '' });
        eyes.append(glow(S('rect', { x: ex1 - 7, y: ey - 3, width: 14, height: 6, rx: 3, fill: eye })),
          glow(S('rect', { x: ex2 - 7, y: ey - (state === 'think' ? 5 : 3), width: 14, height: state === 'think' ? 4 : 6, rx: 2, fill: eye })));
        g.append(eyes);
      }
      if (!o.noMouth) g.append(happy ? line(`M${mid - 8} ${my} q8 6 16 0`, eye, 3) : line(`M${mid - 6} ${my} h12`, mix(eye, 60, '#0b1020'), 3));
    } else { // sharp
      const almond = (x, flip) => { const s = flip ? -1 : 1; return S('path', { d: `M${x - 8 * s} ${ey + 1} Q${x} ${ey - 8} ${x + 8 * s} ${ey - 2} Q${x + 1 * s} ${ey + 6} ${x - 8 * s} ${ey + 1} Z`, fill: W, stroke: OL, 'stroke-width': 2 }); };
      if (happy) g.append(arcEye(ex1, ey, W, 4.5), arcEye(ex2, ey, W, 4.5));
      else {
        const eyes = S('g', { class: state === 'idle' ? 'pip-eyes' : '' });
        const dy = state === 'think' ? -2.5 : state === 'sad' ? 1.5 : 0, dx = state === 'think' ? 2 : 0;
        for (const [x, f] of [[ex1, false], [ex2, true]]) eyes.append(almond(x, f), S('circle', { cx: x + dx, cy: ey - 1 + dy, r: 3.4, fill: eye }), S('circle', { cx: x + dx, cy: ey - 1 + dy, r: 1.5, fill: OL }));
        g.append(eyes);
      }
      const b = state === 'sad' ? `M${ex1 - 9} ${ey - 6} l12 -5 M${ex2 + 9} ${ey - 6} l-12 -5` : `M${ex1 - 9} ${ey - 10} l13 4 M${ex2 + 9} ${ey - 10} l-13 4`;
      g.append(line(b, OL, 3.5));
      if (!o.noMouth) g.append(happy ? S('path', { d: `M${mid - 7} ${my - 2} L${mid + 7} ${my - 2} Q${mid} ${my + 8} ${mid - 7} ${my - 2} Z`, fill: W, stroke: OL, 'stroke-width': 2 }) : line(state === 'sad' ? `M${mid - 6} ${my + 2} q6 -4 12 0` : `M${mid - 6} ${my} q7 3 12 -2`, OL, 3));
    }
    return g;
  }

  // ---------- The roster ----------
  const LIST = [
    // Grade 3: cute & round
    { id: 'pip', name: 'Pip', tier: 'g3', color: '#ff9f1c', face: 'cute', blurb: 'A cheerful number block.',
      body: (c) => [shadow(), ...arms(c), R(38, 96, 12, 12, 6, c, 2.5), R(70, 96, 12, 12, 6, c, 2.5), R(26, 20, 68, 76, 22, c), shine(44, 32, 12, 5)] },
    { id: 'bloop', name: 'Bloop', tier: 'g3', color: '#4ade80', face: 'cute', o: { ey: 58, my: 74 }, hatY: 5, blurb: 'A bouncy slime who loves fractions.',
      body: (c) => [shadow(110), P('M60 26 q-7 -11 0 -18 q7 7 0 18 Z', c, 2.5), P('M22 96 C22 52 34 26 60 26 C86 26 98 52 98 96 Q92 104 86 96 Q80 104 74 96 Q68 104 62 96 Q56 104 50 96 Q44 104 38 96 Q32 104 22 96 Z', c), shine(42, 42, 11, 6)] },
    { id: 'sprout', name: 'Sprout', tier: 'g3', color: '#f4a261', face: 'cute', o: { ey: 60, my: 76 }, hatY: 8, blurb: 'A seed that grows with every answer.',
      body: (c) => [shadow(), ...arms(c, 62, 14, 86), E(46, 102, 8, 5, c, 2.5), E(74, 102, 8, 5, c, 2.5), S('path', { d: 'M60 32 v-8', stroke: '#15803d', 'stroke-width': 4, 'stroke-linecap': 'round' }), P('M60 26 Q40 6 28 18 Q42 32 60 26 Z', '#22c55e', 2.5), P('M60 26 Q80 2 94 14 Q78 30 60 26 Z', '#22c55e', 2.5), E(60, 66, 34, 37, c), shine(46, 46, 11, 6)] },
    { id: 'chirp', name: 'Chirp', tier: 'g3', color: '#facc15', face: 'cute', o: { ey: 56, noMouth: true }, hatY: 4, blurb: 'A speedy bird who never skips a step.',
      body: (c) => [shadow(), P('M52 30 q-2 -14 6 -18 q0 10 4 16 M60 28 q4 -14 14 -14 q-4 8 -6 16', c, 2.5), E(22, 66, 10, 18, mix(c, 80), 2.5, { class: 'pip-arm-l' }), E(98, 66, 10, 18, mix(c, 80), 2.5, { class: 'pip-arm-r' }), S('path', { d: 'M50 98 v10 M46 108 h8 M70 98 v10 M66 108 h8', stroke: '#f97316', 'stroke-width': 4, 'stroke-linecap': 'round' }), C(60, 64, 37, c), E(60, 80, 20, 14, mix(c, 55, '#fff'), 0), shine(44, 42, 11, 6)],
      front: () => [P('M52 64 L68 64 L60 74 Z', '#f97316', 2.5)] },
    { id: 'mochi', name: 'Mochi', tier: 'g3', color: '#a78bfa', face: 'cute', o: { ey: 54, my: 72, noMouth: false }, hatY: 3, blurb: 'A calm cat who counts everything.',
      body: (c) => [shadow(), S('path', { d: 'M92 86 q24 -2 18 -28', stroke: OL, 'stroke-width': 13, fill: 'none', 'stroke-linecap': 'round' }), S('path', { d: 'M92 86 q24 -2 18 -28', stroke: c, 'stroke-width': 8, fill: 'none', 'stroke-linecap': 'round' }), POLY('28,34 34,6 54,26', c, 3), POLY('92,34 86,6 66,26', c, 3), POLY('34,28 37,14 47,25', '#f9a8d4', 0), POLY('86,28 83,14 73,25', '#f9a8d4', 0), R(38, 96, 12, 12, 6, c, 2.5), R(70, 96, 12, 12, 6, c, 2.5), R(24, 22, 72, 76, 26, c), shine(42, 34, 11, 5)],
      front: () => [P('M57 62 h6 l-3 3 Z', '#f472b6', 1.5), S('path', { d: 'M22 62 h14 M22 68 l14 -2 M98 62 h-14 M98 68 l-14 -2', stroke: OL, 'stroke-width': 1.6, 'stroke-linecap': 'round' })] },
    // Grade 7: sporty & bold
    { id: 'volt', name: 'Volt', tier: 'g7', color: '#38bdf8', face: 'cool', blurb: 'A battery-powered robot with quick reflexes.',
      body: (c) => [shadow(), S('path', { d: 'M60 22 V10', stroke: OL, 'stroke-width': 3 }), P('M58 0 L66 0 L61 6 L66 6 L56 16 L59 8 L54 8 Z', '#facc15', 2), R(10, 52, 20, 10, 4, '#94a3b8', 2.5, { class: 'pip-arm-l' }), R(90, 52, 20, 10, 4, '#94a3b8', 2.5, { class: 'pip-arm-r' }), R(34, 94, 18, 12, 3, '#64748b', 2.5), R(68, 94, 18, 12, 3, '#64748b', 2.5), R(28, 22, 64, 74, 12, c), C(28, 56, 5, '#cbd5e1', 2), C(92, 56, 5, '#cbd5e1', 2), R(42, 78, 36, 12, 4, '#0b1020', 2.5), P('M58 80 L64 80 L60 84 L64 84 L56 89 L58 85 L54 85 Z', '#facc15', 0), shine(42, 30, 10, 4, 0)] },
    { id: 'blaze', name: 'Blaze', tier: 'g7', color: '#ff5722', face: 'cool', o: { ey: 64, my: 80 }, hatY: 10, blurb: 'A fire spirit who burns through tough problems.',
      body: (c) => [shadow(), S('g', { class: 'blaze-flicker' }, P('M60 8 C70 28 96 40 94 72 C92 94 76 104 60 104 C44 104 28 94 26 72 C24 52 40 44 44 26 C50 36 54 40 56 44 C56 30 58 20 60 8 Z', c), S('path', { d: 'M60 52 C68 62 80 68 78 84 C76 96 68 100 60 100 C52 100 44 96 42 84 C40 72 52 66 60 52 Z', style: `fill:${mix(c, 35, '#ffd23f')}` }))] },
    { id: 'glitch', name: 'Glitch', tier: 'g7', color: '#a3e635', face: 'cool', blurb: 'A pixel hero from inside the game.',
      body: (c) => [shadow(), ...arms(c, 54, 10, 90).map((a) => { a.setAttribute('rx', 1); return a; }), R(36, 96, 14, 12, 0, c, 2.5), R(70, 96, 14, 12, 0, c, 2.5), POLY('34,22 86,22 86,28 92,28 92,90 86,90 86,96 34,96 34,90 28,90 28,28 34,28', c), R(36, 28, 8, 8, 0, W, 0, { opacity: '.45' }), R(44, 28, 6, 4, 0, W, 0, { opacity: '.3' }), S('rect', { class: 'glitch-scan', x: 30, y: 40, width: 60, height: 3, fill: W, opacity: '.25' })] },
    { id: 'orbit', name: 'Orbit', tier: 'g7', color: '#6366f1', face: 'cool', o: { ey: 54, my: 70 }, hatY: 4, blurb: 'A tiny planet with its own moon.',
      body: (c) => [S('path', { d: 'M12 68 A48 14 -12 0 1 108 50', stroke: OL, 'stroke-width': 9, fill: 'none' }), S('path', { d: 'M12 68 A48 14 -12 0 1 108 50', stroke: '#fbbf24', 'stroke-width': 5, fill: 'none' }), shadow(110), C(60, 60, 35, c), C(44, 76, 5, mix(c, 75), 0), C(78, 40, 4, mix(c, 75), 0), C(80, 80, 3, mix(c, 75), 0), shine(46, 38, 10, 5)],
      front: () => [S('path', { d: 'M108 50 A48 14 -12 0 1 12 68', stroke: OL, 'stroke-width': 9, fill: 'none' }), S('path', { d: 'M108 50 A48 14 -12 0 1 12 68', stroke: '#fbbf24', 'stroke-width': 5, fill: 'none' }), S('g', { class: 'orbit-moon' }, C(104, 22, 6, '#e2e8f0', 2))] },
    { id: 'howl', name: 'Howl', tier: 'g7', color: '#64748b', face: 'cool', o: { ey: 52, my: 78 }, hatY: 3, blurb: 'A loyal wolf who never gives up.',
      body: (c) => [shadow(), ...arms(c), POLY('28,44 32,4 54,28', c, 3), POLY('92,44 88,4 66,28', c, 3), POLY('33,34 35,14 47,28', '#cbd5e1', 0), POLY('87,34 85,14 73,28', '#cbd5e1', 0), R(38, 96, 12, 12, 6, c, 2.5), R(70, 96, 12, 12, 6, c, 2.5), R(26, 24, 68, 74, 24, c), R(26, 34, 68, 7, 0, '#ef4444', 0), E(60, 74, 18, 12, mix(c, 45, '#fff'), 2.5), E(60, 67, 5, 3.5, OL, 0)] },
    // Geometry: sleek & angular
    { id: 'vector', name: 'Vector', tier: 'geo', color: '#0ea5e9', face: 'visor', o: { eye: '#22d3ee', ey: 52, my: 74 }, blurb: 'A precision robot that never misses an angle.',
      body: (c) => [shadow(), POLY('44,22 38,6 52,20', '#94a3b8', 2.5), POLY('76,22 82,6 68,20', '#94a3b8', 2.5), POLY('6,50 24,44 24,66 10,64', mix(c, 70), 2.5, { class: 'pip-arm-l' }), POLY('114,50 96,44 96,66 110,64', mix(c, 70), 2.5, { class: 'pip-arm-r' }), R(38, 98, 14, 10, 2, '#475569', 2.5), R(68, 98, 14, 10, 2, '#475569', 2.5), POLY('40,20 80,20 96,38 96,84 80,100 40,100 24,84 24,38', c), S('path', { d: 'M40 86 L52 86 L56 92 M80 86 L68 86 L64 92', stroke: '#22d3ee', 'stroke-width': 2.5, fill: 'none', style: 'filter: drop-shadow(0 0 2px #22d3ee)' }), POLY('40,20 80,20 72,28 48,28', W, 0, { opacity: '.25' })] },
    { id: 'prism', name: 'Prism', tier: 'geo', color: '#c084fc', face: 'sharp', o: { ey: 58, my: 74, eye: '#a21caf' }, hatY: -12, blurb: 'A crystal that bends light and logic.',
      body: (c) => [shadow(116, 22), S('g', { class: 'prism-float' }, POLY('60,6 92,36 84,92 60,108 36,92 28,36', c), POLY('60,6 92,36 60,46', mix(c, 55, '#fff'), 2), POLY('60,6 28,36 60,46', mix(c, 75, '#fff'), 2), POLY('28,36 60,46 36,92', mix(c, 85), 2), POLY('92,36 60,46 84,92', mix(c, 70), 2), S('circle', { class: 'prism-core', cx: 60, cy: 86, r: 6, fill: '#fff', style: `filter: drop-shadow(0 0 6px ${c})` }))] },
    { id: 'sentinel', name: 'Sentinel', tier: 'geo', color: '#94a3b8', face: 'visor', o: { eye: '#fbbf24', ey: 56, my: 78 }, hatY: 0, blurb: 'Armored guardian of theorems and proofs.',
      body: (c) => [shadow(), P('M60 18 C70 4 90 2 96 12 C84 12 74 16 66 24 Z', '#ef4444', 2.5), ...arms(mix(c, 80), 58, 10, 90), R(36, 98, 16, 10, 2, '#475569', 2.5), R(68, 98, 16, 10, 2, '#475569', 2.5), P('M28 46 C28 26 42 16 60 16 C78 16 92 26 92 46 L92 92 C92 98 88 102 82 102 L38 102 C32 102 28 98 28 92 Z', c), S('path', { d: 'M60 18 V40 M30 72 H90', stroke: '#fbbf24', 'stroke-width': 2.5, fill: 'none' }), P('M40 80 L80 80 L74 96 L46 96 Z', mix(c, 75), 2.5)] },
    { id: 'nova', name: 'Nova', tier: 'geo', color: '#f59e0b', face: 'sharp', o: { ey: 60, my: 74, eye: '#1e3a8a' }, hatY: -8, blurb: 'A star mage who shines brightest at level 3.',
      body: (c) => {
        const pts = Array.from({ length: 10 }, (_, i) => { const r = i % 2 ? 22 : 46, a = -Math.PI / 2 + (i * Math.PI) / 5; return `${(60 + Math.cos(a) * r).toFixed(1)},${(64 + Math.sin(a) * r).toFixed(1)}`; }).join(' ');
        return [shadow(116, 24), S('ellipse', { class: 'nova-halo', cx: 60, cy: 8, rx: 20, ry: 5, fill: 'none', stroke: '#fde047', 'stroke-width': 4 }),
          S('g', { class: 'prism-float' }, S('polygon', { points: pts, style: `fill:${OL};stroke:${OL};stroke-width:14;stroke-linejoin:round` }), S('polygon', { points: pts, style: `fill:${c};stroke:${c};stroke-width:8;stroke-linejoin:round` }), shine(48, 44, 9, 5))];
      } },
    { id: 'owlex', name: 'Owlex', tier: 'geo', color: '#475569', face: 'sharp', o: { ey: 50, eye: '#facc15', noMouth: true }, hatY: 2, blurb: 'A wise owl who sees every pattern.',
      body: (c) => [shadow(), POLY('30,34 24,6 46,24', c, 3), POLY('90,34 96,6 74,24', c, 3), P('M26 52 C26 30 42 18 60 18 C78 18 94 30 94 52 L94 84 C94 98 80 104 60 104 C40 104 26 98 26 84 Z', c), P('M26 60 L14 82 L28 92 Z', mix(c, 75), 2.5, { class: 'pip-arm-l' }), P('M94 60 L106 82 L92 92 Z', mix(c, 75), 2.5, { class: 'pip-arm-r' }), C(48, 50, 15, mix(c, 45, '#fff'), 2), C(72, 50, 15, mix(c, 45, '#fff'), 2), S('path', { d: 'M46 80 l7 6 l7 -6 l7 6 l7 -6 M46 90 l7 6 l7 -6 l7 6 l7 -6', stroke: mix(c, 40, '#fff'), 'stroke-width': 2.5, fill: 'none' }), R(40, 100, 12, 8, 3, '#f59e0b', 2), R(68, 100, 12, 8, 3, '#f59e0b', 2)],
      front: () => [P('M55 60 L65 60 L60 70 Z', '#f59e0b', 2)] }
  ];
  const BY_ID = Object.fromEntries(LIST.map((m) => [m.id, m]));
  const TIERS = { g3: 'Grade 3 Crew', g7: 'Grade 7 Squad', geo: 'Geometry Legends' };
  const UNLOCK_AT = [0, 25, 60, 120, 200]; // trophies needed for each mascot in your own grade's set
  const STAGES = [{ name: 'Rookie', at: 0 }, { name: 'Pro', at: 200 }, { name: 'Legend', at: 500 }];
  const stageFor = (trophies) => (trophies >= STAGES[2].at ? 2 : trophies >= STAGES[1].at ? 1 : 0);
  const ofTier = (tier) => LIST.filter((m) => m.tier === tier);
  const defaultFor = (track) => (ofTier(track)[0] || LIST[0]).id;

  // Tier emblems shown from the Pro stage.
  function emblem(tier, x, y) {
    const g = S('g', { class: 'mascot-emblem' }, C(x, y, 8, '#ffc928', 2.5));
    if (tier === 'g3') g.append(S('path', { d: `M${x} ${y - 5} l1.6 3.4 3.7 .4 -2.8 2.5 .8 3.7 -3.3 -1.9 -3.3 1.9 .8 -3.7 -2.8 -2.5 3.7 -.4z`, fill: OL }));
    else if (tier === 'g7') g.append(S('path', { d: `M${x + 1} ${y - 6} l-5 7 h4 l-2 5 l6 -8 h-4 z`, fill: OL }));
    else g.append(S('path', { d: `M${x} ${y - 5} l5 8 h-10 z`, fill: 'none', stroke: OL, 'stroke-width': 2 }));
    return g;
  }

  // Draw a mascot. color: optional skin colour; hatId: optional hat; stage: 0 Rookie, 1 Pro, 2 Legend.
  function draw(id, state = 'idle', size = 96, color, hatId, stage = 0) {
    const m = BY_ID[id] || LIST[0], c = color || m.color, o = m.o || {};
    const svg = S('svg', { viewBox: '0 0 120 120', width: size, height: size, class: `pip pip-${state} mascot mascot-${m.id} stage-${stage}`, 'aria-hidden': 'true' });
    if (stage >= 2) {
      svg.append(S('defs', {}, S('radialGradient', { id: 'mqAura' }, S('stop', { offset: '0', 'stop-color': '#fff6b0', 'stop-opacity': '.9' }), S('stop', { offset: '.6', 'stop-color': '#ffc928', 'stop-opacity': '.35' }), S('stop', { offset: '1', 'stop-color': '#ffc928', 'stop-opacity': '0' }))),
        S('circle', { class: 'mascot-aura', cx: 60, cy: 62, r: 60, fill: 'url(#mqAura)' }));
      for (const [x, y, d] of [[12, 22, 0], [106, 30, 0.5], [16, 96, 1], [104, 92, 1.5]]) svg.append(S('path', { class: 'aura-spark', d: `M${x} ${y - 6} L${x + 2} ${y - 2} L${x + 6} ${y} L${x + 2} ${y + 2} L${x} ${y + 6} L${x - 2} ${y + 2} L${x - 6} ${y} L${x - 2} ${y - 2} Z`, fill: '#fff', style: `animation-delay:${d}s` }));
    }
    const body = S('g', { class: 'pip-body' });
    body.append(...m.body(c, stage));
    body.append(face(m.face, state, o));
    if (m.front) body.append(...m.front(c, stage));
    if (stage >= 1) body.append(emblem(m.tier, (o.emX || 60), o.emY || 90));
    const R2 = window.MathQuestRewards;
    const hatEl = hatId && R2 ? R2.hat(hatId) : null;
    if (hatEl) { const hg = S('g', { transform: `translate(0 ${m.hatY || 0})` }); hg.append(hatEl); body.append(hg); }
    svg.append(body);
    return svg;
  }
  window.MathQuestMascots = { LIST, BY_ID, TIERS, UNLOCK_AT, STAGES, stageFor, ofTier, defaultFor, draw };
})();
