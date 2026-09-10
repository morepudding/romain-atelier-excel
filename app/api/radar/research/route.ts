import { researchCompany } from '@/lib/radar/research';
import { researchInput } from '@/lib/radar/research-input';
import { automaticSearchAvailable } from '@/lib/radar/web-search';
import { researchMember } from '@/lib/radar/research-access';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

let active = 0;
const requests = new Map<string, { count: number; expires: number }>();

export function GET() {
  return Response.json(
    { automaticSearchAvailable: automaticSearchAvailable() },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function POST(request: Request) {
  if (!request.headers.get('content-type')?.includes('application/json')) {
    return Response.json(
      { error: 'Une fiche entreprise est nécessaire.' },
      { status: 415 },
    );
  }
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) {
    return Response.json(
      { error: 'Cette recherche doit être lancée depuis le radar.' },
      { status: 403 },
    );
  }
  let parsed;
  try {
    const reader = request.body?.getReader();
    if (!reader) throw new Error('empty');
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > 24_000) {
        await reader.cancel();
        throw new Error('size');
      }
      chunks.push(value);
    }
    parsed = researchInput.safeParse(
      JSON.parse(Buffer.concat(chunks).toString('utf8')),
    );
  } catch {
    return Response.json(
      { error: 'La fiche envoyée est invalide ou trop volumineuse.' },
      { status: 400 },
    );
  }
  if (!parsed.success) {
    return Response.json(
      { error: 'Vérifiez la fiche entreprise et l’adresse de son site.' },
      { status: 400 },
    );
  }
  let identity =
    request.headers.get('x-vercel-forwarded-for')?.slice(0, 100) || 'local';
  if (!parsed.data.website) {
    if (!automaticSearchAvailable())
      return Response.json(
        {
          error:
            'La recherche automatique des sites reste à activer. Vous pouvez indiquer un site à consulter.',
        },
        { status: 503 },
      );
    try {
      const member = await researchMember(request);
      if (!member)
        return Response.json(
          {
            error:
              'Connectez-vous à votre compte radar pour rechercher automatiquement les sites.',
          },
          { status: 401 },
        );
      identity = member;
    } catch {
      return Response.json(
        { error: 'Impossible de vérifier votre accès. Réessayez.' },
        { status: 503 },
      );
    }
  }
  // Protection par instance ; les plafonds globaux se règlent chez le fournisseur.
  const previous = requests.get(identity);
  const usage =
    previous && previous.expires > Date.now()
      ? previous
      : { count: 0, expires: Date.now() + 60 * 60_000 };
  if (active >= 4 || usage.count >= 50) {
    return Response.json(
      {
        error:
          'Plusieurs recherches sont en cours. Réessayez un peu plus tard.',
      },
      { status: 429, headers: { 'Retry-After': '60' } },
    );
  }
  if (requests.size >= 128) requests.delete(requests.keys().next().value!);
  requests.set(identity, { ...usage, count: usage.count + 1 });
  active += 1;
  try {
    const result = await researchCompany(
      parsed.data.company,
      parsed.data.website,
    );
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json(
      {
        error:
          'La consultation des pages publiques a échoué. Vous pouvez réessayer.',
      },
      { status: 503 },
    );
  } finally {
    active -= 1;
  }
}
