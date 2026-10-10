#!/usr/bin/env node
/* Bundles MathQuest into one HTML file.
   node build.js          → dist/index.html (KaTeX JS from cdnjs, CSS + fonts inlined; for publishing)
   node build.js --local  → test/dev.html  (KaTeX from vendor/ via file://; for offline testing) */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;
const local = process.argv.includes('--local');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const KATEX_VER = '0.16.11';

// KaTeX CSS with woff2 fonts embedded as data URIs (artifact pages can't load other font hosts).
let katexCss = read('vendor/katex/katex.min.css').replace(/src:url\(fonts\/([\w-]+)\.woff2\) format\("woff2"\)(,url\([^)]*\) format\("[^"]*"\))*/g, (m, name) => {
  const b64 = fs.readFileSync(path.join(ROOT, 'vendor/katex/fonts', name + '.woff2')).toString('base64');
  return `src:url(data:font/woff2;base64,${b64}) format("woff2")`;
});

const katexJs = local
  ? `<script src="file://${ROOT}/vendor/katex/katex.min.js"></script>\n<script src="file://${ROOT}/vendor/katex/contrib/auto-render.min.js"></script>`
  : `<script src="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/${KATEX_VER}/katex.min.js"></script>\n<script src="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/${KATEX_VER}/contrib/auto-render.min.js"></script>`;

const scripts = ['src/core.js', 'src/dom.js', 'src/tracks/grade3.js', 'src/tracks/grade7.js', 'src/tracks/geometry.js', 'src/app.js']
  .map((f) => `<script>/* ${f} */\n${read(f).replace(/<\/script/gi, '<\\/script')}\n</script>`).join('\n');

const html = `<title>MathQuest</title>
<meta name="description" content="Math practice for Grade 3, Grade 7 and Geometry: adaptive questions, SmartScore mastery and hands-on Math Lab tools.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&family=Fredoka:wght@500;600;700&display=swap">
<style>${katexCss}</style>
<style>${read('src/styles.css')}</style>
<div id="app"></div>
${katexJs}
${scripts}
`;
const out = local ? path.join(ROOT, 'test/dev.html') : path.join(ROOT, 'dist/index.html');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, local ? `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"></head><body>\n${html}</body></html>` : html);
console.log(`wrote ${path.relative(ROOT, out)} (${(Buffer.byteLength(html) / 1024).toFixed(0)} KB)`);
