// Sign search. On the hub it filters the sign list in place; on the 404 page
// (input has data-index) it searches a small JSON index of pages and signs.
(() => {
  const input = document.getElementById('sign-search');
  const status = document.getElementById('search-status');
  if (!input) return;
  const fold = (text) => text.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').trim();
  const say = (text) => {
    status.textContent = text;
  };

  if (input.dataset.index) {
    const list = document.getElementById('search-results');
    let index = null;
    const run = async () => {
      const query = fold(input.value);
      if (!index) index = (await (await fetch(input.dataset.index)).json()).map(([title, url]) => [title, url, fold(title)]);
      list.textContent = '';
      if (!query) return say('');
      const hits = index.filter((item) => item[2].includes(query)).slice(0, 12);
      for (const [title, url] of hits) {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = url;
        a.textContent = title;
        li.append(a);
        list.append(li);
      }
      say(hits.length ? `${hits.length} osumaa` : 'Ei osumia. Kokeile toista sanaa.');
    };
    input.addEventListener('input', run);
    return;
  }

  const items = [...document.querySelectorAll('[data-search]')].map((el) => [el, fold(el.dataset.search)]);
  const sections = [...document.querySelectorAll('[data-group-section]')];
  input.addEventListener('input', () => {
    const query = fold(input.value);
    let shown = 0;
    for (const [el, text] of items) {
      const match = !query || text.includes(query);
      el.hidden = !match;
      if (match) shown++;
    }
    for (const section of sections) section.hidden = !section.querySelector('[data-search]:not([hidden])');
    if (!query) say('');
    else say(shown ? `${shown} merkkiä löytyi` : 'Ei osumia. Kokeile merkin tunnusta, esimerkiksi C37.');
  });
})();
