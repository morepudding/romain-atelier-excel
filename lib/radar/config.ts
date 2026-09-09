export const radarConfig = {
  center: {
    name: 'Vairé, Vendée',
    latitude: 46.6025,
    longitude: -1.7547,
  },
  defaults: {
    radiusKm: 35,
    limit: 5,
    activitySections: ['C', 'F', 'G', 'H', 'I', 'L', 'N'],
  },
  exclusions: {
    names: ['BENÉTEAU', 'BENETEAU', 'GROUPE BENETEAU', 'SPBI', 'JEANNEAU'],
    sirens: [],
    activityCodes: ['30.12Z'],
    maxActiveEstablishments: 100,
  },
  source: {
    name: 'API Recherche d’entreprises — data.gouv.fr',
    baseUrl: 'https://recherche-entreprises.api.gouv.fr',
    cacheHours: 6,
    timeoutMs: 20_000,
    maxRetries: 2,
    userAgent:
      'Radar-local/1.0 (application ChatGPT personnelle; données publiques françaises)',
  },
} as const;

export type ActivitySection =
  (typeof radarConfig.defaults.activitySections)[number];
