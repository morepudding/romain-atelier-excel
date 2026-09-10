import type { RadarCompany } from './types';

export const leadStatuses = {
  to_review: 'À étudier',
  to_contact: 'À contacter',
  contacted: 'Contactée',
  meeting: 'Rendez-vous prévu',
  paused: 'En pause',
} as const;
export type LeadStatus = keyof typeof leadStatuses;
export type Lead = {
  id: string;
  user_id: string;
  siren: string;
  company: RadarCompany;
  status: LeadStatus;
  notes: string;
  next_action: string;
  next_action_date: string | null;
  source_retrieved_at: string;
  created_at: string;
  updated_at: string;
  revision: number;
};
