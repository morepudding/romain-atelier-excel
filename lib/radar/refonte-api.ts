import { radarConfig } from './config.ts';
import { fetchRadarPage } from './api.ts';
import { rankRefonteTargets } from './refonte-logic.ts';
import type { RadarRefonteResult, RawCompany } from './types.ts';

type FetchLike = typeof fetch;
type Sleep = (milliseconds: number) => Promise<void>;

const memoryCache = new Map<
  string,
  { expires: number; value: RadarRefonteResult }
>();
const sleep: Sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

export async function findRefonteTargets(
  input: {
    radiusKm?: number;
    limit?: number;
    excludedSirens?: string[];
  } = {},
  dependencies: {
    fetchImpl?: FetchLike;
    sleepImpl?: Sleep;
    now?: () => Date;
  } = {},
): Promise<RadarRefonteResult> {
  const radiusKm = input.radiusKm ?? radarConfig.defaults.radiusKm;
  const limit = input.limit ?? radarConfig.defaults.limit;
  const excludedSirens = [...new Set(input.excludedSirens || [])].sort();
  const ranking = { radiusKm, limit, excludedSirens };
  const key = JSON.stringify(ranking);
  if (!dependencies.fetchImpl) {
    const cached = memoryCache.get(key);
    if (cached && cached.expires > Date.now()) return cached.value;
  }

  const pages = [1, 5, 10, 15, 20, 25, 30, 35, 40];
  let lastPage = pages[pages.length - 1];
  const deadline = Date.now() + 45_000;
  const results: RawCompany[] = [];
  for (const [index, sampledPage] of pages.entries()) {
    const page = Math.min(sampledPage, lastPage);
    if (index > 0) await (dependencies.sleepImpl || sleep)(180);
    const url = new URL('/near_point', radarConfig.source.baseUrl);
    url.searchParams.set('lat', String(radarConfig.center.latitude));
    url.searchParams.set('long', String(radarConfig.center.longitude));
    url.searchParams.set('radius', String(radiusKm));
    url.searchParams.set('page', String(page));
    url.searchParams.set('per_page', '25');
    url.searchParams.set('minimal', 'true');
    url.searchParams.set('include', 'siege,matching_etablissements');
    const payload = await fetchRadarPage(url.toString(), {
      ...dependencies,
      deadline,
    });
    results.push(...payload.results!);
    if (payload.total_results !== undefined)
      lastPage = Math.max(1, Math.ceil(payload.total_results / 25));
    const ranked = rankRefonteTargets(results, ranking);
    const hasBothKinds =
      ranked.some((target) => target.type === 'Entreprise') &&
      ranked.some((target) => target.type === 'Association');
    if (ranked.length >= limit && hasBothKinds) break;
    if (
      !payload.results!.length ||
      (payload.total_results !== undefined &&
        page * 25 >= payload.total_results)
    )
      break;
  }

  const value: RadarRefonteResult = {
    search: {
      center: radarConfig.center.name,
      latitude: radarConfig.center.latitude,
      longitude: radarConfig.center.longitude,
      radiusKm,
      limit,
    },
    retrievedAt: (dependencies.now || (() => new Date()))().toISOString(),
    source: radarConfig.source.name,
    examinedCount: results.length,
    targets: rankRefonteTargets(results, ranking),
  };
  if (!dependencies.fetchImpl) {
    if (memoryCache.size >= 64)
      memoryCache.delete(memoryCache.keys().next().value!);
    memoryCache.set(key, {
      value,
      expires: Date.now() + radarConfig.source.cacheHours * 60 * 60 * 1000,
    });
  }
  return value;
}
