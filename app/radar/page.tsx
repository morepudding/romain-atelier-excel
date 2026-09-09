import { requireChatGPTUser } from '@/app/chatgpt-auth';
import { findLocalCompanies } from '@/lib/radar/api';
import { buildRadarUiHtml } from '@/lib/radar/ui';

export const dynamic = 'force-dynamic';

export default async function RadarPage() {
  await requireChatGPTUser('/radar');
  let result: Awaited<ReturnType<typeof findLocalCompanies>> | null = null;
  try {
    result = await findLocalCompanies();
  } catch {
    result = null;
  }
  return (
    <main style={{ minHeight: '100vh', background: '#172724', padding: 24 }}>
      <iframe
        title={result ? 'Radar local' : 'Radar local — erreur'}
        srcDoc={
          result
            ? buildRadarUiHtml(result, 'live')
            : buildRadarUiHtml(null, 'error')
        }
        style={{
          display: 'block',
          width: 'min(100%, 790px)',
          minHeight: result ? 860 : 320,
          margin: '0 auto',
          border: 0,
          borderRadius: 14,
          background: '#fff',
        }}
      />
    </main>
  );
}
