(function () {
  const { util } = MathQuest;
  MathQuest.registerTrack({
    id: 'smp', title: 'Sample', subtitle: 'Harness self-test',
    skills: [1, 2, 3, 4, 5].map((k) => ({
      id: 'smp-add' + k, title: 'Add ' + k, strand: 'Ops', ccss: 'X.0', blurb: 'Add numbers.', lab: 'smp-lab',
      generate(rng, level) {
        const a = rng.int(1, 10 * level * k), b = rng.int(1, 10 * level);
        if (rng.bool()) {
          const c = util.choicesFrom(a + b, [a + b + 1, a + b - 1, a * b, a + b + 10], rng);
          return { prompt: `Which is $${a} + ${b}$?`, input: { type: 'choice', options: c.options }, answer: c.answer, explanation: [`$${a}+${b}=${a + b}$`] };
        }
        return { prompt: `What is $${a} + ${b}$?`, input: { type: 'number' }, answer: a + b, explanation: [`Add: $${a}+${b}=${a + b}$`] };
      }
    })),
    labs: [{ id: 'smp-lab', title: 'Sample lab', blurb: 'x', mount(el, api) { el.appendChild(api.h('p', { text: 'hello' })); } }]
  });
})();
