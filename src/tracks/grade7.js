/* MathQuest — Grade 7 track: integers & rationals, proportions, percent, equations, circles. */
(function () {
  'use strict';
  const MQ = MathQuest;
  const U = MQ.util;

  // ---------------------------------------------------------------- helpers
  const pn = (r) => MQ.parseNumber(typeof r === 'string' ? r.replace(/[$\s%]/g, '') : r);
  const nl = (x) => U.fmt(x).replace(/,/g, '{,}');                // latex number
  const P = (x) => (x < 0 ? '(' + nl(x) + ')' : nl(x));            // parenthesise negatives
  const sgn = (x) => (x > 0 ? '+' + nl(x) : nl(x));
  function moneyStr(x) {
    const neg = x < 0; const a = Math.abs(x);
    let s = Number.isInteger(U.round(a, 2)) ? String(U.round(a, 2)) : a.toFixed(2);
    let [i, f] = s.split('.');
    i = i.replace(/\B(?=(\d{3})+(?!\d))/g, '{,}');
    return (neg ? '-' : '') + '\\$' + i + (f ? '.' + f : '');
  }
  const M = (x) => '$' + moneyStr(x) + '$';                       // money inside math mode
  const M2 = (x) => { const s = Math.abs(x).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, '{,}'); return '$' + (x < 0 ? '-' : '') + '\\$' + s + '$'; };
  const near = (a, b, t) => typeof a === 'number' && isFinite(a) && Math.abs(a - b) <= t + 1e-9;
  const moneyCheck = (exact) => (r) => near(pn(r), exact, 0.005);
  const tenthCheck = (...vals) => (r) => { const v = pn(r); return vals.some((t) => near(v, U.round(t, 1), 0.05)); };
  const fl = (n, d) => { const s = U.simplify(n, d); return U.frac(s.n, s.d); };
  const pfl = (n, d) => (n * d < 0 ? '\\left(' + fl(n, d) + '\\right)' : fl(n, d));
  const choice = (correct, distractors, rng, fallback) => {
    let c = U.choicesFrom(correct, distractors, rng);
    if (c.options.length < 3 && fallback) c = U.choicesFrom(correct, distractors.concat(fallback), rng);
    return c;
  };
  const VARS = ['x', 'n', 'm', 'y', 'a', 'k', 't', 'w'];
  function lin(p, q, v) {
    const t = p === 1 ? v : p === -1 ? '-' + v : nl(p) + v;
    if (!q) return t;
    return t + (q > 0 ? ' + ' + nl(q) : ' - ' + nl(-q));
  }
  function decLatex(p, q) {
    const neg = p < 0; p = Math.abs(p);
    const ip = Math.floor(p / q); let r = p % q; const digits = []; const seen = {}; let rep = -1;
    while (r !== 0 && digits.length < 12) {
      if (seen[r] !== undefined) { rep = seen[r]; break; }
      seen[r] = digits.length; r *= 10; digits.push(Math.floor(r / q)); r %= q;
    }
    let s = String(ip);
    if (digits.length) s += '.' + (rep < 0 ? digits.join('') : digits.slice(0, rep).join('') + '\\overline{' + digits.slice(rep).join('') + '}');
    return (neg ? '-' : '') + s;
  }
  const SVGF = 'font-family="inherit"';
  const rd1 = (x) => { const a = U.round(x, 4), b = U.round(x, 1); return nl(a) + (Math.abs(a - b) < 1e-9 ? '' : ' \\approx ' + nl(b)); };

  // number line figure with jump arrows
  function numberLineFig(lo, hi, start, end, labelEvery) {
    const W = 360, x0 = 20, x1 = 340, y = 62;
    const X = (v) => x0 + (v - lo) * (x1 - x0) / (hi - lo);
    let s = `<svg viewBox="0 0 ${W} 90" xmlns="http://www.w3.org/2000/svg" ${SVGF}>`;
    s += `<line x1="${x0 - 8}" y1="${y}" x2="${x1 + 8}" y2="${y}" stroke="var(--ink)" stroke-width="2"/>`;
    s += `<path d="M${x0 - 12} ${y} l8 -5 v10 z M${x1 + 12} ${y} l-8 -5 v10 z" fill="var(--ink)"/>`;
    for (let v = lo; v <= hi; v++) {
      const big = v % labelEvery === 0;
      s += `<line x1="${X(v)}" y1="${y - (big ? 7 : 4)}" x2="${X(v)}" y2="${y + (big ? 7 : 4)}" stroke="var(--ink)" stroke-width="${big ? 2 : 1}"/>`;
      if (big) s += `<text x="${X(v)}" y="${y + 22}" font-size="12" text-anchor="middle" fill="var(--ink)">${v < 0 ? '−' + (-v) : v}</text>`;
    }
    const a = X(start), b = X(end), mid = (a + b) / 2, hgt = Math.min(34, 12 + Math.abs(b - a) / 4);
    s += `<circle cx="${a}" cy="${y}" r="5" fill="var(--accent)"/>`;
    s += `<path d="M${a} ${y - 4} Q${mid} ${y - hgt * 2} ${b} ${y - 4}" fill="none" stroke="var(--accent-2)" stroke-width="2.5"/>`;
    const dir = b > a ? -1 : 1;
    s += `<path d="M${b} ${y - 3} l${dir * 9} -6 l${dir * 1} 9 z" fill="var(--accent-2)"/>`;
    s += '</svg>';
    return s;
  }

  // ======================================================================
  // Skill 1: integers & rational numbers
  // ======================================================================
  function addSteps(a, b) {
    const s = a + b;
    if (a === 0 || b === 0) return [`Adding $0$ does not change a number, so the sum is $${nl(s)}$.`];
    if (a + b === 0) return [`$${nl(a)}$ and $${nl(b)}$ are opposites, so they make zero pairs.`, `The sum is $0$.`];
    if ((a > 0) === (b > 0)) {
      return [`Both numbers are ${a > 0 ? 'positive' : 'negative'}, so add their absolute values: $${Math.abs(a)} + ${Math.abs(b)} = ${Math.abs(s)}$.`,
        `Keep the shared sign: the answer is $${nl(s)}$.`];
    }
    const big = Math.abs(a) > Math.abs(b) ? a : b;
    return [`The signs are different, so subtract the absolute values: $${Math.max(Math.abs(a), Math.abs(b))} - ${Math.min(Math.abs(a), Math.abs(b))} = ${Math.abs(s)}$.`,
      `$${nl(big)}$ has the larger absolute value, so the answer is ${big > 0 ? 'positive' : 'negative'}: $${nl(s)}$.`];
  }

  function genIntegers(rng, level) {
    if (level === 1) {
      const t = rng.pick(['add', 'add', 'sub', 'sub', 'line', 'fig', 'missing', 'context', 'dist']);
      if (t === 'add') {
        let a = rng.nonzero(-20, 20), b = rng.nonzero(-20, 20);
        if (a > 0 && b > 0) b = -b;
        return { prompt: `What is $${nl(a)} + ${P(b)}$?`, input: { type: 'number' }, answer: a + b,
          explanation: addSteps(a, b), hint: 'Same signs: add and keep the sign. Different signs: subtract and take the sign of the "bigger" number.' };
      }
      if (t === 'sub') {
        const a = rng.nonzero(-20, 20); let b = rng.nonzero(-20, 20);
        if (a > 0 && b > 0 && rng.bool()) b = -b;
        return { prompt: `What is $${nl(a)} - ${P(b)}$?`, input: { type: 'number' }, answer: a - b,
          explanation: [`Subtracting means adding the opposite: $${nl(a)} - ${P(b)} = ${nl(a)} + ${P(-b)}$.`].concat(addSteps(a, -b)),
          hint: 'Keep, change, change: keep the first number, change − to +, change the sign of the second number.' };
      }
      if (t === 'line') {
        let a, b;
        do { a = rng.int(-10, 10); b = rng.nonzero(-10, 10); } while (Math.abs(a + b) > 12);
        return { prompt: `Plot the value of $${nl(a)} + ${P(b)}$ on the number line.`,
          input: { type: 'numberline', min: -12, max: 12, step: 1, labelEvery: 2 }, answer: a + b,
          explanation: [`Start at $${nl(a)}$.`, `Adding $${nl(b)}$ means moving $${Math.abs(b)}$ units to the ${b > 0 ? 'right' : 'left'}.`, `You land on $${nl(a + b)}$.`],
          hint: 'Adding a positive moves right; adding a negative moves left.' };
      }
      if (t === 'fig') {
        let a, b;
        do { a = rng.nonzero(-9, 9); b = rng.nonzero(-9, 9); } while (Math.abs(a + b) > 10 || Math.abs(b) < 2);
        const s = a + b;
        const c = choice(`$${nl(a)} + ${P(b)}$`,
          [`$${nl(a)} + ${P(-b)}$`, `$${nl(s)} + ${P(b)}$`, `$${nl(s)} + ${P(-b)}$`, `$${nl(-a)} + ${P(b)}$`], rng);
        return { prompt: 'Which sum does this number line model?', figure: numberLineFig(-10, 10, a, s, 2),
          input: { type: 'choice', options: c.options }, answer: c.answer,
          explanation: [`The jump starts at the dot, $${nl(a)}$.`, `It moves $${Math.abs(b)}$ units ${b > 0 ? 'right' : 'left'}, which means adding $${nl(b)}$.`, `It ends at $${nl(s)}$, so it models $${nl(a)} + ${P(b)} = ${nl(s)}$.`] };
      }
      if (t === 'missing') {
        const a = rng.nonzero(-15, 15), x = rng.nonzero(-15, 15), c = a + x;
        return { prompt: `Find the missing number: $${nl(a)} + \\square = ${nl(c)}$`, input: { type: 'number' }, answer: x,
          explanation: [`Ask: what do you add to $${nl(a)}$ to get $${nl(c)}$? Subtract: $${nl(c)} - ${P(a)}$.`, `$${nl(c)} - ${P(a)} = ${nl(c)} + ${P(-a)} = ${nl(x)}$.`, `Check: $${nl(a)} + ${P(x)} = ${nl(c)}$ ✓`] };
      }
      if (t === 'context') {
        const k = rng.int(0, 2);
        if (k === 0) {
          const a = rng.int(-15, -1), r = rng.int(3, 20); const place = rng.pick(['Minneapolis', 'Fairbanks', 'Quebec City', 'Duluth', 'Burlington']);
          return { prompt: `At 6 a.m. it was $${a}^{\\circ}\\text{F}$ in ${place}. By noon the temperature rose $${r}$ degrees. What was the temperature at noon (in °F)?`,
            input: { type: 'number', unit: '°F' }, answer: a + r,
            explanation: [`Rising means adding: $${a} + ${r}$.`].concat(addSteps(a, r)) };
        }
        if (k === 1) {
          const a = -rng.int(5, 30), r = rng.int(3, 25);
          const up = rng.bool();
          return { prompt: `A submarine is at $${a}$ feet (below sea level). It ${up ? 'rises' : 'dives'} $${r}$ feet. What is its new elevation?`,
            input: { type: 'number', unit: 'ft' }, answer: up ? a + r : a - r,
            explanation: [up ? `Rising means adding: $${a} + ${r}$.` : `Diving deeper means subtracting: $${a} - ${r} = ${a} + (-${r})$.`].concat(addSteps(a, up ? r : -r)) };
        }
        const n = U.name(rng), have = rng.int(2, 20), cost = rng.int(have + 1, have + 20);
        return { prompt: `${n}'s account has ${M(have)}. ${n} buys a game for ${M(cost)}, and the bank lets the balance go negative. What is the new balance (in dollars)?`,
          input: { type: 'number', unit: 'dollars' }, answer: have - cost,
          explanation: [`Spending means subtracting: $${have} - ${cost}$.`].concat(addSteps(have, -cost)) };
      }
      // dist
      const lo = rng.int(-20, -1), hi = rng.int(1, 20);
      const ctx = rng.pick([['the bottom of a cave', 'the top of a hill', 'm', 'higher'], ['the coldest night', 'the warmest afternoon', '°F', 'warmer']]);
      return { prompt: ctx[2] === 'm' ? `The bottom of a cave is at an elevation of $${lo}$ meters. The top of a nearby hill is at $${hi}$ meters. How many meters higher is the hilltop than the cave bottom?` : `The temperature on the coldest night of the year was $${lo}^{\\circ}\\text{F}$. On the warmest afternoon it was $${hi}^{\\circ}\\text{F}$. How many degrees warmer was the afternoon?`,
        input: { type: 'number', unit: ctx[2] }, answer: hi - lo,
        explanation: [`The distance between two numbers is the absolute value of their difference.`, `$${hi} - (${lo}) = ${hi} + ${-lo} = ${hi - lo}$.`, `So it is $${hi - lo}$ ${ctx[3]}.`] };
    }

    if (level === 2) {
      const t = rng.pick(['mul', 'div', 'sign', 'ops', 'ops', 'context', 'context', 'missing']);
      if (t === 'mul') {
        let a = rng.nonzero(-12, 12), b = rng.nonzero(-12, 12);
        if (a > 0 && b > 0) a = -a;
        const p = a * b;
        return { prompt: `What is $${P(a)} \\times ${P(b)}$?`, input: { type: 'number' }, answer: p,
          explanation: [`Multiply the absolute values: $${Math.abs(a)} \\times ${Math.abs(b)} = ${Math.abs(p)}$.`, (a < 0) === (b < 0) ? 'Same signs give a positive product.' : 'Different signs give a negative product.', `Answer: $${nl(p)}$.`] };
      }
      if (t === 'div') {
        let q = rng.nonzero(-12, 12), d = rng.nonzero(-12, 12);
        if (q > 0 && d > 0) d = -d;
        if (Math.abs(d) === 1) d = d * rng.int(2, 9);
        const n = q * d;
        const form = rng.bool() ? `$${nl(n)} \\div ${P(d)}$` : `$\\dfrac{${nl(n)}}{${nl(d)}}$`;
        return { prompt: `What is ${form}?`, input: { type: 'number' }, answer: q,
          explanation: [`Divide the absolute values: $${Math.abs(n)} \\div ${Math.abs(d)} = ${Math.abs(q)}$.`, (n < 0) === (d < 0) ? 'Same signs give a positive quotient.' : 'Different signs give a negative quotient.', `Answer: $${nl(q)}$.`] };
      }
      if (t === 'sign') {
        const k = rng.int(3, 5); const fs = [];
        for (let i = 0; i < k; i++) fs.push(rng.nonzero(-9, 9));
        const negs = fs.filter((f) => f < 0).length;
        const pos = negs % 2 === 0;
        const opts = ['Positive', 'Negative', 'Zero'];
        return { prompt: `Without multiplying it out, is this product positive, negative, or zero? $${fs.map(P).join(' \\cdot ')}$`,
          input: { type: 'choice', options: opts }, answer: pos ? 0 : 1,
          explanation: [`No factor is $0$, so the product is not zero.`, `Count the negative factors: there ${negs === 1 ? 'is' : 'are'} $${negs}$.`, `An ${pos ? 'even' : 'odd'} number of negatives makes the product ${pos ? 'positive' : 'negative'}.`] };
      }
      if (t === 'ops') {
        const k = rng.int(0, 5);
        let a = rng.nonzero(-9, 9), b = rng.nonzero(-9, 9), c = rng.nonzero(-6, 6);
        if (k === 0) { // a + b*c
          const v = a + b * c;
          return { prompt: `Evaluate $${nl(a)} + ${P(b)} \\times ${P(c)}$.`, input: { type: 'number' }, answer: v,
            explanation: [`Multiply first: $${P(b)} \\times ${P(c)} = ${nl(b * c)}$.`, `Then add: $${nl(a)} + ${P(b * c)} = ${nl(v)}$.`] };
        }
        if (k === 1) { // (a+b)*c
          const v = (a + b) * c;
          return { prompt: `Evaluate $(${nl(a)} + ${P(b)}) \\times ${P(c)}$.`, input: { type: 'number' }, answer: v,
            explanation: [`Parentheses first: $${nl(a)} + ${P(b)} = ${nl(a + b)}$.`, `Then multiply: $${P(a + b)} \\times ${P(c)} = ${nl(v)}$.`] };
        }
        if (k === 2) { // a - b ÷ c with b = c*m
          const m = rng.nonzero(-8, 8); b = c * m; const v = a - m;
          return { prompt: `Evaluate $${nl(a)} - ${P(b)} \\div ${P(c)}$.`, input: { type: 'number' }, answer: v,
            explanation: [`Divide first: $${P(b)} \\div ${P(c)} = ${nl(m)}$.`, `Then subtract: $${nl(a)} - ${P(m)} = ${nl(a)} + ${P(-m)} = ${nl(v)}$.`] };
        }
        if (k === 3) { // a*b - c*d
          const d = rng.nonzero(-6, 6); const v = a * b - c * d;
          return { prompt: `Evaluate $${P(a)} \\cdot ${P(b)} - ${P(c)} \\cdot ${P(d)}$.`, input: { type: 'number' }, answer: v,
            explanation: [`Do both multiplications: $${P(a)} \\cdot ${P(b)} = ${nl(a * b)}$ and $${P(c)} \\cdot ${P(d)} = ${nl(c * d)}$.`, `Subtract: $${nl(a * b)} - ${P(c * d)} = ${nl(v)}$.`] };
        }
        if (k === 4) { // (-a)^2 + b  vs -a^2
          const n = rng.int(2, 7); const paren = rng.bool();
          const sq = paren ? n * n : -n * n; const v = sq + b;
          return { prompt: `Evaluate $${paren ? `(-${n})^2` : `-${n}^2`} + ${P(b)}$.`, input: { type: 'number' }, answer: v,
            explanation: [paren ? `The negative is inside the parentheses, so square $-${n}$: $(-${n})(-${n}) = ${n * n}$.` : `The exponent only applies to $${n}$: $-${n}^2 = -(${n} \\cdot ${n}) = -${n * n}$.`, `Then add: $${nl(sq)} + ${P(b)} = ${nl(v)}$.`],
            hint: 'Watch out: (−n)² and −n² are not the same!' };
        }
        // (a + b)/c
        const m = rng.nonzero(-8, 8); const sum = c * m; b = sum - a;
        if (b === 0) b = 1; const s2 = a + b; const v = s2 / c;
        if (!Number.isInteger(v)) return genIntegers(rng, level);
        return { prompt: `Evaluate $\\dfrac{${nl(a)} + ${P(b)}}{${nl(c)}}$.`, input: { type: 'number' }, answer: v,
          explanation: [`The fraction bar groups the top: $${nl(a)} + ${P(b)} = ${nl(s2)}$.`, `Divide: $${nl(s2)} \\div ${P(c)} = ${nl(v)}$.`] };
      }
      if (t === 'context') {
        const k = rng.int(0, 3);
        if (k === 0) {
          const s = rng.int(-5, 15), r = rng.int(2, 6), hrs = rng.int(3, 8), v = s - r * hrs;
          return { prompt: `The temperature was $${s}^{\\circ}\\text{F}$ at sunset. It dropped $${r}$ degrees every hour for $${hrs}$ hours. What was the temperature then (in °F)?`,
            input: { type: 'number', unit: '°F' }, answer: v,
            explanation: [`Each hour the change is $-${r}$, so the total change is $${hrs} \\times (-${r}) = ${-r * hrs}$.`, `New temperature: $${s} + (${-r * hrs}) = ${v}$.`] };
        }
        if (k === 1) {
          const r = rng.int(3, 15), m = rng.int(2, 9), v = -r * m;
          return { prompt: `A diver starts at the surface (elevation $0$) and descends $${r}$ feet per minute for $${m}$ minutes. What is the diver's elevation in feet?`,
            input: { type: 'number', unit: 'ft' }, answer: v,
            explanation: [`Descending is a negative change: $-${r}$ feet per minute.`, `$${m} \\times (-${r}) = ${v}$, so the diver is at $${v}$ feet.`] };
        }
        if (k === 2) {
          const n = U.name(rng), bal = rng.int(10, 60), w = rng.int(5, 25), wk = rng.int(3, 8), v = bal - w * wk;
          return { prompt: `${n} has ${M(bal)} in a bank account and an automatic payment takes out ${M(w)} every week. What is the balance after $${wk}$ weeks (in dollars)? (A negative balance means the account is overdrawn.)`,
            input: { type: 'number', unit: 'dollars' }, answer: v,
            explanation: [`Total change: $${wk} \\times (-${w}) = ${-w * wk}$.`, `Balance: $${bal} + (${-w * wk}) = ${v}$.`] };
        }
        const per = -rng.int(2, 9), hrs = rng.int(3, 8), tot = per * hrs;
        return { prompt: `Over $${hrs}$ hours, the temperature changed by a total of $${tot}^{\\circ}\\text{F}$. If it changed by the same amount each hour, what was the change per hour?`,
          input: { type: 'number', unit: '°F per hour' }, answer: per,
          explanation: [`Share the total change equally: $${tot} \\div ${hrs}$.`, `A negative divided by a positive is negative: $${tot} \\div ${hrs} = ${per}$.`] };
      }
      const a = rng.nonzero(-12, 12), x = rng.nonzero(-12, 12);
      if (Math.abs(a) === 1 || Math.abs(x) === 1) return genIntegers(rng, level);
      const c = a * x;
      return { prompt: `Find the missing number: $${P(a)} \\times \\square = ${nl(c)}$`, input: { type: 'number' }, answer: x,
        explanation: [`Divide to undo multiplying: $${nl(c)} \\div ${P(a)}$.`, `$${nl(c)} \\div ${P(a)} = ${nl(x)}$ (${(c < 0) === (a < 0) ? 'same signs → positive' : 'different signs → negative'}).`] };
    }

    // level 3: rational numbers
    const t = rng.pick(['fadd', 'fadd', 'fmul', 'dec', 'dec', 'multi', 'repeat', 'context']);
    const DEN = [2, 3, 4, 5, 6, 8, 10, 12];
    if (t === 'fadd') {
      const F1 = U.simplify(rng.nonzero(-11, 11), rng.pick(DEN)), F2 = U.simplify(rng.int(1, 11), rng.pick(DEN));
      if (F1.d === 1 || F2.d === 1) return genIntegers(rng, level);
      const sub = rng.bool(), b = rng.bool(0.4) ? -F2.n : F2.n, d1 = F1.d, d2 = F2.d, n1 = F1.n;
      const L = U.lcm(d1, d2), e = (sub ? -1 : 1) * b;
      const num = n1 * (L / d1) + e * (L / d2);
      const ans = U.simplify(num, L);
      if (ans.n === 0) return genIntegers(rng, level);
      const raw = (n, d) => (n < 0 ? '-' : '') + '\\frac{' + Math.abs(n) + '}{' + d + '}';
      const praw = (n, d) => (n < 0 ? '\\left(' + raw(n, d) + '\\right)' : raw(n, d));
      return { prompt: `Calculate. Give your answer in simplest form.<br>$${fl(n1, d1)} ${sub ? '-' : '+'} ${pfl(b, d2)}$`,
        input: { type: 'fraction', allowMixed: true, requireSimplest: true }, answer: ans,
        explanation: (sub ? [`Subtracting is adding the opposite: $${fl(n1, d1)} + ${pfl(e, d2)}$.`] : [])
          .concat([`Use a common denominator of $${L}$: $${raw(n1 * (L / d1), L)} + ${praw(e * (L / d2), L)}$.`,
            `Add the numerators: $${n1 * (L / d1)} + ${P(e * (L / d2))} = ${num}$, giving $${raw(num, L)}$${U.gcd(num, L) > 1 ? `, which simplifies to $${U.frac(ans.n, ans.d)}$` : ''}.`]) };
    }
    if (t === 'fmul') {
      const div = rng.bool();
      let n1 = rng.nonzero(-9, 9), d1 = rng.int(2, 10), n2 = rng.int(1, 9), d2 = rng.int(2, 10);
      if (rng.bool()) n2 = -n2;
      if (n1 > 0 && n2 > 0) n1 = -n1;
      const s1 = U.simplify(n1, d1), s2 = U.simplify(n2, d2);
      if (s1.d === 1 || s2.d === 1) return genIntegers(rng, level);
      const ans = div ? U.simplify(s1.n * s2.d, s1.d * s2.n) : U.simplify(s1.n * s2.n, s1.d * s2.d);
      const A = pfl(s1.n, s1.d), B = pfl(s2.n, s2.d);
      return { prompt: `Calculate. Give your answer in simplest form.<br>$${A} ${div ? '\\div' : '\\times'} ${B}$`,
        input: { type: 'fraction', allowMixed: true, requireSimplest: true }, answer: ans,
        explanation: (div ? [`Dividing by a fraction means multiplying by its reciprocal: $${A} \\times ${pfl(s2.d, s2.n)}$.`] : [])
          .concat([`Multiply tops and bottoms: $\\frac{${div ? s1.n * s2.d : s1.n * s2.n}}{${div ? s1.d * s2.n : s1.d * s2.d}}$.`,
            `${(ans.n < 0) ? 'Different signs, so the answer is negative.' : 'Same signs, so the answer is positive.'} In simplest form: $${U.frac(ans.n, ans.d)}$.`]) };
    }
    if (t === 'dec') {
      const op = rng.pick(['+', '-', '×']);
      let a, b, ans, steps;
      if (op === '×') {
        a = rng.nonzero(-60, 60) / 10; b = rng.nonzero(-40, 40) / 10;
        if (a > 0 && b > 0) a = -a;
        ans = U.round(a * b, 4);
        steps = [`Multiply as if there were no signs or decimals: $${Math.round(Math.abs(a) * 10)} \\times ${Math.round(Math.abs(b) * 10)} = ${Math.round(Math.abs(a * b) * 100)}$.`,
          `There are two decimal places in total, so the size is $${nl(Math.abs(ans))}$.`, `${(a < 0) === (b < 0) ? 'Same signs → positive' : 'Different signs → negative'}: $${nl(ans)}$.`];
      } else {
        a = rng.nonzero(-999, 999) / 100; b = rng.nonzero(-999, 999) / 100;
        ans = U.round(op === '+' ? a + b : a - b, 4);
        const bb = op === '+' ? b : -b;
        steps = (op === '-' ? [`Subtract by adding the opposite: $${nl(a)} + ${P(bb)}$.`] : []).concat(decAddSteps(a, bb));
      }
      return { prompt: `What is $${nl(a)} ${op === '×' ? '\\times' : op} ${P(b)}$?`, input: { type: 'number' }, answer: ans, explanation: steps };
    }
    if (t === 'multi') {
      const k = rng.int(0, 2);
      if (k === 0) {
        const d = rng.pick([2, 3, 4, 5, 6]), n = rng.nonzero(-5, 5), m = rng.nonzero(-4, 4) * d, c = rng.nonzero(-12, 12);
        const prod = n * m / d, v = prod - c;
        return { prompt: `Evaluate $${pfl(n, d)} \\times ${P(m)} - ${P(c)}$.`, input: { type: 'number' }, answer: v,
          explanation: [`Multiply first: $${pfl(n, d)} \\times ${P(m)} = ${nl(prod)}$.`, `Then subtract: $${nl(prod)} - ${P(c)} = ${nl(prod)} + ${P(-c)} = ${nl(v)}$.`] };
      }
      if (k === 1) {
        const a = rng.nonzero(-40, 40) / 10, b = rng.nonzero(-9, 9), c = rng.nonzero(-50, 50) / 10;
        const v = U.round(a * b + c, 4);
        return { prompt: `Evaluate $${P(a)}(${nl(b)}) + ${P(c)}$.`, input: { type: 'number' }, answer: v,
          explanation: [`Multiply first: $${P(a)} \\times ${P(b)} = ${nl(U.round(a * b, 4))}$.`, `Then add: $${nl(U.round(a * b, 4))} + ${P(c)} = ${nl(v)}$.`] };
      }
      const d = rng.pick([2, 4, 5]), a = rng.nonzero(-9, 9), b = rng.nonzero(-9, 9), c = rng.nonzero(-3, 3) * d;
      const top = a - b, v = U.round(top / c * d, 4);
      if (top === 0) return genIntegers(rng, level);
      return { prompt: `Evaluate $(${nl(a)} - ${P(b)}) \\div ${pfl(c, d)}$. Give a decimal or integer.`, input: { type: 'number' }, answer: v,
        explanation: [`Parentheses first: $${nl(a)} - ${P(b)} = ${nl(top)}$.`, `Dividing by $${pfl(c, d)}$ means multiplying by $${pfl(d, c)}$.`, `$${P(top)} \\times ${pfl(d, c)} = ${nl(v)}$.`] };
    }
    if (t === 'repeat') {
      const q = rng.pick([3, 6, 9, 11, 12, 15, 8, 4, 5]);
      let p; do { p = rng.int(1, q - 1); } while (U.gcd(p, q) !== 1);
      if (rng.bool()) p += q * rng.int(0, 1);
      const neg = rng.bool(0.7); const sp = neg ? -p : p;
      const corr = decLatex(sp, q);
      const noBar = corr.replace(/\\overline\{(\d+)\}/, '$1');
      const others = [noBar, decLatex(-sp, q), decLatex(sp, q + 1), decLatex(neg ? -q : q, p), decLatex(sp, q + 2)];
      const c = choice(`$${corr}$`, others.map((o) => `$${o}$`), rng);
      return { prompt: `Which decimal is equal to $${fl(sp, q)}$?`, input: { type: 'choice', options: c.options }, answer: c.answer,
        explanation: [`A fraction means division: divide $${p} \\div ${q}$.`, corr.includes('overline') ? `The remainders start repeating, so the digits repeat forever. The bar shows the repeating part: $${corr.replace('-', '')}$.` : `The division ends (terminates): $${corr.replace('-', '')}$.`, `Keep the sign: $${fl(sp, q)} = ${corr}$.`] };
    }
    // context
    const k = rng.int(0, 2);
    if (k === 0) {
      const ch = -rng.int(5, 40) * 0.25, days = rng.int(2, 6), v = U.round(ch * days, 2);
      return { prompt: `A stock's price changed by ${M2(ch)} each day for $${days}$ days in a row. What was the total change in price (in dollars)?`,
        input: { type: 'number', unit: 'dollars' }, answer: v, check: moneyCheck(v),
        explanation: [`Multiply the daily change by the number of days: $${days} \\times (${nl(ch)})$.`, `Positive × negative is negative: $${nl(v)}$ dollars.`] };
    }
    if (k === 1) {
      const start = rng.int(-4, 8), rate = rng.pick([1.5, 2.5, 0.5, 1.25, 3.5]), hrs = rng.pick([2, 3, 4, 6]), v = U.round(start - rate * hrs, 2);
      return { prompt: `At 9 p.m. the temperature was $${start}^{\\circ}\\text{C}$. It fell $${nl(rate)}^{\\circ}$ every hour for $${hrs}$ hours. What was the temperature then (in °C)?`,
        input: { type: 'number', unit: '°C' }, answer: v,
        explanation: [`Total change: $${hrs} \\times (-${nl(rate)}) = ${nl(-rate * hrs)}$.`, `New temperature: $${start} + (${nl(-rate * hrs)}) = ${nl(v)}$.`] };
    }
    const d = rng.pick([2, 4, 8]), n = rng.int(1, d - 1) * (d === 8 ? 1 : 1), times = rng.int(3, 9);
    const s = U.simplify(n, d); if (s.d === 1) return genIntegers(rng, level);
    const total = U.simplify(-s.n * times, s.d);
    return { prompt: `A water tank's level drops $${U.frac(s.n, s.d)}$ inch every hour. What is the change in the water level after $${times}$ hours? Give a fraction or mixed number in simplest form.`,
      input: { type: 'fraction', allowMixed: true, requireSimplest: true }, answer: total,
      explanation: [`A drop is a negative change: $${fl(-s.n, s.d)}$ per hour.`, `$${times} \\times ${pfl(-s.n, s.d)} = ${U.frac(total.n, total.d)} = ${U.mixedLatex(total.n, total.d)}$ inches.`] };
  }
  function decAddSteps(a, b) {
    const s = U.round(a + b, 4);
    if ((a > 0) === (b > 0)) return [`Both are ${a > 0 ? 'positive' : 'negative'}: add the sizes $${nl(Math.abs(a))} + ${nl(Math.abs(b))} = ${nl(Math.abs(s))}$.`, `Keep the sign: $${nl(s)}$.`];
    const big = Math.abs(a) >= Math.abs(b) ? a : b;
    return [`Different signs: subtract the sizes $${nl(Math.max(Math.abs(a), Math.abs(b)))} - ${nl(Math.min(Math.abs(a), Math.abs(b)))} = ${nl(Math.abs(s))}$.`,
      `$${nl(big)}$ has the larger size, so the answer is $${nl(s)}$.`];
  }

  // ======================================================================
  // Skill 2: proportional relationships
  // ======================================================================
  function tableHtml(hx, hy, xs, ys) {
    const th = 'style="border:1.5px solid var(--line);padding:.25em .7em;text-align:center;background:var(--surface-2);font-weight:700"';
    const td = 'style="border:1.5px solid var(--line);padding:.25em .7em;text-align:center;font-variant-numeric:tabular-nums"';
    return `<table style="border-collapse:collapse;margin:.5em 0;font-size:.95em"><tr><th ${th}>${hx}</th>${xs.map((x) => `<td ${td}>${U.fmt(x)}</td>`).join('')}</tr>` +
      `<tr><th ${th}>${hy}</th>${ys.map((y) => `<td ${td}>${U.fmt(y)}</td>`).join('')}</tr></table>`;
  }
  function graphFig(k, xmax, px, xl, yl) {
    const ytarget = k * xmax;
    const ystep = ytarget <= 10 ? 1 : ytarget <= 20 ? 2 : ytarget <= 50 ? 5 : 10;
    const ymax = Math.ceil(ytarget / ystep) * ystep;
    const L = 46, R = 290, T = 14, B = 204;
    const X = (v) => L + v * (R - L) / xmax, Y = (v) => B - v * (B - T) / ymax;
    let s = `<svg viewBox="0 0 300 240" xmlns="http://www.w3.org/2000/svg" ${SVGF}>`;
    for (let i = 0; i <= xmax; i++) s += `<line x1="${X(i)}" y1="${T}" x2="${X(i)}" y2="${B}" stroke="var(--muted)" stroke-width="${i ? 0.5 : 0}" opacity=".5"/>`;
    for (let j = 0; j <= ymax; j += ystep) s += `<line x1="${L}" y1="${Y(j)}" x2="${R}" y2="${Y(j)}" stroke="var(--muted)" stroke-width="0.5" opacity=".5"/>`;
    s += `<line x1="${L}" y1="${B}" x2="${R + 4}" y2="${B}" stroke="var(--ink)" stroke-width="1.8"/><line x1="${L}" y1="${B}" x2="${L}" y2="${T - 4}" stroke="var(--ink)" stroke-width="1.8"/>`;
    const xlab = xmax <= 10 ? 1 : 2;
    for (let i = 0; i <= xmax; i += xlab) s += `<text x="${X(i)}" y="${B + 15}" font-size="11" text-anchor="middle" fill="var(--ink)">${i}</text>`;
    const ylab = (ymax / ystep) > 10 ? ystep * 2 : ystep;
    for (let j = 0; j <= ymax; j += ylab) s += `<text x="${L - 6}" y="${Y(j) + 4}" font-size="11" text-anchor="end" fill="var(--ink)">${j}</text>`;
    const xe = Math.min(xmax, ymax / k);
    s += `<line x1="${X(0)}" y1="${Y(0)}" x2="${X(xe)}" y2="${Y(k * xe)}" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/>`;
    const py = k * px;
    s += `<circle cx="${X(px)}" cy="${Y(py)}" r="5" fill="var(--accent-2)" stroke="var(--surface)" stroke-width="1.5"/>`;
    const right = X(px) < 200;
    s += `<text x="${X(px) + (right ? 9 : -9)}" y="${Y(py) + (right ? 14 : -8)}" font-size="13" font-weight="700" text-anchor="${right ? 'start' : 'end'}" fill="var(--ink)" paint-order="stroke" stroke="var(--surface)" stroke-width="3">(${U.fmt(px)}, ${U.fmt(py)})</text>`;
    s += `<text x="${(L + R) / 2}" y="${B + 32}" font-size="12" text-anchor="middle" fill="var(--muted)">${xl}</text>`;
    s += `<text x="12" y="${(T + B) / 2}" font-size="12" text-anchor="middle" fill="var(--muted)" transform="rotate(-90 12 ${(T + B) / 2})">${yl}</text>`;
    return s + '</svg>';
  }
  const RATE_CTX = [
    { x: 'Hours worked', y: 'Dollars earned', xu: 'hour', yu: 'dollars', q: 'dollars per hour' },
    { x: 'Minutes', y: 'Gallons filled', xu: 'minute', yu: 'gallons', q: 'gallons per minute' },
    { x: 'Tickets', y: 'Cost (dollars)', xu: 'ticket', yu: 'dollars', q: 'dollars per ticket' },
    { x: 'Hours', y: 'Miles biked', xu: 'hour', yu: 'miles', q: 'miles per hour' },
    { x: 'Cups of flour', y: 'Cookies', xu: 'cup of flour', yu: 'cookies', q: 'cookies per cup' }
  ];
  const KS = [0.5, 1.5, 2, 2.5, 3, 4, 5, 0.75, 1.25, 6, 3.5, 8];
  function genProportions(rng, level) {
    if (level === 1) {
      const t = rng.pick(['price', 'price', 'speed', 'speed', 'better', 'scale']);
      if (t === 'price') {
        const it = rng.pick([['notebook', 'notebooks'], ['granola bar', 'granola bars'], ['bottle of water', 'bottles of water'], ['movie ticket', 'movie tickets'], ['pack of gum', 'packs of gum'], ['pound of apples', 'pounds of apples']]);
        const n = rng.int(2, 12), u = rng.int(5, 120) * 5 / 100, tot = U.round(u * n, 2);
        return { prompt: `${it[1].charAt(0).toUpperCase() + it[1].slice(1)} cost ${M2(tot)} for $${n}$. What is the price per ${it[0]}?`,
          input: { type: 'number', unit: 'dollars' }, answer: u, check: moneyCheck(u),
          explanation: [`A unit rate is the amount for $1$. Divide the cost by the number of ${it[1]}.`, `$${nl(tot)} \\div ${n} = ${nl(u)}$, so each costs ${M2(u)}.`] };
      }
      if (t === 'speed') {
        const c = rng.pick([['A car', 'miles', 'hours', 'miles per hour', 30, 70], ['A cyclist', 'kilometers', 'hours', 'kilometers per hour', 8, 24], ['A train', 'miles', 'hours', 'miles per hour', 40, 90], ['Selam', 'words', 'minutes', 'words per minute', 25, 60], ['A printer', 'pages', 'minutes', 'pages per minute', 8, 30]]);
        const tm = rng.int(2, 8), r = rng.int(c[4], c[5]), d = r * tm;
        return { prompt: `${c[0]} ${c[1] === 'words' ? 'types' : c[1] === 'pages' ? 'prints' : 'travels'} $${nl(d)}$ ${c[1]} in $${tm}$ ${c[2]} at a steady rate. What is the rate in ${c[3]}?`,
          input: { type: 'number', unit: c[3] }, answer: r,
          explanation: [`Unit rate = total ÷ time.`, `$${nl(d)} \\div ${tm} = ${r}$ ${c[3]}.`] };
      }
      if (t === 'better') {
        const it = rng.pick(['yogurt cups', 'juice boxes', 'pencils', 'cans of soup', 'tennis balls']);
        let n1, n2, u1, u2;
        do { n1 = rng.int(3, 12); n2 = rng.int(3, 12); u1 = rng.int(20, 150) * 2 / 100; u2 = rng.int(20, 150) * 2 / 100; } while (n1 === n2 || Math.abs(u1 - u2) < 0.05);
        const t1 = U.round(n1 * u1, 2), t2 = U.round(n2 * u2, 2);
        const opts = [`Pack A: $${n1}$ for ${M2(t1)}`, `Pack B: $${n2}$ for ${M2(t2)}`, 'They are the same deal'];
        return { prompt: `Which pack of ${it} is the better buy (lower price per item)?`, input: { type: 'choice', options: opts }, answer: u1 < u2 ? 0 : 1,
          explanation: [`Pack A: $${nl(t1)} \\div ${n1} = ${nl(u1)}$ dollars each.`, `Pack B: $${nl(t2)} \\div ${n2} = ${nl(u2)}$ dollars each.`, `Pack ${u1 < u2 ? 'A' : 'B'} costs less per item, so it is the better buy.`] };
      }
      const it = rng.pick([['pizzas', 'pizza'], ['bags of mulch', 'bag'], ['shirts', 'shirt'], ['plants', 'plant']]);
      const u = rng.int(6, 40) / 2, a = rng.int(2, 6); let b; do { b = rng.int(2, 12); } while (b === a);
      const ta = U.round(u * a, 2), tb = U.round(u * b, 2);
      return { prompt: `If $${a}$ ${it[0]} cost ${M2(ta)}, how much do $${b}$ ${it[0]} cost at the same price each?`,
        input: { type: 'number', unit: 'dollars' }, answer: tb, check: moneyCheck(tb),
        explanation: [`Find the unit price: $${nl(ta)} \\div ${a} = ${nl(u)}$ dollars per ${it[1]}.`, `Multiply: $${b} \\times ${nl(u)} = ${nl(tb)}$, so they cost ${M2(tb)}.`] };
    }
    if (level === 2) {
      const t = rng.pick(['tableK', 'tableK', 'isProp', 'isProp', 'eqUse', 'eqPick']);
      const c = rng.pick(RATE_CTX), k = rng.pick(KS);
      const mk = () => { const step = k % 1 === 0 ? 1 : k * 4 % 1 === 0 && k * 2 % 1 !== 0 ? 4 : 2; const xs = rng.sample([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => v * step).filter((v) => v <= 24), 4).sort((p, q) => p - q); return xs; };
      if (t === 'tableK') {
        const xs = mk(), ys = xs.map((x) => U.round(k * x, 4));
        return { prompt: `The table shows a proportional relationship. What is the constant of proportionality $k$ in $y = kx$ (${c.q})?` + tableHtml(c.x + ' (x)', c.y + ' (y)', xs, ys),
          input: { type: 'number' }, answer: k,
          explanation: [`In a proportional relationship, $k = \\frac{y}{x}$ for every pair.`, `Use one pair: $\\frac{${nl(ys[0])}}{${xs[0]}} = ${nl(k)}$.`, `Check another: $\\frac{${nl(ys[2])}}{${xs[2]}} = ${nl(k)}$ ✓ So $k = ${nl(k)}$.`] };
      }
      if (t === 'isProp') {
        const xs = mk(); let ys = xs.map((x) => U.round(k * x, 4));
        const prop = rng.bool();
        let how = '';
        if (!prop) {
          if (rng.bool()) { const b = rng.pick([1, 2, 3, 5]); ys = ys.map((y) => y + b); how = 'add'; }
          else { const i = rng.int(1, 3); ys[i] = ys[i] + rng.pick([1, 2, -1]); how = 'one'; }
        }
        const kk = U.simplify(Math.round(ys[0] * 100), xs[0] * 100);
        const kTex = U.frac(kk.n, kk.d);
        const opts = choice(prop ? `Yes, $k = ${kTex}$` : 'No, it is not proportional', [prop ? 'No, it is not proportional' : `Yes, $k = ${kTex}$`, `Yes, $k = ${U.frac(kk.d, kk.n)}$`, `Yes, $k = ${nl(ys[ys.length - 1] - ys[0])}$`], rng);
        const ratios = xs.map((x, i) => `\\frac{${nl(ys[i])}}{${x}}${Number.isInteger(U.round(ys[i] / x, 4) * 1000) ? '=' + nl(U.round(ys[i] / x, 3)) : '\\approx' + nl(U.round(ys[i] / x, 2))}`);
        return { prompt: `Is the relationship in the table proportional? If so, what is $k$?` + tableHtml('x', 'y', xs, ys),
          input: { type: 'choice', options: opts.options }, answer: opts.answer,
          explanation: [`Find $\\frac{y}{x}$ for each column.`, `$${ratios.join(',\\;')}$`, prop ? `All the ratios are equal, so it is proportional with $k = ${kTex}$.` : `The ratios are not all equal, so it is not proportional.`] };
      }
      if (t === 'eqUse') {
        const x = rng.int(2, 15), y = U.round(k * x, 4);
        const ctx = rng.pick([['pounds of apples', 'cost in dollars', 'pound'], ['hours', 'miles walked', 'hour'], ['gallons of gas', 'cost in dollars', 'gallon'], ['minutes', 'pages read', 'minute']]);
        const askK = rng.bool(0.35);
        if (askK) {
          return { prompt: `The equation $y = ${nl(k)}x$ gives the ${ctx[1]} $y$ for $x$ ${ctx[0]}. What is the ${ctx[1]} for just $1$ ${ctx[2]}? (This is the constant of proportionality.)`,
            input: { type: 'number' }, answer: k,
            explanation: [`In $y = kx$, the number multiplying $x$ is $k$.`, `When $x = 1$, $y = ${nl(k)} \\times 1 = ${nl(k)}$.`] };
        }
        return { prompt: `The equation $y = ${nl(k)}x$ gives the ${ctx[1]} $y$ for $x$ ${ctx[0]}. Find $y$ when $x = ${x}$.`,
          input: { type: 'number' }, answer: y,
          explanation: [`Substitute $x = ${x}$: $y = ${nl(k)} \\times ${x}$.`, `$y = ${nl(y)}$.`] };
      }
      // eqPick
      const xs = mk(), ys = xs.map((x) => U.round(k * x, 4));
      const d = U.round(ys[0] - xs[0], 4);
      const inv = U.simplify(100, Math.round(k * 100));
      const opts = choice(`$y = ${nl(k)}x$`, [`$y = ${U.frac(inv.n, inv.d)}x$`, d ? `$y = x ${d > 0 ? '+' : '-'} ${nl(Math.abs(d))}$` : `$y = ${nl(k)} + x$`, `$y = ${nl(k)}x + ${nl(xs[0])}$`, `$y = x + ${nl(k)}$`], rng);
      return { prompt: `Which equation represents the relationship in the table?` + tableHtml('x', 'y', xs, ys),
        input: { type: 'choice', options: opts.options }, answer: opts.answer,
        explanation: [`Check the ratio $\\frac{y}{x}$: $\\frac{${nl(ys[0])}}{${xs[0]}} = ${nl(k)}$ and $\\frac{${nl(ys[1])}}{${xs[1]}} = ${nl(k)}$.`, `The ratio is constant, so $y = kx$ with $k = ${nl(k)}$: $y = ${nl(k)}x$.`] };
    }
    // level 3
    const t = rng.pick(['graph', 'graph', 'graphMean', 'solve', 'solve', 'complex', 'complex']);
    if (t === 'graph' || t === 'graphMean') {
      const c = rng.pick(RATE_CTX.slice(0, 4)), k = rng.pick([0.5, 1.5, 2, 2.5, 3, 4, 5, 0.75, 1.25, 6]);
      const xmax = rng.pick([8, 10]);
      const step = k * 4 % 2 === 1 ? 4 : k * 2 % 2 === 1 ? 2 : 1;
      const opts = []; for (let v = step; v < xmax; v += step) opts.push(v);
      const px = rng.pick(opts.length > 1 ? opts.slice(1) : opts);
      const fig = graphFig(k, xmax, px, c.x, c.y);
      if (t === 'graph') {
        return { prompt: `The graph shows a proportional relationship. What is the constant of proportionality (${c.q})?`, figure: fig,
          input: { type: 'number' }, answer: k,
          explanation: [`The line goes through the origin, so $y = kx$.`, `Use the labeled point: $k = \\frac{y}{x} = \\frac{${nl(k * px)}}{${px}}$.`, `$k = ${nl(k)}$ ${c.q}.`] };
      }
      const c2 = choice(`Point $(1, ${nl(k)})$: ${U.fmt(k)} ${c.yu} for 1 ${c.xu}`, [`Point $(${nl(k)}, 1)$: 1 ${c.yu.replace(/s$/, '')} for ${U.fmt(k)} ${c.xu}s`, `Point $(0, 0)$: ${U.fmt(k)} ${c.yu} for 0 ${c.xu}s`, `Point $(${px}, ${nl(k * px)})$: ${U.fmt(k)} ${c.yu} for ${px} ${c.xu}s`], rng);
      return { prompt: `Which point on this graph shows the unit rate, and what does it mean?`, figure: fig,
        input: { type: 'choice', options: c2.options }, answer: c2.answer,
        explanation: [`The unit rate is the $y$-value when $x = 1$.`, `$k = \\frac{${nl(k * px)}}{${px}} = ${nl(k)}$, so the point is $(1, ${nl(k)})$.`, `It means ${U.fmt(k)} ${c.yu} for each ${c.xu}.`] };
    }
    if (t === 'solve') {
      if (rng.bool()) {
        let a, b, c2, x;
        do { a = rng.int(2, 15); c2 = rng.int(2, 12); b = rng.int(1, 20); x = a * b / c2; } while (!Number.isInteger(x * 2) || U.gcd(b, c2) !== 1 || a === c2);
        return { prompt: `Solve the proportion: $\\dfrac{x}{${a}} = \\dfrac{${b}}{${c2}}$`, input: { type: 'number' }, answer: x,
          explanation: [`Multiply both sides by $${a}$: $x = \\frac{${b} \\times ${a}}{${c2}}$.`, `$x = \\frac{${a * b}}{${c2}} = ${nl(x)}$.`] };
      }
      const sc = rng.pick([['cm', 'km', 'map'], ['inches', 'miles', 'map'], ['cups of rice', 'servings', 'recipe'], ['gallons of paint', 'square meters', 'paint can']]);
      const a = rng.int(1, 5), b = rng.int(2, 12) * 5, m = rng.int(2, 9) + (rng.bool(0.4) ? 0.5 : 0), ans = U.round(b * m / a, 4);
      if (m === a) return genProportions(rng, level);
      return { prompt: `On a ${sc[2]}, $${a}$ ${sc[0]} correspond${a === 1 ? 's' : ''} to $${b}$ ${sc[1]}. How many ${sc[1]} correspond to $${nl(m)}$ ${sc[0]}?`,
        input: { type: 'number', unit: sc[1] }, answer: ans,
        explanation: [`Set up a proportion: $\\frac{${a}}{${b}} = \\frac{${nl(m)}}{x}$.`, `Cross-multiply: $${a}x = ${b} \\times ${nl(m)} = ${nl(b * m)}$.`, `Divide by $${a}$: $x = ${nl(ans)}$ ${sc[1]}.`] };
    }
    // complex fractions
    const ctx = rng.pick([['walks', 'mile', 'miles', 'hour', 'miles per hour'], ['paints', 'wall', 'walls', 'hour', 'walls per hour'], ['mows', 'lawn', 'lawns', 'hour', 'lawns per hour'], ['uses', 'cup of sugar', 'cups of sugar', 'batch', 'cups per batch']]);
    const D = [2, 3, 4, 5, 6, 8];
    let a = rng.int(1, 5), b = rng.pick(D), c2 = rng.int(1, 5), d = rng.pick(D);
    const A = U.simplify(a, b), C = U.simplify(c2, d);
    if (A.d === 1 && C.d === 1) return genProportions(rng, level);
    if (A.n * C.d === C.n * A.d) return genProportions(rng, level);
    const r = U.simplify(A.n * C.d, A.d * C.n);
    const n = U.name(rng);
    const prompt = ctx[0] === 'uses'
      ? `A recipe uses $${U.frac(A.n, A.d)}$ ${A.n <= A.d ? ctx[1] : ctx[2]} for $${U.frac(C.n, C.d)}$ of a ${ctx[3]}. How many ${ctx[4]}?`
      : `${n} ${ctx[0]} $${U.frac(A.n, A.d)}$ ${A.n > A.d ? ctx[2] : ctx[1]} in $${U.frac(C.n, C.d)}$ ${C.n > C.d ? ctx[3] + 's' : ctx[3]}. At this rate, how many ${ctx[4]}?`;
    const expl = [`Unit rate = amount ÷ time: $\\dfrac{${U.frac(A.n, A.d)}}{${U.frac(C.n, C.d)}}$.`, `Multiply by the reciprocal: $${U.frac(A.n, A.d)} \\times ${U.frac(C.d, C.n)} = ${U.frac(A.n * C.d, A.d * C.n)}$.`, `Simplified: $${U.mixedLatex(r.n, r.d)}$ ${ctx[4]}.`];
    if (r.d === 1) return { prompt, input: { type: 'number', unit: ctx[4] }, answer: r.n, explanation: expl };
    return { prompt: prompt + ' Give a fraction or mixed number in simplest form.', input: { type: 'fraction', allowMixed: true, requireSimplest: true }, answer: r, explanation: expl };
  }

  // ======================================================================
  // Skill 3: percent
  // ======================================================================
  function genPercent(rng, level) {
    if (level === 1) {
      const t = rng.pick(['of', 'of', 'disc', 'disc', 'what', 'equiv']);
      if (t === 'of') {
        const p = rng.pick([10, 20, 25, 50, 75, 5, 15, 30, 40, 60, 80, 90]), n = 20 * rng.int(1, 15), v = p * n / 100;
        const ctx = rng.pick([`What is $${p}\\%$ of $${nl(n)}$?`, `There are $${nl(n)}$ students at a school and $${p}\\%$ of them walk to school. How many students walk?`, `A playlist has $${nl(n)}$ songs. $${p}\\%$ are pop songs. How many pop songs are there?`, `A video game level has $${nl(n)}$ coins. Kai collected $${p}\\%$ of them. How many coins did Kai collect?`]);
        return { prompt: ctx, input: { type: 'number' }, answer: v,
          explanation: [`Write the percent as a decimal: $${p}\\% = ${nl(p / 100)}$.`, `Multiply: $${nl(p / 100)} \\times ${nl(n)} = ${nl(v)}$.`] };
      }
      if (t === 'disc') {
        const p = rng.pick([10, 20, 25, 30, 40, 50, 15]), price = 4 * rng.int(3, 30);
        const off = U.round(price * p / 100, 2), sale = U.round(price - off, 2);
        const item = rng.pick(['pair of sneakers', 'backpack', 'skateboard', 'video game', 'hoodie', 'basketball']);
        const askSale = rng.bool();
        return { prompt: `A ${item} costs ${M(price)}. It is on sale for $${p}\\%$ off. ${askSale ? 'What is the sale price?' : 'How much money do you save?'}`,
          input: { type: 'number', unit: 'dollars' }, answer: askSale ? sale : off, check: moneyCheck(askSale ? sale : off),
          explanation: [`Discount: $${p}\\%$ of $${price}$ is $${nl(p / 100)} \\times ${price} = ${nl(off)}$.`].concat(askSale ? [`Sale price: $${price} - ${nl(off)} = ${nl(sale)}$, so it costs ${M2(sale)}.`] : [`You save ${M2(off)}.`]) };
      }
      if (t === 'what') {
        const whole = rng.pick([20, 25, 40, 50, 80, 200, 10, 60]); let part;
        const ps = [5, 10, 15, 20, 25, 30, 40, 45, 50, 60, 75, 80, 90].filter((p) => whole * p % 100 === 0);
        const p = rng.pick(ps); part = whole * p / 100;
        const n = U.name(rng);
        return { prompt: rng.bool() ? `${n} got $${part}$ out of $${whole}$ questions right on a quiz. What percent is that?` : `$${part}$ is what percent of $${whole}$?`,
          input: { type: 'number', unit: '%' }, answer: p,
          explanation: [`Write a fraction: $\\frac{${part}}{${whole}}$.`, `Make the denominator 100 (or divide): $\\frac{${part}}{${whole}} = ${nl(p / 100)} = \\frac{${p}}{100}$.`, `That is $${p}\\%$.`] };
      }
      const p = rng.pick([3, 7, 12, 35, 45, 60, 8, 125, 150, 2, 64, 99]);
      const c = choice(`$${nl(p / 100)}$`, [`$${nl(p / 10)}$`, `$${nl(p / 1000)}$`, `$${nl(p)}$`, `$${nl(p / 100 + 1)}$`], rng);
      return { prompt: `Which decimal is equal to $${p}\\%$?`, input: { type: 'choice', options: c.options }, answer: c.answer,
        explanation: [`"Percent" means "per hundred", so $${p}\\% = \\frac{${p}}{100}$.`, `Dividing by 100 moves the decimal point two places left: $${nl(p / 100)}$.`] };
    }
    if (level === 2) {
      const t = rng.pick(['tax', 'tip', 'markup', 'findPct', 'findPct', 'discTax', 'deal']);
      if (t === 'deal') return percentDeal(rng);
      if (t === 'tax') {
        const price = rng.int(500, 9999) / 100, r = rng.pick([5, 6, 6.25, 7, 8, 4.5]);
        const tax = price * r / 100, tot = price + tax;
        const askTax = rng.bool(0.35);
        const exact = askTax ? tax : tot;
        return { prompt: `A pair of headphones costs ${M2(price)}. The sales tax is $${nl(r)}\\%$. ${askTax ? 'How much is the tax?' : 'What is the total cost with tax?'} Round to the nearest cent.`,
          input: { type: 'number', unit: 'dollars' }, answer: U.round(exact, 2), check: moneyCheck(exact),
          explanation: [`Tax: $${nl(r / 100)} \\times ${nl(price)} = ${nl(U.round(tax, 4))} \\approx ${U.round(tax, 2).toFixed(2)}$.`].concat(askTax ? [`The tax is about ${M2(U.round(tax, 2))}.`] : [`Total: $${nl(price)} + ${U.round(tax, 2).toFixed(2)} = ${U.round(tot, 2).toFixed(2)}$.`, `Shortcut: $${nl(1 + r / 100)} \\times ${nl(price)} \\approx ${U.round(tot, 2).toFixed(2)}$.`]) };
      }
      if (t === 'tip') {
        const meal = rng.int(1200, 8500) / 100, r = rng.pick([15, 18, 20, 25]);
        const tip = meal * r / 100, tot = meal + tip, askTip = rng.bool();
        const exact = askTip ? tip : tot;
        return { prompt: `A family's dinner bill is ${M2(meal)}. They leave a $${r}\\%$ tip. ${askTip ? 'How much is the tip?' : 'What is the total, including the tip?'} Round to the nearest cent.`,
          input: { type: 'number', unit: 'dollars' }, answer: U.round(exact, 2), check: moneyCheck(exact),
          explanation: [`Tip: $${nl(r / 100)} \\times ${nl(meal)} = ${nl(U.round(tip, 4))} \\approx ${U.round(tip, 2).toFixed(2)}$.`].concat(askTip ? [`The tip is ${M2(U.round(tip, 2))}.`] : [`Total: $${nl(meal)} + ${U.round(tip, 2).toFixed(2)} = ${U.round(tot, 2).toFixed(2)}$.`]) };
      }
      if (t === 'markup') {
        const cost = rng.int(4, 60), m = rng.pick([20, 25, 30, 40, 50, 60, 75, 100]);
        const sell = U.round(cost * (1 + m / 100), 2);
        return { prompt: `A store buys a T-shirt for ${M(cost)} and marks the price up by $${m}\\%$. What is the selling price?`,
          input: { type: 'number', unit: 'dollars' }, answer: sell, check: moneyCheck(sell),
          explanation: [`Markup: $${nl(m / 100)} \\times ${cost} = ${nl(U.round(cost * m / 100, 2))}$.`, `Selling price: $${cost} + ${nl(U.round(cost * m / 100, 2))} = ${nl(sell)}$, so ${M2(sell)}.`] };
      }
      if (t === 'findPct') {
        const orig = 20 * rng.int(2, 15), p = rng.pick([5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 75]);
        const down = rng.bool(0.6);
        const nw = down ? orig * (1 - p / 100) : orig * (1 + p / 100);
        const diff = Math.abs(nw - orig);
        return { prompt: down ? `A bike that cost ${M(orig)} is now on sale for ${M(nw)}. What percent is the discount?` : `A store raised the price of a scooter from ${M(orig)} to ${M(nw)}. By what percent did the price go up?`,
          input: { type: 'number', unit: '%' }, answer: p,
          explanation: [`Amount of change: $${nl(Math.max(orig, nw))} - ${nl(Math.min(orig, nw))} = ${nl(diff)}$.`, `Compare it to the original price: $\\frac{${nl(diff)}}{${nl(orig)}} = ${nl(p / 100)}$.`, `That is $${p}\\%$.`] };
      }
      const price = 10 * rng.int(2, 12), d = rng.pick([10, 20, 25, 30, 40]), r = rng.pick([5, 6, 6.25, 8]);
      const sale = price * (1 - d / 100), tot = sale * (1 + r / 100);
      return { prompt: `A jacket costs ${M(price)}. It is $${d}\\%$ off, and then $${nl(r)}\\%$ sales tax is added to the sale price. What is the final cost? Round to the nearest cent.`,
        input: { type: 'number', unit: 'dollars' }, answer: U.round(tot, 2), check: moneyCheck(tot),
        explanation: [`Sale price: $${price} \\times ${nl(1 - d / 100)} = ${nl(sale)}$.`, `Add tax: $${nl(sale)} \\times ${nl(1 + r / 100)} = ${nl(U.round(tot, 4))}$.`, `Rounded: ${M2(U.round(tot, 2))}.`] };
    }
    // level 3
    const t = rng.pick(['change', 'change', 'error', 'interest', 'interest', 'reverse', 'reverse', 'expr']);
    if (t === 'change') {
      const old = rng.pick([20, 25, 40, 50, 80, 200, 250, 400, 120, 160]);
      const ps = [5, 10, 15, 20, 25, 30, 40, 45, 50, 60, 75, 12.5, 150].filter((p) => old * p % 100 === 0);
      const p = rng.pick(ps), up = rng.bool();
      const nw = up ? old * (1 + p / 100) : old * (1 - p / 100);
      if (nw <= 0) return genPercent(rng, level);
      const ctx = rng.pick([['A town\'s population of deer', 'deer'], ['The number of members in a chess club', 'members'], ['A YouTube channel\'s daily views', 'views'], ['The number of books in the class library', 'books']]);
      return { prompt: `${ctx[0]} went from $${nl(old)}$ to $${nl(nw)}$. What is the percent ${up ? 'increase' : 'decrease'}?`,
        input: { type: 'number', unit: '%' }, answer: p,
        explanation: [`Change: $${nl(Math.max(old, nw))} - ${nl(Math.min(old, nw))} = ${nl(Math.abs(nw - old))}$.`, `Divide by the ORIGINAL amount: $\\frac{${nl(Math.abs(nw - old))}}{${nl(old)}} = ${nl(p / 100)}$.`, `Percent ${up ? 'increase' : 'decrease'}: $${nl(p)}\\%$.`] };
    }
    if (t === 'error') {
      const ctx = rng.pick([['jelly beans in a jar', '', 150, 600], ['the length of the classroom in feet', 'ft', 20, 45], ['the number of people at a game', '', 300, 900], ['the weight of a pumpkin in pounds', 'lb', 8, 40]]);
      const actual = rng.int(ctx[2], ctx[3]); let est; do { est = actual + rng.nonzero(-Math.ceil(actual * 0.3), Math.ceil(actual * 0.3)); } while (est <= 0 || est === actual);
      const err = Math.abs(est - actual) / actual * 100;
      const n = U.name(rng);
      return { prompt: `${n} estimated ${ctx[0]} to be $${nl(est)}$. The actual value was $${nl(actual)}$. What is the percent error? Round to the nearest tenth of a percent.`,
        input: { type: 'number', unit: '%' }, answer: U.round(err, 1), check: tenthCheck(err),
        explanation: [`Percent error $= \\dfrac{|\\text{estimate} - \\text{actual}|}{\\text{actual}} \\times 100\\%$.`, `$|${est} - ${actual}| = ${Math.abs(est - actual)}$.`, `$\\frac{${Math.abs(est - actual)}}{${actual}} \\times 100\\% \\approx ${nl(U.round(err, 1))}\\%$.`] };
    }
    if (t === 'interest') {
      const P0 = 100 * rng.int(2, 50), r = rng.pick([2, 2.5, 3, 3.5, 4, 4.5, 5, 6]), yrs = rng.int(1, 6);
      const I = U.round(P0 * r / 100 * yrs, 2), askTot = rng.bool(0.4);
      const v = askTot ? U.round(P0 + I, 2) : I;
      return { prompt: `You deposit ${M(P0)} in a savings account that earns $${nl(r)}\\%$ simple interest per year. ${askTot ? `What is the total in the account after $${yrs}$ years?` : `How much interest do you earn in $${yrs}$ year${yrs > 1 ? 's' : ''}?`}`,
        input: { type: 'number', unit: 'dollars' }, answer: v, check: moneyCheck(v),
        explanation: [`Simple interest: $I = Prt$.`, `$I = ${P0} \\times ${nl(r / 100)} \\times ${yrs} = ${nl(I)}$.`].concat(askTot ? [`Total: $${P0} + ${nl(I)} = ${nl(P0 + I)}$.`] : []) };
    }
    if (t === 'reverse') {
      if (rng.bool(0.65)) {
        const p = rng.pick([10, 15, 20, 25, 30, 40, 50]), orig = 20 * rng.int(2, 12), sale = orig * (1 - p / 100);
        return { prompt: `After a $${p}\\%$ discount, a pair of sneakers costs ${M(sale)}. What was the original price?`,
          input: { type: 'number', unit: 'dollars' }, answer: orig, check: moneyCheck(orig),
          explanation: [`After $${p}\\%$ off you pay $${100 - p}\\%$ of the original: $${nl(1 - p / 100)}x = ${nl(sale)}$.`, `Divide: $x = ${nl(sale)} \\div ${nl(1 - p / 100)} = ${orig}$.`, `Check: $${p}\\%$ of $${orig}$ is $${nl(orig * p / 100)}$, and $${orig} - ${nl(orig * p / 100)} = ${nl(sale)}$ ✓`] };
      }
      const r = rng.pick([4, 5, 6, 8, 10]), orig = 25 * rng.int(1, 12), tot = U.round(orig * (1 + r / 100), 2);
      return { prompt: `The total cost of a tablet case, including $${r}\\%$ sales tax, is ${M2(tot)}. What was the price before tax?`,
        input: { type: 'number', unit: 'dollars' }, answer: orig, check: moneyCheck(orig),
        explanation: [`Total $= 100\\% + ${r}\\% = ${100 + r}\\%$ of the price: $${nl(1 + r / 100)}x = ${nl(tot)}$.`, `$x = ${nl(tot)} \\div ${nl(1 + r / 100)} = ${orig}$.`] };
    }
    const p = rng.pick([5, 8, 12, 15, 20, 25, 30, 35, 40, 60]), up = rng.bool();
    const c = choice(`$${nl(up ? 1 + p / 100 : 1 - p / 100)}p$`, [`$${nl(p / 100)}p$`, `$p ${up ? '+' : '-'} ${nl(p / 100)}$`, `$${nl(up ? 1 - p / 100 : 1 + p / 100)}p$`, `$${nl(p)}p$`], rng);
    return { prompt: `Which expression gives the new price after a $${p}\\%$ ${up ? 'increase' : 'decrease'} of an original price $p$?`, input: { type: 'choice', options: c.options }, answer: c.answer,
      explanation: [`${up ? 'An increase adds' : 'A decrease subtracts'} $${p}\\%$ of $p$: $p ${up ? '+' : '-'} ${nl(p / 100)}p$.`, `Combine like terms: $(1 ${up ? '+' : '-'} ${nl(p / 100)})p = ${nl(up ? 1 + p / 100 : 1 - p / 100)}p$.`] };
  }

  function percentDeal(rng) {
    const price = 10 * rng.int(3, 15);
    let d1, d2; do { d1 = rng.pick([10, 15, 20, 25, 30, 40]); d2 = 5 * rng.int(1, Math.floor(price * 0.45 / 5)); } while (Math.abs(price * d1 / 100 - d2) < 0.01);
    const s1 = price * d1 / 100;
    const store = rng.pick([['Store A', 'Store B'], ['Sport Zone', 'Kick It'], ['the mall', 'the website']]);
    const opts = [`${store[0]}: $${d1}\\%$ off`, `${store[1]}: ${M(d2)} off`];
    return { prompt: `A pair of soccer cleats costs ${M(price)} at two stores. ${store[0]} has a $${d1}\\%$-off sale. ${store[1]} gives ${M(d2)} off. Which is the better deal?`,
      input: { type: 'choice', options: opts }, answer: s1 > d2 ? 0 : 1,
      explanation: [`$${d1}\\%$ of $${price}$ is $${nl(d1 / 100)} \\times ${price} = ${nl(s1)}$, so ${store[0]} saves ${M2(s1)}.`, `${store[1]} saves ${M2(d2)}.`, `${s1 > d2 ? store[0] : store[1]} saves more money, so it is the better deal.`] };
  }

  // ======================================================================
  // Skill 4: equations & inequalities
  // ======================================================================
  const REL = { '>': '>', '<': '<', '>=': '\\ge', '<=': '\\le' };
  const FLIP = { '>': '<', '<': '>', '>=': '<=', '<=': '>=' };
  function nlOpt(a, rel) {
    const right = rel === '>' || rel === '>=', closed = rel.length === 2;
    const X = (v) => 15 + (v - (a - 2)) * 25;
    let s = `<svg viewBox="0 0 130 52" style="width:100px;max-width:100%;height:auto;display:block" xmlns="http://www.w3.org/2000/svg" ${SVGF}>`;
    s += `<line x1="5" y1="18" x2="125" y2="18" stroke="var(--ink)" stroke-width="1.8"/><path d="M1 18 l8 -5 v10 z M129 18 l-8 -5 v10 z" fill="var(--ink)"/>`;
    for (let v = a - 2; v <= a + 2; v++) {
      s += `<line x1="${X(v)}" y1="12" x2="${X(v)}" y2="24" stroke="var(--ink)" stroke-width="1.3"/>`;
      s += `<text x="${X(v)}" y="45" font-size="15" text-anchor="middle" fill="var(--ink)" ${v === a ? 'font-weight="700"' : ''}>${v < 0 ? '−' + (-v) : v}</text>`;
    }
    s += `<line x1="${X(a)}" y1="18" x2="${right ? 118 : 12}" y2="18" stroke="var(--accent)" stroke-width="5"/>`;
    s += right ? `<path d="M130 18 l-12 -7.5 v15 z" fill="var(--accent)"/>` : `<path d="M1 18 l12 -7.5 v15 z" fill="var(--accent)"/>`;
    s += `<circle cx="${X(a)}" cy="18" r="6.5" fill="${closed ? 'var(--accent)' : 'var(--surface)'}" stroke="var(--accent)" stroke-width="3"/>`;
    return s + '</svg>';
  }
  function genEquations(rng, level) {
    const v = rng.pick(VARS);
    if (level === 1) {
      const t = rng.pick(['solve', 'solve', 'divForm', 'first', 'word', 'word', 'check']);
      const p = rng.int(2, 9), x = rng.int(1, 12), q = rng.int(1, 20);
      if (t === 'solve') {
        const minus = rng.bool(0.3) && p * x > q;
        const r = minus ? p * x - q : p * x + q;
        return { prompt: `Solve for $${v}$: $${lin(p, minus ? -q : q, v)} = ${r}$`, input: { type: 'number' }, answer: x,
          explanation: [`${minus ? 'Add' : 'Subtract'} $${q}$ ${minus ? 'to' : 'from'} both sides: $${p}${v} = ${p * x}$.`, `Divide both sides by $${p}$: $${v} = ${x}$.`, `Check: $${p}(${x}) ${minus ? '-' : '+'} ${q} = ${r}$ ✓`] };
      }
      if (t === 'divForm') {
        const k = rng.int(1, 9), xx = p * k, r = k + q;
        return { prompt: `Solve for $${v}$: $\\dfrac{${v}}{${p}} + ${q} = ${r}$`, input: { type: 'number' }, answer: xx,
          explanation: [`Subtract $${q}$ from both sides: $\\frac{${v}}{${p}} = ${k}$.`, `Multiply both sides by $${p}$: $${v} = ${xx}$.`] };
      }
      if (t === 'first') {
        const minus = rng.bool();
        const r = minus ? p * x + 30 - q : p * x + q;
        const opts = [minus ? `Add $${q}$ to both sides` : `Subtract $${q}$ from both sides`, `Divide both sides by $${q}$`, minus ? `Subtract $${q}$ from both sides` : `Add $${q}$ to both sides`, `Subtract $${p}$ from both sides`];
        const c = choice(opts[0], opts.slice(1), rng);
        return { prompt: `What is a good first step to solve $${lin(p, minus ? -q : q, v)} = ${r}$?`, input: { type: 'choice', options: c.options }, answer: c.answer,
          explanation: [`To get $${v}$ alone, undo the operations in reverse order: first undo the ${minus ? 'subtraction' : 'addition'}, then the multiplication.`, `So first ${minus ? `add $${q}$ to` : `subtract $${q}$ from`} both sides, then divide by $${p}$.`] };
      }
      if (t === 'word') {
        const n = U.name(rng); const k = rng.int(0, 2); const r = p * x + q;
        const W = [
          [`${n} has ${M(q)} and saves ${M(p)} each week. After how many weeks will ${n} have ${M(r)}?`, 'weeks', `${p}w + ${q} = ${r}`, 'w'],
          [`A trampoline park charges a ${M(q)} entry fee plus ${M(p)} per hour. ${n} paid ${M(r)}. How many hours did ${n} jump?`, 'hours', `${p}h + ${q} = ${r}`, 'h'],
          [`${n} bought $${p}$ packs of trading cards and a ${M(q)} binder. The total was ${M(r)}. How much did each pack cost (in dollars)?`, 'dollars', `${p}c + ${q} = ${r}`, 'c']][k];
        return { prompt: W[0], input: { type: 'number', unit: W[1] }, answer: x,
          explanation: [`Write an equation: $${W[2]}$.`, `Subtract $${q}$: $${p}${W[3]} = ${p * x}$.`, `Divide by $${p}$: $${W[3]} = ${x}$.`] };
      }
      const r = p * x + q;
      const c = choice(`$${v} = ${x}$`, [`$${v} = ${x + 1}$`, `$${v} = ${Math.max(0, x - 1)}$`, `$${v} = ${r - q + p}$`, `$${v} = ${x + 2}$`].filter((s) => s !== `$${v} = ${x}$`), rng);
      return { prompt: `Which value is the solution of $${lin(p, q, v)} = ${r}$?`, input: { type: 'choice', options: c.options }, answer: c.answer,
        explanation: [`Subtract $${q}$: $${p}${v} = ${p * x}$.`, `Divide by $${p}$: $${v} = ${x}$. (You can also test each choice in the equation.)`] };
    }
    if (level === 2) {
      const t = rng.pick(['neg', 'neg', 'dist', 'dist', 'model', 'model', 'wordSolve']);
      if (t === 'neg') {
        let p = rng.nonzero(-9, 9); if (Math.abs(p) === 1) p *= 3;
        const x = rng.nonzero(-12, 12), q = rng.nonzero(-20, 20), r = p * x + q;
        return { prompt: `Solve for $${v}$: $${lin(p, q, v)} = ${r}$`, input: { type: 'number' }, answer: x,
          explanation: [`${q > 0 ? 'Subtract' : 'Add'} $${Math.abs(q)}$ ${q > 0 ? 'from' : 'to'} both sides: $${p}${v} = ${p * x}$.`, `Divide both sides by $${nl(p)}$: $${v} = \\frac{${p * x}}{${p}} = ${x}$.`, `Check: $${P(p)}(${x}) ${q > 0 ? '+' : '-'} ${Math.abs(q)} = ${p * x} ${q > 0 ? '+' : '-'} ${Math.abs(q)} = ${r}$ ✓`] };
      }
      if (t === 'dist') {
        let p = rng.nonzero(-8, 8); if (Math.abs(p) === 1) p = p * 2;
        const q = rng.nonzero(-10, 10), x = rng.nonzero(-10, 10), r = p * (x + q);
        if (x + q === 0) return genEquations(rng, level);
        return { prompt: `Solve for $${v}$: $${nl(p)}(${lin(1, q, v)}) = ${r}$`, input: { type: 'number' }, answer: x,
          explanation: [`Divide both sides by $${nl(p)}$: $${lin(1, q, v)} = ${x + q}$.`, `${q > 0 ? 'Subtract' : 'Add'} $${Math.abs(q)}$ on both sides: $${v} = ${x}$.`, `(Or distribute first: $${lin(p, p * q, v)} = ${r}$, then solve.)`] };
      }
      // model / wordSolve templates
      const k = rng.int(0, 3); let W;
      if (k === 0) {
        const n = rng.int(3, 6), s = rng.pick([2, 3, 4, 5, 6].filter((z) => z !== n)), tk = rng.int(5, 15), tot = n * (tk + s);
        W = { text: `$${n}$ friends each buy a movie ticket and a ${M(s)} snack. They spend ${M(tot)} in all. What is the price of one ticket, $t$ (in dollars)?`,
          eq: `${n}(t + ${s}) = ${tot}`, wrong: [`${n}t + ${s} = ${tot}`, `${s}t + ${n} = ${tot}`, `${n}(t - ${s}) = ${tot}`], ans: tk, unit: 'dollars',
          steps: [`Divide by $${n}$: $t + ${s} = ${tot / n}$.`, `Subtract $${s}$: $t = ${tk}$.`] };
      } else if (k === 1) {
        const st = -rng.int(1, 8), r = rng.int(2, 5), hrs = rng.int(2, 8), end = st - r * hrs;
        W = { text: `The temperature is $${st}^{\\circ}\\text{F}$ and falling $${r}$ degrees per hour. After how many hours $h$ will it be $${end}^{\\circ}\\text{F}$?`,
          eq: `${st} - ${r}h = ${end}`, wrong: [`${st} + ${r}h = ${end}`, `${r}h - ${-st} = ${-end}`, `${r} - ${-st}h = ${end}`], ans: hrs, unit: 'hours',
          steps: [`Add $${-st}$ to both sides: $-${r}h = ${end - st}$.`, `Divide by $-${r}$: $h = ${hrs}$.`] };
      } else if (k === 2) {
        const w = rng.int(3, 12), extra = rng.int(2, 8), per = 2 * w + 2 * (w + extra);
        W = { text: `A rectangular garden is $${extra}$ feet longer than it is wide. Its perimeter is $${per}$ feet. What is the width $w$ (in feet)?`,
          eq: `2(w + ${extra}) + 2w = ${per}`, wrong: [`w + (w + ${extra}) = ${per}`, `2w + ${extra} = ${per}`, `w(w + ${extra}) = ${per}`], ans: w, unit: 'ft',
          steps: [`Simplify: $4w + ${2 * extra} = ${per}$.`, `Subtract $${2 * extra}$: $4w = ${per - 2 * extra}$.`, `Divide by $4$: $w = ${w}$.`] };
      } else {
        const start = rng.int(60, 150), spend = rng.int(4, 12), wk = rng.int(3, 10), left = start - spend * wk;
        if (left < 0) return genEquations(rng, level);
        W = { text: `${U.name(rng)} has a ${M(start)} gift card and spends ${M(spend)} on it every week. After how many weeks $w$ will ${M(left)} be left?`,
          eq: `${start} - ${spend}w = ${left}`, wrong: [`${start} + ${spend}w = ${left}`, `${spend}w - ${start} = ${left}`, `${start}w - ${spend} = ${left}`], ans: wk, unit: 'weeks',
          steps: [`Subtract $${start}$: $-${spend}w = ${left - start}$.`, `Divide by $-${spend}$: $w = ${wk}$.`] };
      }
      if (t === 'model') {
        const c = choice(`$${W.eq}$`, W.wrong.map((s) => `$${s}$`), rng);
        return { prompt: W.text.replace(/ What is[^?]*\?| After how many[^?]*\?/, (m) => m) + '<br><b>Which equation models this situation?</b>', input: { type: 'choice', options: c.options }, answer: c.answer,
          explanation: [`Translate the words into math: $${W.eq}$.`].concat(W.steps.slice(0, -1), [`${W.steps[W.steps.length - 1]} That answer makes sense in the story, so the equation works.`]) };
      }
      return { prompt: W.text, input: { type: 'number', unit: W.unit }, answer: W.ans,
        explanation: [`Write an equation: $${W.eq}$.`].concat(W.steps) };
    }
    // level 3
    const t = rng.pick(['dec', 'frac', 'ineq', 'ineq', 'graph', 'graph', 'ineqWord']);
    if (t === 'dec') {
      const p = rng.pick([0.5, 1.5, 2.5, 0.25, 0.75, 1.2, 0.4, 3.5]), x = rng.nonzero(-12, 16), q = rng.nonzero(-80, 80) / 4;
      const r = U.round(p * x + q, 4);
      if (!Number.isInteger(U.round(p * x, 4) * 100)) return genEquations(rng, level);
      return { prompt: `Solve for $${v}$: $${lin(p, q, v)} = ${nl(r)}$`, input: { type: 'number' }, answer: x,
        explanation: [`${q > 0 ? 'Subtract' : 'Add'} $${nl(Math.abs(q))}$ ${q > 0 ? 'from' : 'to'} both sides: $${nl(p)}${v} = ${nl(U.round(p * x, 4))}$.`, `Divide by $${nl(p)}$: $${v} = ${nl(U.round(p * x, 4))} \\div ${nl(p)} = ${x}$.`] };
    }
    if (t === 'frac') {
      const d = rng.pick([2, 3, 4, 5, 6]); const n = rng.pick([1, 2, 3, 4, 5].filter((z) => z < d + 3 && z !== d && U.gcd(z, d) === 1));
      const sgn2 = rng.bool(0.3) ? -1 : 1;
      const x = d * rng.nonzero(-6, 6), q = rng.nonzero(-12, 12), r = sgn2 * n * x / d + q;
      const coef = (sgn2 < 0 ? '-' : '') + `\\frac{${n}}{${d}}`;
      return { prompt: `Solve for $${v}$: $${coef}${v} ${q > 0 ? '+' : '-'} ${Math.abs(q)} = ${r}$`, input: { type: 'number' }, answer: x,
        explanation: [`${q > 0 ? 'Subtract' : 'Add'} $${Math.abs(q)}$ on both sides: $${coef}${v} = ${r - q}$.`, `Multiply both sides by the reciprocal $${fl(sgn2 * d, n)}$: $${v} = ${P(r - q)} \\times ${pfl(sgn2 * d, n)} = ${x}$.`] };
    }
    if (t === 'ineq' || t === 'graph') {
      let p = rng.nonzero(-6, 6); if (Math.abs(p) === 1) p *= 2;
      const a = rng.int(-6, 6), q = rng.nonzero(-15, 15), r = p * a + q;
      const rel = rng.pick(['>', '<', '>=', '<=']);
      const sol = p < 0 ? FLIP[rel] : rel;
      const ineq = `${lin(p, q, 'x')} ${REL[rel]} ${r}`;
      const steps = [`${q > 0 ? 'Subtract' : 'Add'} $${Math.abs(q)}$ on both sides: $${p}x ${REL[rel]} ${p * a}$.`,
        p < 0 ? `Divide both sides by $${p}$. Dividing by a <b>negative</b> flips the inequality sign: $x ${REL[sol]} ${a}$.` : `Divide both sides by $${p}$ (positive, so the sign stays): $x ${REL[sol]} ${a}$.`];
      if (t === 'ineq') {
        const opts = choice(`$x ${REL[sol]} ${a}$`, [`$x ${REL[FLIP[sol]]} ${a}$`, `$x ${REL[sol.length === 2 ? sol[0] : sol + '=']} ${a}$`, `$x ${REL[sol]} ${-a || a + 2}$`, `$x ${REL[FLIP[sol]]} ${-a || a + 2}$`], rng);
        return { prompt: `Solve the inequality: $${ineq}$`, input: { type: 'choice', options: opts.options }, answer: opts.answer, explanation: steps, hint: 'Remember: multiplying or dividing by a negative number flips the inequality.' };
      }
      const alt = sol.length === 2 ? sol[0] : sol + '=';
      const correct = nlOpt(a, sol);
      const c = choice(correct, [nlOpt(a, FLIP[sol]), nlOpt(a, alt), nlOpt(a, FLIP[alt])], rng);
      return { prompt: `Which number line shows the solution of $${ineq}$?`, input: { type: 'choice', options: c.options }, answer: c.answer,
        explanation: steps.concat([`Graph $x ${REL[sol]} ${a}$: ${sol.length === 2 ? 'a closed (filled) circle because $' + a + '$ is included' : 'an open circle because $' + a + '$ is not included'}, shading to the ${sol[0] === '>' ? 'right' : 'left'}.`]) };
    }
    // ineqWord
    if (rng.bool()) {
      const budget = rng.int(30, 90), fee = rng.int(2, 9), each = rng.int(4, 12);
      const n = Math.floor((budget - fee) / each);
      if (n < 1) return genEquations(rng, level);
      return { prompt: `${U.name(rng)} has at most ${M(budget)} to spend at a carnival. Entry is ${M(fee)}, and each ride ticket costs ${M(each)}. What is the greatest number of ride tickets that can be bought?`,
        input: { type: 'number', unit: 'tickets' }, answer: n,
        explanation: [`Write an inequality: $${each}t + ${fee} \\le ${budget}$.`, `Subtract $${fee}$: $${each}t \\le ${budget - fee}$.`, `Divide by $${each}$: $t \\le ${nl(U.round((budget - fee) / each, 2))}$. Tickets come in whole numbers, so the most is $${n}$.`] };
    }
    const goal = rng.int(50, 200), have = rng.int(5, 40), rate = rng.int(6, 15);
    const n = Math.floor((goal - have) / rate) + 1;
    return { prompt: `${U.name(rng)} has saved ${M(have)} and earns ${M(rate)} per hour babysitting. What is the fewest whole number of hours needed to have <b>more than</b> ${M(goal)}?`,
      input: { type: 'number', unit: 'hours' }, answer: n,
      explanation: [`Write an inequality: $${rate}h + ${have} > ${goal}$.`, `Subtract $${have}$: $${rate}h > ${goal - have}$.`, `Divide by $${rate}$: $h > ${nl(U.round((goal - have) / rate, 2))}$. The smallest whole number that works is $${n}$.`] };
  }

  // ======================================================================
  // Skill 5: circles
  // ======================================================================
  const dimText = (x, y, txt, anchor) => `<text x="${x}" y="${y}" font-size="14" font-weight="700" text-anchor="${anchor || 'middle'}" fill="var(--accent-2)" paint-order="stroke" stroke="var(--surface)" stroke-width="3">${txt}</text>`;
  function circleFig(val, unit, mode) {
    let s = `<svg viewBox="0 0 240 200" xmlns="http://www.w3.org/2000/svg" ${SVGF}><circle cx="120" cy="100" r="80" fill="var(--surface-2)" stroke="var(--ink)" stroke-width="2.5"/><circle cx="120" cy="100" r="3" fill="var(--ink)"/>`;
    if (mode === 'r') s += `<line x1="120" y1="100" x2="200" y2="100" stroke="var(--accent-2)" stroke-width="2.5"/>` + dimText(160, 92, `${U.fmt(val)} ${unit}`);
    else s += `<line x1="40" y1="100" x2="200" y2="100" stroke="var(--accent-2)" stroke-width="2.5"/>` + dimText(120, 92, `${U.fmt(val)} ${unit}`);
    return s + '</svg>';
  }
  function partFig(r, unit, kind) {
    let s = `<svg viewBox="0 0 240 ${kind === 'semi' ? 140 : 200}" xmlns="http://www.w3.org/2000/svg" ${SVGF}>`;
    if (kind === 'semi') {
      s += `<path d="M30 115 A90 90 0 0 1 210 115 Z" fill="var(--surface-2)" stroke="var(--ink)" stroke-width="2.5"/>`;
      s += `<line x1="120" y1="115" x2="210" y2="115" stroke="var(--accent-2)" stroke-width="2.5"/>` + dimText(165, 133, `r = ${U.fmt(r)} ${unit}`);
    } else {
      s += `<path d="M40 170 L40 30 A140 140 0 0 1 180 170 Z" fill="var(--surface-2)" stroke="var(--ink)" stroke-width="2.5"/>`;
      s += `<rect x="40" y="158" width="12" height="12" fill="none" stroke="var(--ink)"/>`;
      s += `<line x1="40" y1="170" x2="180" y2="170" stroke="var(--accent-2)" stroke-width="2.5"/>` + dimText(110, 190, `r = ${U.fmt(r)} ${unit}`);
    }
    return s + '</svg>';
  }
  function rectSemiFig(w, h, unit) {
    // rectangle 160 x 100, semicircle on right side
    let s = `<svg viewBox="0 0 300 170" xmlns="http://www.w3.org/2000/svg" ${SVGF}>`;
    s += `<path d="M30 30 H180 A55 55 0 0 1 180 140 H30 Z" fill="var(--surface-2)" stroke="var(--ink)" stroke-width="2.5"/>`;
    s += `<line x1="180" y1="30" x2="180" y2="140" stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="5 4"/>`;
    s += dimText(105, 22, `${U.fmt(w)} ${unit}`) + dimText(24, 90, `${U.fmt(h)} ${unit}`, 'end');
    s += `<rect x="30" y="128" width="12" height="12" fill="none" stroke="var(--ink)"/>`;
    return s.replace('viewBox="0 0 300 170"', 'viewBox="-30 0 300 170"') + '</svg>';
  }
  function ringFig(R, r, unit) {
    let s = `<svg viewBox="0 0 240 220" xmlns="http://www.w3.org/2000/svg" ${SVGF}>`;
    const ri = 90 * r / R;
    s += `<path d="M30 110 A90 90 0 1 0 210 110 A90 90 0 1 0 30 110 Z M${120 - ri} 110 A${ri} ${ri} 0 1 1 ${120 + ri} 110 A${ri} ${ri} 0 1 1 ${120 - ri} 110 Z" fill="var(--surface-2)" fill-rule="evenodd" stroke="var(--ink)" stroke-width="2.5"/>`;
    s += `<line x1="120" y1="110" x2="${120 + ri * 0.7071}" y2="${110 - ri * 0.7071}" stroke="var(--accent)" stroke-width="2.5"/>`;
    s += `<line x1="120" y1="110" x2="${120 - 90 * 0.7071}" y2="${110 + 90 * 0.7071}" stroke="var(--accent-2)" stroke-width="2.5"/>`;
    s += `<circle cx="120" cy="110" r="3" fill="var(--ink)"/>`;
    s += `<text x="${120 + ri * 0.36 + 4}" y="${110 - ri * 0.36 - 6}" font-size="13" font-weight="700" fill="var(--accent)" paint-order="stroke" stroke="var(--surface)" stroke-width="3">${U.fmt(r)} ${unit}</text>`;
    s += dimText(120 - 45 * 0.7071 - 10, 110 + 45 * 0.7071 + 18, `${U.fmt(R)} ${unit}`, 'end');
    return s + '</svg>';
  }
  function trackFig(L, D, unit) {
    let s = `<svg viewBox="0 0 320 170" xmlns="http://www.w3.org/2000/svg" ${SVGF}>`;
    s += `<path d="M90 30 H230 A55 55 0 0 1 230 140 H90 A55 55 0 0 1 90 30 Z" fill="var(--surface-2)" stroke="var(--ink)" stroke-width="2.5"/>`;
    s += `<line x1="90" y1="30" x2="90" y2="140" stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="5 4"/><line x1="230" y1="30" x2="230" y2="140" stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="5 4"/>`;
    s += dimText(160, 22, `${U.fmt(L)} ${unit}`) + `<line x1="244" y1="30" x2="244" y2="140" stroke="var(--accent-2)" stroke-width="2"/>` + dimText(252, 90, `${U.fmt(D)} ${unit}`, 'start');
    return s + '</svg>';
  }
  function squareQuarterFig(sd, unit) {
    let s = `<svg viewBox="0 0 220 210" xmlns="http://www.w3.org/2000/svg" ${SVGF}>`;
    s += `<rect x="40" y="20" width="160" height="160" fill="var(--accent)" fill-opacity=".22" stroke="var(--ink)" stroke-width="2.5"/>`;
    s += `<path d="M40 180 L40 20 A160 160 0 0 1 200 180 Z" fill="var(--surface)" stroke="var(--ink)" stroke-width="2"/>`;
    s += dimText(120, 200, `${U.fmt(sd)} ${unit}`) + dimText(34, 104, `${U.fmt(sd)} ${unit}`, 'end');
    return s.replace('viewBox="0 0 220 210"', 'viewBox="-20 0 240 210"') + '</svg>';
  }
  const R31 = 'Use $3.14$ for $\\pi$. Round to the nearest tenth.';
  function genCircles(rng, level) {
    const unit = rng.pick(['cm', 'in', 'm', 'ft']);
    if (level === 1) {
      const t = rng.pick(['C', 'C', 'A', 'A', 'ctx', 'rd']);
      if (t === 'C' || t === 'A') {
        const mode = rng.pick(['r', 'd']); const val = rng.int(2, 20);
        const r = mode === 'r' ? val : val / 2, d = 2 * r;
        if (t === 'C') {
          const c = 3.14 * d;
          return { prompt: `Find the circumference of the circle. ${R31}`, figure: circleFig(val, unit, mode),
            input: { type: 'number', unit }, answer: U.round(c, 1), check: tenthCheck(c, Math.PI * d),
            explanation: [mode === 'r' ? `The radius is $${val}$, so the diameter is $d = 2 \\times ${val} = ${d}$.` : `The diameter is $d = ${val}$.`, `$C = \\pi d \\approx 3.14 \\times ${nl(d)} = ${nl(U.round(c, 4))}$.`, `Rounded: about $${nl(U.round(c, 1))}$ ${unit}.`] };
        }
        const a = 3.14 * r * r;
        return { prompt: `Find the area of the circle. ${R31}`, figure: circleFig(val, unit, mode),
          input: { type: 'number', unit: unit + '²' }, answer: U.round(a, 1), check: tenthCheck(a, Math.PI * r * r),
          explanation: [mode === 'd' ? `The diameter is $${val}$, so the radius is $r = ${val} \\div 2 = ${nl(r)}$.` : `The radius is $r = ${val}$.`, `$A = \\pi r^2 \\approx 3.14 \\times ${nl(r)}^2 = 3.14 \\times ${nl(r * r)} = ${nl(U.round(a, 4))}$.`, `Rounded: about $${nl(U.round(a, 1))}$ ${unit}².`] };
      }
      if (t === 'ctx') {
        const k = rng.int(0, 2);
        if (k === 0) {
          const d = rng.pick([16, 20, 24, 26, 27, 29]), c = 3.14 * d;
          return { prompt: `A bike wheel has a diameter of $${d}$ inches. How far does the bike roll in one full turn of the wheel? ${R31}`,
            input: { type: 'number', unit: 'in' }, answer: U.round(c, 1), check: tenthCheck(c, Math.PI * d),
            explanation: [`One turn rolls out the circumference.`, `$C = \\pi d \\approx 3.14 \\times ${d} = ${nl(U.round(c, 4))}$ inches, about $${nl(U.round(c, 1))}$.`] };
        }
        if (k === 1) {
          const d = rng.pick([8, 10, 12, 14, 16, 18]), r = d / 2, a = 3.14 * r * r;
          return { prompt: `A round pizza is $${d}$ inches across (its diameter). What is the area of the top of the pizza? ${R31}`,
            input: { type: 'number', unit: 'in²' }, answer: U.round(a, 1), check: tenthCheck(a, Math.PI * r * r),
            explanation: [`The radius is half the diameter: $r = ${r}$.`, `$A = \\pi r^2 \\approx 3.14 \\times ${r * r} = ${nl(U.round(a, 4))}$ square inches.`] };
        }
        const r = rng.int(3, 15), c = 3.14 * 2 * r;
        return { prompt: `A circular garden has a radius of $${r}$ feet. How much fencing is needed to go all the way around it? ${R31}`,
          input: { type: 'number', unit: 'ft' }, answer: U.round(c, 1), check: tenthCheck(c, Math.PI * 2 * r),
          explanation: [`Fencing goes around, so find the circumference: $C = 2\\pi r$.`, `$C \\approx 2 \\times 3.14 \\times ${r} = ${nl(U.round(c, 4))}$ feet, about $${nl(U.round(c, 1))}$.`] };
      }
      // rd: radius <-> diameter or formula pick
      if (rng.bool()) {
        const toD = rng.bool(), val = toD ? rng.int(2, 40) : 2 * rng.int(2, 30) + (rng.bool(0.3) ? 1 : 0);
        const ans = toD ? 2 * val : val / 2;
        return { prompt: `A circle has a ${toD ? 'radius' : 'diameter'} of $${val}$ ${unit}. What is its ${toD ? 'diameter' : 'radius'}?`, figure: circleFig(val, unit, toD ? 'r' : 'd'),
          input: { type: 'number', unit }, answer: ans,
          explanation: [`The diameter goes all the way across; it is twice the radius: $d = 2r$.`, toD ? `$d = 2 \\times ${val} = ${ans}$ ${unit}.` : `$r = ${val} \\div 2 = ${nl(ans)}$ ${unit}.`] };
      }
      const area = rng.bool();
      const c = choice(area ? '$A = \\pi r^2$' : '$C = 2\\pi r$', area ? ['$A = 2\\pi r$', '$A = \\pi d$', '$A = 2\\pi r^2$', '$A = \\pi^2 r$'] : ['$C = \\pi r^2$', '$C = \\pi r$', '$C = 2\\pi d$', '$C = \\frac{1}{2}\\pi r$'], rng);
      return { prompt: `Which formula gives the ${area ? 'area' : 'circumference'} of a circle with radius $r$?`, input: { type: 'choice', options: c.options }, answer: c.answer,
        explanation: area ? ['Area is measured in square units, so the radius is squared.', 'Cut a circle into thin wedges and rearrange: you get about a rectangle $\\pi r$ long and $r$ tall, so $A = \\pi r^2$.'] : ['The circumference is about 3.14 diameters long: $C = \\pi d$.', 'Since $d = 2r$, $C = 2\\pi r$.'] };
    }
    if (level === 2) {
      const t = rng.pick(['back', 'back', 'pi', 'pi', 'semi', 'quarter']);
      if (t === 'back') {
        if (rng.bool(0.6)) {
          const d = rng.int(3, 30), c = U.round(3.14 * d, 2), askR = rng.bool();
          const ans = askR ? d / 2 : d;
          return { prompt: `The circumference of a circular pond is $${nl(c)}$ ${unit}. What is its ${askR ? 'radius' : 'diameter'}? Use $3.14$ for $\\pi$.`,
            input: { type: 'number', unit }, answer: ans, check: tenthCheck(ans),
            explanation: [`$C = \\pi d$, so $d = C \\div \\pi$.`, `$d \\approx ${nl(c)} \\div 3.14 = ${d}$ ${unit}.`].concat(askR ? [`The radius is half: $r = ${nl(d / 2)}$ ${unit}.`] : []) };
        }
        const r = rng.int(2, 15), a = U.round(3.14 * r * r, 2);
        return { prompt: `A circle has an area of $${nl(a)}$ ${unit}². What is its radius? Use $3.14$ for $\\pi$.`,
          input: { type: 'number', unit }, answer: r, check: tenthCheck(r),
          explanation: [`$A = \\pi r^2$, so $r^2 = A \\div \\pi \\approx ${nl(a)} \\div 3.14 = ${r * r}$.`, `Which number times itself is $${r * r}$? $r = ${r}$ ${unit}.`] };
      }
      if (t === 'pi') {
        const r = rng.int(2, 12), area = rng.bool(), useD = rng.bool();
        const given = useD ? `diameter $${2 * r}$` : `radius $${r}$`;
        const pi = (n) => (n === 1 ? '\\pi' : n + '\\pi');
        const corr = area ? r * r : 2 * r;
        const ds = area ? [2 * r, 4 * r * r, r, 2 * r * r] : [r * r, r, 4 * r, 4 * r * r];
        const c = choice(`$${pi(corr)}$`, ds.map((n) => `$${pi(n)}$`), rng);
        return { prompt: `What is the exact ${area ? 'area' : 'circumference'} of a circle with ${given} ${unit}, in terms of $\\pi$?`, input: { type: 'choice', options: c.options }, answer: c.answer,
          explanation: (useD ? [`The radius is half the diameter: $r = ${r}$.`] : []).concat(area ? [`$A = \\pi r^2 = \\pi \\times ${r}^2 = ${pi(r * r)}$ ${unit}².`] : [`$C = 2\\pi r = 2 \\times ${r} \\times \\pi = ${pi(2 * r)}$ ${unit}.`, `Leaving the answer "in terms of $\\pi$" means keeping $\\pi$ as a symbol — it is exact.`]) };
      }
      const r = rng.int(2, 14), semi = t === 'semi', askP = rng.bool();
      const frac = semi ? 2 : 4;
      if (!askP) {
        const a = 3.14 * r * r / frac;
        return { prompt: `Find the area of this ${semi ? 'semicircle' : 'quarter circle'}. ${R31}`, figure: partFig(r, unit, t),
          input: { type: 'number', unit: unit + '²' }, answer: U.round(a, 1), check: tenthCheck(a, Math.PI * r * r / frac),
          explanation: [`A whole circle with radius $${r}$ has area $3.14 \\times ${r}^2 = ${nl(U.round(3.14 * r * r, 4))}$.`, `A ${semi ? 'semicircle is half' : 'quarter circle is one fourth'}: $${nl(U.round(3.14 * r * r, 4))} \\div ${frac} = ${nl(U.round(a, 4))}$.`, `Rounded: $${nl(U.round(a, 1))}$ ${unit}².`] };
      }
      const arc = 3.14 * 2 * r / frac, per = arc + (semi ? 2 * r : 2 * r);
      return { prompt: `Find the perimeter of this ${semi ? 'semicircle' : 'quarter circle'} (the curved part <b>plus</b> the straight ${semi ? 'side' : 'sides'}). ${R31}`, figure: partFig(r, unit, t),
        input: { type: 'number', unit }, answer: U.round(per, 1), check: tenthCheck(per, Math.PI * 2 * r / frac + 2 * r),
        explanation: [`Curved part: $\\frac{1}{${frac}}$ of the circumference $= \\frac{1}{${frac}} \\times 2 \\times 3.14 \\times ${r} = ${nl(U.round(arc, 4))}$.`, semi ? `Straight side: the diameter, $2 \\times ${r} = ${2 * r}$.` : `Straight sides: two radii, $${r} + ${r} = ${2 * r}$.`, `Perimeter: $${nl(U.round(arc, 4))} + ${2 * r} = ${rd1(per)}$ ${unit}.`] };
    }
    // level 3: composite figures
    const t = rng.pick(['rectSemi', 'rectSemi', 'ring', 'ring', 'track', 'track', 'sq', 'ringPi']);
    if (t === 'rectSemi') {
      const h = 2 * rng.int(2, 8), w = rng.int(h / 2 + 2, 20), r = h / 2, askP = rng.bool(0.4);
      if (askP) {
        const per = 2 * w + h + 3.14 * r;
        return { prompt: `The figure is a rectangle with a semicircle on one end. Find its perimeter (distance around the outside). ${R31}`, figure: rectSemiFig(w, h, unit),
          input: { type: 'number', unit }, answer: U.round(per, 1), check: tenthCheck(per, 2 * w + h + Math.PI * r),
          explanation: [`Straight sides: top $${w}$ + bottom $${w}$ + left side $${h}$ = $${2 * w + h}$. (The dashed line is inside, so it does not count.)`, `Curved part: half of a circle with diameter $${h}$: $\\frac{1}{2} \\times 3.14 \\times ${h} = ${nl(U.round(3.14 * r, 4))}$.`, `Total: $${2 * w + h} + ${nl(U.round(3.14 * r, 4))} = ${rd1(per)}$ ${unit}.`] };
      }
      const a = w * h + 3.14 * r * r / 2;
      return { prompt: `The figure is a rectangle with a semicircle on one end. Find its total area. ${R31}`, figure: rectSemiFig(w, h, unit),
        input: { type: 'number', unit: unit + '²' }, answer: U.round(a, 1), check: tenthCheck(a, w * h + Math.PI * r * r / 2),
        explanation: [`Rectangle: $${w} \\times ${h} = ${w * h}$.`, `Semicircle: the diameter is $${h}$, so $r = ${r}$. Area $= \\frac{1}{2} \\times 3.14 \\times ${r}^2 = ${nl(U.round(3.14 * r * r / 2, 4))}$.`, `Total: $${w * h} + ${nl(U.round(3.14 * r * r / 2, 4))} = ${rd1(a)}$ ${unit}².`] };
    }
    if (t === 'ring' || t === 'ringPi') {
      const R = rng.int(4, 15), r = rng.int(1, R - 2);
      if (t === 'ringPi') {
        const corr = R * R - r * r;
        const c = choice(`$${corr}\\pi$`, [`$${(R - r) * (R - r)}\\pi$`, `$${R * R + r * r}\\pi$`, `$${2 * (R - r)}\\pi$`, `$${R * R}\\pi$`], rng);
        return { prompt: `A circular path (the shaded ring) goes around a fountain. What is the exact area of the path, in terms of $\\pi$?`, figure: ringFig(R, r, unit),
          input: { type: 'choice', options: c.options }, answer: c.answer,
          explanation: [`Big circle: $\\pi \\times ${R}^2 = ${R * R}\\pi$.`, `Small circle (the fountain): $\\pi \\times ${r}^2 = ${r * r}\\pi$.`, `Ring: $${R * R}\\pi - ${r * r}\\pi = ${corr}\\pi$ ${unit}².`] };
      }
      const a = 3.14 * (R * R - r * r);
      return { prompt: `Find the area of the shaded ring. ${R31}`, figure: ringFig(R, r, unit),
        input: { type: 'number', unit: unit + '²' }, answer: U.round(a, 1), check: tenthCheck(a, Math.PI * (R * R - r * r)),
        explanation: [`Ring area = big circle − small circle.`, `$3.14 \\times ${R}^2 - 3.14 \\times ${r}^2 = 3.14 \\times (${R * R} - ${r * r}) = 3.14 \\times ${R * R - r * r}$.`, `$= ${rd1(a)}$ ${unit}².`] };
    }
    if (t === 'track') {
      const D = 2 * rng.int(3, 15), L = rng.int(D / 2 + 3, 50), u = rng.pick(['m', 'ft', 'yd']), askP = rng.bool(0.55);
      if (askP) {
        const per = 2 * L + 3.14 * D;
        return { prompt: `A running track is shaped like a rectangle with a semicircle on each end. How far is one lap around the outside? ${R31}`, figure: trackFig(L, D, u),
          input: { type: 'number', unit: u }, answer: U.round(per, 1), check: tenthCheck(per, 2 * L + Math.PI * D),
          explanation: [`Two straight sides: $2 \\times ${L} = ${2 * L}$.`, `Two semicircles make one whole circle with diameter $${D}$: $3.14 \\times ${D} = ${nl(U.round(3.14 * D, 4))}$.`, `Lap: $${2 * L} + ${nl(U.round(3.14 * D, 4))} = ${rd1(per)}$ ${u}.`] };
      }
      const r = D / 2, a = L * D + 3.14 * r * r;
      return { prompt: `A field is shaped like a rectangle with a semicircle on each end. What is the total area of the field? ${R31}`, figure: trackFig(L, D, u),
        input: { type: 'number', unit: u + '²' }, answer: U.round(a, 1), check: tenthCheck(a, L * D + Math.PI * r * r),
        explanation: [`Rectangle: $${L} \\times ${D} = ${L * D}$.`, `Two semicircles = one circle with $r = ${r}$: $3.14 \\times ${r}^2 = ${nl(U.round(3.14 * r * r, 4))}$.`, `Total: $${L * D} + ${nl(U.round(3.14 * r * r, 4))} = ${rd1(a)}$ ${u}².`] };
    }
    const sd = rng.int(3, 20), a = sd * sd - 3.14 * sd * sd / 4;
    return { prompt: `A quarter circle is cut out of a square, as shown. Find the area of the shaded part that is left. ${R31}`, figure: squareQuarterFig(sd, unit),
      input: { type: 'number', unit: unit + '²' }, answer: U.round(a, 1), check: tenthCheck(a, sd * sd - Math.PI * sd * sd / 4),
      explanation: [`Square: $${sd} \\times ${sd} = ${sd * sd}$.`, `Quarter circle with radius $${sd}$: $\\frac{1}{4} \\times 3.14 \\times ${sd}^2 = ${nl(U.round(3.14 * sd * sd / 4, 4))}$.`, `Shaded: $${sd * sd} - ${nl(U.round(3.14 * sd * sd / 4, 4))} = ${rd1(a)}$ ${unit}².`] };
  }

  // ======================================================================
  // LABS (browser only)
  // ======================================================================
  const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  function texInto(api, el, s) { el.textContent = s; api.tex(el); }
  function burst(api, svgEl, cx, cy) {
    const g = api.svg('g', {});
    svgEl.appendChild(g);
    const cols = ['var(--accent)', 'var(--accent-2)', 'var(--good)'];
    for (let i = 0; i < 14; i++) {
      const ang = (i / 14) * Math.PI * 2, c = api.svg('circle', { cx, cy, r: 4, fill: cols[i % 3] });
      g.appendChild(c);
      if (c.animate) c.animate([{ transform: 'translate(0,0)', opacity: 1 }, { transform: `translate(${Math.cos(ang) * 60}px,${Math.sin(ang) * 60}px)`, opacity: 0 }], { duration: 900, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'forwards' });
    }
    setTimeout(() => g.remove(), 1000);
  }

  // ---------------- Balance scale ----------------
  const balanceLab = {
    id: 'g7-balance', title: 'Balance Scale',
    blurb: 'Keep the scale level while you get x alone — whatever you do to one side, do to the other.',
    mount(el, api) {
      const { h, svg } = api;
      let st, xval, undo = [], hist = [], angle = 0, raf = 0, dead = false;
      const read = h('div', { class: 'lab-readout', style: { justifyContent: 'center' } });
      const msg = h('div', { style: { minHeight: '1.6em', fontWeight: '700', textAlign: 'center', fontSize: '.95rem' } });
      const S = svg('svg', { viewBox: '0 0 360 228', role: 'img', 'aria-label': 'Balance scale' });
      S.style.touchAction = 'manipulation';
      const beamG = svg('g', {}); const leftG = svg('g', {}); const rightG = svg('g', {}); const fx = svg('g', {});
      // stand
      S.appendChild(svg('path', { d: 'M180 180 L148 220 H212 Z', fill: 'var(--surface-2)', stroke: 'var(--ink)', 'stroke-width': 2, 'stroke-linejoin': 'round' }));
      S.appendChild(svg('line', { x1: 116, y1: 220, x2: 244, y2: 220, stroke: 'var(--ink)', 'stroke-width': 3, 'stroke-linecap': 'round' }));
      S.append(beamG, leftG, rightG, fx);
      const beam = svg('line', { stroke: 'var(--ink)', 'stroke-width': 7, 'stroke-linecap': 'round' });
      const postL = svg('line', { stroke: 'var(--ink)', 'stroke-width': 3 }), postR = svg('line', { stroke: 'var(--ink)', 'stroke-width': 3 });
      const panL = svg('rect', { width: 140, height: 7, rx: 3, fill: 'var(--muted)' }), panR = svg('rect', { width: 140, height: 7, rx: 3, fill: 'var(--muted)' });
      beamG.append(postL, postR, beam, panL, panR, svg('circle', { cx: 180, cy: 180, r: 6, fill: 'var(--accent-2)', stroke: 'var(--ink)', 'stroke-width': 2 }));
      const tag = svg('text', { x: 180, y: 16, 'text-anchor': 'middle', 'font-size': 13, fill: 'var(--muted)', 'font-family': 'inherit' });
      S.appendChild(tag);
      const histEl = h('ol', { style: { margin: '0', paddingLeft: '1.3em', fontSize: '.92rem', color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: '2px' } });

      const eqTex = (s) => { const L = lin(s.a || 0, s.b, 'x') || '0', R = lin(s.c || 0, s.d, 'x') || '0'; return { L: s.a ? L : String(s.b), R: s.c ? R : String(s.d) }; };
      const weight = (s) => ({ L: s.a * xval + s.b, R: s.c * xval + s.d });
      function newEq() {
        xval = rint(1, 7);
        if (Math.random() < 0.3) { const c = rint(1, 2), a = c + rint(1, 3), b = rint(0, 6); st = { a, b, c, d: (a - c) * xval + b }; }
        else { const a = rint(2, 4), b = rint(1, 9); st = { a, b, c: 0, d: a * xval + b }; }
        if (st.d > 30) return newEq();
        undo = []; hist = []; draw(); say('Make the scale show x by itself. Tap a weight to remove it from just one side.', 'var(--muted)');
      }
      function say(t, col) { msg.textContent = t; msg.style.color = col || 'var(--ink)'; }
      function solved() { const w = weight(st); return w.L === w.R && ((st.a === 1 && st.b === 0 && st.c === 0) || (st.c === 1 && st.d === 0 && st.a === 0)); }
      function itemsFor(g, nx, nu, side) {
        while (g.firstChild) g.firstChild.remove();
        const list = []; for (let i = 0; i < nx; i++) list.push('x'); for (let i = 0; i < nu; i++) list.push('1');
        list.forEach((kind, i) => {
          const row = Math.floor(i / 7), col = i % 7;
          const cx = -57 + col * 19, cy = -11 - row * 20;
          const it = svg('g', { transform: `translate(${cx},${cy})`, style: 'cursor:pointer' });
          if (kind === 'x') {
            it.append(svg('rect', { x: -9, y: -9, width: 18, height: 18, rx: 3, fill: 'var(--accent)', stroke: 'var(--ink)', 'stroke-width': 1 }),
              svg('text', { y: 4.5, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, 'font-style': 'italic', fill: 'var(--surface)', 'font-family': 'inherit', text: 'x' }));
          } else {
            it.append(svg('circle', { r: 8.5, fill: 'var(--accent-2)', stroke: 'var(--ink)', 'stroke-width': 1 }),
              svg('text', { y: 4, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, fill: 'var(--surface)', 'font-family': 'inherit', text: '1' }));
          }
          it.addEventListener('click', () => {
            push();
            if (side === 'L') { if (kind === 'x') st.a--; else st.b--; } else { if (kind === 'x') st.c--; else st.d--; }
            hist.push(`Removed ${kind === 'x' ? 'an x' : 'a 1'} from the ${side === 'L' ? 'left' : 'right'} side only`);
            draw(); say('Uh-oh, the scale tipped! You changed only one side. Tap Undo.', 'var(--bad)');
          });
          g.appendChild(it);
        });
      }
      function place(th) {
        const rad = th * Math.PI / 180, cx = 95 * Math.cos(rad), sy = 95 * Math.sin(rad);
        const L = { x: 180 - cx, y: 180 - sy }, R = { x: 180 + cx, y: 180 + sy };
        beam.setAttribute('x1', L.x); beam.setAttribute('y1', L.y); beam.setAttribute('x2', R.x); beam.setAttribute('y2', R.y);
        postL.setAttribute('x1', L.x); postL.setAttribute('y1', L.y); postL.setAttribute('x2', L.x); postL.setAttribute('y2', L.y - 22);
        postR.setAttribute('x1', R.x); postR.setAttribute('y1', R.y); postR.setAttribute('x2', R.x); postR.setAttribute('y2', R.y - 22);
        panL.setAttribute('x', L.x - 70); panL.setAttribute('y', L.y - 28); panR.setAttribute('x', R.x - 70); panR.setAttribute('y', R.y - 28);
        leftG.setAttribute('transform', `translate(${L.x},${L.y - 28})`); rightG.setAttribute('transform', `translate(${R.x},${R.y - 28})`);
      }
      function animateTo(target) {
        cancelAnimationFrame(raf);
        const from = angle, t0 = performance.now(), dur = 600;
        const step = (now) => {
          if (dead) return;
          const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3) * Math.cos(k * 5) ;
          angle = from + (target - from) * Math.min(1.15, e); place(angle);
          if (k < 1) raf = requestAnimationFrame(step); else { angle = target; place(angle); }
        };
        raf = requestAnimationFrame(step);
      }
      function draw() {
        itemsFor(leftG, st.a, st.b, 'L'); itemsFor(rightG, st.c, st.d, 'R');
        const w = weight(st), diff = w.R - w.L;
        const target = diff === 0 ? 0 : Math.max(-12, Math.min(12, Math.sign(diff) * Math.max(5, Math.abs(diff) * 2)));
        animateTo(target);
        const e = eqTex(st);
        texInto(api, read, `$${e.L} ${diff === 0 ? '=' : '\\neq'} ${e.R}$`);
        read.style.color = diff === 0 ? 'var(--ink)' : 'var(--bad)';
        tag.textContent = `mystery x = ? · left ${st.a}x + ${st.b} · right ${st.c}x + ${st.d}`;
        tag.textContent = diff === 0 ? 'balanced' : (diff > 0 ? 'right side is heavier' : 'left side is heavier');
        while (histEl.firstChild) histEl.firstChild.remove();
        hist.slice(-4).forEach((t) => histEl.appendChild(h('li', { text: t })));
        if (solved()) {
          say(`You got x alone: x = ${xval}! Every step kept the scale balanced.`, 'var(--good)');
          if (read.animate) read.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.12)' }, { transform: 'scale(1)' }], { duration: 500 });
          const sx = st.a === 1 ? 180 - 95 : 180 + 95;
          setTimeout(() => !dead && burst(api, S, sx, 130), 350);
        }
      }
      function push() { undo.push(JSON.stringify({ st, hist })); if (undo.length > 40) undo.shift(); }
      function both(name, test, fn, note) {
        return h('button', { class: 'btn-small', type: 'button', html: name, onclick: () => {
          const why = test(); if (why) { say(why, 'var(--accent-2)'); return; }
          push(); fn(); hist.push(note()); draw();
          if (!solved()) say(weight(st).L === weight(st).R ? 'Still balanced. Nice!' : 'The scale is tipped — fix it with Undo.', weight(st).L === weight(st).R ? 'var(--good)' : 'var(--bad)');
        } });
      }
      const bSub = both('−1 both sides', () => (st.b < 1 || st.d < 1) ? 'One side has no 1-weights to take away.' : '', () => { st.b--; st.d--; }, () => 'Subtracted 1 from both sides');
      const bAdd = both('+1 both sides', () => (st.b > 30 || st.d > 30) ? 'The pans are full!' : '', () => { st.b++; st.d++; }, () => 'Added 1 to both sides');
      const bX = both('−x both sides', () => (st.a < 1 || st.c < 1) ? 'Both sides need an x to remove one from each.' : '', () => { st.a--; st.c--; }, () => 'Removed one x from both sides');
      let lastDiv = 1;
      const bDiv = both('÷ both sides', () => {
        if (st.a > 0 && st.c > 0) return 'There are x’s on both sides. Remove x’s from both sides first.';
        const n = st.a > 0 ? st.a : st.c; if (n === 0) return 'There is no x on the scale.';
        if (n === 1) return 'There is already just one x.';
        const others = st.a > 0 ? [st.b, st.d] : [st.d, st.b];
        if (others.some((k) => k % n)) return `Can’t split into ${n} equal groups: ${others.filter((k) => k % n)[0]} isn’t divisible by ${n}. Try removing 1-weights first.`;
        lastDiv = n; return '';
      }, () => { const n = lastDiv; if (st.a > 0) { st.a /= n; st.b /= n; st.d /= n; } else { st.c /= n; st.d /= n; st.b /= n; } }, () => `Divided both sides by ${lastDiv}`);
      const bUndo = h('button', { class: 'btn-small', type: 'button', text: '↶ Undo', onclick: () => { if (!undo.length) return; const o = JSON.parse(undo.pop()); st = o.st; hist = o.hist; draw(); say('Undone.', 'var(--muted)'); } });
      const bNew = h('button', { class: 'btn', type: 'button', text: 'New equation', onclick: newEq });
      el.append(read, S, msg,
        h('div', { class: 'lab-row', style: { justifyContent: 'center' } }, bSub, bAdd, bX, bDiv),
        h('div', { class: 'lab-row', style: { justifyContent: 'center' } }, bUndo, bNew),
        histEl,
        h('p', { class: 'try', html: '<b>Try this:</b> Solve it in as few steps as possible. Then tap a single weight and watch the scale tip — that’s why you must do the same thing to both sides.' }));
      place(0); newEq();
      return () => { dead = true; cancelAnimationFrame(raf); };
    }
  };

  // ---------------- Integer chips ----------------
  const chipsLab = {
    id: 'g7-integer-chips', title: 'Integer Chips',
    blurb: 'Model adding and subtracting integers with + and − chips. A +1 and a −1 make zero.',
    mount(el, api) {
      const { h, svg } = api;
      let mode = 'add', A = 5, B = -8, chips = [], busy = false, taken = false;
      const read = h('div', { class: 'lab-readout', style: { justifyContent: 'center' } });
      const note = h('div', { style: { minHeight: '1.5em', textAlign: 'center', fontWeight: '700', fontSize: '.95rem' } });
      const S = svg('svg', { viewBox: '0 0 340 200', role: 'img', 'aria-label': 'Chip mat' });
      const mat = svg('rect', { x: 2, y: 2, width: 336, height: 196, rx: 14, fill: 'var(--surface-2)', stroke: 'var(--line)', 'stroke-width': 2 });
      const layer = svg('g', {}); S.append(mat, layer);
      const mkStep = (label, get, set) => {
        const val = h('b', { class: 'tnum', style: { minWidth: '3.2ch', textAlign: 'center', fontSize: '1.15rem' } });
        const minus = h('button', { class: 'btn-small', type: 'button', 'aria-label': 'decrease ' + label, text: '−', style: { minWidth: '40px', justifyContent: 'center' }, onclick: () => { if (get() > -10) { set(get() - 1); build(); } } });
        const plus = h('button', { class: 'btn-small', type: 'button', 'aria-label': 'increase ' + label, text: '+', style: { minWidth: '40px', justifyContent: 'center' }, onclick: () => { if (get() < 10) { set(get() + 1); build(); } } });
        const row = h('div', { class: 'lab-row', style: { justifyContent: 'space-between' } }, h('span', { style: { fontWeight: '700' }, text: label }), h('span', { class: 'lab-row', style: { gap: '6px' } }, minus, val, plus));
        return { row, val, label: row.firstChild };
      };
      const s1 = mkStep('First number', () => A, (v) => { A = v; });
      const s2 = mkStep('Second number', () => B, (v) => { B = v; });
      const tAdd = h('button', { class: 'btn-small on', type: 'button', text: 'Add  +', onclick: () => setMode('add') });
      const tSub = h('button', { class: 'btn-small', type: 'button', text: 'Subtract  −', onclick: () => setMode('sub') });
      const act1 = h('button', { class: 'btn', type: 'button' });
      const act2 = h('button', { class: 'btn-small', type: 'button', text: 'Add a zero pair', onclick: () => addPair() });
      const reset = h('button', { class: 'btn-small', type: 'button', text: 'Reset', onclick: () => build() });
      const tryEl = h('p', { class: 'try' });
      function setMode(m) { mode = m; tAdd.classList.toggle('on', m === 'add'); tSub.classList.toggle('on', m === 'sub'); build(); }
      const sgnS = (v) => (v > 0 ? '+' + v : v < 0 ? '−' + (-v) : '0');
      const texN = (v) => (v > 0 ? '(+' + v + ')' : v < 0 ? '(-' + (-v) + ')' : '0');
      function build() {
        taken = false; chips = []; let id = 0;
        for (let i = 0; i < Math.abs(A); i++) chips.push({ id: id++, s: Math.sign(A), row: 0, col: i });
        if (mode === 'add') for (let i = 0; i < Math.abs(B); i++) chips.push({ id: id++, s: Math.sign(B), row: 1, col: i });
        s1.val.textContent = sgnS(A); s2.val.textContent = sgnS(B);
        s2.label.textContent = mode === 'add' ? 'Second number' : 'Take away';
        act2.style.display = mode === 'sub' ? '' : 'none';
        tryEl.innerHTML = mode === 'add' ? '<b>Try this:</b> Build $(+3) + (-7)$. Before cancelling, predict the answer. Why does a +1 and a −1 together make 0?' : '<b>Try this:</b> Do $(+2) - (+5)$. There aren’t five + chips to take away… so add zero pairs first! Compare with $(+2) + (-5)$.';
        api.tex(tryEl);
        draw();
      }
      function pairs() {
        if (mode !== 'add') return [];
        const p = [], r0 = chips.filter((c) => c.row === 0), r1 = chips.filter((c) => c.row === 1);
        for (const a of r0) { const b = r1.find((c) => c.col === a.col); if (b && b.s !== a.s) p.push([a, b]); }
        return p;
      }
      const pos = (c) => ({ x: 26 + c.col * 32, y: mode === 'add' ? (c.row === 0 ? 58 : 152) : (c.row === 0 ? 52 : c.row === 1 ? 118 : 156) });
      function chipEl(c) {
        const p = pos(c);
        const g = svg('g', { transform: `translate(${p.x},${p.y})` });
        g.append(svg('circle', { r: 13.5, fill: c.s > 0 ? 'var(--accent)' : 'var(--accent-2)', stroke: 'var(--ink)', 'stroke-width': 1.2 }),
          svg('text', { y: 5.5, 'text-anchor': 'middle', 'font-size': 18, 'font-weight': 700, fill: 'var(--surface)', 'font-family': 'inherit', text: c.s > 0 ? '+' : '−' }));
        c.el = g; return g;
      }
      function draw() {
        while (layer.firstChild) layer.firstChild.remove();
        const lab = (y, t) => layer.appendChild(svg('text', { x: 12, y, 'font-size': 11.5, fill: 'var(--muted)', 'font-family': 'inherit', 'font-weight': 700, text: t }));
        if (mode === 'add') { lab(30, `first number: ${sgnS(A)}`); lab(186, `second number: ${sgnS(B)}`); }
        else { lab(24, `start with ${sgnS(A)}`); if (!taken && chips.some((c) => c.row > 0)) lab(92, 'zero pairs you added (each = 0)'); }
        const ps = pairs();
        ps.forEach(([a, b]) => {
          const pa = pos(a), pb = pos(b);
          const r = svg('rect', { x: pa.x - 16, y: pa.y - 17, width: 32, height: pb.y - pa.y + 34, rx: 16, fill: 'var(--good)', 'fill-opacity': 0.15, stroke: 'var(--good)', 'stroke-width': 2, 'stroke-dasharray': '5 3', style: 'cursor:pointer' });
          r.addEventListener('click', () => cancel([[a, b]]));
          layer.appendChild(r);
        });
        if (mode === 'sub') {
          const extra = chips.filter((c) => c.row === 1);
          extra.forEach((a) => { const b = chips.find((c) => c.row === 2 && c.col === a.col); if (!b) return; const pa = pos(a); layer.appendChild(svg('rect', { x: pa.x - 16, y: pa.y - 17, width: 32, height: 72, rx: 16, fill: 'var(--good)', 'fill-opacity': 0.12, stroke: 'var(--good)', 'stroke-width': 1.5, 'stroke-dasharray': '4 3' })); });
        }
        chips.forEach((c) => { const g = chipEl(c); if (mode === 'add') { const pr = ps.find((p) => p.includes(c)); if (pr) { g.style.cursor = 'pointer'; g.addEventListener('click', () => cancel([pr])); } } layer.appendChild(g); });
        if (!chips.length) layer.appendChild(svg('text', { x: 170, y: 108, 'text-anchor': 'middle', 'font-size': 15, fill: 'var(--muted)', 'font-family': 'inherit', text: 'Empty mat = 0' }));
        const val = chips.reduce((s, c) => s + c.s, 0);
        if (mode === 'add') {
          const done = ps.length === 0;
          texInto(api, read, `$${texN(A)} + ${texN(B)} = ${done ? (val > 0 ? '+' : '') + val : '\\;?'}$`);
          note.textContent = done ? (A && B && Math.sign(A) !== Math.sign(B) ? 'All zero pairs are gone. What’s left is the answer!' : 'No zero pairs here — just count the chips.') : `${ps.length} zero pair${ps.length > 1 ? 's' : ''} (each worth 0). Tap a pair or cancel them all.`;
          note.style.color = done ? 'var(--good)' : 'var(--ink)';
          act1.textContent = 'Cancel zero pairs'; act1.disabled = !ps.length; act1.onclick = () => cancel(pairs());
        } else {
          const need = Math.abs(B), have = chips.filter((c) => c.s === Math.sign(B)).length;
          texInto(api, read, `$${texN(A)} - ${texN(B)} = ${taken ? (val > 0 ? '+' : '') + val : '\\;?'}$`);
          act1.textContent = B === 0 ? 'Take away 0' : `Take away ${need} ${B > 0 ? '+' : '−'} chip${need > 1 ? 's' : ''}`;
          act1.disabled = taken || have < need;
          act2.disabled = taken || chips.filter((c) => c.row === 1).length >= 10;
          if (taken) { note.textContent = `Done! ${texPlain(A)} − ${texPlain(B)} = ${texPlain(val)}. Same as ${texPlain(A)} + ${texPlain(-B)}.`; note.style.color = 'var(--good)'; }
          else if (have < need) { note.textContent = `You need ${need} ${B > 0 ? '+' : '−'} chips but only have ${have}. Add a zero pair — it doesn’t change the value!`; note.style.color = 'var(--accent-2)'; }
          else { note.textContent = 'You have enough chips. Take them away!'; note.style.color = 'var(--ink)'; }
          act1.onclick = takeAway;
        }
      }
      const texPlain = (v) => (v > 0 ? '+' + v : v < 0 ? '−' + (-v) : '0');
      function fade(list, dy, done) {
        busy = true;
        let k = 0; const t0 = performance.now();
        const step = (now) => {
          k = Math.min(1, (now - t0) / 420);
          list.forEach((c) => { const p = pos(c); if (c.el) { c.el.setAttribute('transform', `translate(${p.x},${p.y + dy * k}) scale(${1 - 0.6 * k})`); c.el.setAttribute('opacity', 1 - k); } });
          if (k < 1) requestAnimationFrame(step); else { busy = false; done(); }
        };
        requestAnimationFrame(step);
      }
      function cancel(ps) {
        if (busy || !ps.length) return;
        const gone = new Set(); ps.forEach(([a, b]) => { gone.add(a); gone.add(b); });
        fade([...gone], 0, () => {
          chips = chips.filter((c) => !gone.has(c));
          // repack each row to the left so columns stay aligned
          [0, 1].forEach((r) => chips.filter((c) => c.row === r).forEach((c, i) => { c.col = i; }));
          draw();
        });
      }
      function addPair() {
        if (busy || taken) return;
        const n = chips.filter((c) => c.row === 1).length; if (n >= 10) return;
        const id = Date.now();
        chips.push({ id, s: 1, row: 1, col: n }, { id: id + 1, s: -1, row: 2, col: n });
        draw();
        chips.slice(-2).forEach((c) => c.el && c.el.animate && c.el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300 }));
      }
      function takeAway() {
        if (busy) return;
        const s = Math.sign(B); const pick = [];
        for (const r of [0, 1, 2]) for (const c of chips.filter((c) => c.row === r && c.s === s).reverse()) if (pick.length < Math.abs(B)) pick.push(c);
        fade(pick, -40, () => { chips = chips.filter((c) => !pick.includes(c)); taken = true; draw(); });
      }
      el.append(h('div', { class: 'lab-row', style: { justifyContent: 'center' } }, tAdd, tSub), s1.row, s2.row, read, S, note,
        h('div', { class: 'lab-row', style: { justifyContent: 'center' } }, act1, act2, reset), tryEl);
      build();
    }
  };

  // ---------------- Double number line ----------------
  const doubleLab = {
    id: 'g7-double-line', title: 'Double Number Line',
    blurb: 'Drag the marker to find equivalent ratios, unit rates, and percents.',
    mount(el, api) {
      const { h, svg } = api;
      const PRE = {
        sale: { name: 'Sale %', top: 'Dollars', bot: 'Percent', tu: '$', bu: '%', A: 80, B: 100, aStep: 5, aMin: 20, aMax: 200, bFixed: true, bMax: 100, bStep: 10, snap: 5 },
        recipe: { name: 'Recipe', top: 'Cups of flour', bot: 'Batches', tu: ' cups', bu: ' batches', A: 3, B: 2, aStep: 1, aMin: 1, aMax: 12, bMin: 1, bMaxS: 6, bMax: 8, bStep: 1, snap: 0.5 },
        speed: { name: 'Speed', top: 'Miles', bot: 'Hours', tu: ' mi', bu: ' h', A: 150, B: 3, aStep: 10, aMin: 10, aMax: 300, bMin: 1, bMaxS: 5, bMax: 6, bStep: 1, snap: 0.5 }
      };
      let cfg, key = 'sale', A, B, mark;
      const S = svg('svg', { viewBox: '0 0 340 170', role: 'img', 'aria-label': 'Double number line' });
      const g = svg('g', {}); S.appendChild(g);
      const read = h('div', { class: 'lab-readout', style: { fontSize: '1.1rem', flexDirection: 'column', alignItems: 'flex-start' } });
      const r1 = h('div'), r2 = h('div', { style: { fontSize: '.95rem', color: 'var(--muted)' } }), r3 = h('div', { style: { fontSize: '.95rem', color: 'var(--muted)' } }); read.append(r1, r2, r3);
      const tabs = h('div', { class: 'lab-row', style: { justifyContent: 'center' } });
      const stepRow = h('div', { class: 'stack', style: { gap: '8px' } });
      const tryEl = h('p', { class: 'try' });
      const X0 = 20, X1 = 320, YT = 52, YB = 118;
      const X = (b) => X0 + b / cfg.bMax * (X1 - X0);
      const fmtN = (v) => U.fmt(U.round(v, 2));
      function stepper(label, get, set, min, max, step) {
        const v = h('b', { class: 'tnum', style: { minWidth: '4ch', textAlign: 'center' } });
        const upd = () => { v.textContent = fmtN(get()); };
        const row = h('div', { class: 'lab-row', style: { justifyContent: 'space-between' } }, h('span', { style: { fontWeight: '700' }, text: label }),
          h('span', { class: 'lab-row', style: { gap: '6px' } },
            h('button', { class: 'btn-small', type: 'button', text: '−', 'aria-label': 'less ' + label, onclick: () => { set(Math.max(min, get() - step)); upd(); draw(); } }), v,
            h('button', { class: 'btn-small', type: 'button', text: '+', 'aria-label': 'more ' + label, onclick: () => { set(Math.min(max, get() + step)); upd(); draw(); } })));
        upd(); return row;
      }
      function setPreset(k) {
        key = k; cfg = PRE[k]; A = cfg.A; B = cfg.B; mark = k === 'sale' ? 30 : cfg.B;
        [...tabs.children].forEach((b) => b.classList.toggle('on', b.dataset.k === k));
        while (stepRow.firstChild) stepRow.firstChild.remove();
        stepRow.appendChild(stepper(k === 'sale' ? 'Original price ($)' : cfg.top, () => A, (v) => { A = v; }, cfg.aMin, cfg.aMax, cfg.aStep));
        if (!cfg.bFixed) stepRow.appendChild(stepper(cfg.bot, () => B, (v) => { B = v; }, cfg.bMin, cfg.bMaxS, 1));
        tryEl.innerHTML = k === 'sale' ? '<b>Try this:</b> A $60 game is 25% off. Set the price to 60 and drag to 25%. How much do you save? What do you pay?' : k === 'recipe' ? '<b>Try this:</b> Set 3 cups for 2 batches. How much flour for 5 batches? Find the flour for 1 batch first.' : '<b>Try this:</b> 150 miles in 3 hours. Drag to 1 hour: that’s the unit rate. How far in 4.5 hours?';
        draw();
      }
      Object.keys(PRE).forEach((k) => tabs.appendChild(h('button', { class: 'btn-small', type: 'button', 'data-k': k, text: PRE[k].name, onclick: () => setPreset(k) })));
      function line(y, label) {
        g.appendChild(svg('line', { x1: X0, y1: y, x2: X1 + 6, y2: y, stroke: 'var(--ink)', 'stroke-width': 2 }));
        g.appendChild(svg('path', { d: `M${X1 + 12} ${y} l-8 -5 v10 z`, fill: 'var(--ink)' }));
        g.appendChild(svg('text', { x: X0, y: y - (y === YT ? 28 : -36), 'font-size': 12, 'font-weight': 700, fill: 'var(--muted)', 'font-family': 'inherit', text: label }));
      }
      let handle;
      function draw() {
        while (g.firstChild) g.firstChild.remove();
        const rate = A / B;
        line(YT, cfg.top); line(YB, cfg.bot);
        const n = Math.round(cfg.bMax / cfg.bStep);
        for (let i = 0; i <= n; i++) {
          const b = i * cfg.bStep, x = X(b), big = key !== 'sale' || i % 1 === 0;
          g.appendChild(svg('line', { x1: x, y1: YT - 6, x2: x, y2: YT + 6, stroke: 'var(--ink)', 'stroke-width': 1.5 }));
          g.appendChild(svg('line', { x1: x, y1: YB - 6, x2: x, y2: YB + 6, stroke: 'var(--ink)', 'stroke-width': 1.5 }));
          const showTop = n <= 8 || i % 2 === 0;
          if (showTop && big) g.appendChild(svg('text', { x, y: YT - 11, 'text-anchor': 'middle', 'font-size': 10.5, fill: 'var(--ink)', 'font-family': 'inherit', text: fmtN(b * rate) }));
          if (showTop) g.appendChild(svg('text', { x, y: YB + 21, 'text-anchor': 'middle', 'font-size': 10.5, fill: 'var(--ink)', 'font-family': 'inherit', text: fmtN(b) }));
        }
        // reference pair highlight
        if (B <= cfg.bMax) {
          const xr = X(B);
          g.appendChild(svg('line', { x1: xr, y1: YT, x2: xr, y2: YB, stroke: 'var(--muted)', 'stroke-width': 1.5, 'stroke-dasharray': '3 3' }));
        }
        const xm = X(mark), tv = mark * rate;
        g.appendChild(svg('line', { x1: xm, y1: YT - 4, x2: xm, y2: YB + 4, stroke: 'var(--accent-2)', 'stroke-width': 3 }));
        const chipT = svg('g', { transform: `translate(${Math.min(X1 - 26, Math.max(X0 + 26, xm))},${(YT + YB) / 2})` });
        chipT.append(svg('rect', { x: -30, y: -12, width: 60, height: 24, rx: 12, fill: 'var(--accent-2)' }),
          svg('text', { y: 4.5, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: 'var(--surface)', 'font-family': 'inherit', text: 'drag ⇆' }));
        g.appendChild(chipT);
        g.appendChild(svg('circle', { cx: xm, cy: YT, r: 6, fill: 'var(--accent-2)', stroke: 'var(--surface)', 'stroke-width': 2 }));
        g.appendChild(svg('circle', { cx: xm, cy: YB, r: 6, fill: 'var(--accent-2)', stroke: 'var(--surface)', 'stroke-width': 2 }));
        handle = svg('rect', { x: X0 - 10, y: YT - 30, width: X1 - X0 + 20, height: YB - YT + 60, fill: 'transparent' });
        g.appendChild(handle);
        api.drag(S, handle, (p) => { const b = Math.max(0, Math.min(cfg.bMax, (p.x - X0) / (X1 - X0) * cfg.bMax)); const sn = Math.round(b / cfg.snap) * cfg.snap; if (sn !== mark) { mark = sn; draw(); } });
        // readout
        if (key === 'sale') {
          texInto(api, r1, `$${fmtN(mark)}\\%$ of $\\$${fmtN(A)}$ is $\\$${tv.toFixed(2)}$`);
          texInto(api, r2, `Unit rate: $1\\% \\to \\$${(A / 100).toFixed(2)}$`);
          texInto(api, r3, `${fmtN(mark)}% off → you pay $\\$${(A - tv).toFixed(2)}$`);
        } else {
          texInto(api, r1, `$${fmtN(A)} : ${fmtN(B)} = ${fmtN(tv)} : ${fmtN(mark)}$`);
          texInto(api, r2, `Unit rate: $${fmtN(rate)}$ ${cfg.top.toLowerCase()} per ${cfg.bot === 'Hours' ? 'hour' : 'batch'}`);
          texInto(api, r3, `${fmtN(tv)} ${cfg.top.toLowerCase()} for ${fmtN(mark)} ${cfg.bot.toLowerCase()}`);
        }
      }
      el.append(tabs, stepRow, S, read, tryEl);
      setPreset('sale');
    }
  };

  // ---------------- Circle unroller ----------------
  const circleLab = {
    id: 'g7-circle-unroll', title: 'Circle Unroller',
    blurb: 'Roll a circle to see why C = πd, then cut it into wedges to see why A = πr².',
    mount(el, api) {
      const { h, svg } = api;
      let d = 2, mode = 'C', t = 0, raf = 0, n = 12, dead = false;
      const S = svg('svg', { viewBox: '0 40 340 152', role: 'img', 'aria-label': 'Circle unroller' });
      const g = svg('g', {}); S.appendChild(g);
      const read = h('div', { class: 'lab-readout', style: { justifyContent: 'center', fontSize: '1.15rem' } });
      const tC = h('button', { class: 'btn-small on', type: 'button', text: 'Circumference', onclick: () => setMode('C') });
      const tA = h('button', { class: 'btn-small', type: 'button', text: 'Area', onclick: () => setMode('A') });
      const lab = h('label', { style: { fontWeight: '700', display: 'flex', flexDirection: 'column', gap: '4px' } });
      const sl = h('input', { type: 'range', min: 1, max: 3, step: 0.25, value: 2 });
      const sLab = h('span');
      lab.append(sLab, sl);
      const go = h('button', { class: 'btn', type: 'button', text: 'Roll it!' });
      const tryEl = h('p', { class: 'try' });
      function setMode(m) { mode = m; tC.classList.toggle('on', m === 'C'); tA.classList.toggle('on', m === 'A'); cancelAnimationFrame(raf); t = m === 'C' ? 0 : 0; sync(); }
      function sync() {
        if (mode === 'C') { sl.min = 1; sl.max = 3; sl.step = 0.25; sl.value = d; sLab.textContent = `Diameter: ${d} units`; go.textContent = 'Roll it!'; tryEl.innerHTML = '<b>Try this:</b> Change the diameter and roll again. Does the circle always go a little more than 3 diameters? That “a little more than 3” is $\\pi \\approx 3.14$.'; }
        else { sl.min = 4; sl.max = 32; sl.step = 2; sl.value = n; sLab.textContent = `Number of wedges: ${n}`; go.textContent = 'Rearrange!'; tryEl.innerHTML = '<b>Try this:</b> Use more wedges. The shape gets closer to a rectangle with height $r$ and length half the circumference, $\\pi r$. So $A = \\pi r \\times r = \\pi r^2$.'; }
        api.tex(tryEl); draw();
      }
      sl.addEventListener('input', () => { if (mode === 'C') d = Number(sl.value); else n = Number(sl.value); cancelAnimationFrame(raf); t = 0; sync(); });
      go.addEventListener('click', () => {
        cancelAnimationFrame(raf); const t0 = performance.now(), dur = mode === 'C' ? 2600 : 1400;
        const step = (now) => { if (dead) return; t = Math.min(1, (now - t0) / dur); draw(); if (t < 1) raf = requestAnimationFrame(step); };
        raf = requestAnimationFrame(step);
      });
      function draw() {
        while (g.firstChild) g.firstChild.remove();
        if (mode === 'C') drawC(); else drawA();
      }
      function drawC() {
        const u = 300 / (Math.PI * 3 + 1.6), r = d / 2 * u, x0 = 16, y = 160;
        const scale = Math.min(1, 300 / (Math.PI * d * u + 2 * r));
        const R = r * scale, U1 = u * scale;
        g.appendChild(svg('line', { x1: 8, y1: y, x2: 332, y2: y, stroke: 'var(--ink)', 'stroke-width': 2 }));
        for (let k = 0; k <= 3; k++) {
          const x = x0 + R + k * d * U1;
          g.appendChild(svg('line', { x1: x, y1: y - 6, x2: x, y2: y + 6, stroke: 'var(--muted)', 'stroke-width': 1.5 }));
          g.appendChild(svg('text', { x, y: y + 22, 'text-anchor': 'middle', 'font-size': 11, fill: 'var(--muted)', 'font-family': 'inherit', text: k === 0 ? '0' : k + 'd' }));
        }
        const dist = t * Math.PI * d * U1, cx = x0 + R + dist, cy = y - R, ang = dist / R;
        g.appendChild(svg('line', { x1: x0 + R, y1: y, x2: cx, y2: y, stroke: 'var(--accent-2)', 'stroke-width': 5, 'stroke-linecap': 'round' }));
        g.appendChild(svg('circle', { cx, cy, r: R, fill: 'var(--surface-2)', stroke: 'var(--accent)', 'stroke-width': 3 }));
        const px = cx - R * Math.sin(ang), py = cy + R * Math.cos(ang);
        g.appendChild(svg('line', { x1: cx - R * Math.cos(ang), y1: cy - R * Math.sin(ang), x2: cx + R * Math.cos(ang), y2: cy + R * Math.sin(ang), stroke: 'var(--muted)', 'stroke-width': 1.5, 'stroke-dasharray': '4 3' }));
        g.appendChild(svg('circle', { cx: px, cy: py, r: 5, fill: 'var(--accent-2)', stroke: 'var(--surface)', 'stroke-width': 1.5 }));
        const C = Math.PI * d;
        if (t >= 1) { const xe = x0 + R + C * U1; g.appendChild(svg('text', { x: Math.min(xe, 300), y: y - 2 * R - 12, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: 'var(--accent-2)', 'font-family': 'inherit', text: '≈ 3.14d' })); }
        texInto(api, read, t >= 1 ? `$C = \\pi d \\approx 3.14 \\times ${d} = ${U.fmt(U.round(3.14 * d, 2))}$` : `$\\text{rolled } ${U.fmt(U.round(t * C, 2))} \\text{ units} = ${U.fmt(U.round(t * Math.PI, 2))}\\,d$`);
      }
      function drawA() {
        const r = 56, cx = 170, cy = 115, w = 2 * Math.PI * r / n;
        const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        const sx = cx - (Math.PI * r + w / 2) / 2 + w / 2;
        for (let k = 0; k < n; k++) {
          const up = k % 2 === 0;                  // even: apex on top, arc below
          const r0 = k * 2 * Math.PI / n, base = up ? Math.PI : 0;
          const r1 = base + 2 * Math.PI * Math.round((r0 - base) / (2 * Math.PI));
          const ex = sx + k * w / 2, ey = up ? cy - r / 2 : cy + r / 2;
          const ox = cx + (ex - cx) * e, oy = cy + (ey - cy) * e, rot = r0 + (r1 - r0) * e;
          const a0 = -Math.PI / 2 - Math.PI / n + rot, a1 = -Math.PI / 2 + Math.PI / n + rot;
          g.appendChild(svg('path', { d: `M${ox} ${oy} L${ox + r * Math.cos(a0)} ${oy + r * Math.sin(a0)} A${r} ${r} 0 0 1 ${ox + r * Math.cos(a1)} ${oy + r * Math.sin(a1)} Z`,
            fill: k % 2 ? 'var(--accent)' : 'var(--accent-2)', 'fill-opacity': 0.8, stroke: 'var(--surface)', 'stroke-width': 1, 'stroke-linejoin': 'round' }));
        }
        if (t >= 1) {
          const L = sx - w / 2, R = sx + n * w / 2 - w / 2;
          g.appendChild(svg('line', { x1: L, y1: cy + r / 2 + 12, x2: R, y2: cy + r / 2 + 12, stroke: 'var(--ink)', 'stroke-width': 1.5 }));
          g.appendChild(svg('text', { x: (L + R) / 2, y: cy + r / 2 + 28, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: 'var(--ink)', 'font-family': 'inherit', text: '≈ half of the circumference = πr' }));
          g.appendChild(svg('line', { x1: L - 10, y1: cy - r / 2, x2: L - 10, y2: cy + r / 2, stroke: 'var(--ink)', 'stroke-width': 1.5 }));
          g.appendChild(svg('text', { x: L - 16, y: cy + 5, 'text-anchor': 'end', 'font-size': 14, 'font-style': 'italic', 'font-weight': 700, fill: 'var(--ink)', 'font-family': 'inherit', text: 'r' }));
        }
        texInto(api, read, t >= 1 ? '$A \\approx \\pi r \\times r = \\pi r^2$' : t > 0 ? '$\\text{rearranging…}$' : `$\\text{a circle cut into } ${n} \\text{ wedges}$`);
      }
      el.append(h('div', { class: 'lab-row', style: { justifyContent: 'center' } }, tC, tA), S, read, lab, h('div', { class: 'lab-row', style: { justifyContent: 'center' } }, go), tryEl);
      sync();
      return () => { dead = true; cancelAnimationFrame(raf); };
    }
  };

  // ======================================================================
  MQ.registerTrack({
    id: 'g7', title: 'Grade 7', subtitle: 'Integers, proportions, percents, equations & circles',
    skills: [
      { id: 'g7-integers', title: 'Integers & rational numbers', strand: 'Number System', ccss: '7.NS.A.1–3', blurb: 'Add, subtract, multiply and divide positive and negative numbers, fractions and decimals.', lab: 'g7-integer-chips', generate: genIntegers },
      { id: 'g7-proportions', title: 'Proportional relationships', strand: 'Ratios & Proportions', ccss: '7.RP.A.1–2', blurb: 'Find unit rates and the constant of proportionality from tables, equations and graphs.', lab: 'g7-double-line', generate: genProportions },
      { id: 'g7-percent', title: 'Percent problems', strand: 'Ratios & Proportions', ccss: '7.RP.A.3', blurb: 'Discounts, tax, tips, percent change, and simple interest.', lab: 'g7-double-line', generate: genPercent },
      { id: 'g7-equations', title: 'Two-step equations & inequalities', strand: 'Expressions & Equations', ccss: '7.EE.B.4', blurb: 'Solve equations like 3x + 4 = 19 and inequalities, and write them from word problems.', lab: 'g7-balance', generate: genEquations },
      { id: 'g7-circles', title: 'Circumference & area of circles', strand: 'Geometry', ccss: '7.G.B.4', blurb: 'Use π to find the distance around and the area inside circles and shapes made from them.', lab: 'g7-circle-unroll', generate: genCircles }
    ],
    labs: [balanceLab, chipsLab, doubleLab, circleLab]
  });
})();
