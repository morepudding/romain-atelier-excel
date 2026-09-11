'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ExternalLink,
  LoaderCircle,
  LogOut,
  Radar,
  RefreshCw,
} from 'lucide-react';
import { getSupabaseBrowser } from '@/lib/supabase/browser';
import { radarConfig, type ActivitySection } from '@/lib/radar/config';
import { leadStatuses, type Lead, type LeadStatus } from '@/lib/radar/leads';
import type {
  RadarCompany,
  RadarRefonteResult,
  RadarResult,
  RadarTarget,
} from '@/lib/radar/types';
import CompanyResearchCard from './company-research';
import { useCompanyResearch } from './use-company-research';

const sections: Record<ActivitySection, string> = {
  C: 'Industrie',
  F: 'Construction',
  G: 'Commerce',
  H: 'Transport',
  I: 'Hôtellerie et restauration',
  L: 'Immobilier',
  N: 'Services aux entreprises',
};
const officialUrl = (siren: string) =>
  `https://annuaire-entreprises.data.gouv.fr/entreprise/${encodeURIComponent(siren)}`;

export default function RadarWorkspace() {
  const [supabase] = useState(getSupabaseBrowser);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!supabase);
  const [member, setMember] = useState(false);
  const [membershipState, setMembershipState] = useState<
    'idle' | 'checking' | 'allowed' | 'denied' | 'error'
  >('idle');
  const [connectForResearch, setConnectForResearch] = useState(false);
  const researchLoginRequested = useRef(false);
  const [view, setView] = useState<'search' | 'leads'>('search');
  const [radarMode, setRadarMode] = useState<'local' | 'refonte'>('local');
  const [radius, setRadius] = useState(35);
  const [refonteRadius, setRefonteRadius] = useState(35);
  const [selected, setSelected] = useState<ActivitySection[]>([
    ...radarConfig.defaults.activitySections,
  ]);
  const [result, setResult] = useState<RadarResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [refonteResult, setRefonteResult] = useState<RadarRefonteResult | null>(
    null,
  );
  const [refonteSearching, setRefonteSearching] = useState(false);
  const [refonteSearchError, setRefonteSearchError] = useState('');
  const [includeResearch, setIncludeResearch] = useState(true);
  const [searchService, setSearchService] = useState<
    'loading' | 'ready' | 'unavailable'
  >('loading');
  const [expandedResearch, setExpandedResearch] = useState<string | null>(null);
  const research = useCompanyResearch(session?.access_token);
  const canSearchWeb = searchService === 'ready' && member;
  const rankedCompanies = research.running
    ? result?.companies
    : result?.companies.toSorted((a, b) => {
        const priority = (company: RadarCompany) =>
          (research.items[company.siren]?.data || company.research)
            ?.priority === 'À contacter en priorité'
            ? 1
            : 0;
        return priority(b) - priority(a);
      });
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');
  const [draft, setDraft] = useState<Lead | null>(null);
  const [dirty, setDirty] = useState(false);
  const userId = session?.user.id;
  const editor = useRef<HTMLElement>(null);
  const loginEmail = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (connectForResearch && view === 'leads' && !session)
      loginEmail.current?.focus();
  }, [connectForResearch, view, session]);
  useEffect(() => {
    if (draft?.id) editor.current?.focus();
  }, [draft?.id, view]);
  const currentUser = useRef(userId);

  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/radar/research', { signal: controller.signal })
      .then((response) => response.json())
      .then((data) =>
        setSearchService(
          data &&
            typeof data === 'object' &&
            'automaticSearchAvailable' in data &&
            data.automaticSearchAvailable === true
            ? 'ready'
            : 'unavailable',
        ),
      )
      .catch(() => {
        if (!controller.signal.aborted) setSearchService('unavailable');
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      if (currentUser.current !== next?.user.id) {
        currentUser.current = next?.user.id;
        setLeads([]);
        setMember(false);
        setMembershipState('idle');
        setDraft(null);
        setDirty(false);
        setLeadsLoading(!!next);
        setError('');
      }
      setSession(next);
      setAuthReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    let active = true;
    if (!supabase || !userId) return;
    const controller = new AbortController();
    async function load() {
      let membershipResolved = false;
      setMembershipState('checking');
      try {
        const membership = await supabase!
          .from('radar_members')
          .select('user_id')
          .eq('user_id', userId!)
          .abortSignal(
            AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]),
          )
          .maybeSingle();
        if (!active) return;
        membershipResolved = true;
        if (membership.error) {
          setMember(false);
          setMembershipState('error');
          throw new Error(
            'Impossible de vérifier votre accès au radar. Réessayez la vérification.',
          );
        }
        if (!membership.data) {
          setMember(false);
          setMembershipState('denied');
          throw new Error('Ce compte n’a pas accès aux pistes privées.');
        }
        // L'accès à la recherche ne dépend pas du chargement du carnet.
        setMember(true);
        setMembershipState('allowed');
        if (researchLoginRequested.current) {
          researchLoginRequested.current = false;
          setIncludeResearch(true);
          setConnectForResearch(false);
          setView('search');
          setNotice(
            'Vous êtes connecté. La recherche des indices et contacts publics est activée.',
          );
        }
        const saved = await supabase!
          .from('radar_leads')
          .select('*')
          .eq('user_id', userId!)
          .abortSignal(
            AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]),
          )
          .order('updated_at', { ascending: false });
        if (saved.error) throw saved.error;
        if (active) {
          setLeads(saved.data as Lead[]);
        }
      } catch (e) {
        if (active) {
          if (!membershipResolved) {
            setMember(false);
            setMembershipState('error');
          }
          setError(
            !membershipResolved
              ? 'Impossible de vérifier votre accès au radar. Réessayez la vérification.'
              : e instanceof Error
                ? e.message
                : 'Impossible de charger vos pistes. Vérifiez la connexion puis réessayez.',
          );
        }
      } finally {
        if (active) setLeadsLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
      controller.abort();
    };
  }, [supabase, userId, refresh]);

  function openResearchLogin() {
    researchLoginRequested.current = true;
    setConnectForResearch(true);
    setNotice(
      'Connectez-vous avec le compte créé pour votre radar. Vous reviendrez ensuite à la recherche.',
    );
    setView('leads');
  }

  function changeRadar(next: 'local' | 'refonte') {
    if (next === radarMode || searching || refonteSearching || busy) return;
    if (
      dirty &&
      !window.confirm('Quitter sans enregistrer les modifications ?')
    )
      return;
    setRadarMode(next);
    setView('search');
    setDraft(null);
    setDirty(false);
    setNotice('');
    setError('');
    setSearchError('');
    setRefonteSearchError('');
  }

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  async function search(event: SubmitEvent) {
    event.preventDefault();
    if (!authReady || busy) return;
    const owner = currentUser.current;
    setSearching(true);
    setSearchError('');
    setResult(null);
    research.reset();
    setExpandedResearch(null);
    try {
      const params = new URLSearchParams({
        radiusKm: String(radius),
        sections: selected.join(','),
      });
      const response = await fetch(`/api/radar?${params}`, {
        headers: session
          ? { Authorization: `Bearer ${session.access_token}` }
          : {},
        cache: 'no-store',
        signal: AbortSignal.timeout(55_000),
      });
      const payload = (await response.json()) as RadarResult & {
        error?: string;
      };
      if (!response.ok)
        throw new Error(payload.error || 'Recherche indisponible.');
      if (currentUser.current !== owner) return;
      setResult(payload);
      if (includeResearch && canSearchWeb)
        void research.researchAll(payload.companies);
    } catch (e) {
      setSearchError(
        e instanceof Error && e.name === 'TimeoutError'
          ? 'La recherche prend trop de temps. Réessayez dans un instant.'
          : e instanceof TypeError
            ? 'Impossible de joindre le radar. Réessayez dans quelques instants.'
            : e instanceof Error
              ? e.message
              : 'Recherche indisponible.',
      );
    } finally {
      setSearching(false);
    }
  }

  async function searchRefonte(event: SubmitEvent) {
    event.preventDefault();
    if (!authReady || busy) return;
    const owner = currentUser.current;
    setRefonteSearching(true);
    setRefonteSearchError('');
    setRefonteResult(null);
    try {
      const params = new URLSearchParams({
        radiusKm: String(refonteRadius),
      });
      const response = await fetch(`/api/radar/refonte?${params}`, {
        headers: session
          ? { Authorization: `Bearer ${session.access_token}` }
          : {},
        cache: 'no-store',
        signal: AbortSignal.timeout(55_000),
      });
      const payload = (await response.json()) as RadarRefonteResult & {
        error?: string;
      };
      if (!response.ok)
        throw new Error(payload.error || 'Recherche indisponible.');
      if (currentUser.current !== owner) return;
      setRefonteResult(payload);
    } catch (e) {
      setRefonteSearchError(
        e instanceof Error && e.name === 'TimeoutError'
          ? 'La recherche prend trop de temps. Réessayez dans un instant.'
          : e instanceof TypeError
            ? 'Impossible de joindre le radar. Réessayez dans quelques instants.'
            : e instanceof Error
              ? e.message
              : 'Recherche indisponible.',
      );
    } finally {
      setRefonteSearching(false);
    }
  }

  async function login(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    setBusy('login');
    setError('');
    setNotice('');
    try {
      const response = await supabase.auth.signInWithPassword({
        email: values.get('email') as string,
        password: values.get('password') as string,
      });
      if (response.error)
        setError(
          'Connexion impossible. Vérifiez votre adresse et votre mot de passe.',
        );
      else form.reset();
    } catch {
      setError('Connexion indisponible. Réessayez dans un instant.');
    } finally {
      setBusy('');
    }
  }

  async function add(company: RadarCompany) {
    if (!session) {
      setView('leads');
      setNotice(
        'Connectez-vous, puis revenez ajouter cette entreprise : vos résultats sont conservés.',
      );
      return;
    }
    if (!supabase || !member || !result) return;
    const owner = userId;
    setBusy(company.siren);
    setError('');
    setNotice('');
    try {
      const saved = await supabase
        .from('radar_leads')
        .insert({
          user_id: owner,
          siren: company.siren,
          company: {
            ...company,
            ...(research.items[company.siren]?.data
              ? { research: research.items[company.siren].data }
              : {}),
          },
          source_retrieved_at: result.retrievedAt,
        })
        .select()
        .single();
      if (saved.error) {
        if (saved.error.code === '23505') {
          setNotice('Cette entreprise figure déjà dans vos pistes.');
          setRefresh((n) => n + 1);
          return;
        }
        throw saved.error;
      }
      if (currentUser.current === owner) {
        setLeads((old) => [saved.data as Lead, ...old]);
        setNotice(`${company.nom} ajoutée à vos pistes.`);
      }
    } catch {
      if (currentUser.current === owner)
        setError('La piste n’a pas été enregistrée. Réessayez.');
    } finally {
      setBusy('');
    }
  }

  async function save(event: SubmitEvent) {
    event.preventDefault();
    if (!draft || !supabase || !member) return;
    const owner = userId;
    setBusy('save');
    setError('');
    setNotice('');
    try {
      const saved = await supabase
        .from('radar_leads')
        .update({
          notes: draft.notes,
          status: draft.status,
          next_action: draft.next_action,
          next_action_date: draft.next_action_date,
        })
        .eq('id', draft.id)
        .eq('user_id', owner!)
        .eq('revision', draft.revision)
        .select()
        .maybeSingle();
      if (saved.error) throw saved.error;
      if (!saved.data) {
        setError(
          'Cette piste a changé sur un autre appareil. Copiez vos modifications, fermez la fiche puis actualisez les pistes avant de réessayer.',
        );
        return;
      }
      if (currentUser.current === owner) {
        setLeads((old) =>
          old.map((lead) =>
            lead.id === draft.id ? (saved.data as Lead) : lead,
          ),
        );
        setDraft(saved.data as Lead);
        setDirty(false);
        setNotice('Modifications enregistrées.');
      }
    } catch {
      if (currentUser.current === owner)
        setError(
          'Les modifications n’ont pas été enregistrées. Votre saisie est conservée.',
        );
    } finally {
      setBusy('');
    }
  }

  async function saveResearch(lead: Lead) {
    const findings = research.items[lead.siren]?.data;
    if (!findings || !supabase || !member || dirty || busy) return;
    const owner = userId;
    setBusy(`research-${lead.id}`);
    setError('');
    setNotice('');
    try {
      const saved = await supabase
        .from('radar_leads')
        .update({ company: { ...lead.company, research: findings } })
        .eq('id', lead.id)
        .eq('user_id', owner!)
        .eq('revision', lead.revision)
        .select()
        .maybeSingle();
      if (saved.error) throw saved.error;
      if (currentUser.current !== owner) return;
      if (!saved.data) {
        setError(
          'Cette piste a changé sur un autre appareil. Actualisez vos pistes avant d’enregistrer la recherche.',
        );
        return;
      }
      setLeads((old) =>
        old.map((item) => (item.id === lead.id ? (saved.data as Lead) : item)),
      );
      if (draft?.id === lead.id) setDraft(saved.data as Lead);
      setNotice('La fiche de recherche est enregistrée avec vos pistes.');
    } catch {
      if (currentUser.current === owner)
        setError(
          'La fiche de recherche n’a pas été enregistrée. Elle reste consultable ici ; réessayez plus tard.',
        );
    } finally {
      setBusy('');
    }
  }

  const researchCard = (company: RadarCompany) => {
    const lead = leads.find((item) => item.siren === company.siren);
    const snapshot = research.items[company.siren]?.data;
    return (
      <CompanyResearchCard
        company={company}
        state={research.items[company.siren]}
        expanded={expandedResearch === company.siren}
        disabled={dirty || !!busy}
        automaticAvailable={canSearchWeb}
        saving={!!lead && busy === `research-${lead.id}`}
        onExpand={() =>
          setExpandedResearch((old) =>
            old === company.siren ? null : company.siren,
          )
        }
        onResearch={(website) => {
          setExpandedResearch(company.siren);
          void research.research(company, website);
        }}
        onSave={
          lead &&
          snapshot &&
          snapshot.researchedAt !== lead.company.research?.researchedAt
            ? () => void saveResearch(lead)
            : undefined
        }
      />
    );
  };

  const card = (company: RadarCompany) => (
    <>
      <div className="rl-card-head">
        <div>
          <h2>{company.nom}</h2>
          <p>
            {company.commune} · {company.distanceKm} km
          </p>
        </div>
        <span
          className="rl-badge"
          title="Présélection selon les données d’annuaire"
        >
          Candidate locale
        </span>
      </div>
      <p>
        <strong>{company.activiteLibelle}</strong>
        <br />
        <span className="rl-muted">{company.trancheEffectif}</span>
      </p>
      {!research.items[company.siren]?.data && !company.research && (
        <div className="rl-reasons">
          <p>
            <small>Pourquoi elle ressort</small>
            {company.raisonSelection}
          </p>
          <p>
            <small>Hypothèse à vérifier</small>
            {company.workflowProbable}
          </p>
        </div>
      )}
      <a
        className="rl-source"
        href={officialUrl(company.siren)}
        target="_blank"
        rel="noopener noreferrer"
      >
        Fiche officielle <ExternalLink size={14} />
      </a>
    </>
  );

  const refonteCard = (target: RadarTarget) => (
    <article className="rl-card rl-target-card" key={target.siren}>
      <div className="rl-card-head">
        <div>
          <h2>{target.nom}</h2>
          <p>
            {target.commune} · {target.distanceKm} km
          </p>
        </div>
        <span className="rl-badge">{target.type}</span>
      </div>
      <p>
        <strong>{target.activiteLibelle}</strong>
        <br />
        <span className="rl-muted">
          {target.trancheEffectif} · {target.nombreEtablissements}{' '}
          {target.nombreEtablissements > 1
            ? 'établissements'
            : 'établissement'}
        </span>
      </p>
      <a
        className="rl-source"
        href={target.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        Fiche officielle <ExternalLink size={14} />
      </a>
    </article>
  );

  return (
    <main className="rl-shell">
      <header className="rl-header">
        <div className="rl-header-left">
          <Link
            href="/"
            className="rl-dashboard-link"
            onClick={(e) => {
              if (
                dirty &&
                !window.confirm('Quitter sans enregistrer les modifications ?')
              )
                e.preventDefault();
            }}
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Retour au cockpit
          </Link>
          <span className="rl-header-divider" aria-hidden="true" />
          <Link href="/radar" className="rl-brand">
            <Radar size={24} />
            <span>
              Premier client
              <small>
                {radarMode === 'local' ? 'Radar local' : 'Radar Refonte'}
              </small>
            </span>
          </Link>
        </div>
        <Link
          href="/demo/maison-martin"
          onClick={(e) => {
            if (
              dirty &&
              !window.confirm('Quitter sans enregistrer les modifications ?')
            )
              e.preventDefault();
          }}
        >
          Voir la vidéo Maison Martin <ArrowRight size={16} />
        </Link>
      </header>
      <div className="rl-heading">
        {radarMode === 'local' ? (
          <>
            <p className="rl-eyebrow">Vairé et ses alentours</p>
            <h1>
              Les prochaines entreprises
              <br />à rencontrer.
            </h1>
            <p>
              Repérez les indices publics, trouvez une porte d’entrée et
              préparez votre premier contact. Les besoins restent à confirmer.
            </p>
          </>
        ) : (
          <>
            <p className="rl-eyebrow">Radar Refonte</p>
            <h1>
              Les acteurs locaux
              <br />à rencontrer.
            </h1>
          </>
        )}
      </div>
      <nav className="rl-radar-switch" aria-label="Choisir un radar">
        <div className="rl-radar-switch-buttons">
          <button
            type="button"
            aria-pressed={radarMode === 'local'}
            disabled={searching || refonteSearching || !!busy}
            onClick={() => changeRadar('local')}
          >
            Radar local
          </button>
          <button
            type="button"
            aria-pressed={radarMode === 'refonte'}
            disabled={searching || refonteSearching || !!busy}
            onClick={() => changeRadar('refonte')}
          >
            Radar Refonte
          </button>
        </div>
      </nav>
      {radarMode === 'local' && (
        <>
          <nav className="rl-tabs" aria-label="Radar et pistes">
        <button
          aria-current={view === 'search' ? 'page' : undefined}
          disabled={dirty || !!busy}
          onClick={() => {
            researchLoginRequested.current = false;
            setConnectForResearch(false);
            setNotice('');
            setView('search');
          }}
        >
          Rechercher
        </button>
        <button
          aria-current={view === 'leads' ? 'page' : undefined}
          onClick={() => setView('leads')}
        >
          Mes pistes {member && <span>{leads.length}</span>}
        </button>
        {session && (
          <button
            className="rl-logout"
            disabled={!!busy || dirty}
            onClick={async () => {
              setBusy('logout');
              const response = await supabase!.auth.signOut();
              setBusy('');
              if (response.error)
                setError('Déconnexion impossible. Réessayez.');
              else {
                setNotice('');
                setError('');
              }
            }}
          >
            <LogOut size={15} />
            Déconnexion
          </button>
        )}
      </nav>
      {error && (
        <p className="rl-error" role="alert">
          {error}
        </p>
      )}
      {notice && <output className="rl-notice">{notice}</output>}
      {view === 'search' ? (
        <>
          <form className="rl-filters" onSubmit={search}>
            <label className="rl-radius">
              Rayon autour de Vairé{' '}
              <span>
                <input
                  type="number"
                  min={5}
                  max={50}
                  step={1}
                  required
                  value={radius}
                  disabled={searching}
                  onChange={(e) => setRadius(Number(e.target.value))}
                />{' '}
                km
              </span>
            </label>
            <fieldset disabled={searching}>
              <legend>Secteurs à explorer</legend>
              <div className="rl-sectors">
                {Object.entries(sections).map(([key, label]) => (
                  <label key={key}>
                    <input
                      type="checkbox"
                      checked={selected.includes(key as ActivitySection)}
                      onChange={(e) =>
                        setSelected((old) =>
                          e.target.checked
                            ? [...old, key as ActivitySection]
                            : old.filter((s) => s !== key),
                        )
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
            <label
              className="rl-research-option"
              htmlFor="include-public-research"
              aria-label="Rechercher aussi les indices et contacts publics"
            >
              <input
                id="include-public-research"
                type="checkbox"
                checked={includeResearch && canSearchWeb}
                disabled={
                  searching ||
                  searchService !== 'ready' ||
                  !authReady ||
                  !supabase ||
                  (!!session && !member)
                }
                onChange={(event) => {
                  if (!session) {
                    openResearchLogin();
                    return;
                  }
                  setIncludeResearch(event.target.checked);
                }}
              />
              <span>
                <strong>
                  Rechercher aussi les indices et contacts publics
                </strong>
                <small>
                  {searchService === 'loading'
                    ? 'Vérification de la disponibilité…'
                    : searchService === 'unavailable'
                      ? 'La recherche automatique des sites reste à activer. Vous pouvez déjà renseigner un site sur chaque fiche.'
                      : !supabase
                        ? 'La connexion au compte radar reste à configurer.'
                        : !authReady ||
                            (session && membershipState === 'checking')
                          ? 'Vérification de votre accès…'
                          : !session
                            ? 'Cliquez pour vous connecter avec votre compte radar et activer cette option.'
                            : membershipState === 'denied'
                              ? 'Vous êtes connecté, mais ce compte n’est pas autorisé sur ce radar.'
                              : membershipState === 'error'
                                ? 'Votre connexion est reconnue, mais la vérification de votre accès a échoué.'
                                : 'Le radar consulte les sites repérés et prépare une fiche avec ses sources.'}
                </small>
              </span>
            </label>
                {searchService === 'ready' &&
                  authReady &&
                  supabase &&
                  !session && (
              <div className="rl-research-access">
                <button
                  type="button"
                  disabled={searching || !!busy}
                  onClick={openResearchLogin}
                >
                  Se connecter pour activer la recherche
                </button>
              </div>
            )}
            {searchService === 'ready' &&
              session &&
              membershipState === 'error' && (
                <div className="rl-research-access">
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setRefresh((n) => n + 1);
                    }}
                  >
                    Réessayer la vérification de mon accès
                  </button>
                </div>
              )}
            <button
              className="rl-primary"
                  disabled={
                    searching || !selected.length || !authReady || !!busy
                  }
            >
              {searching ? (
                <>
                      <LoaderCircle size={16} className="rl-spin" /> Recherche
                      en cours…
                </>
              ) : (
                <>
                  Trouver 5 entreprises <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
          {session && (
            <p className="rl-muted">
                  Les entreprises déjà dans « Mes pistes » sont exclues de
                  chaque nouvelle recherche.
            </p>
          )}
          {searchError && (
            <p className="rl-error" role="alert">
              {searchError}
            </p>
          )}
          <div aria-live="polite">
            {searching ? (
              <p className="rl-empty">
                    Consultation des données publiques et sélection des
                    entreprises…
              </p>
            ) : result ? (
              <>
                <p className="rl-result-count">
                  {result.companies.length} entreprise
                  {result.companies.length > 1 ? 's' : ''} retenue
                  {result.companies.length > 1 ? 's' : ''} · Rayon de{' '}
                  {result.search.radiusKm} km · Données du{' '}
                  {new Date(result.retrievedAt).toLocaleDateString('fr-FR')}
                </p>
                    {includeResearch &&
                      Object.keys(research.items).length > 0 && (
                  <output className="rl-research-status">
                    {research.running
                      ? 'Consultation des sites en cours'
                      : 'Consultation des sites terminée'}{' '}
                    ·{' '}
                    {
                      result.companies.filter((company) =>
                        ['done', 'error'].includes(
                          research.items[company.siren]?.status,
                        ),
                      ).length
                    }
                    /
                    {
                      result.companies.filter(
                        (company) => research.items[company.siren],
                      ).length
                    }{' '}
                    fiches traitées.{' '}
                    {research.running
                      ? 'Les résultats apparaissent sur chaque entreprise.'
                      : 'Les entreprises avec une identité confirmée, un indice métier et un contact passent en premier. Cela ne prédit pas leur réponse.'}
                  </output>
                )}
                {result.companies.length < 5 && (
                  <p className="rl-muted">
                        Moins de cinq candidates dans les données examinées.
                        Essayez un rayon plus large ou d’autres secteurs.
                  </p>
                )}
                <div className="rl-cards">
                  {rankedCompanies?.map((company) => {
                    const added = leads.some(
                      (lead) => lead.siren === company.siren,
                    );
                    return (
                      <article
                        className={`rl-card ${expandedResearch === company.siren ? 'rl-card-expanded' : ''}`}
                        key={company.siren}
                      >
                        {card(company)}
                        {researchCard(company)}
                        <button
                          className="rl-add"
                          disabled={
                            added ||
                            !!busy ||
                            (!!session && !member) ||
                            !supabase ||
                            !authReady
                          }
                          onClick={() => void add(company)}
                        >
                          {added ? (
                            <>
                              <Check size={16} /> Dans mes pistes
                            </>
                          ) : busy === company.siren ? (
                            'Enregistrement…'
                          ) : (
                            'Ajouter à mes pistes'
                          )}
                        </button>
                      </article>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="rl-empty">
                Choisissez vos secteurs, puis lancez la recherche. Les
                entreprises proviennent de l’Annuaire des entreprises.
              </p>
            )}
          </div>
          {!supabase && (
            <p className="rl-muted">
                  La recherche est disponible. La sauvegarde des pistes sera
                  activée une fois l’espace privé configuré.
            </p>
          )}
        </>
      ) : !supabase ? (
        <div className="rl-empty">
          <h2>La sauvegarde est en préparation</h2>
          <p>
            Vous pourrez bientôt retrouver vos pistes ici sur tous vos
            appareils.
          </p>
        </div>
      ) : !authReady || leadsLoading ? (
            <output className="rl-empty">
              Chargement de votre espace privé…
            </output>
      ) : !session ? (
        <form className="rl-login" onSubmit={login}>
          <h2>
            {connectForResearch
              ? 'Activer la recherche automatique'
              : 'Votre espace privé'}
          </h2>
          <p>
            {connectForResearch
              ? 'Utilisez le compte créé pour votre radar. Après la connexion, l’option sera activée et vous retrouverez votre recherche.'
              : 'Connectez-vous pour retrouver vos entreprises et vos notes.'}
          </p>
          <label>
            Adresse e-mail
            <input
              ref={loginEmail}
              name="email"
              type="email"
              autoComplete="username"
              required
            />
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
          <button className="rl-primary" disabled={!!busy}>
            {busy === 'login'
              ? 'Connexion…'
              : connectForResearch
                ? 'Se connecter et activer'
                : 'Se connecter'}
          </button>
        </form>
      ) : (
        <>
          <div className="rl-list-heading">
            <p>
              {leads.length} piste{leads.length > 1 ? 's' : ''} enregistrée
              {leads.length > 1 ? 's' : ''}
            </p>
            <button
              disabled={!leads.length || !!busy}
              onClick={() => {
                const url = URL.createObjectURL(
                  new Blob(
                    [
                      JSON.stringify(
                        {
                          version: 1,
                          exportedAt: new Date().toISOString(),
                          leads,
                        },
                        null,
                        2,
                      ),
                    ],
                    { type: 'application/json' },
                  ),
                );
                const link = document.createElement('a');
                link.href = url;
                link.download = 'radar-pistes.json';
                link.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}
            >
              Exporter mes pistes
            </button>
            <button
              disabled={!!busy || dirty}
              onClick={() => {
                setDraft(null);
                setError('');
                setLeadsLoading(true);
                setRefresh((n) => n + 1);
              }}
            >
              <RefreshCw size={15} />
              Actualiser
            </button>
          </div>
          {member && !leads.length && !error && (
            <p className="rl-empty">
              Votre carnet est vide. Lancez une recherche et ajoutez une
              entreprise à vos pistes.
            </p>
          )}
          <div className="rl-cards">
            {leads.map((lead) => (
              <article
                className={`rl-card ${expandedResearch === lead.siren ? 'rl-card-expanded' : ''}`}
                key={lead.id}
              >
                {card(lead.company)}
                {researchCard(lead.company)}
                <p>
                  <strong>{leadStatuses[lead.status]}</strong>
                  {lead.next_action && <> · {lead.next_action}</>}
                  {lead.next_action_date && (
                    <>
                      {' '}
                      ·{' '}
                      {new Date(
                        lead.next_action_date + 'T12:00:00',
                      ).toLocaleDateString('fr-FR')}
                    </>
                  )}
                </p>
                <button
                  className="rl-add"
                  disabled={!!busy || dirty}
                  onClick={() => {
                    setDraft(lead);
                    setDirty(false);
                    setNotice('');
                  }}
                >
                  Notes et prochaine action
                </button>
              </article>
            ))}
          </div>
        </>
      )}
      {draft && view === 'leads' && (
        <section
          ref={editor}
          tabIndex={-1}
          className="rl-editor"
          aria-labelledby="rl-edit-title"
        >
          <form onSubmit={save}>
            <h2 id="rl-edit-title">{draft.company.nom}</h2>
            <p>Vos notes restent privées.</p>
            <fieldset disabled={!!busy}>
              <label>
                Statut
                <select
                  value={draft.status}
                  onChange={(e) => {
                    setDraft({
                      ...draft,
                      status: e.target.value as LeadStatus,
                    });
                    setDirty(true);
                  }}
                >
                  {Object.entries(leadStatuses).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Notes
                <textarea
                  rows={5}
                  maxLength={10000}
                  value={draft.notes}
                  onChange={(e) => {
                    setDraft({ ...draft, notes: e.target.value });
                    setDirty(true);
                  }}
                />
              </label>
              <label>
                Prochaine action
                <input
                  maxLength={500}
                  value={draft.next_action}
                  onChange={(e) => {
                    setDraft({ ...draft, next_action: e.target.value });
                    setDirty(true);
                  }}
                />
              </label>
              <label>
                Date prévue
                <input
                  type="date"
                  value={draft.next_action_date || ''}
                  onChange={(e) => {
                    setDraft({
                      ...draft,
                      next_action_date: e.target.value || null,
                    });
                    setDirty(true);
                  }}
                />
              </label>
            </fieldset>
            <div className="rl-editor-actions">
              <button className="rl-primary" disabled={!!busy || !dirty}>
                {busy === 'save' ? 'Enregistrement…' : 'Enregistrer'}
              </button>
              <button
                type="button"
                disabled={!!busy}
                onClick={() => {
                  if (
                    !dirty ||
                    window.confirm(
                      'Abandonner les modifications non enregistrées ?',
                    )
                  ) {
                    setDraft(null);
                    setDirty(false);
                  }
                }}
              >
                Fermer
              </button>
              <output>
                {dirty ? 'Modifications non enregistrées' : 'À jour'}
              </output>
            </div>
          </form>
        </section>
      )}
        </>
      )}
      {radarMode === 'refonte' && (
        <>
          <form className="rl-filters" onSubmit={searchRefonte}>
            <label className="rl-radius">
              Rayon autour de Vairé{' '}
              <span>
                <input
                  type="number"
                  min={5}
                  max={50}
                  step={1}
                  required
                  value={refonteRadius}
                  disabled={refonteSearching}
                  onChange={(e) => setRefonteRadius(Number(e.target.value))}
                />{' '}
                km
              </span>
            </label>
            <button
              className="rl-primary"
              disabled={refonteSearching || !authReady || !!busy}
            >
              {refonteSearching ? (
                <>
                  <LoaderCircle size={16} className="rl-spin" /> Recherche en
                  cours…
                </>
              ) : (
                <>
                  Trouver des acteurs <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
          {refonteSearchError && (
            <p className="rl-error" role="alert">
              {refonteSearchError}
            </p>
          )}
          <div aria-live="polite">
            {refonteSearching ? (
              <p className="rl-empty">Recherche en cours…</p>
            ) : refonteResult ? (
              <>
                <p className="rl-result-count">
                  {refonteResult.targets.length} acteur
                  {refonteResult.targets.length > 1 ? 's' : ''} trouvé
                  {refonteResult.targets.length > 1 ? 's' : ''} · Rayon de{' '}
                  {refonteResult.search.radiusKm} km · Données du{' '}
                  {new Date(refonteResult.retrievedAt).toLocaleDateString(
                    'fr-FR',
                  )}
                </p>
                {refonteResult.targets.length ? (
                  <div className="rl-cards">
                    {refonteResult.targets.map(refonteCard)}
                  </div>
                ) : (
                  <p className="rl-empty">Aucun acteur trouvé.</p>
                )}
              </>
            ) : (
              <p className="rl-empty">
                Choisissez un rayon, puis lancez la recherche.
              </p>
            )}
          </div>
        </>
      )}
      <footer className="rl-footer">
        {radarMode === 'local' ? (
          <>
            Annuaire des entreprises et pages publiques des sites consultés.
            Les hypothèses restent à confirmer.
          </>
        ) : (
          <>Annuaire des entreprises et associations. Aucun message n’est envoyé par cet outil.</>
        )}
      </footer>
    </main>
  );
}
