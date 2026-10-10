# MathQuest

Math practice for one family: a 3rd grader, a 7th grader and a Geometry student. It works like IXL: adaptive questions, a SmartScore that tracks mastery, worked solutions after a miss, and a hands-on Math Lab.

**Live site:** https://abebts2000.github.io/mathquest/

## What's inside

| Track | Skills | Math Lab tools |
|---|---|---|
| Grade 3 | Multiplication & division facts, fractions on a number line, area & perimeter, place value & rounding, telling time | Array Builder, Fraction Strips |
| Grade 7 | Integers & rational numbers, proportional relationships, percent problems, two-step equations & inequalities, circles | Balance Scale, Integer Chips, Double Number Line, Circle Unroller |
| Geometry | Angle relationships, triangle congruence & proofs, Pythagorean theorem & special right triangles, transformations, coordinate geometry | Triangle Explorer, Transformation Studio |

Every problem is generated from a seeded template, so practice never runs out. Each skill has three difficulty levels picked by SmartScore (level 1 below 40, level 2 from 40, level 3 from 75).

Kid profiles, PINs and progress are stored in the browser's local storage on each device. Nothing is sent to a server.

## Project layout

```
src/core.js            track registry, seeded RNG, math helpers, answer checking, SmartScore rules (no DOM)
src/dom.js             DOM/SVG helpers and drag support shared with Lab tools
src/tracks/*.js        one file per track: skill generators + Math Lab tools
src/app.js             the UI: setup, profiles, practice loop, input widgets, Math Lab, parent view
src/styles.css         theme (light + dark) and components
CONTRACT.md            the interface every track file follows — read this before adding skills
build.js               bundles everything into one HTML file
test/harness.js        runs 300 problems per level per skill and validates them
test/e2e.js            Playwright run that answers questions in every skill through the real UI
vendor/katex/          KaTeX CSS and fonts (MIT) used for math rendering
```

## Commands

No dependencies to install for building or the generator checks.

```sh
node test/harness.js                 # check all skills (or pass one track file)
node build.js                        # → dist/index.html, the deployable site
node build.js --local                # → test/dev.html, works offline from file://
node test/e2e.js                     # browser test (needs Playwright + Chromium)
```

Open `dist/index.html` directly in a browser to try it locally.

## Adding a skill

1. Read `CONTRACT.md`.
2. Add a skill object with `generate(rng, level)` to a track file in `src/tracks/`.
3. Run `node test/harness.js src/tracks/<file>.js` until it reports `ALL CHECKS PASSED`.
4. Push to `main`. GitHub Actions runs the checks and redeploys the site.

## Deploying

`.github/workflows/pages.yml` runs the generator checks, builds `dist/`, and publishes it to GitHub Pages on every push to `main`. Pull requests run the checks without deploying.

One-time setup: in the repo's **Settings → Pages**, set **Source** to **GitHub Actions**.
