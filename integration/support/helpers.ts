import { createClient } from "@/lib/supabase/server";

import { USERS, type UserKey } from "./users";

/** Seeded records (supabase/seed.sql). */
export const NORTHWIND = {
  organizationId: "a0000000-0000-4000-8000-000000000001",
  vesselId: "a2000000-0000-4000-8000-000000000001",
};
export const MERIDIAN = {
  organizationId: "b0000000-0000-4000-8000-000000000001",
  vesselId: "b2000000-0000-4000-8000-000000000001",
  inspectionId: "b3000000-0000-4000-8000-000000000001",
  workOrderId: "b4000000-0000-4000-8000-000000000001",
  handoverId: "b5000000-0000-4000-8000-000000000001",
};

export function userId(user: UserKey): string {
  return USERS[user].id;
}

/** The Supabase client for the signed-in test user: the same one the app uses, so RLS applies. */
export const db = createClient;

export function form(fields: Record<string, string | undefined>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    if (value !== undefined) data.set(name, value);
  }
  return data;
}

/** Where a Server Action redirected to (`redirect()` throws NEXT_REDIRECT). Fails if it returned instead. */
export async function redirectOf(action: Promise<unknown>): Promise<string> {
  let result: unknown;
  try {
    result = await action;
  } catch (error) {
    const digest = (error as { digest?: unknown }).digest;
    const url = typeof digest === "string" && digest.startsWith("NEXT_REDIRECT;") ? digest.split(";")[2] : undefined;
    if (url) {
      return url;
    }
    throw error;
  }
  throw new Error(`Expected a redirect, got ${JSON.stringify(result)}`);
}

/** The record id a redirect URL carries (the pattern's first group). Fails if it has none. */
export function idIn(url: string, pattern: RegExp): string {
  const id = url.match(pattern)?.[1];
  if (!id) {
    throw new Error(`Expected ${url} to match ${pattern}`);
  }
  return id;
}

/** Unique per run, so reruns on reused data (INTEGRATION_SKIP_DB_RESET=1) never collide. */
export function unique(label: string): string {
  return `${label} ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** A random IMO number with a valid check digit, so reruns never collide. */
export function randomImo(): string {
  const digits = Array.from({ length: 6 }, (_, index) =>
    index === 0 ? 1 + Math.floor(Math.random() * 9) : Math.floor(Math.random() * 10),
  );
  const check = digits.reduce((sum, digit, index) => sum + digit * (7 - index), 0) % 10;
  return `${digits.join("")}${check}`;
}
