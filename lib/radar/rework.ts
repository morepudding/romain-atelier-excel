import { z } from 'zod';
import type { RadarTarget } from './types.ts';

export const decisions = {
  review: 'À revoir',
  retained: 'Retenu',
  discarded: 'Écarté',
} as const;
export const siteStates = {
  unknown: 'À vérifier',
  existing: 'Site consulté',
  not_found: 'Site propre non trouvé',
  unavailable: 'Site inaccessible',
} as const;
export const projectTypes = {
  unknown: 'À déterminer',
  refonte: 'Refonte',
  creation: 'Création à confirmer',
} as const;
export const sectors = {
  other: 'Autre activité',
  food: 'Alimentation',
  beauty: 'Beauté et coiffure',
  hotel: 'Hôtellerie',
  craft: 'Artisanat',
  retail: 'Boutique',
  association: 'Association',
} as const;
const text = z.string().max(12000);
const url = z
  .string()
  .max(1500)
  .refine(
    (value) => !value || safeUrl(value) !== null,
    'Utilisez une adresse http ou https sans identifiants.',
  );
export const reworkDataSchema = z.object({
  name: z.string().trim().min(1).max(250),
  locality: z.string().max(250).default(''),
  siren: z
    .string()
    .regex(/^$|^\d{9}$/)
    .default(''),
  website: url.default(''),
  sector: z
    .enum([
      'other',
      'food',
      'beauty',
      'hotel',
      'craft',
      'retail',
      'association',
    ])
    .default('other'),
  decision: z.enum(['review', 'retained', 'discarded']).default('review'),
  site_state: z
    .enum(['unknown', 'existing', 'not_found', 'unavailable'])
    .default('unknown'),
  project_type: z.enum(['unknown', 'refonte', 'creation']).default('unknown'),
  source_url: url.default(''),
  observed_at: z
    .string()
    .regex(/^$|^\d{4}-\d{2}-\d{2}$/)
    .default(''),
  observations: text.default(''),
  initial_assessment: text.default(''),
  user_reason: text.default(''),
  angle: text.default(''),
  brief: text.default(''),
  direction_a: text.default(''),
  direction_b: text.default(''),
  selected_direction: z.enum(['', 'a', 'b']).default(''),
  automation: z
    .object({
      status: z.enum(['queued', 'working', 'ready', 'error']).default('queued'),
      step: z.enum(['brief', 'a', 'b']).default('brief'),
      lease: z.string().default(''),
      lease_until: z.number().default(0),
      attempts: z.number().int().min(0).max(12).default(0),
      error: z.string().max(500).default(''),
      instruction: z.string().max(2000).default(''),
      context: z.string().max(14000).default(''),
      model: z.string().max(100).default(''),
      prepared_at: z.string().default(''),
    })
    .optional(),
  images: z
    .object({
      before: z.string().max(500).default(''),
      a: z.string().max(500).default(''),
      b: z.string().max(500).default(''),
    })
    .default({ before: '', a: '', b: '' }),
});
export type ReworkData = z.infer<typeof reworkDataSchema>;
export type ReworkProject = {
  id: string;
  user_id: string;
  identity_key: string;
  data: ReworkData;
  revision: number;
  created_at: string;
  updated_at: string;
};
export type ReworkVersion = {
  id: string;
  project_id: string;
  revision: number;
  data: ReworkData;
  created_at: string;
};

export function safeUrl(value: string): string | null {
  try {
    const u = new URL(value);
    return /^https?:$/.test(u.protocol) && !u.username && !u.password
      ? u.href
      : null;
  } catch {
    return null;
  }
}
export function normalizedName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}
function websiteKey(value: string) {
  const clean = safeUrl(value);
  if (!clean) return '';
  const u = new URL(clean);
  const host = u.hostname.replace(/^www\./, '');
  return /(^|\.)(facebook|instagram)\.com$/.test(host)
    ? host + u.pathname.replace(/\/$/, '').toLowerCase()
    : host;
}
export function identityKey(data: ReworkData) {
  return data.siren
    ? `siren:${data.siren}`
    : websiteKey(data.website)
      ? `web:${websiteKey(data.website)}`
      : `name:${normalizedName(data.name)}:${normalizedName(data.locality)}`;
}
export function sameCompany(a: ReworkData, b: ReworkData) {
  return (
    (!!a.siren && a.siren === b.siren) ||
    (!!websiteKey(a.website) &&
      websiteKey(a.website) === websiteKey(b.website)) ||
    (normalizedName(a.name) === normalizedName(b.name) &&
      normalizedName(a.locality) === normalizedName(b.locality))
  );
}
export function fromTarget(target: RadarTarget, date: string): ReworkData {
  return reworkDataSchema.parse({
    name: target.nom,
    locality: target.commune,
    siren: target.siren,
    source_url: target.sourceUrl,
    observed_at: date.slice(0, 10),
    sector: target.type === 'Association' ? 'association' : 'other',
    observations: `Activité déclarée : ${target.activiteLibelle}.`,
  });
}
export function parseReworkImport(input: string): ReworkData[] {
  const parsed = z
    .object({
      version: z.literal(1),
      projects: z
        .array(z.object({ data: reworkDataSchema }))
        .min(1)
        .max(500),
    })
    .parse(JSON.parse(input));
  const unique: ReworkData[] = [];
  for (const { data } of parsed.projects)
    if (!unique.some((existing) => sameCompany(existing, data)))
      unique.push(data);
  return unique;
}

// Drafts assembled from the recorded evidence and an editable sector-specific
// art direction. This is preparation text, not an image/model generation call.
const approaches: Record<
  ReworkData['sector'],
  [string, string, string, string]
> = {
  food: [
    'L’étal et le geste',
    'Photographie documentaire de l’étal, détails de matière et gestes du métier. Titres courts, papier crème, rouge terre, composition de journal de marché.',
    'À table',
    'Une grande scène de repas comme entrée, rythme de carnet de recettes, photographies en pleine largeur puis formats serrés. Vert profond, blanc chaud et typographie de menu.',
  ],
  beauty: [
    'Le rituel',
    'Composition calme autour d’un geste de soin et de son déroulé. Titres élégants, contraste encre et ivoire, tarifs lisibles dans des lignes ouvertes.',
    'Le caractère du lieu',
    'Portrait du salon et de son équipe, cadrages francs, typographie affirmée. Mise en page de magazine local, couleur prélevée dans le lieu, accès direct aux prestations.',
  ],
  hotel: [
    'Une adresse à découvrir',
    'Photographie d’architecture à hauteur de visiteur, récit du lieu puis chambres. Typographie éditoriale, crème et bleu profond, réservation visible sans recouvrir les images.',
    'Le carnet de séjour',
    'Séquence chambre, petit déjeuner, quartier ; alternance d’images et de petites annotations pratiques. Mise en page chaleureuse, palette tirée des matériaux de l’hôtel.',
  ],
  craft: [
    'Le trait juste',
    'Dessin technique original ou détail de fabrication, grille précise et marges généreuses. Blanc papier, graphite et une couleur d’atelier. Montrer le raisonnement derrière une réalisation.',
    'Matière vivante',
    'Étude de matière en grand format, typographie dense et contrastes d’échelle. Montrer les assemblages, les finitions et le résultat dans son contexte.',
  ],
  retail: [
    'La pièce et son histoire',
    'Un objet central photographié avec soin, légendes courtes, détails de fabrication. Mise en page de catalogue, encre sombre et papier chaud, tailles d’images variées.',
    'La boutique de proximité',
    'Le lieu, les personnes et une sélection resserrée. Composition vivante de journal de quartier, couleurs tirées de la boutique, informations pratiques très lisibles.',
  ],
  association: [
    'Les personnes d’abord',
    'Portrait collectif ou scène d’activité réelle, titres directs, rubriques ouvertes, contraste franc. Donner envie de participer avec un rendez-vous concret.',
    'Le journal des actions',
    'Une action récente racontée en images, calendrier lisible, récits courts et chiffres uniquement sourcés. Composition de bulletin local avec un accent coloré.',
  ],
  other: [
    'Le travail en situation',
    'Une scène réelle représentative du métier comme ouverture. Rythme éditorial, détails concrets et titres courts ; palette tirée du lieu, des objets et des images disponibles.',
    'Le lieu et les personnes',
    'Un portrait du lieu et de ceux qui y travaillent. Composition plus typographique, échelles contrastées, légendes précises et parcours de contact très court.',
  ],
};
export function prepareRework(
  data: ReworkData,
): Pick<ReworkData, 'brief' | 'direction_a' | 'direction_b'> {
  if (data.decision !== 'retained')
    throw new Error(
      'Retenez cette entreprise avant de préparer ses propositions.',
    );
  const [a, ad, b, bd] = approaches[data.sector];
  const context = `${data.name}${data.locality ? ` — ${data.locality}` : ''}`;
  const brief = `${context}\n\nOBJECTIF À CONFIRMER\n${data.angle || 'Définir avec le responsable l’action prioritaire du visiteur et ce qui mérite d’être montré.'}\n\nOBSERVATIONS CONSIGNÉES\n${data.observations || 'Aucune observation visuelle enregistrée.'}\n${data.website ? `Page de référence : ${data.website}` : 'Adresse du site à rechercher.'}\nÉtat observé : ${siteStates[data.site_state]}.\n\nDÉCISION\nRetenu${data.user_reason ? ` — ${data.user_reason}` : ''}.\n\nCONTENUS À RÉUNIR\nPhotos du lieu, réalisations ou produits, identité visuelle, prestations exactes, coordonnées et action de contact souhaitée.\n\nÀ CONFIRMER\nL’offre, les visiteurs prioritaires, les informations manquantes et les éléments à conserver du site actuel. ${data.site_state === 'not_found' ? 'Vérifier l’existence d’un site propre avant de conclure à une création.' : data.site_state === 'unavailable' ? 'Reconsulter le site : son indisponibilité ne permet pas de juger son design.' : ''}`;
  const direction = (title: string, treatment: string) =>
    `${title}\n\nCréer une proposition visuelle de page d’accueil pour ${context}.\n\nANGLE À EXPLORER\n${data.angle || 'Préciser le point de vue à partir des contenus réels du métier.'}\n\nDIRECTION ARTISTIQUE\n${treatment}\n\nCOMPOSITION\nUne ouverture avec un sujet précis, un titre utile et une action principale ; une preuve concrète ; l’offre hiérarchisée ; les informations pratiques. Adapter l’ordre aux priorités du brief. Prévoir une lecture sur téléphone.\n\nPOINTS À TRAITER\n${data.observations || 'Consulter la page et choisir les éléments utiles à conserver.'}\n\nIMAGES ET TEXTE\nUtiliser les références jointes pour le cadrage, la matière et le rythme. Toute illustration conceptuelle doit rester distincte d’une réalisation ou d’un produit attesté. Aucun avis, label, tarif ou résultat inventé. Éviter les photos de banque interchangeables, les dégradés décoratifs et les grilles de cartes répétitives.\n\nLIVRABLE\nUne maquette visuelle précise de la page, avec textes français lisibles. Ce document décrit une proposition à explorer, pas un site déjà construit.`;
  return {
    brief,
    direction_a: direction(a, ad),
    direction_b: direction(b, bd),
  };
}
