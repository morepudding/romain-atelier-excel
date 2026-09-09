export const trackStatuses = [
  { value: 'active', label: 'En exploration' },
  { value: 'promising', label: 'Prometteuse' },
  { value: 'paused', label: 'En pause' },
  { value: 'abandoned', label: 'Abandonnée' },
] as const;

export const stages = [
  { value: 'research', label: 'À étudier' },
  { value: 'contact', label: 'Contact identifié' },
  { value: 'message', label: 'Message envoyé' },
  { value: 'reply', label: 'Réponse' },
  { value: 'interview', label: 'Entretien' },
  { value: 'opportunity', label: 'Opportunité' },
  { value: 'proposal', label: 'Proposition' },
  { value: 'won', label: 'Gagnée' },
  { value: 'lost', label: 'Perdue' },
] as const;

export type Track = {
  id: string;
  name: string;
  description: string;
  status: string;
  frequency: number;
  severity: number;
  urgency: number;
  budget: number;
  access: number;
  fit: number;
  createdAt: string;
  updatedAt: string;
};
export type Company = {
  id: string;
  trackId: string;
  name: string;
  contactName: string;
  contactRole: string;
  contactEmail: string;
  assumedProblem: string;
  stage: string;
  lastContact: string | null;
  nextAction: string;
  createdAt: string;
  updatedAt: string;
};
export type Interview = {
  id: string;
  companyId: string;
  hypothesis: string;
  questions: string;
  scheduledAt: string | null;
  status: string;
  problem: string;
  lastOccurrence: string;
  consequences: string;
  tried: string;
  decisionMaker: string;
  followUp: number;
  exactQuote: string;
  themes: string;
  createdAt: string;
  updatedAt: string;
};
export type Offer = {
  id: string;
  trackId: string;
  audience: string;
  problem: string;
  intervention: string;
  deliverables: string;
  withoutRisk: string;
  stopCondition: string;
  demoAvailable: number;
  updatedAt: string;
};
export type CampaignData = {
  tracks: Track[];
  companies: Company[];
  interviews: Interview[];
  offers: Offer[];
};

export const defaultQuestions = [
  'Racontez-moi la dernière fois que ce problème s’est produit.',
  'Quelles conséquences concrètes cela a-t-il provoquées ?',
  'Comment faites-vous aujourd’hui pour le contourner ?',
  'Qui est le plus touché et qui décide de le corriger ?',
  'Est-ce assez important pour qu’on en reparle avec un exemple réel ?',
].join('\n');
