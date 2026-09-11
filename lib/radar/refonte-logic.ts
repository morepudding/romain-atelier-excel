import { radarConfig } from './config.ts';
import { distanceKm } from './logic.ts';
import type {
  RadarTarget,
  RadarTargetKind,
  RawCompany,
  RawEstablishment,
} from './types.ts';

const effectifLabels: Record<string, string> = {
  '00': '0 salarié',
  '01': '1 à 2 salariés',
  '02': '3 à 5 salariés',
  '03': '6 à 9 salariés',
  '11': '10 à 19 salariés',
  '12': '20 à 49 salariés',
  '21': '50 à 99 salariés',
  '22': '100 à 199 salariés',
  '31': '200 à 249 salariés',
  NN: 'Effectif non communiqué',
};

const effectifMin: Record<string, number | null> = {
  '00': 0,
  '01': 1,
  '02': 3,
  '03': 6,
  '11': 10,
  '12': 20,
  '21': 50,
  '22': 100,
  '31': 200,
  NN: null,
};

const sectionLabels: Record<string, string> = {
  A: 'Agriculture',
  B: 'Industries extractives',
  C: 'Industrie manufacturière',
  D: 'Énergie',
  E: 'Eau et déchets',
  F: 'Construction',
  G: 'Commerce',
  H: 'Transports',
  I: 'Hébergement et restauration',
  J: 'Information et communication',
  K: 'Finance et assurance',
  L: 'Immobilier',
  M: 'Activités spécialisées',
  N: 'Services administratifs',
  O: 'Administration publique',
  P: 'Enseignement',
  Q: 'Santé et action sociale',
  R: 'Arts et loisirs',
  S: 'Autres services',
  T: 'Ménages employeurs',
  U: 'Organisations extraterritoriales',
};

const associationLegalCodes = new Set([
  '5195',
  '9210',
  '9220',
  '9221',
  '9222',
  '9223',
  '9224',
  '9230',
  '9240',
  '9260',
]);

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();

const isAssociation = (raw: RawCompany) =>
  associationLegalCodes.has(raw.nature_juridique || '');

const activeEstablishments = (raw: RawCompany) =>
  Number(raw.nombre_etablissements_ouverts ?? raw.nombre_etablissements ?? 0);

export function refonteTargetKind(raw: RawCompany): RadarTargetKind {
  return isAssociation(raw) ? 'Association' : 'Entreprise';
}

export function isRefonteTarget(raw: RawCompany) {
  const name = normalize(raw.nom_complet || raw.nom_raison_sociale || '');
  const workforce = raw.tranche_effectif_salarie || 'NN';
  const minimum = effectifMin[workforce];

  if (!raw.siren || raw.etat_administratif !== 'A' || raw.date_fermeture)
    return false;
  if (raw.section_activite_principale === 'O') return false;
  if (
    /\b(MAIRIE|COMMUNE|DEPARTEMENT|REGION|MINISTERE|PREFECTURE|ETAT)\b/.test(
      name,
    )
  )
    return false;
  if (['ETI', 'GE'].includes(raw.categorie_entreprise || '')) return false;
  if (typeof minimum === 'number' && minimum >= 250) return false;
  if (activeEstablishments(raw) > 100) return false;
  return true;
}

function closestActiveEstablishment(
  raw: RawCompany,
  center: { latitude: number; longitude: number },
) {
  const candidates = [...(raw.matching_etablissements || []), raw.siege].filter(
    (value): value is RawEstablishment =>
      !!value && value.etat_administratif !== 'F' && !value.date_fermeture,
  );
  return candidates
    .map((establishment) => ({
      establishment,
      latitude: Number(establishment.latitude),
      longitude: Number(establishment.longitude),
    }))
    .filter(
      (item) =>
        Number.isFinite(item.latitude) && Number.isFinite(item.longitude),
    )
    .map((item) => ({
      ...item,
      distance: distanceKm(
        center.latitude,
        center.longitude,
        item.latitude,
        item.longitude,
      ),
    }))
    .sort((a, b) => a.distance - b.distance)[0];
}

function activityLabel(raw: RawCompany) {
  const section = raw.section_activite_principale || '';
  const code = raw.activite_principale;
  const label = sectionLabels[section] || 'Activité';
  return code ? `${label} · ${code}` : label;
}

export function mapRefonteTarget(
  raw: RawCompany,
  center: { latitude: number; longitude: number } = radarConfig.center,
  radiusKm: number = radarConfig.defaults.radiusKm,
): RadarTarget | null {
  if (!isRefonteTarget(raw)) return null;
  const closest = closestActiveEstablishment(raw, center);
  if (!closest || closest.distance > radiusKm) return null;
  const workforce = raw.tranche_effectif_salarie || 'NN';
  const establishments = Number(
    raw.nombre_etablissements_ouverts ?? raw.nombre_etablissements ?? 1,
  );
  return {
    siren: raw.siren!,
    nom: raw.nom_complet || raw.nom_raison_sociale || 'Acteur sans nom',
    type: refonteTargetKind(raw),
    commune: closest.establishment.libelle_commune || 'Commune non communiquée',
    codePostal: closest.establishment.code_postal || '',
    distanceKm: Math.round(closest.distance * 10) / 10,
    activiteCode: raw.activite_principale || 'Non communiqué',
    activiteLibelle: activityLabel(raw),
    trancheEffectif: effectifLabels[workforce] || 'Effectif non communiqué',
    nombreEtablissements:
      Number.isFinite(establishments) && establishments > 0 ? establishments : 1,
    sourceUrl: `https://annuaire-entreprises.data.gouv.fr/entreprise/${raw.siren}`,
  };
}

export function rankRefonteTargets(
  rawCompanies: RawCompany[],
  options: {
    center?: typeof radarConfig.center;
    radiusKm?: number;
    limit?: number;
    excludedSirens?: readonly string[];
  } = {},
) {
  const center = options.center || radarConfig.center;
  const radiusKm = options.radiusKm || radarConfig.defaults.radiusKm;
  const limit = options.limit || radarConfig.defaults.limit;
  const seen = new Set(options.excludedSirens);
  const ranked = rawCompanies
    .filter((raw) => raw.siren && !seen.has(raw.siren))
    .map((raw) => {
      seen.add(raw.siren!);
      return mapRefonteTarget(raw, center, radiusKm);
    })
    .filter((target): target is RadarTarget => !!target)
    .sort(
      (a, b) =>
        a.distanceKm - b.distanceKm ||
        a.type.localeCompare(b.type) ||
        a.nom.localeCompare(b.nom) ||
        a.siren.localeCompare(b.siren),
    )
  const selected = ranked.slice(0, limit);

  for (const kind of ['Entreprise', 'Association'] as const) {
    if (selected.some((target) => target.type === kind)) continue;
    const replacement = ranked.find((target) => target.type === kind);
    if (replacement && selected.length) selected[selected.length - 1] = replacement;
  }

  return selected.sort(
    (a, b) =>
      a.distanceKm - b.distanceKm ||
      a.type.localeCompare(b.type) ||
      a.nom.localeCompare(b.nom) ||
      a.siren.localeCompare(b.siren),
  );
}
