// Menu toggle, store links and the dismissible mobile download bar.
(() => {
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.getElementById('site-nav');
  if (toggle && nav) {
    toggle.setAttribute('role', 'button');
    const setOpen = (open) => {
      nav.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
    };
    toggle.addEventListener('click', (event) => {
      event.preventDefault();
      const open = !nav.classList.contains('open');
      setOpen(open);
      if (open) nav.querySelector('a')?.focus();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && nav.classList.contains('open')) {
        setOpen(false);
        toggle.focus();
      }
    });
    document.addEventListener('click', (event) => {
      if (nav.classList.contains('open') && !nav.contains(event.target) && !toggle.contains(event.target)) setOpen(false);
    });
  }

  // Generic download buttons go straight to the visitor's own store.
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const platform = ios ? 'ios' : /Android/.test(ua) ? 'android' : null;
  if (platform) {
    for (const link of document.querySelectorAll('a[data-store-auto]')) link.href = link.dataset[platform];
  }

  const bar = document.querySelector('.sticky-cta');
  if (bar) {
    let closed = false;
    try {
      closed = sessionStorage.getItem('cta-closed') === '1';
    } catch {}
    if (closed) bar.hidden = true;
    bar.querySelector('.sticky-cta-close')?.addEventListener('click', () => {
      bar.hidden = true;
      try {
        sessionStorage.setItem('cta-closed', '1');
      } catch {}
    });
  }
})();
