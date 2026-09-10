import { findLocalCompanies, RadarApiError } from '@/lib/radar/api';
import { radarSearchInput } from '@/lib/radar/search-input';
import {
  savedCompanySirens,
  SavedCompaniesError,
} from '@/lib/radar/saved-companies';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const parsed = radarSearchInput.safeParse({
    ...(params.has('radiusKm') ? { radiusKm: params.get('radiusKm') } : {}),
    ...(params.has('sections')
      ? { activitySections: params.get('sections')!.split(',') }
      : {}),
  });
  if (!parsed.success)
    return Response.json(
      {
        error:
          'Choisissez un rayon de 5 à 50 km et au moins un secteur valide.',
      },
      { status: 400 },
    );
  try {
    const excludedSirens = await savedCompanySirens(request);
    const result = await findLocalCompanies({
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
