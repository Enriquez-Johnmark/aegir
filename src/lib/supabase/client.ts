import { createBrowserClient } from "@supabase/ssr";

import { publicEnv } from "@/lib/env";

/**
 * Supabase client for Client Components. Uses the publishable key only and is
 * always subject to RLS. Prefer server-side data access through the feature
 * `server/` modules; use this only for genuinely client-side needs.
 */
export function createClient() {
  return createBrowserClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
