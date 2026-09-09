import { radarConfig, type ActivitySection } from './config.ts';
import { rankCompanies } from './logic.ts';
import type { RadarResult, RawApiResponse, RawCompany } from './types.ts';

type FetchLike = typeof fetch;
type Sleep = (milliseconds: number) => Promise<void>;

const memoryCache = new Map<string, { expires: number; value: RadarResult }>();
const sleep: Sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

export class RadarApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RadarApiError';
  }
}

function retryDelay(response: Response) {
  const value = response.headers.get('retry-after');
  if (!value) return 1000;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : 1000;
}

export async function fetchRadarPage(
  url: string,
  dependencies: { fetchImpl?: FetchLike; sleepImpl?: Sleep } = {},
) {
  const fetchImpl = dependencies.fetchImpl || fetch;
  const sleepImpl = dependencies.sleepImpl || sleep;
  for (
    let attempt = 0;
    attempt <= radarConfig.source.maxRetries;
    attempt += 1
  ) {
    let response: Response;
    try {
      response = await fetchImpl(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': radarConfig.source.userAgent,
        },
        signal: AbortSignal.timeout(radarConfig.source.timeoutMs),
      });
    } catch (error) {
      if (attempt < radarConfig.source.maxRetries) {
        await sleepImpl(500 * (attempt + 1));
        continue;
      }
      throw new RadarApiError(
        error instanceof Error && error.name === 'TimeoutError'
          ? 'La source publique n’a pas répondu dans le délai prévu.'
          : 'La source publique est momentanément inaccessible.',
      );
    }
    if (response.status === 429) {
      if (attempt === radarConfig.source.maxRetries)
        throw new RadarApiError(
          'La source publique limite temporairement les requêtes. Réessayez dans quelques instants.',
        );
      await sleepImpl(retryDelay(response));
      continue;
    }
    if (!response.ok)
      throw new RadarApiError(
        `La source publique a répondu avec l’erreur ${response.status}.`,
      );
    let payload: RawApiResponse;
    try {
      payload = (await response.json()) as RawApiResponse;
    } catch {
      throw new RadarApiError(
        'La source publique a renvoyé une réponse invalide.',
      );
    }
    if (!Array.isArray(payload.results))
      throw new RadarApiError(
        'La source publique a renvoyé une réponse invalide.',
      );
    return payload;
  }
  throw new RadarApiError('La source publique est momentanément inaccessible.');
}

export async function findLocalCompanies(
  input: {
    radiusKm?: number;
    limit?: number;
    targetWorkflow?: 'reclamations_client';
    activitySections?: ActivitySection[];
  } = {},
  dependencies: {
    fetchImpl?: FetchLike;
    sleepImpl?: Sleep;
    now?: () => Date;
  } = {},
): Promise<RadarResult> {
  const radiusKm = input.radiusKm ?? radarConfig.defaults.radiusKm;
  const limit = input.limit ?? radarConfig.defaults.limit;
  const activitySections = input.activitySections?.length
    ? input.activitySections
    : [...radarConfig.defaults.activitySections];
  const key = JSON.stringify({ radiusKm, limit, activitySections });
  if (!dependencies.fetchImpl) {
    const cached = memoryCache.get(key);
    if (cached && cached.expires > Date.now()) return cached.value;
  }

  const pages = [25, 20, 30, 15];
  const results: RawCompany[] = [];
  for (const [index, page] of pages.entries()) {
    if (index > 0) await (dependencies.sleepImpl || sleep)(180);
    const url = new URL('/near_point', radarConfig.source.baseUrl);
    url.searchParams.set('lat', String(radarConfig.center.latitude));
    url.searchParams.set('long', String(radarConfig.center.longitude));
    url.searchParams.set('radius', String(radiusKm));
    url.searchParams.set(
      'section_activite_principale',
      activitySections.join(','),
    );
    url.searchParams.set('page', String(page));
    url.searchParams.set('per_page', '25');
    url.searchParams.set('minimal', 'true');
    url.searchParams.set('include', 'siege,matching_etablissements');
    const payload = await fetchRadarPage(url.toString(), dependencies);
    results.push(...payload.results!);
    if (
      rankCompanies(results, { radiusKm, limit, activitySections }).length >=
      limit
    )
      break;
  }

  const value: RadarResult = {
    search: {
      center: radarConfig.center.name,
      latitude: radarConfig.center.latitude,
      longitude: radarConfig.center.longitude,
      radiusKm,
      limit,
      targetWorkflow: 'reclamations_client',
      activitySections,
    },
    retrievedAt: (dependencies.now || (() => new Date()))().toISOString(),
    source: radarConfig.source.name,
    examinedCount: results.length,
    companies: rankCompanies(results, {
      radiusKm,
      limit,
      activitySections,
    }),
  };
  if (!dependencies.fetchImpl)
    memoryCache.set(key, {
      value,
      expires: Date.now() + radarConfig.source.cacheHours * 60 * 60 * 1000,
    });
  return value;
}
