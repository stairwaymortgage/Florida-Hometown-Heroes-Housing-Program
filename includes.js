/* ============================================================
   INCLUDES.JS — Auto-loads header.html / footer.html into pages
   ============================================================ */

(function () {
  'use strict';

  async function loadInclude(el) {
    const variant = el.dataset.include;
    if (!variant) return;
    try {
      const response = await fetch(`${variant}.html`);
      if (!response.ok) throw new Error(`${variant}.html → ${response.status}`);
      const html = await response.text();
      const wrapper = document.createElement('div');
      wrapper.innerHTML = html;
      const parent = el.parentNode;
      while (wrapper.firstChild) parent.insertBefore(wrapper.firstChild, el);
      parent.removeChild(el);
    } catch (err) {
      console.error(`Failed to load ${variant}.html:`, err);
      el.innerHTML = `<!-- include failed: ${variant}.html -->`;
    }
  }

  function highlightActiveLink() {
    let p = window.location.pathname.split('/').pop();
    if (!p || p === '') p = 'index.html';
    if (!p.includes('.')) p = p + '.html';
    document.querySelectorAll('nav.site-nav a').forEach(link => {
      if (link.getAttribute('href') === p) link.classList.add('nav-active');
    });
  }

  async function init() {
    const placeholders = document.querySelectorAll('[data-include]');
    await Promise.all(Array.from(placeholders).map(loadInclude));
    highlightActiveLink();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
