'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
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
import type { RadarCompany, RadarResult } from '@/lib/radar/types';

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
  const [view, setView] = useState<'search' | 'leads'>('search');
  const [radius, setRadius] = useState(35);
  const [selected, setSelected] = useState<ActivitySection[]>([
    ...radarConfig.defaults.activitySections,
  ]);
  const [result, setResult] = useState<RadarResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
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
  useEffect(() => {
    if (draft?.id) editor.current?.focus();
  }, [draft?.id, view]);
  const currentUser = useRef(userId);

  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      if (currentUser.current !== next?.user.id) {
        currentUser.current = next?.user.id;
        setLeads([]);
        setMember(false);
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
    async function load() {
      try {
        const membership = await supabase!
          .from('radar_members')
          .select('user_id')
          .eq('user_id', userId!)
          .maybeSingle();
        if (membership.error) throw membership.error;
        if (!membership.data)
          throw new Error('Ce compte n’a pas accès aux pistes privées.');
        const saved = await supabase!
          .from('radar_leads')
          .select('*')
          .eq('user_id', userId!)
          .order('updated_at', { ascending: false });
        if (saved.error) throw saved.error;
        if (active) {
          setMember(true);
          setLeads(saved.data as Lead[]);
        }
      } catch (e) {
        if (active)
          setError(
            e instanceof Error
              ? e.message
              : 'Impossible de charger vos pistes. Vérifiez la connexion puis réessayez.',
          );
      } finally {
        if (active) setLeadsLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [supabase, userId, refresh]);

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
    setSearching(true);
    setSearchError('');
    setResult(null);
    try {
      const params = new URLSearchParams({
        radiusKm: String(radius),
        sections: selected.join(','),
      });
      const response = await fetch(`/api/radar?${params}`, {
        signal: AbortSignal.timeout(55_000),
      });
      const payload = (await response.json()) as RadarResult & {
        error?: string;
      };
      if (!response.ok)
        throw new Error(payload.error || 'Recherche indisponible.');
      setResult(payload);
    } catch (e) {
      setSearchError(
        e instanceof Error && e.name === 'TimeoutError'
          ? 'La recherche prend trop de temps. Réessayez dans un instant.'
          : e instanceof Error
            ? e.message
            : 'Recherche indisponible.',
      );
    } finally {
      setSearching(false);
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
          company,
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

  const card = (company: RadarCompany) => (
    <>
      <div className="rl-card-head">
        <div>
          <h2>{company.nom}</h2>
          <p>
            {company.commune} · {company.distanceKm} km
          </p>
        </div>
        <span className="rl-badge">{company.niveauPriorite}</span>
      </div>
      <p>
        <strong>{company.activiteLibelle}</strong>
        <br />
        <span className="rl-muted">{company.trancheEffectif}</span>
      </p>
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

  return (
    <main className="rl-shell">
      <header className="rl-header">
        <Link href="/radar" className="rl-brand">
          <Radar size={24} />
          <span>
            Premier client <small>Radar local</small>
          </span>
        </Link>
        <Link
          href="/demo/reclamation"
          onClick={(e) => {
            if (
              dirty &&
              !window.confirm('Quitter sans enregistrer les modifications ?')
            )
              e.preventDefault();
          }}
        >
          Voir la démo réclamation <ArrowRight size={16} />
        </Link>
      </header>
      <div className="rl-heading">
        <p className="rl-eyebrow">Vairé et ses alentours</p>
        <h1>
          Les prochaines entreprises
          <br />à rencontrer.
        </h1>
        <p>
          Des candidates pour présenter votre démo. Leur besoin reste à
          confirmer sur le terrain.
        </p>
      </div>
      <nav className="rl-tabs" aria-label="Radar et pistes">
        <button
          aria-current={view === 'search' ? 'page' : undefined}
          disabled={dirty || !!busy}
          onClick={() => setView('search')}
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
            <button
              className="rl-primary"
              disabled={searching || !selected.length}
            >
              {searching ? (
                <>
                  <LoaderCircle size={16} className="rl-spin" /> Recherche en
                  cours…
                </>
              ) : (
                <>
                  Trouver 5 entreprises <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
          {searchError && (
            <p className="rl-error" role="alert">
              {searchError}
            </p>
          )}
          <div aria-live="polite">
            {searching ? (
              <p className="rl-empty">
                Consultation des données publiques et sélection des entreprises…
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
                {result.companies.length < 5 && (
                  <p className="rl-muted">
                    Moins de cinq candidates dans les données examinées. Essayez
                    un rayon plus large ou d’autres secteurs.
                  </p>
                )}
                <div className="rl-cards">
                  {result.companies.map((company) => {
                    const added = leads.some(
                      (lead) => lead.siren === company.siren,
                    );
                    return (
                      <article className="rl-card" key={company.siren}>
                        {card(company)}
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
              La recherche est disponible. La sauvegarde des pistes sera activée
              une fois l’espace privé configuré.
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
        <output className="rl-empty">Chargement de votre espace privé…</output>
      ) : !session ? (
        <form className="rl-login" onSubmit={login}>
          <h2>Votre espace privé</h2>
          <p>Connectez-vous pour retrouver vos entreprises et vos notes.</p>
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
          <button className="rl-primary" disabled={!!busy}>
            {busy === 'login' ? 'Connexion…' : 'Se connecter'}
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
          {member && !leads.length && (
            <p className="rl-empty">
              Votre carnet est vide. Lancez une recherche et ajoutez une
              entreprise à vos pistes.
            </p>
          )}
          <div className="rl-cards">
            {leads.map((lead) => (
              <article className="rl-card" key={lead.id}>
                {card(lead.company)}
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
      <footer className="rl-footer">
        Données publiques : API Recherche d’entreprises. Aucun message n’est
        envoyé par cet outil.
      </footer>
    </main>
  );
}
