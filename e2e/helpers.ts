import { expect, type Page } from "@playwright/test";

// Seeded local users (supabase/seed.sql). Password is local-only.
export const PASSWORD = "AegirDemo2026";

export const USERS = {
  manager: { email: "marcus.reyes@northwind.example", name: "Marcus Reyes" },
  inspector: { email: "ingrid.solberg@northwind.example", name: "Ingrid Solberg" },
  technician: { email: "tomas.okafor@northwind.example", name: "Tomas Okafor" },
  viewer: { email: "vera.lindqvist@northwind.example", name: "Vera Lindqvist" },
} as const;

export async function signIn(page: Page, user: (typeof USERS)[keyof typeof USERS]) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

/** A random IMO number with a valid check digit, so reruns never collide. */
export function randomImo(): string {
  const digits = Array.from({ length: 6 }, (_, index) =>
    index === 0 ? 1 + Math.floor(Math.random() * 9) : Math.floor(Math.random() * 10),
  );
  const check = digits.reduce((sum, digit, index) => sum + digit * (7 - index), 0) % 10;
  return `${digits.join("")}${check}`;
}
