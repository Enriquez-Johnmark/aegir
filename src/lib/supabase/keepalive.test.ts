import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

const { reachedDatabase } = await import("./keepalive");

describe("reachedDatabase", () => {
  it.each([
    ["no error", null],
    ["permission denied, the anonymous read's usual answer", { code: "42501" }],
    ["any other SQLSTATE", { code: "22P02" }],
  ])("counts %s as the database answering", (_case, error) => {
    expect(reachedDatabase(error)).toBe(true);
  });

  it.each([
    ["a failed connection (empty code)", { code: "" }],
    ["no code at all", {}],
    ["a PostgREST error that never reached Postgres", { code: "PGRST301" }],
  ])("does not count %s", (_case, error) => {
    expect(reachedDatabase(error)).toBe(false);
  });
});
