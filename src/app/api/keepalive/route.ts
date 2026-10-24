import { connection } from "next/server";

import { pingDatabase } from "@/lib/supabase/keepalive";

// Called once a day by Vercel Cron (vercel.json) so the hosted database isn't paused
// for inactivity (D-052). Public on purpose: it reads nothing and says only whether
// the database answered, and a shared secret would break AGENTS.md rule 4.
export async function GET() {
  await connection(); // at request time, never prerendered at build
  const ok = await pingDatabase();
  return Response.json({ ok }, { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
