import { createClient } from '@supabase/supabase-js';
import { researchMember } from './research-access.ts';
export async function reworkAccess(request: Request) {
  const owner = await researchMember(request);
  if (!owner) return null;
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: { Authorization: request.headers.get('authorization')! },
        fetch: (input, init) =>
          fetch(input, { ...init, signal: AbortSignal.timeout(15000) }),
      },
    },
  );
  return { owner, client };
}
