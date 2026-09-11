import type { ActivitySection } from './config.ts';
import type { CompanyResearch } from './research-types.ts';

export type PriorityLevel = 'Prioritaire' | 'Intéressante' | 'À vérifier';

export type RadarCompany = {
  research?: CompanyResearch;
  siren: string;
  nom: string;
  commune: string;
  codePostal: string;
  distanceKm: number;
  activiteCode: string;
  activiteLibelle: string;
  trancheEffectif: string;
  nombreEtablissements: number;
  niveauPriorite: PriorityLevel;
  raisonSelection: string;
  workflowProbable: string;
  sourceUrl: string;
};

export type RadarTargetKind = 'Entreprise' | 'Association';

export type RadarTarget = {
  siren: string;
  nom: string;
  type: RadarTargetKind;
  commune: string;
  codePostal: string;
  distanceKm: number;
  activiteCode: string;
  activiteLibelle: string;
  trancheEffectif: string;
  nombreEtablissements: number;
  sourceUrl: string;
};

export type RadarRefonteSearch = {
  center: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  limit: number;
};

export type RadarRefonteResult = {
  search: RadarRefonteSearch;
  retrievedAt: string;
  source: string;
  examinedCount: number;
  targets: RadarTarget[];
};

export type RadarSearch = {
  center: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  limit: number;
  targetWorkflow: 'reclamations_client';
  activitySections: ActivitySection[];
};

export type RadarResult = {
  search: RadarSearch;
  retrievedAt: string;
  source: string;
  examinedCount: number;
  companies: RadarCompany[];
};

export type RawEstablishment = {
  etat_administratif?: string | null;
  date_fermeture?: string | null;
  code_postal?: string | null;
  libelle_commune?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
};

export type RawCompany = {
  siren?: string | null;
  nom_complet?: string | null;
  nom_raison_sociale?: string | null;
  etat_administratif?: string | null;
  date_fermeture?: string | null;
  nature_juridique?: string | null;
  section_activite_principale?: string | null;
  activite_principale?: string | null;
  tranche_effectif_salarie?: string | null;
  categorie_entreprise?: string | null;
  nombre_etablissements_ouverts?: number | null;
  nombre_etablissements?: number | null;
  date_creation?: string | null;
  matching_etablissements?: RawEstablishment[] | null;
  siege?: RawEstablishment | null;
};

export type RawApiResponse = {
  results?: RawCompany[];
  total_results?: number;
  page?: number;
  per_page?: number;
};
