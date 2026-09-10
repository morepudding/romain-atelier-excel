import { createClient } from '@supabase/supabase-js';

// La recherche via le fournisseur est réservée aux membres autorisés du radar.
export async function researchMember(request: Request): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const authorization = request.headers.get('authorization') || '';
  if (!url || !key || !/^Bearer [^\s]+$/.test(authorization)) return null;
  const client = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { Authorization: authorization },
      fetch: (input, init) =>
        fetch(input, { ...init, signal: AbortSignal.timeout(5000) }),
    },
  });
  const { data, error } = await client.auth.getUser(authorization.slice(7));
  if (error || !data.user) return null;
  const membership = await client
    .from('radar_members')
    .select('user_id')
    .eq('user_id', data.user.id)
    .maybeSingle();
  return membership.error || !membership.data ? null : data.user.id;
}
