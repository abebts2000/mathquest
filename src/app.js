/* MathQuest app shell: profiles, skill path, game-style lessons, Math Lab, parent view. */
(function () {
  'use strict';
  const MQ = window.MathQuest;
  const G = window.MathQuestGame;
  const Cloud = window.MathQuestCloud || { enabled: false };
  const R = window.MathQuestRewards;
  const A = window.MathQuestArena;
  const C = window.MathQuestCelebrate || { play() {} };
  const V = window.MathQuestVoice || { line() {}, say() {}, setEnabled() {}, supported: false };
  const { h, svg, tex } = window.MathQuestDOM;
  const { makeWidget, answerText } = window.MathQuestWidgets;
  const app = document.getElementById('app');
  const KEY = 'mathquest.v1';
  const COLORS = ['#e8590c', '#0f8b8d', '#7048e8', '#2563d9', '#c2255c', '#2f9e44', '#d98a00', '#495057'];
  const TRACK_LABEL = { g3: 'Grade 3', g7: 'Grade 7', geo: 'Geometry' };
  const HINT_DEFAULT = 3; // hints per lesson; parents can change it (-1 = unlimited)
  const hintLimit = () => (db.hintLimit == null ? HINT_DEFAULT : db.hintLimit);
  const FREEZE_COST = 50, MAX_FREEZES = 2, QUEST_GEMS = 15, PERFECT_GEMS = 5;

  // ---------- Storage ----------
  const blank = () => ({ profiles: [], progress: {}, days: {}, parentPin: '', gems: {}, freezes: {}, frozen: {}, muted: false, trophies: {}, drops: {}, inv: {}, road: {}, arenaSeen: {} });
  let db = load();
  G.setMuted(db.muted);
  V.setEnabled(!db.muted && !db.voiceOff);
  if (V.choose) V.choose(db.voiceName);
  function load() {
    try { const raw = localStorage.getItem(KEY); if (raw) return Object.assign(blank(), JSON.parse(raw)); } catch (e) { /* storage unavailable */ }
    return blank();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* ignore */ } }
  const keyOf = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const today = () => keyOf(new Date());
  const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return keyOf(d); };
  function skillProg(pid, sid) {
    const p = (db.progress[pid] = db.progress[pid] || {});
    return (p[sid] = p[sid] || { score: 0, answered: 0, correct: 0, secs: 0, best: 0, mastered: false, missStreak: 0, lessons: 0 });
  }
  function dayLog(pid) { return (db.days[pid] = db.days[pid] || {}); }
  function todayLog(pid) { const l = dayLog(pid); return (l[today()] = l[today()] || { answered: 0, correct: 0, secs: 0, xp: 0, bestCombo: 0, lessons: 0, perfect: 0, claimed: [] }); }
  const peekToday = (pid) => dayLog(pid)[today()] || { xp: 0, lessons: 0, claimed: [] };
  const active = (pid, k) => { const d = dayLog(pid)[k]; return !!(d && (d.xp > 0 || d.correct > 0)); };
  const frozenSet = (pid) => (db.frozen[pid] = db.frozen[pid] || []);
  function streakDays(pid) {
    let n = 0, i = active(pid, today()) ? 0 : 1;
    for (; i < 3650; i++) { const k = daysAgo(i); if (active(pid, k)) n++; else if (frozenSet(pid).includes(k)) continue; else break; }
    return n;
  }
  // If yesterday (and maybe earlier days) were missed, spend streak freezes to cover the gap.
  function applyFreezes(pid) {
    const have = db.freezes[pid] || 0; if (!have) return 0;
    const gap = [];
    for (let i = 1; i <= 30; i++) { const k = daysAgo(i); if (active(pid, k)) break; if (!frozenSet(pid).includes(k)) gap.push(k); if (i === 30) return 0; }
    if (!gap.length || gap.length > have || streakDays(pid) === 0 && !gap.length) return 0;
    // only worth spending if there is a streak behind the gap
    const behind = daysAgo(gap.length + 1);
    if (!active(pid, behind) && !frozenSet(pid).includes(behind)) return 0;
    frozenSet(pid).push(...gap); db.freezes[pid] = have - gap.length; save();
    return gap.length;
  }
  const totalXp = (pid) => Object.values(dayLog(pid)).reduce((a, d) => a + (d.xp || 0), 0);
  const weekXp = (pid) => { let s = 0; for (let i = 0; i < 7; i++) { const d = dayLog(pid)[daysAgo(i)]; if (d) s += d.xp || 0; } return s; };

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
  // One button cycles: sound + voice → sound only → muted.
  function soundToggle() {
    const mode = db.muted ? 'off' : db.voiceOff || !V.supported ? 'sound' : 'voice';
    const next = { voice: 'sound', sound: 'off', off: V.supported ? 'voice' : 'sound' }[mode];
    const label = { voice: 'Sound and voice on', sound: 'Sound on, voice off', off: 'Sound off' }[mode];
    const b = h('button', { class: 'icon-btn sound-' + mode, 'aria-label': label + '. Tap to change.', title: label, onclick: () => {
      db.muted = next === 'off'; db.voiceOff = next !== 'voice'; save();
      G.setMuted(db.muted); V.setEnabled(next === 'voice');
      b.replaceWith(soundToggle());
      if (next === 'voice') { G.sfx.correct(); V.say('Voice on! Woo hoo!', { priority: 2 }); }
      else if (next === 'sound') G.sfx.correct();
      toast({ voice: 'Sound and voice on', sound: 'Voice off, sound on', off: 'Sound off' }[next]);
    } }, { voice: '🗣️', sound: '🔊', off: '🔇' }[mode]);
    return b;
  }
  function statPill(icon, value, label, cls) { return h('span', { class: 'stat-pill ' + (cls || ''), title: label, 'aria-label': value + ' ' + label }, icon, h('b', { class: 'tnum' }, String(value))); }
  function shell(content, opts = {}) {
    const p = opts.profile;
    const bar = h('header', { class: 'topbar' },
      h('div', { class: 'topbar-in' },
        h('button', { class: 'brand', onclick: () => go(p ? 'home' : 'profiles', p ? { pid: p.id } : {}), 'aria-label': 'MathQuest home' },
          h('span', { class: 'brand-mark', 'aria-hidden': 'true' }, '÷'), h('span', { class: 'brand-word' }, 'MathQuest')),
        h('div', { class: 'spacer' }),
        p ? statPill(G.flame(streakDays(p.id) > 0, 22), streakDays(p.id), 'day streak', 'streak') : null,
        p ? statPill(R.trophyIcon(20), trophiesOf(p.id), 'trophies', 'trophies') : null,
        p ? statPill(G.gem(20), db.gems[p.id] || 0, 'gems', 'gems') : null,
        p && db.drops[p.id] ? h('button', { class: 'drop-btn', 'aria-label': `Open ${db.drops[p.id]} reward drop${db.drops[p.id] > 1 ? 's' : ''}`, onclick: () => go('drop', { pid: p.id }) }, R.dropBox(1, 30), h('span', { class: 'badge tnum' }, String(db.drops[p.id]))) : null,
        soundToggle(),
        p ? h('button', { class: 'who', onclick: () => go('profiles'), title: 'Switch player', 'aria-label': 'Switch player' }, avatar(p)) : null,
        !p && db.profiles.length ? h('button', { class: 'btn-small', onclick: openParent }, 'Parent view') : null));
    A.set(p ? tierOf(p.id) : 0, 'home');
    app.replaceChildren(bar, h('main', { class: 'wrap', 'data-track': opts.track || (p && p.track) || 'g3' }, content));
  }
  function avatar(p, big) {
    return h('span', { class: 'avatar' + (big ? ' big' : ''), style: { background: p.color } }, (p.name || '?').trim().charAt(0).toUpperCase());
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
          h('label', { class: 'field' }, h('span', { class: 'eyebrow' }, Cloud.enabled ? 'Name (friends will see it, so a nickname works)' : 'Name'),
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
          const kept = new Set(rows.map((r) => r.id));
          for (const old of db.profiles) if (!kept.has(old.id) && old.cloudId && Cloud.enabled) Cloud.deleteKid(old.cloudId).catch(() => {});
          db.profiles = rows.map((r) => ({ id: r.id, name: r.name.trim(), color: r.color, track: r.track, pin: r.pin || '', cloudId: r.cloudId, code: r.code }));
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
          h('span', { class: 'row', style: { gap: '10px', justifyContent: 'center', fontWeight: 700 } },
            h('span', { class: 'row', style: { gap: '3px' } }, G.flame(streak > 0, 20), String(streak)),
            h('span', { class: 'muted tnum' }, totalXp(p.id) + ' XP')));
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

  // ---------- Home: skill path ----------
  const ICONS = { 'g3-mult-div': '×', 'g3-frac-line': '½', 'g3-area-perim': '▦', 'g3-place-round': '≈', 'g3-time': '◷', 'g7-integers': '±', 'g7-proportions': '∝', 'g7-percent': '%', 'g7-equations': '𝑥', 'g7-circles': 'π', 'geo-angles': '∠', 'geo-congruence': '≅', 'geo-right-tri': '◺', 'geo-transform': '↻', 'geo-coord': '⊹' };
  const iconFor = (s) => ICONS[s.id] || (s.strand || '★').charAt(0);
  const PATH_X = [0, 54, 78, 54, 0, -54, -78, -54];
  function nextSkill(p, tr) {
    const prog = db.progress[p.id] || {};
    const open = tr.skills.filter((s) => !(prog[s.id] && prog[s.id].mastered));
    if (!open.length) return null;
    const started = open.filter((s) => prog[s.id] && prog[s.id].answered > 0).sort((a, b) => prog[b.id].score - prog[a.id].score);
    return started[0] || open[0];
  }
  function greeting() { const hr = new Date().getHours(); return hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening'; }

  const greeted = {};
  function viewHome() {
    const p = me(); if (!p) return go('profiles');
    const usedFreeze = applyFreezes(p.id);
    const tid = state.track || p.track;
    const tr = trackById(tid) || MQ.tracks[0];
    const prog = db.progress[p.id] || {};
    const day = peekToday(p.id);
    const xpToday = day.xp || 0;
    const goalPct = Math.min(100, Math.round((xpToday / G.DAILY_XP_GOAL) * 100));
    const next = nextSkill(p, tr);
    const streak = streakDays(p.id);
    const nudge = xpToday >= G.DAILY_XP_GOAL ? 'Daily goal smashed! Every extra lesson is bonus XP.'
      : streak > 0 && !active(p.id, today()) ? `Keep your ${streak}-day streak alive. One lesson does it!`
      : xpToday > 0 ? `${G.DAILY_XP_GOAL - xpToday} XP to go for today’s goal.` : 'Ready for today’s first lesson?';

    // Path nodes
    const path = h('div', { class: 'path', 'data-track': tr.id });
    let pop = null;
    const closePop = () => { if (pop) { pop.remove(); pop = null; } };
    tr.skills.forEach((s, i) => {
      const sp = prog[s.id] || { score: 0, answered: 0 };
      const crowns = G.crownsFor(sp.score);
      const isNext = next && next.id === s.id;
      const node = h('div', { class: 'node-wrap', style: { transform: `translateX(${PATH_X[i % PATH_X.length]}px)` } });
      const btn = h('button', {
        class: 'node' + (sp.mastered ? ' gold' : sp.answered ? ' started' : '') + (isNext ? ' next' : ''),
        'aria-label': `${s.title}. ${crowns} of 3 crowns.`,
        onclick: () => {
          G.sfx.tap();
          const already = pop && pop.dataset.sid === s.id; closePop(); if (already) return;
          pop = h('div', { class: 'node-pop', 'data-sid': s.id },
            h('span', { class: 'eyebrow' }, s.strand + ' · ' + s.ccss),
            h('h3', {}, s.title),
            h('p', {}, s.blurb),
            h('div', { class: 'row', style: { gap: '6px' } }, ...[1, 2, 3].map((k) => G.crownIcon(crowns >= k ? k : 0, 22)),
              h('span', { class: 'pop-level' }, sp.mastered ? 'Mastered!' : `Level ${Math.min(3, crowns + 1)} of 3 · SmartScore ${sp.score}`)),
            h('button', { class: 'btn3d pop-go', onclick: () => go('practice', { pid: p.id, sid: s.id, track: tr.id }) }, sp.answered ? 'Start lesson' : 'Start', h('span', { class: 'xp-tag' }, '+' + (G.XP.correct * G.LESSON_LEN + G.XP.finish) + ' XP')),
            s.lab && labById(s.lab) ? h('button', { class: 'btn-small pop-lab', onclick: () => go('lab', { pid: p.id, lid: s.lab, track: tr.id }) }, 'Explore it in the Math Lab') : null);
          node.after(pop);
          pop.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      },
      sp.score > 0 && !sp.mastered ? progressArc(sp.score) : null,
      h('span', { class: 'node-face' }, h('span', { class: 'node-icon' }, iconFor(s))));
      node.append(btn);
      if (crowns) node.append(h('span', { class: 'node-crown' }, G.crownIcon(crowns, 18), h('b', {}, String(crowns))));
      if (isNext) node.prepend(h('span', { class: 'start-bubble' }, sp.answered ? 'Continue' : 'Start'));
      path.append(node);
      if (i % 2 === 1 && i < tr.skills.length - 1 && tr.labs && tr.labs.length) {
        const lab = tr.labs[((i - 1) / 2) % tr.labs.length];
        path.append(h('div', { class: 'node-wrap chest-wrap', style: { transform: `translateX(${-PATH_X[(i + 1) % PATH_X.length] * 0.9}px)` } },
          h('button', { class: 'chest-btn', 'aria-label': 'Math Lab: ' + lab.title, onclick: () => go('lab', { pid: p.id, lid: lab.id, track: tr.id }) }, G.chest(false, 58)),
          h('span', { class: 'chest-label' }, lab.title)));
      }
    });
    path.append(h('div', { class: 'node-wrap', style: { transform: `translateX(${PATH_X[tr.skills.length % PATH_X.length]}px)` } },
      h('div', { class: 'trophy' + (tr.skills.every((s) => prog[s.id] && prog[s.id].mastered) ? ' won' : '') }, '🏆')));

    const content = h('div', { class: 'home-grid' },
      h('div', { class: 'home-main stack', style: { gap: '18px' } },
        h('div', { class: 'hero-card' },
          h('button', { class: 'pip-btn', 'aria-label': 'Open collection', onclick: () => go('collection', { pid: p.id }) }, pip(p, xpToday >= G.DAILY_XP_GOAL ? 'happy' : 'idle', 84), h('span', { class: 'pip-edit' }, '✎')),
          h('div', { class: 'bubble' }, h('b', {}, `${greeting()}, ${p.name}!`, pinOf(p)), h('span', {}, nudge))),
        trophyRoad(p),
        h('div', { class: 'goal-card' },
          h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('span', { class: 'eyebrow' }, 'Daily goal'), h('span', { class: 'tnum goal-num' }, `${Math.min(xpToday, G.DAILY_XP_GOAL)} / ${G.DAILY_XP_GOAL} XP`)),
          h('div', { class: 'xpbar' }, h('i', { style: { width: goalPct + '%' } }))),
        h('div', { class: 'tabs track-tabs' }, ...MQ.tracks.map((t) => h('button', { class: 'btn-small' + (t.id === tr.id ? ' on' : ''), 'data-t': t.id, onclick: () => go('home', { pid: p.id, track: t.id }) }, t.title))),
        h('div', { class: 'unit-banner', 'data-track': tr.id },
          h('div', { class: 'stack', style: { gap: '2px', minWidth: 0 } }, h('span', { class: 'eyebrow' }, 'Unit 1'), h('h2', {}, tr.title), h('p', {}, tr.subtitle || '')),
          h('button', { class: 'banner-btn', onclick: () => go('labs', { pid: p.id, track: tr.id }), 'aria-label': 'Open Math Lab' }, 'Math Lab')),
        path),
      h('aside', { class: 'home-side stack', style: { gap: '16px' } }, questsCard(p), Cloud.enabled ? friendsCard(p) : null, freezeCard(p), leagueCard(p)));
    shell(content, { profile: p, track: tr.id });
    if (!greeted[p.id]) { greeted[p.id] = true; V.line('hello', { name: p.name }, { delay: 400 }); }
    const tierNow = tierOf(p.id);
    if (tierNow > (db.arenaSeen[p.id] || 0)) { db.arenaSeen[p.id] = tierNow; save(); setTimeout(() => arenaUnlocked(p, tierNow), 450); }
    if (usedFreeze) setTimeout(() => toast(`A streak freeze saved your streak! (${usedFreeze} day${usedFreeze > 1 ? 's' : ''} covered)`), 400);
  }
  function progressArc(score) {
    const r = 41, c = 2 * Math.PI * r;
    return svg('svg', { class: 'node-ring', viewBox: '0 0 92 92', 'aria-hidden': 'true' },
      svg('circle', { cx: 46, cy: 46, r, fill: 'none', stroke: 'var(--surface-2)', 'stroke-width': 7 }),
      svg('circle', { cx: 46, cy: 46, r, fill: 'none', stroke: 'var(--t)', 'stroke-width': 7, 'stroke-linecap': 'round', 'stroke-dasharray': `${(c * score) / 100} ${c}`, transform: 'rotate(-90 46 46)' }));
  }
  function questsCard(p) {
    const d = peekToday(p.id);
    const qs = G.questsFor(d, today());
    const card = h('section', { class: 'side-card' }, h('h3', {}, 'Daily quests'));
    for (const q of qs) {
      const done = q.have >= q.goal, claimed = (d.claimed || []).includes(q.id);
      const box = h('div', { class: 'quest' + (done ? ' done' : '') },
        h('div', { class: 'quest-main' },
          h('div', { class: 'quest-row' }, h('span', { class: 'quest-title' }, q.title), h('span', { class: 'quest-count tnum' }, `${q.have} / ${q.goal}`)),
          h('div', { class: 'qbar' }, h('i', { style: { width: Math.round((q.have / q.goal) * 100) + '%' } }))));
      if (done && !claimed) {
        const btn = h('button', { class: 'chest-btn small wiggle', 'aria-label': 'Open reward chest', onclick: (e) => {
          const t = todayLog(p.id); t.claimed = (t.claimed || []).concat(q.id);
          db.gems[p.id] = (db.gems[p.id] || 0) + QUEST_GEMS; save();
          btn.replaceChildren(G.chest(true, 40)); btn.classList.remove('wiggle'); btn.disabled = true;
          G.sfx.chest(); G.buzz(20); G.floatText(btn, `+${QUEST_GEMS} gems`, 'gem'); V.line('gems', { n: QUEST_GEMS }, { priority: 2, delay: 200 });
          const r = btn.getBoundingClientRect(); G.confetti({ count: 50, x: r.left + r.width / 2, y: r.top });
          setTimeout(() => go('home', { pid: p.id, track: state.track }), 1100);
        } }, G.chest(false, 40));
        box.append(btn);
      } else box.append(h('span', { class: 'quest-chest' + (claimed ? ' claimed' : '') }, G.chest(claimed, 34)));
      card.append(box);
    }
    return card;
  }
  function freezeCard(p) {
    const gems = db.gems[p.id] || 0, have = db.freezes[p.id] || 0;
    const msg = h('p', { class: 'muted', style: { fontSize: '.85rem' }, role: 'status' });
    return h('section', { class: 'side-card' },
      h('div', { class: 'row', style: { gap: '12px', flexWrap: 'nowrap' } },
        h('span', { class: 'freeze-icon' }, '❄'),
        h('div', { class: 'stack', style: { gap: '2px', flex: 1, minWidth: 0 } }, h('h3', {}, 'Streak freeze'),
          h('span', { class: 'muted', style: { fontSize: '.85rem' } }, `Covers a missed day. You have ${have} of ${MAX_FREEZES}.`)),
        h('button', { class: 'btn3d small blue', disabled: have >= MAX_FREEZES, onclick: () => {
          if (gems < FREEZE_COST) { msg.textContent = `You need ${FREEZE_COST - gems} more gems. Open quest chests to earn them.`; G.sfx.wrong(); return; }
          db.gems[p.id] = gems - FREEZE_COST; db.freezes[p.id] = have + 1; save(); G.sfx.chest(); go('home', { pid: p.id, track: state.track });
        } }, G.gem(16), String(FREEZE_COST))),
      msg);
  }
  function leagueCard(p) {
    const rows = db.profiles.map((k) => ({ k, xp: weekXp(k.id) })).sort((a, b) => b.xp - a.xp);
    const medal = ['🥇', '🥈', '🥉'];
    return h('section', { class: 'side-card' }, h('h3', {}, 'Family league'), h('span', { class: 'muted', style: { fontSize: '.85rem' } }, 'XP earned in the last 7 days'),
      h('ol', { class: 'league' }, ...rows.map((r, i) => h('li', { class: r.k.id === p.id ? 'me' : '' },
        h('span', { class: 'rank' }, r.xp > 0 && i < 3 ? medal[i] : String(i + 1)), avatar(r.k), h('span', { class: 'lname' }, r.k.name, pinOf(r.k)), h('b', { class: 'tnum' }, r.xp + ' XP')))));
  }

  // ---------- Lesson ----------
  const PRAISE = ['Awesome!', 'Nice!', 'Great job!', 'Amazing!', 'You got it!', 'Brilliant!', 'Spot on!', 'Excellent!'];
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  function viewPractice() {
    const p = me(); const found = skillById(state.sid);
    if (!p || !found) return go('profiles');
    const { track: tr, skill: sk } = found;
    const sp = skillProg(p.id, sk.id);
    const startScore = sp.score, startCrowns = G.crownsFor(sp.score);
    const wasActiveToday = active(p.id, today());
    const streakBefore = streakDays(p.id);
    const L = { correct: 0, wrong: 0, asked: 0, combo: 0, bestCombo: 0, xp: 0, started: Date.now(), hintsLeft: hintLimit(), hintsUsed: 0 };
    const recent = [];
    let problem = null, widget = null, shownAt = 0, phase = 'answer', missStreak = 0;

    const bar = h('i', { style: { width: '0%' } });
    const comboChip = h('span', { class: 'combo', hidden: true });
    const top = h('div', { class: 'lesson-top' },
      h('button', { class: 'icon-btn close', 'aria-label': 'Quit lesson', onclick: askQuit }, '✕'),
      h('div', { class: 'lbar', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': G.LESSON_LEN }, bar),
      comboChip);
    const card = h('section', { class: 'lesson-card' });
    const foot = h('footer', { class: 'lesson-foot' });
    const screen = h('div', { class: 'lesson', 'data-track': tr.id }, top, h('div', { class: 'lesson-body' }, card), foot);
    app.replaceChildren(screen);
    A.set(tierOf(p.id), 'lesson');

    const onKey = (e) => {
      if (e.key !== 'Enter' || (e.target.tagName === 'BUTTON' && !e.target.hasAttribute('data-primary'))) return;
      const primary = foot.querySelector('[data-primary]');
      if (primary && !primary.disabled) { e.preventDefault(); primary.click(); }
    };
    document.addEventListener('keydown', onKey);
    cleanup = () => document.removeEventListener('keydown', onKey);

    function paintTop() {
      bar.style.width = (L.correct / G.LESSON_LEN) * 100 + '%';
      top.querySelector('.lbar').setAttribute('aria-valuenow', L.correct);
      if (L.combo >= 2) { comboChip.hidden = false; comboChip.replaceChildren(G.flame(true, 18), h('b', {}, String(L.combo))); G.restartAnim(comboChip, 'bump'); }
      else comboChip.hidden = true;
    }
    function nextProblem() {
      if (L.correct >= G.LESSON_LEN || L.asked >= G.LESSON_LEN * 2) return finish();
      phase = 'answer';
      const level = MQ.levelFor(sp.score);
      let pr = null;
      for (let tries = 0; tries < 8; tries++) {
        try { pr = sk.generate(MQ.makeRng((Math.random() * 2 ** 31) | 0), level); } catch (e) { pr = null; continue; }
        if (pr && !recent.includes(pr.prompt + (pr.figure || ''))) break;
      }
      if (!pr) { card.replaceChildren(h('p', {}, 'Something went wrong making a question. Quit and try again.')); return; }
      if (window.__MQ_TEST__) window.__MQ_TEST__.problem = pr;
      problem = pr; recent.push(pr.prompt + (pr.figure || '')); if (recent.length > 12) recent.shift();
      shownAt = Date.now();
      const check = h('button', { class: 'btn3d wide', 'data-primary': true, disabled: true }, 'Check');
      widget = makeWidget(pr.input, () => { check.disabled = !widget.ready(); });
      check.disabled = !widget.ready();
      const hintBox = h('div');
      const tag = level === 3 ? 'Challenge' : level === 2 ? 'Level 2' : 'Level 1';
      card.replaceChildren(
        h('div', { class: 'q-head' }, pip(p, 'think', 52), h('div', { class: 'q-tag' }, h('span', { class: 'chip' }, tag), h('span', { class: 'muted' }, sk.title))),
        tex(h('div', { class: 'prompt', html: pr.prompt })),
        pr.figure ? tex(h('div', { class: 'figure', html: pr.figure })) : '',
        h('div', { class: 'answer-area' }, widget.el), hintBox);
      G.restartAnim(card, 'slide-in');
      foot.className = 'lesson-foot';
      foot.replaceChildren(h('div', { class: 'foot-in' },
        hintFor(pr) ? hintButton(hintFor(pr), hintBox) : null,
        check));
      check.addEventListener('click', grade);
      setTimeout(() => widget.focus && widget.focus(), 60);
    }
    // Hint button with the number left this lesson; shows a "hints left" note after each use.
    // Use the problem's hint, or else the first step of its worked solution (when there are later steps).
    const hintFor = (pr) => pr.hint || (Array.isArray(pr.explanation) && pr.explanation.length >= 2 ? pr.explanation[0] : null);
    function hintButton(hintHtml, hintBox) {
      const unlimited = L.hintsLeft < 0;
      if (!unlimited && L.hintsLeft === 0) return h('button', { class: 'btn3d ghost hint-btn', disabled: true, title: 'No hints left in this lesson' }, 'No hints left');
      return h('button', { class: 'btn3d ghost hint-btn', 'aria-label': unlimited ? 'Hint' : `Hint, ${L.hintsLeft} left`, onclick: (e) => {
        G.sfx.tap(); L.hintsUsed++;
        if (!unlimited) L.hintsLeft--;
        const left = L.hintsLeft;
        const note = unlimited ? null : left === 0 ? 'That was your last hint for this lesson. You’ve got this!' : `You have ${left} hint${left === 1 ? '' : 's'} left in this lesson.`;
        hintBox.replaceChildren(tex(h('div', { class: 'hint' }, h('div', { html: hintHtml }),
          note ? h('div', { class: 'hint-left' + (left === 0 ? ' last' : '') }, h('span', { class: 'hint-bulbs', 'aria-hidden': 'true' }, ...Array.from({ length: hintLimit() }, (_, i) => h('i', { class: i < left ? 'on' : '' }))), note) : null)));
        if (note) R.callout(left === 0 ? 'LAST HINT!' : `${left} HINT${left === 1 ? '' : 'S'} LEFT`, left === 0 ? '#ff8a1f' : '#ffc928', left === 0 ? 'You’ve got this!' : 'in this lesson');
        if (note) V.say(left === 0 ? 'That was your last hint!' : `${left} hint${left === 1 ? '' : 's'} left!`, { delay: 150 });
        e.currentTarget.remove();
      } }, 'Hint', unlimited ? null : h('span', { class: 'hint-count tnum' }, String(L.hintsLeft)));
    }
    function grade() {
      if (phase !== 'answer' || !widget.ready()) return;
      phase = 'feedback';
      const ok = MQ.check(problem, widget.value());
      const secs = Math.min(120, Math.round((Date.now() - shownAt) / 1000));
      L.asked++;
      sp.score = MQ.updateScore(sp.score, ok);
      sp.answered++; sp.secs += secs; sp.best = Math.max(sp.best || 0, sp.score); sp.lastAt = Date.now();
      const d = todayLog(p.id); d.answered++; d.secs += secs;
      let gained = 0, comboHit = false;
      if (ok) {
        sp.correct++; sp.missStreak = 0; missStreak = 0; d.correct++;
        L.correct++; L.combo++; L.bestCombo = Math.max(L.bestCombo, L.combo); d.bestCombo = Math.max(d.bestCombo || 0, L.combo);
        gained = G.XP.correct;
        if (L.combo % G.XP.comboEvery === 0) { gained += G.XP.comboBonus; comboHit = true; }
      } else { L.wrong++; L.combo = 0; sp.missStreak = (sp.missStreak || 0) + 1; missStreak++; }
      L.xp += gained; d.xp = (d.xp || 0) + gained;
      if (sp.score === 100 && !sp.mastered) sp.mastered = true;
      save();
      widget.lock(ok, problem);
      paintTop();

      if (ok) {
        G.sfx.correct(L.combo); G.buzz(12);
        C.play({ combo: L.combo });
        if (!comboHit && !({ 2: 1, 3: 1, 4: 1 })[L.combo]) V.line('correct', null, { delay: 180 });
        G.floatText(top.querySelector('.lbar'), '+' + gained + ' XP', 'xp');
        const CALL = { 2: ['DOUBLE!', '#2f9bff'], 3: ['TRIPLE!', '#b05cff'], 4: ['ON FIRE!', '#ff8a1f'] };
        if (comboHit) setTimeout(() => { G.sfx.combo(); R.callout('UNSTOPPABLE!', '#ff3d6e', `${L.combo} in a row · +${G.XP.comboBonus} bonus XP`); R.shakeScreen('big'); V.line('unstoppable', null, { priority: 2, pitch: 1.3, rate: 1.12 }); }, 200);
        else if (CALL[L.combo]) setTimeout(() => { G.sfx.callout(); R.callout(CALL[L.combo][0], CALL[L.combo][1]); R.shakeScreen(); V.line('combo', { key: L.combo }, { priority: 2, pitch: 1.3, rate: 1.12 }); }, 150);
      } else {
        G.sfx.wrong(); G.buzz([30, 50, 30]); G.restartAnim(card, 'shake');
        V.line('wrong', null, { delay: 250, pitch: 1.12, rate: 1 });
      }
      const cont = h('button', { class: 'btn3d wide ' + (ok ? 'good' : 'bad'), 'data-primary': true, onclick: () => { G.sfx.tap(); nextProblem(); } }, 'Continue');
      const panel = h('div', { class: 'fb' },
        h('div', { class: 'fb-head' }, h('span', { class: 'fb-icon' }, ok ? '✓' : '✕'), h('b', { class: 'fb-title' }, ok ? pick(PRAISE) : 'Correct solution:')));
      if (!ok) {
        panel.append(tex(h('div', { class: 'fb-answer', html: answerText(problem) })));
        const why = h('details', { class: 'fb-why', open: true }, h('summary', {}, 'How to solve it'), h('ol', {}, ...problem.explanation.map((s) => h('li', { html: s }))));
        panel.append(tex(why));
        if (sk.lab && missStreak >= 2 && labById(sk.lab)) panel.append(h('button', { class: 'btn-small', onclick: () => go('lab', { pid: p.id, lid: sk.lab, track: tr.id, back: sk.id }) }, 'Stuck? Try it in the ' + labById(sk.lab).lab.title));
      } else if (L.combo >= 3) panel.append(h('span', { class: 'fb-sub' }, `${L.combo} in a row!`));
      foot.className = 'lesson-foot ' + (ok ? 'good' : 'bad');
      foot.replaceChildren(h('div', { class: 'foot-in col' }, panel, cont));
      setTimeout(() => cont.focus(), 60);
    }
    function askQuit() {
      if (screen.querySelector('.sheet')) return;
      const sheet = h('div', { class: 'sheet-scrim' },
        h('div', { class: 'sheet', role: 'dialog', 'aria-label': 'Quit lesson?' },
          pip(p, 'sad', 72),
          h('h2', {}, 'Wait, don’t go!'),
          h('p', { class: 'muted' }, L.correct ? `You’re ${G.LESSON_LEN - L.correct} away from finishing. Quit now and you’ll miss the lesson bonus.` : 'You’ll lose this lesson if you quit now.'),
          h('button', { class: 'btn3d wide', onclick: () => sheet.remove() }, 'Keep learning'),
          h('button', { class: 'btn3d wide ghost danger', onclick: () => go('home', { pid: p.id, track: tr.id }) }, 'End lesson')));
      screen.appendChild(sheet);
      V.line('quit', null, { priority: 2, pitch: 1.15 });
    }
    function finish() {
      const secs = Math.round((Date.now() - L.started) / 1000);
      const perfect = L.wrong === 0 && L.correct >= G.LESSON_LEN;
      const done = L.correct >= G.LESSON_LEN;
      const d = todayLog(p.id);
      const goalBefore = (d.xp || 0) >= G.DAILY_XP_GOAL;
      let bonus = 0;
      if (done) { bonus += G.XP.finish; d.lessons = (d.lessons || 0) + 1; sp.lessons = (sp.lessons || 0) + 1; }
      if (perfect) { bonus += G.XP.perfect; d.perfect = (d.perfect || 0) + 1; db.gems[p.id] = (db.gems[p.id] || 0) + PERFECT_GEMS; }
      L.xp += bonus; d.xp = (d.xp || 0) + bonus;
      const trophies = R.trophiesFor(L.correct, L.wrong, done);
      db.trophies[p.id] = trophiesOf(p.id) + trophies;
      if (done) db.drops[p.id] = (db.drops[p.id] || 0) + 1;
      save();
      const goalNow = d.xp >= G.DAILY_XP_GOAL;
      cloudSync(p);
      const crownsNow = G.crownsFor(sp.score);
      const acc = L.asked ? Math.round((L.correct / L.asked) * 100) : 0;
      const streakNow = streakDays(p.id);
      const extended = !wasActiveToday && streakNow > 0;

      const xpEl = h('b', { class: 'tnum' }, '0'), accEl = h('b', { class: 'tnum' }, '0%'), timeEl = h('b', { class: 'tnum' }, '0:00');
      const tile = (cls, label, el) => h('div', { class: 'res-tile ' + cls }, h('span', { class: 'res-label' }, label), h('div', { class: 'res-val' }, el));
      const extras = h('div', { class: 'res-extras' });
      if (crownsNow > startCrowns) extras.append(h('div', { class: 'res-badge' }, G.crownIcon(crownsNow, 26), crownsNow === 3 ? `${sk.title} mastered!` : `New crown! Level ${crownsNow} reached`));
      extras.append(h('div', { class: 'res-badge plain' }, `SmartScore ${startScore} → `, h('b', {}, String(sp.score))));
      if (perfect) extras.append(h('div', { class: 'res-badge' }, G.gem(22), `Perfect lesson! +${PERFECT_GEMS} gems`));
      if (hintLimit() > 0) extras.append(h('div', { class: 'res-badge plain' }, `Hints used: ${L.hintsUsed} of ${hintLimit()}`));
      if (goalNow && !goalBefore) extras.append(h('div', { class: 'res-badge' }, '🎯', 'Daily goal complete!'));
      const title = done ? (perfect ? 'FLAWLESS VICTORY!' : 'VICTORY!') : 'Nice effort!';
      const trophyEl = h('b', { class: 'tnum' }, '+0');
      if (trophies) extras.prepend(h('div', { class: 'trophy-gain' }, R.trophyIcon(40), trophyEl));
      if (done) extras.append(h('div', { class: 'res-badge drop-earned' }, R.dropBox(2, 30), 'Reward drop earned!'));
      const cont = h('button', { class: 'btn3d wide', 'data-primary': true, onclick: () => (extended ? streakScreen() : go('home', { pid: p.id, track: tr.id })) }, 'Continue');
      card.replaceChildren(h('div', { class: 'results' },
        h('div', { class: 'res-mascot' }, h('div', { class: 'res-rays' }, R.rays('#ffc928', 340)), pip(p, 'cheer', 140)),
        h('h1', { class: 'victory' + (done ? '' : ' soft') }, title),
        h('div', { class: 'res-tiles' }, tile('xp', 'Total XP', xpEl), tile('acc', acc >= 90 ? 'Amazing' : acc >= 70 ? 'Good' : 'Accuracy', accEl), tile('time', 'Time', timeEl)),
        extras));
      top.hidden = true;
      foot.className = 'lesson-foot';
      foot.replaceChildren(h('div', { class: 'foot-in' }, cont));
      G.restartAnim(card, 'slide-in');
      G.sfx.complete(); G.buzz([20, 40, 20, 40, 60]);
      V.line(perfect ? 'flawless' : done ? 'victory' : 'effort', { name: p.name }, { priority: 2, delay: 650, pitch: 1.28 });
      if (crownsNow > startCrowns) V.line(crownsNow === 3 ? 'mastered' : 'crown', { n: crownsNow }, { delay: 2600 });
      else if (goalNow && !goalBefore) V.line('goal', null, { delay: 2600 });
      if (done) { G.confetti(); setTimeout(() => G.confetti({ count: 90, x: innerWidth * 0.2 }), 350); setTimeout(() => G.confetti({ count: 90, x: innerWidth * 0.8 }), 600); }
      G.countUp(xpEl, L.xp, 900);
      if (trophies) setTimeout(() => { G.countUp(trophyEl, trophies, 700, (v) => '+' + v); G.sfx.trophy(); }, 500);
      if (done) R.shakeScreen(); G.countUp(accEl, acc, 900, (v) => v + '%');
      G.countUp(timeEl, secs, 900, (v) => Math.floor(v / 60) + ':' + String(v % 60).padStart(2, '0'));
      setTimeout(() => cont.focus(), 100);

      function streakScreen() {
        const num = h('b', { class: 'streak-num tnum' }, String(Math.max(0, streakBefore)));
        const week = h('div', { class: 'week-dots' });
        for (let i = 6; i >= 0; i--) {
          const k = daysAgo(i); const dd = new Date(); dd.setDate(dd.getDate() - i);
          const on = active(p.id, k), fz = frozenSet(p.id).includes(k);
          week.append(h('div', { class: 'wd' + (on ? ' on' : fz ? ' frozen' : '') + (i === 0 ? ' today' : '') }, h('span', {}, dd.toLocaleDateString(undefined, { weekday: 'narrow' })), h('i', {}, on ? '✓' : fz ? '❄' : '')));
        }
        card.replaceChildren(h('div', { class: 'results streak-screen' },
          h('div', { class: 'big-flame' }, G.flame(true, 150)), num, h('h1', {}, 'day streak!'),
          h('p', { class: 'muted' }, streakNow === 1 ? 'Day one! Practise tomorrow to keep the flame going.' : 'You’re on fire! Come back tomorrow to keep it going.'),
          week));
        G.restartAnim(card, 'slide-in');
        setTimeout(() => { num.textContent = String(streakNow); G.restartAnim(num, 'bump'); G.sfx.streak(); G.buzz([30, 30, 60]); V.line(streakNow === 1 ? 'streakFirst' : 'streak', { n: streakNow }, { priority: 2, delay: 350, pitch: 1.28 }); }, 650);
        const c2 = h('button', { class: 'btn3d wide orange', 'data-primary': true, onclick: () => go('home', { pid: p.id, track: tr.id }) }, 'Continue');
        foot.replaceChildren(h('div', { class: 'foot-in' }, c2));
        setTimeout(() => c2.focus(), 100);
      }
    }
    paintTop();
    nextProblem();
  }

  // ---------- Rewards, collection & arenas ----------
  function invOf(pid) {
    const i = (db.inv[pid] = db.inv[pid] || {});
    i.skins = i.skins || ['classic']; i.hats = i.hats || ['none']; i.pins = i.pins || [];
    i.skin = i.skin || 'classic'; i.hat = i.hat || 'none';
    return i;
  }
  function look(p) {
    const i = invOf(p.id); const s = R.SKINS.find((x) => x.id === i.skin);
    return { color: (s && s.color) || 'var(--t)', hat: i.hat && i.hat !== 'none' ? i.hat : null };
  }
  const pip = (p, state, size) => { const l = look(p); return G.mascot(state, size, l.color, l.hat); };
  const trophiesOf = (pid) => db.trophies[pid] || 0;
  const tierOf = (pid) => A.tierFor(trophiesOf(pid));
  function pinOf(p) {
    const i = invOf(p.id); const pin = R.PINS.find((x) => x.id === i.pin);
    return pin ? h('span', { class: 'pin-badge', 'aria-hidden': 'true' }, pin.e) : null;
  }
  function grant(p, r) {
    const i = invOf(p.id);
    switch (r.type) {
      case 'gems': db.gems[p.id] = (db.gems[p.id] || 0) + r.n; break;
      case 'drop': db.drops[p.id] = (db.drops[p.id] || 0) + r.n; break;
      case 'skin': if (!i.skins.includes(r.id)) i.skins.push(r.id); break;
      case 'hat': if (!i.hats.includes(r.id)) i.hats.push(r.id); break;
      case 'pin': if (!i.pins.includes(r.id)) i.pins.push(r.id); break;
      case 'freeze':
        if ((db.freezes[p.id] || 0) < MAX_FREEZES) db.freezes[p.id] = (db.freezes[p.id] || 0) + 1;
        else db.gems[p.id] = (db.gems[p.id] || 0) + FREEZE_COST;
        break;
    }
    save();
  }
  function rewardIcon(r, size = 56) {
    switch (r.type) {
      case 'gems': return G.gem(size);
      case 'drop': return R.dropBox(Math.min(4, (r.n || 1) - 1), size);
      case 'skin': { const s = R.SKINS.find((x) => x.id === r.id); return G.mascot('happy', size, (s && s.color) || 'var(--t)'); }
      case 'hat': return G.mascot('happy', size, 'var(--t)', r.id);
      case 'pin': { const s = R.PINS.find((x) => x.id === r.id); return h('span', { class: 'emoji-icon', style: { fontSize: size * 0.72 + 'px' } }, s ? s.e : '?'); }
      case 'freeze': return h('span', { class: 'emoji-icon freeze', style: { fontSize: size * 0.6 + 'px' } }, '❄');
      default: return h('span', {}, '?');
    }
  }
  const rarityOf = (r) => {
    const list = { skin: R.SKINS, hat: R.HATS, pin: R.PINS }[r.type];
    const item = list && list.find((x) => x.id === r.id);
    return item ? item.rarity : r.type === 'drop' ? 2 : r.type === 'freeze' ? 3 : 1;
  };

  function trophyRoad(p) {
    const tr = trophiesOf(p.id);
    const claimed = (db.road[p.id] = db.road[p.id] || []);
    const tier = A.tierFor(tr), arena = A.ARENAS[tier], next = A.ARENAS[tier + 1];
    const track = h('div', { class: 'road-track' });
    let focus = null;
    R.ROAD.forEach((m, idx) => {
      const reached = tr >= m.at, done = claimed.includes(m.at), prevAt = idx ? R.ROAD[idx - 1].at : 0;
      const fill = reached ? 100 : tr <= prevAt ? 0 : Math.round(((tr - prevAt) / (m.at - prevAt)) * 100);
      const btn = h('button', {
        class: 'road-reward' + (reached && !done ? ' ready' : ''), style: { '--c': R.RARITY[rarityOf(m.reward)].color },
        'aria-label': `${m.at} trophies: ${R.describe(m.reward).title}${done ? ' (claimed)' : reached ? ' (tap to claim)' : ''}`,
        disabled: !reached || done,
        onclick: () => {
          if (claimed.includes(m.at)) return;
          claimed.push(m.at); grant(p, m.reward);
          btn.disabled = true; btn.classList.remove('ready'); btn.append(h('span', { class: 'road-check' }, '✓'));
          G.sfx.chest(); G.buzz(20); R.shakeScreen(); V.line('unlock', null, { priority: 2 });
          const r = btn.getBoundingClientRect(); G.confetti({ count: 60, x: r.left + r.width / 2, y: r.top });
          if (m.reward.type === 'gems') R.flyTo(btn, '.stat-pill.gems', G.gem(22));
          G.floatText(btn, R.describe(m.reward).title, 'gem');
          setTimeout(() => go('home', { pid: p.id, track: state.track }), 1200);
        }
      }, rewardIcon(m.reward, 46), done ? h('span', { class: 'road-check' }, '✓') : null);
      const step = h('div', { class: 'road-step' + (reached ? ' reached' : '') },
        h('div', { class: 'road-line' }, h('i', { style: { width: fill + '%' } })),
        h('span', { class: 'road-at tnum' }, R.trophyIcon(14), String(m.at)), btn,
        h('span', { class: 'road-label' }, R.describe(m.reward).title));
      if (!focus && ((reached && !done) || !reached)) focus = step;
      track.append(step);
    });
    const scroller = h('div', { class: 'road-scroll' }, track);
    setTimeout(() => { if (focus) scroller.scrollLeft = Math.max(0, focus.offsetLeft - scroller.clientWidth / 2 + focus.offsetWidth / 2); }, 0);
    const pct = next ? Math.round(((tr - arena.at) / (next.at - arena.at)) * 100) : 100;
    return h('section', { class: 'road-card' },
      h('div', { class: 'road-head' },
        h('div', { class: 'stack', style: { gap: '2px', minWidth: 0 } },
          h('span', { class: 'arena-chip' }, `Arena ${tier + 1}`), h('h3', { class: 'arena-name' }, arena.name)),
        h('div', { class: 'trophy-total tnum' }, R.trophyIcon(30), h('b', {}, String(tr)))),
      next ? h('div', { class: 'arena-next' }, h('div', { class: 'xpbar arena-bar' }, h('i', { style: { width: pct + '%' } })),
        h('span', { class: 'muted tnum' }, `${next.at - tr} trophies to ${next.name}`)) : h('p', { class: 'muted' }, 'Top arena reached!'),
      scroller);
  }

  function arenaUnlocked(p, tier) {
    const a = A.ARENAS[tier];
    const sky = h('div', { class: 'arena-swatch', style: { background: `linear-gradient(160deg, ${a.sky[0]}, ${a.sky[1]})` } }, ...a.glyphs.split('').map((g) => h('span', {}, g)));
    const scrim = h('div', { class: 'levelup-scrim' },
      h('div', { class: 'levelup' },
        h('div', { class: 'levelup-rays' }, R.rays('#ffc928', 420)),
        h('span', { class: 'callout-title' }, 'NEW ARENA!'),
        sky,
        h('h2', { class: 'outlined' }, a.name),
        h('p', {}, `Arena ${tier + 1} unlocked at ${a.at} trophies. The background just levelled up!`),
        h('button', { class: 'btn3d wide yellow', onclick: () => scrim.remove() }, 'Let’s go!')));
    document.body.appendChild(scrim);
    G.sfx.levelup(); R.shakeScreen('big'); G.buzz([40, 40, 80]);
    V.line('arena', { arena: a.name }, { priority: 2, delay: 900, pitch: 1.3 });
    G.confetti(); setTimeout(() => G.confetti({ count: 100, x: innerWidth * 0.15 }), 300); setTimeout(() => G.confetti({ count: 100, x: innerWidth * 0.85 }), 550);
  }

  // ---------- Reward drop opening ----------
  function viewDrop() {
    const p = me(); if (!p) return go('profiles');
    const left = db.drops[p.id] || 0;
    if (!left) return go('home', { pid: p.id });
    let rarity = 0, taps = 0, opened = false;
    const TAPS = 4;
    const raysBox = h('div', { class: 'drop-rays' }, R.rays(R.RARITY[0].color, 380));
    const box = h('button', { class: 'drop-box-btn', 'aria-label': 'Tap the drop' }, R.dropBox(0, 180));
    const label = h('div', { class: 'rarity-label', style: { '--c': R.RARITY[0].color } }, R.RARITY[0].name);
    const hint = h('p', { class: 'drop-hint' }, 'Tap the drop! Each tap might upgrade it.');
    const pips = h('div', { class: 'drop-pips' }, ...Array.from({ length: TAPS }, () => h('i')));
    const stage = h('div', { class: 'drop-stage', style: { '--c': R.RARITY[0].color } }, raysBox, label, box, pips, hint);
    const content = h('div', { class: 'stack', style: { gap: '12px', alignItems: 'center' } },
      h('span', { class: 'callout-title small' }, 'REWARD DROP'),
      h('p', { class: 'muted' }, left > 1 ? `${left} drops waiting` : 'Last drop!'), stage);
    shell(content, { profile: p });
    box.addEventListener('click', () => {
      if (opened) return;
      if (taps < TAPS) {
        pips.children[taps].classList.add('on'); taps++;
        G.sfx.thump(); G.buzz(15); G.restartAnim(box, 'drop-hit');
        if (rarity < 4 && Math.random() < R.UPGRADE_CHANCE[taps - 1]) {
          rarity++;
          const c = R.RARITY[rarity];
          stage.style.setProperty('--c', c.color);
          box.replaceChildren(R.dropBox(rarity, 180)); G.restartAnim(box, 'drop-up');
          raysBox.replaceChildren(R.rays(c.color, 380));
          label.textContent = c.name; label.style.setProperty('--c', c.color); G.restartAnim(label, 'bump');
          G.sfx.upgrade(rarity); R.shakeScreen(rarity >= 3 ? 'big' : 'small');
          R.callout(c.name.toUpperCase() + '!', c.color);
          V.line('rarity', { key: rarity }, { priority: 2, delay: 250, pitch: rarity >= 3 ? 1.35 : 1.25, rate: 1.1 });
          const r = box.getBoundingClientRect(); G.confetti({ count: 30 + rarity * 20, x: r.left + r.width / 2, y: r.top + r.height / 2 });
        }
        if (taps === TAPS) hint.textContent = 'Tap to open!';
        return;
      }
      opened = true;
      const rew = R.rollDrop(rarity, invOf(p.id));
      grant(p, rew); db.drops[p.id] = left - 1; save();
      G.sfx.open(); R.shakeScreen('big'); G.buzz([30, 30, 90]);
      if (rew.type === 'gems') V.line('gems', { n: rew.n }, { priority: 2, delay: 800 });
      else V.line('reward', { thing: R.describe(rew).title.replace(/ pin$/, ' pin').replace(/^\S+ pin$/, 'a new pin') }, { priority: 2, delay: 800 });
      G.confetti({ count: 80 + rarity * 30 });
      const d = R.describe(rew);
      const icon = h('div', { class: 'reveal-icon' }, rewardIcon(rew, 130));
      const more = db.drops[p.id] || 0;
      stage.replaceChildren(raysBox, h('div', { class: 'reveal' },
        h('div', { class: 'rarity-label', style: { '--c': R.RARITY[rarity].color } }, R.RARITY[rarity].name),
        icon, h('h2', { class: 'outlined' }, d.title), h('p', { class: 'muted' }, d.sub),
        h('button', { class: 'btn3d wide yellow', onclick: () => go(more ? 'drop' : 'home', { pid: p.id }) }, more ? `Open next (${more})` : 'Collect'),
        rew.type === 'skin' || rew.type === 'hat' || rew.type === 'pin' ? h('button', { class: 'btn-small', onclick: () => go('collection', { pid: p.id, tab: rew.type + 's' }) }, 'Try it on') : null));
      if (rew.type === 'gems') setTimeout(() => R.flyTo(icon, '.stat-pill.gems', G.gem(22), 10), 300);
      const badge = document.querySelector('.drop-btn .badge'); if (badge) badge.textContent = String(more);
    });
  }

  // ---------- Collection: dress up Pip ----------
  function viewCollection() {
    const p = me(); if (!p) return go('profiles');
    const tab = state.tab || 'skins';
    const i = invOf(p.id);
    const lists = { skins: R.SKINS, hats: R.HATS, pins: R.PINS };
    const owned = { skins: i.skins, hats: i.hats, pins: i.pins }[tab];
    const equipped = { skins: i.skin, hats: i.hat, pins: i.pin }[tab];
    const total = R.SKINS.length + R.HATS.length + R.PINS.length;
    const have = i.skins.length + i.hats.length + i.pins.length;
    const lk = look(p);
    const icon = (x) => tab === 'skins' ? G.mascot('idle', 64, x.color || 'var(--t)', lk.hat)
      : tab === 'hats' ? G.mascot('idle', 64, lk.color, x.id === 'none' ? null : x.id)
      : h('span', { class: 'emoji-icon', style: { fontSize: '40px' } }, x.e);
    const grid = h('div', { class: 'collect-grid' }, ...lists[tab].map((x) => {
      const own = owned.includes(x.id), on = equipped === x.id;
      return h('button', {
        class: 'collect-tile' + (own ? '' : ' locked') + (on ? ' on' : ''), style: { '--c': R.RARITY[x.rarity].color },
        disabled: !own, 'aria-pressed': String(on),
        onclick: () => {
          if (tab === 'skins') i.skin = x.id; else if (tab === 'hats') i.hat = x.id; else i.pin = on ? null : x.id;
          save(); G.sfx.upgrade(0); go('collection', { pid: p.id, tab });
        }
      }, h('span', { class: 'tile-art' }, icon(x)), h('span', { class: 'tile-name' }, own ? (x.name || '') : '???'),
      h('span', { class: 'tile-rarity' }, on ? 'Equipped' : R.RARITY[x.rarity].name));
    }));
    const content = h('div', { class: 'stack', style: { gap: '16px' } },
      h('div', { class: 'practice-head' }, h('button', { class: 'btn-small', onclick: () => go('home', { pid: p.id }) }, '‹ Back')),
      h('div', { class: 'collect-hero' },
        h('div', { class: 'collect-rays' }, R.rays(R.RARITY[4].color, 260)),
        pip(p, 'cheer', 150), pinOf(p),
        h('h1', { class: 'outlined' }, 'Collection'),
        h('span', { class: 'collect-count tnum' }, `${have} / ${total} collected`)),
      h('div', { class: 'tabs collect-tabs' }, ...[['skins', 'Skins'], ['hats', 'Hats'], ['pins', 'Pins']].map(([k, label]) =>
        h('button', { class: 'btn-small' + (k === tab ? ' on' : ''), onclick: () => go('collection', { pid: p.id, tab: k }) }, label))),
      grid,
      h('p', { class: 'muted', style: { textAlign: 'center' } }, 'Unlock more from reward drops and the Trophy Road.'));
    shell(content, { profile: p });
  }

  // ---------- Friends (cloud) ----------
  const syncing = {};
  // Push this kid's public card (name, colour, track, streak, XP) and learn their friend code.
  function cloudSync(p) {
    if (!Cloud.enabled || !db.parentPin) return Promise.resolve(null);
    if (syncing[p.id]) return syncing[p.id];
    const stats = { name: p.name, color: /^#[0-9a-fA-F]{6}$/.test(p.color) ? p.color : '#2563d9', track: p.track, streak: streakDays(p.id), weekXp: weekXp(p.id), totalXp: totalXp(p.id) };
    syncing[p.id] = Cloud.saveKid(p.cloudId, stats).then((r) => {
      const prof = db.profiles.find((x) => x.id === p.id);
      if (r && prof && (prof.cloudId !== r.id || prof.code !== r.code)) { prof.cloudId = r.id; prof.code = r.code; p.cloudId = r.id; p.code = r.code; save(); }
      return r;
    }).finally(() => { delete syncing[p.id]; });
    return syncing[p.id];
  }
  const FRIEND_MSG = {
    sent: (n) => `Request sent! A parent in ${n ? n + '’s' : 'their'} family needs to approve it.`,
    accepted: (n) => `You’re now friends${n ? ' with ' + n : ''}!`,
    already: () => 'You’re already friends, or a request is waiting.',
    not_found: () => 'No one has that code. Check the letters and try again.',
    self: () => 'That’s your own code!',
    limit: () => 'Too many requests are waiting. Ask a parent to check them first.'
  };
  function friendRow(f, extra) {
    const ghost = { name: f.name, color: f.color };
    return h('li', {},
      avatar(ghost),
      h('div', { class: 'stack', style: { gap: 0, flex: 1, minWidth: 0 } },
        h('span', { class: 'lname' }, f.name),
        f.kind === 'friend' ? h('span', { class: 'muted', style: { fontSize: '.8rem' } }, TRACK_LABEL[f.track] || '') : h('span', { class: 'muted', style: { fontSize: '.8rem' } }, f.kind === 'outgoing' ? 'Waiting for their parent' : 'Wants to be friends')),
      f.kind === 'friend' ? h('span', { class: 'row', style: { gap: '2px', fontWeight: 700 } }, G.flame((f.streak || 0) > 0, 18), String(f.streak || 0)) : null,
      f.kind === 'friend' ? h('b', { class: 'tnum', style: { minWidth: '4.5ch', textAlign: 'right' } }, (f.week_xp || 0) + ' XP') : null,
      extra || null);
  }
  const NEEDS_PIN = 'Friends need a parent PIN, so a grown-up approves every friend. A parent can set one in Parent view → Edit players.';
  function friendsCard(p) {
    if (!db.parentPin) return h('section', { class: 'side-card friends-card' }, h('h3', {}, 'Friends'), h('p', { class: 'muted', style: { fontSize: '.9rem' } }, NEEDS_PIN));
    const body = h('div', { class: 'stack', style: { gap: '10px' } }, h('p', { class: 'muted' }, 'Loading friends…'));
    const card = h('section', { class: 'side-card friends-card' },
      h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('h3', {}, 'Friends'),
        h('button', { class: 'btn3d small', onclick: () => addFriendSheet(p) }, '+ Add')),
      body);
    cloudSync(p).then(() => Cloud.overview(p.cloudId)).then((rows) => {
      rows = rows || [];
      const friends = rows.filter((r) => r.kind === 'friend').sort((a, b) => (b.week_xp || 0) - (a.week_xp || 0));
      const outgoing = rows.filter((r) => r.kind === 'outgoing');
      const incoming = rows.filter((r) => r.kind === 'incoming');
      const codeEl = h('b', { class: 'friend-code tnum' }, p.code || '······');
      const copy = h('button', { class: 'btn-small', onclick: () => {
        const done = () => { copy.textContent = 'Copied!'; setTimeout(() => (copy.textContent = 'Copy'), 1500); };
        try { navigator.clipboard.writeText(p.code).then(done, () => selectText(codeEl)); } catch (e) { selectText(codeEl); }
      } }, 'Copy');
      body.replaceChildren(...[
        h('div', { class: 'code-box' }, h('span', { class: 'muted', style: { fontSize: '.85rem' } }, 'Your friend code'), h('div', { class: 'row', style: { justifyContent: 'space-between' } }, codeEl, copy)),
        friends.length ? h('ol', { class: 'league' }, ...friends.map((f) => friendRow(f))) : h('p', { class: 'muted', style: { fontSize: '.9rem' } }, 'No friends yet. Share your code with a cousin or classmate, or tap Add to enter theirs.'),
        outgoing.length ? h('ol', { class: 'league' }, ...outgoing.map((f) => friendRow(f))) : null,
        incoming.length ? h('p', { class: 'try' }, `${incoming.length} friend request${incoming.length > 1 ? 's' : ''} waiting. A parent can approve ${incoming.length > 1 ? 'them' : 'it'} in Parent view.`) : null].filter(Boolean));
    }).catch((e) => { body.replaceChildren(h('p', { class: 'muted', style: { fontSize: '.9rem' } }, 'Friends are offline right now. Check the internet connection and come back.')); console.warn('friends:', e.message); });
    return card;
  }
  function selectText(el) { try { const r = document.createRange(); r.selectNodeContents(el); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); } catch (e) { /* ignore */ } }
  function addFriendSheet(p) {
    G.sfx.tap();
    const scrim = h('div', { class: 'sheet-scrim', onclick: (e) => { if (e.target === scrim) close(); } });
    const close = () => { scrim.remove(); if (cleanup) { cleanup(); cleanup = null; } };
    const input = h('input', { id: 'friend-code', class: 'code-input', maxlength: 6, autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', placeholder: 'ABC123', 'aria-label': 'Friend code',
      oninput: (e) => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6); send.disabled = e.target.value.length !== 6; } });
    const msg = h('p', { class: 'muted', role: 'status', style: { minHeight: '1.4em' } });
    const send = h('button', { class: 'btn3d wide', disabled: true, onclick: () => askPin() }, 'Send request');
    const sheet = h('div', { class: 'sheet', role: 'dialog', 'aria-label': 'Add a friend' },
      G.mascot('happy', 64, 'var(--t)'), h('h2', {}, 'Add a friend'),
      h('p', { class: 'muted' }, 'Type your friend’s 6-character code. Their parent approves the request before you see each other’s progress.'),
      input, msg, send, h('button', { class: 'btn3d wide ghost', onclick: close }, 'Cancel'));
    scrim.append(sheet);
    document.body.appendChild(scrim);
    setTimeout(() => input.focus(), 50);
    function askPin() {
      sheet.replaceChildren(pinPad('Parent check', 'A parent enters the PIN to send this request', db.parentPin, () => { sheet.replaceChildren(G.mascot('think', 64, 'var(--t)'), h('h2', {}, 'Sending…')); submit(); }, close));
    }
    function submit() {
      send.disabled = true; msg.textContent = 'Sending…';
      cloudSync(p).then(() => Cloud.sendRequest(p.cloudId, input.value)).then((res) => {
        const ok = res === 'sent' || res === 'accepted';
        if (ok) { G.sfx.chest(); G.confetti({ count: 60 }); }
        else G.sfx.wrong();
        sheet.replaceChildren(G.mascot(ok ? 'cheer' : 'sad', 72, 'var(--t)'), h('h2', {}, ok ? (res === 'accepted' ? 'Friends!' : 'Request sent!') : 'Hmm…'),
          h('p', { class: 'muted' }, (FRIEND_MSG[res] || (() => 'Something went wrong.'))()),
          h('button', { class: 'btn3d wide', onclick: () => { close(); go('home', { pid: p.id, track: state.track }); } }, ok ? 'Done' : 'Try again later'));
      }).catch(() => {
        sheet.replaceChildren(G.mascot('sad', 72, 'var(--t)'), h('h2', {}, 'Couldn’t send'), h('p', { class: 'muted' }, 'The friends server didn’t answer. Check the internet connection and try again.'),
          h('button', { class: 'btn3d wide', onclick: close }, 'OK'));
      });
    }
  }
  function parentFriends(p) {
    if (!db.parentPin) return h('div', { class: 'stack parent-friends', style: { gap: '8px' } }, h('span', { class: 'eyebrow' }, 'Friends'), h('p', { class: 'muted', style: { fontSize: '.9rem' } }, 'Set a parent PIN (Edit players) to turn on friends. Nothing is shared online until you do.'));
    const box = h('div', { class: 'stack parent-friends', style: { gap: '8px' } }, h('span', { class: 'eyebrow' }, 'Friends'), h('p', { class: 'muted' }, 'Loading…'));
    const load = () => cloudSync(p).then(() => Cloud.overview(p.cloudId)).then((rows) => {
      rows = rows || [];
      const incoming = rows.filter((r) => r.kind === 'incoming');
      const others = rows.filter((r) => r.kind !== 'incoming');
      const act = (label, cls, fn) => h('button', { class: 'btn-small ' + (cls || ''), onclick: (e) => { e.currentTarget.disabled = true; fn().then(load, () => { e.currentTarget.disabled = false; }); } }, label);
      box.replaceChildren(...[h('span', { class: 'eyebrow' }, `Friends · code ${p.code || '…'}`),
        incoming.length ? h('div', { class: 'stack', style: { gap: '6px' } }, h('b', {}, 'Requests to approve'),
          h('ol', { class: 'league' }, ...incoming.map((f) => friendRow(f, h('span', { class: 'row', style: { gap: '6px' } },
            act('Approve', 'approve', () => Cloud.respond(f.request_id, true)), act('Decline', '', () => Cloud.respond(f.request_id, false))))))) : null,
        others.length ? h('ol', { class: 'league' }, ...others.map((f) => friendRow(f, act(f.kind === 'friend' ? 'Remove' : 'Cancel', '', () => Cloud.remove(p.cloudId, f.kid_id)))))
          : incoming.length ? null : h('p', { class: 'muted', style: { fontSize: '.9rem' } }, 'No friends or requests yet.')].filter(Boolean));
    }).catch(() => box.replaceChildren(h('span', { class: 'eyebrow' }, 'Friends'), h('p', { class: 'muted' }, 'Friends are offline right now.')));
    load();
    return box;
  }

  // ---------- Toast ----------
  function toast(msg) {
    const t = h('div', { class: 'toast', role: 'status' }, msg);
    document.body.appendChild(t); setTimeout(() => t.remove(), 2800);
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
        back ? h('button', { class: 'btn-small', onclick: () => go('practice', { pid: p.id, sid: back.skill.id, track: tr.id }) }, '‹ Back to lesson')
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
  function hintCard() {
    const opts = [[0, 'No hints'], [1, '1 per lesson'], [2, '2 per lesson'], [3, '3 per lesson (default)'], [5, '5 per lesson'], [-1, 'Unlimited']];
    const msg = h('span', { class: 'muted', role: 'status', style: { fontSize: '.85rem' } });
    return h('section', { class: 'card stack' }, h('h3', {}, 'Hints'),
      h('p', { class: 'muted', style: { fontSize: '.9rem' } }, 'How many hints each kid can use in one lesson. The Hint button shows how many are left.'),
      h('div', { class: 'row' }, h('label', { class: 'field', style: { flex: 1, minWidth: '200px' } },
        h('select', { id: 'hint-limit', 'aria-label': 'Hints per lesson', onchange: (e) => { db.hintLimit = Number(e.target.value); save(); msg.textContent = 'Saved. Applies from the next lesson.'; } },
          ...opts.map(([v, label]) => h('option', { value: v, selected: hintLimit() === v }, label)))), msg));
  }
  function voiceCard() {
    const card = h('section', { class: 'card stack' }, h('h3', {}, 'Cheering voice'));
    const paint = () => {
      const names = V.voices ? V.voices() : [];
      const preview = h('button', { class: 'btn-small', onclick: () => V.say('Good job! Well done! Woo hoo!', { priority: 2 }) }, '▶ Preview');
      if (!V.supported) { card.replaceChildren(h('h3', {}, 'Cheering voice'), h('p', { class: 'muted' }, 'This browser can’t speak, so only sound effects will play.')); return; }
      const sel = h('select', { id: 'voice-pick', 'aria-label': 'Voice', onchange: (e) => { db.voiceName = e.target.value; save(); V.choose(db.voiceName); V.say('Hi! I’ll cheer you on!', { priority: 2 }); } },
        h('option', { value: '', selected: !db.voiceName }, 'Best American voice (automatic)'),
        ...names.map((n) => h('option', { value: n, selected: db.voiceName === n }, n)));
      card.replaceChildren(h('h3', {}, 'Cheering voice'),
        h('p', { class: 'muted', style: { fontSize: '.9rem' } }, names.length ? `American English voices on this device: ${names.length}. Pick the one the kids like best.` : 'Uses this device’s American English voice.'),
        h('div', { class: 'row' }, names.length ? h('label', { class: 'field', style: { flex: 1, minWidth: '200px' } }, sel) : null, preview));
    };
    paint();
    try { window.speechSynthesis.addEventListener('voiceschanged', () => { if (card.isConnected) paint(); }, { once: true }); } catch (e) { /* ignore */ }
    return card;
  }
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
          h('button', { class: 'btn-small', style: { borderColor: 'var(--bad)', color: 'var(--bad)' }, onclick: () => { for (const k of ['progress', 'days', 'gems', 'freezes', 'frozen', 'trophies', 'drops', 'inv', 'road', 'arenaSeen']) delete db[k][p.id]; save(); go('parent'); } }, 'Erase'),
          h('button', { class: 'btn-small', onclick: () => { confirmReset = null; resetArea.replaceChildren(); } }, 'Keep')));
      };
      return h('section', { class: 'card kid-report', 'data-track': p.track },
        h('div', { class: 'row' }, avatar(p), h('div', { class: 'stack', style: { gap: 0, flex: 1, minWidth: 0 } }, h('h3', {}, p.name), h('span', { class: 'muted', style: { fontSize: '.85rem' } }, 'Main track: ' + (TRACK_LABEL[p.track] || p.track) + ` · ${streakDays(p.id)}-day streak · ${db.gems[p.id] || 0} gems`)),
          h('button', { class: 'btn-small', onclick: askReset }, 'Reset')),
        h('div', { class: 'stats' },
          h('div', { class: 'stat' }, h('b', {}, String(weekXp(p.id))), h('span', {}, 'XP this week')),
          h('div', { class: 'stat' }, h('b', {}, week.answered ? Math.round((week.correct / week.answered) * 100) + '%' : '–'), h('span', {}, 'accuracy this week')),
          h('div', { class: 'stat' }, h('b', {}, fmtTime(week.secs)), h('span', {}, 'time this week'))),
        rows.length ? h('div', { class: 'table-scroll' }, h('table', {},
          h('thead', {}, h('tr', {}, h('th', {}, 'Skill'), h('th', { class: 'n' }, 'SmartScore'), h('th', { class: 'n' }, 'Answered'), h('th', { class: 'n' }, 'Accuracy'), h('th', { class: 'n' }, 'Time'))),
          h('tbody', {}, ...rows))) : h('p', { class: 'muted' }, 'No practice yet. Skills show up here after the first answer.'),
        Cloud.enabled ? parentFriends(p) : null,
        resetArea);
    }
    const content = h('div', { class: 'stack', style: { gap: '20px' } },
      h('div', { class: 'row', style: { justifyContent: 'space-between' } },
        h('div', { class: 'stack', style: { gap: '4px' } }, h('span', { class: 'eyebrow' }, 'Parent view'), h('h1', {}, 'Progress report')),
        h('div', { class: 'row' }, h('button', { class: 'btn-small', onclick: () => go('setup') }, 'Edit players'), h('button', { class: 'btn-small', onclick: () => go('profiles') }, 'Done'))),
      h('p', { class: 'muted' }, '“Needs help” appears when accuracy is under 60% after 10+ questions, after 3 misses in a row, or when the SmartScore has dropped 15+ points from its best.'),
      hintCard(),
      voiceCard(),
      ...db.profiles.map(kidCard));
    shell(content);
  }

  // ---------- Render ----------
  function render() {
    if (!db.profiles.length && state.view !== 'setup') state.view = 'setup';
    ({ setup: viewSetup, profiles: viewProfiles, pin: viewPin, home: viewHome, practice: viewPractice, labs: viewLabs, lab: viewLab, parent: viewParent, drop: viewDrop, collection: viewCollection, parentpin: viewParentPin, boot: viewProfiles }[state.view] || viewProfiles)();
  }
  render();
})();
