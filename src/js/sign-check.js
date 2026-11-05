// "Testaa itsesi" on sign pages: one picture question, answer shown on click.
(() => {
  for (const section of document.querySelectorAll('.sign-check')) {
    const buttons = [...section.querySelectorAll('.option')];
    const feedback = section.querySelector('.feedback');
    for (const button of buttons) {
      button.addEventListener('click', () => {
        const right = button.hasAttribute('data-correct');
        for (const b of buttons) {
          b.disabled = true;
          if (b.hasAttribute('data-correct')) b.classList.add('correct');
        }
        if (!right) button.classList.add('wrong');
        feedback.className = `feedback ${right ? 'ok' : 'no'}`;
        feedback.querySelector('p').textContent = right ? feedback.dataset.ok : feedback.dataset.no;
        feedback.hidden = false;
      });
    }
  }
})();
