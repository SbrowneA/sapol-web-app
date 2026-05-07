import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | undefined;

/**
 * Returns a singleton `@supabase/supabase-js` client using `VITE_SUPABASE_URL` and
 * `VITE_SUPABASE_PUBLISHABLE_KEY` from the Vite environment.
 *
 * @returns Shared Supabase client for PostgREST / RPC calls.
 * @throws {Error} When required env vars are missing or blank.
 */
export function getSupabaseClient(): SupabaseClient {
  if (!client) {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!url?.trim() || !publishableKey?.trim()) {
      throw new Error(
        'Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. Configure them in .env.local (see README).'
      );
    }
    client = createClient(url, publishableKey);
  }
  return client;
}
