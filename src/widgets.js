/* MathQuest answer widgets: number, fraction, choice, multi, numberline, clock, point, order.
   Each widget returns { el, ready(), value(), lock(correct, problem), focus? }. Browser only. */
(function () {
  'use strict';
  const MQ = window.MathQuest;
  const { h, svg, tex, svgPoint } = window.MathQuestDOM;
  function answerText(pr) {
    const a = pr.answer, i = pr.input;
    switch (i.type) {
      case 'number': return '$' + MQ.util.fmt(a).replace(/,/g, '{,}') + '$' + (i.unit ? ' ' + i.unit : '');
      case 'fraction': return '$' + MQ.util.frac(a.n, a.d) + '$';
      case 'choice': return i.options[a];
      case 'multi': return i.fields.map((f, k) => f.label + ' ' + MQ.util.fmt(a[k]) + (f.unit ? ' ' + f.unit : '')).join(', ');
      case 'numberline': return '$' + numLabelTex(a, i) + '$ (shown on the line)';
      case 'clock': return a.h + ':' + String(a.m).padStart(2, '0') + ' (shown on the clock)';
      case 'point': return `$(${a.x}, ${a.y})$ (shown on the grid)`;
      case 'order': return 'shown in order above';
      default: return String(a);
    }
  }
  function numLabelTex(v, spec) {
    if (Number.isInteger(v)) return String(v);
    if (spec.labels === 'decimal') return MQ.util.fmt(v);
    const d = Math.round(1 / spec.step);
    if (Math.abs(Math.round(v * d) - v * d) < 1e-6 && d > 1) return MQ.util.frac(Math.round(v * d), d);
    return MQ.util.fmt(v);
  }
  function numLabelText(v, spec) {
    if (Math.abs(v - Math.round(v)) < 1e-9) return String(Math.round(v)).replace('-', '−');
    if (spec.labels === 'decimal') return MQ.util.fmt(v).replace('-', '−');
    const d = Math.round(1 / spec.step);
    const n = Math.round(v * d);
    return (n < 0 ? '−' : '') + Math.abs(n) + '/' + d;
  }

  // ---------- Input widgets ----------
  // Each returns { el, ready(), value(), lock(correct, problem), focus? }
  function makeWidget(spec, onChange) {
    const f = { number: wNumber, fraction: wFraction, choice: wChoice, multi: wMulti, numberline: wNumberLine, clock: wClock, point: wPoint, order: wOrder }[spec.type];
    return f ? f(spec, onChange) : { el: h('p', {}, 'Unsupported question type.'), ready: () => false, value: () => null, lock() {} };
  }
  function signButton(input, onChange) {
    return h('button', { class: 'btn-small', type: 'button', 'aria-label': 'Toggle negative sign', title: 'Make negative / positive', onclick: () => {
      const v = input.value.trim(); input.value = v.startsWith('-') || v.startsWith('−') ? v.slice(1) : '-' + v; input.focus(); onChange();
    } }, '±');
  }
  function numBox(id, onChange, extra) {
    return h('input', Object.assign({ id, type: 'text', inputmode: 'decimal', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Your answer', oninput: onChange }, extra || {}));
  }
  function wNumber(spec, onChange) {
    const inp = numBox('ans-number', onChange, { placeholder: spec.placeholder || '' });
    const el = h('div', { class: 'num-input' }, inp, spec.unit ? h('span', { class: 'unit', html: spec.unit }) : null, signButton(inp, onChange));
    tex(el);
    return {
      el, focus: () => inp.focus(),
      ready: () => !isNaN(MQ.parseNumber(inp.value)),
      value: () => MQ.parseNumber(inp.value),
      lock(ok) { inp.disabled = true; inp.style.borderColor = ok ? 'var(--good)' : 'var(--bad)'; el.querySelector('.btn-small').disabled = true; }
    };
  }
  function wFraction(spec, onChange) {
    const w = spec.allowMixed ? numBox('ans-whole', onChange, { class: 'whole', 'aria-label': 'Whole number part (optional)', inputmode: 'numeric' }) : null;
    const n = numBox('ans-num', onChange, { 'aria-label': 'Numerator' });
    const d = numBox('ans-den', onChange, { 'aria-label': 'Denominator', inputmode: 'numeric' });
    const el = h('div', { class: 'frac' }, w, h('span', { class: 'stackf' }, n, h('hr'), d), signButton(n, onChange));
    const read = () => {
      const nn = MQ.parseNumber(n.value), dd = MQ.parseNumber(d.value);
      const ww = w && w.value.trim() !== '' ? MQ.parseNumber(w.value) : 0;
      if (![nn, dd, ww].every((x) => Number.isInteger(x)) || dd <= 0) return null;
      const neg = ww < 0 || (ww === 0 && nn < 0);
      const num = Math.abs(ww) * dd + Math.abs(nn);
      return { n: neg ? -num : num, d: dd };
    };
    return {
      el, focus: () => (w || n).focus(), ready: () => !!read(), value: read,
      lock(ok) { [w, n, d].forEach((x) => { if (x) { x.disabled = true; x.style.borderColor = ok ? 'var(--good)' : 'var(--bad)'; } }); el.querySelector('.btn-small').disabled = true; }
    };
  }
  function wChoice(spec, onChange) {
    let sel = -1;
    const btns = spec.options.map((o, i) => h('button', { class: 'choice', type: 'button', role: 'radio', 'aria-checked': 'false', onclick: () => { sel = i; btns.forEach((b, k) => { b.classList.toggle('on', k === i); b.setAttribute('aria-checked', String(k === i)); }); onChange(); } },
      h('span', { class: 'key' }, String.fromCharCode(65 + i)), h('span', { html: o, style: { minWidth: 0 } })));
    const long = spec.options.some((o) => String(o).replace(/<[^>]+>/g, '').length > 28 || /<svg/.test(o));
    const el = h('div', { class: 'choices', role: 'radiogroup', style: long ? { gridTemplateColumns: '1fr' } : null }, ...btns);
    tex(el);
    const onKey = (e) => {
      if (!el.isConnected) { document.removeEventListener('keydown', onKey); return; }
      if (btns[0].disabled) return;
      const k = e.key.toUpperCase().charCodeAt(0) - 65;
      if (e.key.length === 1 && k >= 0 && k < btns.length && !(e.target.tagName === 'INPUT')) btns[k].click();
    };
    document.addEventListener('keydown', onKey);
    return {
      el, ready: () => sel >= 0, value: () => sel,
      lock(ok, pr) { btns.forEach((b, k) => { b.disabled = true; b.style.cursor = 'default'; if (k === pr.answer) { b.style.borderColor = 'var(--good)'; b.style.background = 'var(--good-bg)'; } else if (k === sel && !ok) { b.style.borderColor = 'var(--bad)'; b.style.background = 'var(--bad-bg)'; } }); }
    };
  }
  function wMulti(spec, onChange) {
    const ins = spec.fields.map((f, i) => numBox('ans-m' + i, onChange, { 'aria-label': (f.label || 'Value ' + (i + 1)).replace(/[$=]/g, '').trim() }));
    const el = h('div', { class: 'multi' }, ...spec.fields.map((f, i) => h('label', {}, h('span', { html: f.label || '' }), ins[i], f.unit ? h('span', { html: f.unit }) : null, signButton(ins[i], onChange))));
    tex(el);
    return {
      el, focus: () => ins[0].focus(),
      ready: () => ins.every((x) => !isNaN(MQ.parseNumber(x.value))),
      value: () => ins.map((x) => MQ.parseNumber(x.value)),
      lock(ok) { ins.forEach((x) => { x.disabled = true; x.style.borderColor = ok ? 'var(--good)' : 'var(--bad)'; }); el.querySelectorAll('.btn-small').forEach((b) => (b.disabled = true)); }
    };
  }
  function wNumberLine(spec, onChange) {
    const W = 520, H = 120, padX = 34, y0 = 62;
    const n = Math.round((spec.max - spec.min) / spec.step);
    const every = spec.labelEvery || 1;
    const xOf = (v) => padX + ((v - spec.min) / (spec.max - spec.min)) * (W - 2 * padX);
    const s = svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `Number line from ${spec.min} to ${spec.max}. Tap to place your answer.` });
    s.appendChild(svg('rect', { x: 0, y: 0, width: W, height: H, fill: 'transparent' }));
    s.appendChild(svg('line', { x1: padX - 18, y1: y0, x2: W - padX + 18, y2: y0, stroke: 'var(--ink)', 'stroke-width': 3, 'stroke-linecap': 'round' }));
    s.appendChild(svg('path', { d: `M${padX - 22} ${y0} l9 -7 v14 z M${W - padX + 22} ${y0} l-9 -7 v14 z`, fill: 'var(--ink)' }));
    for (let i = 0; i <= n; i++) {
      const v = spec.min + i * spec.step, x = xOf(v), major = i % every === 0;
      s.appendChild(svg('line', { x1: x, y1: y0 - (major ? 12 : 8), x2: x, y2: y0 + (major ? 12 : 8), stroke: 'var(--ink)', 'stroke-width': major ? 2.5 : 1.5 }));
      if (major) s.appendChild(svg('text', { x, y: y0 + 34, 'text-anchor': 'middle', 'font-size': 17, 'font-weight': 700, fill: 'var(--ink)', 'font-family': 'inherit', text: numLabelText(v, spec) }));
    }
    const marker = svg('g', { visibility: 'hidden' },
      svg('line', { x1: 0, y1: y0 - 34, x2: 0, y2: y0, stroke: 'var(--accent)', 'stroke-width': 3 }),
      svg('circle', { cx: 0, cy: y0, r: 9, fill: 'var(--accent)', stroke: 'var(--surface)', 'stroke-width': 3 }));
    const tag = svg('text', { x: 0, y: y0 - 40, 'text-anchor': 'middle', 'font-size': 16, 'font-weight': 700, fill: 'var(--accent)', 'font-family': 'inherit' });
    marker.appendChild(tag);
    s.appendChild(marker);
    let val = null;
    const place = (p) => {
      const raw = spec.min + ((p.x - padX) / (W - 2 * padX)) * (spec.max - spec.min);
      const k = Math.max(0, Math.min(n, Math.round((raw - spec.min) / spec.step)));
      val = spec.min + k * spec.step; val = Math.round(val * 1e9) / 1e9;
      marker.setAttribute('transform', `translate(${xOf(val)},0)`); marker.setAttribute('visibility', 'visible');
      tag.textContent = ''; onChange();
    };
    let locked = false;
    s.style.cursor = 'pointer'; s.style.touchAction = 'none';
    s.addEventListener('pointerdown', (e) => {
      if (locked) return; e.preventDefault(); s.setPointerCapture(e.pointerId); place(svgPoint(s, e));
      const mv = (ev) => place(svgPoint(s, ev));
      const up = () => { s.removeEventListener('pointermove', mv); s.removeEventListener('pointerup', up); };
      s.addEventListener('pointermove', mv); s.addEventListener('pointerup', up);
    });
    const keys = h('div', { class: 'lab-row', style: { justifyContent: 'center' } },
      h('button', { class: 'btn-small', type: 'button', 'aria-label': 'Move left', onclick: () => { if (!locked) place({ x: xOf(val == null ? spec.min : val - spec.step) }); } }, '◀'),
      h('span', { class: 'muted', style: { fontSize: '.9rem' } }, 'Tap or drag on the line'),
      h('button', { class: 'btn-small', type: 'button', 'aria-label': 'Move right', onclick: () => { if (!locked) place({ x: xOf(val == null ? spec.min : val + spec.step) }); } }, '▶'));
    const el = h('div', { class: 'widget stack' }, s, keys);
    return {
      el, ready: () => val != null, value: () => val,
      lock(ok, pr) {
        locked = true; keys.remove();
        marker.querySelectorAll('line,circle').forEach((x) => { x.setAttribute(x.tagName === 'line' ? 'stroke' : 'fill', ok ? 'var(--good)' : 'var(--bad)'); });
        if (!ok) {
          const ax = xOf(pr.answer);
          s.appendChild(svg('g', {}, svg('circle', { cx: ax, cy: y0, r: 9, fill: 'var(--good)', stroke: 'var(--surface)', 'stroke-width': 3 }),
            svg('text', { x: ax, y: y0 - 18, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 700, fill: 'var(--good)', 'font-family': 'inherit', text: numLabelText(pr.answer, spec) })));
        }
      }
    };
  }
  function wClock(spec, onChange) {
    let hh = 12, mm = 0, touched = false;
    const C = 110, R = 92;
    const s = svg('svg', { viewBox: '0 0 220 220', role: 'img', 'aria-label': 'Clock. Drag the hands or use the buttons to set the time.', style: { maxWidth: '260px' } });
    s.appendChild(svg('circle', { cx: C, cy: C, r: R + 8, fill: 'var(--surface)', stroke: 'var(--ink)', 'stroke-width': 5 }));
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * 2 * Math.PI, big = i % 5 === 0, r1 = big ? R - 10 : R - 4;
      s.appendChild(svg('line', { x1: C + Math.sin(a) * r1, y1: C - Math.cos(a) * r1, x2: C + Math.sin(a) * R, y2: C - Math.cos(a) * R, stroke: big ? 'var(--ink)' : 'var(--muted)', 'stroke-width': big ? 3 : 1.2 }));
    }
    for (let i = 1; i <= 12; i++) {
      const a = (i / 12) * 2 * Math.PI;
      s.appendChild(svg('text', { x: C + Math.sin(a) * (R - 26), y: C - Math.cos(a) * (R - 26) + 7, 'text-anchor': 'middle', 'font-size': 20, 'font-weight': 700, fill: 'var(--ink)', 'font-family': 'inherit', text: String(i) }));
    }
    const hourHand = svg('line', { x1: C, y1: C, stroke: 'var(--ink)', 'stroke-width': 8, 'stroke-linecap': 'round' });
    const minHand = svg('line', { x1: C, y1: C, stroke: 'var(--accent)', 'stroke-width': 5, 'stroke-linecap': 'round' });
    const hourGrip = svg('circle', { r: 16, fill: 'transparent' }), minGrip = svg('circle', { r: 18, fill: 'transparent' });
    s.append(hourHand, minHand, svg('circle', { cx: C, cy: C, r: 7, fill: 'var(--ink)' }), hourGrip, minGrip);
    const readout = h('span', { class: 'lab-readout', style: { minWidth: '5.5ch', justifyContent: 'center' } });
    function paint() {
      const ma = (mm / 60) * 2 * Math.PI, ha = (((hh % 12) + mm / 60) / 12) * 2 * Math.PI;
      const mx = C + Math.sin(ma) * (R - 14), my = C - Math.cos(ma) * (R - 14);
      const hx = C + Math.sin(ha) * (R - 44), hy = C - Math.cos(ha) * (R - 44);
      minHand.setAttribute('x2', mx); minHand.setAttribute('y2', my); minGrip.setAttribute('cx', mx); minGrip.setAttribute('cy', my);
      hourHand.setAttribute('x2', hx); hourHand.setAttribute('y2', hy); hourGrip.setAttribute('cx', hx); hourGrip.setAttribute('cy', hy);
      readout.textContent = touched ? hh + ':' + String(mm).padStart(2, '0') : '–:––';
    }
    const angleOf = (p) => { let a = Math.atan2(p.x - C, -(p.y - C)); if (a < 0) a += 2 * Math.PI; return a / (2 * Math.PI); };
    let locked = false;
    const set = (H, M) => { if (locked) return; hh = ((H - 1 + 1200) % 12) + 1; mm = (M + 60) % 60; touched = true; paint(); onChange(); };
    let lastM = 0;
    window.MathQuestDOM.drag(s, minGrip, (p) => {
      if (locked) return;
      const m = Math.round(angleOf(p) * 60) % 60; let H = hh;
      if (lastM > 45 && m < 15) H = hh + 1; else if (lastM < 15 && m > 45) H = hh - 1;
      lastM = m; set(H, m);
    });
    window.MathQuestDOM.drag(s, hourGrip, (p) => { if (locked) return; const H = Math.round(angleOf(p) * 12 - mm / 60) % 12 || 12; set(H, mm); });
    minGrip.addEventListener('pointerdown', () => { lastM = mm; });
    const btn = (label, aria, fn) => h('button', { class: 'btn-small', type: 'button', 'aria-label': aria, onclick: fn }, label);
    const ctr = h('div', { class: 'stack', style: { alignItems: 'center', gap: '8px' } },
      h('div', { class: 'lab-row', style: { justifyContent: 'center' } },
        h('span', { class: 'eyebrow' }, 'Hour'), btn('−', 'Hour back', () => set(hh - 1, mm)), btn('+', 'Hour forward', () => set(hh + 1, mm)),
        h('span', { class: 'eyebrow', style: { marginLeft: '8px' } }, 'Min'), btn('−5', 'Back 5 minutes', () => set(hh, mm - 5)), btn('−1', 'Back 1 minute', () => set(hh, mm - 1)), btn('+1', 'Forward 1 minute', () => set(hh, mm + 1)), btn('+5', 'Forward 5 minutes', () => set(hh, mm + 5))),
      readout);
    paint();
    const el = h('div', { class: 'widget stack', style: { alignItems: 'center' } }, s, ctr);
    return {
      el, ready: () => touched, value: () => ({ h: hh, m: mm }),
      lock(ok, pr) {
        locked = true; ctr.querySelectorAll('button').forEach((b) => (b.disabled = true));
        minHand.setAttribute('stroke', ok ? 'var(--good)' : 'var(--bad)');
        if (!ok) { hh = pr.answer.h; mm = pr.answer.m; touched = true; paint(); minHand.setAttribute('stroke', 'var(--good)'); hourHand.setAttribute('stroke', 'var(--good)'); readout.textContent = 'Correct: ' + hh + ':' + String(mm).padStart(2, '0'); }
      }
    };
  }
  function wPoint(spec, onChange) {
    const nx = spec.xmax - spec.xmin, ny = spec.ymax - spec.ymin;
    const cell = Math.max(18, Math.min(34, Math.floor(420 / Math.max(nx, ny))));
    const pad = 22, W = nx * cell + 2 * pad, H = ny * cell + 2 * pad;
    const X = (x) => pad + (x - spec.xmin) * cell, Y = (y) => pad + (spec.ymax - y) * cell;
    const s = svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Coordinate grid. Tap to plot your point.', style: { maxWidth: '440px' } });
    s.appendChild(svg('rect', { x: 0, y: 0, width: W, height: H, fill: 'var(--surface)' }));
    for (let x = spec.xmin; x <= spec.xmax; x++) s.appendChild(svg('line', { x1: X(x), y1: Y(spec.ymin), x2: X(x), y2: Y(spec.ymax), stroke: x === 0 ? 'var(--ink)' : 'var(--line)', 'stroke-width': x === 0 ? 2 : 1 }));
    for (let y = spec.ymin; y <= spec.ymax; y++) s.appendChild(svg('line', { x1: X(spec.xmin), y1: Y(y), x2: X(spec.xmax), y2: Y(y), stroke: y === 0 ? 'var(--ink)' : 'var(--line)', 'stroke-width': y === 0 ? 2 : 1 }));
    const step = nx > 12 ? 2 : 1;
    const fs = Math.max(10, Math.min(13, cell * 0.5));
    if (spec.ymin <= 0 && spec.ymax >= 0) for (let x = spec.xmin; x <= spec.xmax; x++) if (x !== 0 && x % step === 0) s.appendChild(svg('text', { x: X(x), y: Y(0) + fs + 3, 'text-anchor': 'middle', 'font-size': fs, fill: 'var(--muted)', 'font-family': 'inherit', text: String(x).replace('-', '−') }));
    if (spec.xmin <= 0 && spec.xmax >= 0) for (let y = spec.ymin; y <= spec.ymax; y++) if (y !== 0 && y % step === 0) s.appendChild(svg('text', { x: X(0) - 5, y: Y(y) + fs / 3, 'text-anchor': 'end', 'font-size': fs, fill: 'var(--muted)', 'font-family': 'inherit', text: String(y).replace('-', '−') }));
    const dot = svg('circle', { r: 8, fill: 'var(--accent)', stroke: 'var(--surface)', 'stroke-width': 3, visibility: 'hidden' });
    const lbl = svg('text', { 'font-size': 14, 'font-weight': 700, fill: 'var(--accent)', 'font-family': 'inherit', 'paint-order': 'stroke', stroke: 'var(--surface)', 'stroke-width': 4 });
    s.append(dot, lbl);
    let pt = null, locked = false;
    const place = (p) => {
      const x = Math.max(spec.xmin, Math.min(spec.xmax, Math.round(spec.xmin + (p.x - pad) / cell)));
      const y = Math.max(spec.ymin, Math.min(spec.ymax, Math.round(spec.ymax - (p.y - pad) / cell)));
      pt = { x, y };
      dot.setAttribute('cx', X(x)); dot.setAttribute('cy', Y(y)); dot.setAttribute('visibility', 'visible');
      const right = X(x) < W - 70;
      lbl.setAttribute('x', X(x) + (right ? 12 : -12)); lbl.setAttribute('y', Y(y) - 12); lbl.setAttribute('text-anchor', right ? 'start' : 'end');
      lbl.textContent = `(${x}, ${y})`.replace(/-/g, '−');
      onChange();
    };
    s.style.cursor = 'crosshair'; s.style.touchAction = 'none';
    s.addEventListener('pointerdown', (e) => {
      if (locked) return; e.preventDefault(); s.setPointerCapture(e.pointerId); place(svgPoint(s, e));
      const mv = (ev) => place(svgPoint(s, ev));
      const up = () => { s.removeEventListener('pointermove', mv); s.removeEventListener('pointerup', up); };
      s.addEventListener('pointermove', mv); s.addEventListener('pointerup', up);
    });
    const el = h('div', { class: 'widget stack' }, s, h('p', { class: 'muted', style: { textAlign: 'center', fontSize: '.9rem' } }, 'Tap the grid to plot your point. Drag to adjust.'));
    return {
      el, ready: () => !!pt, value: () => pt,
      lock(ok, pr) {
        locked = true; dot.setAttribute('fill', ok ? 'var(--good)' : 'var(--bad)'); lbl.setAttribute('fill', ok ? 'var(--good)' : 'var(--bad)');
        if (!ok) s.appendChild(svg('circle', { cx: X(pr.answer.x), cy: Y(pr.answer.y), r: 8, fill: 'var(--good)', stroke: 'var(--surface)', 'stroke-width': 3 }));
      }
    };
  }
  function wOrder(spec, onChange) {
    let order = spec.items.map((_, i) => i);
    let moved = false;
    const list = h('ol', { class: 'order-list', style: { listStyle: 'none', margin: 0, padding: 0 } });
    let locked = false;
    function draw() {
      list.replaceChildren(...order.map((it, pos) => h('li', { class: 'order-item' },
        h('span', { class: 'n' }, String(pos + 1)),
        tex(h('span', { class: 'txt', html: spec.items[it] })),
        h('span', { class: 'mv' },
          h('button', { type: 'button', 'aria-label': 'Move up', disabled: locked || pos === 0, onclick: () => swap(pos, pos - 1) }, '▲'),
          h('button', { type: 'button', 'aria-label': 'Move down', disabled: locked || pos === order.length - 1, onclick: () => swap(pos, pos + 1) }, '▼')))));
    }
    function swap(a, b) { [order[a], order[b]] = [order[b], order[a]]; moved = true; draw(); onChange(); const btn = list.children[b] && list.children[b].querySelector(b < a ? '[aria-label="Move up"]' : '[aria-label="Move down"]'); if (btn && !btn.disabled) btn.focus(); }
    draw();
    return {
      el: h('div', { class: 'stack' }, h('p', { class: 'muted', style: { fontSize: '.9rem' } }, 'Use the arrows to put the steps in order, first step on top.'), list),
      ready: () => moved, value: () => order.slice(),
      lock(ok, pr) {
        locked = true; draw();
        list.querySelectorAll('.order-item').forEach((li) => { li.style.borderColor = ok ? 'var(--good)' : 'var(--line)'; });
        if (!ok) { order = pr.answer.slice(); setTimeout(() => { locked = true; draw(); list.querySelectorAll('.order-item').forEach((li) => { li.style.borderColor = 'var(--good)'; }); }, 900); }
      }
    };
  }

  window.MathQuestWidgets = { makeWidget, answerText, numLabelText };
})();
