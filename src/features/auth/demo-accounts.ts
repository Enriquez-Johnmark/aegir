import { z } from "zod";

import { ROLE_LABELS } from "@/lib/auth/roles";

/**
 * The four published demo accounts (D-011): one per non-admin role in Northwind
 * Shipping. The administrator and the second organization are never published,
 * so they are not listed here and `?as=` can never pre-fill them.
 */
export const DEMO_ROLES = ["manager", "inspector", "technician", "viewer"] as const;
export type DemoRole = (typeof DEMO_ROLES)[number];

export const DEMO_ACCOUNTS = {
  manager: {
    name: "Marcus Reyes",
    email: "marcus.reyes@northwind.example",
    tryThis: "Everything: vessels, scheduling, assigning and editing work.",
  },
  inspector: {
    name: "Ingrid Solberg",
    email: "ingrid.solberg@northwind.example",
    tryThis: "Conduct the inspections assigned to you, record failures, raise work orders.",
  },
  technician: {
    name: "Tomas Okafor",
    email: "tomas.okafor@northwind.example",
    tryThis: "Work the jobs assigned to you: start, block with a reason, complete.",
  },
  viewer: {
    name: "Vera Lindqvist",
    email: "vera.lindqvist@northwind.example",
    tryThis: "See everything, including the audit log. Change nothing.",
  },
} as const satisfies Record<DemoRole, { name: string; email: string; tryThis: string }>;

export function demoRoleLabel(role: DemoRole): string {
  return ROLE_LABELS[role];
}

/**
 * The hosted demo's password, published in the README (D-011). It is not a
 * secret: it only opens the four shared demo accounts above. The local seed
 * uses a different password (README, Demo access).
 */
export const HOSTED_DEMO_PASSWORD = "ShipShape2026";

/** Sign-in link that pre-fills a demo account's email. Never carries a password. */
export function demoSignInHref(role: DemoRole): string {
  return `/login?as=${role}`;
}

const demoRoleSchema = z.enum(DEMO_ROLES);

/** The email to pre-fill for an untrusted `?as=` value, or undefined for anything else. */
export function demoEmailFor(value: unknown): string | undefined {
  const parsed = demoRoleSchema.safeParse(Array.isArray(value) ? value[0] : value);
  return parsed.success ? DEMO_ACCOUNTS[parsed.data].email : undefined;
}
