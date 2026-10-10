/* MathQuest DOM helpers shared by the app and by Lab mount() functions. Browser only. */
(function () {
  'use strict';
  const SVGNS = 'http://www.w3.org/2000/svg';
  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'style' && typeof v === 'object') { for (const [sk, sv] of Object.entries(v)) { if (sk.startsWith('--')) el.style.setProperty(sk, sv); else el.style[sk] = sv; } }
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, v);
    }
    for (const c of children.flat()) if (c != null && c !== false) el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    return el;
  }
  function svg(tag, attrs, ...children) {
    const el = document.createElementNS(SVGNS, tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null) continue;
      if (k === 'text') el.textContent = v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else el.setAttribute(k, v);
    }
    for (const c of children.flat()) if (c) el.appendChild(c);
    return el;
  }
  function tex(el) {
    if (!el || typeof window.renderMathInElement !== 'function') return el;
    try {
      window.renderMathInElement(el, { delimiters: [{ left: '$', right: '$', display: false }], throwOnError: false, ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'input'] });
    } catch (e) { /* leave raw text */ }
    return el;
  }
  // Convert client pointer coords to SVG user-space coords.
  function svgPoint(svgEl, evt) {
    const pt = svgEl.createSVGPoint(); pt.x = evt.clientX; pt.y = evt.clientY;
    const m = svgEl.getScreenCTM(); return m ? pt.matrixTransform(m.inverse()) : { x: 0, y: 0 };
  }
  // Make an SVG element draggable. onMove(p:{x,y}, evt) receives SVG coords.
  function drag(svgEl, target, onMove, onEnd) {
    target.style.touchAction = 'none'; target.style.cursor = 'grab';
    target.addEventListener('pointerdown', (e) => {
      e.preventDefault(); target.setPointerCapture(e.pointerId); target.style.cursor = 'grabbing';
      const move = (ev) => onMove(svgPoint(svgEl, ev), ev);
      const up = (ev) => { target.releasePointerCapture(e.pointerId); target.style.cursor = 'grab'; target.removeEventListener('pointermove', move); target.removeEventListener('pointerup', up); target.removeEventListener('pointercancel', up); if (onEnd) onEnd(svgPoint(svgEl, ev), ev); };
      target.addEventListener('pointermove', move); target.addEventListener('pointerup', up); target.addEventListener('pointercancel', up);
      move(e);
    });
  }
  window.MathQuestDOM = { h, svg, tex, svgPoint, drag, labApi: { h, svg, tex, svgPoint, drag } };
})();
