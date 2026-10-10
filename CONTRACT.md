# MathQuest — Track Contract

MathQuest is a single-page, no-build, vanilla-JS math practice app (IXL-style) for one family:
a 3rd grader, a 7th grader, and a 9th grader in Geometry. Each **track** is ONE plain JS file in
`src/tracks/` that calls `MathQuest.registerTrack({...})`. The core (`src/core.js`, `src/app.js`) owns
all UI chrome, input widgets, scoring, storage and rendering. Your file owns the math.

Hard rules
- Plain ES2020 in a classic script (no `import`/`export`, no npm packages, no network). Wrap your
  whole file in an IIFE: `(function(){ ... MathQuest.registerTrack({...}); })();`
- Generators must be PURE: use only the `rng` argument for randomness (never `Math.random`), no DOM access.
  They are run in Node by the test harness (`node test/harness.js`), so they cannot touch `document`/`window`.
- Lab `mount()` functions DO use the DOM (they only run in the browser). Keep them in the same file.
- Math in strings: inline KaTeX with `$...$` (e.g. `"What is $\\frac{3}{4}$ of 12?"`). Use `\\(` style never.
  Remember to double-escape backslashes inside JS strings. Plain text is fine when no math is needed.
- Never use `innerHTML` with user input. Prompts/explanations are trusted HTML strings you author.
- Colours in SVG: use CSS variables so light/dark mode both work:
  `var(--ink)` (main strokes/text), `var(--muted)` (grid, secondary), `var(--accent)` (highlight),
  `var(--accent-2)` (second highlight), `var(--good)`, `var(--bad)`, `var(--surface)` (fills behind shapes),
  `var(--surface-2)` (alt fill). Use `font-family="inherit"`. Figures should have a `viewBox`, no fixed width
  (core makes them `width:100%; max-width:360px`).

## Track object

```js
MathQuest.registerTrack({
  id: 'g3',                       // 'g3' | 'g7' | 'geo'
  title: 'Grade 3',
  subtitle: 'Multiplication, fractions, area & more',
  skills: [Skill, ...],           // exactly 5 for phase 1
  labs:   [Lab, ...]              // at least 1
});
```

## Skill

```js
{
  id: 'g3-mult-facts',            // globally unique, prefix with track id
  title: 'Multiplication facts within 100',
  strand: 'Operations',           // short grouping label
  ccss: '3.OA.C.7',               // Common Core code
  blurb: 'One sentence a kid can read.',
  lab: 'g3-arrays',               // optional: id of a Lab that helps with this skill
  generate(rng, level) { return Problem; }   // level: 1 (easy), 2 (medium), 3 (challenge)
}
```

Difficulty must genuinely increase with level (bigger numbers, more steps, harder forms) and each
level must have enough variety that 20 problems in a row rarely repeat. Mix question formats within a
skill (e.g. direct computation, missing factor, word problem) where it fits.

## rng (passed to generate)

```
rng.int(a, b)          // inclusive integer
rng.pick(array)        // one element
rng.shuffle(array)     // returns NEW shuffled array
rng.bool(p=0.5)
rng.float()            // [0,1)
rng.sample(array, k)   // k distinct elements
rng.nonzero(a, b)      // inclusive integer, never 0
```

Helpers available on `MathQuest.util` (pure, usable in generators):
```
gcd(a,b), lcm(a,b), simplify(n,d) -> {n,d}, frac(n,d) -> "\\frac{n}{d}" latex (handles sign/whole),
fmt(num) -> number string with thousands separators and trimmed decimals (max 4dp), round(x, dp),
mixedLatex(n,d) -> latex for a mixed number, choicesFrom(correct, distractors, rng) -> {options, answer}
  (dedupes, shuffles, returns options as strings and the index of the correct one; give 3+ distractors),
name(rng) -> a kid-friendly first name, item(rng) -> {one:'apple', many:'apples'} countable noun
```

## Problem (returned by generate)

```js
{
  prompt: 'HTML string. May contain $latex$.',
  figure: '<svg viewBox="...">...</svg>',    // optional
  input: InputSpec,
  answer: <depends on input type>,
  explanation: ['step 1 html', 'step 2 html', ...],   // 2–5 short worked-solution steps, shown after a miss
  hint: 'optional one-line nudge',
  check(response) { return boolean }          // optional custom checker; otherwise default below
}
```

### InputSpec types and their `answer` / default check

| type | spec fields | `answer` | default check |
|---|---|---|---|
| `number` | `unit?` (shown after box), `placeholder?` | number | parsed number within 1e-6 (also accepts "1,200", leading +) |
| `fraction` | `allowMixed?` | `{n, d}` | equal value; if spec `requireSimplest: true` must be in lowest terms |
| `choice` | `options: [html strings]` (2–5) | index of correct option | exact index |
| `multi` | `fields: [{label, unit?}]` (2–3 number boxes) | array of numbers | each within 1e-6 |
| `numberline` | `min, max, step` (tick spacing, e.g. 1/4), `labelEvery?` (number of ticks between labels, default 1), `labels?` ('fraction' or 'decimal') | number value | within step/2 |
| `clock` | — | `{h, m}` (h 1–12, m 0–59) | exact |
| `point` | `xmin, xmax, ymin, ymax` (integers, grid of 1) | `{x, y}` | exact |
| `order` | `items: [html strings]` | array of item indices in correct order | exact sequence |

Response shapes passed to a custom `check`: number → number; fraction → `{n,d}` (d>0); choice → index;
multi → array of numbers; numberline → number; clock → `{h,m}`; point → `{x,y}`; order → array of indices.

Prefer `number`, `fraction`, `choice` for most problems; use the visual types where they teach something
(numberline for fractions on a line, clock for time, point for coordinates, order for proof steps / ordering).

## Lab (Math Lab manipulative)

```js
{
  id: 'g3-arrays',
  title: 'Array Builder',
  blurb: 'Build rows and columns to see multiplication as area.',
  mount(el, api) {
    // el: an empty <div> you own. Build interactive DOM/SVG inside it with vanilla JS.
    // api.tex(el)        -> render any $latex$ inside el with KaTeX
    // api.svg(tag, attrs)-> create an SVG element with attributes
    // api.h(tag, attrs, ...children) -> create an HTML element (attrs: class, text, html, style{}, onclick, etc.)
    // api.svgPoint(svgEl, evt) -> {x,y} pointer position in SVG user units
    // api.drag(svgEl, targetEl, onMove(p, evt), onEnd?) -> wires pointer-capture dragging (touch + mouse)
    // Return an optional cleanup function.
  }
}
```

Lab guidelines: genuinely interactive (drag, click, sliders/steppers), shows the live math
(e.g. "4 × 6 = 24" updating as you drag), includes a short "Try this" challenge line or two, works by
touch (use pointer events, `touch-action:none` on draggable SVG) and by mouse, fits a 360px-wide phone.
Use classes `btn`, `btn-small`, `chip`, `lab-row`, `lab-readout` which core styles; inline styles are fine
otherwise. Use the CSS variables above for colour.

## Done means
`node test/harness.js src/tracks/<yourfile>.js` passes: every skill, every level, 300 problems each,
generates valid problems whose `answer` passes their own check, with no NaN/undefined in text, valid
KaTeX delimiters, and distinct choice options.
