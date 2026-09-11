'use strict';

// Deux vues illustratives, en attendant les démonstrations de Romain.
const showcase = document.querySelector('.showcase');
const copy = document.querySelector('.slide-copy');
const views = [
  { kicker: 'Du premier message à la prochaine action.', title: 'Une demande.<br><em>La suite est claire.</em>', description: 'Un dossier, un responsable, une prochaine action.<br>Votre équipe sait où elle en est.' },
  { kicker: 'L’assistant prépare. Votre équipe décide.', title: 'Moins de ressaisie.<br><em>Plus de temps utile.</em>', description: 'Les informations sont réunies, la réponse préparée.<br>Vous gardez la main sur la décision.' },
];
let current = 0;
function selectView(index) {
  current = (index + views.length) % views.length;
  const view = views[current];
  showcase.dataset.slide = String(current);
  document.querySelector('#slide-kicker').textContent = view.kicker;
  document.querySelector('#slide-title').innerHTML = view.title;
  document.querySelector('#slide-description').innerHTML = view.description;
  document.querySelector('#slide-number').textContent = String(current + 1).padStart(2, '0');
  document.querySelectorAll('.slide-lines span').forEach((line, index) => line.classList.toggle('selected', index === current));
  copy.classList.remove('is-changing');
  void copy.offsetWidth;
  copy.classList.add('is-changing');
}
document.querySelector('#previous-slide').addEventListener('click', () => selectView(current - 1));
document.querySelector('#next-slide').addEventListener('click', () => selectView(current + 1));
showcase.addEventListener('keydown', event => {
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
    event.preventDefault();
    selectView(current + (event.key === 'ArrowRight' ? 1 : -1));
  }
});
const previewDialog = document.querySelector('#preview-dialog');
document.querySelector('#explore-preview').addEventListener('click', () => {
  const expandedScene = document.querySelector('#expanded-scene');
  expandedScene.replaceChildren(document.querySelector('.app-scene').cloneNode(true));
  previewDialog.dataset.slide = String(current);
  previewDialog.showModal();
});
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', event => {
  const rect = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
}));
const notes = {
  'savoir-faire': ['Des outils et de l’autonomie.', 'Applications métier, assistants et agents IA, automatisations, formations. La section détaillée sera dessinée après validation de ce premier écran.'],
  'a-propos': ['Une place pour vous présenter.', 'Quelques lignes pour expliquer votre approche et votre expérience. Le texte et la mise en page seront travaillés après validation de cette direction.'],
  contact: ['Parlons de votre projet.', 'Le futur contact sera accessible dès l’accueil. Cette maquette présente son emplacement ; les coordonnées et le formulaire seront ajoutés à l’étape suivante.'],
};
document.querySelectorAll('[data-note]').forEach(button => button.addEventListener('click', () => {
  const [title, body] = notes[button.dataset.note];
  document.querySelector('#note-title').textContent = title;
  document.querySelector('#note-body').textContent = body;
  document.querySelector('#note-dialog').showModal();
}));
document.querySelector('#replay-intro').addEventListener('click', () => {
  const intro = document.querySelector('.intro');
  intro.classList.add('replay');
  void intro.offsetWidth;
  intro.classList.remove('replay');
});
