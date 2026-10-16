import { describe, expect, it } from "vitest";

import { DEMO_ACCOUNTS, DEMO_ROLES, demoEmailFor, demoSignInHref } from "./demo-accounts";

describe("demoEmailFor", () => {
  it.each(DEMO_ROLES)("pre-fills the published %s account", (role) => {
    expect(demoEmailFor(role)).toBe(DEMO_ACCOUNTS[role].email);
  });

  it("uses the first value when the parameter repeats", () => {
    expect(demoEmailFor(["inspector", "manager"])).toBe("ingrid.solberg@northwind.example");
  });

  it.each([
    ["missing", undefined],
    ["empty", ""],
    // Never published (D-011): the administrator and the second organization.
    ["admin", "admin"],
    ["another organization's account", "owen.price@meridian.example"],
    ["an email instead of a role", "marcus.reyes@northwind.example"],
    ["different case", "Manager"],
    ["non-string", 42],
  ])("pre-fills nothing for %s", (_label, value) => {
    expect(demoEmailFor(value)).toBeUndefined();
  });
});

describe("demo accounts", () => {
  it("are all in the demo organization and never the administrator", () => {
    for (const role of DEMO_ROLES) {
      expect(DEMO_ACCOUNTS[role].email).toMatch(/@northwind\.example$/);
      expect(DEMO_ACCOUNTS[role].email).not.toMatch(/^amelia\.hart@/);
    }
  });

  it("link to sign-in with the role only, never a password", () => {
    expect(demoSignInHref("technician")).toBe("/login?as=technician");
  });
});
