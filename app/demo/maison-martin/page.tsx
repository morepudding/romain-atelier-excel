/* oxlint-disable next/no-html-link-for-pages -- Native navigation preserves the public links in vinext. */
import type { Metadata } from 'next';
import VraiWordmark from '../../vitrine/wordmark';
import '../../vitrine/vitrine.css';
import './maison-martin.css';

export const metadata: Metadata = {
  icons: { icon: '/brand/favicon.svg' },
  title: 'Maison Martin — Vrai Consulting',
  description:
    'Du terrain au compte rendu : une démonstration de suivi de chantier par Vrai Consulting. Scénario fictif.',
};

export default function MaisonMartinPage() {
  return (
    <div className="vrai-site">
      <main className="maison-film">
        <header className="maison-film-header">
          <a href="/" className="maison-film-back">
            ← Retour à l’accueil
          </a>
          <a
            href="/"
            className="maison-film-brand"
            aria-label="Vrai Consulting, accueil"
          >
            <VraiWordmark />
          </a>
        </header>
        <section aria-labelledby="maison-film-title">
          <div className="maison-film-intro">
            <div>
              <p>
                Maison Martin <span aria-hidden="true">·</span> 60 secondes
              </p>
              <h1 id="maison-film-title">Du terrain au compte rendu.</h1>
            </div>
            <span>Scénario fictif</span>
          </div>
          {/* oxlint-disable-next-line jsx-a11y/media-has-caption -- Existing film supplied without a caption track. */}
          <video
            className="maison-film-video"
            controls
            preload="metadata"
            playsInline
            poster="/brand/maison-martin-poster.webp"
            aria-label="Vidéo de démonstration Maison Martin"
          >
            <source
              src="/videos/Maison-Martin_60s_Full-HD.mp4"
              type="video/mp4"
            />
            Votre navigateur ne permet pas de lire cette vidéo.
          </video>
          <p className="maison-film-summary">
            Messages de l’équipe, photos et informations fournisseur réunis dans
            un compte rendu. L’équipe relit et valide.
          </p>
        </section>
        <footer className="maison-film-footer">
          <span>Une démonstration Vrai Consulting</span>
          <a href="/radar">Espace personnel ↗</a>
        </footer>
      </main>
    </div>
  );
}
