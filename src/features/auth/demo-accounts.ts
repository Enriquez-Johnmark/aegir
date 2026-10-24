import { z } from "zod";

import { ROLE_LABELS } from "@/lib/auth/roles";

/**
 * The four published demo accounts (D-011): one per non-admin role in Northwind
 * Shipping. `tryThis` is a first task built on that person's own seeded work
 * (supabase/seed.sql), so it works on a fresh demo (D-051). The administrator and the second organization are never published,
 * so they are not listed here and `?as=` can never pre-fill them.
 */
export const DEMO_ROLES = ["manager", "inspector", "technician", "viewer"] as const;
export type DemoRole = (typeof DEMO_ROLES)[number];

export const DEMO_ACCOUNTS = {
  manager: {
    name: "Marcus Reyes",
    email: "marcus.reyes@northwind.example",
    tryThis: "Open Northwind Fjord on the watch list and see why it's flagged, then assign or reprioritise its work.",
  },
  inspector: {
    name: "Ingrid Solberg",
    email: "ingrid.solberg@northwind.example",
    tryThis: "Finish the monthly fire safety audit on Northwind Halcyon: fail a check, then raise a work order from it.",
  },
  technician: {
    name: "Tomas Okafor",
    email: "tomas.okafor@northwind.example",
    tryThis: "Start the oily water separator alarm job on Northwind Fjord, then block it with a reason.",
  },
  viewer: {
    name: "Vera Lindqvist",
    email: "vera.lindqvist@northwind.example",
    tryThis: "Open the audit log and follow who changed what. Try to change something: you can't.",
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

/** The published demo role an untrusted `?as=` value names, or undefined for anything else. */
export function demoRoleFor(value: unknown): DemoRole | undefined {
  const parsed = demoRoleSchema.safeParse(Array.isArray(value) ? value[0] : value);
  return parsed.success ? parsed.data : undefined;
}

/** The email to pre-fill for an untrusted `?as=` value, or undefined for anything else. */
export function demoEmailFor(value: unknown): string | undefined {
  const role = demoRoleFor(value);
  return role ? DEMO_ACCOUNTS[role].email : undefined;
}
