import type { CookieOptionsWithName } from "@supabase/ssr";

/**
 * Session cookie flags for every server-side Supabase client (D-043).
 *
 * - `httpOnly`: only the server reads the session (the browser client in
 *   ./client.ts is unused), so scripts never see the refresh token. The
 *   @supabase/ssr default is readable, for browser clients.
 * - `secure` on Vercel (always HTTPS). Local runs, including the E2E suite's
 *   production build on http://127.0.0.1, keep working without it.
 */
export const SESSION_COOKIE_OPTIONS: CookieOptionsWithName = {
  httpOnly: true,
  secure: process.env.VERCEL === "1",
  sameSite: "lax",
  path: "/",
};
