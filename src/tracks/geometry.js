/* MathQuest — High-School Geometry track (id 'geo').
   Figures are generated as SVG strings from the random parameters by the helpers below
   (all pure: usable inside generate()). Labs at the bottom are browser-only. */
(function () {
  'use strict';
  const MQ = globalThis.MathQuest;
  const U = MQ.util;

  // =====================================================================
  // Vector helpers
  // =====================================================================
  const D2R = Math.PI / 180;
  const add = (p, q) => [p[0] + q[0], p[1] + q[1]];
  const sub = (p, q) => [p[0] - q[0], p[1] - q[1]];
  const mul = (p, k) => [p[0] * k, p[1] * k];
  const dotp = (p, q) => p[0] * q[0] + p[1] * q[1];
  const len = (p) => Math.hypot(p[0], p[1]);
  const unit = (p) => { const l = len(p) || 1; return [p[0] / l, p[1] / l]; };
  const perp = (p) => [-p[1], p[0]];
  const dist = (p, q) => len(sub(p, q));
  const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  const centroid = (pts) => mul(pts.reduce((s, p) => add(s, p), [0, 0]), 1 / pts.length);
  const dirv = (deg) => [Math.cos(deg * D2R), -Math.sin(deg * D2R)]; // SVG direction of a math-angle
  const angleAt = (v, a, b) => {
    const u1 = unit(sub(a, v)), u2 = unit(sub(b, v));
    return Math.acos(Math.max(-1, Math.min(1, dotp(u1, u2)))) / D2R;
  };

  // =====================================================================
  // SVG string helpers (pure; colours are CSS variables)
  // =====================================================================
  const F = (x) => String(Math.round(x * 10) / 10);
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const INK = 'var(--ink)', MUTED = 'var(--muted)', ACC = 'var(--accent)', ACC2 = 'var(--accent-2)', GOOD = 'var(--good)';

  let LBL = []; // label boxes recorded since the last svgDoc (generation is synchronous)
  function svgDoc(w, h, body) {
    let x0 = 0, y0 = 0, x1 = w, y1 = h;
    for (const b of LBL) { x0 = Math.min(x0, b[0] - 2); y0 = Math.min(y0, b[1] - 2); x1 = Math.max(x1, b[2] + 2); y1 = Math.max(y1, b[3] + 2); }
    LBL = [];
    if (x0 < 0 || y0 < 0 || x1 > w || y1 > h) return `<svg viewBox="${F(x0)} ${F(y0)} ${F(x1 - x0)} ${F(y1 - y0)}" xmlns="http://www.w3.org/2000/svg" font-family="inherit">${body}</svg>`;
    return `<svg viewBox="0 0 ${F(w)} ${F(h)}" xmlns="http://www.w3.org/2000/svg" font-family="inherit">${body}</svg>`;
  }
  function seg(p, q, o) {
    o = o || {};
    return `<line x1="${F(p[0])}" y1="${F(p[1])}" x2="${F(q[0])}" y2="${F(q[1])}" stroke="${o.c || INK}" stroke-width="${o.w || 2}" stroke-linecap="round"${o.dash ? ` stroke-dasharray="${o.dash}"` : ''}${o.op ? ` opacity="${o.op}"` : ''}/>`;
  }
  function poly(pts, o) {
    o = o || {};
    return `<polygon points="${pts.map((p) => F(p[0]) + ',' + F(p[1])).join(' ')}" fill="${o.fill || 'none'}" stroke="${o.c || INK}" stroke-width="${o.w || 2}" stroke-linejoin="round"${o.fop ? ` fill-opacity="${o.fop}"` : ''}${o.dash ? ` stroke-dasharray="${o.dash}"` : ''}/>`;
  }
  function dotS(p, o) { o = o || {}; return `<circle cx="${F(p[0])}" cy="${F(p[1])}" r="${o.r || 3.5}" fill="${o.c || INK}"/>`; }
  function txt(p, s, o) {
    o = o || {};
    const size = o.size || 15, bw = String(s).length * size * 0.56 + 2;
    LBL.push([p[0] - bw / 2, p[1] - size * 0.5, p[0] + bw / 2, p[1] + size * 0.5]);
    return `<text x="${F(p[0])}" y="${F(p[1])}" font-size="${size}" text-anchor="middle" dy=".35em" fill="${o.c || INK}" font-weight="${o.bold ? 700 : 600}"${o.it ? ' font-style="italic"' : ''} stroke="var(--surface)" stroke-width="${o.halo == null ? 4 : o.halo}" stroke-linejoin="round" paint-order="stroke">${esc(s)}</text>`;
  }
  // approximate label box
  const boxOf = (s, size) => [String(s).length * size * 0.56 + 2, size * 0.95];
  // place a label so its box sits just beyond `anchor` in direction `dir`
  function placeLabel(anchor, dir, s, o) {
    o = o || {};
    const size = o.size || 15, [w, h] = boxOf(s, size), d = unit(dir);
    const ext = Math.abs(d[0]) * w / 2 + Math.abs(d[1]) * h / 2;
    return txt(add(anchor, mul(d, (o.gap == null ? 5 : o.gap) + ext)), s, o);
  }
  // outward direction at polygon vertex i (exterior bisector)
  function outDir(pts, i) {
    const n = pts.length, v = pts[i], a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
    let d = add(unit(sub(v, a)), unit(sub(v, b)));
    if (len(d) < 1e-6) d = perp(unit(sub(v, a)));
    if (dotp(d, sub(v, centroid(pts))) < 0) d = mul(d, -1);
    return unit(d);
  }
  function vLabel(pts, i, s, o) { return placeLabel(pts[i], outDir(pts, i), s, Object.assign({ it: true, size: 16, gap: 6 }, o)); }
  // label beside segment pq on the side away from `inside`
  function sideLabel(p, q, s, inside, o) {
    let n = unit(perp(sub(q, p)));
    if (dotp(n, sub(inside, mid(p, q))) > 0) n = mul(n, -1);
    return placeLabel(mid(p, q), n, s, Object.assign({ gap: 5, size: 14 }, o));
  }
  function arcPath(v, a, b, r, trim) {
    let t1 = Math.atan2(a[1] - v[1], a[0] - v[0]);
    const t2 = Math.atan2(b[1] - v[1], b[0] - v[0]);
    let dl = t2 - t1;
    while (dl <= -Math.PI) dl += 2 * Math.PI;
    while (dl > Math.PI) dl -= 2 * Math.PI;
    if (trim) { const tr = Math.min(trim / r, Math.abs(dl) / 3) * Math.sign(dl); t1 += tr; dl -= 2 * tr; }
    const p1 = [v[0] + r * Math.cos(t1), v[1] + r * Math.sin(t1)], p2 = [v[0] + r * Math.cos(t1 + dl), v[1] + r * Math.sin(t1 + dl)];
    return `M${F(p1[0])} ${F(p1[1])} A${F(r)} ${F(r)} 0 0 ${dl > 0 ? 1 : 0} ${F(p2[0])} ${F(p2[1])}`;
  }
  // n concentric arcs marking the (smaller) angle a-v-b
  function arcMark(v, a, b, o) {
    o = o || {};
    const n = o.n || 1, r = o.r || 18;
    let s = '';
    for (let k = 0; k < n; k++) s += `<path d="${arcPath(v, a, b, r + k * 4, o.trim)}" fill="none" stroke="${o.c || INK}" stroke-width="${o.w || 1.6}"/>`;
    return s;
  }
  // label inside angle a-v-b, far enough out that it clears both rays
  function angLabel(v, a, b, s, o) {
    o = o || {};
    const size = o.size || 14, u1 = unit(sub(a, v)), u2 = unit(sub(b, v));
    let bis = add(u1, u2);
    if (len(bis) < 1e-6) bis = perp(u1);
    bis = unit(bis);
    const half = angleAt(v, a, b) * D2R / 2, [w, h] = boxOf(s, size);
    const rl = Math.hypot(w, h) / 2, r = o.r || 18;
    const d = Math.max(r + rl + 2, rl / Math.max(Math.sin(half), 0.08) + 3);
    const pos = add(v, mul(bis, d));
    const lead = d > r + rl + 14 ? seg(add(v, mul(bis, r * 0.75)), add(v, mul(bis, d - rl * 0.9)), { c: o.c || INK, w: 1, op: 0.6 }) : '';
    return lead + txt(pos, s, o);
  }
  function rightMark(v, a, b, o) {
    o = o || {};
    const s = o.s || 11, u1 = unit(sub(a, v)), u2 = unit(sub(b, v));
    const p1 = add(v, mul(u1, s)), p3 = add(v, mul(u2, s)), p2 = add(p1, mul(u2, s));
    return `<path d="M${F(p1[0])} ${F(p1[1])} L${F(p2[0])} ${F(p2[1])} L${F(p3[0])} ${F(p3[1])}" fill="none" stroke="${o.c || INK}" stroke-width="1.6"/>`;
  }
  // congruence tick marks across the middle of pq
  function ticks(p, q, n, o) {
    o = o || {};
    const m = mid(p, q), u = unit(sub(q, p)), nr = perp(u);
    let s = '';
    for (let k = 0; k < n; k++) {
      const c = add(m, mul(u, (k - (n - 1) / 2) * 5));
      s += seg(add(c, mul(nr, 6)), sub(c, mul(nr, 6)), { c: o.c || INK, w: 1.8 });
    }
    return s;
  }
  // parallel-line arrowheads (chevrons) on pq at fraction t, pointing p→q
  function parArrows(p, q, n, t, o) {
    o = o || {};
    const u = unit(sub(q, p)), nr = perp(u);
    const base = add(p, mul(sub(q, p), t == null ? 0.5 : t));
    let s = '';
    for (let k = 0; k < n; k++) {
      const tip = add(base, mul(u, (k - (n - 1) / 2) * 7 + 4));
      const back = sub(tip, mul(u, 7));
      s += `<path d="M${F(back[0] + nr[0] * 5)} ${F(back[1] + nr[1] * 5)} L${F(tip[0])} ${F(tip[1])} L${F(back[0] - nr[0] * 5)} ${F(back[1] - nr[1] * 5)}" fill="none" stroke="${o.c || INK}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>`;
    }
    return s;
  }
  // fit math-coordinate (y up) point sets into a W×H box with a common scale
  function fitter(ptsList, W, H, pad, maxScale) {
    const all = [].concat(...ptsList);
    const xs = all.map((p) => p[0]), ys = all.map((p) => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const s = Math.min((W - 2 * pad) / ((maxX - minX) || 1), (H - 2 * pad) / ((maxY - minY) || 1), maxScale || 1e9);
    const ox = (W - s * (maxX - minX)) / 2 - s * minX, oy = (H + s * (maxY - minY)) / 2 + s * minY;
    const f = (p) => [ox + s * p[0], oy - s * p[1]];
    f.scale = s;
    return f;
  }
  // choose the least-crowded spot around `anchor` for a label
  function bestLabel(anchor, s, obstacles, W, H, o) {
    o = o || {};
    const size = o.size || 13, [w, h] = boxOf(s, size);
    let best = null, bestScore = -1e9;
    const prefs = o.prefs || [[1, -1], [-1, -1], [1, 1], [-1, 1], [1, 0], [-1, 0], [0, -1], [0, 1]];
    prefs.forEach((d0, k) => {
      const d = unit(d0), ext = Math.abs(d[0]) * w / 2 + Math.abs(d[1]) * h / 2;
      const c = add(anchor, mul(d, (o.gap || 5) + ext));
      let score = 0;
      if (c[0] - w / 2 < 1 || c[0] + w / 2 > W - 1 || c[1] - h / 2 < 1 || c[1] + h / 2 > H - 1) score -= 1000;
      let md = 1e9;
      for (const q of obstacles) {
        const dx = Math.max(Math.abs(q[0] - c[0]) - w / 2, 0), dy = Math.max(Math.abs(q[1] - c[1]) - h / 2, 0);
        md = Math.min(md, Math.hypot(dx, dy));
      }
      score += Math.min(md, 14) - k * 0.3;
      if (score > bestScore) { bestScore = score; best = c; }
    });
    return txt(best, s, Object.assign({ size }, o));
  }
  const sampleSeg = (p, q, n) => { const r = []; for (let i = 0; i <= n; i++) r.push(add(p, mul(sub(q, p), i / n))); return r; };

  // Coordinate grid (math → svg). b: {xmin,xmax,ymin,ymax}
  function cgrid(b, o) {
    o = o || {};
    const W = o.W || 300, maxH = o.maxH || 300, m = 16;
    const u = Math.min((W - 2 * m) / (b.xmax - b.xmin), (maxH - 2 * m) / (b.ymax - b.ymin), o.maxU || 28);
    const gw = u * (b.xmax - b.xmin), gh = u * (b.ymax - b.ymin), H = gh + 2 * m, ox = (W - gw) / 2;
    const P = (p) => [ox + (p[0] - b.xmin) * u, m + (b.ymax - p[1]) * u];
    let s = '';
    const tickPts = [];
    for (let x = b.xmin; x <= b.xmax; x++) s += seg(P([x, b.ymin]), P([x, b.ymax]), { c: MUTED, w: 0.8, op: 0.35 });
    for (let y = b.ymin; y <= b.ymax; y++) s += seg(P([b.xmin, y]), P([b.xmax, y]), { c: MUTED, w: 0.8, op: 0.35 });
    const span = Math.max(b.xmax - b.xmin, b.ymax - b.ymin);
    const step = span > 14 ? 2 : 1;
    const hasX = b.ymin <= 0 && b.ymax >= 0, hasY = b.xmin <= 0 && b.xmax >= 0;
    if (hasX) {
      s += seg(P([b.xmin, 0]), P([b.xmax, 0]), { c: INK, w: 1.5 });
      for (let x = Math.ceil(b.xmin / step) * step; x <= b.xmax; x += step) if (x !== 0 && x > b.xmin && x < b.xmax) tickPts.push([add(P([x, 0]), [0, 9]), String(x).replace('-', '−')]);
      s += txt(add(P([b.xmax, 0]), [-5, -9]), 'x', { size: 12, it: true, c: MUTED, halo: 3 });
    }
    if (hasY) {
      s += seg(P([0, b.ymin]), P([0, b.ymax]), { c: INK, w: 1.5 });
      for (let y = Math.ceil(b.ymin / step) * step; y <= b.ymax; y += step) if (y !== 0 && y > b.ymin && y < b.ymax) tickPts.push([add(P([0, y]), [-9, 0]), String(y).replace('-', '−')]);
      s += txt(add(P([0, b.ymax]), [9, 5]), 'y', { size: 12, it: true, c: MUTED, halo: 3 });
    }
    const tickSvg = (avoid) => tickPts.filter((t) => !(avoid || []).some((q) => Math.abs(q[0] - t[0][0]) < 9 && Math.abs(q[1] - t[0][1]) < 8)).map((t) => txt(t[0], t[1], { size: 9, c: MUTED, halo: 3 })).join('');
    if (!o.deferTicks) s += tickSvg();
    return { W, H, u, P, body: s, tickPts: tickPts.map((t) => t[0]), tickSvg };
  }
  // bounds that include the origin and all points, with padding and a minimum span
  function boundsFor(pts, pad, minSpan) {
    pad = pad == null ? 1 : pad; minSpan = minSpan || 8;
    let xmin = Math.min(0, ...pts.map((p) => p[0])) - pad, xmax = Math.max(0, ...pts.map((p) => p[0])) + pad;
    let ymin = Math.min(0, ...pts.map((p) => p[1])) - pad, ymax = Math.max(0, ...pts.map((p) => p[1])) + pad;
    while (xmax - xmin < minSpan) { xmax++; if (xmax - xmin < minSpan) xmin--; }
    while (ymax - ymin < minSpan) { ymax++; if (ymax - ymin < minSpan) ymin--; }
    return { xmin: Math.floor(xmin), xmax: Math.ceil(xmax), ymin: Math.floor(ymin), ymax: Math.ceil(ymax) };
  }
  const cstr = (x) => String(x).replace('-', '−');
  const ptTxt = (p) => `(${cstr(U.round(p[0], 2))}, ${cstr(U.round(p[1], 2))})`;
  // plot labelled points (and optional polygon / segments) on a grid
  function gridFig(points, o) {
    o = o || {};
    const b = o.bounds || boundsFor(points.map((p) => p.p), 1, o.minSpan || 8);
    const G = cgrid(b, Object.assign({}, o, { deferTicks: true }));
    const S = points.map((p) => G.P(p.p));
    let body = G.body;
    const obstacles = [];
    S.forEach((p) => obstacles.push(p));
    const dataPts = S.slice();
    (o.polys || []).forEach((pl) => { const ps = pl.idx.map((i) => S[i]); ps.forEach((p, i) => dataPts.push(...sampleSeg(p, ps[(i + 1) % ps.length], 20))); });
    (o.segs || []).forEach((sg) => dataPts.push(...sampleSeg(S[sg[0]], S[sg[1]], 20)));
    body += G.tickSvg(dataPts);
    (o.polys || []).forEach((pl) => {
      const ps = pl.idx.map((i) => S[i]);
      body += poly(ps, { c: pl.c || ACC, w: 2.2, fill: pl.c || ACC, fop: 0.1, dash: pl.dash });
      ps.forEach((p, i) => obstacles.push(...sampleSeg(p, ps[(i + 1) % ps.length], 8)));
    });
    (o.segs || []).forEach((sg) => {
      body += seg(S[sg[0]], S[sg[1]], { c: sg[2] || ACC, w: 2.2, dash: sg[3] });
      obstacles.push(...sampleSeg(S[sg[0]], S[sg[1]], 10));
    });
    // axes are obstacles too
    if (b.ymin <= 0 && b.ymax >= 0) obstacles.push(...sampleSeg(G.P([b.xmin, 0]), G.P([b.xmax, 0]), 24));
    if (b.xmin <= 0 && b.xmax >= 0) obstacles.push(...sampleSeg(G.P([0, b.ymin]), G.P([0, b.ymax]), 24));
    G.tickPts.forEach((t) => obstacles.push(t, add(t, [-4, 0]), add(t, [4, 0])));
    points.forEach((p, i) => { body += dotS(S[i], { c: p.c || ACC, r: 4 }); });
    points.forEach((p, i) => {
      if (!p.label) return;
      const others = obstacles.filter((q) => dist(q, S[i]) > 0.5);
      const prefs = p.away ? [sub(S[i], p.away), [1, -1], [-1, -1], [1, 1], [-1, 1]] : (o.polys && o.polys.length ? [outDir(o.polys[0].idx.map((k) => S[k]), o.polys[0].idx.indexOf(i) >= 0 ? o.polys[0].idx.indexOf(i) : 0), [1, -1], [-1, -1], [1, 1], [-1, 1], [1, 0], [-1, 0], [0, -1], [0, 1]] : undefined);
      body += bestLabel(S[i], p.label, others, G.W, G.H, { size: o.labelSize || 12, c: p.lc || INK, prefs, gap: 4 });
    });
    return svgDoc(G.W, G.H, body + (o.extra ? o.extra(G) : ''));
  }

  // Draw a triangle given SVG-space points S[0..2].
  // opt: names[], sides{i:text} (side i = S[i]→S[i+1]), ticks{i:n}, arcs{i:n}, angLabels{i:text}, right:i,
  //      sideColor, arcColor, fill
  function drawTri(S, opt) {
    opt = opt || {};
    let s = poly(S, { c: opt.c || INK, w: 2.2, fill: opt.fill || 'none', fop: opt.fill ? 0.08 : null });
    const c = centroid(S);
    if (opt.right != null) { const i = opt.right; s += rightMark(S[i], S[(i + 1) % 3], S[(i + 2) % 3]); }
    for (const k in (opt.arcs || {})) { const i = +k; s += arcMark(S[i], S[(i + 1) % 3], S[(i + 2) % 3], { n: opt.arcs[k], r: opt.arcR || 17, c: opt.arcColor || INK }); }
    for (const k in (opt.ticks || {})) { const i = +k; s += ticks(S[i], S[(i + 1) % 3], opt.ticks[k], { c: opt.tickColor || INK }); }
    for (const k in (opt.angLabels || {})) {
      const i = +k, a = S[(i + 1) % 3], b = S[(i + 2) % 3], lab = opt.angLabels[k], r = (opt.arcR || 17) + 4;
      const [w, h] = boxOf(lab, 13), rl = Math.hypot(w, h) / 2, half = angleAt(S[i], a, b) * D2R / 2;
      const need = Math.max(r + rl + 2, rl / Math.max(Math.sin(half), 0.08) + 3);
      const room = Math.min(dist(S[i], a), dist(S[i], b)) * 0.55;
      if (need <= room) { s += angLabel(S[i], a, b, lab, { size: 13, r, c: opt.angColor || INK }); continue; }
      // outside: try directions around the vertex, avoid triangle edges and the vertex name
      const obst = [];
      S.forEach((p, j) => obst.push(...sampleSeg(p, S[(j + 1) % 3], 14)));
      const nameDir = outDir(S, i);
      obst.push(add(S[i], mul(nameDir, 16)));
      let best = null, bs = -1e9;
      for (let t = 0; t < 24; t++) {
        const d = [Math.cos(t * Math.PI / 12), Math.sin(t * Math.PI / 12)];
        const ext = Math.abs(d[0]) * w / 2 + Math.abs(d[1]) * h / 2;
        const c = add(S[i], mul(d, r + 4 + ext));
        let md = 1e9;
        for (const q of obst) md = Math.min(md, Math.hypot(Math.max(Math.abs(q[0] - c[0]) - w / 2, 0), Math.max(Math.abs(q[1] - c[1]) - h / 2, 0)));
        const sc = Math.min(md, 10) - 0.02 * Math.abs(dotp(d, nameDir) + 1) * 10;
        if (sc > bs) { bs = sc; best = c; }
      }
      const bis = unit(add(unit(sub(a, S[i])), unit(sub(b, S[i]))));
      const arcPt = add(S[i], mul(bis, r - 4));
      s += seg(arcPt, add(arcPt, mul(unit(sub(best, arcPt)), Math.max(dist(best, arcPt) - rl * 0.75, 2))), { c: opt.angColor || INK, w: 1, op: 0.7 });
      s += txt(best, lab, { size: 13, c: opt.angColor || INK });
    }
    for (const k in (opt.sides || {})) { const i = +k; s += sideLabel(S[i], S[(i + 1) % 3], opt.sides[k], c, { c: opt.sideColor || INK }); }
    (opt.names || []).forEach((nm, i) => { if (nm) s += vLabel(S, i, nm); });
    return s;
  }
  // triangle with given angles (degrees) A,B,C in math coords, A at origin, AB along x
  function triFromAngles(A, B, C, rot) {
    const b = Math.sin(B * D2R) / Math.sin(C * D2R);
    let P = [[0, 0], [1, 0], [b * Math.cos(A * D2R), b * Math.sin(A * D2R)]];
    if (rot) P = P.map((p) => [p[0] * Math.cos(rot) - p[1] * Math.sin(rot), p[0] * Math.sin(rot) + p[1] * Math.cos(rot)]);
    return P;
  }

  // =====================================================================
  // Small problem utilities
  // =====================================================================
  const deg = (x) => `${x}^\\circ`;
  const ang = (s) => `\\angle ${s}`;
  const ov = (s) => `\\overline{${s}}`;
  const tri = (s) => `\\triangle ${s}`;
  function lin(a, b) { // latex for a x + b
    const ax = a === 1 ? 'x' : a === -1 ? '-x' : a + 'x';
    if (b === 0) return ax;
    return ax + (b > 0 ? ' + ' + b : ' - ' + (-b));
  }
  const pn = (v) => (v < 0 ? `(${v})` : String(v));
  const subst = (a, x, b) => (a === 1 ? String(x) : `${a}(${x})`) + (b === 0 ? '' : b > 0 ? ` + ${b}` : ` - ${-b}`);
  const linTxt = (a, b) => lin(a, b).replace(/ - /g, ' − ').replace(/ /g, '');
  const tol = (ans, t) => (r) => typeof r === 'number' && isFinite(r) && Math.abs(r - ans) <= (t || 0.05) + 1e-9;
  const num = (r) => (typeof r === 'number' ? r : MQ.parseNumber(r));
  function choice(correct, distractors, rng) { return U.choicesFrom(correct, distractors, rng); }
  const pick = (rng, arr) => rng.pick(arr);
  const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'.split('');

  // =====================================================================
  // Skill 1: Angle relationships
  // =====================================================================
  // Two lines crossing at O. Regions: 0=[α,α+θ] (θ), 1=[α+θ,α+180] (180−θ), 2, 3 opposite.
  function xLinesFig(alpha, theta, labels, arcs) {
    const W = 300, H = 210, O = [150, 105], R = 98;
    const dirs = [alpha, alpha + theta, alpha + 180, alpha + 180 + theta];
    const ends = dirs.map((d) => add(O, mul(dirv(d), R)));
    let s = seg(ends[0], ends[2], { w: 2.2 }) + seg(ends[1], ends[3], { w: 2.2 });
    s += ends.map((e) => dotS(e, { r: 0.1 })).join('');
    for (const k in (arcs || {})) { const i = +k; s += arcMark(O, ends[i], ends[(i + 1) % 4], { r: 20, n: arcs[k], c: ACC }); }
    for (const k in (labels || {})) { const i = +k; s += angLabel(O, ends[i], ends[(i + 1) % 4], labels[k], { r: 22, size: 15, c: ACC }); }
    s += dotS(O, { r: 3 });
    return svgDoc(W, H, s);
  }
  // Ray figure: vertex B, rays to A (0°), D (at a°), C (90° or 180°)
  function raysFig(a, total, lab1, lab2) {
    const W = 300, H = total === 90 ? 210 : 160;
    const B = total === 90 ? [70, 185] : [150, 130], R = total === 90 ? 160 : 125;
    const A = add(B, mul(dirv(0), R)), C = add(B, mul(dirv(total), R)), Dp = add(B, mul(dirv(a), R * 0.92));
    let s = seg(B, A, { w: 2.2 }) + seg(B, C, { w: 2.2 }) + seg(B, Dp, { w: 2.2 });
    if (total === 90) s += rightMark(B, A, C, { s: 13 });
    s += arcMark(B, A, Dp, { r: 30, c: ACC }) + arcMark(B, Dp, C, { r: 38, c: ACC2 });
    s += angLabel(B, A, Dp, lab1, { r: 30, size: 15, c: ACC }) + angLabel(B, Dp, C, lab2, { r: 40, size: 15, c: ACC2 });
    [[A, 'A', 0], [C, 'C', total], [Dp, 'D', a]].forEach(([p, n, dd]) => { s += placeLabel(p, dirv(dd), n, { it: true, size: 16, gap: 4 }); });
    s += placeLabel(B, total === 90 ? [-1, 0.6] : [0, 1], 'B', { it: true, size: 16, gap: 6 });
    [A, B, C, Dp].forEach((p) => { s += dotS(p, { r: 3 }); });
    return svgDoc(W, H, s);
  }

  // Parallel lines m ∥ n cut by transversal t at angle θ (math degrees from rightward).
  // Angles numbered 1..4 at top crossing (above-left, above-right, below-left, below-right), 5..8 at bottom.
  function transFig(theta, o) {
    o = o || {};
    const W = 300, H = o.tall ? 236 : 206, y1 = o.tall ? 64 : 58, y2 = o.tall ? 172 : 148, cx = 150, my = (y1 + y2) / 2;
    const cot = Math.cos(theta * D2R) / Math.sin(theta * D2R);
    const I1 = [cx + (my - y1) * cot, y1], I2 = [cx - (y2 - my) * cot, y2];
    const d = dirv(theta);
    const T1 = add(I1, mul(d, 44)), T2 = sub(I2, mul(d, 44));
    let s = seg([12, y1], [288, y1], { w: 2.2 }) + seg([12, y2], [288, y2], { w: 2.2 }) + seg(T1, T2, { w: 2.2 });
    const leftTop = cot < 0; // top crossing is on the left when θ > 90
    const ax1 = leftTop ? 258 : 42, ax2 = leftTop ? 42 : 258;
    s += parArrows([12, y1], [288, y1], 1, (ax1 - 12) / 276) + parArrows([12, y2], [288, y2], 1, (ax2 - 12) / 276);
    s += txt([leftTop ? 286 : 14, y1 - 13], o.names ? o.names[0] : 'm', { it: true, size: 14, c: MUTED });
    s += txt([leftTop ? 14 : 286, y2 + 14], o.names ? o.names[1] : 'n', { it: true, size: 14, c: MUTED });
    s += placeLabel(sub(T1, mul(d, 8)), [Math.sin(theta * D2R), Math.cos(theta * D2R) * 0.3], o.names ? o.names[2] : 't', { it: true, size: 14, c: MUTED, gap: 6 });
    const rays = { 1: [theta, 180], 2: [0, theta], 3: [180, 180 + theta], 4: [180 + theta, 360] };
    const region = (k) => { const I = k <= 4 ? I1 : I2, r = rays[k <= 4 ? k : k - 4]; return [I, add(I, mul(dirv(r[0]), 40)), add(I, mul(dirv(r[1]), 40))]; };
    for (const k of (o.arcs || [])) { const [I, a, b] = region(k); s += arcMark(I, a, b, { r: 15, c: ACC, w: 2 }); }
    if (o.nums) for (let k = 1; k <= 8; k++) { const [I, a, b] = region(k); s += angLabel(I, a, b, String(k), { r: 17, size: 12, c: (o.arcs || []).includes(k) ? ACC : INK }); }
    for (const k in (o.labels || {})) { const [I, a, b] = region(+k); s += arcMark(I, a, b, { r: 13, c: ACC, w: 1.8 }) + angLabel(I, a, b, o.labels[k], { r: 14, size: 13, c: ACC, bold: true }); }
    s += dotS(I1, { r: 2.5 }) + dotS(I2, { r: 2.5 });
    return svgDoc(W, H, s);
  }
  const tPos = (k) => { const j = k > 4 ? k - 4 : k; return { top: k <= 4, above: j <= 2, left: j % 2 === 1 }; };
  const tMeasure = (k, theta) => { const p = tPos(k); return (p.above && !p.left) || (!p.above && p.left) ? theta : 180 - theta; };
  const T_PAIRS = {
    corr: { name: 'Corresponding angles', thm: 'Corresponding Angles Postulate', cong: true, pairs: [[1, 5], [2, 6], [3, 7], [4, 8]] },
    altInt: { name: 'Alternate interior angles', thm: 'Alternate Interior Angles Theorem', cong: true, pairs: [[3, 6], [4, 5]] },
    altExt: { name: 'Alternate exterior angles', thm: 'Alternate Exterior Angles Theorem', cong: true, pairs: [[1, 8], [2, 7]] },
    ssInt: { name: 'Same-side interior angles', thm: 'Same-Side Interior Angles Theorem', cong: false, pairs: [[3, 5], [4, 6]] },
    vert: { name: 'Vertical angles', thm: 'Vertical Angles Theorem', cong: true, pairs: [[1, 4], [2, 3], [5, 8], [6, 7]] }
  };
  const posWords = (k) => { const p = tPos(k); return `${p.above ? 'above' : 'below'} line ${p.top ? 'm' : 'n'}, ${p.left ? 'left' : 'right'} of $t$`; };
  function pickTheta(rng, lo, hi) { let t; do { t = rng.int(lo || 40, hi || 140); } while (t >= 82 && t <= 98); return t; }

  function angL1(rng) {
    const kind = rng.pick(['vert', 'lin', 'rel', 'comp', 'sup', 'rightsplit', 'straightsplit']);
    if (kind === 'vert' || kind === 'lin' || kind === 'rel') {
      const theta = pickTheta(rng, 35, 145), alpha = rng.int(-25, 35);
      const g = rng.int(0, 3), m = g % 2 === 0 ? theta : 180 - theta;
      if (kind === 'rel') {
        const other = rng.bool() ? (g + 2) % 4 : (g + rng.pick([1, 3])) % 4, isV = other === (g + 2) % 4;
        const labels = {}; labels[g] = '1'; labels[other] = '2';
        const opts = ['Vertical angles', 'A linear pair', 'Complementary angles', 'Corresponding angles'];
        return {
          prompt: 'Two lines intersect. How are $\\angle 1$ and $\\angle 2$ related?',
          figure: xLinesFig(alpha, theta, labels, { [g]: 1, [other]: isV ? 1 : 2 }),
          input: { type: 'choice', options: opts }, answer: isV ? 0 : 1,
          explanation: isV
            ? ['$\\angle 1$ and $\\angle 2$ are opposite each other where the lines cross and share only the vertex.', 'Non-adjacent angles formed by two intersecting lines are <b>vertical angles</b>; by the Vertical Angles Theorem they are congruent.']
            : ['$\\angle 1$ and $\\angle 2$ share a vertex and a side, and their outer sides form a straight line.', 'Adjacent angles whose outer rays are opposite rays form a <b>linear pair</b>; by the Linear Pair Postulate they add to $180^\\circ$.'],
          hint: 'Are the angles across from each other, or side by side on a line?'
        };
      }
      const isV = kind === 'vert', tgt = isV ? (g + 2) % 4 : (g + rng.pick([1, 3])) % 4, ans = isV ? m : 180 - m;
      const labels = {}; labels[g] = m + '°'; labels[tgt] = 'x°';
      return {
        prompt: 'Two lines intersect as shown. Find $x$.',
        figure: xLinesFig(alpha, theta, labels, { [g]: 1, [tgt]: isV ? 1 : 2 }),
        input: { type: 'number', unit: '°' }, answer: ans,
        explanation: isV
          ? ['The two marked angles are across from each other: they are <b>vertical angles</b>.', 'Vertical Angles Theorem: vertical angles are congruent.', `So $x = ${m}$.`]
          : ['The two marked angles sit side by side on a straight line: they form a <b>linear pair</b>.', 'Linear Pair Postulate: the angles of a linear pair are supplementary (sum to $180^\\circ$).', `$x = 180 - ${m} = ${ans}$.`],
        hint: isV ? 'Opposite angles at an intersection are equal.' : 'Angles on a straight line add to 180°.'
      };
    }
    if (kind === 'comp' || kind === 'sup') {
      const isC = kind === 'comp', a = isC ? rng.int(8, 82) : rng.int(15, 165), ans = (isC ? 90 : 180) - a;
      const word = isC ? 'complement' : 'supplement';
      if (rng.bool()) {
        return {
          prompt: `An angle measures $${deg(a)}$. What is the measure of its ${word}?`,
          input: { type: 'number', unit: '°' }, answer: ans,
          explanation: [`Two angles are ${isC ? 'complementary if their measures add to $90^\\circ$' : 'supplementary if their measures add to $180^\\circ$'}.`, `${word[0].toUpperCase() + word.slice(1)} $= ${isC ? 90 : 180} - ${a} = ${ans}$, so the answer is $${deg(ans)}$.`],
          hint: isC ? 'Complementary angles add to 90°.' : 'Supplementary angles add to 180°.'
        };
      }
      const b = rng.int(8, isC ? 82 : 172), c = (isC ? 90 : 180) - b;
      const opts = isC ? [c, 180 - b, b, Math.abs(90 - 2 * b) || 1] : [c, 90 - b > 0 ? 90 - b : 360 - b, b, c + 10];
      const ch = choice(deg(c), opts.slice(1).map(deg).concat([deg(c + 5)]), rng);
      return {
        prompt: `$\\angle P$ and $\\angle Q$ are ${isC ? 'complementary' : 'supplementary'}. If $m\\angle P = ${deg(b)}$, what is $m\\angle Q$?`,
        input: { type: 'choice', options: ch.options.map((x) => '$' + x + '$') }, answer: ch.answer,
        explanation: [`${isC ? 'Complementary' : 'Supplementary'} angles add to $${isC ? 90 : 180}^\\circ$.`, `$m\\angle Q = ${isC ? 90 : 180} - ${b} = ${c}$, so $m\\angle Q = ${deg(c)}$.`]
      };
    }
    // rays splitting a right angle or a straight angle
    const total = kind === 'rightsplit' ? 90 : 180;
    const a = total === 90 ? rng.int(18, 72) : rng.int(30, 150), ans = total - a;
    const askFirst = rng.bool(0.3);
    return {
      prompt: total === 90 ? '$\\angle ABC$ is a right angle. Find $x$.' : 'Points $A$, $B$, and $C$ are collinear. Find $x$.',
      figure: raysFig(a, total, askFirst ? 'x°' : a + '°', askFirst ? ans + '°' : 'x°'),
      input: { type: 'number', unit: '°' }, answer: askFirst ? a : ans,
      explanation: total === 90
        ? ['Ray $BD$ splits right angle $ABC$, so $m\\angle ABD + m\\angle DBC = 90^\\circ$ (Angle Addition Postulate).', 'The two angles are <b>complementary</b>.', `$x = 90 - ${askFirst ? ans : a} = ${askFirst ? a : ans}$.`]
        : ['$\\angle ABD$ and $\\angle DBC$ form a <b>linear pair</b>.', 'Linear Pair Postulate: they are supplementary, so they add to $180^\\circ$.', `$x = 180 - ${askFirst ? ans : a} = ${askFirst ? a : ans}$.`]
    };
  }

  function angL2(rng) {
    const kind = rng.pick(['identify', 'identify', 'find', 'find', 'find2', 'which']);
    const theta = pickTheta(rng);
    if (kind === 'identify') {
      const key = rng.pick(['corr', 'corr', 'altInt', 'altInt', 'altExt', 'ssInt', 'ssInt', 'vert']);
      let [i, j] = rng.pick(T_PAIRS[key].pairs);
      if (rng.bool()) [i, j] = [j, i];
      const keys = ['corr', 'altInt', 'altExt', 'ssInt', 'vert'];
      const opts = keys.map((k) => T_PAIRS[k].name);
      const P = T_PAIRS[key];
      return {
        prompt: `Lines $m$ and $n$ are parallel. How are $\\angle ${i}$ and $\\angle ${j}$ related?`,
        figure: transFig(theta, { nums: true, arcs: [i, j] }),
        input: { type: 'choice', options: opts }, answer: keys.indexOf(key),
        explanation: [
          `$\\angle ${i}$ is ${posWords(i)}; $\\angle ${j}$ is ${posWords(j)}.`,
          key === 'vert' ? 'They are opposite each other at the same intersection, so they are <b>vertical angles</b>.'
            : key === 'corr' ? 'They are in the same position at the two intersections, so they are <b>corresponding angles</b>.'
              : key === 'altInt' ? 'Both are between the parallel lines, on opposite sides of the transversal: <b>alternate interior angles</b>.'
                : key === 'altExt' ? 'Both are outside the parallel lines, on opposite sides of the transversal: <b>alternate exterior angles</b>.'
                  : 'Both are between the parallel lines, on the same side of the transversal: <b>same-side interior angles</b>.',
          P.cong ? `By the ${P.thm}, they are congruent.` : `By the ${P.thm}, they are supplementary.`
        ],
        hint: 'Interior = between the parallel lines. Alternate = opposite sides of the transversal.'
      };
    }
    if (kind === 'which') {
      const key = rng.pick(['corr', 'altInt', 'altExt']);
      let [i, j] = rng.pick(T_PAIRS[key].pairs);
      if (rng.bool()) [i, j] = [j, i];
      const others = [1, 2, 3, 4, 5, 6, 7, 8].filter((k) => k !== i && k !== j);
      const ch = choice(`$\\angle ${j}$`, rng.sample(others, 3).map((k) => `$\\angle ${k}$`), rng);
      return {
        prompt: `Lines $m \\parallel n$. By the <b>${T_PAIRS[key].thm}</b>, which angle is congruent to $\\angle ${i}$?`,
        figure: transFig(theta, { nums: true, arcs: [i] }),
        input: { type: 'choice', options: ch.options }, answer: ch.answer,
        explanation: [`$\\angle ${i}$ is ${posWords(i)}.`, `The ${T_PAIRS[key].name.toLowerCase().replace(/s$/, '')} partner is $\\angle ${j}$ (${posWords(j)}).`, `${T_PAIRS[key].thm}: when parallel lines are cut by a transversal, these angles are congruent.`]
      };
    }
    let i, j, key;
    if (kind === 'find') {
      key = rng.pick(['corr', 'altInt', 'altExt', 'ssInt', 'ssInt']);
      [i, j] = rng.pick(T_PAIRS[key].pairs);
      if (rng.bool()) [i, j] = [j, i];
    } else {
      i = rng.int(1, 4); j = rng.int(5, 8);
      if (rng.bool()) [i, j] = [j, i];
    }
    const vi = tMeasure(i, theta), vj = tMeasure(j, theta);
    const labels = {}; labels[i] = vi + '°'; labels[j] = 'x°';
    let expl;
    if (kind === 'find') {
      const P = T_PAIRS[key];
      expl = [`The ${vi}° angle and the $x^\\circ$ angle are <b>${P.name.toLowerCase()}</b>.`,
        P.cong ? `${P.thm}: with parallel lines they are congruent.` : `${P.thm}: with parallel lines they are supplementary.`,
        P.cong ? `$x = ${vi}$.` : `$x = 180 - ${vi} = ${vj}$.`];
    } else {
      const k = i <= 4 ? i + 4 : i - 4; // corresponding partner of i at the other crossing
      expl = [`Corresponding Angles Postulate: the angle in the same position as the ${vi}° angle at the other intersection also measures $${deg(vi)}$.`,
        k === j ? 'That angle is the $x^\\circ$ angle itself.'
          : vj === vi ? 'That angle and the $x^\\circ$ angle are vertical angles, which are congruent (Vertical Angles Theorem).'
            : 'That angle and the $x^\\circ$ angle form a linear pair, so they are supplementary (Linear Pair Postulate).',
        vj === vi ? `$x = ${vi}$.` : `$x = 180 - ${vi} = ${vj}$.`];
    }
    return {
      prompt: 'Lines $m \\parallel n$ are cut by transversal $t$. Find $x$.',
      figure: transFig(theta, { labels }),
      input: { type: 'number', unit: '°' }, answer: vj,
      explanation: expl,
      hint: 'Every angle in this figure is either the acute measure or 180° minus it.'
    };
  }

  function angL3(rng) {
    const kind = rng.pick(['trans', 'trans', 'tri', 'ext', 'word']);
    if (kind === 'trans') {
      const theta = pickTheta(rng, 45, 135);
      const key = rng.pick(['corr', 'altInt', 'altInt', 'altExt', 'ssInt', 'ssInt']);
      let [i, j] = rng.pick(T_PAIRS[key].pairs);
      if (rng.bool()) [i, j] = [j, i];
      const P = T_PAIRS[key], vi = tMeasure(i, theta), vj = tMeasure(j, theta);
      let x, a, b, c, dd, tries = 0;
      do {
        x = rng.int(4, 25); a = rng.int(2, 7); c = rng.int(1, 6);
        if (c === a) c = a + 1;
        b = vi - a * x; dd = vj - c * x; tries++;
      } while ((b === 0 || dd === 0 || Math.abs(b) > 70 || Math.abs(dd) > 70) && tries < 200);
      if (b === 0 || dd === 0 || Math.abs(b) > 70 || Math.abs(dd) > 70) { x = 10; a = 2; c = 1; b = vi - 20; dd = vj - 10; }
      const e1 = linTxt(a, b), e2 = linTxt(c, dd);
      const labels = {}; labels[i] = `(${e1})°`; labels[j] = `(${e2})°`;
      const askAngle = rng.bool(0.4);
      const eq = P.cong ? `${lin(a, b)} = ${lin(c, dd)}` : `(${lin(a, b)}) + (${lin(c, dd)}) = 180`;
      return {
        prompt: askAngle ? `Lines $m \\parallel n$. Find the measure of the angle labeled $(${lin(a, b)})^\\circ$.` : 'Lines $m \\parallel n$. Find the value of $x$.',
        figure: transFig(theta, { labels, tall: true }),
        input: { type: 'number', unit: askAngle ? '°' : null }, answer: askAngle ? vi : x,
        explanation: [
          `The angles are <b>${P.name.toLowerCase()}</b>, so by the ${P.thm} they are ${P.cong ? 'congruent' : 'supplementary'}.`,
          `Write the equation: $${eq}$.`,
          `Solve: $${P.cong ? `${lin(a - c, 0)} = ${dd - b}` : `${lin(a + c, 0)} = ${180 - b - dd}`}$, so $x = ${x}$.`
        ].concat(askAngle ? [`Substitute: $${subst(a, x, b)} = ${vi}$, so the angle is $${deg(vi)}$.`] : []),
        hint: P.cong ? 'Set the two expressions equal.' : 'Same-side interior angles add to 180°.'
      };
    }
    if (kind === 'tri' || kind === 'ext') {
      // integer angles; x integer; expressions a_i x + b_i
      let A, B, C, x, co, bs, tries = 0;
      do {
        A = rng.int(30, 95); B = rng.int(30, 95); C = 180 - A - B; x = rng.int(5, 18);
        co = [rng.int(1, 4), rng.int(1, 4), rng.int(1, 5)];
        bs = [A - co[0] * x, B - co[1] * x, C - co[2] * x]; tries++;
      } while ((C < 28 || bs.some((v) => v === 0 || Math.abs(v) > 60) || (co[0] === co[1] && bs[0] === bs[1])) && tries < 80);
      if (C < 28 || bs.some((v) => v === 0)) { A = 60; B = 70; C = 50; x = 10; co = [2, 3, 1]; bs = [40, 40, 40]; }
      const names = rng.pick([['A', 'B', 'C'], ['P', 'Q', 'R'], ['J', 'K', 'L'], ['X', 'Y', 'Z'], ['D', 'E', 'F']]);
      const P = triFromAngles(A, B, C, rng.pick([0, 0, 0.15, -0.15]));
      if (kind === 'tri') {
        const f = fitter([P], 300, 190, 30);
        const S = P.map(f);
        const ask = rng.pick(['x', 'x', 0, 1, 2]);
        const fig = svgDoc(300, 190, drawTri(S, { names, arcs: { 0: 1, 1: 2, 2: 3 }, arcColor: ACC }));
        const ex = [0, 1, 2].map((k) => `m\\angle ${names[k]} = (${lin(co[k], bs[k])})^\\circ`);
        const sumC = co[0] + co[1] + co[2], sumB = bs[0] + bs[1] + bs[2], vals = [A, B, C];
        return {
          prompt: `In $\\triangle ${names.join('')}$: $${ex[0]}$, $${ex[1]}$, and $${ex[2]}$. ${ask === 'x' ? 'Find $x$.' : `Find $m\\angle ${names[ask]}$.`}`,
          figure: fig,
          input: { type: 'number', unit: ask === 'x' ? null : '°' }, answer: ask === 'x' ? x : vals[ask],
          explanation: [
            'Triangle Angle Sum Theorem: the interior angles of a triangle add to $180^\\circ$.',
            `$(${lin(co[0], bs[0])}) + (${lin(co[1], bs[1])}) + (${lin(co[2], bs[2])}) = 180$`,
            `Combine like terms: $${lin(sumC, sumB)} = 180$, so $${lin(sumC, 0)} = ${180 - sumB}$ and $x = ${x}$.`
          ].concat(ask === 'x' ? [] : [`$m\\angle ${names[ask]} = ${subst(co[ask], x, bs[ask])} = ${deg(vals[ask])}$.`])
        };
      }
      // exterior angle at vertex 2 (C)
      const ext = A + B;
      let ce, be, t2 = 0;
      do { ce = rng.int(2, 6); be = ext - ce * x; t2++; } while ((be === 0 || Math.abs(be) > 70 || ce === co[0] + co[1]) && t2 < 30);
      if (be === 0 || ce === co[0] + co[1]) { ce = co[0] + co[1] + 1; be = ext - ce * x; }
      const Pm = P, f = fitter([Pm, [add(Pm[2], mul(unit(sub(Pm[2], Pm[1])), 0.45 * dist(Pm[0], Pm[1])))]], 300, 200, 32);
      const S = Pm.map(f), Ext = add(S[2], mul(unit(sub(S[2], S[1])), 62));
      let body = seg(S[2], Ext, { w: 2.2 }) + dotS(Ext, { r: 2.5 });
      body += drawTri(S, { names, arcs: { 0: 1, 1: 2 }, arcColor: ACC });
      body += arcMark(S[2], Ext, S[0], { r: 20, c: ACC2, w: 2 }) + angLabel(S[2], Ext, S[0], `(${linTxt(ce, be)})°`, { r: 22, size: 13, c: ACC2, bold: true });
      const ask = rng.pick(['x', 'x', 'ext']);
      return {
        prompt: `In $\\triangle ${names.join('')}$, $m\\angle ${names[0]} = (${lin(co[0], bs[0])})^\\circ$ and $m\\angle ${names[1]} = (${lin(co[1], bs[1])})^\\circ$. The exterior angle at $${names[2]}$ is marked. ${ask === 'x' ? 'Find $x$.' : 'Find the measure of the exterior angle.'}`,
        figure: svgDoc(300, 200, body),
        input: { type: 'number', unit: ask === 'x' ? null : '°' }, answer: ask === 'x' ? x : ext,
        explanation: [
          'Exterior Angle Theorem: an exterior angle of a triangle equals the sum of the two remote (non-adjacent) interior angles.',
          `$${lin(ce, be)} = (${lin(co[0], bs[0])}) + (${lin(co[1], bs[1])})$`,
          `$${lin(ce, be)} = ${lin(co[0] + co[1], bs[0] + bs[1])}$, so $${lin(ce - co[0] - co[1], 0)} = ${bs[0] + bs[1] - be}$ and $x = ${x}$.`
        ].concat(ask === 'x' ? [] : [`Exterior angle $= ${subst(ce, x, be)} = ${deg(ext)}$.`])
      };
    }
    // word problem: complementary / supplementary with algebra
    const isC = rng.bool(), total = isC ? 90 : 180;
    let small, k, m, big, g = 0;
    do { m = rng.int(2, 4); small = rng.int(isC ? 12 : 20, isC ? 40 : 80); k = total - (m + 1) * small; g++; }
    while ((Math.abs(k) > 30 || total - small <= small) && g < 200);
    if (Math.abs(k) > 30 || total - small <= small) { m = 2; small = isC ? 25 : 50; k = total - 3 * small; }
    big = total - small;
    const askBig = rng.bool();
    const rel = k === 0 ? `${m} times the other` : k > 0 ? `${k}° more than ${m} times the other` : `${-k}° less than ${m} times the other`;
    return {
      prompt: `Two angles are ${isC ? 'complementary' : 'supplementary'}. One angle is ${rel}. Find the measure of the ${askBig ? 'larger' : 'smaller'} angle.`,
      input: { type: 'number', unit: '°' }, answer: askBig ? big : small,
      explanation: [
        `Let the smaller angle be $x$. The other is $${lin(m, k)}$.`,
        `${isC ? 'Complementary' : 'Supplementary'} angles add to $${total}^\\circ$: $x + ${lin(m, k)} = ${total}$.`,
        `$${lin(m + 1, 0)} = ${total - k}$, so $x = ${small}$ and the larger angle is $${total} - ${small} = ${big}$.`
      ]
    };
  }

  const skillAngles = {
    id: 'geo-angles', title: 'Angle relationships', strand: 'Lines & Angles', ccss: 'G.CO.C.9, G.CO.C.10',
    blurb: 'Vertical angles, linear pairs, parallel lines with a transversal, and triangle angle theorems.',
    lab: 'geo-canvas',
    generate(rng, level) { return level === 1 ? angL1(rng) : level === 2 ? angL2(rng) : angL3(rng); }
  };

  // =====================================================================
  // Skill 2: Triangle congruence
  // =====================================================================
  const LETTER_SETS = [['A', 'B', 'C', 'D', 'E', 'F'], ['P', 'Q', 'R', 'S', 'T', 'U'], ['J', 'K', 'L', 'M', 'N', 'O'], ['X', 'Y', 'Z', 'U', 'V', 'W'], ['G', 'H', 'I', 'L', 'M', 'N']];
  function randTri(rng, right) {
    // scalene, clearly non-isosceles, angles 35..100 (or right at vertex 0)
    for (let t = 0; t < 60; t++) {
      let A, B;
      if (right) { A = 90; B = rng.int(30, 58); if (Math.abs(B - 45) < 7) continue; }
      else { A = rng.int(38, 95); B = rng.int(38, 95); }
      const C = 180 - A - B;
      if (C < 35) continue;
      const s = [A, B, C].sort((a, b) => a - b);
      if (!right && (s[1] - s[0] < 8 || s[2] - s[1] < 8 || Math.abs(s[2] - 90) < 6)) continue;
      return [A, B, C];
    }
    return right ? [90, 35, 55] : [50, 62, 68];
  }
  // two copies of a triangle side by side; second is reflected/rotated
  function twoTriFig(rng, P, o1, o2) {
    const rot = rng.pick([0, 0.4, -0.4, Math.PI, 0.9, -0.9]);
    const mirror = rng.bool(0.6);
    const c = centroid(P);
    let Q = P.map((p) => sub(p, c)).map((p) => (mirror ? [-p[0], p[1]] : p))
      .map((p) => [p[0] * Math.cos(rot) - p[1] * Math.sin(rot), p[0] * Math.sin(rot) + p[1] * Math.cos(rot)]);
    const P0 = P.map((p) => sub(p, c));
    // common scale
    const span = (pts) => Math.max(Math.max(...pts.map((p) => p[0])) - Math.min(...pts.map((p) => p[0])), 0.01);
    const spanY = (pts) => Math.max(Math.max(...pts.map((p) => p[1])) - Math.min(...pts.map((p) => p[1])), 0.01);
    const s = Math.min(112 / span(P0), 112 / span(Q), 130 / spanY(P0), 130 / spanY(Q));
    const place = (pts, cx) => {
      const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
      const mx = (Math.max(...xs) + Math.min(...xs)) / 2, my = (Math.max(...ys) + Math.min(...ys)) / 2;
      return pts.map((p) => [cx + (p[0] - mx) * s, 95 - (p[1] - my) * s]);
    };
    const S1 = place(P0, 80), S2 = place(Q, 232);
    return svgDoc(312, 190, drawTri(S1, o1) + drawTri(S2, o2));
  }
  const CRIT = ['SSS', 'SAS', 'ASA', 'AAS', 'HL', 'Not enough information'];
  function markSet(rng, kind) {
    // returns {ticks, arcs, right} using vertex/side indices (side i = vertex i → i+1)
    const k = rng.int(0, 2), k1 = (k + 1) % 3, k2 = (k + 2) % 3;
    const tk = rng.shuffle([1, 2, 3]), ac = rng.shuffle([1, 2, 3]);
    switch (kind) {
      case 'SSS': return { ticks: { 0: tk[0], 1: tk[1], 2: tk[2] } };
      case 'SAS': return { ticks: { [k]: tk[0], [k1]: tk[1] }, arcs: { [k1]: 1 } };
      case 'ASA': return { arcs: { [k]: ac[0], [k1]: ac[1] }, ticks: { [k]: 1 } };
      case 'AAS': return { arcs: { [k]: ac[0], [k1]: ac[1] }, ticks: { [k1]: 1 } };
      case 'SSA': return { ticks: { [k]: tk[0], [k1]: tk[1] }, arcs: { [k]: 1 } };
      case 'AAA': return { arcs: { 0: ac[0], 1: ac[1], 2: ac[2] } };
      case 'SS': return { ticks: { [k]: tk[0], [k2]: tk[1] } };
      case 'HL': return { right: 0, ticks: { 1: 1, [rng.pick([0, 2])]: 2 } };
      case 'HLA': return { right: 0, ticks: { [rng.pick([0, 2])]: 1 }, arcs: { [rng.pick([1, 2])]: 1 } }; // leg + acute angle → ASA/AAS (handled separately)
    }
    return {};
  }
  function marksToLatex(m, n1, n2) {
    const out = [];
    for (const k in (m.ticks || {})) { const i = +k, j = (i + 1) % 3; out.push(`${ov(n1[i] + n1[j])} \\cong ${ov(n2[i] + n2[j])}`); }
    for (const k in (m.arcs || {})) { const i = +k; out.push(`${ang(n1[i])} \\cong ${ang(n2[i])}`); }
    if (m.right != null) out.push(`${ang(n1[m.right])} \\text{ and } ${ang(n2[m.right])} \\text{ are right angles}`);
    return out;
  }
  const CRIT_EXPL = {
    SSS: 'Three pairs of sides are congruent: <b>SSS</b> (Side-Side-Side Postulate).',
    SAS: 'Two pairs of sides and the angle <i>between</i> them are congruent: <b>SAS</b> (Side-Angle-Side Postulate).',
    ASA: 'Two pairs of angles and the side <i>between</i> them are congruent: <b>ASA</b> (Angle-Side-Angle Postulate).',
    AAS: 'Two pairs of angles and a side that is <i>not</i> between them are congruent: <b>AAS</b> (Angle-Angle-Side Theorem).',
    HL: 'Both are right triangles with congruent hypotenuses and one pair of congruent legs: <b>HL</b> (Hypotenuse-Leg Theorem).',
    SSA: 'The marked parts are two sides and an angle that is <i>not</i> between them (SSA). SSA does not guarantee congruence — two different triangles can fit.',
    AAA: 'Only angles are marked (AAA). Same angles guarantee the same <i>shape</i> (similar), not the same size.',
    SS: 'Only two pairs of sides are marked. Two parts are never enough to prove congruence.'
  };
  function congL1(rng) {
    const kind = rng.pick(['SSS', 'SAS', 'SAS', 'ASA', 'ASA', 'AAS', 'AAS', 'HL', 'SSA', 'SSA', 'AAA', 'SS']);
    const L = rng.pick(LETTER_SETS), n1 = L.slice(0, 3), n2 = L.slice(3, 6);
    const angles = randTri(rng, kind === 'HL');
    const P = triFromAngles(angles[0], angles[1], angles[2], rng.float() * 0.6 - 0.3);
    const m = markSet(rng, kind);
    const ansLabel = ['SSA', 'AAA', 'SS'].includes(kind) ? 'Not enough information' : kind;
    // choose 5 of the 6 options keeping the answer
    const drop = rng.pick(CRIT.filter((c) => c !== ansLabel && c !== 'Not enough information'));
    const opts = CRIT.filter((c) => c !== drop);
    const textOnly = rng.bool(0.3);
    const facts = marksToLatex(m, n1, n2);
    const o = (names) => ({ names, ticks: m.ticks, arcs: m.arcs, right: m.right, arcColor: ACC, tickColor: ACC });
    return {
      prompt: textOnly
        ? `Given $${facts.join('$, $')}$. Which method proves $${tri(n1.join(''))} \\cong ${tri(n2.join(''))}$?`
        : `Which method proves the triangles congruent, if any? (Matching marks show congruent parts.)`,
      figure: textOnly ? undefined : twoTriFig(rng, P, o(n1), o(n2)),
      input: { type: 'choice', options: opts }, answer: opts.indexOf(ansLabel),
      explanation: [
        `List the congruent parts: $${facts.join('$; $')}$.`,
        CRIT_EXPL[kind],
        ansLabel === 'Not enough information' ? 'So there is <b>not enough information</b> to prove the triangles congruent.' : `So $${tri(n1.join(''))} \\cong ${tri(n2.join(''))}$ by ${kind}.`
      ],
      hint: 'Check where the marked angle sits: between the two marked sides, or not?'
    };
  }
  // Kite / bowtie layouts for shared-side and vertical-angle figures (math coords)
  function kiteFig(names, o) {
    // names: [L, T, R, Bt]  B top, D bottom; triangles L-T-Bt and R-T-Bt share T-Bt
    const P = [[-2.2, 0.6], [0, 2.8], [2.2, 0.6], [0, -2.2]];
    const f = fitter([P], 300, 210, 28), S = P.map(f);
    let s = poly(S, { w: 2.2 }) + seg(S[1], S[3], { w: 2.2 });
    if (o.ticks) for (const t of o.ticks) s += ticks(S[t[0]], S[t[1]], t[2], { c: ACC });
    if (o.arcs) for (const a of o.arcs) s += arcMark(S[a[0]], S[a[1]], S[a[2]], { n: a[3], r: a[4] || 20, c: ACC, trim: 3 });
    if (o.right) s += rightMark(S[o.right[0]], S[o.right[1]], S[o.right[2]]);
    if (o.shared) s += seg(S[1], S[3], { c: ACC2, w: 3 });
    names.forEach((nm, i) => { s += vLabel(S, i, nm); });
    return svgDoc(300, 210, s);
  }
  function isoFig(names, o) {
    // names: [L, T, R, M]  apex T, base L–R, M on base
    const P = [[-2.6, 0], [0, 3.1], [2.6, 0], [0, 0]];
    const f = fitter([P], 300, 200, 28), S = P.map(f);
    let s = poly([S[0], S[1], S[2]], { w: 2.2 }) + seg(S[1], S[3], { w: 2.2 });
    if (o.ticks) for (const t of o.ticks) s += ticks(S[t[0]], S[t[1]], t[2], { c: ACC });
    if (o.arcs) for (const a of o.arcs) s += arcMark(S[a[0]], S[a[1]], S[a[2]], { n: a[3], r: a[4] || 20, c: ACC, trim: 3 });
    if (o.right) s += rightMark(S[3], S[2], S[1], { c: ACC });
    if (o.shared) s += seg(S[1], S[3], { c: ACC2, w: 3 });
    names.forEach((nm, i) => { s += i === 3 ? placeLabel(S[3], [0, 1], nm, { it: true, size: 16, gap: 6 }) : vLabel([S[0], S[1], S[2]], i, nm); });
    return svgDoc(300, 200, s);
  }
  function bowtieFig(names, o) {
    // names: [A, B, C, D, E]; AE and BD cross at C; AB ∥ DE
    const P = [[-3, 1.5], [-2.2, -1.4], [0, 0], [2.2, 1.4], [3, -1.5]];
    const f = fitter([P], 300, 180, 28), S = P.map(f);
    let s = seg(S[0], S[4], { w: 2.2 }) + seg(S[1], S[3], { w: 2.2 }) + seg(S[0], S[1], { w: 2.2 }) + seg(S[3], S[4], { w: 2.2 });
    if (o.ticks) for (const t of o.ticks) s += ticks(S[t[0]], S[t[1]], t[2], { c: ACC });
    if (o.arcs) for (const a of o.arcs) s += arcMark(S[a[0]], S[a[1]], S[a[2]], { n: a[3], r: a[4] || 18, c: a[5] || ACC });
    if (o.par) { s += parArrows(S[1], S[0], 1, 0.25, { c: ACC }) + parArrows(S[4], S[3], 1, 0.25, { c: ACC }); }
    const dirs = [[-1, 0.5], [-1, -0.5], [0, -1], [1, 0.5], [1, -0.5]];
    names.forEach((nm, i) => { s += placeLabel(S[i], dirs[i], nm, { it: true, size: 16, gap: 6 }); });
    s += dotS(S[2], { r: 2.5 });
    return svgDoc(300, 180, s);
  }

  function congL2(rng) {
    const kind = rng.pick(['corrSide', 'corrAng', 'value', 'value', 'reason', 'shared', 'need']);
    if (kind === 'corrSide' || kind === 'corrAng' || kind === 'value') {
      const L = rng.pick(LETTER_SETS), n1 = L.slice(0, 3);
      const perm = rng.shuffle([0, 1, 2]);
      const n2 = perm.map((i) => L[3 + i]); // n1[k] ↔ n2[k]
      const stmt = `${tri(n1.join(''))} \\cong ${tri(n2.join(''))}`;
      if (kind === 'corrSide') {
        const i = rng.int(0, 2), j = (i + rng.pick([1, 2])) % 3;
        const corr = n2[i] + n2[j];
        const k = 3 - i - j;
        const wrong = [n2[i] + n2[k], n2[j] + n2[k], n1[i] + n1[k]];
        const ch = choice(`$${ov(corr)}$`, wrong.map((w) => `$${ov(w)}$`), rng);
        return {
          prompt: `Given $${stmt}$, which segment is congruent to $${ov(n1[i] + n1[j])}$?`,
          input: { type: 'choice', options: ch.options }, answer: ch.answer,
          explanation: [`In a congruence statement, letters in the same position correspond: $${n1[0]} \\leftrightarrow ${n2[0]}$, $${n1[1]} \\leftrightarrow ${n2[1]}$, $${n1[2]} \\leftrightarrow ${n2[2]}$.`, `So $${ov(n1[i] + n1[j])}$ corresponds to $${ov(corr)}$.`, 'Corresponding parts of congruent triangles are congruent (<b>CPCTC</b>).'],
          hint: 'Match the letters by their position in the statement.'
        };
      }
      if (kind === 'corrAng') {
        const i = rng.int(0, 2);
        const fromSecond = rng.bool();
        const q = fromSecond ? n2[i] : n1[i], a = fromSecond ? n1[i] : n2[i];
        const pool = (fromSecond ? n1 : n2).filter((x) => x !== a).concat([(fromSecond ? n2 : n1)[(i + 1) % 3]]);
        const ch = choice(`$${ang(a)}$`, pool.map((w) => `$${ang(w)}$`), rng);
        return {
          prompt: `Given $${stmt}$, which angle is congruent to $${ang(q)}$?`,
          input: { type: 'choice', options: ch.options }, answer: ch.answer,
          explanation: [`$${q}$ is in position ${i + 1} of its triangle's name, so it matches the letter in position ${i + 1} of the other: $${a}$.`, `By CPCTC, $${ang(q)} \\cong ${ang(a)}$.`]
        };
      }
      // value: find x from corresponding sides or angles, figure drawn with expressions
      const angles = randTri(rng, false);
      const P = triFromAngles(angles[0], angles[1], angles[2], rng.float() * 0.5 - 0.25);
      const useAngle = rng.bool(0.4);
      const i = rng.int(0, 2), j = (i + 1) % 3;
      let x, a, b, c, d, val, t = 0;
      do {
        x = rng.int(2, 12); a = rng.int(2, 6); c = rng.int(1, 5); if (c === a) c++;
        val = useAngle ? angles[i] : rng.int(8, 40);
        b = val - a * x; d = val - c * x; t++;
      } while ((b === 0 || d === 0 || Math.abs(b) > 60 || Math.abs(d) > 60 || (!useAngle && (a * x + b <= 0))) && t < 60);
      if (b === 0 || d === 0) { a = 3; c = 1; x = 6; val = useAngle ? angles[i] : 20; b = val - 18; d = val - 6; if (b === 0) b = 1, val = 19, d = 13; }
      const askVal = rng.bool(0.4);
      const o1 = { names: n1 }, o2 = { names: n2 };
      // positions in the figure: second triangle copy uses same vertex order (n2[k] at copy of vertex k)
      if (useAngle) { o1.angLabels = { [i]: `(${linTxt(a, b)})°` }; o2.angLabels = { [i]: `(${linTxt(c, d)})°` }; o1.arcs = { [i]: 1 }; o2.arcs = { [i]: 1 }; o1.arcColor = o2.arcColor = ACC; o1.angColor = o2.angColor = ACC; }
      else { o1.sides = { [i]: linTxt(a, b) }; o2.sides = { [i]: linTxt(c, d) }; o1.sideColor = o2.sideColor = ACC; }
      const part1 = useAngle ? `m${ang(n1[i])}` : n1[i] + n1[j], part2 = useAngle ? `m${ang(n2[i])}` : n2[i] + n2[j];
      return {
        prompt: `$${stmt}$. ${askVal ? `Find $${part1}$.` : 'Find $x$.'}`,
        figure: twoTriFig(rng, P, o1, o2),
        input: { type: 'number', unit: askVal && useAngle ? '°' : null }, answer: askVal ? val : x,
        explanation: [
          `From the congruence statement, $${useAngle ? ang(n1[i]) : ov(n1[i] + n1[j])}$ corresponds to $${useAngle ? ang(n2[i]) : ov(n2[i] + n2[j])}$.`,
          `By CPCTC they are congruent, so $${lin(a, b)} = ${lin(c, d)}$.`,
          `$${lin(a - c, 0)} = ${d - b}$, so $x = ${x}$.`
        ].concat(askVal ? [`$${part1} = ${subst(a, x, b)} = ${val}${useAngle ? '^\\circ' : ''}$.`] : [])
      };
    }
    const L5 = rng.sample(LETTERS, 5);
    if (kind === 'reason') {
      const which = rng.pick(['refl', 'vert', 'mid']);
      const opts = ['Reflexive Property of Congruence', 'Vertical Angles Theorem', 'Definition of midpoint', 'Given', 'Alternate Interior Angles Theorem'];
      if (which === 'refl') {
        const [Lf, T, R, Bt] = L5;
        return {
          prompt: `In the figure, triangles $${Lf + T + Bt}$ and $${R + T + Bt}$ share a side. Which reason justifies $${ov(T + Bt)} \\cong ${ov(T + Bt)}$?`,
          figure: kiteFig([Lf, T, R, Bt], { shared: true }),
          input: { type: 'choice', options: opts }, answer: 0,
          explanation: [`$${ov(T + Bt)}$ is a side of both triangles.`, 'Any segment is congruent to itself: the <b>Reflexive Property of Congruence</b>.']
        };
      }
      const [A, B, C, Dd, E] = L5;
      if (which === 'vert') {
        return {
          prompt: `$${ov(A + E)}$ and $${ov(B + Dd)}$ intersect at $${C}$. Which reason justifies $${ang(A + C + B)} \\cong ${ang(E + C + Dd)}$?`,
          figure: bowtieFig([A, B, C, Dd, E], { arcs: [[2, 0, 1, 1, 16], [2, 4, 3, 1, 16]] }),
          input: { type: 'choice', options: opts }, answer: 1,
          explanation: [`$${ang(A + C + B)}$ and $${ang(E + C + Dd)}$ are opposite each other where two segments cross.`, 'They are vertical angles, which are congruent by the <b>Vertical Angles Theorem</b>.']
        };
      }
      return {
        prompt: `$${C}$ is the midpoint of $${ov(A + E)}$. Which reason justifies $${ov(A + C)} \\cong ${ov(E + C)}$?`,
        figure: bowtieFig([A, B, C, Dd, E], { ticks: [[0, 2, 1], [2, 4, 1]] }),
        input: { type: 'choice', options: opts }, answer: 2,
        explanation: ['A midpoint divides a segment into two congruent segments.', `So $${ov(A + C)} \\cong ${ov(E + C)}$ by the <b>Definition of midpoint</b>.`]
      };
    }
    if (kind === 'shared') {
      const which = rng.pick(['kiteSSS', 'kiteSAS', 'bowSAS', 'bowASA', 'bowAAS']);
      const opts = ['SSS', 'SAS', 'ASA', 'AAS', 'Not enough information'];
      if (which.startsWith('kite')) {
        const [Lf, T, R, Bt] = L5;
        const sss = which === 'kiteSSS';
        return {
          prompt: `Which method proves $${tri(Lf + T + Bt)} \\cong ${tri(R + T + Bt)}$?`,
          figure: kiteFig([Lf, T, R, Bt], sss ? { ticks: [[0, 1, 1], [2, 1, 1], [0, 3, 2], [2, 3, 2]] } : { ticks: [[0, 1, 1], [2, 1, 1]], arcs: [[1, 0, 3, 1, 26], [1, 3, 2, 1, 26]] }),
          input: { type: 'choice', options: opts }, answer: sss ? 0 : 1,
          explanation: sss
            ? [`Marked: $${ov(Lf + T)} \\cong ${ov(R + T)}$ and $${ov(Lf + Bt)} \\cong ${ov(R + Bt)}$.`, `$${ov(T + Bt)} \\cong ${ov(T + Bt)}$ by the Reflexive Property (shared side).`, 'Three pairs of congruent sides: <b>SSS</b>.']
            : [`Marked: $${ov(Lf + T)} \\cong ${ov(R + T)}$ and $${ang(Lf + T + Bt)} \\cong ${ang(R + T + Bt)}$.`, `$${ov(T + Bt)} \\cong ${ov(T + Bt)}$ by the Reflexive Property.`, 'The congruent angle is between the two pairs of sides: <b>SAS</b>.']
        };
      }
      const [A, B, C, Dd, E] = L5;
      const fig = which === 'bowSAS' ? { ticks: [[0, 2, 1], [2, 4, 1], [1, 2, 2], [2, 3, 2]] }
        : which === 'bowASA' ? { par: true, ticks: [[0, 2, 1], [2, 4, 1]] }
          : { par: true, ticks: [[0, 1, 1], [3, 4, 1]] };
      const ans = which === 'bowSAS' ? 1 : which === 'bowASA' ? 2 : 3;
      return {
        prompt: `Which method proves $${tri(A + B + C)} \\cong ${tri(E + Dd + C)}$?${which !== 'bowSAS' ? ` (Arrows show $${ov(A + B)} \\parallel ${ov(Dd + E)}$.)` : ''}`,
        figure: bowtieFig([A, B, C, Dd, E], fig),
        input: { type: 'choice', options: opts }, answer: ans,
        explanation: which === 'bowSAS'
          ? [`Marked: $${ov(A + C)} \\cong ${ov(E + C)}$ and $${ov(B + C)} \\cong ${ov(Dd + C)}$.`, `$${ang(A + C + B)} \\cong ${ang(E + C + Dd)}$ by the Vertical Angles Theorem — it is between those sides.`, 'So the triangles are congruent by <b>SAS</b>.']
          : which === 'bowASA'
            ? [`$${ang(B + A + C)} \\cong ${ang(Dd + E + C)}$ by the Alternate Interior Angles Theorem.`, `$${ov(A + C)} \\cong ${ov(E + C)}$ (marked) and $${ang(A + C + B)} \\cong ${ang(E + C + Dd)}$ (vertical angles).`, 'The side is between the two angles: <b>ASA</b>.']
            : [`$${ang(B + A + C)} \\cong ${ang(Dd + E + C)}$ by the Alternate Interior Angles Theorem, and $${ang(A + C + B)} \\cong ${ang(E + C + Dd)}$ (vertical angles).`, `$${ov(A + B)} \\cong ${ov(E + Dd)}$ is marked — it is not between those two angles.`, 'So the triangles are congruent by <b>AAS</b>.']
      };
    }
    // need: which extra fact gives congruence by a named method
    const L = rng.pick(LETTER_SETS), n1 = L.slice(0, 3), n2 = L.slice(3, 6);
    const method = rng.pick(['SAS', 'ASA', 'SSS', 'AAS']);
    const k = rng.int(0, 2), k1 = (k + 1) % 3, k2 = (k + 2) % 3;
    const S = (i) => `${ov(n1[i] + n1[(i + 1) % 3])} \\cong ${ov(n2[i] + n2[(i + 1) % 3])}`;
    const A = (i) => `${ang(n1[i])} \\cong ${ang(n2[i])}`;
    let given, correct, wrong, marks;
    if (method === 'SAS') { given = [S(k), S(k1)]; correct = A(k1); wrong = [A(k), A(k2), S(k2)]; marks = { ticks: { [k]: 1, [k1]: 2 } }; }
    else if (method === 'SSS') { given = [S(k), S(k1)]; correct = S(k2); wrong = [A(k), A(k1), A(k2)]; marks = { ticks: { [k]: 1, [k1]: 2 } }; }
    else if (method === 'ASA') { given = [A(k), A(k1)]; correct = S(k); wrong = [S(k1), S(k2), A(k2)]; marks = { arcs: { [k]: 1, [k1]: 2 } }; }
    else {
      given = [A(k), A(k1)]; marks = { arcs: { [k]: 1, [k1]: 2 } };
      if (rng.bool()) { correct = S(k1); wrong = [S(k), A(k2), `${ov(n1[k1] + n1[k2])} \\cong ${ov(n2[k] + n2[k1])}`]; }
      else { correct = S(k2); wrong = [S(k), A(k2), `${ov(n1[k2] + n1[k])} \\cong ${ov(n2[k1] + n2[k2])}`]; }
    }
    const ch = choice(`$${correct}$`, wrong.map((w) => `$${w}$`), rng);
    const angles = randTri(rng, false);
    const P = triFromAngles(angles[0], angles[1], angles[2], rng.float() * 0.5 - 0.25);
    const o = (names) => ({ names, ticks: marks.ticks, arcs: marks.arcs, arcColor: ACC, tickColor: ACC });
    return {
      prompt: `You know $${given.join('$ and $')}$ (marked). Which additional fact proves $${tri(n1.join(''))} \\cong ${tri(n2.join(''))}$ by <b>${method}</b>?`,
      figure: twoTriFig(rng, P, o(n1), o(n2)),
      input: { type: 'choice', options: ch.options }, answer: ch.answer,
      explanation: [
        method === 'SAS' ? 'SAS needs the angle <i>included</i> between the two known sides.' : method === 'SSS' ? 'SSS needs the third pair of sides.' : method === 'ASA' ? 'ASA needs the side <i>included</i> between the two known angles.' : 'AAS needs a pair of sides that is <i>not</i> between the two known angles.',
        `That is $${correct}$.`,
        `With it, $${tri(n1.join(''))} \\cong ${tri(n2.join(''))}$ by ${method}.`
      ]
    };
  }

  // ---- two-column proofs (order input) ----
  function proofProblem(rng, given, prove, steps, figure) {
    const n = steps.length;
    const valid = (resp) => {
      if (!Array.isArray(resp) || resp.length !== n || new Set(resp).size !== n) return false;
      const done = new Set();
      for (const it of resp) {
        const st = perm[it];
        if (st === undefined) return false;
        for (const d of steps[st].deps) if (!done.has(d)) return false;
        done.add(st);
      }
      return perm[resp[n - 1]] === n - 1;
    };
    let perm, tries = 0;
    do { perm = rng.shuffle(steps.map((_, i) => i)); tries++; } while (tries < 12 && valid(perm.map((_, i) => i)));
    const items = perm.map((i) => `${steps[i].s} — ${steps[i].r}`);
    const answer = steps.map((_, i) => perm.indexOf(i));
    const reasons = steps.filter((s) => !['Given', 'SSS', 'SAS', 'ASA', 'AAS', 'HL', 'CPCTC'].includes(s.r)).map((s) => `<b>${s.r}</b>`);
    return {
      prompt: `<b>Given:</b> ${given}<br><b>Prove:</b> ${prove}<br>Put the statements and reasons in a logical order.`,
      figure,
      input: { type: 'order', items }, answer,
      check: valid,
      explanation: [
        'Start with the given facts; each later statement must follow from earlier ones.',
        `Supporting reasons: ${reasons.join(', ')}.`,
        `The triangle congruence comes once three pairs of parts are established: ${steps[steps.findIndex((s) => /^\$\\triangle/.test(s.s))].r}.`,
        steps[n - 1].r === 'CPCTC' ? 'Finally, corresponding parts of congruent triangles are congruent (CPCTC).' : 'That completes the proof.'
      ],
      hint: 'Givens first; the congruence statement comes after its three parts.'
    };
  }
  const M = (s) => `$${s}$`;
  function congL3(rng) {
    const t = rng.pick(['kiteSSS', 'kiteSAS', 'isoHL', 'isoAAS', 'isoSAS', 'bowSAS', 'bowASA', 'bowAAS']);
    const L5 = rng.sample(LETTERS, 5);
    const cp = rng.bool(0.5);
    if (t.startsWith('kite') || t.startsWith('iso')) {
      const [Lf, T, R, Bt] = L5;
      const t1 = tri(Lf + T + Bt), t2 = tri(R + T + Bt), concl = `${t1} \\cong ${t2}`;
      let steps, given, fig, prove = M(concl), cpcStep = null;
      if (t === 'kiteSSS') {
        given = `${M(`${ov(Lf + T)} \\cong ${ov(R + T)}`)}, ${M(`${ov(Lf + Bt)} \\cong ${ov(R + Bt)}`)}`;
        steps = [{ s: M(`${ov(Lf + T)} \\cong ${ov(R + T)}`), r: 'Given', deps: [] }, { s: M(`${ov(Lf + Bt)} \\cong ${ov(R + Bt)}`), r: 'Given', deps: [] },
          { s: M(`${ov(T + Bt)} \\cong ${ov(T + Bt)}`), r: 'Reflexive Property', deps: [] }, { s: M(concl), r: 'SSS', deps: [0, 1, 2] }];
        cpcStep = { s: M(`${ang(T + Lf + Bt)} \\cong ${ang(T + R + Bt)}`), r: 'CPCTC', deps: [3] };
        fig = kiteFig([Lf, T, R, Bt], { ticks: [[0, 1, 1], [2, 1, 1], [0, 3, 2], [2, 3, 2]] });
      } else if (t === 'kiteSAS') {
        given = `${M(`${ov(Lf + T)} \\cong ${ov(R + T)}`)}, ${M(`${ov(T + Bt)}`)} bisects ${M(ang(Lf + T + R))}`;
        steps = [{ s: M(`${ov(Lf + T)} \\cong ${ov(R + T)}`), r: 'Given', deps: [] }, { s: `${M(ov(T + Bt))} bisects ${M(ang(Lf + T + R))}`, r: 'Given', deps: [] },
          { s: M(`${ang(Lf + T + Bt)} \\cong ${ang(R + T + Bt)}`), r: 'Definition of angle bisector', deps: [1] },
          { s: M(`${ov(T + Bt)} \\cong ${ov(T + Bt)}`), r: 'Reflexive Property', deps: [] }, { s: M(concl), r: 'SAS', deps: [0, 2, 3] }];
        cpcStep = { s: M(`${ov(Lf + Bt)} \\cong ${ov(R + Bt)}`), r: 'CPCTC', deps: [4] };
        fig = kiteFig([Lf, T, R, Bt], { ticks: [[0, 1, 1], [2, 1, 1]], arcs: [[1, 0, 3, 1, 26], [1, 3, 2, 1, 26]] });
      } else if (t === 'isoHL') {
        given = `${M(`${ov(T + Bt)} \\perp ${ov(Lf + R)}`)}, ${M(`${ov(Lf + T)} \\cong ${ov(R + T)}`)}`;
        steps = [{ s: M(`${ov(T + Bt)} \\perp ${ov(Lf + R)}`), r: 'Given', deps: [] },
          { s: `${M(ang(T + Bt + Lf))} and ${M(ang(T + Bt + R))} are right angles`, r: 'Definition of perpendicular', deps: [0] },
          { s: M(`${ov(Lf + T)} \\cong ${ov(R + T)}`), r: 'Given', deps: [] },
          { s: M(`${ov(T + Bt)} \\cong ${ov(T + Bt)}`), r: 'Reflexive Property', deps: [] }, { s: M(concl), r: 'HL', deps: [1, 2, 3] }];
        cpcStep = { s: M(`${ov(Lf + Bt)} \\cong ${ov(R + Bt)}`), r: 'CPCTC', deps: [4] };
        fig = isoFig([Lf, T, R, Bt], { right: true, ticks: [[0, 1, 1], [2, 1, 1]] });
      } else if (t === 'isoAAS') {
        given = `${M(ov(T + Bt))} bisects ${M(ang(Lf + T + R))}, ${M(`${ang(Lf)} \\cong ${ang(R)}`)}`;
        steps = [{ s: `${M(ov(T + Bt))} bisects ${M(ang(Lf + T + R))}`, r: 'Given', deps: [] },
          { s: M(`${ang(Lf + T + Bt)} \\cong ${ang(R + T + Bt)}`), r: 'Definition of angle bisector', deps: [0] },
          { s: M(`${ang(Lf)} \\cong ${ang(R)}`), r: 'Given', deps: [] },
          { s: M(`${ov(T + Bt)} \\cong ${ov(T + Bt)}`), r: 'Reflexive Property', deps: [] }, { s: M(concl), r: 'AAS', deps: [1, 2, 3] }];
        cpcStep = { s: M(`${ov(Lf + T)} \\cong ${ov(R + T)}`), r: 'CPCTC', deps: [4] };
        fig = isoFig([Lf, T, R, Bt], { arcs: [[1, 0, 3, 1, 26], [1, 3, 2, 1, 26], [0, 2, 1, 2, 20], [2, 1, 0, 2, 20]] });
      } else { // isoSAS: midpoint + perpendicular
        given = `${M(Bt)} is the midpoint of ${M(ov(Lf + R))}, ${M(`${ov(T + Bt)} \\perp ${ov(Lf + R)}`)}`;
        steps = [{ s: `${M(Bt)} is the midpoint of ${M(ov(Lf + R))}`, r: 'Given', deps: [] },
          { s: M(`${ov(Lf + Bt)} \\cong ${ov(R + Bt)}`), r: 'Definition of midpoint', deps: [0] },
          { s: M(`${ov(T + Bt)} \\perp ${ov(Lf + R)}`), r: 'Given', deps: [] },
          { s: M(`${ang(T + Bt + Lf)} \\cong ${ang(T + Bt + R)}`), r: 'Perpendicular lines form congruent right angles', deps: [2] },
          { s: M(`${ov(T + Bt)} \\cong ${ov(T + Bt)}`), r: 'Reflexive Property', deps: [] }, { s: M(concl), r: 'SAS', deps: [1, 3, 4] }];
        fig = isoFig([Lf, T, R, Bt], { right: true, ticks: [[0, 3, 1], [3, 2, 1]] });
      }
      if (cp && cpcStep && steps.length < 6) { steps.push(cpcStep); prove = cpcStep.s; }
      return proofProblem(rng, given, prove, steps, fig);
    }
    const [A, B, C, Dd, E] = L5;
    const concl = `${tri(A + B + C)} \\cong ${tri(E + Dd + C)}`;
    let steps, given, fig, prove = M(concl);
    const vert = { s: M(`${ang(A + C + B)} \\cong ${ang(E + C + Dd)}`), r: 'Vertical Angles Theorem', deps: [] };
    if (t === 'bowSAS') {
      given = `${M(C)} is the midpoint of ${M(ov(A + E))} and of ${M(ov(B + Dd))}`;
      steps = [{ s: `${M(C)} is the midpoint of ${M(ov(A + E))}`, r: 'Given', deps: [] }, { s: M(`${ov(A + C)} \\cong ${ov(E + C)}`), r: 'Definition of midpoint', deps: [0] },
        { s: `${M(C)} is the midpoint of ${M(ov(B + Dd))}`, r: 'Given', deps: [] }, { s: M(`${ov(B + C)} \\cong ${ov(Dd + C)}`), r: 'Definition of midpoint', deps: [2] },
        vert, { s: M(concl), r: 'SAS', deps: [1, 3, 4] }];
      fig = bowtieFig([A, B, C, Dd, E], { ticks: [[0, 2, 1], [2, 4, 1], [1, 2, 2], [2, 3, 2]] });
    } else if (t === 'bowASA') {
      given = `${M(`${ov(A + B)} \\parallel ${ov(Dd + E)}`)}, ${M(C)} is the midpoint of ${M(ov(A + E))}`;
      steps = [{ s: M(`${ov(A + B)} \\parallel ${ov(Dd + E)}`), r: 'Given', deps: [] }, { s: M(`${ang(B + A + C)} \\cong ${ang(Dd + E + C)}`), r: 'Alternate Interior Angles Theorem', deps: [0] },
        { s: `${M(C)} is the midpoint of ${M(ov(A + E))}`, r: 'Given', deps: [] }, { s: M(`${ov(A + C)} \\cong ${ov(E + C)}`), r: 'Definition of midpoint', deps: [2] },
        vert, { s: M(concl), r: 'ASA', deps: [1, 3, 4] }];
      fig = bowtieFig([A, B, C, Dd, E], { par: true, ticks: [[0, 2, 1], [2, 4, 1]] });
    } else {
      given = `${M(`${ov(A + B)} \\parallel ${ov(Dd + E)}`)}, ${M(`${ov(A + B)} \\cong ${ov(E + Dd)}`)}`;
      steps = [{ s: M(`${ov(A + B)} \\parallel ${ov(Dd + E)}`), r: 'Given', deps: [] }, { s: M(`${ang(B + A + C)} \\cong ${ang(Dd + E + C)}`), r: 'Alternate Interior Angles Theorem', deps: [0] },
        vert, { s: M(`${ov(A + B)} \\cong ${ov(E + Dd)}`), r: 'Given', deps: [] }, { s: M(concl), r: 'AAS', deps: [1, 2, 3] }];
      if (cp) { steps.push({ s: M(`${ov(A + C)} \\cong ${ov(E + C)}`), r: 'CPCTC', deps: [4] }); prove = steps[5].s; }
      fig = bowtieFig([A, B, C, Dd, E], { par: true, ticks: [[0, 1, 1], [3, 4, 1]] });
    }
    return proofProblem(rng, given, prove, steps, fig);
  }

  const skillCongruence = {
    id: 'geo-congruence', title: 'Triangle congruence', strand: 'Congruence', ccss: 'G.CO.B.7, G.CO.B.8, G.SRT.B.5',
    blurb: 'Use SSS, SAS, ASA, AAS and HL, match corresponding parts, and order two-column proofs.',
    lab: 'geo-canvas',
    generate(rng, level) { return level === 1 ? congL1(rng) : level === 2 ? congL2(rng) : congL3(rng); }
  };

  // =====================================================================
  // Skill 3: Pythagorean theorem & special right triangles
  // =====================================================================
  const TRIPLES = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29], [9, 40, 41], [6, 8, 10], [9, 12, 15], [12, 16, 20], [15, 20, 25], [10, 24, 26], [12, 35, 37], [11, 60, 61], [15, 36, 39], [18, 24, 30], [16, 30, 34], [21, 28, 35], [24, 32, 40]];
  // right triangle figure; right angle at C. legs a (BC, vertical), b (AC, horizontal). labels: {a,b,c} strings
  function rightTriFig(a, b, labels, o) {
    o = o || {};
    const names = o.names || ['A', 'B', 'C'];
    // math coords: C=(0,0), A=(b,0) or (-b,0), B=(0,a)
    const flip = o.flip ? -1 : 1;
    let P = [[flip * b, 0], [0, a], [0, 0]];
    if (o.rot) P = P.map((p) => [p[0] * Math.cos(o.rot) - p[1] * Math.sin(o.rot), p[0] * Math.sin(o.rot) + p[1] * Math.cos(o.rot)]);
    // keep aspect sane: clamp extreme ratios in the drawing only
    const W = 300, H = 200;
    const f = fitter([P], W, H, 34);
    const S = P.map(f);
    const opt = { names, right: 2, sides: {} };
    if (labels.c != null) opt.sides[0] = labels.c; // A→B hypotenuse
    if (labels.a != null) opt.sides[1] = labels.a; // B→C
    if (labels.b != null) opt.sides[2] = labels.b; // C→A
    opt.sideColor = ACC;
    if (o.arcs) { opt.arcs = o.arcs; opt.arcColor = ACC2; }
    if (o.angLabels) { opt.angLabels = o.angLabels; opt.angColor = ACC2; }
    return svgDoc(W, H, drawTri(S, opt));
  }
  function rtL1(rng) {
    const t = rng.pick(TRIPLES.slice(0, 16));
    let [a, b, c] = rng.bool() ? t : [t[1], t[0], t[2]];
    const findHyp = rng.bool(0.5);
    const names = rng.pick([['A', 'B', 'C'], ['P', 'Q', 'R'], ['X', 'Y', 'Z'], ['D', 'E', 'F']]);
    const style = rng.pick(['fig', 'fig', 'fig', 'text']);
    const opts = { names, flip: rng.bool(), rot: rng.pick([0, 0, 0.25, -0.25]) };
    if (findHyp) {
      const labels = { a: String(a), b: String(b), c: 'x' };
      return {
        prompt: style === 'text' ? `A right triangle has legs of length ${a} and ${b}. How long is the hypotenuse?` : 'Find the length of the hypotenuse $x$.',
        figure: style === 'text' ? undefined : rightTriFig(a, b, labels, opts),
        input: { type: 'number' }, answer: c,
        explanation: ['Pythagorean Theorem: in a right triangle, $a^2 + b^2 = c^2$ where $c$ is the hypotenuse.', `$${a}^2 + ${b}^2 = x^2 \\Rightarrow ${a * a} + ${b * b} = ${c * c}$`, `$x = \\sqrt{${c * c}} = ${c}$`],
        hint: 'Square both legs, add, then take the square root.'
      };
    }
    const labels = { a: 'x', b: String(b), c: String(c) };
    return {
      prompt: style === 'text' ? `A right triangle has a hypotenuse of ${c} and one leg of ${b}. How long is the other leg?` : 'Find the missing leg $x$.',
      figure: style === 'text' ? undefined : rightTriFig(a, b, labels, opts),
      input: { type: 'number' }, answer: a,
      explanation: ['Pythagorean Theorem: $a^2 + b^2 = c^2$, with $c$ the hypotenuse (opposite the right angle).', `$x^2 + ${b}^2 = ${c}^2 \\Rightarrow x^2 = ${c * c} - ${b * b} = ${a * a}$`, `$x = \\sqrt{${a * a}} = ${a}$`],
      hint: 'For a leg, subtract: c² − b².'
    };
  }
  function rtL2(rng) {
    const kind = rng.pick(['hyp', 'leg', 'ladder', 'tv', 'ramp', 'converse', 'converse']);
    const r1 = (x) => U.round(x, 1);
    if (kind === 'hyp' || kind === 'leg') {
      let a, b, c;
      do { a = rng.int(2, 15); b = rng.int(2, 15); c = Math.sqrt(a * a + b * b); } while (Number.isInteger(c) || a === b);
      if (kind === 'hyp') {
        return {
          prompt: 'Find $x$. Round to the nearest tenth.',
          figure: rightTriFig(a, b, { a: String(a), b: String(b), c: 'x' }, { flip: rng.bool(), names: rng.pick([['A', 'B', 'C'], ['L', 'M', 'N'], ['R', 'S', 'T']]) }),
          input: { type: 'number' }, answer: r1(c), check: tol(c),
          explanation: ['Pythagorean Theorem: $a^2 + b^2 = c^2$.', `$x^2 = ${a}^2 + ${b}^2 = ${a * a + b * b}$`, `$x = \\sqrt{${a * a + b * b}} \\approx ${r1(c)}$`]
        };
      }
      let h, l, x;
      do { h = rng.int(6, 20); l = rng.int(2, h - 1); x = Math.sqrt(h * h - l * l); } while (Number.isInteger(x));
      return {
        prompt: 'Find the leg $x$. Round to the nearest tenth.',
        figure: rightTriFig(x, l, { a: 'x', b: String(l), c: String(h) }, { flip: rng.bool(), names: rng.pick([['A', 'B', 'C'], ['J', 'K', 'L'], ['D', 'E', 'F']]) }),
        input: { type: 'number' }, answer: r1(x), check: tol(x),
        explanation: ['Pythagorean Theorem: $a^2 + b^2 = c^2$, where the hypotenuse is the longest side.', `$x^2 = ${h}^2 - ${l}^2 = ${h * h - l * l}$`, `$x = \\sqrt{${h * h - l * l}} \\approx ${r1(x)}$`]
      };
    }
    if (kind === 'ladder') {
      const L = rng.int(10, 24), d = rng.int(3, Math.floor(L / 2)), hgt = Math.sqrt(L * L - d * d);
      const who = U.name(rng);
      // figure: wall, ground, ladder
      const f = fitter([[[0, 0], [d, 0], [0, hgt]]], 300, 200, 30), O = f([0, 0]), Fp = f([d, 0]), T = f([0, hgt]);
      let s = seg([O[0], 12], [O[0], 190], { c: MUTED, w: 4 }) + seg([O[0] - 10, O[1]], [292, O[1]], { c: MUTED, w: 3 });
      s += seg(Fp, T, { c: ACC, w: 4 }) + rightMark(O, Fp, T) + sideLabel(Fp, T, `${L} ft`, O, { c: ACC });
      s += placeLabel(mid(O, Fp), [0, 1], `${d} ft`, { size: 14 }) + placeLabel(mid(O, T), [1, 0], 'h', { it: true, size: 15, gap: 7 });
      return {
        prompt: `${who} leans a ${L}-foot ladder against a wall. The foot of the ladder is ${d} feet from the wall. How high up the wall does the ladder reach? Round to the nearest tenth.`,
        figure: svgDoc(300, 200, s),
        input: { type: 'number', unit: 'ft' }, answer: r1(hgt), check: tol(hgt),
        explanation: ['The wall, ground and ladder form a right triangle; the ladder is the hypotenuse.', `Pythagorean Theorem: $h^2 + ${d}^2 = ${L}^2$, so $h^2 = ${L * L} - ${d * d} = ${L * L - d * d}$.`, `$h = \\sqrt{${L * L - d * d}} \\approx ${r1(hgt)}$ ft.`]
      };
    }
    if (kind === 'tv') {
      const [w, h] = rng.pick([[32, 18], [48, 27], [40, 22], [44, 25], [52, 29], [36, 20], [56, 32], [28, 16], [60, 34], [24, 14]]);
      const dgl = Math.hypot(w, h);
      const askDiag = rng.bool(0.6);
      const W = 300, H = 200, sc = Math.min(240 / w, 150 / h), x0 = (W - w * sc) / 2, y0 = (H - h * sc) / 2 - 6;
      const tl = [x0, y0], br = [x0 + w * sc, y0 + h * sc], tr = [br[0], y0], bl = [x0, br[1]];
      let s = poly([tl, tr, br, bl], { c: INK, w: 3, fill: 'var(--surface-2)', fop: 1 }) + seg(bl, tr, { c: ACC, w: 2.2, dash: '6 4' });
      s += rightMark(br, bl, tr) + placeLabel(mid(bl, br), [0, 1], askDiag ? `${w} in` : `${w} in`, { size: 14 });
      s += placeLabel(mid(tr, br), [1, 0], askDiag ? `${h} in` : '?', { size: 14 });
      s += txt(add(mid(bl, tr), [-12, -12]), askDiag ? 'd' : `${r1(dgl)} in`, { size: 14, c: ACC, it: askDiag });
      if (askDiag) {
        return {
          prompt: `A TV screen is ${w} inches wide and ${h} inches tall. TVs are sold by the diagonal. What is the diagonal size? Round to the nearest tenth.`,
          figure: svgDoc(W, H, s), input: { type: 'number', unit: 'in' }, answer: r1(dgl), check: tol(dgl),
          explanation: ['The width, height and diagonal form a right triangle with the diagonal as hypotenuse.', `$d^2 = ${w}^2 + ${h}^2 = ${w * w + h * h}$`, `$d = \\sqrt{${w * w + h * h}} \\approx ${r1(dgl)}$ in.`]
        };
      }
      const D = r1(dgl), hh = Math.sqrt(D * D - w * w);
      return {
        prompt: `A TV has a ${D}-inch diagonal and is ${w} inches wide. How tall is the screen? Round to the nearest tenth.`,
        figure: svgDoc(W, H, s), input: { type: 'number', unit: 'in' }, answer: r1(hh), check: tol(hh, 0.1),
        explanation: ['Width, height and diagonal form a right triangle; the diagonal is the hypotenuse.', `$h^2 = ${D}^2 - ${w}^2 \\approx ${r1(D * D - w * w)}$`, `$h \\approx ${r1(hh)}$ in.`]
      };
    }
    if (kind === 'ramp') {
      let Lg, Wd; do { Lg = rng.int(6, 24) * 5; Wd = rng.int(4, 16) * 5; } while (Wd >= Lg || Number.isInteger(Math.hypot(Lg, Wd)));
      const dgl = Math.hypot(Lg, Wd), who = U.name(rng);
      const W = 300, H = 190, sc = Math.min(230 / Lg, 120 / Wd), x0 = (W - Lg * sc) / 2, y0 = (H - Wd * sc) / 2;
      const tl = [x0, y0], br = [x0 + Lg * sc, y0 + Wd * sc], tr = [br[0], y0], bl = [x0, br[1]];
      let f = poly([tl, tr, br, bl], { c: GOOD, w: 2.2, fill: GOOD, fop: 0.12 }) + seg(bl, tr, { c: ACC, w: 2.5, dash: '6 4' }) + rightMark(br, bl, tr);
      f += placeLabel(mid(bl, br), [0, 1], `${Lg} m`, { size: 14 }) + placeLabel(mid(tr, br), [1, 0], `${Wd} m`, { size: 14 });
      return {
        prompt: `${who} walks diagonally across a rectangular field that is ${Lg} m long and ${Wd} m wide. How far does ${who} walk? Round to the nearest tenth.`,
        figure: svgDoc(W, H, f),
        input: { type: 'number', unit: 'm' }, answer: r1(dgl), check: tol(dgl),
        explanation: ['The diagonal splits the rectangle into two right triangles; the diagonal is the hypotenuse.', `Pythagorean Theorem: $d^2 = ${Lg}^2 + ${Wd}^2 = ${Lg * Lg + Wd * Wd}$.`, `$d = \\sqrt{${Lg * Lg + Wd * Wd}} \\approx ${r1(dgl)}$ m.`]
      };
    }
    // converse: classify
    let a, b, c, tries = 0;
    const want = rng.pick(['right', 'acute', 'obtuse', 'none']);
    do {
      if (want === 'right') { const t = rng.pick(TRIPLES); const k = rng.pick([1, 1, 2]); [a, b, c] = t.map((v) => v * (t[2] > 30 ? 1 : k)); }
      else { a = rng.int(3, 20); b = rng.int(a, 22); c = rng.int(b, 30); }
      tries++;
    } while (tries < 200 && !(() => {
      const s2 = a * a + b * b, c2 = c * c, isTri = a + b > c;
      if (want === 'none') return !isTri && a + b < c - 1;
      if (!isTri || c <= b) return false;
      if (want === 'right') return s2 === c2;
      if (want === 'acute') return s2 > c2 && c > b;
      return s2 < c2;
    })());
    const s2 = a * a + b * b, c2 = c * c;
    const ansIdx = a + b <= c ? 3 : s2 === c2 ? 0 : s2 > c2 ? 1 : 2;
    const sides = rng.shuffle([a, b, c]);
    return {
      prompt: `A triangle has side lengths ${sides.join(', ')}. Classify it.`,
      input: { type: 'choice', options: ['Right', 'Acute', 'Obtuse', 'Not a triangle'] }, answer: ansIdx,
      explanation: ansIdx === 3
        ? ['Triangle Inequality Theorem: the two shorter sides must add to more than the longest side.', `$${a} + ${b} = ${a + b} \\le ${c}$, so these lengths cannot form a triangle.`]
        : [`The longest side is $c = ${c}$. Check the Triangle Inequality: $${a} + ${b} > ${c}$ ✓.`, `Compare $a^2 + b^2$ with $c^2$: $${a}^2 + ${b}^2 = ${s2}$ and $${c}^2 = ${c2}$.`,
          ansIdx === 0 ? 'They are equal, so by the Converse of the Pythagorean Theorem the triangle is <b>right</b>.'
            : ansIdx === 1 ? `$${s2} > ${c2}$, so by the Pythagorean Inequality Theorem the triangle is <b>acute</b>.`
              : `$${s2} < ${c2}$, so by the Pythagorean Inequality Theorem the triangle is <b>obtuse</b>.`],
      hint: 'Compare a² + b² with c², where c is the longest side.'
    };
  }
  // radical latex: k√r with simplification; returns latex string
  function surd(coef, rad) {
    // coef integer, rad squarefree integer ≥1
    if (rad === 1) return String(coef);
    return (coef === 1 ? '' : coef) + `\\sqrt{${rad}}`;
  }
  function surdFrac(coef, rad, den) { // coef√rad / den simplified
    const g = U.gcd(coef, den), c = coef / g, d = den / g;
    if (d === 1) return surd(c, rad);
    return `\\frac{${surd(c, rad)}}{${d}}`;
  }
  function rtL3(rng) {
    const kind = rng.pick(['454590', '454590', '306090', '306090', '306090', 'trig', 'trig']);
    if (kind === '454590') {
      const k = rng.int(2, 12), given = rng.pick(['leg', 'leg', 'hypInt', 'hypRad']);
      let gLabel, ans, wrong, ex;
      if (given === 'leg') { gLabel = String(k); ans = surd(k, 2); wrong = [String(2 * k), surd(k, 3), surdFrac(k, 2, 2), String(k)]; ex = [`In a 45°-45°-90° triangle the legs are congruent and hypotenuse $= \\text{leg}\\cdot\\sqrt{2}$.`, `Hypotenuse $= ${k}\\sqrt{2}$.`]; }
      else if (given === 'hypRad') { gLabel = `${k}√2`; ans = String(k); wrong = [surd(k, 2), String(2 * k), surdFrac(k, 2, 2), surd(k, 3)]; ex = ['45°-45°-90° Triangle Theorem: hypotenuse $= \\text{leg}\\cdot\\sqrt{2}$.', `$\\text{leg} = \\frac{${k}\\sqrt{2}}{\\sqrt{2}} = ${k}$.`]; }
      else { const h = 2 * k; gLabel = String(h); ans = surd(k, 2); wrong = [String(k), surd(h, 2), surdFrac(h, 3, 3), surd(k, 3)]; ex = ['45°-45°-90° Triangle Theorem: hypotenuse $= \\text{leg}\\cdot\\sqrt{2}$, so leg $= \\frac{\\text{hyp}}{\\sqrt{2}}$.', `$\\text{leg} = \\frac{${h}}{\\sqrt{2}} = \\frac{${h}\\sqrt{2}}{2} = ${surd(k, 2)}$ (rationalize the denominator).`]; }
      const askHyp = given === 'leg';
      const labels = askHyp ? { a: gLabel, c: 'x' } : { c: gLabel, a: 'x' };
      const ch = choice(`$${ans}$`, wrong.map((w) => `$${w}$`), rng);
      return {
        prompt: `Find $x$ in the 45°-45°-90° triangle. Give the exact value.`,
        figure: rightTriFig(1, 1, labels, { flip: rng.bool(), arcs: { 0: 1, 1: 1 }, angLabels: { 0: '45°' }, names: ['', '', ''] }),
        input: { type: 'choice', options: ch.options }, answer: ch.answer,
        explanation: ex.concat([`So $x = ${ans}$.`]),
        hint: 'Sides of a 45-45-90 triangle are in the ratio 1 : 1 : √2.'
      };
    }
    if (kind === '306090') {
      const s = rng.int(2, 10), given = rng.pick(['short', 'short', 'hyp', 'long']), ask0 = rng.pick(['a', 'b']);
      // short leg s (opposite 30), long leg s√3, hyp 2s
      // figure: a = short leg (BC vertical) opposite A=30°, b = long leg
      const L = { a: String(s), b: `${s}√3`, c: String(2 * s) };
      const tex = { a: String(s), b: surd(s, 3), c: String(2 * s) };
      let gKey = given === 'short' ? 'a' : given === 'hyp' ? 'c' : 'b';
      let askKey = gKey === 'a' ? rng.pick(['b', 'c']) : gKey === 'c' ? ask0 : rng.pick(['a', 'c']);
      // if given long leg as integer (s√3 integer impossible) use L[b] radical form; also variant where long leg is integer: long=3m → short= m√3
      let ans = tex[askKey], wrong;
      const labels = {}; labels[gKey] = L[gKey]; labels[askKey] = 'x';
      let ex;
      const intLong = given === 'long' && rng.bool(0.5);
      if (intLong) {
        const m = rng.int(1, 4) * 3; // long leg integer m → short = m/√3 = m√3/3
        labels.b = String(m); labels.a = askKey === 'a' ? 'x' : undefined; labels.c = askKey === 'c' ? 'x' : undefined;
        ans = askKey === 'a' ? surdFrac(m, 3, 3) : surdFrac(2 * m, 3, 3);
        wrong = askKey === 'a' ? [surd(m, 3), String(m / 3 * 2), `\\frac{${m}}{2}`, surd(m, 2)] : [surd(2 * m, 3), surdFrac(m, 3, 3), String(2 * m), surd(m, 2)];
        ex = ['30°-60°-90° Triangle Theorem: long leg $=$ short leg $\\cdot\\sqrt{3}$ and hypotenuse $= 2\\cdot$ short leg.', `Short leg $= \\frac{${m}}{\\sqrt{3}} = \\frac{${m}\\sqrt{3}}{3} = ${surdFrac(m, 3, 3)}$.`].concat(askKey === 'c' ? [`Hypotenuse $= 2 \\cdot ${surdFrac(m, 3, 3)} = ${ans}$.`] : []);
      } else {
        const pool = [tex.a, tex.b, tex.c, surd(s, 2), surd(2 * s, 3), surdFrac(s, 3, 3), String(3 * s), surd(2 * s, 2)].filter((w) => w !== ans);
        wrong = pool;
        const sh = gKey === 'a' ? `short leg $= ${s}$` : gKey === 'c' ? `short leg $= \\frac{${2 * s}}{2} = ${s}$` : `short leg $= \\frac{${s}\\sqrt{3}}{\\sqrt{3}} = ${s}$`;
        ex = ['30°-60°-90° Triangle Theorem: sides are in the ratio short : long : hyp $= 1 : \\sqrt{3} : 2$.', `The side opposite $30^\\circ$ is the short leg: ${sh}.`,
          askKey === 'a' ? `So $x = ${s}$.` : askKey === 'b' ? `Long leg $= ${s}\\sqrt{3}$.` : `Hypotenuse $= 2 \\cdot ${s} = ${2 * s}$.`];
      }
      const ch = choice(`$${ans}$`, wrong.map((w) => `$${w}$`), rng);
      return {
        prompt: 'Find $x$ in the 30°-60°-90° triangle. Give the exact value.',
        figure: rightTriFig(1, Math.sqrt(3), labels, { flip: rng.bool(), arcs: { 0: 1, 1: 2 }, angLabels: { 0: '30°', 1: '60°' }, names: ['', '', ''] }),
        input: { type: 'choice', options: ch.options }, answer: ch.answer,
        explanation: ex,
        hint: 'The short leg is opposite the 30° angle; hypotenuse = 2 × short leg.'
      };
    }
    // trig ratios
    const t = rng.pick(TRIPLES.slice(0, 6).concat([[3, 4, 5], [5, 12, 13]]));
    const [a, b, c] = rng.bool() ? t : [t[1], t[0], t[2]];
    const names = rng.pick([['A', 'B', 'C'], ['P', 'Q', 'R'], ['D', 'E', 'F'], ['X', 'Y', 'Z']]);
    // vertex 0 acute (angle A), opposite side a = BC, adjacent b = AC, hyp c
    const atB = rng.bool(0.35); // ask about the other acute angle
    const V = atB ? names[1] : names[0];
    const opp = atB ? b : a, adj = atB ? a : b;
    const fn = rng.pick(['sin', 'cos', 'tan']);
    const val = fn === 'sin' ? [opp, c] : fn === 'cos' ? [adj, c] : [opp, adj];
    const fr = (p) => `\\frac{${p[0]}}{${p[1]}}`;
    const cands = [[opp, c], [adj, c], [opp, adj], [adj, opp], [c, opp], [c, adj]];
    const ch = choice(`$${fr(val)}$`, cands.filter((p) => !(p[0] === val[0] && p[1] === val[1])).map((p) => `$${fr(p)}$`), rng);
    const word = fn === 'sin' ? 'opposite over hypotenuse' : fn === 'cos' ? 'adjacent over hypotenuse' : 'opposite over adjacent';
    return {
      prompt: `In right $\\triangle ${names.join('')}$, what is $\\${fn} ${V}$?`,
      figure: rightTriFig(a, b, { a: String(a), b: String(b), c: String(c) }, { names, flip: rng.bool() }),
      input: { type: 'choice', options: ch.options }, answer: ch.answer,
      explanation: [`SOH-CAH-TOA: $\\${fn}$ is ${word}.`, `From $\\angle ${V}$: opposite $= ${opp}$, adjacent $= ${adj}$, hypotenuse $= ${c}$.`, `$\\${fn} ${V} = ${fr(val)}$`],
      hint: 'Stand at the angle: the opposite side does not touch it; the hypotenuse is across from the right angle.'
    };
  }

  const skillRight = {
    id: 'geo-right-tri', title: 'Pythagorean theorem & special right triangles', strand: 'Right Triangles', ccss: 'G.SRT.C.8, 8.G.B.7',
    blurb: 'Find missing sides, classify triangles, use 45-45-90 and 30-60-90 shortcuts, and start SOH-CAH-TOA.',
    lab: 'geo-canvas',
    generate(rng, level) { return level === 1 ? rtL1(rng) : level === 2 ? rtL2(rng) : rtL3(rng); }
  };

  // =====================================================================
  // Skill 4: Transformations
  // =====================================================================
  const TF = {
    tr: (a, b) => ({ f: (p) => [p[0] + a, p[1] + b], rule: `(x, y) \\to (${lin(1, a).replace('x', 'x')}, ${lin(1, b).replace('x', 'y')})`, name: `a translation ${Math.abs(a)} unit${Math.abs(a) === 1 ? '' : 's'} ${a >= 0 ? 'right' : 'left'} and ${Math.abs(b)} unit${Math.abs(b) === 1 ? '' : 's'} ${b >= 0 ? 'up' : 'down'}`, why: 'A translation slides every point the same distance in the same direction.' }),
    rx: () => ({ f: (p) => [p[0], -p[1]], rule: '(x, y) \\to (x, -y)', name: 'a reflection over the $x$-axis', why: 'Reflecting over the $x$-axis keeps $x$ and changes the sign of $y$.' }),
    ry: () => ({ f: (p) => [-p[0], p[1]], rule: '(x, y) \\to (-x, y)', name: 'a reflection over the $y$-axis', why: 'Reflecting over the $y$-axis changes the sign of $x$ and keeps $y$.' }),
    ryx: () => ({ f: (p) => [p[1], p[0]], rule: '(x, y) \\to (y, x)', name: 'a reflection over the line $y = x$', why: 'Reflecting over $y = x$ swaps the coordinates.' }),
    rnyx: () => ({ f: (p) => [-p[1], -p[0]], rule: '(x, y) \\to (-y, -x)', name: 'a reflection over the line $y = -x$', why: 'Reflecting over $y = -x$ swaps the coordinates and changes both signs.' }),
    r90: () => ({ f: (p) => [-p[1], p[0]], rule: '(x, y) \\to (-y, x)', name: 'a rotation of $90^\\circ$ counterclockwise about the origin', why: 'A $90^\\circ$ counterclockwise rotation about the origin maps $(x, y)$ to $(-y, x)$.' }),
    r180: () => ({ f: (p) => [-p[0], -p[1]], rule: '(x, y) \\to (-x, -y)', name: 'a rotation of $180^\\circ$ about the origin', why: 'A $180^\\circ$ rotation about the origin changes the sign of both coordinates.' }),
    r270: () => ({ f: (p) => [p[1], -p[0]], rule: '(x, y) \\to (y, -x)', name: 'a rotation of $270^\\circ$ counterclockwise about the origin', why: 'A $270^\\circ$ counterclockwise (= $90^\\circ$ clockwise) rotation maps $(x, y)$ to $(y, -x)$.' }),
    dil: (k) => ({ f: (p) => [p[0] * k, p[1] * k], rule: `(x, y) \\to (${k === 0.5 ? '\\tfrac{1}{2}' : k}x, ${k === 0.5 ? '\\tfrac{1}{2}' : k}y)`, name: `a dilation centered at the origin with scale factor $${k === 0.5 ? '\\frac{1}{2}' : k}$`, why: `A dilation about the origin with scale factor $k$ multiplies both coordinates by $k$.` })
  };
  const pTex = (p) => `(${p[0]}, ${p[1]})`;
  const nm = (n, primes) => n + "'".repeat(primes || 0);
  const nmTex = (n, primes) => n + (primes ? '^{' + '\\prime'.repeat(primes) + '}' : '');
  const BOUND = { xmin: -10, xmax: 10, ymin: -10, ymax: 10 };
  const inBox = (p, r) => Math.abs(p[0]) <= (r || 9) && Math.abs(p[1]) <= (r || 9);
  function pointTask(rng, P, T, label, opts) {
    opts = opts || {};
    const Q = T.f(P);
    const name = opts.name || rng.pick(['P', 'A', 'B', 'K', 'M', 'R']);
    const span = Math.max(6, Math.abs(P[0]), Math.abs(P[1]), Math.abs(Q[0]), Math.abs(Q[1])) + 1;
    const r = Math.min(10, Math.max(span, 6));
    const steps = opts.steps || [T.why, `Rule: $${T.rule}$.`, `$${name}${pTex(P)} \\to ${nmTex(name, 1)}${pTex(Q)}$.`];
    return {
      prompt: opts.prompt || `Plot the image of $${name}${pTex(P)}$ after ${T.name}.`,
      input: { type: 'point', xmin: -r, xmax: r, ymin: -r, ymax: r }, answer: { x: Q[0], y: Q[1] },
      explanation: steps,
      hint: opts.hint
    };
  }
  const rp = (rng, m) => [rng.nonzero(-m, m), rng.nonzero(-m, m)];
  function trL1(rng) {
    const kind = rng.pick(['tr', 'tr', 'rx', 'ry', 'coord', 'figpt']);
    if (kind === 'tr') {
      let P, a, b;
      do { P = rp(rng, 7); a = rng.nonzero(-6, 6); b = rng.nonzero(-6, 6); } while (!inBox([P[0] + a, P[1] + b], 9));
      return pointTask(rng, P, TF.tr(a, b), null, { hint: 'Move right/left first (x), then up/down (y).' });
    }
    if (kind === 'rx' || kind === 'ry') {
      const P = rp(rng, 8);
      return pointTask(rng, P, TF[kind](), null, { hint: kind === 'rx' ? 'Same distance from the x-axis, other side.' : 'Same distance from the y-axis, other side.' });
    }
    if (kind === 'coord') {
      const P = rp(rng, 9), which = rng.pick(['rx', 'ry']);
      const T = TF[which](), Q = T.f(P), name = rng.pick(['A', 'C', 'D', 'G']);
      const wrong = [[-P[0], -P[1]], [P[1], P[0]], which === 'rx' ? [-P[0], P[1]] : [P[0], -P[1]], [-P[1], -P[0]]];
      const ch = choice(`$${pTex(Q)}$`, wrong.map((w) => `$${pTex(w)}$`), rng);
      return {
        prompt: `What are the coordinates of $${nmTex(name, 1)}$, the image of $${name}${pTex(P)}$ after ${T.name}?`,
        input: { type: 'choice', options: ch.options }, answer: ch.answer,
        explanation: [T.why, `Rule: $${T.rule}$.`, `So $${nmTex(name, 1)} = ${pTex(Q)}$.`]
      };
    }
    // figure: point shown on grid with a horizontal/vertical slide described by arrow; ask image
    let P, a, b;
    do { P = rp(rng, 6); a = rng.int(-5, 5); b = rng.int(-5, 5); } while ((a === 0 && b === 0) || !inBox([P[0] + a, P[1] + b], 8) || (a !== 0 && b !== 0 && rng.bool(0.5)));
    const T = TF.tr(a, b);
    return pointTask(rng, P, T, null, { prompt: `Point $P${pTex(P)}$ is translated using the rule $${T.rule}$. Plot $P'$.`, name: 'P' });
  }
  function trL2(rng) {
    const kind = rng.pick(['r90', 'r180', 'r270', 'ryx', 'rnyx', 'rule', 'rot-choice']);
    if (['r90', 'r180', 'r270', 'ryx', 'rnyx'].includes(kind)) {
      let P; do { P = rp(rng, 8); } while (Math.abs(P[0]) === Math.abs(P[1]));
      return pointTask(rng, P, TF[kind](), null, { hint: kind.startsWith('r') && kind !== 'ryx' && kind !== 'rnyx' ? 'Use the rotation rule, or turn the paper.' : 'Swap the coordinates (and change signs for y = −x).' });
    }
    if (kind === 'rule') {
      // write the translation rule: given A and A', find (a, b) via multi
      let P, a, b; do { P = rp(rng, 7); a = rng.nonzero(-7, 7); b = rng.nonzero(-7, 7); } while (!inBox([P[0] + a, P[1] + b], 9));
      const Q = [P[0] + a, P[1] + b];
      return {
        prompt: `A translation maps $A${pTex(P)}$ to $A'${pTex(Q)}$. Write the rule $(x, y) \\to (x + a, y + b)$: find $a$ and $b$.`,
        figure: gridFig([{ p: P, label: `A${ptTxt(P)}` }, { p: Q, label: `A′${ptTxt(Q)}`, c: ACC2 }], { segs: [[0, 1, MUTED, '5 4']], minSpan: 8 }),
        input: { type: 'multi', fields: [{ label: 'a =' }, { label: 'b =' }] }, answer: [a, b],
        explanation: ['A translation adds the same amounts to every $x$ and every $y$.', `$a = ${Q[0]} - ${pn(P[0])} = ${a}$, $b = ${Q[1]} - ${pn(P[1])} = ${b}$.`, `Rule: $${TF.tr(a, b).rule}$.`]
      };
    }
    // which transformation maps P to Q (choice)
    let P; do { P = rp(rng, 7); } while (Math.abs(P[0]) === Math.abs(P[1]));
    const keys = ['r90', 'r180', 'r270', 'rx', 'ry', 'ryx', 'rnyx'];
    const k = rng.pick(keys), Q = TF[k]().f(P);
    const others = keys.filter((x) => x !== k && !(TF[x]().f(P)[0] === Q[0] && TF[x]().f(P)[1] === Q[1]));
    const ch = choice(TF[k]().name.replace(/^a /, 'A '), rng.sample(others, 3).map((x) => TF[x]().name.replace(/^a /, 'A ')), rng);
    return {
      prompt: `Which transformation maps $B${pTex(P)}$ to $B'${pTex(Q)}$?`,
      figure: gridFig([{ p: P, label: `B${ptTxt(P)}` }, { p: Q, label: `B′${ptTxt(Q)}`, c: ACC2 }], { minSpan: 8 }),
      input: { type: 'choice', options: ch.options }, answer: ch.answer,
      explanation: [`Compare coordinates: $${pTex(P)} \\to ${pTex(Q)}$.`, `That matches the rule $${TF[k]().rule}$.`, TF[k]().why]
    };
  }
  const triArea = (P) => Math.abs((P[1][0] - P[0][0]) * (P[2][1] - P[0][1]) - (P[2][0] - P[0][0]) * (P[1][1] - P[0][1])) / 2;
  function triPts(rng, m) {
    // a non-degenerate scalene-ish small triangle with integer vertices in [-m, m]
    for (let t = 0; t < 100; t++) {
      const P = [rp(rng, m), rp(rng, m), rp(rng, m)];
      const area = Math.abs((P[1][0] - P[0][0]) * (P[2][1] - P[0][1]) - (P[2][0] - P[0][0]) * (P[1][1] - P[0][1])) / 2;
      const d = [dist(P[0], P[1]), dist(P[1], P[2]), dist(P[2], P[0])];
      if (area >= 3 && Math.min(...d) >= 2 && Math.max(...d) <= 2 * m) return P;
    }
    return [[1, 1], [4, 2], [2, 5]];
  }
  function trL3(rng) {
    const kind = rng.pick(['comp', 'comp', 'dil', 'dil', 'which', 'which']);
    if (kind === 'comp') {
      const keys = ['rx', 'ry', 'r90', 'r180', 'r270', 'ryx'];
      let P, T1, T2, a, b, Q, k1, k2, tries = 0;
      do {
        P = rp(rng, 6); k1 = rng.pick(keys.concat(['tr'])); k2 = rng.pick(keys.concat(['tr']));
        if (k1 === 'tr' && k2 === 'tr') k2 = 'rx';
        a = rng.nonzero(-4, 4); b = rng.nonzero(-4, 4);
        T1 = k1 === 'tr' ? TF.tr(a, b) : TF[k1](); T2 = k2 === 'tr' ? TF.tr(a, b) : TF[k2]();
        Q = T2.f(T1.f(P)); tries++;
      } while (!inBox(Q, 9) || !inBox(T1.f(P), 9) || k1 === k2);
      const M1 = T1.f(P);
      return {
        prompt: `Point $C${pTex(P)}$ is first transformed by ${T1.name}, and then the image is transformed by ${T2.name}. Plot the final image $C''$.`,
        input: { type: 'point', xmin: -10, xmax: 10, ymin: -10, ymax: 10 }, answer: { x: Q[0], y: Q[1] },
        explanation: ['A composition applies the transformations in order: the second acts on the image of the first.', `First: $${T1.rule}$, so $C${pTex(P)} \\to C'${pTex(M1)}$.`, `Second: $${T2.rule}$, so $C'${pTex(M1)} \\to C''${pTex(Q)}$.`],
        hint: 'Do the first transformation completely, then apply the second to that result.'
      };
    }
    if (kind === 'dil') {
      const k = rng.pick([2, 2, 3, 0.5, 0.5]);
      let P;
      if (k === 0.5) { do { P = [2 * rng.nonzero(-9, 9), 2 * rng.nonzero(-9, 9)]; } while (!inBox(P, 18) || (Math.abs(P[0]) > 18)); P = [P[0] / 1, P[1] / 1]; P = P.map((v) => Math.max(-18, Math.min(18, v))); if (!inBox(mul(P, 0.5), 9)) P = [8, -6]; }
      else { const m = k === 2 ? 4 : 3; P = rp(rng, m); }
      const T = TF.dil(k), Q = T.f(P);
      if (rng.bool(0.35)) {
        // triangle version, ask about one vertex, figure shows pre-image
        const tri0 = k === 0.5 ? [P, [P[0] + 2 * rng.pick([-2, 2]), P[1]], [P[0], P[1] + 2 * rng.pick([-2, 2])]] : [P, [P[0] + rng.pick([-2, 2]), P[1]], [P[0], P[1] + rng.pick([-1, 1, 2])]];
        const lim = k === 0.5 ? 10 : 9 / k;
        if (tri0.every((p) => inBox(p, lim))) {
          const names = ['A', 'B', 'C'];
          const qi = rng.int(0, 2), Qv = T.f(tri0[qi]);
          return {
            prompt: `$\\triangle ABC$ is dilated by scale factor $${k === 0.5 ? '\\frac{1}{2}' : k}$ centered at the origin. Plot $${nmTex(names[qi], 1)}$.`,
            figure: gridFig(tri0.map((p, i) => ({ p, label: names[i] })), { polys: [{ idx: [0, 1, 2] }], bounds: boundsFor(tri0, 1, 8) }),
            input: { type: 'point', xmin: -10, xmax: 10, ymin: -10, ymax: 10 }, answer: { x: Qv[0], y: Qv[1] },
            explanation: [T.why, `Read $${names[qi]}${pTex(tri0[qi])}$ from the graph.`, `$${names[qi]}' = (${k === 0.5 ? '\\tfrac{1}{2}' : k}\\cdot ${tri0[qi][0]}, ${k === 0.5 ? '\\tfrac{1}{2}' : k}\\cdot ${tri0[qi][1]}) = ${pTex(Qv)}$.`]
          };
        }
      }
      return {
        prompt: `Plot the image of $D${pTex(P)}$ after ${T.name}.`,
        input: { type: 'point', xmin: -10, xmax: 10, ymin: -10, ymax: 10 }, answer: { x: Q[0], y: Q[1] },
        explanation: [T.why, `Rule: $${T.rule}$.`, `$D${pTex(P)} \\to D'${pTex(Q)}$.`, k < 1 ? 'Scale factor less than 1: the image is a reduction, closer to the origin.' : 'Scale factor greater than 1: the image is an enlargement, farther from the origin.']
      };
    }
    // which rule maps ABC → A'B'C' (figure, choice)
    const keys = ['rx', 'ry', 'r90', 'r180', 'r270', 'ryx', 'tr', 'dil'];
    let P, T, k, Qs, tries = 0;
    do {
      k = rng.pick(keys);
      const sx = rng.pick([1, -1]), sy = rng.pick([1, -1]), m = k === 'dil' ? 4 : 6;
      P = triPts(rng, 3).map((p) => [sx * (Math.abs(p[0]) + (m === 4 ? 0 : 1)), sy * (Math.abs(p[1]) + (m === 4 ? 0 : 1))]);
      T = k === 'tr' ? TF.tr(rng.nonzero(-7, 7), rng.nonzero(-7, 7)) : k === 'dil' ? TF.dil(2) : TF[k]();
      Qs = P.map(T.f); tries++;
    } while ((!Qs.every((q) => inBox(q, 9)) || !P.every((p) => inBox(p, 9)) || dist(centroid(P), centroid(Qs)) < 4.5 || triArea(P) < 2.5 ||
      P.some((p) => Qs.some((q) => q[0] === p[0] && q[1] === p[1]))) && tries < 300);
    const nm3 = rng.pick([['A', 'B', 'C'], ['D', 'E', 'F'], ['J', 'K', 'L'], ['P', 'Q', 'R']]);
    const alt = keys.filter((x) => x !== k).map((x) => (x === 'tr' ? TF.tr(rng.nonzero(-5, 5), rng.nonzero(-5, 5)) : x === 'dil' ? TF.dil(2) : TF[x]()));
    const ch = choice(`$${T.rule}$`, rng.shuffle(alt).filter((t2) => t2.rule !== T.rule).map((t2) => `$${t2.rule}$`), rng);
    const pts = P.map((p, i) => ({ p, label: nm3[i] })).concat(Qs.map((p, i) => ({ p, label: nm3[i] + '′', c: ACC2, lc: ACC2 })));
    return {
      prompt: `Which rule maps $\\triangle ${nm3.join('')}$ to $\\triangle ${nm3.map((n) => nmTex(n, 1)).join('')}$?`,
      figure: gridFig(pts, { polys: [{ idx: [0, 1, 2] }, { idx: [3, 4, 5], c: ACC2, dash: '5 3' }], bounds: boundsFor(P.concat(Qs), 1, 8), labelSize: 12 }),
      input: { type: 'choice', options: ch.options }, answer: ch.answer,
      explanation: [`Read a vertex and its image: $${nm3[0]}${pTex(P[0])} \\to ${nmTex(nm3[0], 1)}${pTex(Qs[0])}$.`, `Check another: $${nm3[1]}${pTex(P[1])} \\to ${nmTex(nm3[1], 1)}${pTex(Qs[1])}$.`, `Both fit $${T.rule}$ — ${T.name}.`]
    };
  }
  const skillTransform = {
    id: 'geo-transform', title: 'Transformations on the coordinate plane', strand: 'Transformations', ccss: 'G.CO.A.2, G.CO.A.3, G.CO.A.4, G.CO.A.5',
    blurb: 'Translate, reflect, rotate and dilate points and triangles, and write the rules.',
    lab: 'geo-transform-lab',
    generate(rng, level) { return level === 1 ? trL1(rng) : level === 2 ? trL2(rng) : trL3(rng); }
  };

  // =====================================================================
  // Skill 5: Coordinate geometry
  // =====================================================================
  const slopeFr = (dy, dx) => U.simplify(dy, dx);
  const frTex = (n, d) => U.frac(U.simplify(n, d).n, U.simplify(n, d).d);
  function coL1(rng) {
    const kind = rng.pick(['hvdist', 'slope', 'slope', 'slope0', 'mid', 'mid']);
    if (kind === 'hvdist') {
      const horiz = rng.bool(), c = rng.int(-6, 6);
      let a, b; do { a = rng.int(-8, 8); b = rng.int(-8, 8); } while (Math.abs(a - b) < 2);
      const P = horiz ? [a, c] : [c, a], Q = horiz ? [b, c] : [c, b];
      return {
        prompt: `Find the distance between $A${pTex(P)}$ and $B${pTex(Q)}$.`,
        figure: gridFig([{ p: P, label: 'A' }, { p: Q, label: 'B' }], { segs: [[0, 1]], minSpan: 8 }),
        input: { type: 'number', unit: 'units' }, answer: Math.abs(a - b),
        explanation: [`The points have the same ${horiz ? '$y$' : '$x$'}-coordinate, so they lie on a ${horiz ? 'horizontal' : 'vertical'} line.`, `Distance = absolute value of the difference of the ${horiz ? '$x$' : '$y$'}-coordinates: $|${b} - ${pn(a)}| = ${Math.abs(a - b)}$.`]
      };
    }
    if (kind === 'slope' || kind === 'slope0') {
      let P, Q;
      do { P = [rng.int(-8, 8), rng.int(-8, 8)]; Q = [rng.int(-8, 8), kind === 'slope0' ? P[1] : rng.int(-8, 8)]; } while (Q[0] === P[0] || (kind === 'slope' && Q[1] === P[1]) || dist(P, Q) < 3);
      const dy = Q[1] - P[1], dx = Q[0] - P[0], s = slopeFr(dy, dx);
      const showFig = rng.bool(0.5);
      return {
        prompt: `Find the slope of the line through $${pTex(P)}$ and $${pTex(Q)}$. Write it in simplest form.`,
        figure: showFig ? gridFig([{ p: P, label: ptTxt(P) }, { p: Q, label: ptTxt(Q) }], { segs: [[0, 1]], minSpan: 8 }) : undefined,
        input: { type: 'fraction', requireSimplest: true }, answer: { n: s.n, d: s.d },
        explanation: ['Slope formula: $m = \\dfrac{y_2 - y_1}{x_2 - x_1}$ (rise over run).', `$m = \\dfrac{${Q[1]} - ${pn(P[1])}}{${Q[0]} - ${pn(P[0])}} = \\dfrac{${dy}}{${dx}}$`, s.n === 0 ? 'The rise is 0, so the line is horizontal and $m = 0$.' : `Simplify: $m = ${U.frac(s.n, s.d)}$.`],
        hint: kind === 'slope0' ? 'Look at the y-coordinates.' : 'Subtract in the same order on top and bottom.'
      };
    }
    let P, Q;
    do { P = [rng.int(-9, 9), rng.int(-9, 9)]; Q = [rng.int(-9, 9), rng.int(-9, 9)]; } while ((P[0] + Q[0]) % 2 !== 0 || (P[1] + Q[1]) % 2 !== 0 || dist(P, Q) < 4);
    const M0 = [(P[0] + Q[0]) / 2, (P[1] + Q[1]) / 2];
    return {
      prompt: `Find the midpoint $M$ of the segment with endpoints $${pTex(P)}$ and $${pTex(Q)}$.`,
      input: { type: 'multi', fields: [{ label: 'x =' }, { label: 'y =' }] }, answer: M0,
      explanation: ['Midpoint formula: $M = \\left(\\dfrac{x_1 + x_2}{2}, \\dfrac{y_1 + y_2}{2}\\right)$ — average the coordinates.', `$x = \\dfrac{${P[0]} + ${pn(Q[0])}}{2} = ${M0[0]}$, $y = \\dfrac{${P[1]} + ${pn(Q[1])}}{2} = ${M0[1]}$.`, `$M = ${pTex(M0)}$`]
    };
  }
  function coL2(rng) {
    const kind = rng.pick(['dist', 'dist', 'parperp', 'parperp', 'endpoint']);
    if (kind === 'dist') {
      let P, Q, dx, dy;
      const exact = rng.bool(0.45);
      do {
        P = [rng.int(-8, 8), rng.int(-8, 8)];
        if (exact) { const t = rng.pick([[3, 4], [6, 8], [5, 12], [4, 3], [8, 6], [12, 5]]); dx = t[0] * (rng.bool() ? 1 : -1); dy = t[1] * (rng.bool() ? 1 : -1); }
        else { dx = rng.nonzero(-9, 9); dy = rng.nonzero(-9, 9); }
        Q = [P[0] + dx, P[1] + dy];
      } while (!inBox(Q, 10) || Math.hypot(dx, dy) < 3 || (!exact && Number.isInteger(Math.hypot(dx, dy))));
      const d = Math.hypot(dx, dy), s2 = dx * dx + dy * dy;
      return {
        prompt: `Find the distance between $${pTex(P)}$ and $${pTex(Q)}$.${exact ? '' : ' Round to the nearest tenth.'}`,
        figure: gridFig([{ p: P, label: ptTxt(P) }, { p: Q, label: ptTxt(Q) }], { segs: [[0, 1]], minSpan: 8, extra: (G) => seg(G.P(P), G.P([Q[0], P[1]]), { c: MUTED, dash: '4 3', w: 1.5 }) + seg(G.P([Q[0], P[1]]), G.P(Q), { c: MUTED, dash: '4 3', w: 1.5 }) }),
        input: { type: 'number', unit: 'units' }, answer: exact ? d : U.round(d, 1), check: exact ? undefined : tol(d),
        explanation: ['Distance formula (from the Pythagorean Theorem): $d = \\sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}$.', `$d = \\sqrt{(${dx})^2 + (${dy})^2} = \\sqrt{${dx * dx} + ${dy * dy}} = \\sqrt{${s2}}$`, exact ? `$d = ${d}$` : `$d \\approx ${U.round(d, 1)}$`]
      };
    }
    if (kind === 'parperp') {
      let n, d; do { n = rng.nonzero(-6, 6); d = rng.int(1, 6); } while (U.gcd(n, d) !== 1);
      const isPar = rng.bool();
      const form = rng.pick(['eq', 'pts']);
      let given;
      if (form === 'eq') { const b = rng.int(-8, 8); given = `the line $y = ${d === 1 ? (n === 1 ? '' : n === -1 ? '-' : n) : U.frac(n, d)}x${b === 0 ? '' : b > 0 ? ' + ' + b : ' - ' + (-b)}$`; }
      else { const P = [rng.int(-6, 4), rng.int(-6, 4)]; const Q = [P[0] + d * (rng.bool() ? 1 : 2), 0]; Q[1] = P[1] + n * (Q[0] - P[0]) / d; given = `the line through $${pTex(P)}$ and $${pTex(Q)}$`; }
      const ans = isPar ? U.simplify(n, d) : U.simplify(-d, n);
      return {
        prompt: `What is the slope of a line ${isPar ? 'parallel' : 'perpendicular'} to ${given}?`,
        input: { type: 'fraction', requireSimplest: true }, answer: { n: ans.n, d: ans.d },
        explanation: [form === 'pts' ? `Slope of the given line: $m = ${U.frac(n, d)}$ (rise over run).` : `In $y = mx + b$, the slope is $m = ${U.frac(n, d)}$.`,
          isPar ? 'Parallel lines have <b>equal</b> slopes.' : 'Perpendicular lines have slopes that are <b>opposite reciprocals</b> (their product is $-1$).',
          `Answer: $${U.frac(ans.n, ans.d)}$.`]
      };
    }
    let A, Mp; do { A = [rng.int(-8, 8), rng.int(-8, 8)]; Mp = [rng.int(-5, 5), rng.int(-5, 5)]; } while (!inBox([2 * Mp[0] - A[0], 2 * Mp[1] - A[1]], 10) || dist(A, Mp) < 2);
    const B = [2 * Mp[0] - A[0], 2 * Mp[1] - A[1]];
    if (rng.bool(0.5)) {
      return {
        prompt: `$M${pTex(Mp)}$ is the midpoint of $\\overline{AB}$, and $A${pTex(A)}$. Plot endpoint $B$.`,
        input: { type: 'point', xmin: -10, xmax: 10, ymin: -10, ymax: 10 }, answer: { x: B[0], y: B[1] },
        explanation: ['The midpoint is halfway, so the step from $A$ to $M$ repeats from $M$ to $B$.', `Step: $(${Mp[0] - A[0]}, ${Mp[1] - A[1]})$.`, `$B = (${Mp[0]} + ${pn(Mp[0] - A[0])}, ${Mp[1]} + ${pn(Mp[1] - A[1])}) = ${pTex(B)}$.`]
      };
    }
    return {
      prompt: `$M${pTex(Mp)}$ is the midpoint of $\\overline{AB}$, and $A${pTex(A)}$. Find the coordinates of $B$.`,
      input: { type: 'multi', fields: [{ label: 'x =' }, { label: 'y =' }] }, answer: B,
      explanation: ['Midpoint formula: $\\frac{x_A + x_B}{2} = x_M$, so $x_B = 2x_M - x_A$ (same for $y$).', `$x_B = 2${pn(Mp[0]).startsWith('(') ? pn(Mp[0]) : '(' + Mp[0] + ')'} - ${pn(A[0])} = ${B[0]}$, $y_B = 2${pn(Mp[1]).startsWith('(') ? pn(Mp[1]) : '(' + Mp[1] + ')'} - ${pn(A[1])} = ${B[1]}$.`, `$B = ${pTex(B)}$`]
    };
  }
  function quadOf(rng, type) {
    // build integer quadrilateral of a given type
    for (let t = 0; t < 200; t++) {
      const O = [rng.int(-6, 2), rng.int(-6, 1)];
      let u, v;
      if (type === 'square') { const a = rng.int(1, 3), b = rng.int(0, 3); if (a === 0 && b === 0) continue; u = [a + (b === 0 ? 1 : 0), b]; v = [-u[1], u[0]]; }
      else if (type === 'rectangle') { const a = rng.int(1, 3), b = rng.int(0, 2), k = rng.int(2, 3); u = [a, b]; v = [-b * k, a * k]; if (b === 0) v = [0, rng.int(2, 5)], u = [rng.int(3, 7), 0]; if (len(u) === len(v)) continue; }
      else if (type === 'rhombus') { const p = rng.pick([[3, 4], [4, 3], [5, 0], [0, 5], [-3, 4], [-4, 3]]); const q = rng.pick([[5, 0], [3, 4], [4, 3], [0, 5], [4, -3], [3, -4]]); u = p; v = q; const c = (u[0] * v[0] + u[1] * v[1]); if (c === 0 || Math.abs(c) === 25 || (u[0] === v[0] && u[1] === v[1])) continue; if (u[0] * v[1] - u[1] * v[0] <= 0) continue; }
      else if (type === 'parallelogram') { u = [rng.int(3, 6), rng.int(-1, 1)]; v = [rng.int(1, 3), rng.int(3, 5)]; if (dotp(u, v) === 0 || len(u) === len(v)) continue; }
      else { // trapezoid
        const a = rng.int(5, 8), b = rng.int(2, 4), h = rng.int(3, 5), s = rng.int(0, a - b);
        const P = [O, [O[0] + a, O[1]], [O[0] + s + b, O[1] + h], [O[0] + s, O[1] + h]];
        if (s === (a - b) / 2) continue; // avoid isosceles ambiguity? isosceles is still a trapezoid — fine but keep variety
        if (P.every((p) => inBox(p, 9))) return P;
        continue;
      }
      const P = [O, add(O, u), add(add(O, u), v), add(O, v)];
      if (P.every((p) => inBox(p, 9))) return P;
    }
    return type === 'square' ? [[0, 0], [3, 0], [3, 3], [0, 3]] : [[0, 0], [5, 0], [6, 3], [1, 3]];
  }
  function coL3(rng) {
    const kind = rng.pick(['quad', 'quad', 'perim', 'line', 'line']);
    if (kind === 'quad') {
      const types = ['parallelogram', 'rectangle', 'rhombus', 'square', 'trapezoid'];
      const type = rng.pick(types), Q = quadOf(rng, type);
      const nmq = rng.pick([['A', 'B', 'C', 'D'], ['P', 'Q', 'R', 'S'], ['J', 'K', 'L', 'M'], ['W', 'X', 'Y', 'Z']]);
      const sl = (p, q) => (q[0] === p[0] ? '\\text{vertical}' : frTex(q[1] - p[1], q[0] - p[0]));
      const ds = (p, q) => { const s2 = (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2; const r = Math.sqrt(s2); return Number.isInteger(r) ? String(r) : `\\sqrt{${s2}}`; };
      const sides = [0, 1, 2, 3].map((i) => [Q[i], Q[(i + 1) % 4]]);
      const slopes = sides.map((s) => sl(s[0], s[1])), lens = sides.map((s) => ds(s[0], s[1]));
      const ex = [`Slopes: ${[0, 1, 2, 3].map((i) => `$${nmq[i] + nmq[(i + 1) % 4]}: ${slopes[i]}$`).join(', ')}.`,
        `Lengths: ${[0, 1, 2, 3].map((i) => `$${nmq[i] + nmq[(i + 1) % 4]} = ${lens[i]}$`).join(', ')}.`];
      if (type === 'trapezoid') ex.push('Exactly one pair of opposite sides is parallel (equal slopes), so it is a <b>trapezoid</b>.');
      else if (type === 'parallelogram') ex.push('Both pairs of opposite sides are parallel, but adjacent sides are not perpendicular and not all sides are equal: a <b>parallelogram</b>.');
      else if (type === 'rectangle') ex.push('Opposite sides are parallel and adjacent slopes are opposite reciprocals (right angles), but the sides are not all equal: a <b>rectangle</b>.');
      else if (type === 'rhombus') ex.push('All four sides are equal, but adjacent sides are not perpendicular: a <b>rhombus</b>.');
      else ex.push('All four sides are equal and adjacent sides are perpendicular: a <b>square</b>.');
      return {
        prompt: `Quadrilateral $${nmq.join('')}$ has vertices $${Q.map((p, i) => nmq[i] + pTex(p)).join('$, $')}$. What is the most specific name for it?`,
        figure: gridFig(Q.map((p, i) => ({ p, label: nmq[i] })), { polys: [{ idx: [0, 1, 2, 3] }], bounds: boundsFor(Q, 1, 8) }),
        input: { type: 'choice', options: ['Parallelogram', 'Rectangle', 'Rhombus', 'Square', 'Trapezoid'] }, answer: types.indexOf(type),
        explanation: ex,
        hint: 'Equal slopes → parallel. Opposite-reciprocal slopes → perpendicular. Then compare side lengths.'
      };
    }
    if (kind === 'perim') {
      // polygon with integer side lengths (horizontal/vertical or 3-4-5 diagonals)
      const shape = rng.pick(['tri', 'quad', 'rect']);
      let P;
      if (shape === 'rect') { const O = [rng.int(-7, 0), rng.int(-7, 0)], w = rng.int(3, 8), h = rng.int(2, 7); P = [O, [O[0] + w, O[1]], [O[0] + w, O[1] + h], [O[0], O[1] + h]]; }
      else if (shape === 'tri') { const O = [rng.int(-7, 0), rng.int(-7, 0)], k = rng.pick([1, 2]), t = rng.pick([[3, 4], [4, 3]]); P = [O, [O[0] + t[0] * k, O[1]], [O[0], O[1] + t[1] * k]]; if (rng.bool()) P = [O, [O[0] + t[0] * k, O[1]], [O[0] + t[0] * k, O[1] + t[1] * k]]; }
      else { const O = [rng.int(-7, -1), rng.int(-7, 0)], t = rng.pick([[3, 4], [4, 3]]), b = rng.int(2, 6); P = [O, [O[0] + t[0] + b, O[1]], [O[0] + t[0] + b, O[1] + t[1]], [O[0] + t[0], O[1] + t[1]]]; }
      const lens = P.map((p, i) => dist(p, P[(i + 1) % P.length]));
      const per = lens.reduce((a, b) => a + b, 0);
      const nmp = ['A', 'B', 'C', 'D'].slice(0, P.length);
      return {
        prompt: `Find the perimeter of polygon $${nmp.join('')}$ with vertices $${P.map((p, i) => nmp[i] + pTex(p)).join('$, $')}$.`,
        figure: gridFig(P.map((p, i) => ({ p, label: nmp[i] })), { polys: [{ idx: P.map((_, i) => i) }], bounds: boundsFor(P, 1, 8) }),
        input: { type: 'number', unit: 'units' }, answer: U.round(per, 4),
        explanation: ['Find each side length: count for horizontal/vertical sides, and use the distance formula for slanted sides.', `Sides: ${lens.map((l, i) => `$${nmp[i] + nmp[(i + 1) % P.length]} = ${U.round(l, 4)}$`).join(', ')}.`, `Perimeter $= ${lens.map((l) => U.round(l, 4)).join(' + ')} = ${U.round(per, 4)}$.`]
      };
    }
    // equation of a line parallel/perpendicular through a point
    let n, d; do { n = rng.nonzero(-5, 5); d = rng.int(1, 4); } while (U.gcd(n, d) !== 1);
    const isPar = rng.bool();
    const b0 = rng.int(-6, 6);
    const m = isPar ? U.simplify(n, d) : U.simplify(-d, n);
    // point with integer coords such that the new intercept is an integer
    let P, b1, g = 0;
    do { const x0 = m.d * rng.int(-3, 3); P = [x0, rng.int(-6, 6)]; b1 = P[1] - m.n * x0 / m.d; g++; } while ((b1 === b0 && isPar) || Math.abs(b1) > 12 || (P[0] === 0 && P[1] === b0));
    const mTex = (s) => (s.d === 1 ? (s.n === 1 ? '' : s.n === -1 ? '-' : String(s.n)) : U.frac(s.n, s.d));
    const eq = (s, b) => `y = ${mTex(s)}x${b === 0 ? '' : b > 0 ? ' + ' + b : ' - ' + (-b)}`;
    const given = eq(U.simplify(n, d), b0);
    const correct = eq(m, b1);
    const recip = U.simplify(d, n), neg = U.simplify(-n, d), other = isPar ? U.simplify(-d, n) : U.simplify(n, d);
    const wrongs = [eq(other, b1), eq(m, b0 === b1 ? b1 + 2 : b0), eq(isPar ? neg : recip, b1), eq(m, -b1 === b1 ? b1 + 3 : -b1), eq(m, P[1])];
    const ch = choice(`$${correct}$`, wrongs.filter((w) => w !== correct).map((w) => `$${w}$`), rng);
    return {
      prompt: `Which is the equation of the line ${isPar ? 'parallel' : 'perpendicular'} to $${given}$ that passes through $${pTex(P)}$?`,
      input: { type: 'choice', options: ch.options }, answer: ch.answer,
      explanation: [
        `The given slope is $${U.frac(n, d)}$. ${isPar ? 'Parallel lines have equal slopes' : 'Perpendicular slopes are opposite reciprocals'}, so $m = ${U.frac(m.n, m.d)}$.`,
        `Point-slope form: $y - ${pn(P[1])} = ${U.frac(m.n, m.d)}(x - ${pn(P[0])})$.`,
        `Solve for $y$: $b = ${P[1]} - \\left(${U.frac(m.n, m.d)}\\right)(${P[0]}) = ${b1}$, so $${correct}$.`
      ]
    };
  }
  const skillCoord = {
    id: 'geo-coord', title: 'Coordinate geometry', strand: 'Coordinate Geometry', ccss: 'G.GPE.B.4, G.GPE.B.5, G.GPE.B.6, G.GPE.B.7',
    blurb: 'Distance, slope and midpoint, parallel and perpendicular lines, and classifying shapes by coordinates.',
    lab: 'geo-canvas',
    generate(rng, level) { return level === 1 ? coL1(rng) : level === 2 ? coL2(rng) : coL3(rng); }
  };

  // =====================================================================
  // Labs (browser only)
  // =====================================================================
  const r1s = (x) => (Math.round(x * 10) / 10).toFixed(1);
  const numS = (x) => { const v = Math.round(x * 100) / 100; return String(v).replace('-', '−'); };
  function mathGrid(b, W, maxU) {
    const G = cgrid(b, { W, maxH: 1000, maxU });
    G.toMath = (p) => [b.xmin + (p.x - (G.W - G.u * (b.xmax - b.xmin)) / 2) / G.u, b.ymax - (p.y - 16) / G.u];
    return G;
  }
  function chipRow(api, items, onPick, cls) {
    const row = api.h('div', { class: 'lab-row', style: { gap: '6px' } });
    const btns = items.map((it) => {
      const b = api.h('button', { class: 'btn-small' + (cls ? ' ' + cls : ''), type: 'button', html: it.label, onclick: () => { onPick(it.value); } });
      b.dataset.v = String(it.value);
      row.appendChild(b);
      return b;
    });
    row.setOn = (v) => btns.forEach((b) => b.classList.toggle('on', b.dataset.v === String(v)));
    return row;
  }
  function makeHandle(api, svgEl, color, label) {
    const g = api.svg('g', { class: 'handle' });
    g.appendChild(api.svg('circle', { r: 16, fill: 'transparent' }));
    g.appendChild(api.svg('circle', { r: 7.5, fill: color, stroke: 'var(--surface)', 'stroke-width': 2.5 }));
    g.setAttribute('role', 'slider');
    g.setAttribute('aria-label', 'Vertex ' + label);
    g.setAttribute('tabindex', '0');
    svgEl.appendChild(g);
    return g;
  }

  // ---------------- Triangle Explorer ----------------
  const labCanvas = {
    id: 'geo-canvas', title: 'Triangle Explorer',
    blurb: 'Drag the corners of a triangle and watch its sides, angles, area and type update live.',
    mount(el, api) {
      const B = { xmin: 0, xmax: 10, ymin: 0, ymax: 8 };
      const G = mathGrid(B, 320, 30);
      const st = { P: [[1, 1], [7, 1], [1, 5]], snap: 1, ext: false, extV: 0 };
      const names = ['A', 'B', 'C'];
      const svgEl = api.svg('svg', { viewBox: `-12 -22 ${G.W + 24} ${F(G.H + 34)}`, role: 'img', 'aria-label': 'Triangle on a coordinate grid', 'font-family': 'inherit', style: 'touch-action:none;user-select:none;background:var(--surface);border-radius:12px;border:1.5px solid var(--line)' });
      const gGrid = api.svg('g'), gFig = api.svg('g');
      svgEl.appendChild(gGrid); svgEl.appendChild(gFig);
      gGrid.innerHTML = G.body;
      const handles = names.map((n, i) => makeHandle(api, svgEl, ['var(--accent)', 'var(--accent)', 'var(--accent)'][i], n));

      const readout = api.h('div', { class: 'lab-readout', style: { fontSize: '1.05rem', flexDirection: 'column', alignItems: 'stretch', gap: '4px' } });
      const typeLine = api.h('div', { style: { fontWeight: 700 } });
      const rowSt = { display: 'flex', flexWrap: 'wrap', columnGap: '14px' };
      const sideLine = api.h('div', { class: 'tnum', style: rowSt }), angLine = api.h('div', { class: 'tnum', style: rowSt }), sumLine = api.h('div', { class: 'tnum', style: { fontSize: '.95rem' } });
      const paLine = api.h('div', { class: 'tnum', style: rowSt }), pyLine = api.h('div', { class: 'tnum', style: { fontSize: '.95rem' } }), extLine = api.h('div', { class: 'tnum', style: { fontSize: '.95rem', color: 'var(--accent-2)' } });
      [typeLine, sideLine, angLine, sumLine, paLine, pyLine, extLine].forEach((x) => readout.appendChild(x));

      const snapRow = chipRow(api, [{ label: 'Snap 1', value: 1 }, { label: 'Snap ½', value: 0.5 }], (v) => { st.snap = v; snapRow.setOn(v); });
      const extBtn = api.h('button', { class: 'btn-small', type: 'button', text: 'Exterior angle', onclick: () => { st.ext = !st.ext; extBtn.classList.toggle('on', st.ext); render(); } });
      const extV = chipRow(api, names.map((n, i) => ({ label: 'at ' + n, value: i })), (v) => { st.extV = v; extV.setOn(v); if (!st.ext) { st.ext = true; extBtn.classList.add('on'); } render(); });
      const resetBtn = api.h('button', { class: 'btn-small', type: 'button', text: 'Reset', onclick: () => { st.P = [[1, 1], [7, 1], [1, 5]]; render(); } });
      snapRow.appendChild(resetBtn);
      const extRow = api.h('div', { class: 'lab-row', style: { gap: '6px' } }, extBtn, extV);
      snapRow.setOn(1); extV.setOn(0);

      const CH = [
        { t: 'Make a right triangle with legs 3 and 4.', ok: (m) => m.right >= 0 && [m.sq[(m.right + 1) % 3], m.sq[(m.right + 2) % 3]].sort((a, b) => a - b).join() === '9,16' },
        { t: 'Make an isosceles triangle.', ok: (m) => m.iso },
        { t: 'Make an obtuse triangle.', ok: (m) => m.kind === 'obtuse' },
        { t: 'Make a triangle with area exactly 6.', ok: (m) => Math.abs(m.area - 6) < 1e-9 },
        { t: 'Make a right isosceles triangle (45°-45°-90°).', ok: (m) => m.right >= 0 && m.iso },
        { t: 'Turn on the exterior angle. Check it equals the sum of the two remote interior angles.', ok: () => st.ext }
      ];
      const tryBox = api.h('div', { class: 'try' });
      tryBox.appendChild(api.h('div', { style: { fontWeight: 700, marginBottom: '4px' }, text: 'Try this' }));
      const chEls = CH.map((c) => { const li = api.h('div', { style: { display: 'flex', gap: '8px', alignItems: 'baseline' } }, api.h('span', { class: 'mk', style: { width: '1.1em', flex: 'none', fontWeight: 700 } }), api.h('span', { text: c.t })); tryBox.appendChild(li); return li; });

      el.appendChild(svgEl); el.appendChild(snapRow); el.appendChild(extRow); el.appendChild(readout); el.appendChild(tryBox);

      function measure(P) {
        const sq = [0, 1, 2].map((i) => { const a = P[(i + 1) % 3], b = P[(i + 2) % 3]; return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2; }); // sq[i] = side opposite vertex i
        const side = sq.map(Math.sqrt);
        const area2 = (P[1][0] - P[0][0]) * (P[2][1] - P[0][1]) - (P[2][0] - P[0][0]) * (P[1][1] - P[0][1]);
        const area = Math.abs(area2) / 2;
        const angs = [0, 1, 2].map((i) => angleAt(P[i], P[(i + 1) % 3], P[(i + 2) % 3]));
        const dots = [0, 1, 2].map((i) => { const u = sub(P[(i + 1) % 3], P[i]), v = sub(P[(i + 2) % 3], P[i]); return dotp(u, v); });
        const right = dots.findIndex((d) => Math.abs(d) < 1e-9);
        const kind = right >= 0 ? 'right' : dots.some((d) => d < 0) ? 'obtuse' : 'acute';
        const eq = (a, b) => Math.abs(a - b) < 1e-9;
        const iso = eq(sq[0], sq[1]) || eq(sq[1], sq[2]) || eq(sq[0], sq[2]);
        const nearEq = Math.max(...side) / Math.min(...side) < 1.04;
        return { sq, side, area, angs, right, kind, iso, nearEq, degenerate: area < 1e-9 };
      }
      function render() {
        LBL = [];
        const P = st.P, S = P.map(G.P), m = measure(P);
        handles.forEach((h, i) => h.setAttribute('transform', `translate(${F(S[i][0])},${F(S[i][1])})`));
        let s = '';
        if (m.degenerate) {
          s += seg(S[0], S[1], { c: 'var(--bad)', w: 2.5 }) + seg(S[1], S[2], { c: 'var(--bad)', w: 2.5 }) + seg(S[0], S[2], { c: 'var(--bad)', w: 2.5 });
          names.forEach((n, i) => { s += placeLabel(S[i], [0, -1], n, { it: true, size: 16, gap: 10 }); });
          gFig.innerHTML = s;
          typeLine.textContent = 'Not a triangle — the points are collinear.';
          typeLine.style.color = 'var(--bad)';
          [sideLine, angLine, sumLine, paLine, pyLine, extLine].forEach((x) => { x.textContent = ''; });
          chEls.forEach((li) => { li.querySelector('.mk').textContent = ''; });
          return;
        }
        typeLine.style.color = '';
        s += poly(S, { c: 'var(--accent)', w: 2.5, fill: 'var(--accent)', fop: 0.08 });
        const ctr = centroid(S);
        // exterior angle
        let ei = -1;
        if (st.ext) {
          ei = st.extV;
          const prev = S[(ei + 2) % 3], nxt = S[(ei + 1) % 3];
          const E = add(S[ei], mul(unit(sub(S[ei], prev)), 46));
          s += seg(S[ei], E, { c: ACC2, w: 2.2, dash: '5 4' });
          s += arcMark(S[ei], E, nxt, { r: 26, c: ACC2, w: 2 });
          s += angLabel(S[ei], E, nxt, r1s(180 - m.angs[ei]) + '°', { r: 26, size: 12, c: ACC2, bold: true });
        }
        for (let i = 0; i < 3; i++) {
          const a = S[(i + 1) % 3], b = S[(i + 2) % 3];
          const remote = ei >= 0 && i !== ei;
          if (i === m.right) s += rightMark(S[i], a, b, { c: GOOD, s: 12 });
          else s += arcMark(S[i], a, b, { r: 17, c: remote ? ACC2 : INK, w: remote ? 2.2 : 1.6 });
          if (i !== ei) s += angLabel(S[i], a, b, r1s(m.angs[i]) + '°', { r: 17, size: 12, c: remote ? ACC2 : INK });
        }
        for (let i = 0; i < 3; i++) { const p = S[(i + 1) % 3], q = S[(i + 2) % 3]; s += sideLabel(p, q, numS(m.side[i]), ctr, { size: 12, c: 'var(--accent)' }); }
        names.forEach((n, i) => { s += vLabel(S, i, n, { gap: 13 }); });
        gFig.innerHTML = s;
        LBL = [];
        const L = (i) => names[(i + 1) % 3] + names[(i + 2) % 3];
        const sideKind = m.nearEq ? (m.iso ? 'isosceles (nearly equilateral)' : 'scalene (nearly equilateral)') : m.iso ? 'isosceles' : 'scalene';
        typeLine.textContent = `${m.kind[0].toUpperCase() + m.kind.slice(1)} ${sideKind} triangle`;
        const fillRow = (row, parts) => { row.textContent = ''; parts.forEach((t) => row.appendChild(api.h('span', { text: t }))); };
        fillRow(sideLine, [0, 1, 2].map((i) => `${L(i)} = ${numS(m.side[i])}`));
        fillRow(angLine, [0, 1, 2].map((i) => `∠${names[i]} = ${r1s(m.angs[i])}°`));
        sumLine.textContent = `∠A + ∠B + ∠C = ${r1s(m.angs[0])} + ${r1s(m.angs[1])} + ${r1s(m.angs[2])} = 180°`;
        fillRow(paLine, [`Perimeter ≈ ${numS(m.side[0] + m.side[1] + m.side[2])}`, `Area = ${numS(m.area)} sq units`]);
        const ci = m.sq.indexOf(Math.max(...m.sq)), ai = (ci + 1) % 3, bi = (ci + 2) % 3;
        const lhs = m.sq[ai] + m.sq[bi], rhs = m.sq[ci];
        const rel = Math.abs(lhs - rhs) < 1e-9 ? '=' : lhs > rhs ? '>' : '<';
        pyLine.textContent = `a² + b² = ${numS(m.sq[ai])} + ${numS(m.sq[bi])} = ${numS(lhs)} ${rel} c² = ${numS(rhs)}  →  ${rel === '=' ? 'right' : rel === '>' ? 'acute' : 'obtuse'}`;
        if (ei >= 0) {
          const r = [(ei + 1) % 3, (ei + 2) % 3];
          extLine.textContent = `Exterior ∠ at ${names[ei]} = ${r1s(180 - m.angs[ei])}° = ∠${names[r[0]]} + ∠${names[r[1]]} = ${r1s(m.angs[r[0]])}° + ${r1s(m.angs[r[1]])}°`;
        } else extLine.textContent = '';
        CH.forEach((c, i) => { const ok = c.ok(m); const mk = chEls[i].querySelector('.mk'); mk.textContent = ok ? '✓' : '○'; mk.style.color = ok ? 'var(--good)' : 'var(--muted)'; });
      }
      handles.forEach((h, i) => {
        api.drag(svgEl, h, (p) => {
          const q = G.toMath(p), sn = st.snap;
          const np = [Math.max(B.xmin, Math.min(B.xmax, Math.round(q[0] / sn) * sn)), Math.max(B.ymin, Math.min(B.ymax, Math.round(q[1] / sn) * sn))];
          if (st.P.some((o, j) => j !== i && o[0] === np[0] && o[1] === np[1])) return;
          if (np[0] !== st.P[i][0] || np[1] !== st.P[i][1]) { st.P[i] = np; render(); }
        });
        h.addEventListener('keydown', (e) => {
          const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key];
          if (!d) return;
          e.preventDefault();
          const np = [Math.max(B.xmin, Math.min(B.xmax, st.P[i][0] + d[0] * st.snap)), Math.max(B.ymin, Math.min(B.ymax, st.P[i][1] + d[1] * st.snap))];
          if (!st.P.some((o, j) => j !== i && o[0] === np[0] && o[1] === np[1])) { st.P[i] = np; render(); }
        });
      });
      render();
    }
  };

  // ---------------- Transformation Studio ----------------
  const labTransform = {
    id: 'geo-transform-lab', title: 'Transformation Studio',
    blurb: 'Translate, reflect, rotate and dilate a triangle on the coordinate plane — then compose two moves.',
    mount(el, api) {
      const B = { xmin: -10, xmax: 10, ymin: -10, ymax: 10 };
      const G = mathGrid(B, 320, 30);
      const st = { P: [[-7, 2], [-2, 3], [-6, 7]], steps: [{ type: 'tr', a: 6, b: -8, ref: 'x', rot: 90, k: 2 }, { type: 'ref', a: 0, b: 0, ref: 'y', rot: 90, k: 2 }], compose: false, edit: 0 };
      const names = ['A', 'B', 'C'];
      const svgEl = api.svg('svg', { viewBox: `-12 -22 ${G.W + 24} ${F(G.H + 34)}`, role: 'img', 'aria-label': 'Triangle and its image on a coordinate grid', 'font-family': 'inherit', style: 'touch-action:none;user-select:none;background:var(--surface);border-radius:12px;border:1.5px solid var(--line)' });
      const gGrid = api.svg('g'), gGuide = api.svg('g'), gFig = api.svg('g');
      svgEl.appendChild(gGrid); svgEl.appendChild(gGuide); svgEl.appendChild(gFig);
      gGrid.innerHTML = G.body;
      const handles = names.map((n) => makeHandle(api, svgEl, 'var(--accent)', n));

      const tf = (s) => {
        switch (s.type) {
          case 'tr': return { f: (p) => [p[0] + s.a, p[1] + s.b], rule: TF.tr(s.a, s.b).rule, label: `translate (${numS(s.a)}, ${numS(s.b)})` };
          case 'ref': return s.ref === 'x' ? Object.assign(TF.rx(), { label: 'reflect over x-axis' }) : s.ref === 'y' ? Object.assign(TF.ry(), { label: 'reflect over y-axis' }) : Object.assign(TF.ryx(), { label: 'reflect over y = x' });
          case 'rot': return Object.assign(TF['r' + s.rot](), { label: `rotate ${s.rot}° about O` });
          default: return Object.assign(TF.dil(s.k), { label: `dilate ×${s.k === 0.5 ? '½' : s.k}` });
        }
      };

      // controls
      const stepTabs = chipRow(api, [{ label: 'Step 1', value: 0 }, { label: 'Step 2', value: 1 }], (v) => { st.edit = v; sync(); });
      const composeBtn = api.h('button', { class: 'btn-small', type: 'button', text: 'Compose', onclick: () => { st.compose = !st.compose; if (!st.compose) st.edit = 0; else st.edit = 1; sync(); } });
      const topRow = api.h('div', { class: 'lab-row', style: { gap: '6px' } }, composeBtn, stepTabs);
      const typeRow = chipRow(api, [{ label: 'Translate', value: 'tr' }, { label: 'Reflect', value: 'ref' }, { label: 'Rotate', value: 'rot' }, { label: 'Dilate', value: 'dil' }], (v) => { st.steps[st.edit].type = v; sync(); });
      const cur = () => st.steps[st.edit];
      const stepper = (lab, key) => {
        const val = api.h('span', { class: 'tnum', style: { minWidth: '2.2em', textAlign: 'center', fontWeight: 700 } });
        const mk = (d, t) => api.h('button', { class: 'btn-small', type: 'button', text: t, 'aria-label': (d < 0 ? 'decrease ' : 'increase ') + lab, onclick: () => { cur()[key] = Math.max(-9, Math.min(9, cur()[key] + d)); sync(); } });
        const wrap = api.h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: '4px' } }, api.h('span', { html: lab, style: { fontWeight: 700 } }), mk(-1, '−'), val, mk(1, '+'));
        wrap.val = val; wrap.key = key;
        return wrap;
      };
      const sa = stepper('a', 'a'), sb = stepper('b', 'b');
      const trRow = api.h('div', { class: 'lab-row', style: { gap: '12px' } }, sa, sb);
      const refRow = chipRow(api, [{ label: 'x-axis', value: 'x' }, { label: 'y-axis', value: 'y' }, { label: 'y = x', value: 'yx' }], (v) => { cur().ref = v; sync(); });
      const rotRow = chipRow(api, [{ label: '90°', value: 90 }, { label: '180°', value: 180 }, { label: '270°', value: 270 }], (v) => { cur().rot = v; sync(); });
      const dilRow = chipRow(api, [{ label: '×2', value: 2 }, { label: '×½', value: 0.5 }], (v) => { cur().k = v; sync(); });
      const ruleBox = api.h('div', { class: 'lab-readout', style: { fontSize: '1.02rem', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' } });
      const table = api.h('table', { class: 'tnum', style: { width: '100%', borderCollapse: 'collapse', fontSize: '.95rem' } });
      const warn = api.h('div', { style: { color: 'var(--bad)', fontSize: '.9rem', fontWeight: 700 } });
      const tryBox = api.h('div', { class: 'try', html: '<b>Try this</b><br>• Rotate 90° twice using Compose — which single rotation does the same?<br>• Reflect over the x-axis, then the y-axis. Compare with rotating 180°.<br>• Dilate ×2: are the image sides parallel to the originals? How much longer?' });
      el.appendChild(svgEl); el.appendChild(topRow); el.appendChild(typeRow);
      el.appendChild(trRow); el.appendChild(refRow); el.appendChild(rotRow); el.appendChild(dilRow);
      el.appendChild(ruleBox); el.appendChild(warn); el.appendChild(table); el.appendChild(tryBox);

      function sync() {
        composeBtn.classList.toggle('on', st.compose);
        stepTabs.style.display = st.compose ? '' : 'none';
        stepTabs.setOn(st.edit);
        const s = cur();
        typeRow.setOn(s.type);
        trRow.style.display = s.type === 'tr' ? '' : 'none';
        refRow.style.display = s.type === 'ref' ? '' : 'none';
        rotRow.style.display = s.type === 'rot' ? '' : 'none';
        dilRow.style.display = s.type === 'dil' ? '' : 'none';
        sa.val.textContent = String(s.a).replace('-', '−'); sb.val.textContent = String(s.b).replace('-', '−');
        refRow.setOn(s.ref); rotRow.setOn(s.rot); dilRow.setOn(s.k);
        const t1 = tf(st.steps[0]), t2 = tf(st.steps[1]);
        ruleBox.textContent = '';
        ruleBox.appendChild(api.h('div', { html: `${st.compose ? 'Step 1: ' : ''}${esc(t1.label)}: $${t1.rule}$` }));
        if (st.compose) ruleBox.appendChild(api.h('div', { html: `Step 2: ${esc(t2.label)}: $${t2.rule}$`, style: { color: 'var(--good)' } }));
        api.tex(ruleBox);
        render();
      }
      function render() {
        LBL = [];
        const P = st.P, t1 = tf(st.steps[0]), t2 = tf(st.steps[1]);
        const Q = P.map(t1.f), R = st.compose ? Q.map(t2.f) : null;
        const S = P.map(G.P), SQ = Q.map(G.P), SR = R ? R.map(G.P) : null;
        handles.forEach((h, i) => h.setAttribute('transform', `translate(${F(S[i][0])},${F(S[i][1])})`));
        // guides
        let g = '';
        const O = G.P([0, 0]);
        const guideFor = (s, from, to) => {
          if (s.type === 'ref') {
            const ends = s.ref === 'x' ? [[-10, 0], [10, 0]] : s.ref === 'y' ? [[0, -10], [0, 10]] : [[-10, -10], [10, 10]];
            let r = seg(G.P(ends[0]), G.P(ends[1]), { c: 'var(--accent-2)', w: 2, dash: '7 5', op: 0.8 });
            from.forEach((p, i) => { r += seg(p, to[i], { c: MUTED, w: 1, dash: '3 3' }); });
            return r;
          }
          if (s.type === 'rot') return seg(O, from[0], { c: MUTED, w: 1.2, dash: '3 3' }) + seg(O, to[0], { c: MUTED, w: 1.2, dash: '3 3' }) + `<path d="${arcPath(O, from[0], to[0], 22)}" fill="none" stroke="var(--accent-2)" stroke-width="1.6"/>` + dotS(O, { r: 3.5, c: 'var(--accent-2)' });
          if (s.type === 'dil') return from.map((p, i) => seg(O, len(sub(to[i], O)) > len(sub(p, O)) ? to[i] : p, { c: MUTED, w: 1, dash: '3 3' })).join('') + dotS(O, { r: 3.5, c: 'var(--accent-2)' });
          return from.map((p, i) => seg(p, to[i], { c: MUTED, w: 1.2, dash: '3 3' })).join('');
        };
        g += guideFor(st.steps[0], S, SQ);
        if (st.compose) g += guideFor(st.steps[1], SQ, SR);
        gGuide.innerHTML = g;
        let s = poly(S, { c: 'var(--accent)', w: 2.5, fill: 'var(--accent)', fop: 0.12 });
        s += poly(SQ, { c: 'var(--accent-2)', w: 2.5, fill: 'var(--accent-2)', fop: 0.12, dash: st.compose ? '6 4' : null });
        SQ.forEach((p) => { s += dotS(p, { r: 4, c: 'var(--accent-2)' }); });
        if (SR) { s += poly(SR, { c: 'var(--good)', w: 2.5, fill: 'var(--good)', fop: 0.12 }); SR.forEach((p) => { s += dotS(p, { r: 4, c: 'var(--good)' }); }); }
        // labels: avoid all drawn points
        const obst = [].concat(S, SQ, SR || []);
        [S, SQ, SR].forEach((T) => { if (T) T.forEach((p, i) => obst.push(...sampleSeg(p, T[(i + 1) % 3], 8))); });
        const lab = (T, i, txtS, c) => bestLabel(T[i], txtS, obst.filter((q) => dist(q, T[i]) > 0.5), G.W, G.H, { size: 12, c, prefs: [outDir(T, i), [1, -1], [-1, -1], [1, 1], [-1, 1]], gap: 6, bold: true });
        S.forEach((p, i) => { s += lab(S, i, names[i], 'var(--accent)'); });
        SQ.forEach((p, i) => { s += lab(SQ, i, names[i] + '′', 'var(--accent-2)'); });
        if (SR) SR.forEach((p, i) => { s += lab(SR, i, names[i] + '″', 'var(--good)'); });
        gFig.innerHTML = s;
        LBL = [];
        const all = Q.concat(R || []);
        warn.textContent = all.some((p) => Math.abs(p[0]) > 10 || Math.abs(p[1]) > 10) ? 'Part of the image is off the grid — move the triangle closer to the origin.' : '';
        // table
        table.textContent = '';
        const th = (t, c) => api.h('th', { text: t, style: { textAlign: 'left', padding: '4px 6px', borderBottom: '1.5px solid var(--line)', color: c || 'var(--muted)', fontSize: '.8rem' } });
        const td = (t, c) => api.h('td', { text: t, style: { padding: '4px 6px', borderBottom: '1px solid var(--line)', color: c || 'var(--ink)' } });
        const pt = (p) => `(${numS(p[0])}, ${numS(p[1])})`;
        table.appendChild(api.h('tr', null, th('Pre-image', 'var(--accent)'), th('Image', 'var(--accent-2)'), st.compose ? th('Final', 'var(--good)') : null));
        P.forEach((p, i) => table.appendChild(api.h('tr', null, td(`${names[i]} ${pt(p)}`), td(`${names[i]}′ ${pt(Q[i])}`), st.compose ? td(`${names[i]}″ ${pt(R[i])}`) : null)));
      }
      handles.forEach((h, i) => {
        api.drag(svgEl, h, (p) => {
          const q = G.toMath(p);
          const np = [Math.max(-9, Math.min(9, Math.round(q[0]))), Math.max(-9, Math.min(9, Math.round(q[1])))];
          if (st.P.some((o, j) => j !== i && o[0] === np[0] && o[1] === np[1])) return;
          if (np[0] !== st.P[i][0] || np[1] !== st.P[i][1]) { st.P[i] = np; render(); }
        });
        h.addEventListener('keydown', (e) => {
          const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key];
          if (!d) return;
          e.preventDefault();
          const np = [Math.max(-9, Math.min(9, st.P[i][0] + d[0])), Math.max(-9, Math.min(9, st.P[i][1] + d[1]))];
          if (!st.P.some((o, j) => j !== i && o[0] === np[0] && o[1] === np[1])) { st.P[i] = np; render(); }
        });
      });
      sync();
    }
  };

  MQ.registerTrack({
    id: 'geo', title: 'Geometry', subtitle: 'Angles, congruence proofs, right triangles, transformations & coordinates',
    skills: [skillAngles, skillCongruence, skillRight, skillTransform, skillCoord],
    labs: [labCanvas, labTransform]
  });
})();
