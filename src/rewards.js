/* MathQuest rewards: trophies, trophy road, reward drops with rarity upgrades, mascot skins & pins,
   plus the punchy arena-style effects used to show them. Browser only. */
(function () {
  'use strict';
  const { h, svg } = window.MathQuestDOM;

  // ---------- Rarities ----------
  const RARITY = [
    { id: 'rare', name: 'Rare', color: '#3ccf6e', deep: '#1e8a45' },
    { id: 'super', name: 'Super Rare', color: '#2f9bff', deep: '#1660b8' },
    { id: 'epic', name: 'Epic', color: '#b05cff', deep: '#6d28c9' },
    { id: 'mythic', name: 'Mythic', color: '#ff3d6e', deep: '#b3123c' },
    { id: 'legendary', name: 'Legendary', color: '#ffc928', deep: '#c28400' }
  ];
  // Chance that each tap upgrades the drop one rarity step (before the final open).
  const UPGRADE_CHANCE = [0.5, 0.35, 0.22, 0.12];

  // ---------- Collectibles ----------
  const SKINS = [
    { id: 'classic', name: 'Classic', color: null, rarity: 0 },
    { id: 'mint', name: 'Mint', color: '#2dd4bf', rarity: 0 },
    { id: 'bubblegum', name: 'Bubblegum', color: '#f472b6', rarity: 1 },
    { id: 'ocean', name: 'Ocean', color: '#0ea5e9', rarity: 1 },
    { id: 'lava', name: 'Lava', color: '#ef4444', rarity: 2 },
    { id: 'galaxy', name: 'Galaxy', color: '#7c3aed', rarity: 2 },
    { id: 'shadow', name: 'Shadow', color: '#334155', rarity: 3 },
    { id: 'golden', name: 'Golden', color: '#f5b800', rarity: 4 }
  ];
  const HATS = [
    { id: 'none', name: 'No hat', rarity: 0 },
    { id: 'cap', name: 'Ball cap', rarity: 0 },
    { id: 'party', name: 'Party hat', rarity: 1 },
    { id: 'bandana', name: 'Bandana', rarity: 1 },
    { id: 'headphones', name: 'Headphones', rarity: 2 },
    { id: 'shades', name: 'Shades', rarity: 2 },
    { id: 'wizard', name: 'Wizard hat', rarity: 3 },
    { id: 'crown', name: 'Crown', rarity: 4 },
    { id: 'halo', name: 'Halo', rarity: 4 }
  ];
  const PINS = [
    { id: 'smile', e: '😀', rarity: 0 }, { id: 'thumbs', e: '👍', rarity: 0 }, { id: 'clap', e: '👏', rarity: 0 },
    { id: 'fire', e: '🔥', rarity: 1 }, { id: 'cool', e: '😎', rarity: 1 }, { id: 'party', e: '🎉', rarity: 1 },
    { id: 'brain', e: '🧠', rarity: 2 }, { id: 'rocket', e: '🚀', rarity: 2 }, { id: 'boom', e: '🤯', rarity: 3 },
    { id: 'star', e: '🌟', rarity: 3 }, { id: 'crown', e: '👑', rarity: 4 }, { id: 'unicorn', e: '🦄', rarity: 4 }
  ];

  // ---------- Trophies ----------
  // Trophies for a finished lesson: more for accuracy. An unfinished lesson earns none.
  function trophiesFor(correct, wrong, done) {
    if (!done) return 0;
    return wrong === 0 ? 12 : wrong <= 2 ? 9 : 6;
  }
  const ROAD = [
    { at: 10, reward: { type: 'gems', n: 20 } },
    { at: 25, reward: { type: 'drop', n: 1 } },
    { at: 40, reward: { type: 'skin', id: 'mint' } },
    { at: 60, reward: { type: 'pin', id: 'fire' } },
    { at: 80, reward: { type: 'hat', id: 'cap' } },
    { at: 100, reward: { type: 'drop', n: 2 } },
    { at: 130, reward: { type: 'gems', n: 50 } },
    { at: 160, reward: { type: 'skin', id: 'ocean' } },
    { at: 200, reward: { type: 'hat', id: 'headphones' } },
    { at: 250, reward: { type: 'drop', n: 3 } },
    { at: 300, reward: { type: 'pin', id: 'rocket' } },
    { at: 375, reward: { type: 'skin', id: 'galaxy' } },
    { at: 450, reward: { type: 'hat', id: 'wizard' } },
    { at: 550, reward: { type: 'gems', n: 150 } },
    { at: 650, reward: { type: 'pin', id: 'crown' } },
    { at: 800, reward: { type: 'hat', id: 'crown' } },
    { at: 1000, reward: { type: 'skin', id: 'golden' } }
  ];

  // ---------- Drop contents ----------
  // Roll what a drop of a given rarity gives. Prefers items the kid doesn't own yet; otherwise gems.
  function rollDrop(rarity, inv, rand = Math.random) {
    const gems = [[8, 14], [18, 28], [35, 55], [70, 100], [140, 200]][rarity];
    const unowned = (list, kind) => list.filter((x) => x.rarity === rarity && !(inv[kind] || []).includes(x.id));
    const pool = [];
    if (rand() < [0.35, 0.45, 0.6, 0.7, 0.8][rarity]) {
      for (const s of unowned(SKINS, 'skins')) pool.push({ type: 'skin', id: s.id });
      for (const s of unowned(HATS, 'hats')) pool.push({ type: 'hat', id: s.id });
      for (const s of unowned(PINS, 'pins')) pool.push({ type: 'pin', id: s.id });
      if (rarity >= 3) pool.push({ type: 'freeze', n: 1 });
      // Mascots from other grades turn up in Epic and better drops (twice as likely as one item).
      if (rarity >= 2) for (const id of inv.mascotPool || []) pool.push({ type: 'mascot', id }, { type: 'mascot', id });
    }
    if (pool.length) return pool[Math.floor(rand() * pool.length)];
    return { type: 'gems', n: gems[0] + Math.floor(rand() * (gems[1] - gems[0] + 1)) };
  }
  function describe(r) {
    switch (r.type) {
      case 'gems': return { title: r.n + ' gems', sub: 'Spend them on streak freezes' };
      case 'drop': return { title: r.n === 1 ? 'Reward drop' : r.n + ' reward drops', sub: 'Open them from the top bar' };
      case 'skin': { const s = SKINS.find((x) => x.id === r.id); return { title: s.name + ' skin', sub: 'New colour for Pip' }; }
      case 'hat': { const s = HATS.find((x) => x.id === r.id); return { title: s.name, sub: 'Something for Pip to wear' }; }
      case 'pin': { const s = PINS.find((x) => x.id === r.id); return { title: s.e + ' pin', sub: 'Shows next to your name' }; }
      case 'freeze': return { title: 'Streak freeze', sub: 'Saves your streak on a missed day' };
      case 'mascot': { const M = window.MathQuestMascots; const m = M && M.BY_ID[r.id]; return { title: m ? m.name : 'New mascot', sub: m ? `New mascot from the ${M.TIERS[m.tier]}!` : 'New mascot!' }; }
      default: return { title: 'Reward', sub: '' };
    }
  }

  // ---------- Mascot accessories (drawn in the 120×120 mascot space) ----------
  function hat(id) {
    const ink = '#1a1033';
    switch (id) {
      case 'cap': return svg('g', {}, svg('path', { d: 'M30 30 q30 -26 60 0 z', fill: '#e11d48', stroke: ink, 'stroke-width': 3 }), svg('path', { d: 'M84 28 h26 q4 4 -2 7 h-26 z', fill: '#be123c', stroke: ink, 'stroke-width': 3 }), svg('circle', { cx: 60, cy: 12, r: 3, fill: ink }));
      case 'party': return svg('g', {}, svg('path', { d: 'M44 28 L62 -10 L80 28 z', fill: '#8b5cf6', stroke: ink, 'stroke-width': 3 }), svg('path', { d: 'M52 12 l16 6 M56 2 l10 4', stroke: '#fde047', 'stroke-width': 4 }), svg('circle', { cx: 62, cy: -12, r: 6, fill: '#fde047', stroke: ink, 'stroke-width': 3 }));
      case 'bandana': return svg('g', {}, svg('path', { d: 'M27 34 q33 -14 66 0 v10 q-33 -12 -66 0 z', fill: '#ef4444', stroke: ink, 'stroke-width': 3 }), svg('path', { d: 'M92 38 l16 -6 l-4 12 z', fill: '#ef4444', stroke: ink, 'stroke-width': 3 }), svg('circle', { cx: 44, cy: 38, r: 2, fill: '#fff' }), svg('circle', { cx: 60, cy: 35, r: 2, fill: '#fff' }), svg('circle', { cx: 76, cy: 38, r: 2, fill: '#fff' }));
      case 'headphones': return svg('g', {}, svg('path', { d: 'M24 54 q0 -46 36 -46 q36 0 36 46', fill: 'none', stroke: ink, 'stroke-width': 7 }), svg('path', { d: 'M24 54 q0 -46 36 -46 q36 0 36 46', fill: 'none', stroke: '#22d3ee', 'stroke-width': 3.5 }), svg('rect', { x: 14, y: 46, width: 16, height: 24, rx: 6, fill: '#22d3ee', stroke: ink, 'stroke-width': 3 }), svg('rect', { x: 90, y: 46, width: 16, height: 24, rx: 6, fill: '#22d3ee', stroke: ink, 'stroke-width': 3 }));
      case 'shades': return svg('g', {}, svg('path', { d: 'M34 48 h52', stroke: ink, 'stroke-width': 4 }), svg('rect', { x: 34, y: 46, width: 22, height: 14, rx: 6, fill: ink }), svg('rect', { x: 64, y: 46, width: 22, height: 14, rx: 6, fill: ink }), svg('path', { d: 'M38 50 l6 0', stroke: '#fff', 'stroke-width': 2.5, 'stroke-linecap': 'round' }), svg('path', { d: 'M68 50 l6 0', stroke: '#fff', 'stroke-width': 2.5, 'stroke-linecap': 'round' }));
      case 'wizard': return svg('g', {}, svg('path', { d: 'M30 28 h60 l-12 -6 L64 -16 L44 22 z', fill: '#4338ca', stroke: ink, 'stroke-width': 3, 'stroke-linejoin': 'round' }), svg('path', { d: 'M58 6 l2 5 5 0 -4 3 2 5 -5 -3 -5 3 2 -5 -4 -3 5 0z', fill: '#fde047' }));
      case 'crown': return svg('g', {}, svg('path', { d: 'M36 28 L32 2 L48 14 L60 -4 L72 14 L88 2 L84 28 z', fill: '#ffc928', stroke: ink, 'stroke-width': 3, 'stroke-linejoin': 'round' }), svg('circle', { cx: 60, cy: 18, r: 4, fill: '#ef4444', stroke: ink, 'stroke-width': 2 }), svg('circle', { cx: 46, cy: 21, r: 3, fill: '#22d3ee' }), svg('circle', { cx: 74, cy: 21, r: 3, fill: '#22d3ee' }));
      case 'halo': return svg('ellipse', { class: 'halo', cx: 60, cy: 8, rx: 26, ry: 7, fill: 'none', stroke: '#ffd84d', 'stroke-width': 6 });
      default: return null;
    }
  }

  // ---------- Effects ----------
  const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Rotating sunburst behind a reward.
  function rays(color = '#ffc928', size = 320) {
    const g = svg('g', { class: 'rays-spin' });
    for (let i = 0; i < 16; i++) g.appendChild(svg('path', { d: 'M0 0 L-9 -160 L9 -160 Z', transform: `rotate(${i * 22.5})`, fill: color, opacity: i % 2 ? 0.22 : 0.4 }));
    return svg('svg', { class: 'rays', viewBox: '-160 -160 320 320', width: size, height: size, 'aria-hidden': 'true' }, g);
  }
  function shakeScreen(strength = 'small') {
    if (reduced()) return;
    const el = document.getElementById('app'); if (!el) return;
    el.classList.remove('quake', 'quake-big'); void el.offsetWidth; el.classList.add(strength === 'big' ? 'quake-big' : 'quake');
    setTimeout(() => el.classList.remove('quake', 'quake-big'), 500);
  }
  // Big slanted outlined callout across the screen ("TRIPLE!").
  function callout(text, color = '#ffc928', sub) {
    document.querySelectorAll('.callout').forEach((x) => x.remove());
    const c = h('div', { class: 'callout', role: 'status', style: { '--c': color } }, h('b', {}, text), sub ? h('span', {}, sub) : null);
    document.body.appendChild(c); setTimeout(() => c.remove(), 1400);
  }
  // Little icons fly from a point into a top-bar counter.
  function flyTo(fromEl, targetSel, icon, n = 8) {
    const target = document.querySelector(targetSel);
    if (!fromEl || !target || reduced()) return;
    const a = fromEl.getBoundingClientRect(), b = target.getBoundingClientRect();
    for (let i = 0; i < n; i++) {
      const bit = h('div', { class: 'fly-bit' }, icon.cloneNode ? icon.cloneNode(true) : icon);
      const sx = a.left + a.width / 2 + (Math.random() - 0.5) * 60, sy = a.top + a.height / 2 + (Math.random() - 0.5) * 40;
      bit.style.left = sx + 'px'; bit.style.top = sy + 'px';
      document.body.appendChild(bit);
      const dx = b.left + b.width / 2 - sx, dy = b.top + b.height / 2 - sy;
      bit.animate([{ transform: 'translate(-50%,-50%) scale(.4)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1.2)', opacity: 1, offset: 0.2 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.6)`, opacity: 1 }],
      { duration: 650 + i * 60, easing: 'cubic-bezier(.5,0,.6,1)', fill: 'forwards' }).onfinish = () => { bit.remove(); target.classList.remove('bump'); void target.offsetWidth; target.classList.add('bump'); };
    }
  }
  // Reward drop box art in a rarity colour.
  function dropBox(rarity, size = 150) {
    const r = RARITY[rarity];
    return svg('svg', { class: 'dropbox', viewBox: '0 0 120 120', width: size, height: size, 'aria-hidden': 'true' },
      svg('path', { d: 'M60 8 L108 32 L108 88 L60 112 L12 88 L12 32 Z', fill: r.color, stroke: '#1a1033', 'stroke-width': 5, 'stroke-linejoin': 'round' }),
      svg('path', { d: 'M60 8 L108 32 L60 56 L12 32 Z', fill: '#fff', opacity: 0.35 }),
      svg('path', { d: 'M60 56 L60 112 M12 32 L60 56 L108 32', stroke: '#1a1033', 'stroke-width': 4, fill: 'none', 'stroke-linejoin': 'round' }),
      svg('path', { d: 'M60 112 L108 88 L108 32 L60 56 Z', fill: r.deep, opacity: 0.55 }),
      svg('text', { x: 60, y: 92, 'text-anchor': 'middle', 'font-size': 34, 'font-weight': 900, fill: '#fff', stroke: '#1a1033', 'stroke-width': 4, 'paint-order': 'stroke', 'font-family': 'inherit', text: '?' }));
  }
  function trophyIcon(size = 22) {
    return svg('svg', { viewBox: '0 0 24 24', width: size, height: size, 'aria-hidden': 'true', class: 'trophy-ic' },
      svg('path', { d: 'M7 3h10v4a5 5 0 0 1-10 0z', fill: '#ffc928', stroke: '#1a1033', 'stroke-width': 1.6, 'stroke-linejoin': 'round' }),
      svg('path', { d: 'M7 5H4a3 3 0 0 0 3 4M17 5h3a3 3 0 0 1-3 4', fill: 'none', stroke: '#1a1033', 'stroke-width': 1.6 }),
      svg('path', { d: 'M10 12h4l1 5H9z', fill: '#ffb000', stroke: '#1a1033', 'stroke-width': 1.6, 'stroke-linejoin': 'round' }),
      svg('rect', { x: 7, y: 17, width: 10, height: 4, rx: 1, fill: '#7c4a1d', stroke: '#1a1033', 'stroke-width': 1.6 }));
  }

  window.MathQuestRewards = { RARITY, UPGRADE_CHANCE, SKINS, HATS, PINS, ROAD, trophiesFor, rollDrop, describe, hat, rays, shakeScreen, callout, flyTo, dropBox, trophyIcon };
})();
