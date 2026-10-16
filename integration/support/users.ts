// Seeded local users (supabase/seed.sql). The password is local-only.
export const PASSWORD = "AegirDemo2026";

export const USERS = {
  admin: { id: "a1000000-0000-4000-8000-000000000001", email: "amelia.hart@northwind.example" },
  manager: { id: "a1000000-0000-4000-8000-000000000002", email: "marcus.reyes@northwind.example" },
  inspector: { id: "a1000000-0000-4000-8000-000000000003", email: "ingrid.solberg@northwind.example" },
  technician: { id: "a1000000-0000-4000-8000-000000000004", email: "tomas.okafor@northwind.example" },
  viewer: { id: "a1000000-0000-4000-8000-000000000005", email: "vera.lindqvist@northwind.example" },
  /** A second technician, for "assigned to someone else". */
  technician2: { id: "a1000000-0000-4000-8000-000000000006", email: "kenji.watanabe@northwind.example" },
  /** Meridian Tankers, the other organization. */
  meridianManager: { id: "b1000000-0000-4000-8000-000000000001", email: "owen.price@meridian.example" },
} as const;

export type UserKey = keyof typeof USERS;

export type StoredCookie = { name: string; value: string };
