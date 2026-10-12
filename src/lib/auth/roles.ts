import type { Database } from "@/types/database.types";

export type OrgRole = Database["public"]["Enums"]["org_role"];

export const ROLE_LABELS: Record<OrgRole, string> = {
  admin: "Administrator",
  manager: "Fleet manager",
  inspector: "Safety inspector",
  technician: "Technician",
  viewer: "Viewer",
};

/**
 * What each role may do, mirroring the matrix in docs/SECURITY.md.
 * This drives the UI only (which actions to show). The database enforces the
 * same rules with RLS and triggers, so a wrong entry here cannot grant access.
 */
const CAPABILITIES = {
  "vessels:write": ["admin", "manager"],
  "inspections:create": ["admin", "manager", "inspector"],
  "work-orders:create": ["admin", "manager", "inspector"],
  "work-orders:manage": ["admin", "manager"],
  "handovers:create": ["admin", "manager", "inspector", "technician"],
} as const satisfies Record<string, readonly OrgRole[]>;

export type Capability = keyof typeof CAPABILITIES;

export function can(role: OrgRole, capability: Capability): boolean {
  const allowed: readonly OrgRole[] = CAPABILITIES[capability];
  return allowed.includes(role);
}
