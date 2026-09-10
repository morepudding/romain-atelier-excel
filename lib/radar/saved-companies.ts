import { createClient } from '@supabase/supabase-js';

export class SavedCompaniesError extends Error {
  status: 401 | 503;

  constructor(message: string, status: 401 | 503 = 503) {
    super(message);
    this.name = 'SavedCompaniesError';
    this.status = status;
  }
}

// Lire le carnet à chaque recherche, y compris les ajouts depuis un autre onglet.
export async function savedCompanySirens(
  request: Request,
  fetchImpl: typeof fetch = fetch,
): Promise<string[]> {
  const authorization = request.headers.get('authorization');
  if (!authorization) return [];
  const unavailable =
    'Impossible de vérifier vos pistes enregistrées. Réessayez pour éviter les doublons.';
  const reconnect =
    'Votre session a expiré. Reconnectez-vous dans Mes pistes avant de relancer la recherche.';
  if (!/^Bearer [^\s]+$/.test(authorization))
    throw new SavedCompaniesError(reconnect, 401);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new SavedCompaniesError(unavailable);
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(8000)]);
  const client = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { Authorization: authorization },
      fetch: (input, init) => fetchImpl(input, { ...init, signal }),
    },
  });
  try {
    const { data, error } = await client.auth.getUser(authorization.slice(7));
    if (error || !data.user) {
      if (error?.status && error.status >= 400 && error.status < 500)
        throw new SavedCompaniesError(reconnect, 401);
      throw new SavedCompaniesError(unavailable);
    }
    const sirens = new Set<string>();
    const pageSize = 1000;
    for (let offset = 0; ; offset += pageSize) {
      // La clé publique et le jeton utilisateur conservent les protections RLS.
      const saved = await client
        .from('radar_leads')
        .select('siren')
        .eq('user_id', data.user.id)
        .order('siren')
        .range(offset, offset + pageSize - 1);
      if (saved.error || !saved.data)
        throw new SavedCompaniesError(unavailable);
      for (const row of saved.data) sirens.add(row.siren);
      if (saved.data.length < pageSize) return [...sirens];
    }
  } catch (error) {
    if (error instanceof SavedCompaniesError) throw error;
    throw new SavedCompaniesError(unavailable);
  }
}
