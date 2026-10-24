import "server-only";

import { createClient } from "@/lib/supabase/server";

/** A Postgres SQLSTATE: five digits or capital letters. PostgREST's own codes start with "PGRST". */
const SQLSTATE = /^[0-9A-Z]{5}$/;

/**
 * Whether a PostgREST answer came from Postgres itself. No error, or an error with a
 * SQLSTATE (the anonymous read below gets 42501, permission denied), means the
 * database ran the request. A failed connection has an empty code (D-052).
 */
export function reachedDatabase(error: { code?: string } | null): boolean {
  return error === null || SQLSTATE.test(error.code ?? "");
}

/**
 * One cheap request that reaches Postgres, so the free-tier project counts as active
 * and isn't paused after 7 idle days (D-052). It runs as the anonymous role: no
 * session, no secret, and RLS and the grants refuse it, so it reads no data.
 */
export async function pingDatabase(): Promise<boolean> {
  const supabase = await createClient();
  // A GET, not a HEAD: a refused HEAD has no body, so its SQLSTATE would be lost.
  const { error } = await supabase.from("vessels").select("id").limit(1);
  return reachedDatabase(error);
}
