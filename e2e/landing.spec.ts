import { expect, test } from "@playwright/test";

import { PASSWORD, USERS } from "./helpers";

// The public landing page (D-046): static, no session, every claim checkable.
const ROLES = [
  { label: "Fleet manager", as: "manager", user: USERS.manager, first: "Marcus" },
  { label: "Safety inspector", as: "inspector", user: USERS.inspector, first: "Ingrid" },
  { label: "Technician", as: "technician", user: USERS.technician, first: "Tomas" },
  { label: "Viewer", as: "viewer", user: USERS.viewer, first: "Vera" },
] as const;

test.describe("landing page", () => {
  test("the first screen says what Aegir is and offers the demo", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle("Aegir: maritime safety and fleet operations");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Every failed check stays in sight until the work is done.",
    );
    // The primary action sits in the first viewport, on desktop and on a phone.
    const picker = page.getByRole("region", { name: "Try the live demo as" });
    await expect(picker.getByRole("link", { name: "Sign in as Fleet manager" })).toBeInViewport();
    await expect(picker).toContainText("ShipShape2026");
  });

  test("every role link pre-fills its published email, never a password", async ({ page }) => {
    for (const role of ROLES) {
      await page.goto("/");
      await page.getByRole("region", { name: "Try the live demo as" }).getByRole("link", { name: `Sign in as ${role.label}` }).click();
      await expect(page).toHaveURL(new RegExp(`/login\\?as=${role.as}$`));
      await expect(page.getByLabel("Email")).toHaveValue(role.user.email);
      await expect(page.getByLabel("Password")).toHaveValue("");
    }
    // The closing section's links go to the same place.
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Sign in as Vera" })).toHaveAttribute("href", "/login?as=viewer");
  });

  test("unpublished or unknown accounts are never pre-filled", async ({ page }) => {
    for (const value of ["admin", "owen.price@meridian.example", "Manager", ""]) {
      await page.goto(`/login?as=${encodeURIComponent(value)}`);
      await expect(page.getByLabel("Email"), value).toHaveValue("");
    }
  });

  test("a visitor signs in from the landing page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Sign in as Safety inspector" }).click();
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible();
  });

  test("the screenshots load from this site with no CSP violation", async ({ page }) => {
    const violations: string[] = [];
    page.on("console", (message) => {
      if (/Content Security Policy|Refused to (load|execute|apply|connect|frame)/i.test(message.text())) {
        violations.push(message.text());
      }
    });
    await page.goto("/");
    // Bring every lazy image in, then check each one decoded from this origin.
    const images = page.locator("main img");
    await expect(images).toHaveCount(6);
    for (const image of await images.all()) {
      await image.scrollIntoViewIfNeeded();
      await expect(image).toHaveJSProperty("complete", true);
      expect(await image.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
      expect(await image.evaluate((img: HTMLImageElement) => new URL(img.currentSrc).origin)).toBe(new URL(page.url()).origin);
      await expect(image).toHaveAttribute("alt", /\S/);
    }
    expect(violations).toEqual([]);
  });

  test("source and documentation links point at the repository", async ({ page }) => {
    await page.goto("/");
    const footerLinks = page.getByRole("navigation", { name: "Source and documentation" }).getByRole("link");
    await expect(footerLinks).toHaveCount(4);
    for (const link of await footerLinks.all()) {
      await expect(link).toHaveAttribute("href", /^https:\/\/github\.com\/Enriquez-Johnmark\/aegir(\/|$)/);
    }
  });

  test("nothing scrolls sideways at 320px or with 200% text", async ({ page }) => {
    for (const viewport of [{ width: 320, height: 640 }, { width: 1360, height: 900 }]) {
      await page.setViewportSize(viewport);
      await page.goto("/");
      await page.addStyleTag({ content: "html { font-size: 200% }" });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${viewport.width}px`).toBe(0);
      await expect(page.getByRole("link", { name: "Sign in as Viewer" }).first()).toBeVisible();
    }
  });
});
