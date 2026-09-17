const intro = document.querySelector('.intro');

if (intro) {
  window.setTimeout(() => {
    intro.setAttribute('aria-hidden', 'true');
  }, 2300);
}
