import { findLocalCompanies, RadarApiError } from '@/lib/radar/api';
import { radarSearchInput } from '@/lib/radar/search-input';

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
    const result = await findLocalCompanies({ ...parsed.data, limit: 5 });
    return Response.json(result, {
      headers: { 'Cache-Control': 'public, s-maxage=300' },
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof RadarApiError
            ? error.message
            : 'La recherche est indisponible. Réessayez plus tard.',
      },
      { status: 503 },
    );
  }
}
