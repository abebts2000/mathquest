#!/usr/bin/env node
/* Screenshot every Lab in a track file (and optionally interact), for visual self-checks.
   Usage: node test/lab-shot.js src/tracks/grade3.js [outDir]  → writes <outDir>/<labId>-light.png and -dark.png
   Also prints any console errors thrown by mount(). Uses Playwright + bundled Chromium. */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const ROOT = path.join(__dirname, '..');
const file = process.argv[2];
const out = path.resolve(process.argv[3] || path.join(ROOT, 'test/shots'));
fs.mkdirSync(out, { recursive: true });
const KATEX = path.join(ROOT, 'vendor/katex');

(async () => {
  const exe = fs.readdirSync('/opt/pw-browsers').filter((d) => d.startsWith('chromium-'))
    .map((d) => path.join('/opt/pw-browsers', d, 'chrome-linux/chrome')).find((p) => fs.existsSync(p));
  const browser = await chromium.launch({ executablePath: exe });
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<link rel="stylesheet" href="file://${KATEX}/katex.min.css"><style>${fs.readFileSync(path.join(ROOT, 'src/styles.css'), 'utf8')}</style></head>
<body><main class="lab-host" id="host" style="padding:16px"></main>
<script src="file://${KATEX}/katex.min.js"></script><script src="file://${KATEX}/contrib/auto-render.min.js"></script>
<script>${fs.readFileSync(path.join(ROOT, 'src/core.js'), 'utf8')}</script>
<script>${fs.readFileSync(path.join(ROOT, 'src/dom.js'), 'utf8')}</script>
<script>${fs.readFileSync(path.resolve(ROOT, file), 'utf8')}</script></body></html>`;
  const tmp = path.join(out, '_lab.html'); fs.writeFileSync(tmp, html);
  for (const scheme of ['light', 'dark']) {
    const page = await browser.newPage({ viewport: { width: 390, height: 900 }, colorScheme: scheme, deviceScaleFactor: 2 });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto('file://' + tmp);
    const labs = await page.evaluate(() => MathQuest.tracks[MathQuest.tracks.length - 1].labs.map((l) => l.id));
    for (const id of labs) {
      await page.evaluate((id) => {
        const tr = MathQuest.tracks[MathQuest.tracks.length - 1]; const lab = tr.labs.find((l) => l.id === id);
        const host = document.getElementById('host'); host.innerHTML = '';
        const h = document.createElement('h2'); h.textContent = lab.title; host.appendChild(h);
        const el = document.createElement('div'); el.className = 'lab-body'; host.appendChild(el);
        try { lab.mount(el, MathQuestDOM.labApi); } catch (e) { console.error('mount threw: ' + e.stack); }
      }, id);
      await page.waitForTimeout(150);
      const shot = path.join(out, `${id}-${scheme}.png`);
      await page.screenshot({ path: shot, fullPage: true });
      console.log('wrote ' + shot);
    }
    if (errors.length) console.log(`[${scheme}] ERRORS:\n  ` + errors.join('\n  '));
    await page.close();
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
