import { inject } from "vitest";

import type { StoredCookie, UserKey } from "./users";

type Cookie = { name: string; value: string };

/** The subset of Next's cookie store that `createClient()` uses. */
class CookieJar {
  private readonly cookies = new Map<string, string>();

  constructor(initial: StoredCookie[] = []) {
    initial.forEach(({ name, value }) => this.cookies.set(name, value));
  }

  get(name: string): Cookie | undefined {
    const value = this.cookies.get(name);
    return value === undefined ? undefined : { name, value };
  }

  getAll(): Cookie[] {
    return [...this.cookies].map(([name, value]) => ({ name, value }));
  }

  set(name: string, value: string) {
    if (value) this.cookies.set(name, value);
    else this.cookies.delete(name);
  }
}

let current = new CookieJar();

export function cookieJar(): CookieJar {
  return current;
}

/** The next requests run as this seeded user (their real session, so RLS applies). */
export function signInAs(user: UserKey) {
  current = new CookieJar(inject("sessions")[user]);
}

/** The next requests run with no session. */
export function signOut() {
  current = new CookieJar();
}
