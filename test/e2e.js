#!/usr/bin/env node
/* End-to-end run of the built app (test/dev.html) in headless Chromium.
   Answers questions in every skill through the real UI (correct answers via the test hook),
   checks SmartScore moves, screenshots key screens, and reports any page errors. */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const ROOT = path.join(__dirname, '..');
const OUT = process.argv[2] || path.join(ROOT, 'test/shots/app');
fs.mkdirSync(OUT, { recursive: true });
const PER_SKILL = Number(process.env.PER_SKILL || 6);

(async () => {
  const exe = fs.readdirSync('/opt/pw-browsers').filter((d) => d.startsWith('chromium-')).map((d) => path.join('/opt/pw-browsers', d, 'chrome-linux/chrome')).find((p) => fs.existsSync(p));
  const browser = await chromium.launch({ executablePath: exe });
  const scheme = process.env.SCHEME || 'light';
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: scheme, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.addInitScript(() => { window.__MQ_TEST__ = {}; });
  await page.goto('file://' + path.join(ROOT, 'test/dev.html'));
  const shot = async (name, full = true) => { await page.waitForTimeout(120); await page.screenshot({ path: path.join(OUT, `${name}-${scheme}.png`), fullPage: full }); };

  await shot('01-setup');
  await page.fill('#name-k1', 'Mia'); await page.fill('#name-k2', 'Leo'); await page.fill('#name-k3', 'Ada');
  await page.click('text=Start practising');
  await shot('02-profiles');

  const kids = [['Mia', 'g3'], ['Leo', 'g7'], ['Ada', 'geo']];
  const results = [];
  const LESSONS = Number(process.env.LESSONS || 1);
  for (const [kid, track] of kids) {
    await page.click(`.profile-btn:has-text("${kid}")`);
    await shot(`03-home-${track}`);
    const nSkills = await page.$$eval('.node', (els) => els.length);
    for (let si = 0; si < nSkills; si++) {
      for (let les = 0; les < LESSONS; les++) {
        if (await page.$('.levelup-scrim')) { await page.waitForTimeout(900); await shot(`levelup-${track}-${si}`, false); await page.click('.levelup-scrim button', { force: true }); }
        await page.locator('.node').nth(si).click();
        if (si === 0 && les === 0) await shot(`03b-pop-${track}`);
        await page.click('.pop-go');
        const types = {}; let wrongDone = false, q = 0;
        while (await page.$('.lesson-top:not([hidden])')) {
          await page.waitForSelector('.lesson-foot [data-primary]'); await page.waitForTimeout(70);
          const pr = await page.evaluate(() => { const p = window.__MQ_TEST__.problem; return { input: p.input, answer: p.answer, prompt: p.prompt }; });
          types[pr.input.type] = (types[pr.input.type] || 0) + 1;
          if (q === 0 && les === 0) await shot(`q-${track}-${si}-${pr.input.type}`, false);
          const wantWrong = q === 2 && les === 0 && !wrongDone;
          await answer(page, pr, wantWrong);
          if (await page.$('.lesson-foot [data-primary][disabled]')) { await shot(`stuck-${track}-${si}`); throw new Error(`Check disabled for ${pr.input.type}: ${JSON.stringify(pr.input).slice(0, 300)}`); }
          await page.click('.lesson-foot [data-primary]');
          await page.waitForSelector('.lesson-foot.good, .lesson-foot.bad');
          const ok = await page.$('.lesson-foot.good');
          if (!wantWrong && !ok) errors.push(`${track} skill ${si} q${q} (${pr.input.type}): correct answer marked wrong. answer=${JSON.stringify(pr.answer)} prompt=${pr.prompt.slice(0, 100)}`);
          if (wantWrong) { wrongDone = true; if (les === 0 && si < 2) await shot(`w-${track}-${si}`, false); if (ok) errors.push(`${track} skill ${si}: wrong answer marked correct (${pr.input.type})`); }
          if (ok && q === 4 && si === 0 && les === 0) { await page.waitForTimeout(300); await shot(`combo-${track}`, false); }
          await page.click('.lesson-foot [data-primary]');
          q++;
          if (q > 40) throw new Error('lesson never ended');
        }
        await page.waitForTimeout(1000);
        if (si === 0 && les === 0) await shot(`r-${track}`, false);
        await page.click('.lesson-foot [data-primary]');
        if (await page.$('.streak-screen')) { await page.waitForTimeout(900); if (si === 0) await shot(`streak-${track}`, false); await page.click('.lesson-foot [data-primary]'); }
        results.push(`${track}#${si}.${les} q=${q} types=${JSON.stringify(types)}`);
      }
    }
    if (await page.$('.levelup-scrim')) { await page.waitForTimeout(900); await shot(`levelup-${track}-end`, false); await page.click('.levelup-scrim button', { force: true }); }
    await shot(`04-home-after-${track}`);
    await shot(`04a-home-top-${track}`, false);
    // open reward drops (up to 3)
    for (let k = 0; k < 3 && (await page.$('.drop-btn')); k++) {
      await page.click('.drop-btn', { force: true });
      await page.waitForSelector('.drop-box-btn');
      for (let t = 0; t < 4; t++) { await page.click('.drop-box-btn', { force: true }); await page.waitForTimeout(260); if (t === 1 && k === 0) await shot(`drop-tap-${track}`, false); }
      await page.click('.drop-box-btn', { force: true });
      await page.waitForSelector('.reveal');
      await page.waitForTimeout(800);
      if (k === 0) await shot(`drop-reveal-${track}`, false);
      results.push(`${track} drop ${k}: ${await page.textContent('.reveal .rarity-label')} → ${await page.textContent('.reveal h2')}`);
      await page.click('.reveal .btn3d');
    }
    if (!(await page.$('.hero-card'))) await page.click('.brand');
    await page.click('.pip-btn');
    await page.waitForSelector('.collect-grid');
    const firstOwned = await page.$('.collect-tile:not(.locked):not(.on)');
    if (firstOwned) await firstOwned.click();
    await page.click('.collect-tabs button:has-text("Hats")');
    const hat = await page.$('.collect-tile:not(.locked):not(.on)');
    if (hat) await hat.click();
    await shot(`07-collection-${track}`);
    await page.click('text=‹ Back');
    // claim any open quest chests
    for (let k = 0; k < 4; k++) { const b = await page.$('.chest-btn.wiggle'); if (!b) break; await b.click(); if (k === 0) { await page.waitForTimeout(350); await shot(`04c-chest-${track}`, false); } await page.waitForTimeout(1300); }
    await shot(`04b-home-claimed-${track}`);
    await page.click('.banner-btn');
    await page.locator(`section[data-track="${track}"] .lab-tile`).first().click();
    await shot(`05-lab-${track}`);
    await page.click('.who');
  }
  // parent view
  await page.click('text=Parent view');
  await shot('06-parent');
  console.log(results.join('\n'));
  const said = await page.evaluate(() => (window.__MQ_TEST__.said || []));
  const counts = {}; said.forEach((t) => (counts[t] = (counts[t] || 0) + 1));
  console.log('voice lines spoken:', said.length, JSON.stringify(counts));
  console.log(errors.length ? 'ERRORS:\n  ' + errors.join('\n  ') : 'No errors.');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });

async function answer(page, pr, wrong) {
  const t = pr.input.type, a = pr.answer;
  if (t === 'number') { await page.fill('#ans-number', String(wrong ? a + 1 : a)); return; }
  if (t === 'fraction') {
    if (await page.$('#ans-whole')) await page.fill('#ans-whole', '');
    await page.fill('#ans-num', String(wrong ? a.n + 1 : a.n)); await page.fill('#ans-den', String(a.d)); return;
  }
  if (t === 'choice') { const n = pr.input.options.length; await page.locator('.choice').nth(wrong ? (a + 1) % n : a).click(); return; }
  if (t === 'multi') { for (let i = 0; i < a.length; i++) await page.fill('#ans-m' + i, String(a[i] + (wrong && i === 0 ? 1 : 0))); return; }
  if (t === 'numberline' || t === 'point' || t === 'clock' || t === 'order') {
    await page.evaluate(([t, a, spec, wrong]) => {
      // Drive the widget through real pointer events / buttons.
      const s = document.querySelector('.lesson-card .widget svg, .lesson-card svg[role="img"]');
      const fire = (el, type, x, y) => el.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: x, clientY: y, pointerId: 1, isPrimary: true }));
      const toClient = (svgEl, ux, uy) => { const p = svgEl.createSVGPoint(); p.x = ux; p.y = uy; const m = svgEl.getScreenCTM(); const r = p.matrixTransform(m); return [r.x, r.y]; };
      if (t === 'numberline') {
        const W = 520, padX = 34; let v = wrong ? (a === spec.min ? spec.max : spec.min) : a;
        const [x, y] = toClient(s, padX + ((v - spec.min) / (spec.max - spec.min)) * (W - 2 * padX), 62);
        fire(s, 'pointerdown', x, y); fire(s, 'pointerup', x, y);
      } else if (t === 'point') {
        const nx = spec.xmax - spec.xmin, ny = spec.ymax - spec.ymin;
        const cell = Math.max(18, Math.min(34, Math.floor(420 / Math.max(nx, ny)))), pad = 22;
        const px = wrong ? (a.x === spec.xmin ? spec.xmax : spec.xmin) : a.x;
        const [x, y] = toClient(s, pad + (px - spec.xmin) * cell, pad + (spec.ymax - a.y) * cell);
        fire(s, 'pointerdown', x, y); fire(s, 'pointerup', x, y);
      } else if (t === 'clock') {
        const btn = (lbl) => document.querySelector(`.lesson-card button[aria-label="${lbl}"]`);
        // clock starts at 12:00; press hour forward and minute buttons
        const H = wrong ? (a.h % 12) + 1 : a.h;
        for (let i = 0; i < H % 12; i++) btn('Hour forward').click();
        if (H === 12) { btn('Hour forward').click(); btn('Hour back').click(); }
        for (let i = 0; i < Math.floor(a.m / 5); i++) btn('Forward 5 minutes').click();
        for (let i = 0; i < a.m % 5; i++) btn('Forward 1 minute').click();
      } else if (t === 'order') {
        // selection sort with the up buttons into the target order (or a wrong swap)
        const target = wrong ? a.slice().reverse() : a;
        const orig = [...document.querySelectorAll('.lesson-card .order-item .txt')].map((e) => e.textContent);
        const items = () => [...document.querySelectorAll('.lesson-card .order-item .txt')].map((e) => String(orig.indexOf(e.textContent)));
        for (let pos = 0; pos < target.length; pos++) {
          let cur = items().indexOf(String(target[pos]));
          while (cur > pos) { document.querySelectorAll('.lesson-card .order-item')[cur].querySelector('[aria-label="Move up"]').click(); cur--; }
        }
        if (JSON.stringify(target) === JSON.stringify(a) && !document.querySelector('.lesson-card [data-primary]:not([disabled])')) {
          // already in order: nudge down and back up so "moved" is true
          document.querySelectorAll('.lesson-card .order-item')[0].querySelector('[aria-label="Move down"]').click();
          document.querySelectorAll('.lesson-card .order-item')[1].querySelector('[aria-label="Move up"]').click();
        }
      }
    }, [t, a, pr.input, wrong]);
  }
}
