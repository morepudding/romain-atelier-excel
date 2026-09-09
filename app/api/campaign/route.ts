import { getChatGPTUser } from '@/app/chatgpt-auth';
import { database } from '@/db/raw';
import { stages, trackStatuses } from '@/lib/campaign';

export const dynamic = 'force-dynamic';

const json = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' },
  });
const now = () => new Date().toISOString();
const clean = (value: unknown, max = 4000) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';
const score = (value: unknown) =>
  Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 5
    ? Number(value)
    : null;

const defaults = [
  [
    'modernisation',
    'Modernisation d’outils internes',
    'Excel, VBA, Access, Power Apps et applications vieillissantes.',
    5,
  ],
  [
    'documentation',
    'Recherche dans la documentation',
    'Connaissances dispersées, dépendance à quelques personnes et assistants RAG.',
    5,
  ],
  [
    'adoption-ia',
    'Adoption concrète de l’IA',
    'Entreprises équipées mais sans usages réels, accompagnement et prototypage.',
    5,
  ],
  [
    'pilotage',
    'Pilotage d’équipes et de projets',
    'Charge, priorisation, portails internes et outils de suivi.',
    4,
  ],
] as const;

async function ensureDefaults(userId: string) {
  const first = await database()
    .prepare('SELECT id FROM campaign_tracks WHERE user_id = ? LIMIT 1')
    .bind(userId)
    .first();
  if (first) return;
  const time = now();
  await database().batch(
    defaults.map(([id, name, description, fit]) =>
      database()
        .prepare(
          'INSERT OR IGNORE INTO campaign_tracks (id, user_id, name, description, status, frequency, severity, urgency, budget, access, fit, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, 0, 0, 0, 0, ?, ?, ?)',
        )
        .bind(
          `${userId}:${id}`,
          userId,
          name,
          description,
          'active',
          fit,
          time,
          time,
        ),
    ),
  );
}

async function owns(table: string, id: string, userId: string) {
  if (
    ![
      'campaign_tracks',
      'campaign_companies',
      'campaign_interviews',
      'campaign_offers',
    ].includes(table)
  )
    return false;
  return !!(await database()
    .prepare(`SELECT id FROM ${table} WHERE id = ? AND user_id = ?`)
    .bind(id, userId)
    .first());
}

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return json({ error: 'Connexion requise.' }, 401);
  try {
    await ensureDefaults(user.userId);
    const [tracks, companies, interviews, offers] = await Promise.all([
      database()
        .prepare(
          'SELECT id, name, description, status, frequency, severity, urgency, budget, access, fit, created_at AS createdAt, updated_at AS updatedAt FROM campaign_tracks WHERE user_id = ? ORDER BY created_at',
        )
        .bind(user.userId)
        .all(),
      database()
        .prepare(
          'SELECT id, track_id AS trackId, name, contact_name AS contactName, contact_role AS contactRole, contact_email AS contactEmail, assumed_problem AS assumedProblem, stage, last_contact AS lastContact, next_action AS nextAction, created_at AS createdAt, updated_at AS updatedAt FROM campaign_companies WHERE user_id = ? ORDER BY updated_at DESC',
        )
        .bind(user.userId)
        .all(),
      database()
        .prepare(
          'SELECT id, company_id AS companyId, hypothesis, questions, scheduled_at AS scheduledAt, status, problem, last_occurrence AS lastOccurrence, consequences, tried, decision_maker AS decisionMaker, follow_up AS followUp, exact_quote AS exactQuote, themes, created_at AS createdAt, updated_at AS updatedAt FROM campaign_interviews WHERE user_id = ? ORDER BY updated_at DESC',
        )
        .bind(user.userId)
        .all(),
      database()
        .prepare(
          'SELECT id, track_id AS trackId, audience, problem, intervention, deliverables, without_risk AS withoutRisk, stop_condition AS stopCondition, demo_available AS demoAvailable, updated_at AS updatedAt FROM campaign_offers WHERE user_id = ? ORDER BY updated_at DESC',
        )
        .bind(user.userId)
        .all(),
    ]);
    return json({
      tracks: tracks.results,
      companies: companies.results,
      interviews: interviews.results,
      offers: offers.results,
    });
  } catch (error) {
    console.error('campaign.GET', error);
    return json({ error: 'Le cockpit est momentanément indisponible.' }, 503);
  }
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return json({ error: 'Connexion requise.' }, 401);
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return json({ error: 'Origine refusée.' }, 403);
  if (!request.headers.get('content-type')?.startsWith('application/json'))
    return json({ error: 'Format refusé.' }, 415);
  const raw = await request.text();
  if (raw.length > 50000) return json({ error: 'Saisie trop longue.' }, 413);
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: 'Données invalides.' }, 400);
  }
  const action = clean(body.action, 40);
  const time = now();
  const id = crypto.randomUUID();
  try {
    if (action === 'createTrack') {
      const name = clean(body.name, 120);
      const description = clean(body.description, 500);
      if (!name) return json({ error: 'Donnez un nom à la piste.' }, 400);
      await database()
        .prepare(
          'INSERT INTO campaign_tracks (id, user_id, name, description, status, frequency, severity, urgency, budget, access, fit, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, 0, 0, 0, 0, 0, ?, ?)',
        )
        .bind(id, user.userId, name, description, 'active', time, time)
        .run();
    } else if (action === 'saveTrack') {
      const trackId = clean(body.id, 150);
      const values = [
        body.frequency,
        body.severity,
        body.urgency,
        body.budget,
        body.access,
        body.fit,
      ].map(score);
      if (
        !trackId ||
        values.some((v) => v === null) ||
        !trackStatuses.some((s) => s.value === body.status) ||
        !(await owns('campaign_tracks', trackId, user.userId))
      )
        return json({ error: 'Piste invalide.' }, 400);
      await database()
        .prepare(
          'UPDATE campaign_tracks SET name = ?, description = ?, status = ?, frequency = ?, severity = ?, urgency = ?, budget = ?, access = ?, fit = ?, updated_at = ? WHERE id = ? AND user_id = ?',
        )
        .bind(
          clean(body.name, 120),
          clean(body.description, 500),
          body.status,
          ...values,
          time,
          trackId,
          user.userId,
        )
        .run();
    } else if (action === 'createCompany') {
      const trackId = clean(body.trackId, 150);
      const name = clean(body.name, 140);
      if (!name || !(await owns('campaign_tracks', trackId, user.userId)))
        return json({ error: 'Entreprise ou piste invalide.' }, 400);
      await database()
        .prepare(
          'INSERT INTO campaign_companies (id, user_id, track_id, name, contact_name, contact_role, contact_email, assumed_problem, stage, last_contact, next_action, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        )
        .bind(
          id,
          user.userId,
          trackId,
          name,
          clean(body.contactName, 140),
          clean(body.contactRole, 140),
          clean(body.contactEmail, 220),
          clean(body.assumedProblem, 1000),
          'research',
          null,
          clean(body.nextAction, 500),
          time,
          time,
        )
        .run();
    } else if (action === 'saveCompany') {
      const companyId = clean(body.id, 100);
      const trackId = clean(body.trackId, 150);
      const stage = clean(body.stage, 40);
      if (
        !companyId ||
        !stages.some((s) => s.value === stage) ||
        !(await owns('campaign_companies', companyId, user.userId)) ||
        !(await owns('campaign_tracks', trackId, user.userId))
      )
        return json({ error: 'Entreprise invalide.' }, 400);
      await database()
        .prepare(
          'UPDATE campaign_companies SET track_id = ?, name = ?, contact_name = ?, contact_role = ?, contact_email = ?, assumed_problem = ?, stage = ?, last_contact = ?, next_action = ?, updated_at = ? WHERE id = ? AND user_id = ?',
        )
        .bind(
          trackId,
          clean(body.name, 140),
          clean(body.contactName, 140),
          clean(body.contactRole, 140),
          clean(body.contactEmail, 220),
          clean(body.assumedProblem, 1000),
          stage,
          clean(body.lastContact, 20) || null,
          clean(body.nextAction, 500),
          time,
          companyId,
          user.userId,
        )
        .run();
    } else if (action === 'createInterview') {
      const companyId = clean(body.companyId, 100);
      if (!(await owns('campaign_companies', companyId, user.userId)))
        return json({ error: 'Entreprise invalide.' }, 400);
      await database()
        .prepare(
          'INSERT INTO campaign_interviews (id, user_id, company_id, hypothesis, questions, scheduled_at, status, problem, last_occurrence, consequences, tried, decision_maker, follow_up, exact_quote, themes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)',
        )
        .bind(
          id,
          user.userId,
          companyId,
          clean(body.hypothesis, 1200),
          clean(body.questions, 5000),
          clean(body.scheduledAt, 30) || null,
          'planned',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          time,
          time,
        )
        .run();
    } else if (action === 'saveInterview') {
      const interviewId = clean(body.id, 100);
      const companyId = clean(body.companyId, 100);
      if (
        !(await owns('campaign_interviews', interviewId, user.userId)) ||
        !(await owns('campaign_companies', companyId, user.userId)) ||
        !['planned', 'completed'].includes(clean(body.status, 20))
      )
        return json({ error: 'Entretien invalide.' }, 400);
      await database()
        .prepare(
          'UPDATE campaign_interviews SET company_id = ?, hypothesis = ?, questions = ?, scheduled_at = ?, status = ?, problem = ?, last_occurrence = ?, consequences = ?, tried = ?, decision_maker = ?, follow_up = ?, exact_quote = ?, themes = ?, updated_at = ? WHERE id = ? AND user_id = ?',
        )
        .bind(
          companyId,
          clean(body.hypothesis, 1200),
          clean(body.questions, 5000),
          clean(body.scheduledAt, 30) || null,
          body.status,
          clean(body.problem, 1500),
          clean(body.lastOccurrence, 1200),
          clean(body.consequences, 1500),
          clean(body.tried, 1500),
          clean(body.decisionMaker, 500),
          body.followUp ? 1 : 0,
          clean(body.exactQuote, 1500),
          clean(body.themes, 800),
          time,
          interviewId,
          user.userId,
        )
        .run();
    } else if (action === 'saveOffer') {
      const offerId = clean(body.id, 100);
      const trackId = clean(body.trackId, 150);
      if (!(await owns('campaign_tracks', trackId, user.userId)))
        return json({ error: 'Piste invalide.' }, 400);
      if (offerId && (await owns('campaign_offers', offerId, user.userId))) {
        await database()
          .prepare(
            'UPDATE campaign_offers SET track_id = ?, audience = ?, problem = ?, intervention = ?, deliverables = ?, without_risk = ?, stop_condition = ?, demo_available = ?, updated_at = ? WHERE id = ? AND user_id = ?',
          )
          .bind(
            trackId,
            clean(body.audience, 500),
            clean(body.problem, 1000),
            clean(body.intervention, 1000),
            clean(body.deliverables, 1000),
            clean(body.withoutRisk, 1000),
            clean(body.stopCondition, 1000),
            body.demoAvailable ? 1 : 0,
            time,
            offerId,
            user.userId,
          )
          .run();
      } else {
        await database()
          .prepare(
            'INSERT INTO campaign_offers (id, user_id, track_id, audience, problem, intervention, deliverables, without_risk, stop_condition, demo_available, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          )
          .bind(
            id,
            user.userId,
            trackId,
            clean(body.audience, 500),
            clean(body.problem, 1000),
            clean(body.intervention, 1000),
            clean(body.deliverables, 1000),
            clean(body.withoutRisk, 1000),
            clean(body.stopCondition, 1000),
            body.demoAvailable ? 1 : 0,
            time,
          )
          .run();
      }
    } else return json({ error: 'Action inconnue.' }, 400);
    return GET();
  } catch (error) {
    console.error('campaign.POST', action, error);
    return json(
      { error: 'Enregistrement impossible. Votre saisie reste affichée.' },
      503,
    );
  }
}
