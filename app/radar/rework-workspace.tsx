'use client';

import Image from 'next/image';
import ReworkValidation from './rework-validation';
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
  ArrowLeft,
  ArrowUpRight,
  Download,
  Plus,
  RefreshCw,
  Search,
  Upload,
} from 'lucide-react';
import {
  decisions,
  siteStates,
  projectTypes,
  sectors,
  identityKey,
  sameCompany,
  fromTarget,
  parseReworkImport,
  prepareRework,
  reworkDataSchema,
  safeUrl,
  type ReworkData,
  type ReworkProject,
  type ReworkVersion,
} from '@/lib/radar/rework';
import type { RadarRefonteResult } from '@/lib/radar/types';

type Props = {
  supabase: SupabaseClient | null;
  session: Session | null;
  authReady: boolean;
  member: boolean;
  membershipState: string;
  onRetry: () => void;
  onDirty: (dirty: boolean) => void;
};
type ImageSlot = 'before' | 'a' | 'b';
const labels: Record<ImageSlot, string> = {
  before: 'Site actuel / référence',
  a: 'Proposition A',
  b: 'Proposition B',
};
const timeout = () => AbortSignal.timeout(15000);
const message = (e: unknown) =>
  e instanceof Error
    ? e.message
    : 'L’opération a échoué. Vos modifications restent affichées ; réessayez.';

export default function ReworkWorkspace(props: Props) {
  if (!props.supabase)
    return (
      <p className="rl-empty">
        L’espace privé est indisponible. Réessayez plus tard.
      </p>
    );
  if (
    !props.authReady ||
    (props.session && ['idle', 'checking'].includes(props.membershipState))
  )
    return <output className="rl-empty">Ouverture de votre espace…</output>;
  if (!props.session) return <ReworkLogin supabase={props.supabase} />;
  if (!props.member)
    return (
      <div className="rl-empty">
        <p>
          {props.membershipState === 'denied'
            ? 'Ce compte n’a pas accès au Radar.'
            : 'Impossible de vérifier votre accès.'}
        </p>
        <button onClick={props.onRetry}>Réessayer</button>
        <button onClick={() => void props.supabase!.auth.signOut()}>
          Changer de compte
        </button>
      </div>
    );
  return (
    <ReworkHome
      key={props.session.user.id}
      supabase={props.supabase}
      session={props.session}
      onDirty={props.onDirty}
    />
  );
}

function ReworkHome(props: {
  supabase: SupabaseClient;
  session: Session;
  onDirty: Props['onDirty'];
}) {
  const [archive, setArchive] = useState(false);
  const [dirty, setDirty] = useState(false);
  const reportDirty = props.onDirty;
  const onDirty = useCallback(
    (value: boolean) => {
      setDirty(value);
      reportDirty(value);
    },
    [reportDirty],
  );
  if (!archive)
    return (
      <ReworkValidation
        supabase={props.supabase}
        session={props.session}
        onOpenDossiers={() => setArchive(true)}
      />
    );
  return (
    <>
      <button
        className="rv-back"
        onClick={() => {
          if (
            dirty &&
            !window.confirm('Quitter sans enregistrer les modifications ?')
          )
            return;
          setArchive(false);
        }}
      >
        <ArrowLeft size={16} /> Retour aux validations
      </button>
      <ReworkDesk {...props} onDirty={onDirty} />
    </>
  );
}

function ReworkLogin({ supabase }: { supabase: SupabaseClient }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function login(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    try {
      const result = await supabase.auth.signInWithPassword({
        email: values.get('email') as string,
        password: values.get('password') as string,
      });
      if (result.error) throw result.error;
    } catch {
      setError(
        'Connexion impossible. Vérifiez votre adresse et votre mot de passe.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="rl-login" onSubmit={login}>
      <h2>Votre atelier privé</h2>
      <p>
        Retrouvez vos entreprises, vos décisions et vos propositions de site.
      </p>
      <label>
        Adresse e-mail
        <input name="email" type="email" autoComplete="username" required />
      </label>
      <label>
        Mot de passe
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </label>
      {error && (
        <p role="alert" className="rl-error">
          {error}
        </p>
      )}
      <button className="rl-primary" disabled={busy}>
        {busy ? 'Connexion…' : 'Se connecter'}
      </button>
    </form>
  );
}

function ReworkDesk({
  supabase,
  session,
  onDirty,
}: {
  supabase: SupabaseClient;
  session: Session;
  onDirty: Props['onDirty'];
}) {
  const [projects, setProjects] = useState<ReworkProject[]>([]);
  const [draft, setDraft] = useState<ReworkProject | null>(null);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [pane, setPane] = useState<'dossier' | 'atelier' | 'history'>(
    'dossier',
  );
  const [history, setHistory] = useState<{
    key: string;
    rows: ReworkVersion[];
    error: string;
  }>({ key: '', rows: [], error: '' });
  const [add, setAdd] = useState(false);
  const [discover, setDiscover] = useState(false);
  const [radius, setRadius] = useState(35);
  const [imageState, setImageState] = useState<{
    key: string;
    urls: Partial<Record<ImageSlot, string>>;
    error: string;
  }>({ key: '', urls: {}, error: '' });
  const [imageRefresh, setImageRefresh] = useState(0);
  const mounted = useRef(true);
  const dirtyRef = useRef(false);
  const taskLock = useRef(false);
  const owner = session.user.id;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      onDirty(false);
    };
  }, [onDirty]);
  useEffect(() => {
    dirtyRef.current = dirty;
    onDirty(dirty);
  }, [dirty, onDirty]);
  useEffect(() => {
    const prevent = (event: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        event.preventDefault();
      }
    };
    window.addEventListener('beforeunload', prevent);
    return () => window.removeEventListener('beforeunload', prevent);
  }, []);
  const readProjects = useCallback(async () => {
    const rows: ReworkProject[] = [];
    for (let offset = 0; ; offset += 200) {
      const result = await supabase
        .from('radar_rework_projects')
        .select('*')
        .eq('user_id', owner)
        .order('created_at')
        .order('id')
        .range(offset, offset + 199)
        .abortSignal(timeout());
      if (result.error)
        throw new Error('Impossible de charger vos dossiers. Réessayez.');
      rows.push(
        ...(result.data.map((row) => ({
          ...row,
          data: reworkDataSchema.parse(row.data),
        })) as ReworkProject[]),
      );
      if (result.data.length < 200) return rows;
    }
  }, [supabase, owner]);
  async function reload() {
    setLoading(true);
    setLoadError(false);
    setError('');
    try {
      const rows = await readProjects();
      if (mounted.current) {
        setProjects(rows);
        setDraft(null);
        setDirty(false);
      }
    } catch (e) {
      if (mounted.current) {
        setLoadError(true);
        setError(message(e));
      }
    } finally {
      if (mounted.current) setLoading(false);
    }
  }
  useEffect(() => {
    let active = true;
    void readProjects()
      .then((rows) => {
        if (active) setProjects(rows);
      })
      .catch((e) => {
        if (active) {
          setLoadError(true);
          setError(message(e));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [readProjects]);
  const projectId = draft?.id || '';
  const revision = draft?.revision || 0;
  const imagePaths = JSON.stringify(draft?.data.images || {});
  const imageKey = projectId + imagePaths + imageRefresh;
  const signed = imageState.key === imageKey ? imageState.urls : {};
  const imageError = imageState.key === imageKey ? imageState.error : '';
  const historyKey = projectId + ':' + revision;
  const historyLoading = pane === 'history' && history.key !== historyKey;
  const versions = history.key === historyKey ? history.rows : [];
  const historyError = history.key === historyKey ? history.error : '';
  useEffect(() => {
    let active = true;
    if (!projectId) return;
    const paths = Object.entries(
      JSON.parse(imagePaths) as Record<ImageSlot, string>,
    ).filter(([, path]) => path && path.startsWith(`${owner}/${projectId}/`));
    void (async () => {
      const urls: Partial<Record<ImageSlot, string>> = {};
      let error = '';
      try {
        await Promise.all(
          paths.map(async ([slot, path]) => {
            const result = await supabase.storage
              .from('radar-rework')
              .createSignedUrl(path, 3600);
            if (result.error)
              error = 'Certaines images n’ont pas pu être chargées.';
            else urls[slot as ImageSlot] = result.data.signedUrl;
          }),
        );
      } catch {
        error = 'Impossible de charger les images.';
      }
      if (active) setImageState({ key: imageKey, urls, error });
    })();
    return () => {
      active = false;
    };
  }, [projectId, imagePaths, imageKey, owner, supabase]);
  useEffect(() => {
    let active = true;
    if (pane !== 'history' || !projectId) return;
    void (async () => {
      try {
        const result = await supabase
          .from('radar_rework_versions')
          .select('*')
          .eq('user_id', owner)
          .eq('project_id', projectId)
          .order('revision', { ascending: false })
          .limit(50)
          .abortSignal(timeout());
        if (result.error) throw result.error;
        if (active)
          setHistory({
            key: historyKey,
            rows: result.data as ReworkVersion[],
            error: '',
          });
      } catch {
        if (active)
          setHistory({
            key: historyKey,
            rows: [],
            error:
              'Impossible de charger les versions. Ouvrez à nouveau cet onglet pour réessayer.',
          });
      }
    })();
    return () => {
      active = false;
    };
  }, [pane, projectId, historyKey, owner, supabase]);
  async function run(label: string, action: () => Promise<void>) {
    if (taskLock.current) return;
    taskLock.current = true;
    setBusy(label);
    setError('');
    setNotice('');
    try {
      await action();
    } catch (e) {
      if (mounted.current) setError(message(e));
    } finally {
      taskLock.current = false;
      if (mounted.current) setBusy('');
    }
  }
  function edit(patch: Partial<ReworkData>) {
    setDraft((current) =>
      current ? { ...current, data: { ...current.data, ...patch } } : null,
    );
    setDirty(true);
  }
  function canLeave() {
    return (
      !dirty || window.confirm('Quitter sans enregistrer les modifications ?')
    );
  }
  async function persist(value: ReworkProject) {
    const parsed = reworkDataSchema.safeParse(value.data);
    if (!parsed.success)
      throw new Error(
        'Vérifiez le nom, les adresses et la longueur des textes (12 000 caractères maximum par champ).',
      );
    if (
      projects.some(
        (p) => p.id !== value.id && sameCompany(p.data, parsed.data),
      )
    )
      throw new Error('Cette entreprise possède déjà un dossier.');
    const result = await supabase
      .from('radar_rework_projects')
      .update({ data: parsed.data, identity_key: identityKey(parsed.data) })
      .eq('user_id', owner)
      .eq('id', value.id)
      .eq('revision', value.revision)
      .select('*')
      .abortSignal(timeout())
      .maybeSingle();
    if (result.error)
      throw new Error(
        result.error.code === '23505'
          ? 'Cette entreprise possède déjà un dossier.'
          : 'Enregistrement impossible. Réessayez.',
      );
    if (!result.data)
      throw new Error(
        'Ce dossier a changé dans un autre onglet. Copiez vos textes puis actualisez pour retrouver sa dernière version.',
      );
    if (mounted.current) {
      const saved = result.data as ReworkProject;
      setProjects((rows) => rows.map((p) => (p.id === saved.id ? saved : p)));
      setDraft(saved);
      setDirty(false);
      setNotice('Dossier enregistré.');
    }
  }
  async function insertMany(entries: ReworkData[]) {
    const fresh = await readProjects();
    const added: ReworkProject[] = [];
    try {
      for (const data of entries) {
        if (!mounted.current) break;
        if ([...fresh, ...added].some((row) => sameCompany(row.data, data)))
          continue;
        const result = await supabase
          .from('radar_rework_projects')
          .insert({ user_id: owner, identity_key: identityKey(data), data })
          .select('*')
          .abortSignal(timeout())
          .single();
        if (result.error?.code === '23505') continue;
        if (result.error)
          throw new Error(
            `Ajout interrompu après ${added.length} dossier(s) enregistré(s). Vous pouvez relancer sans les dupliquer.`,
          );
        added.push(result.data as ReworkProject);
      }
    } finally {
      if (mounted.current) setProjects([...fresh, ...added]);
    }
    if (mounted.current)
      setNotice(
        `${added.length} dossier(s) ajouté(s). ${entries.length - added.length} déjà présent(s).`,
      );
    return added;
  }
  async function search(event: SubmitEvent) {
    event.preventDefault();
    await run('Recherche des entreprises…', async () => {
      const response = await fetch(`/api/radar/refonte?radiusKm=${radius}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        signal: AbortSignal.timeout(55000),
        cache: 'no-store',
      });
      const payload = (await response.json()) as RadarRefonteResult & {
        error?: string;
      };
      if (!response.ok)
        throw new Error(payload.error || 'Recherche indisponible.');
      if (!mounted.current) return;
      await insertMany(
        payload.targets.map((target) =>
          fromTarget(target, payload.retrievedAt),
        ),
      );
      if (mounted.current) {
        setFilter('review');
        setQuery('');
      }
    });
  }
  async function create(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    await run('Ajout du dossier…', async () => {
      const data = reworkDataSchema.parse({
        name: values.get('name'),
        website: values.get('website'),
        locality: values.get('locality'),
      });
      const added = await insertMany([data]);
      if (mounted.current && added[0]) {
        setDraft(added[0]);
        setPane('dossier');
        setAdd(false);
      }
    });
  }
  async function upload(file: File, slot: ImageSlot) {
    const current = draft;
    if (!current) return;
    await run('Enregistrement de l’image…', async () => {
      if (
        !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
        file.size > 8 * 1024 * 1024
      )
        throw new Error(
          'Choisissez une image PNG, JPEG ou WebP de moins de 8 Mo.',
        );
      const path = `${owner}/${current.id}/${crypto.randomUUID()}.${file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1]}`;
      const result = await supabase.storage
        .from('radar-rework')
        .upload(path, file, { contentType: file.type, upsert: false });
      if (result.error)
        throw new Error('Impossible d’ajouter l’image. Réessayez.');
      const updated = {
        ...current,
        data: {
          ...current.data,
          images: { ...current.data.images, [slot]: path },
        },
      };
      if (!mounted.current) return;
      setDraft(updated);
      setDirty(true);
      await persist(updated);
    });
  }
  function download(
    filename: string,
    content: string,
    type = 'application/json',
  ) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const visible = projects.filter(
    (p) =>
      (filter === 'all' || p.data.decision === filter) &&
      `${p.data.name} ${p.data.locality}`
        .toLocaleLowerCase('fr')
        .includes(query.toLocaleLowerCase('fr')),
  );
  const data = draft?.data;
  const field = (
    name:
      | 'observations'
      | 'user_reason'
      | 'angle'
      | 'brief'
      | 'direction_a'
      | 'direction_b',
    label: string,
    rows = 4,
  ) => (
    <label>
      {label}
      <textarea
        value={data![name]}
        rows={rows}
        maxLength={12000}
        disabled={!!busy}
        onChange={(e) => edit({ [name]: e.target.value })}
      />
    </label>
  );
  const picture = (slot: ImageSlot) => (
    <section className="rw-image" key={slot}>
      <h3>{labels[slot]}</h3>
      {signed[slot] ? (
        <a href={signed[slot]} target="_blank" rel="noreferrer">
          <Image
            unoptimized
            width={1200}
            height={900}
            src={signed[slot]!}
            alt={`${labels[slot]} — ${data!.name}`}
          />
        </a>
      ) : (
        <p>Aucune image jointe.</p>
      )}
      <label className={`rw-file ${busy ? 'rw-disabled' : ''}`}>
        <Upload size={15} />
        {data!.images[slot] ? 'Remplacer l’image' : 'Joindre une image'}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={!!busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) void upload(file, slot);
          }}
        />
      </label>
    </section>
  );

  return (
    <section className="rw-workspace" aria-label="Atelier Rework">
      <div className="rw-toolbar">
        <p>
          {projects.length} dossiers ·{' '}
          {projects.filter((p) => p.data.decision === 'retained').length}{' '}
          retenus
        </p>
        <div>
          <button
            disabled={!!busy || dirty || loading}
            onClick={() => void reload()}
            aria-label="Actualiser les dossiers"
          >
            <RefreshCw size={16} />
          </button>
          <button
            disabled={!!busy || dirty}
            onClick={() =>
              void run('Déconnexion…', async () => {
                const result = await supabase.auth.signOut();
                if (result.error) throw new Error('Déconnexion impossible.');
              })
            }
          >
            Déconnexion
          </button>
        </div>
      </div>
      {error && (
        <p className="rl-error" role="alert">
          {error}
        </p>
      )}
      {notice && <output className="rw-notice">{notice}</output>}
      {busy && <output className="rw-muted">{busy}</output>}
      {loading ? (
        <output className="rl-empty">Chargement des dossiers…</output>
      ) : loadError ? (
        <div className="rl-empty">
          <button onClick={() => void reload()}>Recharger les dossiers</button>
        </div>
      ) : draft && data ? (
        <>
          <div className="rw-dossier-heading">
            <button
              disabled={!!busy}
              onClick={() => {
                if (canLeave()) {
                  setDraft(null);
                  setDirty(false);
                  setNotice('');
                }
              }}
            >
              <ArrowLeft size={15} />
              Tous les dossiers
            </button>
            <div>
              <span className={`rw-status rw-${data.decision}`}>
                {decisions[data.decision]}
              </span>
              <h2>{data.name}</h2>
              <p>
                {data.locality || 'Commune à préciser'} ·{' '}
                {projectTypes[data.project_type]}
              </p>
            </div>
          </div>
          <nav className="rw-tabs" aria-label="Dossier et propositions">
            {(
              [
                ['dossier', 'Le dossier'],
                ['atelier', 'Brief et propositions'],
                ['history', 'Versions'],
              ] as const
            ).map(([value, title]) => (
              <button
                key={value}
                aria-current={pane === value ? 'page' : undefined}
                onClick={() => setPane(value)}
              >
                {title}
              </button>
            ))}
          </nav>
          <fieldset className="rw-editor" disabled={!!busy}>
            {pane === 'dossier' && (
              <>
                <div className="rw-grid">
                  <label>
                    Entreprise
                    <input
                      maxLength={250}
                      value={data.name}
                      onChange={(e) => edit({ name: e.target.value })}
                    />
                  </label>
                  <label>
                    Commune
                    <input
                      maxLength={250}
                      value={data.locality}
                      onChange={(e) => edit({ locality: e.target.value })}
                    />
                  </label>
                  <label>
                    Site ou page de référence
                    <input
                      type="url"
                      maxLength={1500}
                      value={data.website}
                      onChange={(e) => edit({ website: e.target.value })}
                    />
                  </label>
                  <label>
                    Activité
                    <select
                      value={data.sector}
                      onChange={(e) =>
                        edit({ sector: e.target.value as ReworkData['sector'] })
                      }
                    >
                      {Object.entries(sectors).map(([v, l]) => (
                        <option value={v} key={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    État du site
                    <select
                      value={data.site_state}
                      onChange={(e) =>
                        edit({
                          site_state: e.target
                            .value as ReworkData['site_state'],
                        })
                      }
                    >
                      {Object.entries(siteStates).map(([v, l]) => (
                        <option value={v} key={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Projet envisagé
                    <select
                      value={data.project_type}
                      onChange={(e) =>
                        edit({
                          project_type: e.target
                            .value as ReworkData['project_type'],
                        })
                      }
                    >
                      {Object.entries(projectTypes).map(([v, l]) => (
                        <option value={v} key={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Source
                    <input
                      type="url"
                      maxLength={1500}
                      value={data.source_url}
                      onChange={(e) => edit({ source_url: e.target.value })}
                    />
                  </label>
                  <label>
                    Date d’observation
                    <input
                      type="date"
                      value={data.observed_at}
                      onChange={(e) => edit({ observed_at: e.target.value })}
                    />
                  </label>
                </div>
                <div className="rw-links">
                  {safeUrl(data.website) && (
                    <a
                      href={safeUrl(data.website)!}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Ouvrir le site <ArrowUpRight size={15} />
                    </a>
                  )}
                  {safeUrl(data.source_url) && (
                    <a
                      href={safeUrl(data.source_url)!}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Voir la source <ArrowUpRight size={15} />
                    </a>
                  )}
                </div>
                {field('observations', 'Observations sur le site')}
                {data.initial_assessment && (
                  <div className="rw-initial">
                    <small>Avis initial de l’assistant</small>
                    <p>{data.initial_assessment}</p>
                  </div>
                )}
                <label>
                  Ma décision
                  <select
                    value={data.decision}
                    onChange={(e) =>
                      edit({
                        decision: e.target.value as ReworkData['decision'],
                      })
                    }
                  >
                    {Object.entries(decisions).map(([v, l]) => (
                      <option value={v} key={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </label>
                {field('user_reason', 'Mon avis et mes corrections', 3)}
                {field('angle', 'Piste à explorer — hypothèse', 3)}
                {picture('before')}
              </>
            )}
            {pane === 'atelier' && (
              <>
                {data.decision !== 'retained' && (
                  <p className="rw-initial">
                    Retenez cette entreprise dans le dossier pour préparer ses
                    propositions.
                  </p>
                )}
                {data.decision === 'retained' &&
                  !(data.brief || data.direction_a || data.direction_b) && (
                    <div className="rw-start">
                      <h3>Préparer une proposition qui lui ressemble</h3>
                      <p>
                        Choisissez l’activité et précisez votre piste dans le
                        dossier, puis préparez le brief et deux directions à
                        travailler.
                      </p>
                      <button
                        className="rl-primary"
                        onClick={() => edit(prepareRework(data))}
                      >
                        Préparer le brief et les deux directions
                      </button>
                    </div>
                  )}
                {field('brief', 'Brief', 13)}
                <div className="rw-directions" data-single={data.presentation === 'single'}>
                  <section>
                    {field('direction_a', data.presentation === 'single' ? 'Direction' : 'Direction A', 18)}
                    {(data.pages.a || data.interactive_url) && draft && supabase && (
                      <ReworkPage
                        supabase={supabase}
                        project={draft}
                        slot="a"
                      />
                    )}
                    {picture('a')}
                  </section>
                  {data.presentation !== 'single' && <section>
                    {field('direction_b', 'Direction B', 18)}
                    {data.pages.b && draft && supabase && (
                      <ReworkPage
                        supabase={supabase}
                        project={draft}
                        slot="b"
                      />
                    )}
                    {picture('b')}
                  </section>}
                </div>
                <label>
                  Direction choisie
                  <select
                    value={data.selected_direction}
                    onChange={(e) =>
                      edit({
                        selected_direction: e.target
                          .value as ReworkData['selected_direction'],
                      })
                    }
                  >
                    <option value="">Pas encore choisie</option>
                    <option value="a">{data.presentation === 'single' ? 'Proposition validée' : 'Proposition A'}</option>
                    {data.presentation !== 'single' && <option value="b">Proposition B</option>}
                  </select>
                </label>
                <button
                  disabled={
                    !(data.brief || data.direction_a || data.direction_b)
                  }
                  onClick={() =>
                    download(
                      `${data.name.replace(/[^a-zA-Z0-9-]/g, '_')}-brief.md`,
                      `# ${data.name}\n\n${data.brief}\n\n## Direction A\n\n${data.direction_a}\n\n## Direction B\n\n${data.direction_b}`,
                      'text/markdown;charset=utf-8',
                    )
                  }
                >
                  <Download size={15} />
                  Exporter le brief et les directions
                </button>
              </>
            )}
            {pane === 'history' && (
              <div className="rw-history">
                {historyLoading && <output>Chargement des versions…</output>}
                {historyError && <p role="alert">{historyError}</p>}
                {versions.map((v) => (
                  <details key={v.id}>
                    <summary>
                      Version {v.revision} ·{' '}
                      {new Date(v.created_at).toLocaleString('fr-FR')} ·{' '}
                      {decisions[v.data.decision]}
                    </summary>
                    <p>{v.data.user_reason || 'Aucun avis ajouté.'}</p>
                    <pre>{v.data.brief || v.data.observations}</pre>
                    {v.data.direction_a && <pre>{v.data.direction_a}</pre>}
                    {v.data.direction_b && <pre>{v.data.direction_b}</pre>}
                    <button
                      onClick={() => {
                        if (canLeave()) {
                          edit(reworkDataSchema.parse(v.data));
                          setPane('dossier');
                          setNotice(
                            'Version reprise. Enregistrez pour la conserver comme nouvelle version.',
                          );
                        }
                      }}
                    >
                      Reprendre cette version
                    </button>
                  </details>
                ))}
                {versions.length === 50 && (
                  <p>Les 50 dernières versions sont affichées.</p>
                )}
              </div>
            )}
          </fieldset>
          {imageError && (
            <p role="alert">
              {imageError}{' '}
              <button onClick={() => setImageRefresh((n) => n + 1)}>
                Recharger les images
              </button>
            </p>
          )}
          <div className="rw-save">
            <span>
              {dirty
                ? 'Modifications à enregistrer'
                : `Version ${draft.revision} enregistrée`}
            </span>
            <button
              className="rl-primary"
              disabled={!!busy || !dirty}
              onClick={() => void run('Enregistrement…', () => persist(draft))}
            >
              Enregistrer le dossier
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="rw-actions">
            <button
              className="rl-primary"
              disabled={!!busy}
              onClick={() => {
                setDiscover(!discover);
                setAdd(false);
              }}
            >
              <Search size={16} />
              Chercher 8 entreprises
            </button>
            <button
              disabled={!!busy}
              onClick={() => {
                setAdd(!add);
                setDiscover(false);
              }}
            >
              <Plus size={16} />
              Ajouter un dossier
            </button>
            <label className={`rw-file ${busy ? 'rw-disabled' : ''}`}>
              <Upload size={15} />
              Importer
              <input
                type="file"
                accept="application/json,.json"
                disabled={!!busy}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (file)
                    void run('Import des dossiers…', async () => {
                      if (file.size > 5 * 1024 * 1024)
                        throw new Error('Le fichier dépasse 5 Mo.');
                      let entries: ReworkData[];
                      try {
                        entries = parseReworkImport(await file.text());
                      } catch {
                        throw new Error(
                          'Utilisez un export JSON du Radar Rework (500 dossiers maximum).',
                        );
                      }
                      await insertMany(entries);
                    });
                }}
              />
            </label>
            <button
              disabled={!!busy || !projects.length}
              onClick={() =>
                download(
                  'radar-rework.json',
                  JSON.stringify(
                    {
                      version: 1,
                      exportedAt: new Date().toISOString(),
                      projects,
                    },
                    null,
                    2,
                  ),
                )
              }
            >
              <Download size={15} />
              Exporter
            </button>
          </div>
          {discover && (
            <form className="rw-create" onSubmit={search}>
              <label>
                Rayon autour de Vairé (km)
                <input
                  type="number"
                  min={5}
                  max={50}
                  step={1}
                  required
                  value={radius}
                  disabled={!!busy}
                  onChange={(e) => setRadius(Number(e.target.value))}
                />
              </label>
              <p>
                Jusqu’à huit entreprises et associations sont ajoutées aux
                dossiers à revoir. Leur site reste à examiner.
              </p>
              <button disabled={!!busy}>Rechercher et ajouter au Radar</button>
            </form>
          )}
          {add && (
            <form className="rw-create" onSubmit={create}>
              <label>
                Nom de l’entreprise
                <input name="name" maxLength={250} required disabled={!!busy} />
              </label>
              <label>
                Commune
                <input name="locality" maxLength={250} disabled={!!busy} />
              </label>
              <label>
                Site ou page de référence
                <input
                  name="website"
                  type="url"
                  maxLength={1500}
                  disabled={!!busy}
                />
              </label>
              <button disabled={!!busy}>Créer le dossier</button>
            </form>
          )}
          <div className="rw-filters">
            <nav aria-label="Filtrer les décisions">
              {[['all', 'Tous'], ...Object.entries(decisions)].map(([v, l]) => (
                <button
                  key={v}
                  aria-pressed={filter === v}
                  onClick={() => setFilter(v)}
                >
                  {l}{' '}
                  <span>
                    {
                      projects.filter(
                        (p) => v === 'all' || p.data.decision === v,
                      ).length
                    }
                  </span>
                </button>
              ))}
            </nav>
            <label>
              <span className="rw-sr-only">Rechercher dans les dossiers</span>
              <input
                type="search"
                placeholder="Rechercher une entreprise…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
          </div>
          <div className="rw-list">
            {visible.map((project) => (
              <article key={project.id}>
                <button
                  className="rw-open"
                  disabled={!!busy}
                  onClick={() => {
                    setDraft(project);
                    setDirty(false);
                    setPane('dossier');
                    setNotice('');
                  }}
                >
                  <span>
                    <strong>{project.data.name}</strong>
                    <small>
                      {project.data.locality || 'Commune à préciser'} ·{' '}
                      {projectTypes[project.data.project_type]}
                    </small>
                  </span>
                  <span className="rw-row-details">
                    <span className={`rw-status rw-${project.data.decision}`}>
                      {decisions[project.data.decision]}
                    </span>
                    <small>
                      {project.data.images.a || project.data.images.b
                        ? 'Maquette jointe'
                        : project.data.brief
                          ? 'Brief préparé'
                          : siteStates[project.data.site_state]}
                    </small>
                  </span>
                  <ArrowUpRight size={19} />
                </button>
              </article>
            ))}
          </div>
          {!visible.length && (
            <p className="rl-empty">
              {projects.length
                ? 'Aucun dossier ne correspond à ce filtre.'
                : 'Ajoutez une entreprise ou lancez une recherche pour commencer.'}
            </p>
          )}
        </>
      )}
    </section>
  );
}
