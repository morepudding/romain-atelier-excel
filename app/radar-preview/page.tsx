import fixture from '@/fixtures/radar-api.json';
import { radarConfig } from '@/lib/radar/config';
import { rankCompanies } from '@/lib/radar/logic';
import type { RadarResult, RawApiResponse } from '@/lib/radar/types';
import { buildRadarUiHtml } from '@/lib/radar/ui';

export default async function RadarPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const requested = (await searchParams).state;
  const state = ['results', 'loading', 'empty', 'error'].includes(
    requested || '',
  )
    ? (requested as 'results' | 'loading' | 'empty' | 'error')
    : 'results';
  const raw = fixture as RawApiResponse;
  const result: RadarResult = {
    search: {
      center: radarConfig.center.name,
      latitude: radarConfig.center.latitude,
      longitude: radarConfig.center.longitude,
      radiusKm: 35,
      limit: 5,
      targetWorkflow: 'reclamations_client',
      activitySections: [...radarConfig.defaults.activitySections],
    },
    retrievedAt: '2026-09-09T12:00:00.000Z',
    source: `${radarConfig.source.name} — fixture locale`,
    examinedCount: raw.results?.length || 0,
    companies: rankCompanies(raw.results || [], { limit: 5 }),
  };
  return (
    <main style={{ minHeight: '100vh', background: '#172724', padding: 24 }}>
      <nav
        aria-label="États de prévisualisation"
        style={{
          display: 'flex',
          gap: 8,
          width: 'min(100%, 790px)',
          margin: '0 auto 12px',
          flexWrap: 'wrap',
        }}
      >
        {['results', 'loading', 'empty', 'error'].map((value) => (
          <a
            key={value}
            href={`/radar-preview?state=${value}`}
            style={{
              color: value === state ? '#172724' : '#f4f1e9',
              background: value === state ? '#ff7047' : '#263936',
              padding: '6px 10px',
              borderRadius: 7,
              textDecoration: 'none',
              fontSize: 13,
            }}
          >
            {value === 'results'
              ? 'Résultats'
              : value === 'loading'
                ? 'Chargement'
                : value === 'empty'
                  ? 'Aucun résultat'
                  : 'Erreur'}
          </a>
        ))}
      </nav>
      <iframe
        title="Prévisualisation Radar local — données de test"
        srcDoc={buildRadarUiHtml(result, state)}
        style={{
          display: 'block',
          width: 'min(100%, 790px)',
          minHeight: 860,
          margin: '0 auto',
          border: 0,
          borderRadius: 14,
          background: '#fff',
        }}
      />
    </main>
  );
}
