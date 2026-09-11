'use client';

/* oxlint-disable next/no-html-link-for-pages -- Native navigation is intentional here: vinext's client router currently blocks these public links. */

import { useState } from 'react';

import './vitrine.css';

const views = [
  {
    kicker: 'Du premier message à la prochaine action.',
    title: (
      <>
        Une demande.
        <br />
        <em>La suite est claire.</em>
      </>
    ),
    description: (
      <>
        Un dossier, un responsable, une prochaine action.
        <br />
        Votre équipe sait où elle en est.
      </>
    ),
  },
  {
    kicker: 'L’assistant prépare. Votre équipe décide.',
    title: (
      <>
        Moins de ressaisie.
        <br />
        <em>Plus de temps utile.</em>
      </>
    ),
    description: (
      <>
        Les informations sont réunies, la réponse préparée.
        <br />
        Vous gardez la main sur la décision.
      </>
    ),
  },
];

export default function Vitrine() {
  const [current, setCurrent] = useState(0);
  const view = views[current];

  function selectView(index: number) {
    setCurrent((index + views.length) % views.length);
  }


  return (
    <div className="vitrine-site">
      <div className="vitrine-intro" aria-hidden="true">
        <span>
          r<span className="vitrine-signature-dot">.</span>
        </span>
      </div>

      <div className="vitrine-page">
        <header className="vitrine-header">
          <a
            className="vitrine-brand"
            href="/"
            aria-label="Romain Atelier Excel, accueil"
          >
            <span className="vitrine-monogram">
              r<span className="vitrine-signature-dot">.</span>
            </span>
            <span className="vitrine-brand-name">Romain Atelier Excel</span>
          </a>

          <nav className="vitrine-nav" aria-label="Navigation principale">
            <a href="#demonstrations">Démonstrations</a>
            <a href="/radar">Radar local</a>
            <a href="/demo/maison-martin">Vidéo Maison Martin</a>
          </nav>

          <a className="vitrine-contact" href="/demo/maison-martin">
            Voir la vidéo <span aria-hidden="true">↗</span>
          </a>
        </header>

        <main>
          <section className="vitrine-hero" aria-labelledby="vitrine-headline">
            <div className="vitrine-hero-title">
              <p className="vitrine-eyebrow">
                <span className="vitrine-small-dot" />
                Des outils pensés pour votre réalité
              </p>
              <h1 id="vitrine-headline">
                Votre métier.
                <br />
                <em>En plus simple.</em>
              </h1>
            </div>

            <div className="vitrine-hero-aside">
              <p>
                Je crée les outils qui simplifient
                <br />
                le quotidien de vos équipes.
                <br />
                Et je vous aide à les prendre en main.
              </p>
              <a className="vitrine-text-link" href="#demonstrations">
                Découvrir les démonstrations
                <span aria-hidden="true">↘</span>
              </a>
            </div>

            <span className="vitrine-background-letter" aria-hidden="true">
              r.
            </span>
          </section>

          <section
            className="vitrine-showcase"
            id="demonstrations"
            aria-roledescription="carrousel"
            aria-label="Démonstration illustrative d’un outil métier"
            data-slide={current}
          >
            <div className="vitrine-showcase-wash" aria-hidden="true" />
            <div className="vitrine-showcase-content">
              <div className="vitrine-showcase-heading">
                <span className="vitrine-eyebrow vitrine-light">Du concret</span>
                <span className="vitrine-project-type">
                  Outils métier · vidéo et terrain
                </span>
              </div>

              <div
                className="vitrine-slide-copy"
                aria-live="polite"
                aria-atomic="true"
              >
                <p className="vitrine-slide-kicker">{view.kicker}</p>
                <h2>{view.title}</h2>
                <p className="vitrine-slide-description">{view.description}</p>
              </div>

              <div className="vitrine-showcase-actions">
                <a
                  className="vitrine-showcase-action vitrine-showcase-action-primary"
                  href="/demo/maison-martin"
                >
                  <span className="vitrine-play-circle" aria-hidden="true">
                    ↗
                  </span>
                  <span>
                    Voir la vidéo Maison Martin
                    <small>Une démonstration · 60 secondes</small>
                  </span>
                </a>
                <a className="vitrine-radar-link" href="/radar">
                  Ouvrir le Radar local <span aria-hidden="true">↗</span>
                </a>
              </div>
            </div>

            <div
              className="vitrine-demo-art"
              aria-hidden="true"
            >
              <div className="vitrine-app-scene" aria-hidden="true">
                <div className="vitrine-art-orbit" />
                <div className="vitrine-message-card">
                  <div className="vitrine-message-top">
                    <span aria-hidden="true">✉</span>
                    <span>Tout commence ici</span>
                    <span>↗</span>
                  </div>
                  <div className="vitrine-message-sender">
                    <span className="vitrine-sender-initials">→</span>
                    <div>
                      <strong>Demande entrante</strong>
                      <small>À votre équipe</small>
                    </div>
                    <time>09:41</time>
                  </div>
                  <h3>Une demande à suivre.</h3>
                  <p>
                    Bonjour, pouvez-vous me confirmer
                    <br />
                    la prise en charge de mon dossier ?
                  </p>
                  <div className="vitrine-message-attachment">
                    <span>↳</span> Pièce jointe.pdf <small>1 fichier</small>
                  </div>
                  <div className="vitrine-message-bottom">
                    Message reçu <span>✓</span>
                  </div>
                </div>

                <div className="vitrine-workspace-window">
                  <div className="vitrine-workspace-bar">
                    <span className="vitrine-workspace-symbol">r.</span>
                    <span>Votre espace de travail</span>
                    <span className="vitrine-workspace-menu">···</span>
                  </div>
                  <div className="vitrine-workspace-heading">
                    <div>
                      <span className="vitrine-workspace-eyebrow">
                        Le quotidien, organisé
                      </span>
                      <h3>Le suivi des demandes</h3>
                    </div>
                    <span className="vitrine-workspace-add">+</span>
                  </div>
                  <div className="vitrine-workspace-tabs">
                    <span className="vitrine-active">Toutes les demandes</span>
                    <span>À traiter</span>
                    <span>Terminées</span>
                  </div>
                  <div className="vitrine-workspace-table">
                    <div className="vitrine-workspace-row vitrine-workspace-table-head">
                      <span>Demande</span>
                      <span>Responsable</span>
                      <span>Statut</span>
                    </div>
                    <div className="vitrine-workspace-row vitrine-featured">
                      <span>
                        <b>Suivi d’une demande client</b>
                        <small>Équipe support · Aujourd’hui</small>
                      </span>
                      <span className="vitrine-owner">
                        <i>EQ</i> Équipe
                      </span>
                      <span className="vitrine-status-tag">En cours</span>
                    </div>
                    <div className="vitrine-workspace-row">
                      <span>
                        <b>Validation d’un devis</b>
                        <small>Équipe commerciale</small>
                      </span>
                      <span className="vitrine-owner">
                        <i>RC</i> Référent
                      </span>
                      <span className="vitrine-status-tag vitrine-waiting">
                        À valider
                      </span>
                    </div>
                    <div className="vitrine-workspace-row">
                      <span>
                        <b>Préparation de commande</b>
                        <small>Équipe logistique</small>
                      </span>
                      <span className="vitrine-owner">
                        <i>EQ</i> Équipe
                      </span>
                      <span className="vitrine-status-tag vitrine-done">
                        Terminée
                      </span>
                    </div>
                  </div>
                  <div className="vitrine-workspace-bottom">
                    <span>
                      <b>✓</b> Chaque demande a sa prochaine action.
                    </span>
                    <span>↗</span>
                  </div>
                </div>

                <div className="vitrine-assistant-card">
                  <span className="vitrine-assistant-label">
                    <span className="vitrine-assistant-mark">r.</span>
                    Votre assistant
                    <span className="vitrine-assistant-state">Prêt</span>
                  </span>
                  <strong>La réponse est préparée.</strong>
                  <p>Vous la relisez. Vous décidez de l’envoyer.</p>
                  <div>
                    Voir le brouillon <span>↗</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="vitrine-showcase-bottom">
              <span className="vitrine-visual-note">
                Mise en scène illustrative · Données fictives
              </span>
              <div className="vitrine-slide-controls">
                <span className="vitrine-slide-count">
                  <b>{String(current + 1).padStart(2, '0')}</b>
                  <span>/</span>02
                </span>
                <div className="vitrine-slide-lines" aria-hidden="true">
                  <span className={current === 0 ? 'selected' : ''} />
                  <span className={current === 1 ? 'selected' : ''} />
                </div>
                <button
                  className="vitrine-slide-control"
                  type="button"
                  aria-label="Vue précédente"
                  onClick={() => selectView(current - 1)}
                >
                  ←
                </button>
                <button
                  className="vitrine-slide-control"
                  type="button"
                  aria-label="Vue suivante"
                  onClick={() => selectView(current + 1)}
                >
                  →
                </button>
              </div>
            </div>
          </section>

          <div className="vitrine-services" aria-label="Domaines d’intervention">
            <span>Applications métier</span>
            <span>Assistants &amp; agents IA</span>
            <span>Automatisations</span>
            <span>Formations</span>
          </div>
        </main>

        <footer className="vitrine-footer">
          <span>Romain Atelier Excel · Outils métier concrets</span>
          <div>
            <a href="/radar">Radar local</a>
            <a href="/demo/maison-martin">
              Vidéo Maison Martin <span aria-hidden="true">↗</span>
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}
