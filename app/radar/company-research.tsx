'use client';

import { useState } from 'react';
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  FileSearch,
  LoaderCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { RadarCompany } from '@/lib/radar/types';
import type { ResearchState } from './use-company-research';

const href = (value: string) => {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '#';
  } catch {
    return '#';
  }
};

export default function CompanyResearchCard({
  company,
  state,
  expanded,
  disabled,
  automaticAvailable,
  onExpand,
  onResearch,
  onSave,
  saving,
}: {
  company: RadarCompany;
  state?: ResearchState;
  expanded: boolean;
  disabled: boolean;
  automaticAvailable: boolean;
  onExpand: () => void;
  onResearch: (website?: string) => void;
  onSave?: () => void;
  saving: boolean;
}) {
  const [website, setWebsite] = useState('');
  const [copyNotice, setCopyNotice] = useState('');
  const data = state?.data || company.research;
  const loading = state?.status === 'loading' || state?.status === 'waiting';
  const detailId = `research-${company.siren}`;
  return (
    <div className="rl-research" aria-busy={loading}>
      {loading && (
        <output className="rl-research-progress">
          <LoaderCircle size={16} className="rl-spin" />
          {state.status === 'waiting'
            ? 'Recherche web en attente…'
            : 'Recherche du site, des indices et des contacts…'}
        </output>
      )}
      {state?.error && (
        <p className="rl-error" role="alert">
          {state.error}
        </p>
      )}
      {data ? (
        <>
          <div className="rl-research-overview">
            <span
              className={`rl-research-priority ${data.priority === 'À contacter en priorité' ? 'rl-research-priority-high' : ''}`}
            >
              {data.priority}
            </span>
            <span className="rl-muted">
              {data.evidence.length} indice{data.evidence.length > 1 ? 's' : ''}{' '}
              · {data.sources.length} page{data.sources.length > 1 ? 's' : ''}{' '}
              consultée{data.sources.length > 1 ? 's' : ''}
            </span>
          </div>
          <p>{data.summary}</p>
          <Button
            variant="outline"
            className="rl-research-toggle"
            aria-expanded={expanded}
            aria-controls={detailId}
            onClick={onExpand}
          >
            {expanded ? 'Refermer la fiche' : 'Lire la fiche de contact'}
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </Button>
        </>
      ) : (
        !loading && (
          <>
            <p className="rl-muted">
              Le site public peut apporter des indices et un contact pour
              préparer votre approche.
            </p>
            {automaticAvailable ? (
              <Button
                variant="outline"
                className="rl-research-toggle"
                disabled={disabled}
                onClick={() => onResearch()}
              >
                <FileSearch size={16} />
                Rechercher les indices publics
              </Button>
            ) : (
              <Button
                variant="outline"
                className="rl-research-toggle"
                disabled={disabled}
                aria-expanded={expanded}
                aria-controls={detailId}
                onClick={onExpand}
              >
                <FileSearch size={16} />
                {expanded
                  ? 'Refermer la fiche'
                  : 'Renseigner le site de l’entreprise'}
              </Button>
            )}
          </>
        )
      )}
      {(expanded || (!data && state?.status === 'error')) && (
        <div id={detailId} className="rl-research-detail">
          {data && (
            <>
              <div className="rl-research-identity">
                <strong>
                  {data.identity === 'siren'
                    ? 'Entreprise identifiée sur le site'
                    : data.identity === 'name_location'
                      ? 'Site correspondant au nom et à la localisation'
                      : 'Site à identifier'}
                </strong>
                <p>
                  {data.identity === 'siren'
                    ? 'Le SIREN ou un SIRET de l’entreprise a été retrouvé sur une page consultée.'
                    : data.identity === 'name_location'
                      ? 'Le lien avec cette entreprise reste à confirmer : son SIREN n’a pas été retrouvé.'
                      : 'Aucune information d’un site incertain n’est attribuée à cette entreprise.'}
                </p>
                {data.website && (
                  <a
                    href={href(data.identitySourceUrl || data.website)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {
                      new URL(href(data.website), 'https://example.org')
                        .hostname
                    }
                    <ArrowUpRight size={14} />
                  </a>
                )}
              </div>
              <div className="rl-research-columns">
                <div>
                  <h3>Ce que les pages montrent</h3>
                  {data.evidence.length ? (
                    <ul className="rl-evidence-list">
                      {data.evidence.map((item) => (
                        <li key={item.kind}>
                          <strong>{item.label}</strong>
                          <blockquote>« {item.excerpt} »</blockquote>
                          <a
                            href={href(item.sourceUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Lire la source
                            <ArrowUpRight size={14} />
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="rl-muted">
                      Aucun indice assez précis dans les pages consultées. Cela
                      ne signifie pas que l’entreprise n’a aucun besoin.
                    </p>
                  )}
                  <div className="rl-research-hypothesis">
                    <h3>Hypothèse à vérifier</h3>
                    <p>{data.hypothesis}</p>
                  </div>
                  <h3>Ce qu’il reste à comprendre</h3>
                  <ul className="rl-research-questions">
                    {data.questions.map((question) => (
                      <li key={question}>{question}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3>Qui contacter</h3>
                  <p>{data.contact.role}</p>
                  {data.contact.email && (
                    <p>
                      <strong>{data.contact.email}</strong>
                    </p>
                  )}
                  {data.contact.phone && <p>{data.contact.phone}</p>}
                  {data.contact.sourceUrl ? (
                    <a
                      href={href(data.contact.sourceUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Contact publié sur le site
                      <ArrowUpRight size={14} />
                    </a>
                  ) : (
                    <p className="rl-muted">
                      Aucun contact professionnel exploitable trouvé.
                    </p>
                  )}
                  <div className="rl-research-demo">
                    <small>La partie de votre démo à montrer</small>
                    <h3>{data.demo.title}</h3>
                    <p>{data.demo.explanation}</p>
                    <a
                      href="/demo/maison-martin"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Voir la vidéo Maison Martin
                      <ArrowUpRight size={14} />
                    </a>
                  </div>
                  {data.message && (
                    <div className="rl-message-draft">
                      <h3>Une proposition de premier message</h3>
                      <p className="rl-muted">
                        À adapter après vérification du site et du destinataire.
                      </p>
                      <p>
                        <strong>Objet : {data.message.subject}</strong>
                      </p>
                      <textarea
                        aria-label={`Message proposé pour ${company.nom}`}
                        readOnly
                        rows={9}
                        value={data.message.body}
                      />
                      <Button
                        variant="outline"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(
                              `Objet : ${data.message!.subject}\n\n${data.message!.body}`,
                            );
                            setCopyNotice('Message copié.');
                          } catch {
                            setCopyNotice(
                              'Copie indisponible. Sélectionnez le texte du message pour le copier.',
                            );
                          }
                        }}
                      >
                        <Copy size={15} />
                        Copier le message
                      </Button>
                      {copyNotice && (
                        <output className="rl-copy-notice">{copyNotice}</output>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="rl-research-sources">
                <h3>Sources et limites de la recherche</h3>
                <p className="rl-muted">
                  Pages consultées le{' '}
                  {new Date(data.researchedAt).toLocaleString('fr-FR')}.
                  Recherche limitée aux pages accessibles du site repéré.
                </p>
                <ul>
                  {data.sources.map((source) => (
                    <li key={source.url}>
                      <a
                        href={href(source.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {source.title}
                        <ArrowUpRight size={14} />
                      </a>
                    </li>
                  ))}
                </ul>
                {data.limitations.map((limit) => (
                  <p className="rl-muted" key={limit}>
                    {limit}
                  </p>
                ))}
              </div>
              {onSave && (
                <Button
                  className="rl-primary"
                  disabled={disabled || saving}
                  onClick={onSave}
                >
                  <Check size={16} />
                  {saving
                    ? 'Enregistrement…'
                    : 'Enregistrer la fiche dans mes pistes'}
                </Button>
              )}
            </>
          )}
          <form
            className="rl-website-form"
            onSubmit={(event) => {
              event.preventDefault();
              onResearch(website.trim() || undefined);
            }}
          >
            <label htmlFor={`website-${company.siren}`}>
              Vous connaissez le site de cette entreprise ?
              <span>
                Indiquez son adresse pour consulter directement ses pages.
              </span>
            </label>
            <div>
              <input
                id={`website-${company.siren}`}
                type="url"
                required={!automaticAvailable}
                maxLength={500}
                placeholder="https://www.entreprise.fr"
                value={website}
                onChange={(event) => setWebsite(event.target.value)}
                disabled={disabled || loading}
              />
              <Button
                type="submit"
                variant="outline"
                disabled={
                  disabled ||
                  loading ||
                  (!automaticAvailable && !website.trim())
                }
              >
                {loading
                  ? 'Consultation…'
                  : website.trim() || !automaticAvailable
                    ? 'Consulter ce site'
                    : 'Relancer la recherche'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
