/* MathQuest voice: cheers and callouts spoken with the device's built-in text-to-speech.
   No audio files: uses the Web Speech API and picks the most natural English voice available. */
(function () {
  'use strict';
  const synth = window.speechSynthesis;
  const supported = !!(synth && window.SpeechSynthesisUtterance);
  let enabled = true, voice = null, lastAt = 0, lastLine = '', chosenName = '';
  // American English only. Natural-sounding US voices first (names differ by device and browser).
  const US = (v) => /^en[-_]US$/i.test(v.lang);
  const NOT_US = /Daniel|Karen|Moira|Tessa|Rishi|Veena|Fiona|Serena|Hazel|Libby|Sonia|Ryan|Arthur|Martha|Catherine|Gordon|UK English|British|Australia|Ireland|India|Scotland|South Africa/i;
  const PREFERRED = [/^Samantha/i, /Ava.*(Premium|Enhanced)/i, /Zoe.*(Premium|Enhanced)/i, /(Premium|Enhanced)/i, /Google US English/i, /(Aria|Jenny|Ana|Michelle|Emma).*Natural/i, /Natural/i, /^(Ava|Allison|Susan|Zoe|Nicky|Joelle|Evan|Tom|Alex)\b/i, /Zira|Aria|Jenny|David|Mark/i];
  function usVoices() {
    if (!supported) return [];
    return synth.getVoices().filter((v) => US(v) && !NOT_US.test(v.name));
  }
  function pickVoice() {
    const vs = usVoices();
    if (chosenName) { const c = vs.find((v) => v.name === chosenName); if (c) return c; }
    for (const re of PREFERRED) { const v = vs.find((x) => re.test(x.name)); if (v) return v; }
    return vs[0] || null; // none found: speak with lang en-US and let the device pick its US voice
  }
  if (supported) {
    voice = pickVoice();
    try { synth.addEventListener('voiceschanged', () => { voice = pickVoice(); }); } catch (e) { synth.onvoiceschanged = () => { voice = pickVoice(); }; }
  }

  // priority 1: everyday cheers (skipped if something is still being said)
  // priority 2: big moments (interrupts whatever is playing)
  function say(text, opts = {}) {
    if ((!enabled && !opts.force) || !supported || !text) return;
    const { priority = 1, delay = 0, pitch = 1.1, rate = 1.04 } = opts;
    setTimeout(() => {
      try {
        if (priority < 2 && synth.speaking && Date.now() - lastAt < 2500) return;
        if (priority >= 2 || synth.speaking) synth.cancel();
        const u = new SpeechSynthesisUtterance(text);
        if (!voice) voice = pickVoice();
        u.lang = 'en-US'; if (voice) u.voice = voice;
        u.pitch = Math.min(pitch, 1.18); u.rate = rate; u.volume = 1;
        // Duck the sound effects while the voice talks so it is easy to hear; full volume always.
        const G = window.MathQuestGame;
        u.onstart = () => { if (G && G.duck) G.duck(true); if (opts.onstart) opts.onstart(); };
        u.onend = u.onerror = () => { if (G && G.duck && !synth.pending) G.duck(false); if (opts.onend) opts.onend(); };
        synth.speak(u); lastAt = Date.now();
        if (window.__MQ_TEST__) (window.__MQ_TEST__.said = window.__MQ_TEST__.said || []).push(text);
      } catch (e) { /* speech not available here */ }
    }, delay);
  }

  // ---------- Reading math out loud ----------
  const ORD = { 2: ['half', 'halves'], 3: ['third', 'thirds'], 4: ['fourth', 'fourths'], 5: ['fifth', 'fifths'], 6: ['sixth', 'sixths'], 7: ['seventh', 'sevenths'], 8: ['eighth', 'eighths'], 9: ['ninth', 'ninths'], 10: ['tenth', 'tenths'], 12: ['twelfth', 'twelfths'] };
  function fracWords(a, b) {
    a = a.trim(); b = b.trim();
    if (/^\d+$/.test(a) && /^\d+$/.test(b) && ORD[+b] && +a <= 20) return ` ${a === '1' ? 'one' : a} ${+a === 1 ? ORD[+b][0] : ORD[+b][1]} `;
    return ` ${a} over ${b} `;
  }
  // Turn LaTeX (the part between $...$) into words a speech engine reads well.
  function latexToWords(t) {
    t = ' ' + t + ' ';
    t = t.replace(/\\left|\\right|\\displaystyle|\\[,;:! ]|~/g, ' ');
    t = t.replace(/\\(?:text|mathrm|textbf|mathbf|operatorname)\{([^{}]*)\}/g, ' $1 ');
    t = t.replace(/\\\$\s*([\d,]+(?:\.\d+)?)/g, ' $1 dollars ');
    for (let i = 0; i < 6 && /\\[dt]?frac/.test(t); i++) t = t.replace(/(\d+)\s*\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}/g, (m, w, a, b) => ` ${w} and ${fracWords(a, b)}`).replace(/\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}/g, (m, a, b) => fracWords(a, b));
    t = t.replace(/\\sqrt\[3\]\{([^{}]*)\}/g, ' cube root of $1 ').replace(/\\sqrt\{([^{}]*)\}/g, ' square root of $1 ').replace(/\\sqrt\s*(\d+)/g, ' square root of $1 ');
    t = t.replace(/\\overleftrightarrow\{([^{}]*)\}/g, ' line $1 ').replace(/\\overrightarrow\{([^{}]*)\}/g, ' ray $1 ').replace(/\\overline\{([^{}]*)\}/g, ' segment $1 ');
    t = t.replace(/\^\s*\{?\\circ\}?/g, ' degrees ').replace(/\^\s*\{?2\}?(?![\d])/g, ' squared ').replace(/\^\s*\{?3\}?(?![\d])/g, ' cubed ').replace(/\^\s*\{([^{}]*)\}/g, ' to the power of $1 ').replace(/\^\s*(\w)/g, ' to the power of $1 ');
    t = t.replace(/_\{([^{}]*)\}/g, ' sub $1 ').replace(/_(\w)/g, ' sub $1 ');
    const W = [[/\\times|\\cdot/g, ' times '], [/\\div/g, ' divided by '], [/\\pm/g, ' plus or minus '], [/\\(?:leq|le)\b/g, ' is less than or equal to '], [/\\(?:geq|ge)\b/g, ' is greater than or equal to '], [/\\(?:neq|ne)\b/g, ' is not equal to '], [/\\approx/g, ' is about '], [/\\cong/g, ' is congruent to '], [/\\sim/g, ' is similar to '], [/\\parallel/g, ' is parallel to '], [/\\perp/g, ' is perpendicular to '], [/\\angle/g, ' angle '], [/\\triangle/g, ' triangle '], [/\\pi/g, ' pi '], [/\\theta/g, ' theta '], [/\\infty/g, ' infinity '], [/\\%/g, ' percent '], [/\\(?:square|Box)/g, ' blank '], [/\\(?:ldots|dots|cdots)/g, ' and so on '], [/\\(?:to|rightarrow|mapsto|Rightarrow)/g, ' becomes '], [/\\(?:lt)\b/g, ' is less than '], [/\\(?:gt)\b/g, ' is greater than '], [/\\circ/g, ' degrees ']];
    for (const [re, w] of W) t = t.replace(re, w);
    t = t.replace(/(\w)\s*'/g, '$1 prime ');
    t = t.replace(/\\[a-zA-Z]+/g, ' ').replace(/[{}]/g, ' ');
    t = t.replace(/\s*<\s*/g, ' is less than ').replace(/\s*>\s*/g, ' is greater than ').replace(/=/g, ' equals ');
    // minus vs negative
    t = t.replace(/(^|[(\[,]|equals|times|divided by|over|than|to|plus|minus|and|of|becomes)\s*[-−]\s*/g, '$1 negative ');
    t = t.replace(/\s*[-−]\s*/g, ' minus ').replace(/\+/g, ' plus ');
    t = t.replace(/\b([A-Z])([A-Z])([A-Z])?\b/g, (m, a, b, c) => [a, b, c].filter(Boolean).join(' '));
    t = t.replace(/\b([A-Z]'?(?: prime)?)\s*\(\s*([^()]+?)\s*,\s*([^()]+?)\s*\)/g, ' $1 at $2 comma $3 ').replace(/\(\s*([^()]+?)\s*,\s*([^()]+?)\s*\)/g, ' the point $1 comma $2 ');
    t = t.replace(/\(\s*/g, ' (').replace(/\s*\)/g, ') ');
    return t.replace(/\s+/g, ' ').trim();
  }
  // Prompt HTML with $math$ → plain spoken sentence.
  function speakMath(html) {
    if (!html) return '';
    let s = String(html).replace(/<svg[\s\S]*?<\/svg>/gi, ' (picture) ');
    s = s.replace(/\$((?:\\\$|[^$])+)\$/g, (m, tex) => ' ' + latexToWords(tex) + ' ');
    s = s.replace(/<br\s*\/?>|<\/p>|<\/tr>|<\/li>/gi, '. ').replace(/<\/t[dh]>/gi, ', ').replace(/<[^>]+>/g, ' ');
    try { const d = document.createElement('textarea'); d.innerHTML = s; s = d.value; } catch (e) { /* not in a browser */ }
    s = s.replace(/°/g, ' degrees ').replace(/degrees\s*[-–]\s*/g, 'degrees, ').replace(/□|_{2,}/g, ' blank ').replace(/×/g, ' times ').replace(/÷/g, ' divided by ').replace(/°/g, ' degrees ').replace(/−(?=\d)/g, 'negative ');
    return s.replace(/\s+([.,?!])/g, '$1').replace(/([.,])\1+/g, '$1').replace(/\s+/g, ' ').trim();
  }
  function pick(list) {
    let s, tries = 0;
    do { s = list[Math.floor(Math.random() * list.length)]; } while (s === lastLine && ++tries < 5);
    lastLine = s; return s;
  }
  const LINES = {
    correct: ['Good job!', 'Well done!', 'Woo hoo!', 'Nice!', 'Awesome!', 'You got it!', 'Great thinking!', 'Yes!', 'Boom!', 'Nailed it!', 'Super!', 'Way to go!', 'Brilliant!', 'Correct!'],
    wrong: ['Almost! Let’s check it.', 'Nice try!', 'So close!', 'Oops! You’ll get the next one.', 'Let’s look at this one together.'],
    combo: { 2: 'Double!', 3: 'Triple!', 4: 'On fire!' },
    unstoppable: ['Unstoppable!', 'Unstoppable! Woo hoo!', 'You’re on a roll!'],
    victory: ['Victory! Well done, {name}!', 'Lesson complete! Great job, {name}!', 'Victory! Woo hoo!'],
    flawless: ['Flawless victory! Woo hoo!', 'Perfect lesson, {name}! Amazing!'],
    effort: ['Nice effort, {name}! Keep going!'],
    goal: ['Daily goal complete!'],
    streak: ['{n} day streak! Keep it going!', 'Your streak is {n} days! Woo hoo!'],
    streakFirst: ['Day one of your streak! See you tomorrow!'],
    arena: ['New arena! {arena}!', 'Level up! Welcome to {arena}!'],
    rarity: { 1: 'Super rare!', 2: 'Epic!', 3: 'Mythic!', 4: 'Legendary!' },
    reward: ['You got {thing}!', 'Woo hoo! {thing}!'],
    gems: ['Woo hoo! {n} gems!', '{n} gems! Nice!'],
    unlock: ['Reward unlocked!', 'Woo hoo! New reward!'],
    hello: ['Hi {name}! Ready to play?', 'Welcome back, {name}!', 'Let’s go, {name}!'],
    quit: ['Wait, don’t go!'],
    crown: ['New crown! Level {n}!'],
    mastered: ['Skill mastered! Woo hoo!']
  };
  function fill(s, vars) { return s.replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] != null ? vars[k] : '')); }
  function line(kind, vars, opts) {
    const L = LINES[kind]; if (!L) return;
    const text = Array.isArray(L) ? pick(L) : L[vars && vars.key];
    if (text) say(fill(text, vars), opts);
  }
  window.MathQuestVoice = {
    supported, say, line, speakMath, latexToWords,
    stop() { try { if (supported) synth.cancel(); } catch (e) { /* ignore */ } },
    // Parent view: list the American voices on this device and remember a choice.
    voices: () => usVoices().map((v) => v.name),
    get current() { return voice ? voice.name : ''; },
    choose(name) { chosenName = name || ''; voice = pickVoice(); },
    setEnabled(v) { enabled = !!v; if (!enabled && supported) try { synth.cancel(); } catch (e) { /* ignore */ } },
    get enabled() { return enabled; }
  };
})();
