'use client';

import Image from 'next/image';
import ReworkPage from './rework-page';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type SubmitEvent,
} from 'react';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  X,
} from 'lucide-react';
import {
  reworkDataSchema,
  siteStates,
  safeUrl,
  fromTarget,
  sameCompany,
  identityKey,
  type ReworkData,
  type ReworkProject,
} from '@/lib/radar/rework';
import {
  canPrepare,
  comparisonReady,
  hasProposal,
  preparationStep,
  preparationLabels,
  decide,
  choose,
  revise,
} from '@/lib/radar/rework-flow';
import type { RadarRefonteResult } from '@/lib/radar/types';

type Props = {
  supabase: SupabaseClient;
  session: Session;
  onOpenDossiers: () => void;
};
type Availability = { available: boolean; reason: string };
const errorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : 'L’opération n’a pas abouti. Réessayez.';
function mergeRows(current: ReworkProject[], incoming: ReworkProject[]) {
  const map = new Map(current.map((project) => [project.id, project]));
  for (const project of incoming)
    if ((map.get(project.id)?.revision || 0) <= project.revision)
      map.set(project.id, project);
  return [...map.values()];
}

export default function ReworkValidation({
  supabase,
  session,
  onOpenDossiers,
}: Props) {
  const [projects, setProjects] = useState<ReworkProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [view, setView] = useState<'companies' | 'proposals'>('companies');
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  const [activeJob, setActiveJob] = useState('');
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [refresh, setRefresh] = useState(0);
  const mutationLock = useRef(false);
  const owner = session.user.id;
  const read = useCallback(async () => {
    const rows: ReworkProject[] = [];
    for (let offset = 0; ; offset += 200) {
      const result = await supabase
        .from('radar_rework_projects')
        .select('*')
        .eq('user_id', owner)
        .order('created_at')
        .order('id')
        .range(offset, offset + 199)
        .abortSignal(AbortSignal.timeout(15000));
      if (result.error) throw new Error('Impossible de charger vos dossiers.');
      rows.push(
        ...result.data.map(
          (row) =>
            ({
              ...row,
              data: reworkDataSchema.parse(row.data),
            }) as ReworkProject,
        ),
      );
      if (result.data.length < 200) return rows;
    }
  }, [owner, supabase]);
  const token = useCallback(async () => {
    const result = await supabase.auth.getSession();
    if (!result.data.session)
      throw new Error('Reconnectez-vous pour continuer.');
    return result.data.session.access_token;
  }, [supabase]);

  // One sequential worker per mounted desk. The server's revision lease arbitrates across tabs.
  // Completed steps survive navigation; unfinished steps resume on the next visit.
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let provider: Availability | null = null;
    let checkedAt = 0;
    async function tick() {
      let next = 6000;
      try {
        const rows = await read();
        if (stopped) return;
        setProjects((current) => mergeRows(current, rows));
        setLoading(false);
        if (Date.now() - checkedAt > 60000) {
          const response = await fetch('/api/radar/rework/prepare', {
            signal: AbortSignal.timeout(10000),
          });
          if (!response.ok)
            throw new Error(
              'Impossible de vérifier la disponibilité des maquettes.',
            );
          provider = (await response.json()) as Availability;
          checkedAt = Date.now();
          if (!stopped) setAvailability(provider);
        }
        const project = rows.find((row) => canPrepare(row.data));
        if (!stopped && project && provider?.available) {
          setActiveJob(project.id);
          const response = await fetch('/api/radar/rework/prepare', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${await token()}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id: project.id }),
            signal: AbortSignal.timeout(175000),
          });
          const result = (await response.json()) as {
            project?: ReworkProject;
            error?: string;
            availability?: Availability;
          };
          if (stopped) return;
          if (result.project)
            setProjects((current) =>
              mergeRows(current, [
                {
                  ...result.project!,
                  data: reworkDataSchema.parse(result.project!.data),
                },
              ]),
            );
          if (result.availability) {
            provider = result.availability;
            setAvailability(provider);
          }
          if (!response.ok && !result.project && response.status !== 409)
            throw new Error(
              result.error || 'La préparation est momentanément indisponible.',
            );
          next = 500;
        }
      } catch (err) {
        if (!stopped) {
          setError(errorMessage(err));
          setLoading(false);
        }
        next = 20000;
      } finally {
        if (!stopped) {
          setActiveJob('');
          timer = setTimeout(() => void tick(), next);
        }
      }
    }
    void tick();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [read, token, refresh]);

  async function save(project: ReworkProject, data: ReworkData) {
    const result = await supabase
      .from('radar_rework_projects')
      .update({ data: reworkDataSchema.parse(data) })
      .eq('id', project.id)
      .eq('user_id', owner)
      .eq('revision', project.revision)
      .select('*')
      .maybeSingle();
    if (result.error)
      throw new Error('Votre choix n’a pas pu être enregistré. Réessayez.');
    if (!result.data) {
      setRefresh((n) => n + 1);
      throw new Error(
        'Ce dossier vient de changer. Réessayez avec sa version actualisée.',
      );
    }
    const saved = {
      ...result.data,
      data: reworkDataSchema.parse(result.data.data),
    } as ReworkProject;
    setProjects((current) => mergeRows(current, [saved]));
    return saved;
  }
  async function action(work: () => Promise<void>) {
    if (mutationLock.current) return;
    mutationLock.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await work();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      mutationLock.current = false;
      setBusy(false);
    }
  }
  const pending = projects.filter(
    (project) => project.data.decision === 'review',
  );
  const retained = projects.filter(
    (project) => project.data.decision === 'retained',
  );
  const awaiting = retained.filter(
    (project) => !project.data.selected_direction,
  );
  const ready = awaiting.filter((project) => comparisonReady(project.data));
  const selectedProjects = retained.filter(
    (project) => !!project.data.selected_direction,
  );
  const queue =
    view === 'companies'
      ? pending
      : [...ready, ...awaiting.filter((project) => !ready.includes(project))];
  const current = queue.find((project) => project.id === selected) || queue[0];
  const currentIndex = current ? queue.indexOf(current) : 0;

  async function discover() {
    await action(async () => {
      const response = await fetch('/api/radar/refonte?radiusKm=35', {
        headers: { Authorization: `Bearer ${await token()}` },
        signal: AbortSignal.timeout(65000),
      });
      const result = (await response.json()) as RadarRefonteResult & {
        error?: string;
      };
      if (!response.ok)
        throw new Error(result.error || 'La recherche n’a pas abouti.');
      const existing = await read();
      let count = 0;
      for (const target of result.targets) {
        const data = fromTarget(target, new Date().toISOString());
        if (existing.some((project) => sameCompany(project.data, data)))
          continue;
        const inserted = await supabase
          .from('radar_rework_projects')
          .insert({ user_id: owner, identity_key: identityKey(data), data })
          .select('*')
          .single();
        if (inserted.error?.code === '23505') continue;
        if (inserted.error)
          throw new Error(
            'La recherche est terminée, mais un dossier n’a pas pu être enregistré.',
          );
        existing.push({
          ...inserted.data,
          data: reworkDataSchema.parse(inserted.data.data),
        } as ReworkProject);
        count += 1;
      }
      setProjects((rows) => mergeRows(rows, existing));
      setView('companies');
      setSelected('');
      setNotice(
        count
          ? `${count} entreprises ajoutées à votre sélection.`
          : 'Aucune nouvelle entreprise trouvée dans ce lot.',
      );
    });
  }

  return (
    <section className="rv-desk" aria-label="Validations Rework">
      <div className="rv-nav">
        <nav aria-label="Étapes de validation">
          <button
            aria-current={view === 'companies' ? 'step' : undefined}
            onClick={() => {
              setView('companies');
              setSelected('');
            }}
          >
            <span>1</span> Entreprises à retenir <b>{pending.length}</b>
          </button>
          <button
            aria-current={view === 'proposals' ? 'step' : undefined}
            onClick={() => {
              setView('proposals');
              setSelected('');
            }}
          >
            <span>2</span> Propositions à choisir <b>{awaiting.length}</b>
          </button>
        </nav>
        <button className="rv-text-button" onClick={onOpenDossiers}>
          Tous les dossiers <ArrowUpRight size={15} />
        </button>
      </div>
      {error && (
        <div className="rv-alert" role="alert">
          <p>{error}</p>
          <button
            onClick={() => {
              setError('');
              setRefresh((n) => n + 1);
            }}
          >
            Réessayer
          </button>
        </div>
      )}
      {notice && <output className="rv-notice">{notice}</output>}
      {availability &&
        availability.reason !== 'agent' &&
        !availability.available &&
        awaiting.some((project) => preparationStep(project.data)) && (
          <output className="rv-service">
            {availability.reason === 'credits'
              ? 'La préparation est suspendue : le crédit de génération est épuisé.'
              : availability.reason === 'configuration'
                ? 'La génération des maquettes doit être connectée. Vos entreprises retenues sont enregistrées.'
                : 'La préparation est momentanément indisponible. Nouvelle vérification automatique.'}
          </output>
        )}
      {loading ? (
        <output className="rv-empty">Chargement de votre sélection…</output>
      ) : current ? (
        <>
          <div className="rv-position">
            <p>
              {view === 'companies'
                ? 'Votre prochaine décision'
                : ready.length
                  ? `${ready.length} ${ready.length > 1 ? 'comparaisons disponibles' : 'comparaison disponible'}`
                  : 'Vos entreprises retenues'}
            </p>
            <div>
              <button
                aria-label="Entreprise précédente"
                disabled={currentIndex === 0}
                onClick={() => setSelected(queue[currentIndex - 1].id)}
              >
                <ChevronLeft size={18} />
              </button>
              <span>
                {currentIndex + 1} / {queue.length}
              </span>
              <button
                aria-label="Entreprise suivante"
                disabled={currentIndex >= queue.length - 1}
                onClick={() => setSelected(queue[currentIndex + 1].id)}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
          {view === 'companies' ? (
            <article className="rv-company" key={current.id}>
              <div className="rv-company-main">
                <p className="rv-eyebrow">
                  {current.data.locality || 'Entreprise à examiner'}
                </p>
                <h2>{current.data.name}</h2>
                <p className="rv-observation">
                  {current.data.observations || 'Aucune observation consignée.'}
                </p>
                {current.data.angle && (
                  <div className="rv-opportunity">
                    <h3>Piste de travail</h3>
                    <p>{current.data.angle}</p>
                  </div>
                )}
                <div className="rv-decision-actions">
                  <button
                    className="rv-primary"
                    disabled={busy}
                    onClick={() =>
                      void action(async () => {
                        await save(current, decide(current.data, 'retained'));
                        setNotice(
                          `${current.data.name} retenu. Préparation des propositions.`,
                        );
                      })
                    }
                  >
                    Retenir cette entreprise <ArrowRight size={18} />
                  </button>
                  <button
                    disabled={busy}
                    onClick={() =>
                      void action(async () => {
                        await save(current, decide(current.data, 'discarded'));
                        setNotice(`${current.data.name} écarté.`);
                      })
                    }
                  >
                    <X size={17} /> Passer
                  </button>
                </div>
              </div>
              <aside className="rv-reference">
                <p className="rv-eyebrow">Point de départ</p>
                <h3>{siteStates[current.data.site_state]}</h3>
                {current.data.observed_at && (
                  <p>
                    Observation du{' '}
                    {new Date(
                      `${current.data.observed_at}T12:00:00`,
                    ).toLocaleDateString('fr-FR')}
                  </p>
                )}
                {safeUrl(current.data.website) && (
                  <a
                    href={safeUrl(current.data.website)!}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Ouvrir le site <ArrowUpRight size={16} />
                  </a>
                )}
                <ProjectImage
                  supabase={supabase}
                  project={current}
                  slot="before"
                />
                <Evidence data={current.data} />
              </aside>
            </article>
          ) : (
            <article key={current.id} className="rv-proposal">
              <header className="rv-proposal-heading">
                <div>
                  <p className="rv-eyebrow">{current.data.locality}</p>
                  <h2>{current.data.name}</h2>
                </div>
                <Evidence data={current.data} />
              </header>
              {comparisonReady(current.data) ? (
                <>
                  <div className="rv-comparison" data-single={current.data.presentation === 'single'}>
                    {(current.data.presentation === 'single' ? (['a'] as const) : (['a', 'b'] as const)).map((slot) => (
                      <section className="rv-direction" key={slot}>
                        <header>
                          {current.data.presentation !== 'single' && <span>{slot.toUpperCase()}</span>}
                          <h3>
                            {(slot === 'a'
                              ? current.data.direction_a
                              : current.data.direction_b
                            )
                              .split('\n')[0]
                              .replace(/^#+\s*/, '') ||
                              `Proposition ${slot.toUpperCase()}`}
                          </h3>
                        </header>
                        <ProjectImage
                          supabase={supabase}
                          project={current}
                          slot={slot}
                        />
                        <button
                          className="rv-primary"
                          disabled={busy}
                          onClick={() =>
                            void action(async () => {
                              await save(current, choose(current.data, slot));
                              setSelected('');
                              setNotice(
                                `Proposition${current.data.presentation === 'single' ? '' : ` ${slot.toUpperCase()}`} choisie pour ${current.data.name}.`,
                              );
                            })
                          }
                        >
                          {current.data.presentation === 'single' ? 'Valider cette proposition' : 'Choisir cette proposition'} <Check size={17} />
                        </button>
                      </section>
                    ))}
                  </div>
                  <details className="rv-refine">
                    <summary>Demander un ajustement</summary>
                    <form
                      onSubmit={(event: SubmitEvent<HTMLFormElement>) => {
                        event.preventDefault();
                        const value = new FormData(event.currentTarget).get(
                          'instruction',
                        );
                        const instruction =
                          typeof value === 'string' ? value : '';
                        void action(async () => {
                          await save(
                            current,
                            revise(current.data, instruction),
                          );
                        });
                      }}
                    >
                      <label htmlFor="rw-instruction">
                        Qu’est-ce que vous souhaitez changer ?
                      </label>
                      <textarea
                        id="rw-instruction"
                        name="instruction"
                        rows={2}
                        maxLength={2000}
                        required
                        placeholder="Par exemple : garder la composition A, avec des images plus présentes."
                      />
                      <button disabled={busy}>
                        Reprendre les propositions
                      </button>
                    </form>
                  </details>
                </>
              ) : (
                <div className="rv-progress">
                  <div className="rv-progress-copy">
                    <p className="rv-eyebrow">Entreprise retenue</p>
                    <h3>
                      {current.data.automation?.status === 'error'
                        ? 'La préparation s’est interrompue.'
                        : activeJob === current.id ||
                            current.data.automation?.status === 'working'
                          ? preparationLabels[
                              preparationStep(current.data) || 'brief'
                            ]
                          : 'Les propositions attendent leur préparation.'}
                    </h3>
                    <p>
                      {current.data.automation?.status === 'error'
                        ? current.data.automation.error
                        : current.data.angle || current.data.user_reason}
                    </p>
                    <ol className="rv-progress-steps">
                      <li data-done={!!current.data.brief}>
                        <Check size={15} /> Brief et directions
                      </li>
                      <li data-done={hasProposal(current.data, 'a')}>
                        <Check size={15} /> Maquette A
                      </li>
                      <li data-done={hasProposal(current.data, 'b')}>
                        <Check size={15} /> Maquette B
                      </li>
                    </ol>
                    {current.data.automation?.status === 'error' && (
                      <button
                        disabled={busy || current.data.automation.attempts >= 9}
                        onClick={() =>
                          void action(async () => {
                            await save(current, {
                              ...current.data,
                              automation: {
                                ...current.data.automation!,
                                status: 'queued',
                                error: '',
                                lease: '',
                                lease_until: 0,
                              },
                            });
                          })
                        }
                      >
                        Reprendre la préparation
                      </button>
                    )}
                  </div>
                  <div className="rv-progress-visual">
                    {current.data.images.a ? (
                      <ProjectImage
                        supabase={supabase}
                        project={current}
                        slot="a"
                      />
                    ) : activeJob === current.id ? (
                      <LoaderCircle
                        className="rv-spinner"
                        size={30}
                        aria-label="Préparation en cours"
                      />
                    ) : (
                      <span className="rv-monogram" aria-hidden="true">
                        {current.data.name.slice(0, 1)}
                      </span>
                    )}
                  </div>
                </div>
              )}
              {current.data.brief && (
                <details className="rv-brief">
                  <summary>Consulter le brief et les directions</summary>
                  <h3>Brief</h3>
                  <p>{current.data.brief}</p>
                  <h3>{current.data.presentation === 'single' ? 'Direction' : 'Direction A'}</h3>
                  <p>{current.data.direction_a}</p>
                  {current.data.presentation !== 'single' && <><h3>Direction B</h3><p>{current.data.direction_b}</p></>}
                </details>
              )}
            </article>
          )}
        </>
      ) : (
        <div className="rv-empty">
          <Check size={28} />
          <h2>
            {view === 'companies'
              ? 'La sélection est à jour.'
              : 'Aucune proposition à départager.'}
          </h2>
          {view === 'companies' && awaiting.length > 0 ? (
            <button
              className="rv-primary"
              onClick={() => {
                setView('proposals');
                setSelected('');
              }}
            >
              Voir les propositions <ArrowRight size={17} />
            </button>
          ) : (
            <button onClick={() => setView('companies')}>
              Voir les entreprises
            </button>
          )}
        </div>
      )}
      <footer className="rv-bottom">
        <button
          className="rv-text-button"
          disabled={busy}
          onClick={() => void discover()}
        >
          {busy ? 'Recherche…' : 'Chercher d’autres entreprises'}{' '}
          <ArrowRight size={15} />
        </button>
        <p>
          {selectedProjects.length}{' '}
          {selectedProjects.length > 1
            ? 'propositions choisies'
            : 'proposition choisie'}{' '}
          ·{' '}
          {
            projects.filter((project) => project.data.decision === 'discarded')
              .length
          }{' '}
          entreprises écartées
        </p>
      </footer>
      {selectedProjects.length > 0 && (
        <details className="rv-chosen">
          <summary>Propositions choisies</summary>
          {selectedProjects.map((project) => (
            <div key={project.id}>
              <span>
                {project.data.name} ·{' '}
                {project.data.selected_direction.toUpperCase()}
              </span>
              <button
                disabled={busy}
                onClick={() =>
                  void action(async () => {
                    await save(project, {
                      ...project.data,
                      selected_direction: '',
                    });
                    setView('proposals');
                    setSelected(project.id);
                  })
                }
              >
                Revoir le choix
              </button>
              <ProjectImage
                supabase={supabase}
                project={project}
                slot={project.data.selected_direction as 'a' | 'b'}
              />
            </div>
          ))}
        </details>
      )}
    </section>
  );
}

function Evidence({ data }: { data: ReworkData }) {
  return (
    <details className="rv-evidence">
      <summary>Observations et sources</summary>
      <p>{data.observations || 'Aucune observation consignée.'}</p>
      {data.user_reason && <p>Votre avis : {data.user_reason}</p>}
      {safeUrl(data.source_url) && (
        <a href={safeUrl(data.source_url)!} target="_blank" rel="noreferrer">
          Consulter la source <ArrowUpRight size={14} />
        </a>
      )}
      {safeUrl(data.website) && (
        <a href={safeUrl(data.website)!} target="_blank" rel="noreferrer">
          Voir le site <ArrowUpRight size={14} />
        </a>
      )}
    </details>
  );
}

function ProjectImage({
  supabase,
  project,
  slot,
}: {
  supabase: SupabaseClient;
  project: ReworkProject;
  slot: 'before' | 'a' | 'b';
}) {
  const path = project.data.images[slot];
  const [image, setImage] = useState({ path: '', url: '', error: '' });
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (!path || !path.startsWith(`${project.user_id}/${project.id}/`)) return;
    let active = true;
    async function sign() {
      try {
        const result = await supabase.storage
          .from('radar-rework')
          .createSignedUrl(path, 3600);
        if (active)
          setImage({
            path,
            url: result.data?.signedUrl || '',
            error: result.error ? 'Impossible de charger cette image.' : '',
          });
      } catch {
        if (active)
          setImage({
            path,
            url: '',
            error: 'Impossible de charger cette image.',
          });
      }
    }
    void sign();
    const timer = setInterval(() => void sign(), 3000000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [path, project.id, project.user_id, supabase, refresh]);
  if (slot !== 'before' && (project.data.pages[slot] || (slot === 'a' && project.data.interactive_url)))
    return <ReworkPage supabase={supabase} project={project} slot={slot} />;
  if (!path) return null;
  const title =
    slot === 'before' ? 'Référence' : `Proposition ${slot.toUpperCase()}`;
  return image.path === path && image.url ? (
    <a
      className="rv-image"
      href={image.url}
      target="_blank"
      rel="noreferrer"
      aria-label={`Agrandir ${title.toLowerCase()}`}
    >
      <Image
        src={image.url}
        alt={`${title} — ${project.data.name}`}
        width={1536}
        height={2048}
        unoptimized
        onError={() =>
          setImage({
            path,
            url: '',
            error: 'Impossible de charger cette image.',
          })
        }
      />
      <span>
        Agrandir <ArrowUpRight size={14} />
      </span>
    </a>
  ) : image.path === path && image.error ? (
    <div className="rv-image-error">
      <p role="alert">{image.error}</p>
      <button onClick={() => setRefresh((n) => n + 1)}>
        Recharger l’image
      </button>
    </div>
  ) : (
    <output className="rv-image-loading">Chargement de la maquette…</output>
  );
}
