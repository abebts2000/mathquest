/* MathQuest voice: cheers and callouts spoken with the device's built-in text-to-speech.
   No audio files: uses the Web Speech API and picks the most natural English voice available. */
(function () {
  'use strict';
  const synth = window.speechSynthesis;
  const supported = !!(synth && window.SpeechSynthesisUtterance);
  let enabled = true, voice = null, lastAt = 0, lastLine = '';
  // Natural-sounding voices first (names differ by device and browser).
  const PREFERRED = [/Samantha/i, /Ava \(Premium|Enhanced\)/i, /Google US English/i, /Jenny.*Natural|Aria.*Natural|Ana.*Natural/i, /Natural/i, /Premium|Enhanced/i, /Allison|Ava|Susan|Karen|Moira|Tessa|Zira|Joanna/i];
  function pickVoice() {
    if (!supported) return null;
    const vs = synth.getVoices().filter((v) => /^en([-_]|$)/i.test(v.lang));
    for (const re of PREFERRED) { const v = vs.find((x) => re.test(x.name)); if (v) return v; }
    return vs.find((v) => /en[-_]US/i.test(v.lang)) || vs[0] || null;
  }
  if (supported) {
    voice = pickVoice();
    try { synth.addEventListener('voiceschanged', () => { voice = pickVoice(); }); } catch (e) { synth.onvoiceschanged = () => { voice = pickVoice(); }; }
  }

  // priority 1: everyday cheers (skipped if something is still being said)
  // priority 2: big moments (interrupts whatever is playing)
  function say(text, opts = {}) {
    if (!enabled || !supported || !text) return;
    const { priority = 1, delay = 0, pitch = 1.22, rate = 1.06 } = opts;
    setTimeout(() => {
      try {
        if (priority < 2 && synth.speaking && Date.now() - lastAt < 2500) return;
        if (priority >= 2 || synth.speaking) synth.cancel();
        const u = new SpeechSynthesisUtterance(text);
        if (voice) { u.voice = voice; u.lang = voice.lang; } else u.lang = 'en-US';
        u.pitch = pitch; u.rate = rate; u.volume = 1;
        synth.speak(u); lastAt = Date.now();
        if (window.__MQ_TEST__) (window.__MQ_TEST__.said = window.__MQ_TEST__.said || []).push(text);
      } catch (e) { /* speech not available here */ }
    }, delay);
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
    supported, say, line,
    setEnabled(v) { enabled = !!v; if (!enabled && supported) try { synth.cancel(); } catch (e) { /* ignore */ } },
    get enabled() { return enabled; }
  };
})();
