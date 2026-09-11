import { findRefonteTargets } from '@/lib/radar/refonte-api';
import { refonteSearchInput } from '@/lib/radar/refonte-search-input';
import {
  savedCompanySirens,
  SavedCompaniesError,
} from '@/lib/radar/saved-companies';
import { RadarApiError } from '@/lib/radar/api';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const parsed = refonteSearchInput.safeParse({
    radiusKm: params.has('radiusKm') ? params.get('radiusKm') : undefined,
  });
  if (!parsed.success)
    return Response.json(
      { error: 'Choisissez un rayon de 5 à 50 km.' },
      { status: 400 },
    );
  try {
    const excludedSirens = await savedCompanySirens(request);
    const result = await findRefonteTargets({
      ...parsed.data,
      limit: 5,
      excludedSirens,
    });
    return Response.json(result, {
      headers: { 'Cache-Control': 'private, no-store', Vary: 'Authorization' },
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof RadarApiError || error instanceof SavedCompaniesError
            ? error.message
            : 'La recherche est indisponible. Réessayez plus tard.',
      },
      {
        status: error instanceof SavedCompaniesError ? error.status : 503,
        headers: { 'Cache-Control': 'private, no-store' },
      },
    );
  }
}
