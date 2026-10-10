/* MathQuest app shell: profiles, home, practice loop, input widgets, Math Lab, parent view. */
(function () {
  'use strict';
  const MQ = window.MathQuest;
  const { h, svg, tex, svgPoint } = window.MathQuestDOM;
  const app = document.getElementById('app');
  const KEY = 'mathquest.v1';
  const COLORS = ['#e8590c', '#0f8b8d', '#7048e8', '#2563d9', '#c2255c', '#2f9e44', '#d98a00', '#495057'];
  const TRACK_LABEL = { g3: 'Grade 3', g7: 'Grade 7', geo: 'Geometry' };
  const DAILY_GOAL = 10;

  // ---------- Storage ----------
  const blank = () => ({ profiles: [], progress: {}, days: {}, parentPin: '' });
  let db = load();
  function load() {
    try { const raw = localStorage.getItem(KEY); if (raw) return Object.assign(blank(), JSON.parse(raw)); } catch (e) { /* storage unavailable */ }
    return blank();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* ignore */ } }
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  function skillProg(pid, sid) {
    const p = (db.progress[pid] = db.progress[pid] || {});
    return (p[sid] = p[sid] || { score: 0, answered: 0, correct: 0, secs: 0, best: 0, mastered: false, missStreak: 0 });
  }
  function dayLog(pid) { return (db.days[pid] = db.days[pid] || {}); }
  function todayCount(pid) { const d = dayLog(pid)[today()]; return d ? d.correct : 0; }
  function streakDays(pid) {
    const log = dayLog(pid); let n = 0; const d = new Date();
    if (!(log[today()] && log[today()].correct >= 1)) d.setDate(d.getDate() - 1); // today not started yet: count from yesterday
    for (;;) {
      const k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      if (log[k] && log[k].correct >= 1) { n++; d.setDate(d.getDate() - 1); } else break;
    }
    return n;
  }

  // ---------- Routing ----------
  let state = { view: 'boot' };
  let cleanup = null;
  function go(view, params) {
    if (cleanup) { try { cleanup(); } catch (e) { /* ignore */ } cleanup = null; }
    state = Object.assign({ view }, params || {});
    render();
    window.scrollTo(0, 0);
  }
  const trackById = (id) => MQ.tracks.find((t) => t.id === id);
  const skillById = (id) => { for (const t of MQ.tracks) { const s = t.skills.find((k) => k.id === id); if (s) return { track: t, skill: s }; } return null; };
  const labById = (id) => { for (const t of MQ.tracks) { const l = (t.labs || []).find((k) => k.id === id); if (l) return { track: t, lab: l }; } return null; };
  const me = () => db.profiles.find((p) => p.id === state.pid);

  // ---------- Shell ----------
  function shell(content, opts = {}) {
    const p = opts.profile;
    const bar = h('header', { class: 'topbar' },
      h('div', { class: 'topbar-in' },
        h('button', { class: 'brand', onclick: () => go(p ? 'home' : 'profiles', p ? { pid: p.id } : {}), 'aria-label': 'MathQuest home' },
          h('span', { class: 'brand-mark', 'aria-hidden': 'true' }, '÷'), 'MathQuest'),
        h('div', { class: 'spacer' }),
        p ? h('button', { class: 'btn-small', onclick: () => go('labs', { pid: p.id, track: state.track || p.track }) }, 'Math Lab') : null,
        p ? h('button', { class: 'who', onclick: () => go('profiles'), title: 'Switch player' }, avatar(p), h('span', { class: 'nm' }, p.name)) : null,
        !p && db.profiles.length ? h('button', { class: 'btn-small', onclick: openParent }, 'Parent view') : null));
    app.replaceChildren(bar, h('main', { class: 'wrap', 'data-track': opts.track || (p && p.track) || 'g3' }, content));
  }
  function avatar(p, big) {
    return h('span', { class: 'avatar' + (big ? ' big' : ''), style: { background: p.color } }, (p.name || '?').trim().charAt(0).toUpperCase());
  }
  function ring(score, color) {
    const r = 22, c = 2 * Math.PI * r, v = Math.max(0, Math.min(100, score));
    return svg('svg', { class: 'ring', viewBox: '0 0 54 54', 'aria-hidden': 'true' },
      svg('circle', { cx: 27, cy: 27, r, fill: 'none', stroke: 'var(--surface-2)', 'stroke-width': 6 }),
      v > 0 ? svg('circle', { cx: 27, cy: 27, r, fill: 'none', stroke: color || 'var(--t)', 'stroke-width': 6, 'stroke-linecap': 'round', 'stroke-dasharray': `${(c * v) / 100} ${c}`, transform: 'rotate(-90 27 27)' }) : null,
      svg('text', { x: 27, y: 32, 'text-anchor': 'middle', 'font-size': v === 100 ? 13 : 15, 'font-weight': 700, fill: 'var(--ink)', 'font-family': 'inherit', text: v === 100 ? '★' : String(v) }));
  }

  // ---------- Setup ----------
  function viewSetup() {
    const editing = db.profiles.length > 0;
    const rows = editing ? db.profiles.map((p) => Object.assign({}, p)) : [
      { id: 'k1', name: '', color: COLORS[0], track: 'g3', pin: '' },
      { id: 'k2', name: '', color: COLORS[1], track: 'g7', pin: '' },
      { id: 'k3', name: '', color: COLORS[2], track: 'geo', pin: '' }];
    const placeholders = { g3: '3rd grader’s name', g7: '7th grader’s name', geo: 'Geometry student’s name' };
    let parentPin = db.parentPin || '';
    const list = h('div', { class: 'stack' });
    function draw() {
      list.replaceChildren(...rows.map((r, i) => {
        const sw = h('div', { class: 'swatches', role: 'radiogroup', 'aria-label': 'Colour' }, ...COLORS.map((c) => h('button', { class: 'swatch' + (r.color === c ? ' on' : ''), style: { background: c }, 'aria-label': 'Colour', onclick: () => { r.color = c; draw(); } })));
        return h('div', { class: 'card stack' },
          h('div', { class: 'row' }, avatar(r), h('h3', { 'data-title': r.id }, r.name || 'Player ' + (i + 1)), h('div', { style: { flex: 1 } }),
            rows.length > 1 ? h('button', { class: 'btn-small', onclick: () => { rows.splice(i, 1); draw(); } }, 'Remove') : null),
          h('label', { class: 'field' }, h('span', { class: 'eyebrow' }, 'Name'),
            h('input', { id: 'name-' + r.id, value: r.name, placeholder: placeholders[r.track] || 'Name', maxlength: 20, oninput: (e) => { r.name = e.target.value; const t = list.querySelector('[data-title="' + r.id + '"]'); if (t) t.textContent = r.name || 'Player ' + (i + 1); const av = t && t.previousSibling; if (av) av.textContent = (r.name || '?').trim().charAt(0).toUpperCase() || '?'; } })),
          h('div', { class: 'row' },
            h('label', { class: 'field', style: { flex: 1, minWidth: '140px' } }, h('span', { class: 'eyebrow' }, 'Main track'),
              h('select', { id: 'track-' + r.id, onchange: (e) => { r.track = e.target.value; } }, ...MQ.tracks.map((t) => h('option', { value: t.id, selected: t.id === r.track }, t.title)))),
            h('label', { class: 'field', style: { flex: 1, minWidth: '140px' } }, h('span', { class: 'eyebrow' }, 'PIN (optional)'),
              h('input', { id: 'pin-' + r.id, value: r.pin || '', inputmode: 'numeric', maxlength: 4, placeholder: '4 digits', oninput: (e) => { r.pin = e.target.value.replace(/\D/g, '').slice(0, 4); e.target.value = r.pin; } }))),
          sw);
      }));
    }
    draw();
    const err = h('p', { class: 'flag', role: 'alert' });
    const content = h('div', { class: 'stack', style: { gap: '18px' } },
      h('div', { class: 'stack' },
        h('span', { class: 'eyebrow' }, editing ? 'Family settings' : 'Welcome'),
        h('h1', {}, editing ? 'Edit players' : 'Set up your family'),
        h('p', { class: 'muted' }, 'One profile per kid. Each picks a main track, but everyone can explore every track. Progress is saved in this browser.')),
      list,
      h('button', { class: 'btn ghost', onclick: () => { rows.push({ id: 'k' + Date.now(), name: '', color: COLORS[rows.length % COLORS.length], track: 'g3', pin: '' }); draw(); } }, '+ Add a player'),
      h('div', { class: 'card stack' },
        h('h3', {}, 'Parent view PIN'),
        h('p', { class: 'muted' }, 'Optional. Keeps the progress report and these settings behind a code.'),
        h('input', { id: 'parent-pin', class: 'field', style: { padding: '.6em .8em', borderRadius: '10px', border: '2px solid var(--line)', background: 'var(--surface)', maxWidth: '160px' }, value: parentPin, inputmode: 'numeric', maxlength: 4, placeholder: '4 digits', oninput: (e) => { parentPin = e.target.value.replace(/\D/g, '').slice(0, 4); e.target.value = parentPin; } })),
      err,
      h('div', { class: 'actions' },
        h('button', { class: 'btn', onclick: () => {
          for (const r of rows) {
            if (!r.name.trim()) r.name = { g3: 'Explorer', g7: 'Navigator', geo: 'Architect' }[r.track] || 'Player';
            if (r.pin && r.pin.length !== 4) { err.textContent = 'PINs need exactly 4 digits (or leave blank).'; return; }
          }
          if (parentPin && parentPin.length !== 4) { err.textContent = 'The parent PIN needs exactly 4 digits (or leave blank).'; return; }
          db.profiles = rows.map((r) => ({ id: r.id, name: r.name.trim(), color: r.color, track: r.track, pin: r.pin || '' }));
          db.parentPin = parentPin; save(); go('profiles');
        } }, editing ? 'Save changes' : 'Start practising'),
        editing ? h('button', { class: 'btn ghost', onclick: () => go('parent') }, 'Cancel') : null));
    shell(content);
  }

  // ---------- Profiles ----------
  function viewProfiles() {
    const content = h('div', { class: 'stack', style: { gap: '22px' } },
      h('div', { class: 'stack' }, h('span', { class: 'eyebrow' }, new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })), h('h1', {}, 'Who’s practising?')),
      h('div', { class: 'profiles' }, ...db.profiles.map((p) => {
        const streak = streakDays(p.id);
        return h('button', { class: 'profile-btn', onclick: () => (p.pin ? go('pin', { pid: p.id }) : go('home', { pid: p.id })) },
          avatar(p, true), h('span', { class: 'name' }, p.name),
          h('span', { class: 'chip', 'data-track': p.track, style: { color: 'var(--t)', borderColor: 'var(--t)' } }, TRACK_LABEL[p.track] || p.track),
          h('span', { class: 'muted', style: { fontSize: '.85rem' } }, streak ? `${streak}-day streak` : 'No streak yet'));
      })));
    shell(content);
  }
  function pinPad(title, sub, expected, onOk, onCancel) {
    let entered = '';
    const dots = h('div', { class: 'pin-dots' });
    const msg = h('p', { class: 'muted', style: { textAlign: 'center', minHeight: '1.5em' }, role: 'status' }, sub || '');
    const paint = () => dots.replaceChildren(...[0, 1, 2, 3].map((i) => h('span', { class: i < entered.length ? 'on' : '' })));
    const press = (d) => {
      if (d === 'del') entered = entered.slice(0, -1); else if (entered.length < 4) entered += d;
      paint();
      if (entered.length === 4) {
        if (entered === expected) onOk();
        else { msg.textContent = 'That PIN doesn’t match. Try again.'; entered = ''; setTimeout(paint, 250); }
      }
    };
    paint();
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];
    const onKey = (e) => { if (/^\d$/.test(e.key)) press(e.key); else if (e.key === 'Backspace') press('del'); };
    document.addEventListener('keydown', onKey); cleanup = () => document.removeEventListener('keydown', onKey);
    return h('div', { class: 'card stack', style: { alignItems: 'center', gap: '16px', maxWidth: '360px', margin: '0 auto', width: '100%' } },
      h('h2', {}, title), msg, dots,
      h('div', { class: 'pin-pad' }, ...keys.map((k) => k === '' ? h('span') : h('button', { onclick: () => press(k), 'aria-label': k === 'del' ? 'Delete' : k }, k === 'del' ? '⌫' : k))),
      h('button', { class: 'btn ghost', onclick: onCancel }, 'Back'));
  }
  function viewPin() {
    const p = me(); if (!p) return go('profiles');
    shell(h('div', { class: 'stack', style: { alignItems: 'center' } }, avatar(p, true),
      pinPad('Hi, ' + p.name + '!', 'Enter your 4-digit PIN', p.pin, () => go('home', { pid: p.id }), () => go('profiles'))));
  }
  function openParent() { if (db.parentPin) go('parentpin'); else go('parent'); }
  function viewParentPin() { shell(pinPad('Parent view', 'Enter the parent PIN', db.parentPin, () => go('parent'), () => go('profiles'))); }

  // ---------- Home ----------
  function viewHome() {
    const p = me(); if (!p) return go('profiles');
    const tid = state.track || p.track;
    const tr = trackById(tid) || MQ.tracks[0];
    const prog = db.progress[p.id] || {};
    const mastered = Object.values(prog).filter((s) => s.mastered).length;
    const done = todayCount(p.id);
    const goalPct = Math.min(100, Math.round((done / DAILY_GOAL) * 100));
    const content = h('div', { class: 'stack', style: { gap: '20px' } },
      h('div', { class: 'hello' }, avatar(p, true), h('div', { class: 'stack', style: { gap: '4px', minWidth: 0 } },
        h('span', { class: 'eyebrow' }, greeting()), h('h1', {}, p.name))),
      h('div', { class: 'card stack' },
        h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('h3', {}, 'Today’s goal'), h('span', { class: 'tnum muted' }, `${Math.min(done, DAILY_GOAL)} / ${DAILY_GOAL} correct`)),
        h('div', { class: 'bar', 'data-track': p.track }, h('i', { style: { width: goalPct + '%' } })),
        h('p', { class: 'muted', style: { fontSize: '.92rem' } }, done >= DAILY_GOAL ? 'Goal reached! Anything more is bonus practice.' : `${DAILY_GOAL - done} more correct answers to hit today’s goal.`)),
      h('div', { class: 'stats' },
        h('div', { class: 'stat' }, h('b', {}, String(streakDays(p.id))), h('span', {}, 'day streak')),
        h('div', { class: 'stat' }, h('b', {}, String(mastered)), h('span', {}, 'skills mastered')),
        h('div', { class: 'stat' }, h('b', {}, String(Object.values(prog).reduce((a, s) => a + s.correct, 0))), h('span', {}, 'total correct'))),
      h('div', { class: 'stack' },
        h('div', { class: 'row', style: { justifyContent: 'space-between' } },
          h('h2', {}, tr.title),
          h('div', { class: 'tabs track-tabs' }, ...MQ.tracks.map((t) => h('button', { class: 'btn-small' + (t.id === tr.id ? ' on' : ''), 'data-t': t.id, onclick: () => go('home', { pid: p.id, track: t.id }) }, t.title)))),
        h('p', { class: 'muted' }, tr.subtitle || ''),
        recommendation(p, tr),
        h('div', { class: 'skill-list', 'data-track': tr.id }, ...tr.skills.map((s) => {
          const sp = prog[s.id] || { score: 0, answered: 0 };
          return h('button', { class: 'skill', onclick: () => go('practice', { pid: p.id, sid: s.id, track: tr.id }) },
            ring(sp.score),
            h('div', { class: 'meta' }, h('span', { class: 'tag' }, s.strand + ' · ' + s.ccss), h('h3', {}, s.title), h('p', {}, s.blurb)),
            sp.mastered ? h('span', { class: 'medal' }, 'Mastered') : h('span', { class: 'go', 'aria-hidden': 'true' }, '›'));
        })),
        h('button', { class: 'btn ghost', onclick: () => go('labs', { pid: p.id, track: tr.id }) }, `Open the ${tr.title} Math Lab`)));
    shell(content, { profile: p, track: tr.id });
  }
  function greeting() { const hr = new Date().getHours(); return hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening'; }
  function recommendation(p, tr) {
    const prog = db.progress[p.id] || {};
    const open = tr.skills.filter((s) => !(prog[s.id] && prog[s.id].mastered));
    if (!open.length) return h('p', { class: 'try' }, 'Every skill in this track is mastered. Try another track or keep scores sharp.');
    const started = open.filter((s) => prog[s.id] && prog[s.id].answered > 0).sort((a, b) => prog[b.id].score - prog[a.id].score);
    const pick = started[0] || open[0];
    const sp = prog[pick.id];
    return h('button', { class: 'card', style: { textAlign: 'left', cursor: 'pointer', display: 'flex', gap: '12px', alignItems: 'center', borderColor: 'var(--t)' }, 'data-track': tr.id, onclick: () => go('practice', { pid: p.id, sid: pick.id, track: tr.id }) },
      h('div', { class: 'stack', style: { gap: '2px', flex: 1, minWidth: 0 } },
        h('span', { class: 'eyebrow', style: { color: 'var(--t)' } }, sp && sp.answered ? 'Pick up where you left off' : 'Recommended next'),
        h('h3', {}, pick.title)),
      h('span', { class: 'btn', style: { background: 'var(--t)', borderColor: 'var(--t)', color: '#fff' } }, sp && sp.answered ? 'Continue' : 'Start'));
  }

  // ---------- Practice ----------
  function viewPractice() {
    const p = me(); const found = skillById(state.sid);
    if (!p || !found) return go('profiles');
    const { track: tr, skill: sk } = found;
    const sp = skillProg(p.id, sk.id);
    const recent = [];
    let problem = null, widget = null, shownAt = 0, answeredThis = false, sessionSecs = 0, sessionAnswered = 0;
    const startedAt = Date.now();

    const smart = h('b', { class: 'tnum' }, String(sp.score));
    const answeredEl = h('b', { class: 'tnum' }, '0');
    const timeEl = h('b', { class: 'tnum' }, '0:00');
    const barFill = h('i', { style: { width: sp.score + '%' } });
    const zone = h('span', { class: 'chip zone' });
    const qbody = h('div', { class: 'stack', style: { gap: '18px' } });
    const qcard = h('section', { class: 'qcard', 'aria-live': 'polite' }, zone, qbody);
    const timer = setInterval(() => {
      const s = Math.floor((Date.now() - startedAt) / 1000);
      timeEl.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    }, 1000);
    const onKey = (e) => {
      if (e.key !== 'Enter' || e.target.tagName === 'BUTTON') return;
      const primary = qcard.querySelector('[data-primary]');
      if (primary && !primary.disabled) { e.preventDefault(); primary.click(); }
    };
    document.addEventListener('keydown', onKey);
    cleanup = () => { clearInterval(timer); document.removeEventListener('keydown', onKey); };

    function paintScore() {
      smart.textContent = String(sp.score);
      barFill.style.width = sp.score + '%';
      answeredEl.textContent = String(sessionAnswered);
      const lvl = MQ.levelFor(sp.score);
      zone.textContent = sp.score >= 90 ? 'Challenge zone' : lvl === 3 ? 'Level 3 · harder' : lvl === 2 ? 'Level 2' : 'Level 1 · warm-up';
      zone.style.background = sp.score >= 90 ? 'var(--accent-2)' : 'var(--surface)';
      zone.style.color = sp.score >= 90 ? '#fff' : 'var(--ink)';
      zone.style.borderColor = sp.score >= 90 ? 'var(--accent-2)' : 'var(--line)';
    }
    function nextProblem() {
      const level = MQ.levelFor(sp.score);
      let pr = null;
      for (let tries = 0; tries < 8; tries++) {
        const seed = (Math.random() * 2 ** 31) | 0;
        try { pr = sk.generate(MQ.makeRng(seed), level); } catch (e) { pr = null; continue; }
        if (pr && !recent.includes(pr.prompt + (pr.figure || ''))) break;
      }
      if (!pr) { qbody.replaceChildren(h('p', {}, 'Something went wrong making a question. Go back and try again.')); return; }
      if (window.__MQ_TEST__) window.__MQ_TEST__.problem = pr;
      problem = pr; recent.push(pr.prompt + (pr.figure || '')); if (recent.length > 12) recent.shift();
      answeredThis = false; shownAt = Date.now();
      paintScore();
      const promptEl = tex(h('div', { class: 'prompt', html: pr.prompt }));
      const fig = pr.figure ? h('div', { class: 'figure', html: pr.figure }) : null;
      const submit = h('button', { class: 'btn', 'data-primary': true, disabled: true }, 'Submit');
      widget = makeWidget(pr.input, () => { submit.disabled = !widget.ready(); });
      submit.disabled = !widget.ready();
      const hintBox = h('div');
      const actions = h('div', { class: 'actions' }, submit,
        pr.hint ? h('button', { class: 'btn ghost', onclick: (e) => { hintBox.replaceChildren(tex(h('p', { class: 'hint', html: pr.hint }))); e.target.remove(); } }, 'Hint') : null);
      submit.addEventListener('click', () => grade(submit, actions));
      qbody.replaceChildren(promptEl, fig || '', h('div', { class: 'answer-area' }, widget.el), hintBox, actions);
      if (fig) tex(fig);
      setTimeout(() => widget.focus && widget.focus(), 30);
    }
    function grade(submit, actions) {
      if (answeredThis || !widget.ready()) return;
      answeredThis = true;
      const resp = widget.value();
      const ok = MQ.check(problem, resp);
      const before = sp.score;
      const secs = Math.min(120, Math.round((Date.now() - shownAt) / 1000));
      sp.score = MQ.updateScore(sp.score, ok);
      sp.answered++; sessionAnswered++; sp.secs += secs; sessionSecs += secs;
      if (ok) { sp.correct++; sp.missStreak = 0; } else sp.missStreak = (sp.missStreak || 0) + 1;
      sp.best = Math.max(sp.best || 0, sp.score);
      sp.lastAt = Date.now();
      const log = dayLog(p.id); const d = (log[today()] = log[today()] || { answered: 0, correct: 0, secs: 0 });
      d.answered++; d.secs += secs; if (ok) d.correct++;
      const newlyMastered = sp.score === 100 && !sp.mastered;
      if (newlyMastered) sp.mastered = true;
      save();
      widget.lock(ok, problem);
      paintScore();
      const delta = sp.score - before;
      const fb = h('div', { class: 'feedback ' + (ok ? 'ok' : 'no') },
        h('div', { class: 'row', style: { justifyContent: 'space-between' } },
          h('span', { class: 'verdict' }, ok ? pickPraise() : 'Not quite — let’s look at it.'),
          h('span', { class: 'chip tnum' }, (delta >= 0 ? '+' : '') + delta + ' SmartScore')));
      if (!ok) {
        fb.appendChild(tex(h('div', { html: '<b>Correct answer:</b> ' + answerText(problem) })));
        fb.appendChild(tex(h('div', { class: 'explain' }, h('span', { class: 'eyebrow' }, 'How to solve it'), h('ol', {}, ...problem.explanation.map((s) => h('li', { html: s }))))));
        if (sk.lab && sp.missStreak >= 2) {
          const l = labById(sk.lab);
          if (l) fb.appendChild(h('p', { class: 'try' }, 'Two misses in a row? Try it hands-on in the ',
            h('button', { class: 'btn-small', onclick: () => go('lab', { pid: p.id, lid: sk.lab, track: tr.id, back: sk.id }) }, l.lab.title), '.'));
        }
      }
      const next = h('button', { class: 'btn', 'data-primary': true }, ok ? 'Next question' : 'Got it — next');
      next.addEventListener('click', nextProblem);
      actions.replaceChildren(next);
      qbody.insertBefore(fb, actions);
      setTimeout(() => next.focus(), 30);
      if (newlyMastered) celebrate(sk.title);
      else if (ok && d.correct === DAILY_GOAL) toast('Daily goal reached!');
    }
    const content = h('div', { class: 'stack', style: { gap: '16px' } },
      h('div', { class: 'practice-head' },
        h('button', { class: 'btn-small', onclick: () => go('home', { pid: p.id, track: tr.id }), 'aria-label': 'Back to skills' }, '‹ Skills'),
        h('div', { class: 'grow' }),
        sk.lab && labById(sk.lab) ? h('button', { class: 'btn-small', onclick: () => go('lab', { pid: p.id, lid: sk.lab, track: tr.id, back: sk.id }) }, 'Try it in the Lab') : null),
      h('div', { class: 'stack', style: { gap: '2px' } }, h('span', { class: 'eyebrow', style: { color: 'var(--t)' } }, tr.title + ' · ' + sk.ccss), h('h2', {}, sk.title)),
      h('div', { class: 'score-panel' },
        h('div', { class: 'score-box' }, answeredEl, h('span', {}, 'Answered')),
        h('div', { class: 'score-box smart' }, smart, h('span', {}, 'SmartScore')),
        h('div', { class: 'score-box' }, timeEl, h('span', {}, 'Time'))),
      h('div', { class: 'bar' }, barFill),
      qcard);
    shell(content, { profile: p, track: tr.id });
    nextProblem();
  }
  const PRAISE = ['Correct!', 'Nice work!', 'You got it!', 'Exactly right!', 'Great thinking!', 'Spot on!'];
  const pickPraise = () => PRAISE[Math.floor(Math.random() * PRAISE.length)];

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
      if (!el.isConnected || btns[0].disabled) return;
      const k = e.key.toUpperCase().charCodeAt(0) - 65;
      if (e.key.length === 1 && k >= 0 && k < btns.length && !(e.target.tagName === 'INPUT')) btns[k].click();
    };
    document.addEventListener('keydown', onKey);
    const prevCleanup = cleanup; cleanup = () => { document.removeEventListener('keydown', onKey); if (prevCleanup) prevCleanup(); };
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

  // ---------- Feedback flourishes ----------
  function toast(msg) {
    const t = h('div', { role: 'status', style: { position: 'fixed', left: '50%', bottom: 'calc(20px + env(safe-area-inset-bottom, 0px))', transform: 'translateX(-50%)', background: 'var(--ink)', color: 'var(--paper)', padding: '12px 18px', borderRadius: '18px', maxWidth: 'calc(100% - 32px)', textAlign: 'center', fontSize: '.95rem', fontWeight: 700, zIndex: 60, boxShadow: 'var(--shadow)' } }, msg);
    document.body.appendChild(t); setTimeout(() => t.remove(), 2600);
  }
  function celebrate(title) {
    toast('Skill mastered: ' + title + '!');
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const c = h('canvas', { class: 'confetti' }); document.body.appendChild(c);
    const ctx = c.getContext('2d'); const dpr = window.devicePixelRatio || 1;
    c.width = innerWidth * dpr; c.height = innerHeight * dpr; ctx.scale(dpr, dpr);
    const cols = ['#e8590c', '#0f8b8d', '#7048e8', '#d98a00', '#2563d9', '#2f9e44'];
    const bits = Array.from({ length: 140 }, () => ({ x: innerWidth / 2, y: innerHeight * 0.35, vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 14 - 4, r: Math.random() * Math.PI, c: cols[(Math.random() * cols.length) | 0], s: 6 + Math.random() * 6 }));
    let f = 0;
    (function tick() {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      for (const b of bits) { b.vy += 0.35; b.x += b.vx; b.y += b.vy; b.r += 0.2; ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.r); ctx.fillStyle = b.c; ctx.fillRect(-b.s / 2, -b.s / 4, b.s, b.s / 2); ctx.restore(); }
      if (++f < 110) requestAnimationFrame(tick); else c.remove();
    })();
  }

  // ---------- Math Lab ----------
  function viewLabs() {
    const p = me(); if (!p) return go('profiles');
    const tid = state.track || p.track;
    const content = h('div', { class: 'stack', style: { gap: '20px' } },
      h('div', { class: 'stack' }, h('span', { class: 'eyebrow' }, 'Math Lab'), h('h1', {}, 'Hands-on tools'),
        h('p', { class: 'muted' }, 'Drag, tap and build to see the math move. Use these when a skill feels stuck.')),
      ...[trackById(tid)].concat(MQ.tracks.filter((t) => t.id !== tid)).filter(Boolean).map((t) => h('section', { class: 'stack', 'data-track': t.id },
        h('h2', {}, t.title),
        h('div', { class: 'lab-grid' }, ...(t.labs || []).map((l) => h('button', { class: 'lab-tile', onclick: () => go('lab', { pid: p.id, lid: l.id, track: t.id }) },
          h('span', { class: 'tag' }, t.title), h('h3', {}, l.title), h('p', { class: 'muted', style: { fontSize: '.9rem' } }, l.blurb || '')))))));
    shell(content, { profile: p, track: tid });
  }
  function viewLab() {
    const p = me(); const found = labById(state.lid);
    if (!p || !found) return go('profiles');
    const { track: tr, lab } = found;
    const body = h('div', { class: 'lab-body' });
    const back = state.back && skillById(state.back);
    const related = tr.skills.filter((s) => s.lab === lab.id);
    const content = h('div', { class: 'stack', style: { gap: '16px' } },
      h('div', { class: 'practice-head' },
        back ? h('button', { class: 'btn-small', onclick: () => go('practice', { pid: p.id, sid: back.skill.id, track: tr.id }) }, '‹ Back to practice')
          : h('button', { class: 'btn-small', onclick: () => go('labs', { pid: p.id, track: tr.id }) }, '‹ All tools')),
      h('div', { class: 'stack', style: { gap: '2px' } }, h('span', { class: 'eyebrow', style: { color: 'var(--t)' } }, tr.title + ' · Math Lab'), h('h2', {}, lab.title)),
      lab.blurb ? h('p', { class: 'muted' }, lab.blurb) : null,
      h('div', { class: 'lab-host' }, body),
      related.length ? h('div', { class: 'stack' }, h('span', { class: 'eyebrow' }, 'Practise with this tool'),
        h('div', { class: 'row' }, ...related.map((s) => h('button', { class: 'btn-small', onclick: () => go('practice', { pid: p.id, sid: s.id, track: tr.id }) }, s.title)))) : null);
    shell(content, { profile: p, track: tr.id });
    try { const c = lab.mount(body, window.MathQuestDOM.labApi); if (typeof c === 'function') cleanup = c; }
    catch (e) { body.replaceChildren(h('p', { class: 'flag' }, 'This tool hit an error: ' + e.message)); }
  }

  // ---------- Parent view ----------
  function viewParent() {
    let confirmReset = null;
    const fmtTime = (s) => (s >= 3600 ? Math.floor(s / 3600) + 'h ' : '') + Math.round((s % 3600) / 60) + 'm';
    function kidCard(p) {
      const prog = db.progress[p.id] || {};
      const log = dayLog(p.id);
      const week = Object.entries(log).filter(([k]) => (Date.now() - new Date(k + 'T12:00').getTime()) / 864e5 < 7).reduce((a, [, v]) => ({ answered: a.answered + v.answered, correct: a.correct + v.correct, secs: a.secs + v.secs }), { answered: 0, correct: 0, secs: 0 });
      const rows = [];
      for (const t of MQ.tracks) for (const s of t.skills) {
        const sp = prog[s.id]; if (!sp || !sp.answered) continue;
        const acc = sp.correct / sp.answered;
        const stuck = (sp.answered >= 10 && acc < 0.6) || (sp.missStreak || 0) >= 3 || (sp.best - sp.score >= 15);
        rows.push(h('tr', { 'data-track': t.id },
          h('td', {}, h('div', { style: { fontWeight: 700 } }, s.title), h('div', { class: 'muted', style: { fontSize: '.78rem' } }, t.title + ' · ' + s.ccss), stuck ? h('span', { class: 'flag' }, 'Needs help') : null),
          h('td', { class: 'n' }, h('span', { class: 'mini-bar' }, h('i', { style: { width: sp.score + '%' } })), ' ', String(sp.score)),
          h('td', { class: 'n' }, String(sp.answered)),
          h('td', { class: 'n' }, Math.round(acc * 100) + '%'),
          h('td', { class: 'n' }, fmtTime(sp.secs))));
      }
      const resetArea = h('div');
      const askReset = () => {
        confirmReset = p.id;
        resetArea.replaceChildren(h('div', { class: 'try row' }, h('span', {}, `Erase all of ${p.name}’s progress? This can’t be undone.`),
          h('button', { class: 'btn-small', style: { borderColor: 'var(--bad)', color: 'var(--bad)' }, onclick: () => { delete db.progress[p.id]; delete db.days[p.id]; save(); go('parent'); } }, 'Erase'),
          h('button', { class: 'btn-small', onclick: () => { confirmReset = null; resetArea.replaceChildren(); } }, 'Keep')));
      };
      return h('section', { class: 'card kid-report', 'data-track': p.track },
        h('div', { class: 'row' }, avatar(p), h('div', { class: 'stack', style: { gap: 0, flex: 1, minWidth: 0 } }, h('h3', {}, p.name), h('span', { class: 'muted', style: { fontSize: '.85rem' } }, 'Main track: ' + (TRACK_LABEL[p.track] || p.track))),
          h('button', { class: 'btn-small', onclick: askReset }, 'Reset')),
        h('div', { class: 'stats' },
          h('div', { class: 'stat' }, h('b', {}, String(week.answered)), h('span', {}, 'answered this week')),
          h('div', { class: 'stat' }, h('b', {}, week.answered ? Math.round((week.correct / week.answered) * 100) + '%' : '–'), h('span', {}, 'accuracy this week')),
          h('div', { class: 'stat' }, h('b', {}, fmtTime(week.secs)), h('span', {}, 'time this week'))),
        rows.length ? h('div', { class: 'table-scroll' }, h('table', {},
          h('thead', {}, h('tr', {}, h('th', {}, 'Skill'), h('th', { class: 'n' }, 'SmartScore'), h('th', { class: 'n' }, 'Answered'), h('th', { class: 'n' }, 'Accuracy'), h('th', { class: 'n' }, 'Time'))),
          h('tbody', {}, ...rows))) : h('p', { class: 'muted' }, 'No practice yet. Skills show up here after the first answer.'),
        resetArea);
    }
    const content = h('div', { class: 'stack', style: { gap: '20px' } },
      h('div', { class: 'row', style: { justifyContent: 'space-between' } },
        h('div', { class: 'stack', style: { gap: '4px' } }, h('span', { class: 'eyebrow' }, 'Parent view'), h('h1', {}, 'Progress report')),
        h('div', { class: 'row' }, h('button', { class: 'btn-small', onclick: () => go('setup') }, 'Edit players'), h('button', { class: 'btn-small', onclick: () => go('profiles') }, 'Done'))),
      h('p', { class: 'muted' }, '“Needs help” appears when accuracy is under 60% after 10+ questions, after 3 misses in a row, or when the SmartScore has dropped 15+ points from its best.'),
      ...db.profiles.map(kidCard));
    shell(content);
  }

  // ---------- Render ----------
  function render() {
    if (!db.profiles.length && state.view !== 'setup') state.view = 'setup';
    ({ setup: viewSetup, profiles: viewProfiles, pin: viewPin, home: viewHome, practice: viewPractice, labs: viewLabs, lab: viewLab, parent: viewParent, parentpin: viewParentPin, boot: viewProfiles }[state.view] || viewProfiles)();
  }
  render();
})();
