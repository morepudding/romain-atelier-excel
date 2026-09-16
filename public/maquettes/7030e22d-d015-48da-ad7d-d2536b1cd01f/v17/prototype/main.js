const root = document.documentElement;
const control = document.querySelector('.distance-control');

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

if (control) {
  const setDistance = (distance) => {
    const value = Math.max(0, Math.min(50, Math.round(distance)));
    const progress = value / 50;
    root.style.setProperty('--route-progress', progress.toFixed(3));
    control.setAttribute('aria-valuenow', String(value));
    control.setAttribute(
      'aria-valuetext',
      value === 50
        ? '50 mètres jusqu’à la plage'
        : `${value} mètres parcourus sur 50`,
    );
    const label = control.querySelector('.distance-control__marker b');
    if (label) label.textContent = `${value} m`;
  };

  const distanceFromPointer = (event) => {
    const rail = control.querySelector('.distance-control__rail');
    if (!rail) return 50;
    const bounds = rail.getBoundingClientRect();
    return ((event.clientX - bounds.left) / bounds.width) * 50;
  };

  let dragging = false;

  control.addEventListener('pointerdown', (event) => {
    dragging = true;
    control.setPointerCapture(event.pointerId);
    setDistance(distanceFromPointer(event));
  });

  control.addEventListener('pointermove', (event) => {
    if (dragging) setDistance(distanceFromPointer(event));
  });

  control.addEventListener('pointerup', (event) => {
    dragging = false;
    control.releasePointerCapture(event.pointerId);
    window.setTimeout(() => setDistance(50), 420);
  });

  control.addEventListener('pointercancel', () => {
    dragging = false;
    setDistance(50);
  });

  control.addEventListener('keydown', (event) => {
    const current = Number(control.getAttribute('aria-valuenow')) || 0;
    const keys = {
      ArrowLeft: current - 5,
      ArrowDown: current - 5,
      ArrowRight: current + 5,
      ArrowUp: current + 5,
      Home: 0,
      End: 50,
    };

    if (Object.hasOwn(keys, event.key)) {
      event.preventDefault();
      setDistance(keys[event.key]);
    }
  });
}
