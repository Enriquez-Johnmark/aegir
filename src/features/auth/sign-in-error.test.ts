import { AuthApiError, AuthRetryableFetchError, AuthUnknownError } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { SIGN_IN_MESSAGES, signInErrorMessage } from "./sign-in-error";

describe("signInErrorMessage", () => {
  it("gives a wrong password and an unknown account the same message", () => {
    expect(signInErrorMessage(new AuthApiError("Invalid login credentials", 400, "invalid_credentials"))).toBe(
      SIGN_IN_MESSAGES.invalid,
    );
  });

  it("asks the visitor to wait when Auth rate-limits them", () => {
    expect(signInErrorMessage(new AuthApiError("Too many requests", 429, "over_request_rate_limit"))).toBe(
      SIGN_IN_MESSAGES.rateLimited,
    );
  });

  it.each([
    ["no connection (a paused or unreachable project)", new AuthRetryableFetchError("fetch failed", 0)],
    ["a gateway error", new AuthRetryableFetchError("Bad Gateway", 502)],
    ["a server error with a JSON body", new AuthApiError("Database error", 500, "unexpected_failure")],
  ])("says sign-in is unavailable for %s", (_case, error) => {
    expect(signInErrorMessage(error)).toBe(SIGN_IN_MESSAGES.unavailable);
  });

  it("falls back to the credentials message for anything else", () => {
    expect(signInErrorMessage(new AuthUnknownError("odd", null))).toBe(SIGN_IN_MESSAGES.invalid);
  });
});
