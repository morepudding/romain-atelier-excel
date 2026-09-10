import { radarConfig, type ActivitySection } from './config.ts';
import type {
  PriorityLevel,
  RadarCompany,
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
  '32': '250 à 499 salariés',
  '41': '500 à 999 salariés',
  '42': '1 000 à 1 999 salariés',
  '51': '2 000 à 4 999 salariés',
  '52': '5 000 à 9 999 salariés',
  '53': '10 000 salariés ou plus',
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
  '32': 250,
  '41': 500,
  '42': 1000,
  '51': 2000,
  '52': 5000,
  '53': 10000,
  NN: null,
};

const sectionLabels: Record<ActivitySection, string> = {
  C: 'Industrie manufacturière',
  F: 'Construction',
  G: 'Commerce et réparation',
  H: 'Transports et entreposage',
  I: 'Hébergement et restauration',
  L: 'Activités immobilières',
  N: 'Services administratifs et de soutien',
};

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();

export function isExcluded(raw: RawCompany): boolean {
  const name = normalize(raw.nom_complet || raw.nom_raison_sociale || '');
  const legal = raw.nature_juridique || '';
  const workforce = raw.tranche_effectif_salarie || 'NN';
  const activeEstablishments = Number(
    raw.nombre_etablissements_ouverts ?? raw.nombre_etablissements ?? 0,
  );

  if (!raw.siren || raw.etat_administratif !== 'A' || raw.date_fermeture)
    return true;
  if (legal.startsWith('1')) return true;
  if (legal.startsWith('92') || legal.startsWith('93')) return true;
  if (raw.section_activite_principale === 'O') return true;
  if (/\b(MAIRIE|COMMUNE|DEPARTEMENT|REGION|MINISTERE|PREFECTURE)\b/.test(name))
    return true;
  if (workforce === '00') return true;
  if (['ETI', 'GE'].includes(raw.categorie_entreprise || '')) return true;
  const minimum = effectifMin[workforce];
  if (typeof minimum === 'number' && minimum >= 250) return true;
  if (activeEstablishments > radarConfig.exclusions.maxActiveEstablishments)
    return true;
  if (radarConfig.exclusions.sirens.includes(raw.siren as never)) return true;
  if (
    radarConfig.exclusions.activityCodes.includes(
      (raw.activite_principale || '') as never,
    )
  )
    return true;
  return radarConfig.exclusions.names.some((blocked) =>
    name.includes(normalize(blocked)),
  );
}

export function distanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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

function activityLabel(section: ActivitySection, code: string) {
  const precise: Record<string, string> = {
    '25.12Z': 'Fabrication de portes et fenêtres en métal',
    '46.73B': 'Commerce de gros de fournitures pour la construction',
    '46.74B': 'Commerce de gros de fournitures pour plomberie et chauffage',
    '47.59B': 'Commerce de détail d’équipements du foyer',
    '47.76Z': 'Commerce de détail de fleurs et végétaux',
    '49.41A': 'Transports routiers de fret interurbains',
    '49.41B': 'Transports routiers de fret de proximité',
    '52.29A': 'Messagerie et fret express',
    '41.20A': 'Construction de maisons individuelles',
    '10.72Z': 'Fabrication de biscuits et produits de conservation',
    '56.10C': 'Restauration rapide',
    '55.30Z': 'Terrains de camping',
    '68.31Z': 'Agences immobilières',
  };
  return precise[code] || sectionLabels[section] || `Activité ${code}`;
}

function workflowHypothesis(section: ActivitySection) {
  const values: Record<ActivitySection, string> = {
    C: 'Réclamations après livraison, produits non conformes ou demandes de remplacement.',
    F: 'Réserves de chantier, reprises après intervention ou demandes de garantie.',
    G: 'Retours produits, erreurs de commande ou demandes de service après-vente.',
    H: 'Retards, avaries de livraison ou écarts de prise en charge.',
    I: 'Réservations, qualité de prestation ou demandes après séjour.',
    L: 'Demandes locataires, incidents techniques ou suivi d’interventions.',
    N: 'Écarts de prestation, incidents opérationnels ou demandes de reprise.',
  };
  return values[section];
}

function priority(score: number): PriorityLevel {
  if (score >= 11) return 'Prioritaire';
  if (score >= 7) return 'Intéressante';
  return 'À vérifier';
}

function scoreCompany(
  raw: RawCompany,
  section: ActivitySection,
  distance: number,
) {
  let score = { C: 5, F: 5, G: 4, H: 5, I: 3, L: 2, N: 3 }[section];
  const workforce = raw.tranche_effectif_salarie || 'NN';
  const minimum = effectifMin[workforce];
  const establishments = Number(raw.nombre_etablissements_ouverts || 1);
  if (minimum !== null && minimum >= 10 && minimum < 250) score += 5;
  else if (minimum === null && establishments > 1) score += 2;
  else if (typeof minimum === 'number' && minimum >= 6) score += 1;
  if (establishments >= 2 && establishments <= 10) score += 3;
  else if (establishments <= 50) score += 2;
  else if (establishments <= 100) score += 1;
  const created = raw.date_creation
    ? new Date(raw.date_creation).getUTCFullYear()
    : 0;
  const age = created ? new Date().getUTCFullYear() - created : 0;
  if (age >= 8) score += 2;
  else if (age >= 3) score += 1;
  if (distance > 25) score -= 1;
  return score;
}

export function mapCompany(
  raw: RawCompany,
  center: {
    name: string;
    latitude: number;
    longitude: number;
  } = radarConfig.center,
  radiusKm: number = radarConfig.defaults.radiusKm,
): (RadarCompany & { _score: number }) | null {
  if (isExcluded(raw)) return null;
  const section = raw.section_activite_principale as ActivitySection;
  if (!radarConfig.defaults.activitySections.includes(section)) return null;
  const closest = closestActiveEstablishment(raw, center);
  if (!closest || closest.distance > radiusKm) return null;
  const code = raw.activite_principale || 'Non communiqué';
  const establishments = Number(raw.nombre_etablissements_ouverts || 1);
  const workforce = raw.tranche_effectif_salarie || 'NN';
  const score = scoreCompany(raw, section, closest.distance);
  const facts = [activityLabel(section, code)];
  if (workforce !== 'NN')
    facts.push(effectifLabels[workforce] || 'Effectif communiqué');
  else facts.push('effectif non communiqué');
  if (establishments > 1) facts.push(`${establishments} établissements actifs`);
  return {
    siren: raw.siren!,
    nom: raw.nom_complet || raw.nom_raison_sociale || 'Entreprise sans nom',
    commune: closest.establishment.libelle_commune || 'Commune non communiquée',
    codePostal: closest.establishment.code_postal || '',
    distanceKm: Math.round(closest.distance * 10) / 10,
    activiteCode: code,
    activiteLibelle: activityLabel(section, code),
    trancheEffectif: effectifLabels[workforce] || 'Effectif non communiqué',
    nombreEtablissements: establishments,
    niveauPriorite: priority(score),
    raisonSelection: `${facts.join(', ')} dans la zone.`,
    workflowProbable: workflowHypothesis(section),
    sourceUrl: `https://annuaire-entreprises.data.gouv.fr/entreprise/${raw.siren}`,
    _score: score,
  };
}

export function rankCompanies(
  rawCompanies: RawCompany[],
  options: {
    center?: typeof radarConfig.center;
    radiusKm?: number;
    limit?: number;
    activitySections?: readonly ActivitySection[];
    excludedSirens?: readonly string[];
  } = {},
) {
  const center = options.center || radarConfig.center;
  const radiusKm = options.radiusKm || radarConfig.defaults.radiusKm;
  const limit = options.limit || radarConfig.defaults.limit;
  const sections =
    options.activitySections || radarConfig.defaults.activitySections;
  const seen = new Set(options.excludedSirens);
  return rawCompanies
    .filter((raw) =>
      sections.includes(raw.section_activite_principale as ActivitySection),
    )
    .filter((raw) => {
      if (!raw.siren || seen.has(raw.siren)) return false;
      seen.add(raw.siren);
      return true;
    })
    .map((raw) => mapCompany(raw, center, radiusKm))
    .filter(
      (company): company is RadarCompany & { _score: number } => !!company,
    )
    .sort(
      (a, b) =>
        b._score - a._score ||
        a.distanceKm - b.distanceKm ||
        a.siren.localeCompare(b.siren),
    )
    .slice(0, limit)
    .map(({ _score, ...company }) => company);
}
