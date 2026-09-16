'use client';

import Image from 'next/image';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type TouchEvent,
} from 'react';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  Clipboard,
  Clock3,
  ExternalLink,
  LoaderCircle,
  Radar,
  RotateCcw,
  X,
} from 'lucide-react';
import {
  reworkDataSchema,
  sectors,
  signatureStages,
  siteStates,
  safeUrl,
  fromTarget,
  sameCompany,
  identityKey,
  type ReworkData,
  type ReworkProject,
} from '@/lib/radar/rework';
import { decide, snooze } from '@/lib/radar/rework-flow';
import { reworkChatPrompt } from '@/lib/radar/rework-chat';
import type { RadarRefonteResult } from '@/lib/radar/types';

type Props = {
  supabase: SupabaseClient;
  session: Session;
  onOpenDossiers: () => void;
};

type LaunchState = {
  id: string;
  prompt: string;
  copied: boolean;
  opened: boolean;
};

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

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('fr-FR');
}

function signals(data: ReworkData) {
  const unique: string[] = [];
  for (const source of [data.observations, data.initial_assessment, data.angle]) {
    for (const item of source.split(/[\n.;]+/).map((part) => part.trim())) {
      if (item && !unique.includes(item)) unique.push(item);
    }
  }
  if (data.site_state !== 'unknown')
    unique.push(`État du site : ${siteStates[data.site_state]}`);
  if (data.observed_at) unique.push(`Observation datée du ${formatDate(data.observed_at)}`);
  if (data.website) unique.push('Une adresse de site est enregistrée');
  return unique.slice(0, 3);
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
  const [view, setView] = useState<'triage' | 'retained'>('triage');
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [launch, setLaunch] = useState<LaunchState | null>(null);
  const mutationLock = useRef(false);
  const touchStart = useRef<number | null>(null);
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
    if (!result.data.session) throw new Error('Reconnectez-vous pour continuer.');
    return result.data.session.access_token;
  }, [supabase]);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    async function tick() {
      let next = 10000;
      try {
        const rows = await read();
        if (stopped) return;
        setProjects((current) => mergeRows(current, rows));
        setLoading(false);
      } catch (err) {
        if (!stopped) {
          setError(errorMessage(err));
          setLoading(false);
        }
        next = 20000;
      } finally {
        if (!stopped) timer = setTimeout(() => void tick(), next);
      }
    }
    void tick();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [read, refresh]);

  const pending = projects
    .filter((project) => project.data.decision === 'review')
    .toSorted((a, b) => {
      const aSnoozed = !!a.data.triage_snoozed_at;
      const bSnoozed = !!b.data.triage_snoozed_at;
      if (aSnoozed !== bSnoozed) return aSnoozed ? 1 : -1;
      if (aSnoozed && bSnoozed)
        return a.data.triage_snoozed_at.localeCompare(b.data.triage_snoozed_at);
      return `${a.created_at}:${a.id}`.localeCompare(`${b.created_at}:${b.id}`);
    });
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

  const triageQueue = pending;
  const retained = projects
    .filter((project) => project.data.decision === 'retained')
    .toSorted((a, b) => b.updated_at.localeCompare(a.updated_at));
  const queue = view === 'triage' ? triageQueue : retained;
  const current = queue.find((project) => project.id === selected) || queue[0];
  const currentIndex = current ? queue.indexOf(current) : 0;
  const decidedCount = projects.filter(
    (project) => project.data.decision !== 'review',
  ).length;
  const progress = projects.length
    ? Math.round((decidedCount / projects.length) * 100)
    : 0;

  async function decideProject(
    project: ReworkProject,
    decision: ReworkData['decision'],
  ) {
    await action(async () => {
      const nextData =
        decision === 'review' ? snooze(project.data) : decide(project.data, decision);
      await save(project, nextData);
      setSelected('');
      setNotice(
        decision === 'retained'
          ? `${project.data.name} ajoutée aux retenues.`
          : decision === 'discarded'
            ? `${project.data.name} écartée.`
            : `${project.data.name} remise à la fin de la pile.`,
      );
    });
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (view !== 'triage' || !current || busy) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      const decision = event.key === 'ArrowLeft' ? 'discarded' : event.key === 'ArrowDown' ? 'review' : event.key === 'ArrowRight' ? 'retained' : '';
      if (!decision) return;
      event.preventDefault();
      void decideProject(current, decision as ReworkData['decision']);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  function onTouchStart(event: TouchEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest('a, button, input, textarea')) {
      touchStart.current = null;
      return;
    }
    touchStart.current = event.changedTouches[0]?.clientX ?? null;
  }

  function onTouchEnd(event: TouchEvent<HTMLElement>) {
    if (touchStart.current === null || !current || busy) return;
    const delta = (event.changedTouches[0]?.clientX ?? 0) - touchStart.current;
    touchStart.current = null;
    if (Math.abs(delta) < 80) return;
    void decideProject(current, delta > 0 ? 'retained' : 'discarded');
  }

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
        if (existing.some((project) => sameCompany(project.data, data))) continue;
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
      setView('triage');
      setSelected('');
      setNotice(
        count
          ? `${count} entreprises ajoutées à votre sélection.`
          : 'Aucune nouvelle entreprise trouvée dans ce lot.',
      );
    });
  }

  async function launchRework(project: ReworkProject) {
    const prompt = reworkChatPrompt(project);
    const chat = window.open('https://chatgpt.com/', '_blank', 'noopener,noreferrer');
    let copied = false;
    try {
      await navigator.clipboard.writeText(prompt);
      copied = true;
    } catch {
      copied = false;
    }
    setLaunch({ id: project.id, prompt, copied, opened: !!chat });
    setNotice(
      copied
        ? 'Le prompt de refonte est copié. Le nouveau chat reste à ouvrir et à piloter manuellement.'
        : 'Le prompt est prêt, mais le presse-papiers est bloqué. Utilisez le fallback ci-dessous.',
    );
  }

  async function copyPrompt() {
    if (!launch) return;
    try {
      await navigator.clipboard.writeText(launch.prompt);
      setLaunch({ ...launch, copied: true });
      setNotice('Le prompt de refonte est copié.');
    } catch {
      setNotice('Le presse-papiers est bloqué. Sélectionnez le texte ci-dessous.');
    }
  }

  return (
    <section className="rv-desk" aria-label="Radar Rework">
      <header className="rv-header">
        <div className="rv-brandline">
          <span className="rv-brandmark" aria-hidden="true"><Radar size={20} /></span>
          <div>
            <p className="rv-kicker">Radar Rework</p>
            <h1>Décider, une entreprise à la fois.</h1>
          </div>
        </div>
        <div className="rv-session-progress" aria-label={`${progress}% de la sélection décidée`}>
          <span>{decidedCount} / {projects.length || 0}</span>
          <div className="rv-progress-track" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>
        </div>
      </header>
      <div className="rv-nav">
        <nav className="rv-tabs" aria-label="Vue du Radar Rework">
          <button className={view === 'triage' ? 'is-active' : ''} aria-selected={view === 'triage'} role="tab" onClick={() => { setView('triage'); setSelected(''); }}>
            À décider <b>{triageQueue.length}</b>
          </button>
          <button className={view === 'retained' ? 'is-active' : ''} aria-selected={view === 'retained'} role="tab" onClick={() => { setView('retained'); setSelected(''); }}>
            Retenues <b>{retained.length}</b>
          </button>
        </nav>
        <button className="rv-text-button" onClick={onOpenDossiers}>Tous les dossiers <ArrowUpRight size={15} /></button>
      </div>
      {error && (
        <div className="rv-alert" role="alert">
          <p>{error}</p>
          <button onClick={() => { setError(''); setRefresh((n) => n + 1); }}>Réessayer</button>
        </div>
      )}
      {notice && <output className="rv-notice" aria-live="polite">{notice}</output>}
      {loading ? (
        <output className="rv-empty">Chargement de votre sélection…</output>
      ) : view === 'retained' ? (
        <RetainedList projects={retained} launch={launch} busy={busy} onLaunch={(project) => void launchRework(project)} onCopy={() => void copyPrompt()} onShowFallback={() => { if (launch) setLaunch({ ...launch, copied: false }); }} />
      ) : current ? (
        <>
          <div className="rv-position">
            <p>{triageQueue.length} entreprise{triageQueue.length > 1 ? 's' : ''} à décider</p>
            <span>{currentIndex + 1} / {triageQueue.length}</span>
          </div>
          <article className="rv-triage-card" key={current.id} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} aria-labelledby="rv-current-name">
            <div className="rv-card-preview">
              <div className="rv-preview-heading">
                <span>Aperçu du site</span>
                {current.data.site_state !== 'unknown' && <span>{siteStates[current.data.site_state]}</span>}
              </div>
              {current.data.images.before && current.data.images.before.startsWith(`${current.user_id}/${current.id}/`) ? <ProjectImage supabase={supabase} project={current} /> : <div className="rv-site-placeholder"><Radar size={34} /><span>Aucune capture disponible</span></div>}
            </div>
            <div className="rv-card-body">
              <div className="rv-card-identity">
                <p className="rv-eyebrow">{sectors[current.data.sector]}</p>
                <h2 id="rv-current-name">{current.data.name}</h2>
                <p className="rv-details">{current.data.locality || 'Localisation non renseignée'}{current.data.observed_at ? ` · observée le ${formatDate(current.data.observed_at)}` : ''}</p>
                {safeUrl(current.data.website) && <a className="rv-site-link" href={safeUrl(current.data.website)!} target="_blank" rel="noreferrer">Ouvrir le site <ExternalLink size={15} /></a>}
              </div>
              <div className="rv-signals">
                <p className="rv-eyebrow">Ce qui a été observé</p>
                {signals(current.data).length ? <ul>{signals(current.data).map((signal) => <li key={signal}>{signal}</li>)}</ul> : <p className="rv-muted">Aucun signal détaillé n’est enregistré.</p>}
              </div>
              <p className="rv-question">Est-ce que ce site mérite une refonte ?</p>
              <div className="rv-decision-actions" aria-label="Décider du sort de cette entreprise">
                <button className="rv-decision rv-decision-discard" disabled={busy} onClick={() => void decideProject(current, 'discarded')}><X size={20} /><span>Non, écarter</span><kbd>←</kbd></button>
                <button className="rv-decision rv-decision-later" disabled={busy} onClick={() => void decideProject(current, 'review')}><Clock3 size={20} /><span>Revoir plus tard</span><kbd>↓</kbd></button>
                <button className="rv-decision rv-decision-retain" disabled={busy} onClick={() => void decideProject(current, 'retained')}><Check size={20} /><span>Oui, à refaire</span><kbd>→</kbd></button>
              </div>
              <p className="rv-swipe-hint"><ArrowLeft size={14} /> Glisser à gauche pour écarter · à droite pour retenir <ArrowRight size={14} /></p>
            </div>
          </article>
        </>
      ) : (
        <div className="rv-empty">
          <Check size={28} />
          <h2>La sélection est à jour.</h2>
          <p>Les entreprises retenues sont disponibles dans l’onglet Retenues.</p>
          {retained.length ? <button className="rv-primary" onClick={() => setView('retained')}>Voir les retenues <ArrowRight size={17} /></button> : null}
        </div>
      )}
      <footer className="rv-bottom">
        <button className="rv-text-button" disabled={busy} onClick={() => void discover()}>{busy ? 'Recherche…' : 'Chercher d’autres entreprises'} <ArrowRight size={15} /></button>
        <button className="rv-text-button" onClick={onOpenDossiers}>Ouvrir les dossiers <ArrowUpRight size={15} /></button>
      </footer>
    </section>
  );
}

function RetainedList({
  projects,
  launch,
  busy,
  onLaunch,
  onCopy,
  onShowFallback,
}: {
  projects: ReworkProject[];
  launch: LaunchState | null;
  busy: boolean;
  onLaunch: (project: ReworkProject) => void;
  onCopy: () => void;
  onShowFallback: () => void;
}) {
  return (
    <section className="rv-retained-view" aria-labelledby="rv-retained-heading">
      <div className="rv-retained-heading"><div><p className="rv-kicker">Entreprises retenues</p><h2 id="rv-retained-heading">Une prochaine action par dossier.</h2></div><span>{projects.length}</span></div>
      {projects.length ? (
        <div className="rv-retained-list">
          {projects.map((project) => (
            <article className="rv-retained-row" key={project.id}>
              <div className="rv-retained-icon" aria-hidden="true">{project.data.name.slice(0, 1).toUpperCase()}</div>
              <div className="rv-retained-copy"><h3>{project.data.name}</h3><p>{sectors[project.data.sector]} · {project.data.locality || 'Localisation non renseignée'}{project.data.automation?.workflow === 'signature-v1' ? ` · ${signatureStages[project.data.automation.stage]}` : ''}</p></div>
              <button className="rv-launch-button" disabled={busy} onClick={() => onLaunch(project)}>Lancer la refonte <ArrowUpRight size={16} /></button>
              {launch?.id === project.id && (
                <output className="rv-chat-result">
                  <p><Check size={16} /> {launch.copied ? 'Prompt copié dans le presse-papiers.' : 'Prompt prêt à copier.'}</p>
                  {!launch.opened && <a href="https://chatgpt.com/" target="_blank" rel="noreferrer">Ouvrir ChatGPT manuellement <ExternalLink size={14} /></a>}
                  {!launch.copied && <textarea id={`rv-prompt-${project.id}`} readOnly value={launch.prompt} aria-label="Prompt de refonte à copier" />}
                  <div><button type="button" onClick={onCopy}><Clipboard size={14} /> Copier le prompt</button><button type="button" onClick={onShowFallback}><RotateCcw size={14} /> Afficher le fallback</button></div>
                </output>
              )}
            </article>
          ))}
        </div>
      ) : <div className="rv-empty rv-empty-small"><p>Aucune entreprise retenue pour le moment.</p></div>}
    </section>
  );
}

function ProjectImage({ supabase, project }: { supabase: SupabaseClient; project: ReworkProject }) {
  const path = project.data.images.before;
  const [image, setImage] = useState({ path: '', url: '', error: '' });
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (!path || !path.startsWith(`${project.user_id}/${project.id}/`)) return;
    let active = true;
    async function sign() {
      try {
        const result = await supabase.storage.from('radar-rework').createSignedUrl(path, 3600);
        if (active) setImage({ path, url: result.data?.signedUrl || '', error: result.error ? 'Impossible de charger cette image.' : '' });
      } catch {
        if (active) setImage({ path, url: '', error: 'Impossible de charger cette image.' });
      }
    }
    void sign();
    return () => { active = false; };
  }, [path, project.id, project.user_id, supabase, refresh]);
  if (image.path === path && image.url)
    return <a className="rv-image" href={image.url} target="_blank" rel="noreferrer" aria-label={`Agrandir le site de ${project.data.name}`}><Image src={image.url} alt={`Capture du site de ${project.data.name}`} width={1536} height={900} unoptimized /><span>Agrandir <ArrowUpRight size={14} /></span></a>;
  if (image.path === path && image.error)
    return <div className="rv-image-error" role="alert"><p>{image.error}</p><button onClick={() => setRefresh((n) => n + 1)}>Recharger l’image</button></div>;
  return <output className="rv-image-loading"><LoaderCircle size={20} /> Chargement de l’aperçu…</output>;
}
