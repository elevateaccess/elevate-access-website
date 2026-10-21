'use strict';
const rootElement = document.documentElement;
rootElement.classList.add('js');

// Show the custom focus ring only for genuine keyboard navigation. Touch-based
// assistive technology supplies its own cursor and may leave DOM focus behind.
const enableKeyboardFocus = event => {
  if (!event.metaKey && !event.altKey && !event.ctrlKey) rootElement.classList.add('keyboard-navigation');
};
const disableKeyboardFocus = () => rootElement.classList.remove('keyboard-navigation');
document.addEventListener('keydown', enableKeyboardFocus, true);
document.addEventListener('pointerdown', disableKeyboardFocus, true);
document.addEventListener('touchstart', disableKeyboardFocus, { capture: true, passive: true });
const menuButton = document.querySelector('.menu-toggle');
const siteNav = document.getElementById('site-navigation');
if (menuButton && siteNav) {
  menuButton.hidden = false;
  const narrow = window.matchMedia('(max-width: 80rem)');
  const setMenu = (open, restoreFocus = false) => {
    siteNav.classList.toggle('is-open', open);
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.textContent = open ? menuButton.dataset.closeLabel : menuButton.dataset.openLabel;
    if (restoreFocus) menuButton.focus();
  };
  menuButton.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && narrow.matches && menuButton.getAttribute('aria-expanded') === 'true') {
      setMenu(false, true);
    }
  });
  narrow.addEventListener('change', () => {
    const focusInNav = siteNav.contains(document.activeElement);
    setMenu(false, narrow.matches && focusInNav);
  });
}

// Native links work without JavaScript. Preserve shared section anchors when available.
const languageLinks = document.querySelectorAll('.language-switcher a');
const syncLanguageAnchors = () => {
  const hash = window.location.hash;
  let target = null;
  try { target = hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null; } catch {}
  languageLinks.forEach(link => {
    const url = new URL(link.href);
    url.hash = target ? hash : '';
    link.href = url.href;
  });
};
syncLanguageAnchors();
window.addEventListener('hashchange', syncLanguageAnchors);
