const root = document.documentElement;

try {
  if (sessionStorage.getItem('les-touristes-intro') === 'seen') {
    root.classList.add('intro-seen');
  } else {
    window.setTimeout(
      () => sessionStorage.setItem('les-touristes-intro', 'seen'),
      2200,
    );
  }
} catch {
  // The CSS intro still completes if session storage is unavailable.
}
