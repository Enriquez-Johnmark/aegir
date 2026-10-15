import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { buildDemoSeed, PUBLISHED_LOGINS } from "./demo-seed.mjs";

const seed = readFileSync(fileURLToPath(new URL("../supabase/seed.sql", import.meta.url)), "utf8");

describe("demo seed (D-011)", () => {
  it("never publishes the administrator", () => {
    expect(PUBLISHED_LOGINS).not.toContain("amelia.hart@northwind.example");
    expect(PUBLISHED_LOGINS).toHaveLength(4);
  });

  it("replaces the published local password with run-time variables", () => {
    const sql = buildDemoSeed(seed);
    expect(sql).not.toContain("extensions.crypt('AegirDemo2026'");
    expect(sql).toContain("current_setting('aegir.demo_password')");
    expect(sql).toContain("current_setting('aegir.private_password')");
    // The only remaining mention is the guard that rejects it.
    expect(sql.match(/AegirDemo2026/g)).toHaveLength(1);
  });

  it("refuses a seed whose password line it doesn't recognise", () => {
    expect(() => buildDemoSeed(seed.replace("AegirDemo2026', extensions", "Other', extensions"))).toThrow(
      /exactly once/,
    );
  });
});
