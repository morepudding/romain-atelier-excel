import {
  sqliteTable,
  text,
  integer,
  primaryKey,
  index,
} from 'drizzle-orm/sqlite-core';
export const sectorNotes = sqliteTable(
  'sector_notes',
  {
    userId: text('user_id').notNull(),
    sectorId: text('sector_id').notNull(),
    notes: text('notes').notNull().default(''),
    priority: integer('priority').notNull(),
    status: text('status').notNull(),
    version: integer('version').notNull().default(1),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.sectorId] })],
);

export const campaignTracks = sqliteTable(
  'campaign_tracks',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    status: text('status').notNull().default('active'),
    frequency: integer('frequency').notNull().default(0),
    severity: integer('severity').notNull().default(0),
    urgency: integer('urgency').notNull().default(0),
    budget: integer('budget').notNull().default(0),
    access: integer('access').notNull().default(0),
    fit: integer('fit').notNull().default(0),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [index('idx_campaign_tracks_user_id').on(t.userId)],
);

export const campaignCompanies = sqliteTable(
  'campaign_companies',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    trackId: text('track_id').notNull(),
    name: text('name').notNull(),
    contactName: text('contact_name').notNull().default(''),
    contactRole: text('contact_role').notNull().default(''),
    contactEmail: text('contact_email').notNull().default(''),
    assumedProblem: text('assumed_problem').notNull().default(''),
    stage: text('stage').notNull().default('research'),
    lastContact: text('last_contact'),
    nextAction: text('next_action').notNull().default(''),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [index('idx_campaign_companies_user_id').on(t.userId)],
);

export const campaignInterviews = sqliteTable(
  'campaign_interviews',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    companyId: text('company_id').notNull(),
    hypothesis: text('hypothesis').notNull().default(''),
    questions: text('questions').notNull().default(''),
    scheduledAt: text('scheduled_at'),
    status: text('status').notNull().default('planned'),
    problem: text('problem').notNull().default(''),
    lastOccurrence: text('last_occurrence').notNull().default(''),
    consequences: text('consequences').notNull().default(''),
    tried: text('tried').notNull().default(''),
    decisionMaker: text('decision_maker').notNull().default(''),
    followUp: integer('follow_up').notNull().default(0),
    exactQuote: text('exact_quote').notNull().default(''),
    themes: text('themes').notNull().default(''),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [index('idx_campaign_interviews_user_id').on(t.userId)],
);

export const campaignOffers = sqliteTable(
  'campaign_offers',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    trackId: text('track_id').notNull(),
    audience: text('audience').notNull().default(''),
    problem: text('problem').notNull().default(''),
    intervention: text('intervention').notNull().default(''),
    deliverables: text('deliverables').notNull().default(''),
    withoutRisk: text('without_risk').notNull().default(''),
    stopCondition: text('stop_condition').notNull().default(''),
    demoAvailable: integer('demo_available').notNull().default(0),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [index('idx_campaign_offers_user_id').on(t.userId)],
);
