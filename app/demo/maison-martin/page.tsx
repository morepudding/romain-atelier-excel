import type { Metadata } from 'next';
import Link from 'next/link';

import './maison-martin.css';

export const metadata: Metadata = {
  title: 'Maison Martin — Démonstration vidéo',
  description: 'Démonstration vidéo Maison Martin par Romain Atelier Excel.',
};

export default function MaisonMartinPage() {
  return (
    <main className="maison-demo">
      <header className="maison-demo__header">
        <nav className="maison-demo__navigation" aria-label="Navigation">
          <Link href="/" className="maison-demo__dashboard">
            ← Retour au cockpit
          </Link>
          <Link href="/radar" className="maison-demo__back">
            ← Retour au Radar
          </Link>
        </nav>
        <div className="maison-demo__brand">
          <span className="maison-demo__monogram" aria-hidden="true">R</span>
          <span>Romain Atelier Excel</span>
        </div>
        <span className="maison-demo__tag">Démonstration vidéo</span>
      </header>

      <section className="maison-demo__hero" aria-labelledby="maison-demo-title">
        <div className="maison-demo__intro">
          <p className="maison-demo__eyebrow">Maison Martin · 60 secondes</p>
          <h1 id="maison-demo-title">
            Une vidéo qui
            <br />
            <em>montre vraiment.</em>
          </h1>
          <p className="maison-demo__lede">
            Une démonstration courte, pensée pour présenter Maison Martin en
            un regard.
          </p>
          <p className="maison-demo__meta">
            Maison Martin <span aria-hidden="true">·</span> Full HD{' '}
            <span aria-hidden="true">·</span> 01:00
          </p>
        </div>

        <div className="maison-demo__video-frame">
          {/* oxlint-disable-next-line jsx-a11y/media-has-caption -- aucun transcript n’a été fourni avec la vidéo */}
          <video
            className="maison-demo__video"
            controls
            preload="metadata"
            playsInline
            aria-label="Vidéo de présentation Maison Martin"
          >
            <source
              src="/videos/Maison-Martin_60s_Full-HD.mp4"
              type="video/mp4"
            />
            Votre navigateur ne permet pas de lire cette vidéo.
          </video>
        </div>
      </section>

      <footer className="maison-demo__footer">
        <span>Maison Martin</span>
        <span>Une démonstration de Romain Atelier Excel</span>
      </footer>
    </main>
  );
}
