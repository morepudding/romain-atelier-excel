'use client';

/* oxlint-disable next/no-html-link-for-pages -- Native links preserve navigation in vinext and work before hydration. */
/* oxlint-disable next/no-img-element -- Local, pre-optimized artwork without an image service. */

import { useEffect, useRef, useState, type MouseEvent } from 'react';
import VraiWordmark from './wordmark';
import './vitrine.css';

const film = '/videos/Maison-Martin_60s_Full-HD.mp4';

export default function Vitrine() {
  const dialog = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [filmOpen, setFilmOpen] = useState(false);
  const [filmError, setFilmError] = useState(false);

  useEffect(() => {
    if (!filmOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [filmOpen]);

  function openFilm(event: MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    if (!dialog.current?.showModal) return;
    event.preventDefault();
    setFilmError(false);
    setFilmOpen(true);
    dialog.current.showModal();
  }

  function closeFilm() {
    video.current?.pause();
    dialog.current?.close();
    setFilmOpen(false);
  }

  return (
    <div className="vrai-site">
      <a className="vrai-skip" href="#contenu">
        Aller au contenu
      </a>
      <div className="vrai-stage">
        <header className="vrai-header">
          <a
            className="vrai-founder"
            href="/"
            aria-label="Vrai Consulting, accueil"
          >
            Romain Bottero <span aria-hidden="true">·</span> Vendée
          </a>
          <nav className="vrai-nav" aria-label="Navigation principale">
            <a href="#demonstrations">Démonstration</a>
            <a href="#a-propos">À propos</a>
          </nav>
          <a className="vrai-contact" href="#a-propos">
            Faisons connaissance <span aria-hidden="true">↗</span>
          </a>
        </header>
        <main id="contenu">
          <section className="vrai-hero" aria-labelledby="vrai-headline">
            <div className="vrai-masthead">
              <div className="vrai-logo-reveal">
                <VraiWordmark />
              </div>
              <p className="vrai-positioning">
                Applications &amp; IA
                <br />
                pour les petites entreprises.
              </p>
            </div>
            <div className="vrai-hero-bottom">
              <div className="vrai-manifesto">
                <h1 id="vrai-headline">
                  De vrais outils.
                  <br />À votre portée.
                </h1>
                <p>
                  Des solutions concrètes, adaptées
                  <br className="vrai-desktop-break" /> à votre métier et à
                  votre budget.
                </p>
              </div>
              <figure className="vrai-feature" id="demonstrations">
                <a
                  className="vrai-art-link"
                  href="/demo/maison-martin"
                  onClick={openFilm}
                  aria-label="Voir la vidéo Maison Martin, 60 secondes"
                  aria-haspopup="dialog"
                >
                  <img
                    className="vrai-art"
                    src="/brand/maison-martin-scene.webp"
                    width={1536}
                    height={1024}
                    fetchPriority="high"
                    alt="Mise en scène du chantier fictif Maison Martin : les notes de l’équipe deviennent un compte rendu à valider."
                  />
                  <span className="vrai-play" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path d="M8 4 21 12 8 20Z" />
                    </svg>
                  </span>
                </a>
                <figcaption className="vrai-feature-caption">
                  <span className="vrai-feature-number" aria-hidden="true">
                    01
                  </span>
                  <a
                    className="vrai-film-link"
                    href="/demo/maison-martin"
                    onClick={openFilm}
                    aria-haspopup="dialog"
                  >
                    <strong>Du terrain au compte rendu.</strong>
                    <span>
                      Maison Martin <span aria-hidden="true">·</span> Voir le
                      film <span aria-hidden="true">↗</span>{' '}
                      <span className="vrai-duration">60 s</span>
                    </span>
                  </a>
                  <span className="vrai-fiction">Scénario fictif</span>
                </figcaption>
              </figure>
            </div>
            <a className="vrai-discover" href="#a-propos">
              Une autre façon de travailler <span aria-hidden="true">↓</span>
            </a>
          </section>
          <section
            className="vrai-about"
            id="a-propos"
            aria-labelledby="vrai-about-title"
          >
            <div className="vrai-about-label">
              <span aria-hidden="true">02 /</span> Faisons connaissance
            </div>
            <div className="vrai-about-content">
              <h2 id="vrai-about-title">
                Les petites entreprises
                <br />
                méritent de bons outils.
              </h2>
              <div className="vrai-about-details">
                <p>
                  Je suis Romain, consultant IA en Vendée, issu du nautisme.
                  J’aime comprendre comment une équipe travaille, puis
                  construire avec elle des outils qui lui servent vraiment.
                </p>
                <p>
                  Une application métier, une tâche à automatiser, des
                  informations à retrouver : on part de votre quotidien et de
                  vos moyens.
                </p>
              </div>
              <a
                className="vrai-about-demo"
                href="/demo/maison-martin"
                onClick={openFilm}
                aria-haspopup="dialog"
              >
                Voir un exemple concret <span aria-hidden="true">↗</span>
              </a>
            </div>
          </section>
        </main>
        <footer className="vrai-footer">
          <a href="/" aria-label="Vrai Consulting, accueil">
            <VraiWordmark />
          </a>
          <span>
            Romain Bottero <span aria-hidden="true">·</span> Vendée
          </span>
          <a href="/radar">
            Espace personnel <span aria-hidden="true">↗</span>
          </a>
        </footer>
      </div>
      {/* Native dialog provides Escape, focus trapping and focus restoration; clicking its backdrop is an additional close action. */}
      {/* oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
      <dialog
        className="vrai-film-dialog"
        ref={dialog}
        aria-labelledby="vrai-film-title"
        onClose={() => {
          video.current?.pause();
          setFilmOpen(false);
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeFilm();
        }}
      >
        <div className="vrai-film-shell">
          <div className="vrai-film-top">
            <div>
              <h2 id="vrai-film-title">Maison Martin</h2>
              <p>
                Du terrain au compte rendu <span aria-hidden="true">·</span>{' '}
                Scénario fictif
              </p>
            </div>
            <button
              type="button"
              onClick={closeFilm}
              className="vrai-film-close"
              aria-label="Fermer la vidéo"
            >
              <span aria-hidden="true">✕</span>
            </button>
          </div>
          {filmOpen ? (
            <>
              {/* oxlint-disable-next-line jsx-a11y/media-has-caption -- Existing film supplied without a caption track; unchanged here. */}
              <video
                ref={video}
                className="vrai-film-video"
                controls
                autoPlay
                playsInline
                preload="metadata"
                poster="/brand/maison-martin-poster.webp"
                onError={() => setFilmError(true)}
                aria-label="Démonstration vidéo Maison Martin"
              >
                <source
                  src={film}
                  type="video/mp4"
                  onError={() => setFilmError(true)}
                />
                Votre navigateur ne permet pas de lire cette vidéo.
              </video>
              {filmError ? (
                <p className="vrai-film-error" role="alert">
                  La vidéo n’a pas pu être chargée.{' '}
                  <a href={film}>Ouvrir le fichier vidéo</a>
                </p>
              ) : null}
            </>
          ) : null}
          <div className="vrai-film-bottom">
            <span>Une démonstration Vrai Consulting</span>
            <a href="/demo/maison-martin">Ouvrir la page du film ↗</a>
          </div>
        </div>
      </dialog>
    </div>
  );
}
