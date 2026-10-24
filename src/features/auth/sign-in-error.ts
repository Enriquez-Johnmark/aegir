import { isAuthRetryableFetchError, type AuthError } from "@supabase/supabase-js";

export const SIGN_IN_MESSAGES = {
  invalid: "Invalid email or password.",
  rateLimited: "Too many sign-in attempts. Wait a minute and try again.",
  unavailable: "Sign-in isn't available right now. Try again in a few minutes.",
} as const;

/**
 * What a failed sign-in tells the visitor (D-052).
 *
 * - Wrong password and unknown email share one message, so accounts can't be
 *   enumerated.
 * - Auth that can't be reached, or answers with a server error, says so instead.
 *   supabase-js reports both as AuthRetryableFetchError (status 0 for a failed
 *   connection, 5xx otherwise). Before D-052 a paused database read as a wrong
 *   password.
 */
export function signInErrorMessage(error: AuthError): string {
  if (error.code === "over_request_rate_limit") return SIGN_IN_MESSAGES.rateLimited;
  if (isAuthRetryableFetchError(error) || (error.status ?? 0) >= 500) return SIGN_IN_MESSAGES.unavailable;
  return SIGN_IN_MESSAGES.invalid;
}
