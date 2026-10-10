# MathQuest

Math practice for one family: a 3rd grader, a 7th grader and a Geometry student. It works like IXL: adaptive questions, a SmartScore that tracks mastery, worked solutions after a miss, and a hands-on Math Lab.

**Live site:** https://abebts2000.github.io/mathquest/

## What's inside

| Track | Skills | Math Lab tools |
|---|---|---|
| Grade 3 | Multiplication & division facts, fractions on a number line, area & perimeter, place value & rounding, telling time | Array Builder, Fraction Strips |
| Grade 7 | Integers & rational numbers, proportional relationships, percent problems, two-step equations & inequalities, circles | Balance Scale, Integer Chips, Double Number Line, Circle Unroller |
| Geometry | Angle relationships, triangle congruence & proofs, Pythagorean theorem & special right triangles, transformations, coordinate geometry | Triangle Explorer, Transformation Studio |

## How it plays

- **Skill path:** each track is a winding path of skill nodes with crowns (levels 1–3) and Math Lab chests along the way.
- **Lessons:** 10 correct answers finish a lesson. Missed questions show the worked solution, then the lesson keeps going.
- **XP & combos:** +5 XP per correct answer, +5 bonus every 5 in a row, +20 for finishing, +15 for a perfect lesson.
- **Daily goal & streaks:** 100 XP a day; a flame streak that grows each day you practise, protected by streak freezes.
- **Gems & quests:** three daily quests open reward chests with gems; gems buy streak freezes.
- **Family league:** everyone's XP for the last 7 days, ranked.
- **Friends:** kids add friends from other families with a 6-character code; parents approve every friend. Needs a free Supabase project — see `supabase/README.md`.
- **Arenas:** a moving background of floating math symbols that upgrades to a new arena (Chalk Meadow → Golden Galaxy) as trophies grow, with a level-up celebration.
- **Trophies & Trophy Road:** finished lessons earn trophies (more for fewer mistakes); milestones unlock gems, reward drops, skins, hats and pins.
- **Reward drops:** one per finished lesson; each tap can upgrade it from Rare up to Legendary before it opens.
- **Collection:** dress up Pip with skins and hats, and wear a pin next to your name.
- **Sound & voice:** punchy synthesized effects (drums, chord stabs, sparkles, risers) and a cheering voice ("Good job!", "Well done!", "Woo hoo!", "Double!", "Legendary!") using the device's built-in text-to-speech. The top-bar button cycles sound + voice → sound only → muted.
- **Effects:** haptics on phones, confetti, combo callouts, screen shake, and Pip the mascot.

Every problem is generated from a seeded template, so practice never runs out. Each skill has three difficulty levels picked by SmartScore (level 1 below 40, level 2 from 40, level 3 from 75).

Kid profiles, PINs and progress are stored in the browser's local storage on each device. With friends turned on, only each kid's display name, colour, track, streak and XP are shared, and only with approved friends.

## Project layout

```
src/core.js            track registry, seeded RNG, math helpers, answer checking, SmartScore rules (no DOM)
src/dom.js             DOM/SVG helpers and drag support shared with Lab tools
src/tracks/*.js        one file per track: skill generators + Math Lab tools
src/widgets.js         answer widgets: number, fraction, choice, number line, clock, grid point, ordering
src/game.js            game layer: XP rules, quests, sound engine, mascot, confetti
src/voice.js           spoken cheers and callouts via the Web Speech API
src/rewards.js         trophies, trophy road, reward drops, skins/hats/pins, callouts and screen shake
src/arena.js           moving canvas background that changes with each arena
src/cloud.js           friends client: anonymous sign-in and RPC calls to Supabase
src/config.js          Supabase URL + anon key (blank = friends off)
supabase/              friends database schema, security tests and setup guide
src/app.js             the UI: setup, profiles, skill path, lessons, Math Lab, parent view
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
node build.js --artifact             # → dist/artifact.html, body-only version for Claude artifacts
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
