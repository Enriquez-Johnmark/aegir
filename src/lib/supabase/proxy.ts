import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { publicEnv } from "@/lib/env";

/**
 * Refreshes the Supabase auth session cookies on every matched request.
 *
 * This is session maintenance, not authorization. Pages, Server Actions and
 * the database (RLS) each verify the user independently, so a bypassed or
 * misconfigured proxy cannot expose data.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not add code between createServerClient and getClaims(): getClaims()
  // validates the JWT and refreshes it when close to expiry. Skipping it
  // causes users to be signed out at random.
  await supabase.auth.getClaims();

  // Return supabaseResponse unchanged so refreshed cookies reach the browser.
  return supabaseResponse;
}
