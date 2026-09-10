export type ResearchPriority = 'À contacter en priorité' | 'À qualifier';

export type ResearchSource = {
  url: string;
  title: string;
  kind: 'site' | 'contact' | 'recrutement' | 'identite';
};

export type ResearchEvidence = {
  kind: 'sav' | 'interventions' | 'suivi' | 'recrutement';
  label: string;
  excerpt: string;
  sourceUrl: string;
};

export type CompanyResearch = {
  version: 1;
  status: 'complete' | 'partial' | 'unavailable';
  researchedAt: string;
  website: string | null;
  identity: 'siren' | 'name_location' | 'unconfirmed';
  identitySourceUrl: string | null;
  priority: ResearchPriority;
  summary: string;
  evidence: ResearchEvidence[];
  sources: ResearchSource[];
  contact: {
    role: string;
    email: string | null;
    phone: string | null;
    sourceUrl: string | null;
  };
  demo: { title: string; explanation: string };
  hypothesis: string;
  questions: string[];
  message: { subject: string; body: string } | null;
  limitations: string[];
};
