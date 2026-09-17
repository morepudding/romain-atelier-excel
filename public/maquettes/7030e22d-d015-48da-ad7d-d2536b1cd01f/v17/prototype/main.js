const root = document.documentElement;
root.classList.add('js');

try {
  if (sessionStorage.getItem('les-touristes-intro-v3') === 'seen') {
    root.classList.add('intro-seen');
  } else {
    window.setTimeout(() => {
      sessionStorage.setItem('les-touristes-intro-v3', 'seen');
    }, 2100);
  }
} catch {
  // L'introduction CSS reste autonome si le stockage est indisponible.
}

const form = document.querySelector('#stay-form');
const status = document.querySelector('.stay-form__status');

form?.addEventListener('submit', (event) => {
  event.preventDefault();

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  status.textContent = 'Prototype : aucune demande n’a été envoyée.';
});

const rooms = document.querySelectorAll('.room');

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.24 },
  );

  rooms.forEach((room) => observer.observe(room));
} else {
  rooms.forEach((room) => room.classList.add('is-visible'));
}
