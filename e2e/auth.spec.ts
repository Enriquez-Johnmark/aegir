import { expect, test } from "@playwright/test";

import { PASSWORD, USERS } from "./helpers";

// Hidden, still-mounted or briefly duplicated streamed content can match too (D-030).
const visible = { visible: true } as const;

const TECHNICIAN = USERS.technician;

test.describe("authentication", () => {
  test("redirects signed-out visitors to sign in and back afterwards", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/);

    await page.getByLabel("Email").fill(TECHNICIAN.email);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible();
    // The dashboard is the technician's own organization, with their own work called out.
    await expect(page.getByRole("main").getByText("Northwind Shipping", { exact: true }).filter(visible)).toBeVisible();
    await expect(page.getByRole("link", { name: /assigned to you$/ })).toBeVisible();

    // The session lives in cookies only the server can read (D-043): scripts never see the refresh token.
    const session = (await page.context().cookies()).filter((cookie) => cookie.name.startsWith("sb-"));
    expect(session.length).toBeGreaterThan(0);
    expect(session.map((cookie) => [cookie.name, cookie.httpOnly])).toEqual(session.map((cookie) => [cookie.name, true]));
  });

  test("rejects a wrong password without revealing which field was wrong", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(TECHNICIAN.email);
    await page.getByLabel("Password").fill("not-the-password-1");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByRole("alert").filter({ hasText: "Sign-in failed" })).toContainText(
      "Invalid email or password.",
    );
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByLabel("Email")).toHaveValue(TECHNICIAN.email);
  });

  test("validates the form on the server", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("not-an-email");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText("Enter a valid email address.").filter(visible)).toBeVisible();
    await expect(page.getByText("Enter your password.").filter(visible)).toBeVisible();
  });

  test("ignores off-site redirect targets", async ({ page }) => {
    await page.goto("/login?next=https://evil.example");
    await page.getByLabel("Email").fill(TECHNICIAN.email);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL(/127\.0\.0\.1:\d+\/dashboard$/);
  });

  test("signs out and protects the dashboard again", async ({ page, isMobile }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(TECHNICIAN.email);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    // A signed-in user is sent away from the login page.
    await page.goto("/login");
    await expect(page).toHaveURL(/\/dashboard$/);

    if (isMobile) {
      await page.getByRole("button", { name: "Toggle Sidebar" }).click();
    }
    await page.getByRole("button", { name: new RegExp(TECHNICIAN.name) }).click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/);
  });
});
