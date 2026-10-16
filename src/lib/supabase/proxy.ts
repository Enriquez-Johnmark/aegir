import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { publicEnv } from "@/lib/env";
import { SESSION_COOKIE_OPTIONS } from "@/lib/supabase/cookie-options";
import { DEFAULT_AUTHENTICATED_PATH } from "@/lib/safe-redirect";

const PUBLIC_PATHS = new Set(["/", "/login"]);

/**
 * Refreshes the Supabase auth session cookies on every matched request and
 * redirects optimistically (signed out → /login, signed in → away from /login).
 *
 * The redirects are a UX convenience, not authorization. Pages, Server Actions
 * and the database (RLS) each verify the user independently, so a bypassed or
 * misconfigured proxy cannot expose data.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookieOptions: SESSION_COOKIE_OPTIONS,
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
  const { data } = await supabase.auth.getClaims();
  const isSignedIn = Boolean(data?.claims);
  const { pathname, search } = request.nextUrl;

  if (!isSignedIn && !PUBLIC_PATHS.has(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(`${pathname}${search}`)}`;
    return redirectWithSessionCookies(url, supabaseResponse);
  }

  if (isSignedIn && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = DEFAULT_AUTHENTICATED_PATH;
    url.search = "";
    return redirectWithSessionCookies(url, supabaseResponse);
  }

  // Return supabaseResponse unchanged so refreshed cookies reach the browser.
  return supabaseResponse;
}

// A new response must carry any refreshed auth cookies, or the browser and
// server sessions drift apart.
function redirectWithSessionCookies(url: URL, supabaseResponse: NextResponse) {
  const response = NextResponse.redirect(url);
  supabaseResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
  return response;
}
