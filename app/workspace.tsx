'use client';

import Link from 'next/link';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  Check,
  ChevronRight,
  CircleDot,
  Compass,
  FileText,
  Flag,
  LockKeyhole,
  MessageSquareText,
  Plus,
  Radar,
  RefreshCw,
  Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Progress, ProgressValue } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  CampaignData,
  Company,
  Interview,
  Offer,
  Track,
  defaultQuestions,
  stages,
  trackStatuses,
} from '@/lib/campaign';

type View = 'hq' | 'tracks' | 'interviews' | 'offers' | 'terrain';
const emptyData: CampaignData = {
  tracks: [],
  companies: [],
  interviews: [],
  offers: [],
};
const scoreLabels = [
  ['frequency', 'Fréquence'],
  ['severity', 'Gravité'],
  ['urgency', 'Urgence'],
  ['budget', 'Budget potentiel'],
  ['access', 'Accès aux décideurs'],
  ['fit', 'Adéquation'],
] as const;
const stageIndex = (value: string) =>
  stages.findIndex((s) => s.value === value);
const interviewCompany = (i: Interview, companies: Company[]) =>
  companies.find((c) => c.id === i.companyId);
const offerComplete = (o?: Offer) =>
  !!o &&
  [
    o.audience,
    o.problem,
    o.intervention,
    o.deliverables,
    o.withoutRisk,
    o.stopCondition,
  ].every(Boolean);

function Field({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={wide ? 'form-field wide' : 'form-field'}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export default function Workspace() {
  const [data, setData] = useState<CampaignData>(emptyData);
  const [view, setView] = useState<View>('hq');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [dialog, setDialog] = useState<
    'track' | 'company' | 'interview' | null
  >(null);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(
    null,
  );
  const [offerDraft, setOfferDraft] = useState<Offer | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/campaign', { cache: 'no-store' });
      const payload = (await response.json()) as CampaignData & {
        error?: string;
      };
      if (!response.ok)
        throw new Error(payload.error || 'Chargement impossible.');
      setData(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chargement impossible.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  async function mutate(
    payload: Record<string, unknown>,
    success = 'Enregistré.',
  ) {
    setSaving(true);
    setNotice('');
    setError('');
    try {
      const response = await fetch('/api/campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const next = (await response.json()) as CampaignData & { error?: string };
      if (!response.ok)
        throw new Error(next.error || 'Enregistrement impossible.');
      setData(next);
      setNotice(success);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Enregistrement impossible.');
      return false;
    } finally {
      setSaving(false);
    }
  }

  const stats = useMemo(() => {
    const activeCompanies = data.companies.filter((c) => c.stage !== 'lost');
    const completed = data.interviews.filter((i) => i.status === 'completed');
    return {
      contacts: activeCompanies.filter((c) => c.contactName || c.contactRole)
        .length,
      messages: activeCompanies.filter(
        (c) => stageIndex(c.stage) >= stageIndex('message'),
      ).length,
      replies: activeCompanies.filter(
        (c) => stageIndex(c.stage) >= stageIndex('reply'),
      ).length,
      interviews: completed.length,
      problems: completed.filter((i) => i.problem).length,
      meetings: completed.filter((i) => i.followUp).length,
      proposals: activeCompanies.filter(
        (c) => stageIndex(c.stage) >= stageIndex('proposal'),
      ).length,
      clients: data.companies.filter((c) => c.stage === 'won').length,
      quotes: completed.filter((i) => i.exactQuote).length,
    };
  }, [data]);

  const themes = useMemo(() => {
    const counts = new Map<string, number>();
    data.interviews
      .filter((i) => i.status === 'completed')
      .forEach((i) =>
        i.themes
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
          .forEach((t) => {
            const label = t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
            counts.set(label, (counts.get(label) || 0) + 1);
          }),
      );
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [data.interviews]);

  const missions = useMemo(
    () => [
      {
        label: 'Identifier 5 entreprises correspondant à une piste',
        done: data.companies.length >= 5,
        current: data.companies.length,
        target: 5,
        view: 'terrain' as View,
      },
      {
        label: 'Trouver le bon interlocuteur dans 3 entreprises',
        done: stats.contacts >= 3,
        current: stats.contacts,
        target: 3,
        view: 'terrain' as View,
      },
      {
        label: 'Envoyer 3 messages personnalisés',
        done: stats.messages >= 3,
        current: stats.messages,
        target: 3,
        view: 'terrain' as View,
      },
      {
        label: 'Réaliser un entretien de 20 minutes',
        done: stats.interviews >= 1,
        current: stats.interviews,
        target: 1,
        view: 'interviews' as View,
      },
      {
        label: 'Conserver 5 phrases exactes du terrain',
        done: stats.quotes >= 5,
        current: stats.quotes,
        target: 5,
        view: 'interviews' as View,
      },
      {
        label: 'Faire émerger 3 thèmes récurrents',
        done: themes.filter((t) => t[1] >= 2).length >= 3,
        current: themes.filter((t) => t[1] >= 2).length,
        target: 3,
        view: 'interviews' as View,
      },
      {
        label: 'Abandonner une hypothèse qui ne tient pas',
        done: data.tracks.some((t) => t.status === 'abandoned'),
        current: data.tracks.some((t) => t.status === 'abandoned') ? 1 : 0,
        target: 1,
        view: 'tracks' as View,
      },
      {
        label: 'Construire une offre à partir des preuves',
        done: data.offers.some(offerComplete),
        current: data.offers.some(offerComplete) ? 1 : 0,
        target: 1,
        view: 'offers' as View,
      },
    ],
    [data, stats, themes],
  );
  const nextMission = missions.find((m) => !m.done) || {
    label: 'Obtenir une première mission payante',
    current: stats.clients,
    target: 1,
    view: 'terrain' as View,
  };
  const xp =
    stats.contacts * 5 +
    stats.messages * 10 +
    stats.replies * 20 +
    stats.interviews * 50 +
    stats.problems * 35 +
    stats.meetings * 100 +
    stats.proposals * 250 +
    stats.clients * 600 +
    data.tracks.filter((t) => t.status === 'abandoned').length * 80;
  const levels = [
    ['Explorateur', 0],
    ['Enquêteur terrain', 50],
    ['Analyste', 200],
    ['Architecte d’offre', 400],
    ['Prospecteur', 700],
    ['Consultant', 1200],
  ] as const;
  const levelIndex = Math.max(
    0,
    levels.findIndex(
      ([, threshold], i) =>
        xp >= threshold && (i === levels.length - 1 || xp < levels[i + 1][1]),
    ),
  );
  const level = levels[levelIndex];
  const nextLevel = levels[Math.min(levelIndex + 1, levels.length - 1)];
  const levelProgress =
    levelIndex === levels.length - 1
      ? 100
      : Math.round(((xp - level[1]) / (nextLevel[1] - level[1])) * 100);
  const recent = [
    ...data.interviews.map((i) => ({
      at: i.updatedAt,
      title:
        i.status === 'completed' ? 'Entretien débriefé' : 'Entretien préparé',
      detail: interviewCompany(i, data.companies)?.name || 'Entreprise',
    })),
    ...data.companies.map((c) => ({
      at: c.updatedAt,
      title:
        stages.find((s) => s.value === c.stage)?.label || 'Entreprise ajoutée',
      detail: c.name,
    })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 5);

  function chooseOffer(trackId?: string) {
    const track = data.tracks.find((t) => t.id === trackId) || data.tracks[0];
    if (!track) return;
    setOfferDraft(
      data.offers.find((o) => o.trackId === track.id) || {
        id: '',
        trackId: track.id,
        audience: '',
        problem: '',
        intervention: '',
        deliverables: '',
        withoutRisk: '',
        stopCondition: '',
        demoAvailable: 0,
        updatedAt: '',
      },
    );
  }

  const nav = [
    ['hq', 'Quartier général', Target],
    ['tracks', 'Carte d’exploration', Compass],
    ['interviews', 'Carnet d’entretiens', MessageSquareText],
    ['offers', 'Atelier des offres', FileText],
    ['terrain', 'Terrain commercial', BriefcaseBusiness],
  ] as const;

  if (loading && !data.tracks.length)
    return (
      <div className="loading-screen">
        <div className="loading-brand">
          PC<span>01</span>
        </div>
        <Skeleton className="h-2 w-56" />
        <p>Ouverture du terrain…</p>
      </div>
    );

  return (
    <Tabs
      value={view}
      onValueChange={(value) => setView(value as View)}
      orientation="vertical"
      className="cockpit-shell"
    >
      <aside className="rail">
        <div className="rail-brand">
          <span>PC</span>
          <b>
            Premier
            <br />
            client
          </b>
        </div>
        <div className="mode-stamp">
          <CircleDot size={14} />
          <span>MODE ACTUEL</span>
          <strong>EXPLORER</strong>
        </div>
        <TabsList variant="line" className="rail-nav">
          {nav.map(([value, label, Icon], index) => (
            <TabsTrigger key={value} value={value}>
              <span className="nav-index">0{index + 1}</span>
              <Icon />
              <span>{label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        <Link href="/radar" className="reclamation-entry"><Radar size={18} /><span>Radar local</span><ArrowRight size={16} /></Link>
        <Link href="/demo/reclamation" className="reclamation-entry secondary-entry"><FileText size={18} /><span>Démo réclamation</span><ArrowRight size={16} /></Link>
        <div className="rail-level">
          <span>NIVEAU {levelIndex + 1}</span>
          <strong>{level[0]}</strong>
          <Progress
            value={levelProgress}
            aria-label={`Progression vers ${nextLevel[0]}`}
          >
            <ProgressValue>{() => `${xp} XP`}</ProgressValue>
          </Progress>
          <small>
            {levelIndex === levels.length - 1
              ? 'Première boucle accomplie'
              : `${nextLevel[1] - xp} XP avant ${nextLevel[0]}`}
          </small>
        </div>
        <div className="private-mark">
          <LockKeyhole size={14} /> Espace privé
        </div>
      </aside>

      <main className="cockpit-main">
        <header className="mobile-top">
          <div className="rail-brand">
            <span>PC</span>
            <b>Premier client</b>
          </div>
          <div className="mobile-tools"><Link href="/radar" className="reclamation-mobile-entry">Radar local <ArrowRight size={16} /></Link><Link href="/demo/reclamation" className="reclamation-mobile-entry">Démo réclamation <ArrowRight size={16} /></Link></div>
        </header>
        {error && (
          <div className="alert" role="alert">
            <span>{error}</span>
            <Button variant="outline" onClick={() => void load()}>
              <RefreshCw />
              Réessayer
            </Button>
          </div>
        )}
        {notice && (
          <div className="notice" role="status">
            <Check size={16} />
            {notice}
          </div>
        )}

        <TabsContent value="hq">
          <section className="page hq-page">
            <div className="page-heading">
              <div>
                <p className="kicker">CAMPAGNE 01 · TROUVER UN PROBLÈME</p>
                <h1>
                  Trouver une première
                  <br />
                  <em>offre vendable.</em>
                </h1>
              </div>
              <p className="chapter">
                CHAPITRE 1/4
                <br />
                <b>Exploration terrain</b>
              </p>
            </div>
            <section className="mission-card">
              <div className="mission-code">
                MISSION
                <br />
                <b>ACTIVE</b>
              </div>
              <div>
                <p>Prochaine action</p>
                <h2>{nextMission.label}</h2>
                <span>
                  {Math.min(nextMission.current, nextMission.target)} /{' '}
                  {nextMission.target}
                </span>
              </div>
              <Button onClick={() => setView(nextMission.view)}>
                Continuer la campagne <ArrowRight />
              </Button>
            </section>
            <section
              className="metric-strip"
              aria-label="Progression commerciale"
            >
              {[
                ['Contacts pertinents', stats.contacts],
                ['Messages envoyés', stats.messages],
                ['Réponses reçues', stats.replies],
                ['Entretiens réalisés', stats.interviews],
                ['Problèmes confirmés', stats.problems],
                ['Rendez-vous commerciaux', stats.meetings],
                ['Propositions', stats.proposals],
                ['Clients', stats.clients],
              ].map(([label, value], index) => (
                <article key={label}>
                  <span>0{index + 1}</span>
                  <strong>{value}</strong>
                  <p>{label}</p>
                </article>
              ))}
            </section>
            <div className="hq-grid">
              <section className="panel mission-list">
                <div className="panel-head">
                  <div>
                    <p className="kicker">MISSIONS LIBRES</p>
                    <h2>Ce qui réduit l’incertitude</h2>
                  </div>
                  <span>
                    {missions.filter((m) => m.done).length}/{missions.length}
                  </span>
                </div>
                {missions.map((m) => (
                  <button
                    key={m.label}
                    className={m.done ? 'mission-row done' : 'mission-row'}
                    onClick={() => setView(m.view)}
                  >
                    <span className="mission-check">
                      {m.done ? (
                        <Check />
                      ) : (
                        `${Math.min(m.current, m.target)}/${m.target}`
                      )}
                    </span>
                    <span>{m.label}</span>
                    <ChevronRight />
                  </button>
                ))}
              </section>
              <aside className="field-log">
                <div className="panel-head">
                  <div>
                    <p className="kicker">JOURNAL DE TERRAIN</p>
                    <h2>Derniers mouvements</h2>
                  </div>
                </div>
                {recent.length ? (
                  recent.map((r) => (
                    <div className="log-row" key={r.at + r.detail}>
                      <span>
                        {new Date(r.at).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </span>
                      <div>
                        <b>{r.title}</b>
                        <p>{r.detail}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-compact">
                    Aucun mouvement. Commence par ajouter une entreprise.
                  </div>
                )}
              </aside>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="tracks">
          <section className="page">
            <div className="page-heading compact">
              <div>
                <p className="kicker">MODE EXPLORER</p>
                <h1>Carte d’exploration</h1>
                <p className="lead">
                  Les intuitions entrent à zéro. Les preuves les font monter —
                  ou les tuent proprement.
                </p>
              </div>
              <Button onClick={() => setDialog('track')}>
                <Plus />
                Nouvelle piste
              </Button>
            </div>
            <div className="track-grid">
              {data.tracks.map((track, index) => {
                const total =
                  track.frequency +
                  track.severity +
                  track.urgency +
                  track.budget +
                  track.access +
                  track.fit;
                return (
                  <button
                    key={track.id}
                    className={`track-card ${track.status}`}
                    onClick={() => setSelectedTrack({ ...track })}
                  >
                    <div className="track-top">
                      <span>PISTE {String(index + 1).padStart(2, '0')}</span>
                      <span className="track-status">
                        {
                          trackStatuses.find((s) => s.value === track.status)
                            ?.label
                        }
                      </span>
                    </div>
                    <h2>{track.name}</h2>
                    <p>{track.description}</p>
                    <div className="track-score">
                      <strong>
                        {total}
                        <small>/30</small>
                      </strong>
                      <div>
                        <span>Force de la piste</span>
                        <div className="score-line">
                          <i style={{ width: `${(total / 30) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                    <span className="open-card">
                      Ouvrir la fiche <ArrowRight />
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="foot-rule">
              <Flag size={16} /> Abandonner une piste est une décision utile :
              elle rapporte de la progression si elle repose sur le terrain.
            </p>
          </section>
        </TabsContent>

        <TabsContent value="interviews">
          <section className="page">
            <div className="page-heading compact">
              <div>
                <p className="kicker">MODE EXPLORER</p>
                <h1>Carnet d’entretiens</h1>
                <p className="lead">
                  Prépare l’hypothèse. Pendant l’échange, écoute. Après,
                  débriefe en cinq minutes.
                </p>
              </div>
              <Button
                disabled={!data.companies.length}
                onClick={() => setDialog('interview')}
              >
                <Plus />
                Préparer un entretien
              </Button>
            </div>
            <div className="interview-layout">
              <section>
                <div className="section-label">
                  <span>ENTRETIENS</span>
                  <b>{data.interviews.length}</b>
                </div>
                {data.interviews.length ? (
                  <div className="interview-list">
                    {data.interviews.map((i) => {
                      const company = interviewCompany(i, data.companies);
                      return (
                        <button
                          key={i.id}
                          onClick={() => setSelectedInterview({ ...i })}
                        >
                          <span className={`status-pin ${i.status}`} />
                          <div>
                            <b>
                              {company?.contactName ||
                                company?.name ||
                                'Interlocuteur'}
                            </b>
                            <p>
                              {company?.name}
                              {company?.contactRole
                                ? ` · ${company.contactRole}`
                                : ''}
                            </p>
                          </div>
                          <span className="interview-state">
                            {i.status === 'completed'
                              ? 'Débriefé'
                              : i.scheduledAt
                                ? new Date(i.scheduledAt).toLocaleDateString(
                                    'fr-FR',
                                  )
                                : 'À planifier'}
                          </span>
                          <ChevronRight />
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="empty-state">
                    <MessageSquareText />
                    <h2>Pas encore d’entretien</h2>
                    <p>
                      Ajoute d’abord une entreprise et un interlocuteur dans le
                      terrain commercial.
                    </p>
                  </div>
                )}
              </section>
              <aside className="themes-panel">
                <div className="section-label">
                  <span>THÈMES RÉCURRENTS</span>
                  <b>{themes.length}</b>
                </div>
                {themes.length ? (
                  themes.slice(0, 8).map(([theme, count], index) => (
                    <div className="theme-row" key={theme}>
                      <span>0{index + 1}</span>
                      <b>{theme}</b>
                      <strong>{count}×</strong>
                    </div>
                  ))
                ) : (
                  <div className="empty-compact">
                    Les thèmes apparaîtront ici à partir de tes débriefs.
                  </div>
                )}
                <p className="theme-rule">
                  Un thème devient un signal lorsqu’il revient dans plusieurs
                  entretiens.
                </p>
              </aside>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="offers">
          <section className="page">
            <div className="page-heading compact">
              <div>
                <p className="kicker">MODE CONSTRUIRE</p>
                <h1>Atelier des offres</h1>
                <p className="lead">
                  Une offre est une hypothèse structurée. La prospection ne
                  s’ouvre qu’avec assez de preuves.
                </p>
              </div>
            </div>
            <div className="offer-layout">
              <aside className="offer-tracks">
                <div className="section-label">
                  <span>CHOISIR UNE PISTE</span>
                </div>
                {data.tracks
                  .filter((t) => t.status !== 'abandoned')
                  .map((t) => (
                    <button
                      className={offerDraft?.trackId === t.id ? 'selected' : ''}
                      key={t.id}
                      onClick={() => chooseOffer(t.id)}
                    >
                      <span>{t.name}</span>
                      <strong>
                        {t.frequency +
                          t.severity +
                          t.urgency +
                          t.budget +
                          t.access +
                          t.fit}
                        /30
                      </strong>
                    </button>
                  ))}
              </aside>
              <section className="offer-workbench">
                {offerDraft ? (
                  <OfferForm
                    draft={offerDraft}
                    setDraft={setOfferDraft}
                    saving={saving}
                    evidence={(() => {
                      const trackCompanies = new Set(
                        data.companies
                          .filter(
                            (company) => company.trackId === offerDraft.trackId,
                          )
                          .map((company) => company.id),
                      );
                      const completed = data.interviews.filter(
                        (interview) =>
                          interview.status === 'completed' &&
                          trackCompanies.has(interview.companyId),
                      );
                      return {
                        interviews: completed.length,
                        meetings: completed.filter(
                          (interview) => interview.followUp,
                        ).length,
                      };
                    })()}
                    onSave={async () => {
                      if (
                        await mutate(
                          { action: 'saveOffer', ...offerDraft },
                          'Offre enregistrée.',
                        )
                      )
                        chooseOffer(offerDraft.trackId);
                    }}
                  />
                ) : (
                  <div className="empty-state">
                    <FileText />
                    <h2>Choisis une piste</h2>
                    <p>
                      L’atelier transforme un problème documenté en intervention
                      limitée.
                    </p>
                  </div>
                )}
              </section>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="terrain">
          <section className="page terrain-page">
            <div className="page-heading compact">
              <div>
                <p className="kicker">PIPELINE TERRAIN</p>
                <h1>Entreprises et contacts</h1>
                <p className="lead">
                  Une fiche n’existe que si elle mène à une prochaine action.
                </p>
              </div>
              <Button onClick={() => setDialog('company')}>
                <Plus />
                Ajouter une entreprise
              </Button>
            </div>
            {data.companies.length ? (
              <div className="pipeline">
                {stages.map((stage) => {
                  const companies = data.companies.filter(
                    (c) => c.stage === stage.value,
                  );
                  return (
                    <section key={stage.value} className="stage">
                      <header>
                        <span>{stage.label}</span>
                        <b>{companies.length}</b>
                      </header>
                      {companies.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setSelectedCompany({ ...c })}
                        >
                          <b>{c.name}</b>
                          <p>
                            {c.contactName || 'Interlocuteur à trouver'}
                            {c.contactRole ? ` · ${c.contactRole}` : ''}
                          </p>
                          <span>
                            {c.nextAction || 'Prochaine action à définir'}
                          </span>
                        </button>
                      ))}
                    </section>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state terrain-empty">
                <Building2 />
                <h2>Le pipeline est vide</h2>
                <p>
                  Ajoute une entreprise réelle. Son nom, un problème supposé et
                  la prochaine action suffisent.
                </p>
                <Button onClick={() => setDialog('company')}>
                  <Plus />
                  Première entreprise
                </Button>
              </div>
            )}
          </section>
        </TabsContent>
      </main>

      <NewTrackDialog
        open={dialog === 'track'}
        saving={saving}
        onClose={() => setDialog(null)}
        onSave={async (name, description) => {
          if (
            await mutate(
              { action: 'createTrack', name, description },
              'Piste ajoutée.',
            )
          )
            setDialog(null);
        }}
      />
      <NewCompanyDialog
        open={dialog === 'company'}
        tracks={data.tracks}
        saving={saving}
        onClose={() => setDialog(null)}
        onSave={async (values) => {
          if (
            await mutate(
              { action: 'createCompany', ...values },
              'Entreprise ajoutée au terrain.',
            )
          )
            setDialog(null);
        }}
      />
      <NewInterviewDialog
        open={dialog === 'interview'}
        companies={data.companies}
        saving={saving}
        onClose={() => setDialog(null)}
        onSave={async (values) => {
          if (
            await mutate(
              { action: 'createInterview', ...values },
              'Entretien préparé.',
            )
          )
            setDialog(null);
        }}
      />
      <TrackSheet
        track={selectedTrack}
        saving={saving}
        onClose={() => setSelectedTrack(null)}
        onSave={async (track) => {
          if (
            await mutate(
              { action: 'saveTrack', ...track },
              track.status === 'abandoned'
                ? 'Piste abandonnée. Bonne décision si les preuves ne suivent pas.'
                : 'Évaluation enregistrée.',
            )
          )
            setSelectedTrack(null);
        }}
      />
      <CompanySheet
        company={selectedCompany}
        tracks={data.tracks}
        saving={saving}
        onClose={() => setSelectedCompany(null)}
        onSave={async (company) => {
          if (
            await mutate(
              { action: 'saveCompany', ...company },
              'Fiche entreprise mise à jour.',
            )
          )
            setSelectedCompany(null);
        }}
      />
      <InterviewSheet
        interview={selectedInterview}
        companies={data.companies}
        saving={saving}
        onClose={() => setSelectedInterview(null)}
        onSave={async (interview) => {
          if (
            await mutate(
              { action: 'saveInterview', ...interview },
              interview.status === 'completed'
                ? 'Débrief enregistré. Le terrain vient de parler.'
                : 'Préparation enregistrée.',
            )
          )
            setSelectedInterview(null);
        }}
      />
    </Tabs>
  );
}

function NewTrackDialog({
  open,
  saving,
  onClose,
  onSave,
}: {
  open: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: (name: string, description: string) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  useEffect(() => {
    if (!open) {
      setName('');
      setDescription('');
    }
  }, [open]);
  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="dialog-wide">
        <DialogHeader>
          <DialogTitle>Ajouter une piste</DialogTitle>
          <DialogDescription>
            Une zone à explorer, pas un marché déjà choisi.
          </DialogDescription>
        </DialogHeader>
        <div className="form-grid">
          <Field label="Nom de la piste" wide>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex. Maintenance documentaire industrielle"
            />
          </Field>
          <Field label="Ce que tu veux comprendre" wide>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Le problème supposé, les personnes concernées…"
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            disabled={saving || !name.trim()}
            onClick={() => void onSave(name, description)}
          >
            {saving ? 'Ajout…' : 'Ajouter la piste'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewCompanyDialog({
  open,
  tracks,
  saving,
  onClose,
  onSave,
}: {
  open: boolean;
  tracks: Track[];
  saving: boolean;
  onClose: () => void;
  onSave: (values: Record<string, string>) => Promise<void>;
}) {
  const [values, setValues] = useState({
    trackId: '',
    name: '',
    contactName: '',
    contactRole: '',
    contactEmail: '',
    assumedProblem: '',
    nextAction: '',
  });
  useEffect(() => {
    if (!open) {
      setValues({
        trackId: '',
        name: '',
        contactName: '',
        contactRole: '',
        contactEmail: '',
        assumedProblem: '',
        nextAction: '',
      });
    } else if (!values.trackId && tracks[0])
      setValues((v) => ({ ...v, trackId: tracks[0].id }));
  }, [open, tracks, values.trackId]);
  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="dialog-wide">
        <DialogHeader>
          <DialogTitle>Ajouter une entreprise</DialogTitle>
          <DialogDescription>
            Le minimum utile pour provoquer une action réelle.
          </DialogDescription>
        </DialogHeader>
        <div className="form-grid">
          <Field label="Entreprise">
            <Input
              value={values.name}
              onChange={(e) => setValues({ ...values, name: e.target.value })}
            />
          </Field>
          <Field label="Piste">
            <Select
              value={values.trackId}
              onValueChange={(v) => v && setValues({ ...values, trackId: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tracks.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Interlocuteur">
            <Input
              value={values.contactName}
              onChange={(e) =>
                setValues({ ...values, contactName: e.target.value })
              }
              placeholder="Nom et prénom"
            />
          </Field>
          <Field label="Fonction">
            <Input
              value={values.contactRole}
              onChange={(e) =>
                setValues({ ...values, contactRole: e.target.value })
              }
              placeholder="Responsable informatique…"
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={values.contactEmail}
              onChange={(e) =>
                setValues({ ...values, contactEmail: e.target.value })
              }
            />
          </Field>
          <Field label="Prochaine action">
            <Input
              value={values.nextAction}
              onChange={(e) =>
                setValues({ ...values, nextAction: e.target.value })
              }
              placeholder="Trouver le responsable applicatif"
            />
          </Field>
          <Field label="Problème supposé" wide>
            <Textarea
              value={values.assumedProblem}
              onChange={(e) =>
                setValues({ ...values, assumedProblem: e.target.value })
              }
              placeholder="Une hypothèse à vérifier, jamais une vérité inventée."
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            disabled={saving || !values.name || !values.trackId}
            onClick={() => void onSave(values)}
          >
            {saving ? 'Ajout…' : 'Ajouter au terrain'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewInterviewDialog({
  open,
  companies,
  saving,
  onClose,
  onSave,
}: {
  open: boolean;
  companies: Company[];
  saving: boolean;
  onClose: () => void;
  onSave: (values: Record<string, string>) => Promise<void>;
}) {
  const [values, setValues] = useState({
    companyId: '',
    hypothesis: '',
    questions: defaultQuestions,
    scheduledAt: '',
  });
  useEffect(() => {
    if (!open) {
      setValues({
        companyId: '',
        hypothesis: '',
        questions: defaultQuestions,
        scheduledAt: '',
      });
    } else if (!values.companyId && companies[0])
      setValues((v) => ({ ...v, companyId: companies[0].id }));
  }, [open, companies, values.companyId]);
  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="dialog-tall">
        <DialogHeader>
          <DialogTitle>Préparer l’entretien</DialogTitle>
          <DialogDescription>
            Tu testes une hypothèse. Tu ne présentes pas encore une solution.
          </DialogDescription>
        </DialogHeader>
        <div className="form-grid">
          <Field label="Entreprise">
            <Select
              value={values.companyId}
              onValueChange={(v) => v && setValues({ ...values, companyId: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                    {c.contactName ? ` — ${c.contactName}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Date prévue">
            <Input
              type="datetime-local"
              value={values.scheduledAt}
              onChange={(e) =>
                setValues({ ...values, scheduledAt: e.target.value })
              }
            />
          </Field>
          <Field label="Hypothèse testée" wide>
            <Textarea
              value={values.hypothesis}
              onChange={(e) =>
                setValues({ ...values, hypothesis: e.target.value })
              }
              placeholder="Ex. Les outils internes sont difficiles à maintenir car une seule personne connaît leurs règles."
            />
          </Field>
          <Field label="Questions" wide>
            <Textarea
              className="questions-area"
              value={values.questions}
              onChange={(e) =>
                setValues({ ...values, questions: e.target.value })
              }
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            disabled={saving || !values.companyId || !values.hypothesis}
            onClick={() => void onSave(values)}
          >
            {saving ? 'Enregistrement…' : 'Enregistrer la préparation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TrackSheet({
  track,
  saving,
  onClose,
  onSave,
}: {
  track: Track | null;
  saving: boolean;
  onClose: () => void;
  onSave: (track: Track) => Promise<void>;
}) {
  const [draft, setDraft] = useState<Track | null>(track);
  useEffect(() => setDraft(track), [track]);
  return (
    <Sheet open={!!track} onOpenChange={(value) => !value && onClose()}>
      <SheetContent className="detail-sheet" showCloseButton={false}>
        {draft && (
          <>
            <div className="sheet-bar">
              <span>ÉVALUATION DE PISTE</span>
              <Button variant="ghost" onClick={onClose}>
                Fermer ×
              </Button>
            </div>
            <div className="sheet-body">
              <SheetTitle>{draft.name}</SheetTitle>
              <SheetDescription>
                Note uniquement ce que les échanges réels permettent de
                défendre.
              </SheetDescription>
              <Field label="Nom">
                <Input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </Field>
              <Field label="Description">
                <Textarea
                  value={draft.description}
                  onChange={(e) =>
                    setDraft({ ...draft, description: e.target.value })
                  }
                />
              </Field>
              <Field label="Statut">
                <Select
                  value={draft.status}
                  onValueChange={(v) => v && setDraft({ ...draft, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {trackStatuses.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <div className="score-editor">
                {scoreLabels.map(([key, label]) => (
                  <label key={key}>
                    <span>
                      {label}
                      <b>{draft[key]}/5</b>
                    </span>
                    <Slider
                      min={0}
                      max={5}
                      step={1}
                      value={[draft[key]]}
                      onValueChange={(value) =>
                        setDraft({
                          ...draft,
                          [key]: Array.isArray(value) ? value[0] : value,
                        })
                      }
                    />
                  </label>
                ))}
              </div>
              <div className="score-total">
                <span>SCORE ACTUEL</span>
                <strong>
                  {draft.frequency +
                    draft.severity +
                    draft.urgency +
                    draft.budget +
                    draft.access +
                    draft.fit}
                  <small>/30</small>
                </strong>
              </div>
            </div>
            <div className="sheet-actions">
              <Button variant="outline" onClick={onClose}>
                Annuler
              </Button>
              <Button
                disabled={saving || !draft.name}
                onClick={() => void onSave(draft)}
              >
                {saving ? 'Enregistrement…' : 'Enregistrer l’évaluation'}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function CompanySheet({
  company,
  tracks,
  saving,
  onClose,
  onSave,
}: {
  company: Company | null;
  tracks: Track[];
  saving: boolean;
  onClose: () => void;
  onSave: (company: Company) => Promise<void>;
}) {
  const [draft, setDraft] = useState<Company | null>(company);
  useEffect(() => setDraft(company), [company]);
  return (
    <Sheet open={!!company} onOpenChange={(value) => !value && onClose()}>
      <SheetContent className="detail-sheet" showCloseButton={false}>
        {draft && (
          <>
            <div className="sheet-bar">
              <span>FICHE TERRAIN</span>
              <Button variant="ghost" onClick={onClose}>
                Fermer ×
              </Button>
            </div>
            <div className="sheet-body">
              <SheetTitle>{draft.name}</SheetTitle>
              <SheetDescription>
                {stages.find((s) => s.value === draft.stage)?.label}
              </SheetDescription>
              <div className="form-grid sheet-form">
                <Field label="Entreprise">
                  <Input
                    value={draft.name}
                    onChange={(e) =>
                      setDraft({ ...draft, name: e.target.value })
                    }
                  />
                </Field>
                <Field label="Piste">
                  <Select
                    value={draft.trackId}
                    onValueChange={(v) =>
                      v && setDraft({ ...draft, trackId: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {tracks.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Interlocuteur">
                  <Input
                    value={draft.contactName}
                    onChange={(e) =>
                      setDraft({ ...draft, contactName: e.target.value })
                    }
                  />
                </Field>
                <Field label="Fonction">
                  <Input
                    value={draft.contactRole}
                    onChange={(e) =>
                      setDraft({ ...draft, contactRole: e.target.value })
                    }
                  />
                </Field>
                <Field label="Email">
                  <Input
                    type="email"
                    value={draft.contactEmail}
                    onChange={(e) =>
                      setDraft({ ...draft, contactEmail: e.target.value })
                    }
                  />
                </Field>
                <Field label="Étape">
                  <Select
                    value={draft.stage}
                    onValueChange={(v) => v && setDraft({ ...draft, stage: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {stages.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Dernier contact">
                  <Input
                    type="date"
                    value={draft.lastContact || ''}
                    onChange={(e) =>
                      setDraft({ ...draft, lastContact: e.target.value })
                    }
                  />
                </Field>
                <Field label="Prochaine action">
                  <Input
                    value={draft.nextAction}
                    onChange={(e) =>
                      setDraft({ ...draft, nextAction: e.target.value })
                    }
                  />
                </Field>
                <Field label="Problème supposé" wide>
                  <Textarea
                    value={draft.assumedProblem}
                    onChange={(e) =>
                      setDraft({ ...draft, assumedProblem: e.target.value })
                    }
                  />
                </Field>
              </div>
            </div>
            <div className="sheet-actions">
              <Button variant="outline" onClick={onClose}>
                Annuler
              </Button>
              <Button
                disabled={saving || !draft.name || !draft.nextAction}
                onClick={() => void onSave(draft)}
              >
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function InterviewSheet({
  interview,
  companies,
  saving,
  onClose,
  onSave,
}: {
  interview: Interview | null;
  companies: Company[];
  saving: boolean;
  onClose: () => void;
  onSave: (interview: Interview) => Promise<void>;
}) {
  const [draft, setDraft] = useState<Interview | null>(interview);
  useEffect(() => setDraft(interview), [interview]);
  return (
    <Sheet open={!!interview} onOpenChange={(value) => !value && onClose()}>
      <SheetContent
        className="detail-sheet interview-sheet"
        showCloseButton={false}
      >
        {draft && (
          <>
            <div className="sheet-bar">
              <span>
                {draft.status === 'completed'
                  ? 'DÉBRIEF TERRAIN'
                  : 'PRÉPARATION'}
              </span>
              <Button variant="ghost" onClick={onClose}>
                Fermer ×
              </Button>
            </div>
            <div className="sheet-body">
              <SheetTitle>
                {interviewCompany(draft, companies)?.name || 'Entretien'}
              </SheetTitle>
              <SheetDescription>
                {draft.status === 'completed'
                  ? 'Ce qui s’est réellement passé — sans enjoliver.'
                  : 'L’hypothèse à mettre en danger.'}
              </SheetDescription>
              <div className="form-grid sheet-form">
                <Field label="Interlocuteur" wide>
                  <Select
                    value={draft.companyId}
                    onValueChange={(v) =>
                      v && setDraft({ ...draft, companyId: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                          {c.contactName ? ` — ${c.contactName}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Hypothèse testée" wide>
                  <Textarea
                    value={draft.hypothesis}
                    onChange={(e) =>
                      setDraft({ ...draft, hypothesis: e.target.value })
                    }
                  />
                </Field>
                <Field label="Questions préparées" wide>
                  <Textarea
                    className="questions-area"
                    value={draft.questions}
                    onChange={(e) =>
                      setDraft({ ...draft, questions: e.target.value })
                    }
                  />
                </Field>
                <div className="debrief-divider wide">
                  <span>APRÈS L’ENTRETIEN</span>
                  <button
                    type="button"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        status:
                          draft.status === 'completed'
                            ? 'planned'
                            : 'completed',
                      })
                    }
                  >
                    <Checkbox checked={draft.status === 'completed'} />{' '}
                    Entretien réalisé
                  </button>
                </div>
                <Field label="Quel problème a été cité ?" wide>
                  <Textarea
                    value={draft.problem}
                    onChange={(e) =>
                      setDraft({ ...draft, problem: e.target.value })
                    }
                  />
                </Field>
                <Field label="Dernière occurrence">
                  <Textarea
                    value={draft.lastOccurrence}
                    onChange={(e) =>
                      setDraft({ ...draft, lastOccurrence: e.target.value })
                    }
                  />
                </Field>
                <Field label="Conséquences concrètes">
                  <Textarea
                    value={draft.consequences}
                    onChange={(e) =>
                      setDraft({ ...draft, consequences: e.target.value })
                    }
                  />
                </Field>
                <Field label="Ce qu’ils ont déjà essayé">
                  <Textarea
                    value={draft.tried}
                    onChange={(e) =>
                      setDraft({ ...draft, tried: e.target.value })
                    }
                  />
                </Field>
                <Field label="Qui décide ?">
                  <Textarea
                    value={draft.decisionMaker}
                    onChange={(e) =>
                      setDraft({ ...draft, decisionMaker: e.target.value })
                    }
                  />
                </Field>
                <Field label="Phrase exacte retenue" wide>
                  <Textarea
                    value={draft.exactQuote}
                    onChange={(e) =>
                      setDraft({ ...draft, exactQuote: e.target.value })
                    }
                    placeholder="Les mots de l’interlocuteur, pas ta reformulation."
                  />
                </Field>
                <Field label="Thèmes — séparés par des virgules" wide>
                  <Input
                    value={draft.themes}
                    onChange={(e) =>
                      setDraft({ ...draft, themes: e.target.value })
                    }
                    placeholder="documentation, dépendance à une personne, erreurs de données"
                  />
                </Field>
                <label className="follow-up wide">
                  <Checkbox
                    checked={!!draft.followUp}
                    onCheckedChange={(checked) =>
                      setDraft({ ...draft, followUp: checked ? 1 : 0 })
                    }
                  />
                  <span>
                    <b>Un nouvel échange est accepté</b>
                    <small>
                      Ce signal pèse davantage qu’un compliment poli.
                    </small>
                  </span>
                </label>
              </div>
            </div>
            <div className="sheet-actions">
              <Button variant="outline" onClick={onClose}>
                Annuler
              </Button>
              <Button
                disabled={saving || !draft.hypothesis}
                onClick={() => void onSave(draft)}
              >
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function OfferForm({
  draft,
  setDraft,
  saving,
  evidence,
  onSave,
}: {
  draft: Offer;
  setDraft: (offer: Offer) => void;
  saving: boolean;
  evidence: { interviews: number; meetings: number };
  onSave: () => Promise<void>;
}) {
  const readiness = [
    {
      label: '5 témoignages concordants',
      done: evidence.interviews >= 5,
      value: `${evidence.interviews}/5`,
    },
    {
      label: '2 personnes prêtes à approfondir',
      done: evidence.meetings >= 2,
      value: `${evidence.meetings}/2`,
    },
    {
      label: '1 démonstration disponible',
      done: !!draft.demoAvailable,
      value: draft.demoAvailable ? '1/1' : '0/1',
    },
  ];
  const unlocked = readiness.every((r) => r.done);
  return (
    <>
      <div className="offer-head">
        <div>
          <span>BROUILLON D’INTERVENTION</span>
          <h2>Formuler sans raconter d’histoires</h2>
        </div>
        <span className={unlocked ? 'unlock open' : 'unlock'}>
          {unlocked ? 'PRÊTE À TESTER' : 'PROSPECTION VERROUILLÉE'}
        </span>
      </div>
      <div className="offer-sentence">
        <span>J’aide</span>
        <Textarea
          value={draft.audience}
          onChange={(e) => setDraft({ ...draft, audience: e.target.value })}
          placeholder="un type précis d’entreprise ou de personne"
        />
        <span>à résoudre</span>
        <Textarea
          value={draft.problem}
          onChange={(e) => setDraft({ ...draft, problem: e.target.value })}
          placeholder="un problème observable"
        />
        <span>grâce à</span>
        <Textarea
          value={draft.intervention}
          onChange={(e) => setDraft({ ...draft, intervention: e.target.value })}
          placeholder="une intervention limitée"
        />
        <span>en livrant</span>
        <Textarea
          value={draft.deliverables}
          onChange={(e) => setDraft({ ...draft, deliverables: e.target.value })}
          placeholder="des résultats concrets"
        />
        <span>sans</span>
        <Textarea
          value={draft.withoutRisk}
          onChange={(e) => setDraft({ ...draft, withoutRisk: e.target.value })}
          placeholder="le risque ou la contrainte redoutée"
        />
        <span>La mission s’arrête si</span>
        <Textarea
          value={draft.stopCondition}
          onChange={(e) =>
            setDraft({ ...draft, stopCondition: e.target.value })
          }
          placeholder="la condition d’abandon"
        />
      </div>
      <label className="demo-check">
        <Checkbox
          checked={!!draft.demoAvailable}
          onCheckedChange={(checked) =>
            setDraft({ ...draft, demoAvailable: checked ? 1 : 0 })
          }
        />
        <span>
          <b>Une démonstration réelle est disponible</b>
          <small>
            Pas une maquette vide : quelque chose que tu peux montrer.
          </small>
        </span>
      </label>
      <div className="offer-gate">
        <div className="section-label">
          <span>SEUIL AVANT PROSPECTION</span>
        </div>
        {readiness.map((r) => (
          <div key={r.label} className={r.done ? 'gate-row done' : 'gate-row'}>
            <span>{r.done ? <Check /> : <LockKeyhole />}</span>
            <b>{r.label}</b>
            <strong>{r.value}</strong>
          </div>
        ))}
      </div>
      <div className="offer-save">
        <Button
          disabled={saving || !offerComplete(draft)}
          onClick={() => void onSave()}
        >
          {saving ? 'Enregistrement…' : 'Enregistrer l’offre'}
        </Button>
        <p>
          {offerComplete(draft)
            ? 'Le brouillon est complet. Son droit d’être prospecté dépend encore des preuves.'
            : 'Complète les six morceaux pour enregistrer une offre.'}
        </p>
      </div>
    </>
  );
}
