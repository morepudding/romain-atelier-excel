import { z } from 'zod';
import { reworkAccess } from '@/lib/radar/rework-access';
import { reworkDataSchema, type ReworkProject } from '@/lib/radar/rework';
import { buildJevDecisionRequest, parseJevAssessment } from '@/lib/radar/jev';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const respond = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store', Vary: 'Authorization' },
  });

const inputSchema = z.object({
  id: z.uuid(),
  revision: z.number().int().min(1),
});

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin)
    return respond({ error: 'Origine non autorisée.' }, 403);
  if (!request.headers.get('content-type')?.includes('application/json'))
    return respond({ error: 'Dossier invalide.' }, 415);
  if (Number(request.headers.get('content-length') || 0) > 1200)
    return respond({ error: 'Requête trop volumineuse.' }, 413);

  let input: z.infer<typeof inputSchema>;
  try {
    const raw = await request.text();
    if (raw.length > 1200)
      return respond({ error: 'Requête trop volumineuse.' }, 413);
    input = inputSchema.parse(JSON.parse(raw));
  } catch {
    return respond({ error: 'Dossier invalide.' }, 400);
  }

  const access = await reworkAccess(request);
  if (!access)
    return respond({ error: 'Reconnectez-vous pour continuer.' }, 401);
  const { client, owner } = access;
  const result = await client
    .from('radar_rework_projects')
    .select('*')
    .eq('id', input.id)
    .eq('user_id', owner)
    .maybeSingle();
  if (result.error)
    return respond({ error: 'Impossible de lire le dossier.' }, 503);
  if (!result.data) return respond({ error: 'Dossier introuvable.' }, 404);
  if (result.data.revision !== input.revision)
    return respond(
      { error: 'Ce dossier a changé. Rechargez-le puis réessayez.' },
      409,
    );

  let project: ReworkProject;
  try {
    project = {
      ...result.data,
      data: reworkDataSchema.parse(result.data.data),
    } as ReworkProject;
  } catch {
    return respond(
      { error: 'Le dossier contient des données invalides.' },
      422,
    );
  }
  if (project.data.decision !== 'review')
    return respond(
      { error: 'L’avis Jev est réservé aux dossiers à décider.' },
      409,
    );

  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey)
    return respond(
      { error: 'L’avis Jev n’est pas configuré sur le serveur.' },
      503,
    );

  try {
    const upstream = await fetch('https://openrouter.ai/api/alpha/decisions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildJevDecisionRequest(project.data)),
      signal: AbortSignal.timeout(12000),
    });
    if (!upstream.ok) {
      const status =
        upstream.status === 401 || upstream.status === 403
          ? 502
          : upstream.status === 402
            ? 402
            : upstream.status === 429
              ? 429
              : 502;
      const message =
        upstream.status === 401 || upstream.status === 403
          ? 'La clé OpenRouter est refusée.'
          : upstream.status === 402
            ? 'Le crédit OpenRouter est insuffisant.'
            : upstream.status === 429
              ? 'OpenRouter limite temporairement les évaluations.'
              : 'Jev est momentanément indisponible.';
      return respond({ error: message }, status);
    }
    const response = await upstream.json();
    const assessment = parseJevAssessment(response);
    if (!assessment)
      return respond({ error: 'La réponse de Jev n’a pas pu être lue.' }, 502);
    return respond({ assessment });
  } catch {
    return respond({ error: 'Jev n’a pas répondu à temps. Réessayez.' }, 502);
  }
}
