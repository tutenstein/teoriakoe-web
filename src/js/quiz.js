// Liikennemerkkitesti: 10 picture questions with four names each. Runs fully
// in the browser; results are never written to the URL or sent anywhere.
(() => {
  const root = document.querySelector('[data-quiz]');
  if (!root) return;
  const QUESTIONS = 10;
  const startButton = root.querySelector('[data-start]');
  const groupSelect = root.querySelector('#quiz-group');
  const storeLinks = document.querySelector('.cta .stores');
  let data = null;
  let state = null;

  const el = (tag, attrs = {}, ...children) => {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (key === 'class') node.className = value;
      else if (key === 'text') node.textContent = value;
      else node.setAttribute(key, value);
    }
    node.append(...children);
    return node;
  };
  const shuffle = (list) => {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };
  const sign = ([code, name, src, width, height, group, desc, url]) => ({ code, name, src, width, height, group, desc, url });
  const image = (s, alt) => el('span', { class: 'tile' }, el('img', { src: s.src, width: s.width, height: s.height, alt }));

  fetch(root.dataset.src)
    .then((res) => res.json())
    .then((json) => {
      data = { groups: json.groups, signs: json.signs.map(sign) };
      startButton.disabled = false;
    });

  function start() {
    const group = groupSelect.value;
    const pool = data.signs.filter((s) => !group || s.group === group);
    const picked = shuffle(pool).slice(0, QUESTIONS);
    state = {
      questions: picked.map((answer) => {
        const sameGroup = data.signs.filter((s) => s.group === answer.group && s.name !== answer.name);
        const others = sameGroup.length >= 3 ? sameGroup : data.signs.filter((s) => s.name !== answer.name);
        const distractors = [];
        for (const s of shuffle(others)) {
          if (!distractors.some((d) => d.name === s.name)) distractors.push(s);
          if (distractors.length === 3) break;
        }
        return { answer, options: shuffle([answer, ...distractors]) };
      }),
      index: 0,
      mistakes: []
    };
    renderQuestion();
  }

  function card(...children) {
    root.textContent = '';
    const node = el('div', { class: 'quiz-card' }, ...children);
    root.append(node);
    return node;
  }

  function renderQuestion() {
    const { questions, index } = state;
    const q = questions[index];
    const heading = el('p', { class: 'quiz-q', tabindex: '-1', text: 'Mikä merkki on kyseessä?' });
    const bar = el('span');
    bar.style.width = `${(index / questions.length) * 100}%`;
    const list = el('ul', { class: 'options' });
    const feedback = el('div', { 'aria-live': 'polite' });
    const actions = el('div', { class: 'quiz-actions' });
    for (const option of q.options) {
      const button = el('button', { class: 'option', type: 'button', text: option.name });
      button.addEventListener('click', () => answer(q, option, list, feedback, actions));
      list.append(el('li', {}, button));
    }
    card(
      el('div', { class: 'quiz-progress' }, el('span', { text: `Kysymys ${index + 1}/${questions.length}` }), el('span', { text: `Oikein ${index - state.mistakes.length}` })),
      el('div', { class: 'quiz-bar', 'aria-hidden': 'true' }, bar),
      image(q.answer, 'Tunnistettava liikennemerkki'),
      heading,
      list,
      feedback,
      actions
    );
    heading.focus();
  }

  function answer(q, chosen, list, feedback, actions) {
    const right = chosen === q.answer;
    list.querySelectorAll('button').forEach((button, i) => {
      button.disabled = true;
      if (q.options[i] === q.answer) button.classList.add('correct');
      else if (q.options[i] === chosen) button.classList.add('wrong');
    });
    if (!right) state.mistakes.push(q.answer);
    const info = q.answer.desc || `Ryhmä ${q.answer.group}: ${data.groups[q.answer.group]}.`;
    feedback.className = `feedback ${right ? 'ok' : 'no'}`;
    feedback.append(
      el('p', {}, el('strong', { text: right ? 'Oikein! ' : `Väärin. Oikea vastaus: ${q.answer.name} (${q.answer.code}). ` })),
      el('p', { text: info }),
      el('p', {}, el('a', { href: q.answer.url, text: `Lue lisää merkistä ${q.answer.code}` }))
    );
    const last = state.index === state.questions.length - 1;
    const next = el('button', { class: 'btn btn-primary', type: 'button', text: last ? 'Näytä tulos' : 'Seuraava kysymys' });
    next.addEventListener('click', () => {
      state.index++;
      if (last) renderResult();
      else renderQuestion();
    });
    actions.append(next);
    next.focus();
  }

  function renderResult() {
    const total = state.questions.length;
    const score = total - state.mistakes.length;
    const verdict =
      score === total ? 'Täydet pisteet. Merkit ovat hallussa.' : score >= 8 ? 'Hyvä tulos. Kertaa vielä alla olevat merkit.' : score >= 5 ? 'Puolet jo osaat. Kertaa virheet ja yritä uudelleen.' : 'Merkeissä on vielä opittavaa. Kertaa ryhmä kerrallaan ja tee testi uudelleen.';
    const heading = el('p', { class: 'quiz-q', tabindex: '-1', text: 'Tuloksesi' });
    const children = [heading, el('p', { class: 'score', text: `${score}/${total}` }), el('p', { text: verdict })];
    if (state.mistakes.length) {
      const list = el('ul', { class: 'mistakes' });
      for (const s of state.mistakes) list.append(el('li', {}, el('img', { src: s.src, width: s.width, height: s.height, alt: '' }), el('a', { href: s.url, text: `${s.code} ${s.name}` })));
      children.push(el('p', {}, el('strong', { text: 'Kertaa nämä merkit' })), list);
    }
    const again = el('button', { class: 'btn btn-primary', type: 'button', text: 'Uusi testi' });
    again.addEventListener('click', start);
    children.push(
      el('div', { class: 'quiz-cta' },
        el('p', {}, el('strong', { text: '989 tehtävää ja harjoituskoe sovelluksessa' })),
        el('p', { text: 'Teoriakoe FI -sovelluksessa harjoittelet liikennemerkkien lisäksi sääntö-, kuva- ja riskientunnistustehtäviä sekä koko harjoituskoetta.' }),
        storeLinks ? storeLinks.cloneNode(true) : ''
      ),
      el('div', { class: 'quiz-actions' }, again)
    );
    card(...children);
    heading.focus();
  }

  startButton.addEventListener('click', start);
})();
