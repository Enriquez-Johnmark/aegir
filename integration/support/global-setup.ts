import { execFileSync } from "node:child_process";

import { createServerClient } from "@supabase/ssr";
import type { TestProject } from "vitest/node";

import { PASSWORD, USERS, type StoredCookie, type UserKey } from "./users";

declare module "vitest" {
  export interface ProvidedContext {
    sessions: Record<UserKey, StoredCookie[]>;
  }
}

/**
 * Starts every run from the seed (as E2E does), then signs each seeded user in
 * once and hands their session cookies to the test files. One sign-in per user
 * per run keeps well inside the local Auth rate limit.
 *
 * Always `--local`; the config refuses a non-local URL before this runs. Set
 * INTEGRATION_SKIP_DB_RESET=1 to reuse the current local data.
 */
export default async function globalSetup(project: TestProject) {
  if (process.env.INTEGRATION_SKIP_DB_RESET !== "1") {
    execFileSync("npx", ["supabase", "db", "reset", "--local"], { stdio: "inherit" });
  }

  const sessions = {} as Record<UserKey, StoredCookie[]>;
  for (const [key, user] of Object.entries(USERS) as [UserKey, (typeof USERS)[UserKey]][]) {
    const jar = new Map<string, string>();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll: () => [...jar].map(([name, value]) => ({ name, value })),
          setAll: (cookies) => cookies.forEach(({ name, value }) => (value ? jar.set(name, value) : jar.delete(name))),
        },
      },
    );
    const { error } = await supabase.auth.signInWithPassword({ email: user.email, password: PASSWORD });
    if (error) {
      throw new Error(`Could not sign in the seeded ${key} (${error.code ?? error.message}). Is the local stack seeded?`);
    }
    sessions[key] = [...jar].map(([name, value]) => ({ name, value }));
  }
  project.provide("sessions", sessions);
}
