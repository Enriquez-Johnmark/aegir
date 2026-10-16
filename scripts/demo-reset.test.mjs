import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { buildDemoReset, DEMO_ORGANIZATIONS, seedUsers } from "./demo-reset.mjs";

const seed = readFileSync(fileURLToPath(new URL("../supabase/seed.sql", import.meta.url)), "utf8");

describe("demo reset (D-043)", () => {
  it("knows the seed's organizations and every seeded login", () => {
    for (const id of DEMO_ORGANIZATIONS) expect(seed).toContain(id);
    const users = seedUsers(seed);
    expect(users.map((user) => user.email)).toEqual(
      expect.arrayContaining(["amelia.hart@northwind.example", "vera.lindqvist@northwind.example", "owen.price@meridian.example"]),
    );
    expect(users).toHaveLength(8);
  });

  it("refuses to run without confirmation or on a database with other organizations", () => {
    const sql = buildDemoReset(seed);
    expect(sql).toContain("Missing psql variable: -v confirm=reset-demo");
    expect(sql).toContain("is distinct from 'reset-demo'");
    expect(sql).toContain("organizations other than the demo ones");
    // The guards come before the first delete.
    expect(sql.indexOf("$reset_guard$;")).toBeLessThan(sql.indexOf("delete from"));
  });

  it("deletes only demo rows and seed logins, then reseeds", () => {
    const sql = buildDemoReset(seed);
    const deletes = sql.split("\n").filter((line) => line.startsWith("delete from"));
    expect(deletes).toHaveLength(9);
    for (const line of deletes) {
      expect(line).toMatch(/where (organization_id|id) in \('/);
    }
    // Audit rows are deleted after the rows whose deletion writes them, organizations last but one.
    expect(sql.indexOf("delete from public.audit_events")).toBeGreaterThan(sql.indexOf("delete from public.memberships"));
    expect(sql.indexOf("delete from public.organizations")).toBeGreaterThan(sql.indexOf("delete from public.audit_events"));
    expect(sql.indexOf("insert into public.organizations")).toBeGreaterThan(sql.indexOf("delete from auth.users"));
  });
});
