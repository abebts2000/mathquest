#!/usr/bin/env node
/* Friends flow across two families (two separate browsers) against the mock Supabase server.
   Needs: a local Postgres with supabase/test/supabase-shim.sql + supabase/schema.sql loaded,
   the mock running (supabase/test/mock-supabase.js), and test/dev.html built with
   MQ_SUPABASE_URL=http://localhost:54321 node build.js --local */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const ROOT = path.join(__dirname, '..');
const OUT = process.argv[2] || path.join(ROOT, 'test/shots/friends');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const exe = fs.readdirSync('/opt/pw-browsers').filter((d) => d.startsWith('chromium-')).map((d) => path.join('/opt/pw-browsers', d, 'chrome-linux/chrome')).find((p) => fs.existsSync(p));
  const browser = await chromium.launch({ executablePath: exe });
  const errors = [];
  async function family(label, kid, parentPin) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(`${label} pageerror: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL|fonts/.test(m.text())) errors.push(`${label} console: ${m.text()}`); });
    await page.goto('file://' + path.join(ROOT, 'test/dev.html'));
    // keep just one player for this test
    while ((await page.$$('button:has-text("Remove")')).length) await page.locator('button:has-text("Remove")').last().click();
    await page.fill('#name-k1', kid);
    if (parentPin) await page.fill('#parent-pin', parentPin);
    await page.click('text=Start practising');
    await page.click(`.profile-btn:has-text("${kid}")`);
    await page.waitForSelector('.friend-code');
    await page.waitForFunction(() => /^[A-Z0-9]{6}$/.test(document.querySelector('.friend-code').textContent));
    const code = await page.textContent('.friend-code');
    return { page, code };
  }
  const shot = (page, name) => page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: true });

  const A = await family('A', 'Mia', '1357');
  const B = await family('B', 'Sam', '4321');
  console.log('codes', A.code, B.code);
  await shot(A.page, '01-A-home');

  // B adds A (parent PIN required on B's device)
  await B.page.click('.friends-card button:has-text("Add")');
  await B.page.fill('#friend-code', A.code.toLowerCase());
  await shot(B.page, '02-B-add');
  await B.page.click('text=Send request');
  for (const d of '4321') await B.page.click(`.pin-pad button:has-text("${d}")`);
  await B.page.waitForSelector('.sheet h2:has-text("Request sent!")');
  await shot(B.page, '03-B-sent');
  await B.page.click('.sheet button:has-text("Done")');
  await B.page.waitForSelector('.friends-card .league li');
  await shot(B.page, '04-B-waiting');

  // A sees the request note, parent approves
  await A.page.click('.brand'); // re-render home
  await A.page.waitForSelector('.friends-card .try');
  await A.page.click('.who');
  await A.page.click('text=Parent view');
  for (const d of '1357') await A.page.click(`.pin-pad button:has-text("${d}")`);
  await A.page.waitForSelector('.parent-friends button:has-text("Approve")');
  await shot(A.page, '05-A-parent');
  await A.page.click('.parent-friends button:has-text("Approve")');
  await A.page.waitForSelector('.parent-friends button:has-text("Remove")');

  // Both see each other as friends
  await B.page.click('.brand');
  await B.page.waitForFunction(() => [...document.querySelectorAll('.friends-card .league li')].some((li) => /Mia/.test(li.textContent) && /XP/.test(li.textContent)));
  await shot(B.page, '06-B-friends');
  // wrong code path
  await B.page.click('.friends-card button:has-text("Add")');
  await B.page.fill('#friend-code', 'ZZZZZZ');
  await B.page.click('text=Send request');
  for (const d of '4321') await B.page.click(`.pin-pad button:has-text("${d}")`);
  await B.page.waitForSelector('.sheet h2:has-text("Hmm")');
  const msg = await B.page.textContent('.sheet p');
  console.log('bad code message:', msg);
  console.log(errors.length ? 'ERRORS:\n  ' + errors.join('\n  ') : 'FRIENDS E2E PASSED');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
