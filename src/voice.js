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
  const KID = /\bAna\b|Junior Natural|Child/i; // Microsoft Edge ships a natural child voice called Ana
  const PREFERRED = [/Ana.*(Natural|Online)/i, /Ava.*(Premium|Enhanced)/i, /Zoe.*(Premium|Enhanced)/i, /(Jenny|Aria|Emma|Michelle).*Natural/i, /Google US English/i, /(Premium|Enhanced)/i, /Natural/i, /^Samantha/i, /Ava.*(Premium|Enhanced)/i, /Zoe.*(Premium|Enhanced)/i, /(Premium|Enhanced)/i, /Google US English/i, /(Aria|Jenny|Ana|Michelle|Emma).*Natural/i, /Natural/i, /^(Ava|Allison|Susan|Zoe|Nicky|Joelle|Evan|Tom|Alex)\b/i, /Zira|Aria|Jenny|David|Mark/i];
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
  // Persona: the current mascot's voice settings (set by the app). Kid voices need no pitch lift;
  // adult voices get lifted and sped up a little so they sound like an excited middle-schooler.
  let persona = { pitch: 0, rate: 0 };
  function setPersona(p) { persona = Object.assign({ pitch: 0, rate: 0 }, p || {}); }
  const jitter = (n) => (Math.random() - 0.5) * n;
  // Break into short phrases and give each its own pitch and pace, so it sounds lively instead of flat.
  function phrases(text) {
    const out = String(text).match(/[^.!?]+[.!?]*/g) || [String(text)];
    return out.map((x) => x.trim()).filter(Boolean);
  }
  function say(text, opts = {}) {
    if ((!enabled && !opts.force) || !supported || !text) return;
    const { priority = 1, delay = 0, pitch = 1.1, rate = 1.04 } = opts;
    setTimeout(() => {
      try {
        if (priority < 2 && synth.speaking && Date.now() - lastAt < 2500) return;
        if (priority >= 2 || synth.speaking) synth.cancel();
        if (!voice) voice = pickVoice();
        const kid = voice && KID.test(voice.name);
        const basePitch = kid ? pitch - 0.1 : pitch + 0.12, baseRate = rate + 0.06;
        const parts = opts.flat ? [text] : phrases(text);
        const G = window.MathQuestGame;
        parts.forEach((part, i) => {
          const u = new SpeechSynthesisUtterance(part);
          u.lang = 'en-US'; if (voice) u.voice = voice;
          const excited = /!$/.test(part);
          u.pitch = Math.max(0.6, Math.min(1.6, basePitch + persona.pitch + (excited ? 0.08 : 0) + (opts.flat ? 0 : jitter(0.14))));
          u.rate = Math.max(0.7, Math.min(1.35, baseRate + persona.rate + (excited ? 0.05 : 0) + (opts.flat ? 0 : jitter(0.08))));
          u.volume = 1;
          // Duck the sound effects while the voice talks so it is easy to hear; full volume always.
          if (i === 0) u.onstart = () => { if (G && G.duck) G.duck(true); if (opts.onstart) opts.onstart(); };
          if (i === parts.length - 1) u.onend = u.onerror = () => { if (G && G.duck && !synth.pending) G.duck(false); if (opts.onend) opts.onend(); };
          synth.speak(u);
        });
        lastAt = Date.now();
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
    correct: ['Yesss! Nailed it!', 'Let’s gooo!', 'Ooh, that was clean!', 'Boom! You got it!', 'Woo hoo!', 'Big brain move!', 'Okay, you’re cooking!', 'Nice one!', 'Too easy for you!', 'That was quick!', 'Yes! Keep it rolling!', 'You’re so good at this!', 'Heck yeah!', 'Smooth!', 'Good job!', 'Well done!'],
    wrong: ['Ahh, so close! Let’s check it.', 'Oof, almost! Watch this.', 'No worries, we got the next one!', 'Hmm, not quite. Let’s look together.', 'Close one! Here’s the trick.'],
    combo: { 2: 'Double! Let’s go!', 3: 'Triple! You’re on a roll!', 4: 'On fire! Whoa!' },
    unstoppable: ['Unstoppable! Woo hoo!', 'Five in a row! Insane!', 'You can’t be stopped right now!'],
    victory: ['Victory! Way to go, {name}!', 'Let’s gooo! Lesson complete, {name}!', 'Victory! That was awesome!'],
    flawless: ['Flawless victory! No mistakes! Woo hoo!', 'Perfect lesson, {name}! That’s legendary!'],
    effort: ['Nice effort, {name}! We’ll get it next time!'],
    goal: ['Daily goal done! You crushed it!'],
    streak: ['{n} day streak! Keep the fire going!', 'Your streak is {n} days! Woo hoo!'],
    streakFirst: ['Day one of your streak! See you tomorrow!'],
    arena: ['Whoa! New arena! {arena}!', 'Level up! Welcome to {arena}!'],
    rarity: { 1: 'Ooh, super rare!', 2: 'Epic!', 3: 'Whoa, mythic!', 4: 'Legendary! No way!' },
    reward: ['You got {thing}!', 'Woo hoo! {thing}!'],
    gems: ['Woo hoo! {n} gems!', '{n} gems! Let’s go!'],
    unlock: ['Reward unlocked!', 'Ooh, new reward!'],
    hello: ['Hey {name}! Ready to play?', 'Welcome back, {name}! Let’s do this!', 'Yo {name}! Let’s get some wins!'],
    quit: ['Wait, don’t go yet!'],
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
    supported, say, line, speakMath, latexToWords, setPersona,
    get isKidVoice() { if (!voice) voice = pickVoice(); return !!(voice && KID.test(voice.name)); },
    stop() { try { if (supported) synth.cancel(); } catch (e) { /* ignore */ } },
    // Parent view: list the American voices on this device and remember a choice.
    voices: () => usVoices().map((v) => v.name),
    get current() { return voice ? voice.name : ''; },
    choose(name) { chosenName = name || ''; voice = pickVoice(); },
    setEnabled(v) { enabled = !!v; if (!enabled && supported) try { synth.cancel(); } catch (e) { /* ignore */ } },
    get enabled() { return enabled; }
  };
})();
