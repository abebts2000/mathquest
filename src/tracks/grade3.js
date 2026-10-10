/* MathQuest — Grade 3 track.
   Skills: multiplication & division facts, fractions on a number line, area & perimeter,
   place value & rounding, telling time. Labs: Array Builder, Fraction Strips. */
(function () {
  'use strict';
  const { util } = MathQuest;

  // ======================================================================
  // Small pure helpers (safe in Node)
  // ======================================================================
  const TIMES = '\\times', DIV = '\\div', BOX = '\\square';
  const pl = (n, one, many) => (n === 1 ? one : many);
  const fr = (n, d) => '\\frac{' + n + '}{' + d + '}';
  const pad = (m) => (m < 10 ? '0' : '') + m;
  const r2 = (x) => Math.round(x * 100) / 100;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const CONTAINERS = [['bag', 'bags'], ['box', 'boxes'], ['jar', 'jars'], ['basket', 'baskets'], ['cup', 'cups'], ['tray', 'trays']];
  const container = (rng) => { const c = rng.pick(CONTAINERS); return { one: c[0], many: c[1] }; };

  // Multiple choice from a correct string and candidate distractors (keeps `n` distinct ones).
  function mc(rng, correct, cands, n) {
    n = n || 3;
    const seen = new Set([String(correct)]); const ds = [];
    for (const c of cands) { const s = String(c); if (!seen.has(s)) { seen.add(s); ds.push(s); } if (ds.length >= n) break; }
    return util.choicesFrom(correct, ds, rng);
  }
  const SVG_OPEN = (w, h, label) => `<svg viewBox="0 0 ${r2(w)} ${r2(h)}" xmlns="http://www.w3.org/2000/svg" font-family="inherit" role="img" aria-label="${label || 'figure'}">`;
  const txt = (x, y, s, o) => {
    o = o || {};
    return `<text x="${r2(x)}" y="${r2(y)}" font-size="${o.fs || 15}" font-family="inherit" fill="${o.fill || 'var(--ink)'}" text-anchor="${o.anchor || 'middle'}"${o.bold ? ' font-weight="700"' : ''}>${s}</text>`;
  };
  // A small stacked fraction drawn in SVG.
  function sfrac(x, y, n, d, fs, fill) {
    fs = fs || 13; fill = fill || 'var(--ink)';
    const w = Math.max(String(n).length, String(d).length) * fs * 0.62 + 4;
    return `<g>${txt(x, y - 2, n, { fs, fill, bold: true })}<line x1="${r2(x - w / 2)}" y1="${r2(y + 2)}" x2="${r2(x + w / 2)}" y2="${r2(y + 2)}" stroke="${fill}" stroke-width="1.5"/>${txt(x, y + fs + 3, d, { fs, fill, bold: true })}</g>`;
  }

  // ---------- Figures ----------
  function dotArrayFig(r, c) {
    const cs = 26, rad = 8.5;
    const cw = c * cs, chh = r * cs;
    const W = Math.max(cw + 28, 220), H = chh + 28;
    const ox = (W - cw) / 2, oy = 14;
    let s = SVG_OPEN(W, H, `${r} rows of ${c} dots`);
    s += `<rect x="${r2(ox - 6)}" y="${oy - 6}" width="${cw + 12}" height="${chh + 12}" rx="10" fill="var(--surface-2)"/>`;
    for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) {
      s += `<circle cx="${r2(ox + j * cs + cs / 2)}" cy="${oy + i * cs + cs / 2}" r="${rad}" fill="var(--accent)"/>`;
    }
    return s + '</svg>';
  }

  // Number line 0..max cut into 1/d parts. pts: [{v, label}]; tickFracs: label every tick with a fraction.
  function nlLine(y, max, d, o) {
    o = o || {};
    const L = 24, R = 316; const X = (v) => L + (R - L) * v / max;
    let s = `<line x1="${L}" y1="${y}" x2="${R}" y2="${y}" stroke="var(--ink)" stroke-width="2.5" stroke-linecap="round"/>`;
    for (let k = 0; k <= max * d; k++) {
      const x = X(k / d), whole = k % d === 0, len = whole ? 11 : 7;
      s += `<line x1="${r2(x)}" y1="${y - len}" x2="${r2(x)}" y2="${y + len}" stroke="var(--ink)" stroke-width="${whole ? 2.5 : 1.6}"/>`;
      if (whole) s += txt(x, y + 30, k / d, { fs: 16, bold: true });
      else if (o.tickFracs) s += sfrac(x, y + 22, k, d, 11, 'var(--muted)');
    }
    for (const p of (o.pts || [])) {
      const x = X(p.v);
      s += `<circle cx="${r2(x)}" cy="${y}" r="7" fill="${p.fill || 'var(--accent)'}" stroke="var(--surface)" stroke-width="2"/>`;
      if (p.label) s += txt(x, y - 16, p.label, { fs: 16, bold: true, fill: p.fill || 'var(--accent)' });
    }
    return s;
  }
  function nlFig(max, d, pts, o) {
    o = o || {};
    return SVG_OPEN(340, 86, 'number line') + nlLine(42, max, d, Object.assign({}, o, { pts })) + '</svg>';
  }
  // Two stacked number lines (0..max) in d1 and d2 parts, point P on top, Q on bottom at same value.
  function nlPairFig(max, d1, d2, v) {
    const L = 24, R = 316; const x = L + (R - L) * v / max;
    let s = SVG_OPEN(340, 170, 'two number lines');
    s += nlLine(40, max, d1, { pts: [{ v, label: 'P' }], tickFracs: true });
    s += `<line x1="${r2(x)}" y1="86" x2="${r2(x)}" y2="118" stroke="var(--accent-2)" stroke-width="2" stroke-dasharray="5 4"/>`;
    s += nlLine(126, max, d2, { pts: [{ v, label: '', fill: 'var(--accent-2)' }] });
    s += txt(x + 12, 112, 'Q', { fs: 16, bold: true, fill: 'var(--accent-2)', anchor: 'start' });
    return s + '</svg>';
  }

  function clockFig(h, m) {
    const cx = 100, cy = 100;
    const P = (deg, rad) => { const a = deg * Math.PI / 180; return [r2(cx + rad * Math.sin(a)), r2(cy - rad * Math.cos(a))]; };
    let s = SVG_OPEN(200, 200, 'clock');
    s += `<circle cx="${cx}" cy="${cy}" r="92" fill="var(--surface)" stroke="var(--ink)" stroke-width="5"/>`;
    for (let i = 0; i < 60; i++) {
      const big = i % 5 === 0; const [x1, y1] = P(i * 6, big ? 76 : 81); const [x2, y2] = P(i * 6, 87);
      s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${big ? 'var(--ink)' : 'var(--muted)'}" stroke-width="${big ? 3 : 1.4}" stroke-linecap="round"/>`;
    }
    for (let k = 1; k <= 12; k++) { const [x, y] = P(k * 30, 63); s += txt(x, y + 6.5, k, { fs: 18, bold: true }); }
    const ha = ((h % 12) + m / 60) * 30, ma = m * 6;
    const [hx, hy] = P(ha, 46); const [mx, my] = P(ma, 74);
    s += `<line x1="${cx}" y1="${cy}" x2="${hx}" y2="${hy}" stroke="var(--ink)" stroke-width="8" stroke-linecap="round"/>`;
    s += `<line x1="${cx}" y1="${cy}" x2="${mx}" y2="${my}" stroke="var(--accent)" stroke-width="4.5" stroke-linecap="round"/>`;
    s += `<circle cx="${cx}" cy="${cy}" r="6" fill="var(--ink)"/><circle cx="${cx}" cy="${cy}" r="2.5" fill="var(--accent)"/>`;
    return s + '</svg>';
  }

  // Unit-square grid shape. cells: array of [col,row]; outline: polygon points in grid units.
  function gridShapeFig(cols, rows, cells, outline, o) {
    o = o || {};
    const s0 = 28, m = 22;
    const W = Math.max(cols * s0 + 2 * m, 220), H = rows * s0 + 2 * m;
    const ox = (W - cols * s0) / 2, oy = m;
    let s = SVG_OPEN(W, H, 'shape on a grid');
    for (let i = 0; i <= cols; i++) s += `<line x1="${r2(ox + i * s0)}" y1="${oy}" x2="${r2(ox + i * s0)}" y2="${oy + rows * s0}" stroke="var(--muted)" stroke-width="0.6" stroke-opacity="0.5"/>`;
    for (let j = 0; j <= rows; j++) s += `<line x1="${r2(ox)}" y1="${oy + j * s0}" x2="${r2(ox + cols * s0)}" y2="${oy + j * s0}" stroke="var(--muted)" stroke-width="0.6" stroke-opacity="0.5"/>`;
    for (const [c, r] of cells) {
      const fill = o.colorOf ? o.colorOf(c, r) : 'var(--accent)';
      s += `<rect x="${r2(ox + c * s0 + 1)}" y="${oy + r * s0 + 1}" width="${s0 - 2}" height="${s0 - 2}" rx="3" fill="${fill}" fill-opacity="0.28" stroke="${fill}" stroke-width="1"/>`;
    }
    s += `<polygon points="${outline.map(([x, y]) => r2(ox + x * s0) + ',' + r2(oy + y * s0)).join(' ')}" fill="none" stroke="var(--ink)" stroke-width="3" stroke-linejoin="round"/>`;
    return s + '</svg>';
  }
  function gridRectFig(w, h) {
    const cells = []; for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) cells.push([c, r]);
    return gridShapeFig(w, h, cells, [[0, 0], [w, 0], [w, h], [0, h]]);
  }

  // Polygon with side labels placed outside each edge (works for any orientation).
  function labeledPolyFig(pts, labels, o) {
    o = o || {};
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const minx = Math.min(...xs), maxx = Math.max(...xs), miny = Math.min(...ys), maxy = Math.max(...ys);
    const k = Math.min(230 / (maxx - minx), 170 / (maxy - miny), 30);
    const W = 340, H = (maxy - miny) * k + 76;
    const ox = (W - (maxx - minx) * k) / 2 - minx * k, oy = 36 - miny * k;
    const S = (p) => [ox + p[0] * k, oy + p[1] * k];
    let area2 = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; area2 += a[0] * b[1] - b[0] * a[1]; }
    const orient = area2 > 0 ? 1 : -1;
    let s = SVG_OPEN(W, H, 'shape with side lengths');
    s += `<polygon points="${pts.map((p) => S(p).map(r2).join(',')).join(' ')}" fill="var(--accent)" fill-opacity="0.16" stroke="var(--ink)" stroke-width="3" stroke-linejoin="round"/>`;
    if (o.split) { const a = S(o.split[0]), b = S(o.split[1]); s += `<line x1="${r2(a[0])}" y1="${r2(a[1])}" x2="${r2(b[0])}" y2="${r2(b[1])}" stroke="var(--accent-2)" stroke-width="2.5" stroke-dasharray="6 5"/>`; }
    for (let i = 0; i < pts.length; i++) {
      const lab = labels[i]; if (!lab) continue;
      const a = S(pts[i]), b = S(pts[(i + 1) % pts.length]);
      const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
      const flip = o.inside && o.inside.indexOf(i) >= 0 ? -1 : 1;
      const nx = flip * orient * dy / len, ny = flip * orient * -dx / len;
      const mx = (a[0] + b[0]) / 2 + nx * 10, my = (a[1] + b[1]) / 2 + ny * 10;
      const anchor = nx > 0.5 ? 'start' : nx < -0.5 ? 'end' : 'middle';
      const yy = ny < -0.5 ? my - 2 : ny > 0.5 ? my + 15 : my + 5;
      const q = /\?/.test(lab);
      s += txt(mx, yy, lab, { fs: 15, bold: true, anchor, fill: q ? 'var(--accent-2)' : 'var(--ink)' });
    }
    if (o.center) for (const c of o.center) { const p = S(c.at); s += txt(p[0], p[1] + 7, c.text, { fs: 20, bold: true, fill: 'var(--accent)' }); }
    return s + '</svg>';
  }
  function rectFig(w, h, top, side) { return labeledPolyFig([[0, 0], [w, 0], [w, h], [0, h]], [top, side, null, null]); }

  function rectPairFig(a, b, u) {
    const maxW = Math.max(a[0], b[0]), maxH = Math.max(a[1], b[1]);
    const k = Math.min(118 / maxW, 120 / maxH, 22);
    const H = maxH * k + 70;
    let s = SVG_OPEN(340, H, 'rectangles A and B');
    [[a, 'A', 30], [b, 'B', 190]].forEach(([d, nm, x0]) => {
      const w = d[0] * k, h = d[1] * k, x = x0 + (130 - w) / 2 + 10, y = 30;
      s += `<rect x="${r2(x)}" y="${y}" width="${r2(w)}" height="${r2(h)}" fill="var(--accent)" fill-opacity="0.16" stroke="var(--ink)" stroke-width="3"/>`;
      s += txt(x + w / 2, y - 8, `${d[0]} ${u}`, { fs: 14, bold: true });
      s += txt(x - 6, y + h / 2 + 5, `${d[1]} ${u}`, { fs: 14, bold: true, anchor: 'end' });
      s += txt(x + w / 2, y + h + 24, nm, { fs: 18, bold: true, fill: 'var(--accent)' });
    });
    return s + '</svg>';
  }

  // ======================================================================
  // Skill 1: Multiplication & division facts
  // ======================================================================
  function genMultDiv(rng, level) {
    const nm = util.name(rng), it = util.item(rng), box = container(rng);
    if (level === 1) {
      const kind = rng.pick(['array', 'array', 'fact', 'fact', 'groups', 'arraychoice', 'div']);
      if (kind === 'array') {
        const r = rng.int(2, 5), c = rng.int(2, 6), P = r * c;
        return {
          prompt: rng.bool() ? `How many dots? There are ${r} rows of ${c}.` : `This array has ${r} rows. Each row has ${c} dots. How many dots in all?`,
          figure: dotArrayFig(r, c), input: { type: 'number', unit: 'dots' }, answer: P,
          hint: `Skip count by ${c}, ${r} times.`,
          explanation: [`There are ${r} rows.`, `Each row has ${c} dots.`, `${r} rows of ${c} is $${r} ${TIMES} ${c}$.`, `$${r} ${TIMES} ${c} = ${P}$, so there are ${P} dots.`]
        };
      }
      if (kind === 'fact') {
        const a = rng.int(0, 5), b = rng.int(0, 10); const [x, y] = rng.bool() ? [a, b] : [b, a];
        const ex = [`$${x} ${TIMES} ${y}$ means ${x} groups of ${y}.`];
        if (x === 0 || y === 0) ex.push('Any number times 0 is 0. Zero groups means nothing at all!');
        else if (x === 1 || y === 1) ex.push('Any number times 1 is that same number.');
        else ex.push(`Skip count by ${Math.max(x, y)}, ${Math.min(x, y)} times: ${Array.from({ length: Math.min(x, y) }, (_, i) => (i + 1) * Math.max(x, y)).join(', ')}.`);
        ex.push(`So $${x} ${TIMES} ${y} = ${x * y}$.`);
        return { prompt: `What is $${x} ${TIMES} ${y}$?`, input: { type: 'number' }, answer: x * y, explanation: ex, hint: 'Think of equal groups.' };
      }
      if (kind === 'groups') {
        const g = rng.int(2, 5), e = rng.int(2, 9);
        return {
          prompt: `${nm} has ${g} ${box.many}. Each ${box.one} has ${e} ${it.many}. How many ${it.many} does ${nm} have in all?`,
          input: { type: 'number', unit: it.many }, answer: g * e,
          explanation: [`There are ${g} equal groups.`, `Each group has ${e} ${it.many}.`, `Multiply: $${g} ${TIMES} ${e} = ${g * e}$.`, `${nm} has ${g * e} ${it.many}.`]
        };
      }
      if (kind === 'arraychoice') {
        let r = rng.int(2, 5), c = rng.int(2, 6); if (r === c) c = r + 1;
        const ch = mc(rng, `$${r} ${TIMES} ${c}$`, [`$${r} + ${c}$`, `$${r + 1} ${TIMES} ${c}$`, `$${r} ${TIMES} ${c + 1}$`, `$${c} + ${c}$`]);
        return {
          prompt: 'Which multiplication matches this array?', figure: dotArrayFig(r, c),
          input: { type: 'choice', options: ch.options }, answer: ch.answer,
          explanation: [`Count the rows: ${r}.`, `Count the dots in one row: ${c}.`, `Rows times dots in a row: $${r} ${TIMES} ${c} = ${r * c}$.`]
        };
      }
      const b = rng.int(1, 5), q = rng.int(1, 9), P = b * q;
      return {
        prompt: `What is $${P} ${DIV} ${b}$?`, input: { type: 'number' }, answer: q, hint: `Think: what times ${b} makes ${P}?`,
        explanation: [`Division is the opposite of multiplication.`, `Ask: $${b} ${TIMES} ${BOX} = ${P}$?`, `$${b} ${TIMES} ${q} = ${P}$, so $${P} ${DIV} ${b} = ${q}$.`]
      };
    }

    if (level === 2) {
      const kind = rng.pick(['fact', 'fact', 'missing', 'missing', 'share', 'group', 'divfact', 'bigarray']);
      const big = () => { let a = rng.int(2, 10), b = rng.int(2, 10); if (Math.max(a, b) < 6) a = rng.int(6, 10); return rng.bool() ? [a, b] : [b, a]; };
      if (kind === 'fact') {
        const [a, b] = big();
        const s = Math.min(a, b), L = Math.max(a, b);
        return {
          prompt: `What is $${a} ${TIMES} ${b}$?`, input: { type: 'number' }, answer: a * b,
          explanation: [`You can switch the order: $${a} ${TIMES} ${b} = ${b} ${TIMES} ${a}$.`, `Use a fact you know: $${s - 1 || 1} ${TIMES} ${L} = ${(s - 1 || 1) * L}$.`, s - 1 ? `Add one more group of ${L}: $${(s - 1) * L} + ${L} = ${s * L}$.` : `That is the answer.`, `So $${a} ${TIMES} ${b} = ${a * b}$.`]
        };
      }
      if (kind === 'missing') {
        const [a, b] = big(), P = a * b; const left = rng.bool();
        const eq = left ? `${BOX} ${TIMES} ${b} = ${P}` : `${a} ${TIMES} ${BOX} = ${P}`;
        const ans = left ? a : b, known = left ? b : a;
        return {
          prompt: `What number goes in the box? $${eq}$`, input: { type: 'number' }, answer: ans, hint: `Use division: $${P} ${DIV} ${known}$.`,
          explanation: [`We need a number that times ${known} makes ${P}.`, `That is the same as $${P} ${DIV} ${known}$.`, `$${P} ${DIV} ${known} = ${ans}$.`, `Check: $${left ? ans + ' ' + TIMES + ' ' + b : a + ' ' + TIMES + ' ' + ans} = ${P}$. ✓`]
        };
      }
      if (kind === 'share' || kind === 'group') {
        const k = rng.int(2, 10), q = rng.int(2, 10), N = k * q;
        if (kind === 'share') return {
          prompt: `${nm} has ${N} ${it.many}. ${nm} shares them equally with ${k} friends. How many ${it.many} does each friend get?`,
          input: { type: 'number', unit: it.many }, answer: q,
          explanation: [`Sharing equally means dividing.`, `$${N} ${DIV} ${k} = ${BOX}$`, `Think: $${k} ${TIMES} ${q} = ${N}$.`, `Each friend gets ${q} ${it.many}.`]
        };
        return {
          prompt: `${nm} has ${N} ${it.many}. ${nm} puts ${k} ${it.many} in each ${box.one}. How many ${box.many} does ${nm} fill?`,
          input: { type: 'number', unit: box.many }, answer: q,
          explanation: [`We make groups of ${k}. Count how many groups.`, `That is $${N} ${DIV} ${k}$.`, `Think: $${q} ${TIMES} ${k} = ${N}$.`, `${nm} fills ${q} ${box.many}.`]
        };
      }
      if (kind === 'divfact') {
        const [a, b] = big(), P = a * b;
        return {
          prompt: `What is $${P} ${DIV} ${b}$?`, input: { type: 'number' }, answer: a,
          explanation: [`Turn it into multiplication: $${b} ${TIMES} ${BOX} = ${P}$.`, `$${b} ${TIMES} ${a} = ${P}$.`, `So $${P} ${DIV} ${b} = ${a}$.`]
        };
      }
      const r = rng.int(3, 8), c = rng.int(6, 10);
      return {
        prompt: `How many dots? There are ${r} rows of ${c}.`, figure: dotArrayFig(r, c), input: { type: 'number', unit: 'dots' }, answer: r * c,
        hint: 'Multiply instead of counting one by one.',
        explanation: [`${r} rows of ${c} means $${r} ${TIMES} ${c}$.`, `$${r} ${TIMES} ${c} = ${r * c}$.`, `There are ${r * c} dots.`]
      };
    }

    // Level 3
    const kind = rng.pick(['two', 'two', 'two', 'family', 'unknown', 'unknown', 'balance']);
    if (kind === 'two') {
      const t = rng.int(1, 6);
      if (t === 1) {
        const g = rng.int(3, 9), e = rng.int(4, 10), tot = g * e, k = rng.int(3, tot - 2);
        return {
          prompt: `${nm} has ${g} packs of ${it.many}. Each pack has ${e} ${it.many}. ${nm} gives away ${k} ${it.many}. How many ${it.many} are left?`,
          input: { type: 'number', unit: it.many }, answer: tot - k,
          explanation: [`Step 1: Find the total. $${g} ${TIMES} ${e} = ${tot}$.`, `Step 2: Take away the ones given away. $${tot} - ${k} = ${tot - k}$.`, `${nm} has ${tot - k} ${it.many} left.`]
        };
      }
      if (t === 2) {
        const g1 = rng.int(2, 6), e1 = rng.int(3, 9), g2 = rng.int(2, 6); let e2 = rng.int(3, 9); if (e2 === e1) e2 = e1 === 9 ? 8 : e1 + 1;
        const A = g1 * e1, B = g2 * e2;
        return {
          prompt: `A shop has ${g1} ${box.many} with ${e1} ${it.many} each and ${g2} ${box.many} with ${e2} ${it.many} each. How many ${it.many} is that in all?`,
          input: { type: 'number', unit: it.many }, answer: A + B,
          explanation: [`First group: $${g1} ${TIMES} ${e1} = ${A}$.`, `Second group: $${g2} ${TIMES} ${e2} = ${B}$.`, `Add them: $${A} + ${B} = ${A + B}$.`]
        };
      }
      if (t === 3) {
        const k = rng.int(2, 9), q = rng.int(2, 9), m = rng.int(2, 9), N = k * q;
        return {
          prompt: `${nm} shares ${N} ${it.many} equally among ${k} friends. Then each friend gets ${m} more. How many ${it.many} does each friend have now?`,
          input: { type: 'number', unit: it.many }, answer: q + m,
          explanation: [`Step 1: Share equally. $${N} ${DIV} ${k} = ${q}$.`, `Step 2: Add the extra. $${q} + ${m} = ${q + m}$.`, `Each friend has ${q + m} ${it.many}.`]
        };
      }
      if (t === 4) {
        const k = rng.int(2, 6), q = rng.int(3, 8), m = rng.int(2, 6), N = k * q;
        return {
          prompt: `There are ${N} kids in gym class. They make teams of ${k}. Each team gets ${m} balls. How many balls are needed?`,
          input: { type: 'number', unit: 'balls' }, answer: q * m,
          explanation: [`Step 1: Find the number of teams. $${N} ${DIV} ${k} = ${q}$ teams.`, `Step 2: Each team gets ${m} balls. $${q} ${TIMES} ${m} = ${q * m}$.`, `They need ${q * m} balls.`]
        };
      }
      if (t === 5) {
        const e = rng.int(3, 9), w = rng.int(3, 9), tot = e * w, c = rng.int(5, tot - 1);
        return {
          prompt: `${nm} saves ${e} dollars every week for ${w} weeks. Then ${nm} buys a game for ${c} dollars. How many dollars are left?`,
          input: { type: 'number', unit: 'dollars' }, answer: tot - c,
          explanation: [`Step 1: Savings: $${e} ${TIMES} ${w} = ${tot}$ dollars.`, `Step 2: Subtract the game: $${tot} - ${c} = ${tot - c}$.`, `${nm} has ${tot - c} dollars left.`]
        };
      }
      const S = rng.int(5, 40), g = rng.int(2, 9), e = rng.int(3, 10);
      return {
        prompt: `${nm} had ${S} ${it.many}. Then ${nm} got ${g} more ${box.many} with ${e} ${it.many} in each. How many ${it.many} does ${nm} have now?`,
        input: { type: 'number', unit: it.many }, answer: S + g * e,
        explanation: [`Step 1: The new ${it.many}: $${g} ${TIMES} ${e} = ${g * e}$.`, `Step 2: Add what ${nm} had: $${S} + ${g * e} = ${S + g * e}$.`, `${nm} has ${S + g * e} ${it.many} now.`]
      };
    }
    if (kind === 'family') {
      let a = rng.int(3, 9), b = rng.int(3, 10); if (a === b) b = a + 1; const P = a * b;
      if (rng.bool()) {
        const ch = mc(rng, `$${P} ${DIV} ${b} = ${a}$`, [`$${P} - ${b} = ${a}$`, `$${a} + ${b} = ${P}$`, `$${P} ${DIV} ${a} = ${a}$`, `$${b} ${DIV} ${a} = ${P}$`]);
        return {
          prompt: `Which fact is in the same fact family as $${a} ${TIMES} ${b} = ${P}$?`, input: { type: 'choice', options: ch.options }, answer: ch.answer,
          explanation: [`A fact family uses the same three numbers: ${a}, ${b} and ${P}.`, `It has two times facts and two division facts.`, `$${a} ${TIMES} ${b} = ${P}$, $${b} ${TIMES} ${a} = ${P}$, $${P} ${DIV} ${a} = ${b}$, $${P} ${DIV} ${b} = ${a}$.`]
        };
      }
      const wrong = rng.pick([`$${P} ${DIV} ${a} = ${a}$`, `$${a} ${TIMES} ${P} = ${b}$`, `$${b} ${DIV} ${P} = ${a}$`, `$${P} ${DIV} ${b} = ${b}$`]);
      const goods = rng.sample([`$${b} ${TIMES} ${a} = ${P}$`, `$${P} ${DIV} ${a} = ${b}$`, `$${P} ${DIV} ${b} = ${a}$`, `$${a} ${TIMES} ${b} = ${P}$`], 3);
      const ch = util.choicesFrom(wrong, goods, rng);
      return {
        prompt: `Which fact does <b>not</b> belong in the fact family for ${a}, ${b} and ${P}?`, input: { type: 'choice', options: ch.options }, answer: ch.answer,
        explanation: [`The family is: $${a} ${TIMES} ${b} = ${P}$, $${b} ${TIMES} ${a} = ${P}$, $${P} ${DIV} ${a} = ${b}$, $${P} ${DIV} ${b} = ${a}$.`, `${wrong} is not true, so it does not belong.`]
      };
    }
    if (kind === 'unknown') {
      const a = rng.int(3, 10), b = rng.int(3, 10), P = a * b; const t = rng.int(1, 5);
      const forms = {
        1: [`${P} ${DIV} ${BOX} = ${a}`, b, `What number divided into ${P} gives ${a}? Think $${a} ${TIMES} ${BOX} = ${P}$.`],
        2: [`${BOX} ${DIV} ${a} = ${b}`, P, `The missing number is the total. Multiply: $${a} ${TIMES} ${b} = ${P}$.`],
        3: [`${P} = ${a} ${TIMES} ${BOX}`, b, `Think $${P} ${DIV} ${a}$.`],
        4: [`${b} = ${BOX} ${DIV} ${a}`, P, `Multiply: $${b} ${TIMES} ${a} = ${P}$.`],
        5: [`${a} = ${P} ${DIV} ${BOX}`, b, `Ask: ${P} split into how many equal groups gives ${a} in each? Think $${a} ${TIMES} ${BOX} = ${P}$.`]
      }[t];
      return {
        prompt: `What number goes in the box? $${forms[0]}$`, input: { type: 'number' }, answer: forms[1],
        explanation: [`The box can be in any spot. Use the fact family for ${a}, ${b} and ${P}.`, forms[2], `The missing number is ${forms[1]}.`]
      };
    }
    // balance: a × b = c × ?
    for (;;) {
      const a = rng.int(2, 10), b = rng.int(2, 10), P = a * b;
      const cs = [2, 3, 4, 5, 6, 7, 8, 9, 10].filter((c) => c !== a && c !== b && P % c === 0 && P / c <= 10 && P / c !== a && P / c !== b);
      if (!cs.length) continue;
      const c = rng.pick(cs), q = P / c;
      return {
        prompt: `Make both sides equal. What goes in the box? $${a} ${TIMES} ${b} = ${c} ${TIMES} ${BOX}$`, input: { type: 'number' }, answer: q,
        explanation: [`Find the left side first: $${a} ${TIMES} ${b} = ${P}$.`, `Now we need $${c} ${TIMES} ${BOX} = ${P}$.`, `$${P} ${DIV} ${c} = ${q}$, so the box is ${q}.`]
      };
    }
  }

  // ======================================================================
  // Skill 2: Fractions on a number line
  // ======================================================================
  const DENS = [2, 3, 4, 6, 8];
  const SIGNS = ['$<$', '$>$', '$=$'];
  function fracWordsAt(n, d) {
    if (n % d === 0) return `$${fr(n, d)}$ is the same as ${n / d} ${pl(n / d, 'whole', 'wholes')}.`;
    if (n > d) return `$${fr(n, d)}$ is more than 1: it is ${Math.floor(n / d)} ${pl(Math.floor(n / d), 'whole', 'wholes')} and ${n % d} more ${pl(n % d, 'part', 'parts')}.`;
    return `$${fr(n, d)}$ is between 0 and 1.`;
  }
  function placeProblem(n, d, max, step, extra) {
    const ex = [`Each whole on this line is cut into ${Math.round(1 / step)} equal parts.`];
    if (Math.abs(step - 1 / d) < 1e-9) ex.push(`Each part is $${fr(1, d)}$.`, `Count ${n} ${pl(n, 'part', 'parts')} from 0.`, fracWordsAt(n, d));
    else (extra || []).forEach((e) => ex.push(e));
    return {
      prompt: `Put $${fr(n, d)}$ on the number line.`,
      input: { type: 'numberline', min: 0, max, step, labelEvery: Math.round(1 / step), labels: 'fraction' },
      answer: n / d, explanation: ex.slice(0, 5), hint: 'Count the spaces between tick marks, not the tick marks.'
    };
  }
  function compareProblem(a, b, c, d) {
    const v1 = a / b, v2 = c / d; const ans = Math.abs(v1 - v2) < 1e-9 ? 2 : v1 < v2 ? 0 : 1;
    const sym = ['<', '>', '='][ans];
    const ex = [];
    if (b === d) ex.push(`Both fractions have ${b} equal parts in a whole, so the parts are the same size.`, ans === 2 ? `Same number of parts, so they are equal.` : `Compare the tops: ${a} parts vs ${c} parts.`);
    else if (a === c) ex.push(`Both fractions have ${a} ${pl(a, 'part', 'parts')}.`, `Bigger bottom number means smaller parts: eighths are smaller than fourths.`, ans === 0 ? `$${fr(1, b)}$ parts are smaller, so $${fr(a, b)}$ is less.` : `$${fr(1, b)}$ parts are bigger, so $${fr(a, b)}$ is more.`);
    else ex.push(`Picture both on a number line.`, `They land on the same spot.`);
    ex.push(`So $${fr(a, b)} ${sym} ${fr(c, d)}$.`);
    return {
      prompt: `Which sign makes this true? $${fr(a, b)} \\;${BOX}\\; ${fr(c, d)}$`,
      input: { type: 'choice', options: SIGNS.slice() }, answer: ans, explanation: ex, hint: 'Think about where each fraction sits on a number line.'
    };
  }
  function pointFracProblem(rng, n, d, max, asChoice) {
    const fig = nlFig(max, d, [{ v: n / d, label: 'P' }]);
    const ex = [`From 0 to 1 there are ${d} equal parts, so each part is $${fr(1, d)}$.`, `Count the parts from 0 to P: ${n}.`, `P is at $${fr(n, d)}$.`];
    if (asChoice) {
      const ds = [fr(n + 1, d), fr(Math.max(1, n - 1), d), fr(n, d + 1), fr(d - n > 0 ? d - n : n + 2, d), fr(d, n)];
      const ch = mc(rng, `$${fr(n, d)}$`, ds.map((s) => `$${s}$`).filter((s) => {
        const m = s.match(/frac\{(\d+)\}\{(\d+)\}/); return Math.abs(+m[1] / +m[2] - n / d) > 1e-9;
      }));
      return { prompt: 'What fraction is at point P?', figure: fig, input: { type: 'choice', options: ch.options }, answer: ch.answer, explanation: ex, hint: 'Count spaces, not tick marks.' };
    }
    return { prompt: 'What fraction is at point P?', figure: fig, input: { type: 'fraction' }, answer: { n, d }, explanation: ex, hint: 'Count spaces, not tick marks.' };
  }

  function genFracLine(rng, level) {
    if (level === 1) {
      const kind = rng.pick(['place', 'place', 'place', 'point', 'pointChoice', 'unit', 'which', 'count', 'compare']);
      const d = rng.pick(DENS), n = rng.int(1, d - 1);
      if (kind === 'which' && d > 2) {
        const L = ['A', 'B', 'C', 'D'];
        const others = rng.sample(Array.from({ length: d - 1 }, (_, i) => i + 1).filter((k) => k !== n), Math.min(2, d - 2));
        const all = rng.shuffle([n].concat(others)).sort((x, y) => x - y);
        const pts = all.map((k, i) => ({ v: k / d, label: L[i] }));
        const opts = all.map((_, i) => 'Point ' + L[i]);
        return {
          prompt: `Which point is at $${fr(n, d)}$?`, figure: nlFig(1, d, pts), input: { type: 'choice', options: opts }, answer: all.indexOf(n),
          explanation: [`The line from 0 to 1 has ${d} equal parts. Each part is $${fr(1, d)}$.`, `Count ${n} ${pl(n, 'part', 'parts')} from 0.`, `You land on point ${L[all.indexOf(n)]}.`]
        };
      }
      if (kind === 'count') return {
        prompt: `How many $${fr(1, d)}$ parts make $${fr(n, d)}$?`, figure: nlFig(1, d, [{ v: n / d, label: '' }]), input: { type: 'number', unit: 'parts' }, answer: n,
        explanation: [`$${fr(n, d)}$ means ${n} parts of size $${fr(1, d)}$.`, `On the line, count ${n} spaces from 0.`, `So it takes ${n} parts.`]
      };
      if (kind === 'compare') { const m = rng.int(1, d - 1); return compareProblem(n, d, m, d); }
      if (kind === 'place') return placeProblem(n, d, 1, 1 / d);
      if (kind === 'point') return pointFracProblem(rng, n, d, 1, false);
      if (kind === 'pointChoice') return pointFracProblem(rng, n, d, 1, true);
      return {
        prompt: `The line from 0 to 1 is cut into equal parts. What fraction is one part?`, figure: nlFig(1, d, [{ v: 1 / d, label: 'P' }]),
        input: { type: 'fraction' }, answer: { n: 1, d },
        explanation: [`Count the spaces from 0 to 1: there are ${d}.`, `One part out of ${d} equal parts is $${fr(1, d)}$.`, `So P is at $${fr(1, d)}$.`]
      };
    }
    if (level === 2) {
      const kind = rng.pick(['place', 'place', 'place', 'point', 'whole', 'whole', 'compare']);
      const max = rng.pick([2, 3]), d = rng.pick(max === 3 ? [2, 3, 4] : DENS);
      if (kind === 'place') {
        const n = rng.bool(0.35) ? d * rng.int(1, max) : rng.int(d + 1, max * d - 1);
        return placeProblem(n, d, max, 1 / d);
      }
      if (kind === 'point') {
        let n = rng.int(d + 1, max * d - 1); if (n % d === 0) n += 1;
        const p = pointFracProblem(rng, n, d, max, false);
        p.explanation = [`Each whole is cut into ${d} parts, so each part is $${fr(1, d)}$.`, `Count all the parts from 0 to P: ${n}.`, `P is at $${fr(n, d)}$. ${fracWordsAt(n, d)}`];
        return p;
      }
      if (kind === 'whole') {
        const w = rng.int(1, max);
        if (rng.bool()) {
          return {
            prompt: `What number goes in the box? $${fr(BOX, d)} = ${w}$`, figure: nlFig(max, d, [{ v: w, label: '' }]),
            input: { type: 'number' }, answer: w * d,
            explanation: [`One whole has ${d} parts of size $${fr(1, d)}$.`, `${w} ${pl(w, 'whole has', 'wholes have')} $${w} ${TIMES} ${d} = ${w * d}$ parts.`, `So $${fr(w * d, d)} = ${w}$.`]
          };
        }
        const ch = mc(rng, `$${fr(w * d, d)}$`, [`$${fr(w, d)}$`, `$${fr(d, w * d + 1)}$`, `$${fr(w * d + 1, d)}$`, `$${fr(w * d - 1, d)}$`, `$${fr(d, w)}$`].filter((s) => s !== `$${fr(w * d, d)}$` && !(w === 1 && s === `$${fr(d, w)}$`)));
        return {
          prompt: `Which fraction is at the same spot as ${w} on this number line?`, figure: nlFig(max, d, []),
          input: { type: 'choice', options: ch.options }, answer: ch.answer,
          explanation: [`Each whole is cut into ${d} parts.`, `To get to ${w}, count $${w} ${TIMES} ${d} = ${w * d}$ parts.`, `So ${w} $= ${fr(w * d, d)}$.`]
        };
      }
      const dd = rng.pick(DENS); let a = rng.int(1, 2 * dd - 1), c = rng.int(1, 2 * dd - 1); if (rng.bool(0.15)) c = a;
      return compareProblem(a, dd, c, dd);
    }
    // Level 3
    const kind = rng.pick(['equivLine', 'equivLine', 'placeEquiv', 'placeEquiv', 'compareNum', 'compareMix', 'pointBig', 'equivChoice']);
    const PAIRS = [[2, 4], [2, 6], [2, 8], [3, 6], [4, 8]];
    if (kind === 'equivLine') {
      const [d1, d2] = rng.pick(PAIRS), k = d2 / d1, a = rng.int(1, d1 - 1);
      if (rng.bool()) {
        return {
          prompt: `P and Q are at the same spot. Fill in the box: $${fr(a, d1)} = ${fr(BOX, d2)}$`, figure: nlPairFig(1, d1, d2, a / d1),
          input: { type: 'number' }, answer: a * k,
          explanation: [`The top line has ${d1} parts. The bottom line has ${d2} parts.`, `Each top part is the same as ${k} bottom parts.`, `${a} top ${pl(a, 'part', 'parts')} $= ${a} ${TIMES} ${k} = ${a * k}$ bottom parts.`, `So $${fr(a, d1)} = ${fr(a * k, d2)}$.`]
        };
      }
      return {
        prompt: `P and Q are at the same spot. Fill in the box: $${fr(a * k, d2)} = ${fr(BOX, d1)}$`, figure: nlPairFig(1, d1, d2, a / d1),
        input: { type: 'number' }, answer: a,
        explanation: [`Q is ${a * k} parts out of ${d2} on the bottom line.`, `Every ${k} bottom parts make 1 top part.`, `$${a * k} ${DIV} ${k} = ${a}$, so $${fr(a * k, d2)} = ${fr(a, d1)}$.`]
      };
    }
    if (kind === 'placeEquiv') {
      const [d1, d2] = rng.pick(PAIRS), k = d2 / d1, max = rng.pick([1, 2]);
      if (rng.bool()) { // show d1 on a line cut in d2
        const a = rng.int(1, max * d1 - 1);
        return placeProblem(a, d1, max, 1 / d2, [`This line is cut into ${d2}ths. Each $${fr(1, d1)}$ is the same as ${k} of these small parts.`, `$${fr(a, d1)} = ${fr(a * k, d2)}$.`, `Count ${a * k} small parts from 0.`]);
      }
      const a = rng.int(1, max * d1 - 1); // show a*k/d2 on line cut in d1
      return placeProblem(a * k, d2, max, 1 / d1, [`This line is cut into parts of size $${fr(1, d1)}$.`, `${k} parts of $${fr(1, d2)}$ make one $${fr(1, d1)}$, so $${fr(a * k, d2)} = ${fr(a, d1)}$.`, `Count ${a} ${pl(a, 'part', 'parts')} from 0.`]);
    }
    if (kind === 'compareNum') {
      const [b, d] = rng.sample(DENS, 2), a = rng.int(1, Math.min(b, d) + 2);
      return compareProblem(a, b, a, d);
    }
    if (kind === 'compareMix') {
      if (rng.bool(0.35)) { const [d1, d2] = rng.pick(PAIRS), a = rng.int(1, 2 * d1 - 1); return rng.bool() ? compareProblem(a, d1, a * d2 / d1, d2) : compareProblem(a * d2 / d1, d2, a, d1); }
      const d = rng.pick(DENS); const a = rng.int(d + 1, 3 * d - 1), c = rng.int(1, 3 * d - 1);
      return compareProblem(a, d, c === a ? c + 1 : c, d);
    }
    if (kind === 'pointBig') {
      const d = rng.pick([3, 4, 6, 8]); let n = rng.int(d + 1, 3 * d - 1); if (n % d === 0) n -= 1;
      const p = pointFracProblem(rng, n, d, 3, false);
      p.explanation = [`Each whole is cut into ${d} parts of $${fr(1, d)}$.`, `Count by wholes first: each whole is ${d} parts.`, `Then count the rest. P is ${n} parts from 0.`, `P is at $${fr(n, d)}$.`];
      return p;
    }
    const [d1, d2] = rng.pick(PAIRS), k = d2 / d1, a = rng.int(1, d1 - 1);
    const ch = mc(rng, `$${fr(a * k, d2)}$`, [`$${fr(a, d2)}$`, `$${fr(a * k + 1, d2)}$`, `$${fr(d1, a)}$`, `$${fr(a + k, d2)}$`].filter((s) => s !== `$${fr(a * k, d2)}$`));
    return {
      prompt: `Which fraction is equal to $${fr(a, d1)}$? Use the number lines.`, figure: nlPairFig(1, d1, d2, a / d1),
      input: { type: 'choice', options: ch.options }, answer: ch.answer,
      explanation: [`Find P at $${fr(a, d1)}$ on the top line.`, `Look straight down to Q on the bottom line.`, `Q is ${a * k} parts out of ${d2}, so $${fr(a, d1)} = ${fr(a * k, d2)}$.`]
    };
  }

  // ======================================================================
  // Skill 3: Area & perimeter
  // ======================================================================
  const UNITS = [['cm', 'sq cm'], ['m', 'sq m'], ['in', 'sq in'], ['ft', 'sq ft']];
  const AREA_OR_PERIM = [
    ['put a fence around a garden', 1], ['cover a floor with tiles', 0], ['put ribbon around the edge of a card', 1],
    ['paint the top of a table', 0], ['put a frame around a picture', 1], ['cover a bulletin board with paper', 0],
    ['walk all the way around a park', 1], ['plant grass on a whole yard', 0], ['put a border around a poster', 1], ['lay a rug that covers a room', 0]
  ];
  function lShape(rng, maxW, maxH) {
    const W = rng.int(5, maxW), H = rng.int(4, maxH), cw = rng.int(2, W - 2), ch = rng.int(2, H - 2);
    let pts = [[0, 0], [W - cw, 0], [W - cw, ch], [W, ch], [W, H], [0, H]];
    let split = [[W - cw, ch], [W - cw, H]];
    const fx = rng.bool(), fy = rng.bool();
    const tf = ([x, y]) => [fx ? W - x : x, fy ? H - y : y];
    pts = pts.map(tf); split = split.map(tf);
    const sides = [W - cw, ch, cw, H - ch, W, H];
    return { W, H, cw, ch, pts, split, sides, area: W * H - cw * ch, perim: 2 * (W + H), A1: (W - cw) * H, A2: cw * (H - ch) };
  }
  function lCells(L) {
    const cells = [];
    for (let r = 0; r < L.H; r++) for (let c = 0; c < L.W; c++) {
      const inNotch = c >= L.W - L.cw && r < L.ch;
      if (!inNotch) cells.push([c, r]);
    }
    return cells;
  }

  function genArea(rng, level) {
    const nm = util.name(rng);
    if (level === 1) {
      const kind = rng.pick(['area', 'area', 'perim', 'perim', 'which']);
      const w = rng.int(2, 7), h = rng.int(2, 5);
      if (kind === 'area') return {
        prompt: rng.bool() ? 'Each small square is 1 square unit. What is the area of the rectangle?' : 'Count the unit squares. What is the area?',
        figure: gridRectFig(w, h), input: { type: 'number', unit: 'square units' }, answer: w * h, hint: `Count one row, then count the rows.`,
        explanation: [`Area is how many squares cover the shape.`, `Each row has ${w} squares. There are ${h} rows.`, `$${h} ${TIMES} ${w} = ${w * h}$, so the area is ${w * h} square units.`]
      };
      if (kind === 'perim') return {
        prompt: 'Each side of a small square is 1 unit long. What is the perimeter of the rectangle?',
        figure: gridRectFig(w, h), input: { type: 'number', unit: 'units' }, answer: 2 * (w + h), hint: 'Perimeter is the distance all the way around.',
        explanation: [`Perimeter is the distance around the outside.`, `The top and bottom are ${w} units each. The sides are ${h} units each.`, `$${w} + ${h} + ${w} + ${h} = ${2 * (w + h)}$ units.`]
      };
      const [task, ans] = rng.pick(AREA_OR_PERIM);
      return {
        prompt: `${nm} wants to ${task}. Should ${nm} find the area or the perimeter?`,
        input: { type: 'choice', options: ['Area', 'Perimeter'] }, answer: ans,
        explanation: ans ? [`This goes around the <b>edge</b>.`, `The distance around is the perimeter.`] : [`This <b>covers</b> the whole flat space inside.`, `Covering the inside is area.`]
      };
    }
    if (level === 2) {
      const kind = rng.pick(['area', 'perim', 'missA', 'missP', 'wordA', 'wordP', 'gridBig']);
      const [u, su] = rng.pick(UNITS);
      const w = rng.int(3, 10), h = rng.int(2, 9);
      if (kind === 'area') return {
        prompt: 'What is the area of this rectangle?', figure: rectFig(w, h, `${w} ${u}`, `${h} ${u}`),
        input: { type: 'number', unit: su }, answer: w * h,
        explanation: [`Area of a rectangle = length × width.`, `$${w} ${TIMES} ${h} = ${w * h}$.`, `The area is ${w * h} ${su}.`]
      };
      if (kind === 'perim') return {
        prompt: 'What is the perimeter of this rectangle?', figure: rectFig(w, h, `${w} ${u}`, `${h} ${u}`),
        input: { type: 'number', unit: u }, answer: 2 * (w + h), hint: 'Opposite sides of a rectangle are the same length.',
        explanation: [`Opposite sides are equal, so the sides are ${w}, ${h}, ${w} and ${h}.`, `Add all four: $${w} + ${h} + ${w} + ${h} = ${2 * (w + h)}$.`, `The perimeter is ${2 * (w + h)} ${u}.`]
      };
      if (kind === 'missA') return {
        prompt: `The area of this rectangle is ${w * h} ${su}. What is the missing side length?`, figure: rectFig(w, h, `${w} ${u}`, `? ${u}`),
        input: { type: 'number', unit: u }, answer: h,
        explanation: [`Area = length × width, so $${w} ${TIMES} ${BOX} = ${w * h}$.`, `$${w * h} ${DIV} ${w} = ${h}$.`, `The missing side is ${h} ${u}.`]
      };
      if (kind === 'missP') {
        const P = 2 * (w + h);
        return {
          prompt: `The perimeter of this rectangle is ${P} ${u}. What is the missing side length?`, figure: rectFig(w, h, `${w} ${u}`, `? ${u}`),
          input: { type: 'number', unit: u }, answer: h,
          explanation: [`The two ${w} ${u} sides add to $${w} + ${w} = ${2 * w}$.`, `The other two sides share the rest: $${P} - ${2 * w} = ${2 * h}$.`, `Each one is $${2 * h} ${DIV} 2 = ${h}$ ${u}.`]
        };
      }
      if (kind === 'wordA') {
        const thing = rng.pick(['rug', 'garden', 'sandbox', 'poster', 'blanket', 'patio']);
        return {
          prompt: `A ${thing} is ${w} ${u} long and ${h} ${u} wide. What is its area?`, input: { type: 'number', unit: su }, answer: w * h,
          explanation: [`Area = length × width.`, `$${w} ${TIMES} ${h} = ${w * h}$.`, `The ${thing} has an area of ${w * h} ${su}.`]
        };
      }
      if (kind === 'wordP') {
        const thing = rng.pick(['garden', 'pool', 'playground', 'field', 'pen for a goat', 'yard']);
        return {
          prompt: `${nm} puts a fence around a ${thing} that is ${w} ${u} long and ${h} ${u} wide. How much fence is needed?`, input: { type: 'number', unit: u }, answer: 2 * (w + h),
          explanation: [`A fence goes around the edge, so find the perimeter.`, `$${w} + ${h} + ${w} + ${h} = ${2 * (w + h)}$.`, `${nm} needs ${2 * (w + h)} ${u} of fence.`]
        };
      }
      const gw = rng.int(6, 10), gh = rng.int(4, 8);
      return {
        prompt: 'Use multiplication to find the area. Each square is 1 square unit.', figure: gridRectFig(gw, gh),
        input: { type: 'number', unit: 'square units' }, answer: gw * gh,
        explanation: [`Count the squares in one row: ${gw}.`, `Count the rows: ${gh}.`, `$${gh} ${TIMES} ${gw} = ${gw * gh}$ square units.`]
      };
    }
    // Level 3
    const kind = rng.pick(['lGrid', 'lArea', 'lArea', 'lPerim', 'lMissing', 'samePerim', 'samePerimDiff', 'sameArea', 'maxArea']);
    const [u, su] = rng.pick(UNITS);
    if (kind === 'lGrid') {
      const L = lShape(rng, 8, 6);
      const cells = lCells(L);
      // apply same flips used for the outline
      const fx = L.pts[0][0] !== 0, fy = L.pts[0][1] !== 0;
      const fc = cells.map(([c, r]) => [fx ? L.W - 1 - c : c, fy ? L.H - 1 - r : r]);
      const leftCols = L.W - L.cw;
      return {
        prompt: 'Each square is 1 square unit. What is the area of this shape?',
        figure: gridShapeFig(L.W, L.H, fc, L.pts, { colorOf: (c) => ((fx ? L.W - 1 - c : c) < leftCols ? 'var(--accent)' : 'var(--accent-2)') }),
        input: { type: 'number', unit: 'square units' }, answer: L.area,
        explanation: [`Split the shape into two rectangles (two colours).`, `First rectangle: $${leftCols} ${TIMES} ${L.H} = ${L.A1}$.`, `Second rectangle: $${L.cw} ${TIMES} ${L.H - L.ch} = ${L.A2}$.`, `Add: $${L.A1} + ${L.A2} = ${L.area}$ square units.`]
      };
    }
    if (kind === 'lArea' || kind === 'lPerim' || kind === 'lMissing') {
      const L = lShape(rng, 10, 8);
      const labels = L.sides.map((s) => `${s} ${u}`);
      if (kind === 'lArea') return {
        prompt: 'What is the area of this shape? Hint: split it into two rectangles.',
        figure: labeledPolyFig(L.pts, labels, { split: L.split, inside: [1, 2] }), input: { type: 'number', unit: su }, answer: L.area,
        explanation: [`Cut along the dashed line to make two rectangles.`, `Big part: $${L.W - L.cw} ${TIMES} ${L.H} = ${L.A1}$ ${su}.`, `Small part: $${L.cw} ${TIMES} ${L.H - L.ch} = ${L.A2}$ ${su}.`, `Total: $${L.A1} + ${L.A2} = ${L.area}$ ${su}.`]
      };
      if (kind === 'lPerim') return {
        prompt: 'What is the perimeter of this shape?',
        figure: labeledPolyFig(L.pts, labels, { inside: [1, 2] }), input: { type: 'number', unit: u }, answer: L.perim,
        explanation: [`Perimeter means adding every side all the way around.`, `There are 6 sides: ${L.sides.join(', ')}.`, `$${L.sides.join(' + ')} = ${L.perim}$.`, `The perimeter is ${L.perim} ${u}.`]
      };
      const hide = rng.pick([0, 1, 2, 3]); // a notch side or partial side
      const lab2 = labels.slice(); lab2[hide] = `? ${u}`;
      const ans = L.sides[hide];
      const why = {
        0: `The bottom is ${L.W} ${u}. The short top part is ${L.cw} ${u}. So $${L.W} - ${L.cw} = ${ans}$.`,
        1: `The tall side is ${L.H} ${u}. The other side part is ${L.H - L.ch} ${u}. So $${L.H} - ${L.H - L.ch} = ${ans}$.`,
        2: `The bottom is ${L.W} ${u}. The long top part is ${L.W - L.cw} ${u}. So $${L.W} - ${L.W - L.cw} = ${ans}$.`,
        3: `The tall side is ${L.H} ${u}. The short side part is ${L.ch} ${u}. So $${L.H} - ${L.ch} = ${ans}$.`
      }[hide];
      return {
        prompt: 'All the corners are square corners. What is the missing side length?',
        figure: labeledPolyFig(L.pts, lab2, { inside: [1, 2] }), input: { type: 'number', unit: u }, answer: ans,
        explanation: [`Two short sides together match the long side across from them.`, why, `The missing side is ${ans} ${u}.`]
      };
    }
    if (kind === 'samePerim' || kind === 'samePerimDiff') {
      const s = rng.int(6, 11); // half-perimeter
      let a1 = rng.int(1, Math.floor(s / 2)), b1 = rng.int(1, Math.floor(s / 2)); while (b1 === a1) b1 = rng.int(1, Math.floor(s / 2));
      const A = [s - a1, a1], B = [s - b1, b1]; const aA = A[0] * A[1], aB = B[0] * B[1];
      const fig = rectPairFig(A, B, u);
      if (kind === 'samePerim') return {
        prompt: `Both rectangles have a perimeter of ${2 * s} ${u}. Which one has the larger area?`, figure: fig,
        input: { type: 'choice', options: ['Rectangle A', 'Rectangle B', 'They are the same'] }, answer: aA > aB ? 0 : 1,
        explanation: [`Same perimeter does not mean same area!`, `A: $${A[0]} ${TIMES} ${A[1]} = ${aA}$ ${su}.`, `B: $${B[0]} ${TIMES} ${B[1]} = ${aB}$ ${su}.`, `Rectangle ${aA > aB ? 'A' : 'B'} has more area. Shapes closer to a square hold more.`]
      };
      return {
        prompt: `Both rectangles have a perimeter of ${2 * s} ${u}. How much bigger is the larger area than the smaller area?`, figure: fig,
        input: { type: 'number', unit: su }, answer: Math.abs(aA - aB),
        explanation: [`A: $${A[0]} ${TIMES} ${A[1]} = ${aA}$ ${su}.`, `B: $${B[0]} ${TIMES} ${B[1]} = ${aB}$ ${su}.`, `Difference: $${Math.max(aA, aB)} - ${Math.min(aA, aB)} = ${Math.abs(aA - aB)}$ ${su}.`]
      };
    }
    if (kind === 'sameArea') {
      const P = rng.pick([12, 16, 18, 20, 24, 30, 36]);
      const facs = []; for (let a = 1; a * a <= P; a++) if (P % a === 0 && P / a <= 12) facs.push([P / a, a]);
      const [A, B] = rng.sample(facs, 2); const pA = 2 * (A[0] + A[1]), pB = 2 * (B[0] + B[1]);
      return {
        prompt: `Both rectangles have an area of ${P} ${su}. Which one needs more fence to go around it?`, figure: rectPairFig(A, B, u),
        input: { type: 'choice', options: ['Rectangle A', 'Rectangle B', 'They are the same'] }, answer: pA > pB ? 0 : 1,
        explanation: [`Fence goes around, so compare perimeters.`, `A: $${A[0]} + ${A[1]} + ${A[0]} + ${A[1]} = ${pA}$ ${u}.`, `B: $${B[0]} + ${B[1]} + ${B[0]} + ${B[1]} = ${pB}$ ${u}.`, `Rectangle ${pA > pB ? 'A' : 'B'} needs more fence.`]
      };
    }
    const s = rng.int(5, 12), P = 2 * s, a = Math.floor(s / 2), b = s - a;
    return {
      prompt: `${nm} has ${P} ${u} of fence to make a rectangle pen. The sides are whole numbers. What is the <b>largest</b> area the pen can have?`,
      input: { type: 'number', unit: su }, answer: a * b,
      explanation: [`Length + width must be half the fence: $${P} ${DIV} 2 = ${s}$.`, `Try pairs: $1 + ${s - 1}$ gives ${s - 1}, $2 + ${s - 2}$ gives ${2 * (s - 2)}, and so on.`, `The closer to a square, the bigger: $${a} ${TIMES} ${b} = ${a * b}$.`, `The largest area is ${a * b} ${su}.`]
    };
  }

  // ======================================================================
  // Skill 4: Place value, rounding, add & subtract within 1000
  // ======================================================================
  const round10 = (n) => Math.round(n / 10) * 10;
  const round100 = (n) => Math.round(n / 100) * 100;
  const PLACE = ['ones', 'tens', 'hundreds'];
  function roundSteps(n, to) {
    const place = to === 10 ? 'ones' : 'tens';
    const dig = to === 10 ? n % 10 : Math.floor(n / 10) % 10;
    const lo = Math.floor(n / to) * to, hi = lo + to, r = to === 10 ? round10(n) : round100(n);
    return [`${n} is between ${util.fmt(lo)} and ${util.fmt(hi)}.`, `Look at the ${place} digit: ${dig}.`, dig >= 5 ? `${dig} is 5 or more, so round up.` : `${dig} is less than 5, so round down.`, `${n} rounds to ${util.fmt(r)}.`];
  }
  function regroupAdd(rng) {
    for (;;) { const a = rng.int(105, 789), b = rng.int(105, 899 - a + 100); const s = a + b; if (s > 999 || b < 100) continue; if ((a % 10) + (b % 10) >= 10 || (Math.floor(a / 10) % 10) + (Math.floor(b / 10) % 10) >= 10) return [a, b]; }
  }
  function regroupSub(rng) {
    for (;;) { const a = rng.int(300, 999), b = rng.int(101, a - 50); if ((a % 10) < (b % 10) || (Math.floor(a / 10) % 10) < (Math.floor(b / 10) % 10)) return [a, b]; }
  }
  function addSteps(a, b) {
    const o = (a % 10) + (b % 10), t = (Math.floor(a / 10) % 10) + (Math.floor(b / 10) % 10) + (o >= 10 ? 1 : 0);
    return [`Line up the places and add the ones: $${a % 10} + ${b % 10} = ${o}$.${o >= 10 ? ' Write ' + (o % 10) + ', carry 1 ten.' : ''}`,
      `Add the tens${o >= 10 ? ' (plus the 1 you carried)' : ''}: ${t}.${t >= 10 ? ' Write ' + (t % 10) + ', carry 1 hundred.' : ''}`,
      `Add the hundreds and finish: $${a} + ${b} = ${a + b}$.`];
  }
  function subSteps(a, b) {
    const needOnes = (a % 10) < (b % 10);
    return [`Line up the places. Start with the ones.`, needOnes ? `${a % 10} is less than ${b % 10}, so trade 1 ten for 10 ones.` : `Subtract the ones: $${a % 10} - ${b % 10} = ${(a % 10) - (b % 10)}$.`,
      `Do the tens (trade 1 hundred for 10 tens if you need to), then the hundreds.`, `$${a} - ${b} = ${a - b}$. Check: $${a - b} + ${b} = ${a}$.`];
  }
  function genPlace(rng, level) {
    const nm = util.name(rng);
    if (level === 1) {
      const kind = rng.pick(['r10', 'r10', 'value', 'value', 'expanded', 'closer', 'place']);
      if (kind === 'r10') {
        let n = rng.bool(0.4) ? rng.int(11, 99) : rng.int(101, 999); if (n % 10 === 0) n += rng.int(1, 9);
        return { prompt: `Round ${n} to the nearest ten.`, input: { type: 'number' }, answer: round10(n), explanation: roundSteps(n, 10), hint: 'Look at the ones digit.' };
      }
      const digits = rng.sample([1, 2, 3, 4, 5, 6, 7, 8, 9], 3); const n = digits[0] * 100 + digits[1] * 10 + digits[2];
      if (kind === 'value') {
        const pi = rng.int(0, 2), dg = digits[2 - pi], val = dg * Math.pow(10, pi);
        return {
          prompt: `What is the value of the ${dg} in ${n}?`, input: { type: 'number' }, answer: val,
          explanation: [`${n} = ${digits[0]} hundreds, ${digits[1]} tens, ${digits[2]} ones.`, `The ${dg} is in the ${PLACE[pi]} place.`, `So it is worth ${val}.`]
        };
      }
      if (kind === 'place') {
        const pi = rng.int(0, 2), dg = digits[2 - pi];
        return {
          prompt: `In ${n}, which place is the ${dg} in?`, input: { type: 'choice', options: ['hundreds', 'tens', 'ones'] }, answer: 2 - pi,
          explanation: [`Read from the right: ones, then tens, then hundreds.`, `${n}: ${digits[0]} is hundreds, ${digits[1]} is tens, ${digits[2]} is ones.`, `The ${dg} is in the ${PLACE[pi]} place.`]
        };
      }
      if (kind === 'expanded') {
        if (rng.bool()) return {
          prompt: `What number is $${digits[0] * 100} + ${digits[1] * 10} + ${digits[2]}$?`, input: { type: 'number' }, answer: n,
          explanation: [`${digits[0] * 100} is ${digits[0]} hundreds, ${digits[1] * 10} is ${digits[1]} tens, ${digits[2]} is ${digits[2]} ones.`, `Put the digits in their places: ${n}.`]
        };
        return {
          prompt: `What number has ${digits[0]} hundreds, ${digits[1]} tens and ${digits[2]} ones?`, input: { type: 'number' }, answer: n,
          explanation: [`Hundreds digit: ${digits[0]}. Tens digit: ${digits[1]}. Ones digit: ${digits[2]}.`, `The number is ${n}.`]
        };
      }
      let m = rng.int(12, 98); if (m % 10 === 0 || m % 10 === 5) m += 1;
      const lo = Math.floor(m / 10) * 10, hi = lo + 10;
      return {
        prompt: `Is ${m} closer to ${lo} or ${hi}?`, input: { type: 'choice', options: [String(lo), String(hi)] }, answer: m % 10 >= 5 ? 1 : 0,
        explanation: [`${m} is ${m - lo} away from ${lo} and ${hi - m} away from ${hi}.`, `It is closer to ${round10(m)}.`]
      };
    }
    if (level === 2) {
      const kind = rng.pick(['r100', 'r100', 'add', 'add', 'sub', 'sub', 'wordAdd', 'wordSub']);
      if (kind === 'r100') {
        let n = rng.int(110, 980); if (n % 100 === 0) n += 7;
        return { prompt: `Round ${n} to the nearest hundred.`, input: { type: 'number' }, answer: round100(n), explanation: roundSteps(n, 100), hint: 'Look at the tens digit.' };
      }
      if (kind === 'add') { const [a, b] = regroupAdd(rng); return { prompt: `What is $${a} + ${b}$?`, input: { type: 'number' }, answer: a + b, explanation: addSteps(a, b) }; }
      if (kind === 'sub') { const [a, b] = regroupSub(rng); return { prompt: `What is $${a} - ${b}$?`, input: { type: 'number' }, answer: a - b, explanation: subSteps(a, b) }; }
      if (kind === 'wordAdd') {
        const [a, b] = regroupAdd(rng);
        const t = rng.pick([
          `${nm} read ${a} pages in June and ${b} pages in July. How many pages is that in all?`,
          `A farm has ${a} chickens and ${b} ducks. How many birds are on the farm?`,
          `On Saturday ${a} people went to the fair. On Sunday ${b} people went. How many people went in all?`,
          `${nm} scored ${a} points in the first game and ${b} points in the second. What is the total?`]);
        return { prompt: t, input: { type: 'number' }, answer: a + b, explanation: [`"In all" means add: $${a} + ${b}$.`].concat(addSteps(a, b).slice(1)) };
      }
      const [a, b] = regroupSub(rng);
      const t = rng.pick([
        `A library had ${a} books. It gave away ${b} books. How many books are left?`,
        `${nm} wants to collect ${a} stamps. ${nm} has ${b} so far. How many more does ${nm} need?`,
        `A school has ${a} kids. ${b} of them ride the bus. How many kids do not ride the bus?`,
        `A tall tree is ${a} cm. A small tree is ${b} cm. How much taller is the tall tree?`]);
      return { prompt: t, input: { type: 'number' }, answer: a - b, explanation: [`Find the difference: $${a} - ${b}$.`].concat(subSteps(a, b).slice(1)) };
    }
    // Level 3
    const kind = rng.pick(['estimate', 'estimate', 'roundsTo', 'roundsTo', 'missing', 'missing', 'extreme', 'twoStep']);
    if (kind === 'estimate') {
      const add = rng.bool(); const [a, b] = add ? regroupAdd(rng) : regroupSub(rng); const op = add ? '+' : '-';
      const ra = round100(a), rb = round100(b), est = add ? ra + rb : ra - rb, exact = add ? a + b : a - b;
      const story = add ? `A zoo had ${a} visitors in the morning and ${b} in the afternoon.` : `A store had ${a} toys. It sold ${b} toys.`;
      if (rng.bool()) return {
        prompt: `${story} Estimate by rounding each number to the nearest hundred. What is your estimate?`, input: { type: 'number' }, answer: est,
        explanation: [`${a} rounds to ${ra}. ${b} rounds to ${rb}.`, `$${ra} ${op} ${rb} = ${est}$.`, `The estimate is ${util.fmt(est)}. (The exact answer is ${exact}.)`]
      };
      return {
        prompt: `${story} ${add ? 'How many visitors in all?' : 'How many toys are left?'} First estimate, then find the exact answer.`, input: { type: 'number' }, answer: exact,
        explanation: [`Estimate: $${ra} ${op} ${rb} = ${est}$.`, `Exact: $${a} ${op} ${b} = ${exact}$.`, `${exact} is close to ${util.fmt(est)}, so the answer makes sense.`]
      };
    }
    if (kind === 'roundsTo') {
      const to = rng.pick([10, 100]);
      const X = to === 100 ? rng.int(2, 9) * 100 : rng.int(12, 98) * 10;
      const R = to === 100 ? round100 : round10, half = to / 2;
      const correct = X + rng.int(-half, half - 1);
      const cands = rng.shuffle([X + half + rng.int(0, half - 1), X - half - rng.int(1, half - 1), X + to + rng.int(-3, 3), X - to + rng.int(-3, 3), X + half, X - half - 1]).filter((v) => R(v) !== X && v > 0);
      const ch = mc(rng, String(correct), cands.map(String));
      return {
        prompt: `Which number rounds to ${X} when you round to the nearest ${to === 10 ? 'ten' : 'hundred'}?`, input: { type: 'choice', options: ch.options }, answer: ch.answer,
        explanation: [`Numbers from ${X - half} up to ${X + half - 1} round to ${X}.`, `${correct} is in that range.`, `So ${correct} rounds to ${X}.`]
      };
    }
    if (kind === 'missing') {
      const add = rng.bool(); const [a, b] = add ? regroupAdd(rng) : regroupSub(rng);
      const res = add ? a + b : a - b; const pi = rng.int(0, 2); const s = String(a);
      const hidden = s[2 - pi]; const shown = s.slice(0, 2 - pi) + BOX + s.slice(3 - pi);
      return {
        prompt: `What digit goes in the box? $${shown} ${add ? '+' : '-'} ${b} = ${res}$`, input: { type: 'number' }, answer: Number(hidden),
        explanation: add
          ? [`Undo the adding: $${res} - ${b} = ${a}$.`, `So the first number is ${a}.`, `The missing digit is ${hidden}.`]
          : [`Undo the subtracting: $${res} + ${b} = ${a}$.`, `So the first number is ${a}.`, `The missing digit is ${hidden}.`]
      };
    }
    if (kind === 'extreme') {
      const to = rng.pick([10, 100]); const X = to === 100 ? rng.int(2, 9) * 100 : rng.int(12, 98) * 10; const big = rng.bool();
      const ans = big ? X + to / 2 - 1 : X - to / 2;
      return {
        prompt: `What is the ${big ? 'greatest' : 'smallest'} whole number that rounds to ${X} when you round to the nearest ${to === 10 ? 'ten' : 'hundred'}?`, input: { type: 'number' }, answer: ans,
        explanation: [`Halfway numbers (ending in ${to === 10 ? '5' : '50'}) round up.`, `So the numbers that round to ${X} go from ${X - to / 2} to ${X + to / 2 - 1}.`, `The ${big ? 'greatest' : 'smallest'} is ${ans}.`]
      };
    }
    const s = rng.int(300, 650), g = rng.int(120, 340), l = rng.int(100, s + g - 50);
    return {
      prompt: `${nm} had ${s} points in a game. ${nm} won ${g} more points, then lost ${l} points. How many points does ${nm} have now?`, input: { type: 'number', unit: 'points' }, answer: s + g - l,
      explanation: [`Step 1: Add the points won: $${s} + ${g} = ${s + g}$.`, `Step 2: Take away the points lost: $${s + g} - ${l} = ${s + g - l}$.`, `${nm} has ${s + g - l} points.`]
    };
  }

  // ======================================================================
  // Skill 5: Telling time & elapsed time
  // ======================================================================
  const h12 = (H) => ((H % 12) + 11) % 12 + 1;
  const T = (t) => { t = ((t % 1440) + 1440) % 1440; const H = Math.floor(t / 60), m = t % 60; return `${h12(H)}:${pad(m)} ${H < 12 ? 'a.m.' : 'p.m.'}`; };
  const hm = (t) => { t = ((t % 1440) + 1440) % 1440; return { h: h12(Math.floor(t / 60)), m: t % 60 }; };
  const dig = (h, m) => `${h}:${pad(m)}`;
  const nextH = (h) => (h % 12) + 1, prevH = (h) => ((h + 10) % 12) + 1;
  function readClockSteps(h, m) {
    return [`The short hand is the hour hand. It is ${m === 0 ? 'right on the ' + h : 'past the ' + h + (m >= 30 ? ', getting close to the ' + nextH(h) : '')}, so the hour is ${h}.`,
      `The long hand is the minute hand. ${m % 5 === 0 ? 'Count by 5s from the 12' : 'Count by 5s, then count the little marks'}: ${m} minutes.`,
      `The time is ${dig(h, m)}.`];
  }
  function clockChoices(rng, h, m) {
    const swH = Math.floor(m / 5) || 12, swM = (h % 12) * 5;
    const cands = [
      dig(m >= 30 ? nextH(h) : prevH(h), m),
      dig(swH, swM),
      m % 5 === 0 && m > 0 ? dig(h, m / 5) : dig(h, (m + 2) % 60),
      dig(h, (60 - m) % 60),
      dig(h, (m + 5) % 60), dig(h, (m + 55) % 60)
    ];
    return mc(rng, dig(h, m), cands);
  }
  const EVENTS = [
    ['Soccer practice', 15 * 60, 17 * 60], ['The school play', 9 * 60, 11 * 60], ['Swim class', 8 * 60, 11 * 60 + 30],
    ['The movie', 12 * 60 + 30, 19 * 60], ['Piano lesson', 15 * 60, 18 * 60], ['The bus ride to the zoo', 7 * 60 + 30, 10 * 60],
    ['Art club', 10 * 60, 15 * 60], ['The baking class', 9 * 60, 16 * 60], ['The science show', 10 * 60, 14 * 60], ['Karate class', 16 * 60, 19 * 60]
  ];
  function elapsedSteps(t0, dur) {
    const st = []; let t = t0, left = dur; const m0 = t0 % 60;
    if (m0 && left >= 60 - m0) { st.push(`From ${T(t)} to ${T(t + 60 - m0)} is ${60 - m0} minutes.`); t += 60 - m0; left -= 60 - m0; st.push(`$${dur} - ${60 - m0} = ${left}$ minutes are left.`); }
    if (left >= 60) { const k = Math.floor(left / 60); st.push(`Add ${k} ${pl(k, 'hour', 'hours')}: ${T(t)} to ${T(t + 60 * k)}.`); t += 60 * k; left -= 60 * k; }
    if (left > 0) st.push(`Add ${left} more minutes: ${T(t)} to ${T(t + left)}.`);
    st.push(`So it ends at ${T(t0 + dur)}.`);
    return st.slice(0, 5);
  }
  function durWords(d) { const h = Math.floor(d / 60), m = d % 60; return h ? `${h} hour${h > 1 ? 's' : ''}${m ? ' ' + m + ' minutes' : ''}` : `${m} minutes`; }

  function genTime(rng, level) {
    const nm = util.name(rng);
    if (level === 1) {
      const kind = rng.pick(['read', 'read', 'read', 'set', 'set', 'setWords']);
      const h = rng.int(1, 12), m = rng.int(0, 11) * 5;
      if (kind === 'read') {
        const ch = clockChoices(rng, h, m);
        return { prompt: 'What time does the clock show?', figure: clockFig(h, m), input: { type: 'choice', options: ch.options }, answer: ch.answer, explanation: readClockSteps(h, m), hint: 'Short hand = hour. Long hand = minutes.' };
      }
      if (kind === 'set') return {
        prompt: `Set the clock to ${dig(h, m)}.`, input: { type: 'clock' }, answer: { h, m },
        explanation: [`Put the long minute hand on ${m === 0 ? 'the 12' : 'the ' + (m / 5) + ' (that is ' + m + ' minutes)'}.`, `Put the short hour hand ${m === 0 ? 'on the ' + h : 'just past the ' + h}.`, `Now the clock shows ${dig(h, m)}.`]
      };
      const opts = [[0, `${h} o'clock`], [30, `half past ${h}`], [m, `${m} minutes after ${h}`]];
      const [mm, words] = rng.pick(opts.filter((o) => o[0] !== 0 || true));
      return {
        prompt: `Set the clock to <b>${mm === 0 ? `${h} o'clock` : words}</b>.`, input: { type: 'clock' }, answer: { h, m: mm },
        explanation: [mm === 0 ? `"o'clock" means 0 minutes. The minute hand points to 12.` : mm === 30 ? `"Half past" means 30 minutes. The minute hand points to 6.` : `${mm} minutes: count by 5s to the ${mm / 5}.`, `The hour hand goes ${mm === 0 ? 'right on' : 'a bit past'} the ${h}.`, `That is ${dig(h, mm)}.`]
      };
    }
    if (level === 2) {
      const kind = rng.pick(['read', 'read', 'set', 'set', 'quarterSet', 'quarterChoice', 'toNext']);
      const h = rng.int(1, 12); let m = rng.int(1, 58); if (m % 5 === 0) m += 1;
      if (kind === 'read') {
        const ch = clockChoices(rng, h, m);
        return { prompt: 'What time does the clock show? Look closely at the little minute marks.', figure: clockFig(h, m), input: { type: 'choice', options: ch.options }, answer: ch.answer, explanation: readClockSteps(h, m) };
      }
      if (kind === 'set') return {
        prompt: `Set the clock to ${dig(h, m)}.`, input: { type: 'clock' }, answer: { h, m },
        explanation: [`${m} minutes = ${Math.floor(m / 5)} jumps of 5 and ${m % 5} more ${pl(m % 5, 'mark', 'marks')}.`, `Point the minute hand there: just past the ${Math.floor(m / 5) || 12}.`, `The hour hand sits between the ${h} and the ${nextH(h)}${m >= 30 ? ', closer to the ' + nextH(h) : ''}.`]
      };
      const q = rng.pick([['quarter past', 15, 0], ['half past', 30, 0], ['quarter to', 45, -1]]);
      const wordsH = h, ansH = q[2] ? prevH(h) : h, mm = q[1];
      const expl = [`${q[0] === 'quarter past' ? '"Quarter past" means 15 minutes after the hour.' : q[0] === 'half past' ? '"Half past" means 30 minutes after the hour.' : '"Quarter to" means 15 minutes before the hour.'}`,
        q[2] ? `15 minutes before ${wordsH}:00 is ${dig(ansH, 45)}.` : `${mm} minutes after ${wordsH}:00 is ${dig(ansH, mm)}.`, `The time is ${dig(ansH, mm)}.`];
      if (kind === 'quarterSet') return { prompt: `Set the clock to <b>${q[0]} ${wordsH}</b>.`, input: { type: 'clock' }, answer: { h: ansH, m: mm }, explanation: expl };
      if (kind === 'quarterChoice') {
        if (rng.bool()) {
          const ch = mc(rng, dig(ansH, mm), [dig(wordsH, 45), dig(nextH(wordsH), mm), dig(wordsH, 15), dig(ansH, 15), dig(wordsH, 30), dig(prevH(wordsH), 15)]);
          return { prompt: `What time is <b>${q[0]} ${wordsH}</b>?`, input: { type: 'choice', options: ch.options }, answer: ch.answer, explanation: expl };
        }
        const names = [`quarter past ${ansH}`, `half past ${ansH}`, `quarter to ${nextH(ansH)}`];
        const correct = names[[15, 30, 45].indexOf(mm)];
        const ch = mc(rng, correct, rng.shuffle(names.concat([`quarter to ${ansH}`, `half past ${nextH(ansH)}`])));
        return { prompt: 'Which words tell the time on the clock?', figure: clockFig(ansH, mm), input: { type: 'choice', options: ch.options }, answer: ch.answer, explanation: [`The clock shows ${dig(ansH, mm)}.`].concat(expl.slice(0, 1), [`So it is ${correct}.`]) };
      }
      return {
        prompt: `The clock says ${dig(h, m)}. How many minutes until ${nextH(h)} o'clock?`, figure: clockFig(h, m), input: { type: 'number', unit: 'minutes' }, answer: 60 - m,
        explanation: [`There are 60 minutes in an hour.`, `It is ${m} minutes past ${h}.`, `$60 - ${m} = ${60 - m}$ minutes to go.`]
      };
    }
    // Level 3
    const kind = rng.pick(['end', 'end', 'end', 'howLong', 'howLong', 'start', 'clockEnd']);
    const [what, lo, hi] = rng.pick(EVENTS);
    const exact = rng.bool(0.4);
    let t0 = rng.int(Math.floor(lo / 5), Math.floor(hi / 5)) * 5; if (exact) t0 += rng.int(1, 4);
    const m0 = t0 % 60;
    const dur = Math.max(60 - m0 + rng.int(1, 40), rng.int(15, 100)) ;
    const d5 = exact ? dur : Math.round(dur / 5) * 5 || 15;
    if (kind === 'end') {
      const D = (t0 % 60) + d5 < 60 ? d5 + (60 - (t0 % 60)) : d5;
      return {
        prompt: `${what} starts at ${T(t0)}. It lasts ${durWords(D)}. What time does it end? Set the clock.`, input: { type: 'clock' }, answer: hm(t0 + D),
        explanation: elapsedSteps(t0, D)
      };
    }
    if (kind === 'howLong') {
      const D = Math.max(d5, 60 - m0 + 5), t1 = t0 + D;
      const toNext = m0 ? 60 - m0 : 0;
      const st = [];
      if (toNext) st.push(`From ${T(t0)} to ${T(t0 + toNext)} is ${toNext} minutes.`);
      const rest = D - toNext;
      if (rest >= 60) st.push(`From ${T(t0 + toNext)} to ${T(t0 + toNext + 60 * Math.floor(rest / 60))} is ${Math.floor(rest / 60) * 60} minutes.`);
      if (rest % 60) st.push(`Then ${rest % 60} more minutes to ${T(t1)}.`);
      st.push(`Add them up: ${D} minutes.`);
      return {
        prompt: `${what} starts at ${T(t0)} and ends at ${T(t1)}. How many minutes long is it?`, input: { type: 'number', unit: 'minutes' }, answer: D,
        hint: 'Jump to the next hour first.', explanation: st.slice(0, 5)
      };
    }
    if (kind === 'start') {
      const D = Math.max(d5, 60 - m0 + 5), t1 = t0 + D;
      return {
        prompt: `${nm} finished reading at ${T(t1)}. ${nm} read for ${durWords(D)}. What time did ${nm} start? Set the clock.`, input: { type: 'clock' }, answer: hm(t0),
        explanation: (t1 % 60
          ? [`Count backward from ${T(t1)}.`, `Back to ${T(t1 - (t1 % 60))} is ${t1 % 60} minutes.`, `$${D} - ${t1 % 60} = ${D - (t1 % 60)}$ more minutes back.`, `${nm} started at ${T(t0)}.`]
          : [`Count backward from ${T(t1)}.`, `Go back ${durWords(D)}.`, `${nm} started at ${T(t0)}.`])
      };
    }
    const t = rng.int(1, 12) * 60 + rng.int(6, 11) * 5 - (exact ? rng.int(1, 4) : 0);
    const D = rng.int(4, 11) * 5;
    const st = hm(t);
    return {
      prompt: `The clock shows when ${nm} starts walking to the park. The walk takes ${D} minutes. What time does ${nm} get there? Set the clock.`, figure: clockFig(st.h, st.m),
      input: { type: 'clock' }, answer: hm(t + D),
      explanation: [`The clock shows ${dig(st.h, st.m)}.`, (st.m + D >= 60) ? `To the next hour is ${60 - st.m} minutes. $${D} - ${60 - st.m} = ${D - (60 - st.m)}$ minutes left.` : `Add the minutes: $${st.m} + ${D} = ${st.m + D}$.`, `${nm} gets there at ${dig(hm(t + D).h, hm(t + D).m)}.`]
    };
  }

  // ======================================================================
  // Lab 1: Array Builder (browser only)
  // ======================================================================
  function mountArrays(el, api) {
    const { h, svg, tex } = api;
    const N = 10, CS = 28, OX = 34, OY = 32, RM = 34;
    const W = OX + N * CS + RM, H = OY + N * CS + 12;
    let R = 4, C = 6, tiles = false, split = false, K = 2, ci = 0;

    const style = h('style', { text: `
      .ab-step{display:inline-flex;align-items:center;gap:6px;background:var(--surface-2);border-radius:999px;padding:3px}
      .ab-step b{min-width:4.6em;text-align:center;font-variant-numeric:tabular-nums}
      .ab-step button{width:36px;height:36px;border-radius:50%;border:2px solid var(--line);background:var(--surface);color:var(--ink);font-size:1.2rem;font-weight:700;cursor:pointer;line-height:1}
      .ab-step button:active{transform:scale(.94)}
      .ab-facts{display:flex;flex-direction:column;gap:2px;font-size:1rem;color:var(--muted)}
      .ab-facts .big{font-family:var(--font-display);font-size:1.3rem;color:var(--ink);font-weight:600}
      .ab-c1{color:var(--accent);font-weight:700}.ab-c2{color:var(--accent-2);font-weight:700}
      .ab-done{color:var(--good);font-weight:700}
    ` });
    const s = svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Array builder grid', style: 'touch-action:none;user-select:none;-webkit-user-select:none' });
    const gGhost = svg('g'), gCells = svg('g'), gLab = svg('g'), gSplit = svg('g'), gHandle = svg('g', { style: 'pointer-events:none' });
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) gGhost.appendChild(svg('circle', { cx: OX + j * CS + CS / 2, cy: OY + i * CS + CS / 2, r: 3, fill: 'var(--muted)', 'fill-opacity': 0.35 }));
    const hit = svg('rect', { x: OX, y: OY, width: N * CS, height: N * CS, fill: 'transparent' });
    s.append(gGhost, gCells, hit, gLab, gHandle, gSplit);

    const setSize = (p) => {
      const nc = clamp(Math.ceil((p.x - OX) / CS), 1, N), nr = clamp(Math.ceil((p.y - OY) / CS), 1, N);
      if (nc !== C || nr !== R) { C = nc; R = nr; K = clamp(K, 1, Math.max(1, R - 1)); draw(); }
    };
    api.drag(s, hit, setSize);

    // split handle: wide invisible bar + knob
    const splitBar = svg('rect', { x: OX - 4, y: 0, width: 10, height: 24, fill: 'transparent' });
    const splitLine = svg('line', { stroke: 'var(--ink)', 'stroke-width': 3, 'stroke-dasharray': '7 5', 'pointer-events': 'none' });
    const knob = svg('g', {});
    const knobC = svg('circle', { r: 13, fill: 'var(--ink)' });
    const knobT = svg('path', { d: 'M-5 -3 L0 -8 L5 -3 M-5 3 L0 8 L5 3', stroke: 'var(--surface)', 'stroke-width': 2.2, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
    knob.append(knobC, knobT);
    gSplit.append(splitLine, splitBar, knob);
    const moveSplit = (p) => { const k = clamp(Math.round((p.y - OY) / CS), 1, R - 1); if (k !== K) { K = k; draw(); } };
    api.drag(s, splitBar, moveSplit); api.drag(s, knob, moveSplit);

    // controls
    const rowsVal = h('b'), colsVal = h('b');
    const stepper = (label, valEl, d) => h('span', { class: 'ab-step' },
      h('button', { 'aria-label': 'fewer ' + label, onclick: () => d(-1) }, '−'), valEl,
      h('button', { 'aria-label': 'more ' + label, onclick: () => d(1) }, '+'));
    const dotsBtn = h('button', { class: 'btn-small', onclick: () => { tiles = false; draw(); } }, 'Dots');
    const tilesBtn = h('button', { class: 'btn-small', onclick: () => { tiles = true; draw(); } }, 'Squares');
    const splitBtn = h('button', { class: 'btn-small', onclick: () => { if (R < 2) R = 2; split = !split; K = clamp(K, 1, R - 1); draw(); } }, '✂ Split it');
    const readout = h('div', { class: 'lab-readout', 'aria-live': 'polite' });
    const facts = h('div', { class: 'ab-facts' });

    const CH = [
      { t: 'Make 3 rows of 7. How many dots is that?', ok: () => R === 3 && C === 7 },
      { t: 'Build an array of 18 with just 2 rows.', ok: () => R === 2 && C === 9 },
      { t: 'Make a square array with 36 dots.', ok: () => R === 6 && C === 6 },
      { t: 'Turn on Squares. Make a rectangle with area 20 and perimeter 18.', ok: () => tiles && R * C === 20 && 2 * (R + C) === 18 },
      { t: 'Split 8 × 6 into 5 × 6 and 3 × 6.', ok: () => split && R === 8 && C === 6 && K === 5 },
      { t: 'Show 28 ÷ 4 as 4 rows. How many in each row?', ok: () => R === 4 && C === 7 },
      { t: 'Find a rectangle with area 24 that is NOT 4 × 6 or 6 × 4.', ok: () => tiles && R * C === 24 && !((R === 4 && C === 6) || (R === 6 && C === 4)) }
    ];
    const chText = h('span'), chState = h('span', { class: 'chip' });
    const chNext = h('button', { class: 'btn-small', onclick: () => { ci = (ci + 1) % CH.length; draw(); } }, 'Next ›');
    const tryBox = h('div', { class: 'try lab-row', style: { justifyContent: 'space-between' } }, h('span', {}, h('b', {}, 'Try this: '), chText), h('span', { class: 'lab-row', style: { gap: '6px' } }, chState, chNext));

    el.append(style,
      h('div', { class: 'lab-row' }, h('span', { class: 'muted', style: { fontSize: '.9rem' } }, 'Drag on the grid, or use the buttons.')),
      s,
      h('div', { class: 'lab-row' }, stepper('rows', rowsVal, (d) => { R = clamp(R + d, split ? 2 : 1, N); K = clamp(K, 1, R - 1); draw(); }), stepper('columns', colsVal, (d) => { C = clamp(C + d, 1, N); draw(); })),
      h('div', { class: 'lab-row' }, dotsBtn, tilesBtn, splitBtn),
      readout, facts, tryBox);

    function draw() {
      if (split && R < 2) split = false;
      K = clamp(K, 1, Math.max(1, R - 1));
      rowsVal.textContent = R + (R === 1 ? ' row' : ' rows');
      colsVal.textContent = C + (C === 1 ? ' column' : ' columns');
      dotsBtn.classList.toggle('on', !tiles); tilesBtn.classList.toggle('on', tiles); splitBtn.classList.toggle('on', split);
      gCells.textContent = '';
      for (let i = 0; i < R; i++) for (let j = 0; j < C; j++) {
        const col = split && i >= K ? 'var(--accent-2)' : 'var(--accent)';
        const x = OX + j * CS, y = OY + i * CS;
        if (tiles) gCells.appendChild(svg('rect', { x: x, y: y, width: CS, height: CS, fill: 'var(--surface)' })), gCells.appendChild(svg('rect', { x: x + 1, y: y + 1, width: CS - 2, height: CS - 2, rx: 3, fill: col, 'fill-opacity': 0.75, stroke: col, 'stroke-width': 1 }));
        else gCells.appendChild(svg('circle', { cx: x + CS / 2, cy: y + CS / 2, r: 10, fill: col }));
      }
      if (tiles) gCells.appendChild(svg('rect', { x: OX, y: OY, width: C * CS, height: R * CS, fill: 'none', stroke: 'var(--ink)', 'stroke-width': 3, rx: 2 }));
      gLab.textContent = '';
      const lt = (x, y, t, col, anchor) => gLab.appendChild(svg('text', { x, y, 'font-size': 15, 'font-weight': 700, fill: col || 'var(--ink)', 'text-anchor': anchor || 'middle', 'font-family': 'inherit', text: t }));
      lt(OX + C * CS / 2, OY - 10, String(C));
      if (split) { lt(OX - 10, OY + K * CS / 2 + 5, String(K), 'var(--accent)', 'end'); lt(OX - 10, OY + (K + R) * CS / 2 + 5, String(R - K), 'var(--accent-2)', 'end'); }
      else lt(OX - 10, OY + R * CS / 2 + 5, String(R), 'var(--ink)', 'end');
      gHandle.textContent = '';
      const hx = OX + C * CS, hy = OY + R * CS;
      gHandle.appendChild(svg('circle', { cx: hx, cy: hy, r: 12, fill: 'var(--surface)', stroke: 'var(--ink)', 'stroke-width': 3 }));
      gHandle.appendChild(svg('path', { d: `M${hx - 4} ${hy + 4} L${hx + 4} ${hy - 4} M${hx + 4} ${hy - 4} l-5 0 M${hx + 4} ${hy - 4} l0 5`, stroke: 'var(--ink)', 'stroke-width': 2, 'stroke-linecap': 'round', fill: 'none' }));
      gSplit.style.display = split ? '' : 'none';
      if (split) {
        const y = OY + K * CS;
        splitLine.setAttribute('x1', OX - 4); splitLine.setAttribute('x2', OX + C * CS + 4); splitLine.setAttribute('y1', y); splitLine.setAttribute('y2', y);
        splitBar.setAttribute('y', y - 12); splitBar.setAttribute('width', C * CS + 8);
        knob.setAttribute('transform', `translate(${OX + C * CS + 20},${y})`);
      }
      const P = R * C;
      readout.textContent = '';
      if (split) {
        const a = K * C, b = (R - K) * C;
        readout.style.fontSize = '1.15rem';
        readout.append(`${R} × ${C} = `, h('span', { class: 'ab-c1' }, `${K} × ${C}`), ' + ', h('span', { class: 'ab-c2' }, `${R - K} × ${C}`), ' = ', h('span', { class: 'ab-c1' }, String(a)), ' + ', h('span', { class: 'ab-c2' }, String(b)), ` = ${P}`);
      } else { readout.style.fontSize = ''; readout.append(`${R} ${R === 1 ? 'row' : 'rows'} × ${C} ${C === 1 ? 'column' : 'columns'} = ${P}`); }
      facts.textContent = '';
      const divs = R === C ? `${P} ÷ ${R} = ${C}` : `${P} ÷ ${R} = ${C}   ·   ${P} ÷ ${C} = ${R}`;
      facts.append(h('span', {}, 'Division facts: ', h('b', { style: { color: 'var(--ink)' } }, divs)));
      if (tiles) facts.append(h('span', { class: 'big' }, `Area = ${P} square units`), h('span', {}, `Perimeter = ${C} + ${R} + ${C} + ${R} = ${2 * (R + C)} units`));
      if (split) facts.append(h('span', {}, 'Breaking an array into two parts makes a hard fact easier!'));
      const c = CH[ci]; chText.textContent = c.t;
      const ok = c.ok(); chState.textContent = ok ? '✓ You did it!' : 'Not yet';
      chState.className = 'chip' + (ok ? ' ab-done' : '');
      chState.style.borderColor = ok ? 'var(--good)' : '';
    }
    draw();
    tex(el);
  }

  // ======================================================================
  // Lab 2: Fraction Strips (browser only)
  // ======================================================================
  function mountStrips(el, api) {
    const { h, svg, tex } = api;
    const DS = [1, 2, 3, 4, 6, 8];
    const shaded = { 1: 0, 2: 0, 3: 0, 4: 0, 6: 0, 8: 0 };
    let names = true, ci = 0;
    const X0 = 6, SW = 266, SH = 34, GAP = 8, Y0 = 6;
    const NLY = Y0 + DS.length * (SH + GAP) + 26;
    const W = 340, H = NLY + 66;
    const style = h('style', { text: `.fs-piece{cursor:pointer}.fs-piece:hover rect{stroke-width:2.5}.fs-eq{font-family:var(--font-display);font-size:1.2rem;font-weight:600;color:var(--good)}.fs-done{color:var(--good);font-weight:700}` });
    const s = svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Fraction strips', style: 'user-select:none;-webkit-user-select:none' });
    const gStrips = svg('g'), gGuides = svg('g'), gNL = svg('g');
    s.append(gGuides, gStrips, gNL);
    const xv = (v) => X0 + v * SW;

    const msg = h('div', { class: 'lab-readout', 'aria-live': 'polite' });
    const namesBtn = h('button', { class: 'btn-small on', onclick: () => { names = !names; draw(); } }, 'Piece names');
    const clearBtn = h('button', { class: 'btn-small', onclick: () => { DS.forEach((d) => { shaded[d] = 0; }); draw(); } }, 'Clear all');
    const CH = [
      { t: 'Shade 1/2. Then find every other strip that matches it.', ok: () => shaded[2] === 1 && shaded[4] === 2 && shaded[6] === 3 && shaded[8] === 4 },
      { t: 'Shade 2/3. Which strip can match it?', ok: () => shaded[3] === 2 && shaded[6] === 4 },
      { t: 'Find a fraction equal to 3/4.', ok: () => shaded[4] === 3 && shaded[8] === 6 },
      { t: 'Which is more, 3/4 or 5/8? Shade both and look.', ok: () => shaded[4] === 3 && shaded[8] === 5 },
      { t: 'Make one whole using sixths.', ok: () => shaded[6] === 6 },
      { t: 'Shade 1/3 and 1/4. Which is bigger? Watch the number line.', ok: () => shaded[3] === 1 && shaded[4] === 1 }
    ];
    const chText = h('span'), chState = h('span', { class: 'chip' });
    const chNext = h('button', { class: 'btn-small', onclick: () => { ci = (ci + 1) % CH.length; draw(); } }, 'Next ›');
    const tryBox = h('div', { class: 'try lab-row', style: { justifyContent: 'space-between' } }, h('span', {}, h('b', {}, 'Try this: '), chText), h('span', { class: 'lab-row', style: { gap: '6px' } }, chState, chNext));

    el.append(style, h('span', { class: 'muted', style: { fontSize: '.9rem' } }, 'Tap a piece to fill the strip up to it. Tap the last one again to un-fill.'), s, h('div', { class: 'lab-row' }, namesBtn, clearBtn), msg, tryBox);

    const sf = (g, x, y, n, d, fs, fill) => {
      if (d === 1) { g.appendChild(svg('text', { x, y: y + fs * 0.55, 'font-size': fs + 3, 'font-weight': 700, fill, 'text-anchor': 'middle', 'font-family': 'inherit', text: String(n) })); return; }
      const w = Math.max(String(n).length, String(d).length) * fs * 0.62 + 4;
      g.appendChild(svg('text', { x, y: y - 2, 'font-size': fs, 'font-weight': 700, fill, 'text-anchor': 'middle', 'font-family': 'inherit', text: String(n) }));
      g.appendChild(svg('line', { x1: x - w / 2, x2: x + w / 2, y1: y + 1.5, y2: y + 1.5, stroke: fill, 'stroke-width': 1.5 }));
      g.appendChild(svg('text', { x, y: y + fs + 2, 'font-size': fs, 'font-weight': 700, fill, 'text-anchor': 'middle', 'font-family': 'inherit', text: String(d) }));
    };
    const key = (n, d) => { if (!n) return '0'; const g = util.gcd(n, d); return (n / g) + '/' + (d / g); };

    function draw() {
      // groups of equal non-zero amounts
      const groups = {};
      DS.forEach((d) => { if (shaded[d]) { const k = key(shaded[d], d); (groups[k] = groups[k] || []).push(d); } });
      const eqDs = new Set(); Object.values(groups).forEach((g) => { if (g.length > 1) g.forEach((d) => eqDs.add(d)); });

      gStrips.textContent = '';
      DS.forEach((d, row) => {
        const y = Y0 + row * (SH + GAP), pw = SW / d;
        for (let i = 0; i < d; i++) {
          const on = i < shaded[d];
          const g = svg('g', { class: 'fs-piece', role: 'button', 'aria-label': `strip ${d}, piece ${i + 1}` });
          g.appendChild(svg('rect', { x: X0 + i * pw, y, width: pw, height: SH, rx: 4, fill: on ? 'var(--accent)' : 'var(--surface)', 'fill-opacity': on ? 0.85 : 1, stroke: 'var(--ink)', 'stroke-width': 1.5 }));
          if (names) sf(g, X0 + i * pw + pw / 2, y + SH / 2 - 3, 1, d, d >= 6 ? 10 : 11, on ? 'var(--surface)' : 'var(--muted)');
          g.addEventListener('click', () => { shaded[d] = shaded[d] === i + 1 ? i : i + 1; draw(); });
          gStrips.appendChild(g);
        }
        if (eqDs.has(d)) gStrips.appendChild(svg('rect', { x: X0 - 2, y: y - 2, width: shaded[d] * pw + 4, height: SH + 4, rx: 6, fill: 'none', stroke: 'var(--good)', 'stroke-width': 3.5, 'pointer-events': 'none' }));
        sf(gStrips, X0 + SW + 34, y + SH / 2 - 3, shaded[d], d, 13, shaded[d] ? (eqDs.has(d) ? 'var(--good)' : 'var(--accent)') : 'var(--muted)');
      });

      // number line
      gNL.textContent = ''; gGuides.textContent = '';
      gNL.appendChild(svg('line', { x1: X0, x2: X0 + SW, y1: NLY, y2: NLY, stroke: 'var(--ink)', 'stroke-width': 2.5, 'stroke-linecap': 'round' }));
      [0, 1].forEach((v) => {
        gNL.appendChild(svg('line', { x1: xv(v), x2: xv(v), y1: NLY - 10, y2: NLY + 10, stroke: 'var(--ink)', 'stroke-width': 2.5 }));
      });
      gNL.appendChild(svg('text', { x: xv(0), y: NLY + 28, 'font-size': 15, 'font-weight': 700, fill: 'var(--ink)', 'text-anchor': 'middle', 'font-family': 'inherit', text: '0' }));
      gNL.appendChild(svg('text', { x: xv(1), y: NLY + 28, 'font-size': 15, 'font-weight': 700, fill: 'var(--ink)', 'text-anchor': 'middle', 'font-family': 'inherit', text: '1' }));
      const vals = Object.keys(groups).map((k) => { const [n, d] = k.split('/').map(Number); return { v: n / d, ds: groups[k] }; }).sort((a, b) => a.v - b.v);
      vals.forEach((o, idx) => {
        const x = xv(o.v), eq = o.ds.length > 1, col = eq ? 'var(--good)' : 'var(--accent)';
        const topRow = Math.min(...o.ds.map((d) => DS.indexOf(d)));
        gGuides.appendChild(svg('line', { x1: x, x2: x, y1: Y0 + topRow * (SH + GAP), y2: NLY, stroke: col, 'stroke-width': 1.5, 'stroke-dasharray': '4 4', 'stroke-opacity': 0.8 }));
        gNL.appendChild(svg('line', { x1: x, x2: x, y1: NLY - 8, y2: NLY + 8, stroke: 'var(--ink)', 'stroke-width': 1.6 }));
        gNL.appendChild(svg('circle', { cx: x, cy: NLY, r: 6.5, fill: col, stroke: 'var(--surface)', 'stroke-width': 2 }));
        if (o.v > 0.02 && o.v < 0.98) { const d0 = Math.max(...o.ds); sf(gNL, x, NLY + 24 + (idx % 2) * 26, shaded[d0], d0, 11, col); }
      });

      // message
      msg.textContent = '';
      const eqGroups = Object.values(groups).filter((g) => g.length > 1);
      if (eqGroups.length) {
        eqGroups.forEach((g) => msg.appendChild(h('span', { class: 'fs-eq' }, '$' + g.map((d) => d === 1 ? String(shaded[d]) : `\\frac{${shaded[d]}}{${d}}`).join(' = ') + '$!')));
      } else if (vals.length) {
        const shown = DS.filter((d) => shaded[d]).map((d) => d === 1 ? String(shaded[d]) : `\\frac{${shaded[d]}}{${d}}`);
        msg.appendChild(h('span', {}, 'Shaded: $' + shown.join(',\\; ') + '$'));
      } else msg.appendChild(h('span', { class: 'muted', style: { fontSize: '1rem' } }, 'Shade some pieces to compare!'));
      tex(msg);

      namesBtn.classList.toggle('on', names);
      const c = CH[ci]; chText.textContent = c.t;
      const ok = c.ok(); chState.textContent = ok ? '✓ You did it!' : 'Not yet';
      chState.className = 'chip' + (ok ? ' fs-done' : ''); chState.style.borderColor = ok ? 'var(--good)' : '';
    }
    shaded[2] = 1; shaded[4] = 2;
    draw();
  }

  // ======================================================================
  // Register
  // ======================================================================
  MathQuest.registerTrack({
    id: 'g3',
    title: 'Grade 3',
    subtitle: 'Times tables, fractions, area, rounding & time',
    skills: [
      { id: 'g3-mult-div', title: 'Multiplication & division facts', strand: 'Operations', ccss: '3.OA.C.7', blurb: 'Use equal groups and arrays to multiply and divide within 100.', lab: 'g3-arrays', generate: genMultDiv },
      { id: 'g3-frac-line', title: 'Fractions on a number line', strand: 'Fractions', ccss: '3.NF.A.2', blurb: 'Find fractions on a number line and compare them.', lab: 'g3-fraction-bars', generate: genFracLine },
      { id: 'g3-area-perim', title: 'Area & perimeter', strand: 'Measurement', ccss: '3.MD.C.7', blurb: 'Count squares for area and walk around the edge for perimeter.', lab: 'g3-arrays', generate: genArea },
      { id: 'g3-place-round', title: 'Place value & rounding', strand: 'Number sense', ccss: '3.NBT.A.1', blurb: 'Round numbers and add or subtract within 1000.', generate: genPlace },
      { id: 'g3-time', title: 'Telling time & elapsed time', strand: 'Measurement', ccss: '3.MD.A.1', blurb: 'Read clocks to the minute and figure out how much time has passed.', generate: genTime }
    ],
    labs: [
      { id: 'g3-arrays', title: 'Array Builder', blurb: 'Build rows and columns to see multiplication, division and area.', mount: mountArrays },
      { id: 'g3-fraction-bars', title: 'Fraction Strips', blurb: 'Shade fraction strips to find equal fractions.', mount: mountStrips }
    ]
  });
})();
