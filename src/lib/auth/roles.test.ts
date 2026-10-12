import { describe, expect, it } from "vitest";

import { can, type OrgRole } from "./roles";

const ROLES: OrgRole[] = ["admin", "manager", "inspector", "technician", "viewer"];

function allowedRoles(capability: Parameters<typeof can>[1]) {
  return ROLES.filter((role) => can(role, capability));
}

// Expectations copied from the permission matrix in docs/SECURITY.md.
describe("can", () => {
  it("lets only admins and managers edit vessels", () => {
    expect(allowedRoles("vessels:write")).toEqual(["admin", "manager"]);
  });

  it("lets inspectors and above create inspections and work orders", () => {
    expect(allowedRoles("inspections:create")).toEqual(["admin", "manager", "inspector"]);
    expect(allowedRoles("work-orders:create")).toEqual(["admin", "manager", "inspector"]);
  });

  it("reserves full work-order management for admins and managers", () => {
    expect(allowedRoles("work-orders:manage")).toEqual(["admin", "manager"]);
  });

  it("lets everyone except viewers create handovers", () => {
    expect(allowedRoles("handovers:create")).toEqual(["admin", "manager", "inspector", "technician"]);
  });

  it("never lets a viewer write anything", () => {
    const capabilities = [
      "vessels:write",
      "inspections:create",
      "work-orders:create",
      "work-orders:manage",
      "handovers:create",
    ] as const;
    expect(capabilities.some((capability) => can("viewer", capability))).toBe(false);
  });
});
