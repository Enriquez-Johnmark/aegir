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
      // The live demo's password is shown beside the field, never filled in (D-050).
      await expect(page.getByText("Live demo password:")).toContainText("ShipShape2026");
    }
    // The closing section's links go to the same place.
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Sign in as Vera" })).toHaveAttribute("href", "/login?as=viewer");
  });

  test("unpublished or unknown accounts are never pre-filled", async ({ page }) => {
    for (const value of ["admin", "owen.price@meridian.example", "Manager", ""]) {
      await page.goto(`/login?as=${encodeURIComponent(value)}`);
      await expect(page.getByLabel("Email"), value).toHaveValue("");
      await expect(page.getByText("Live demo password:"), value).toHaveCount(0);
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

  test("the demo password copies with one tap", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/");
    const picker = page.getByRole("region", { name: "Try the live demo as" });
    await picker.getByRole("button", { name: "Copy the demo password" }).click();
    await expect(picker.getByRole("button", { name: "Copied the demo password" })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("ShipShape2026");
  });

  test("a visitor who is hiring finds who built it, how, and the code", async ({ page }) => {
    await page.goto("/");
    // The source is one tap away from the header, on a phone too.
    await expect(page.getByRole("banner").getByRole("link", { name: "Source" }).filter({ visible: true })).toHaveAttribute(
      "href",
      "https://github.com/Enriquez-Johnmark/aegir",
    );
    await expect(page.getByRole("link", { name: "Johnmark Enriquez" })).toHaveAttribute("href", "#built-by");

    const built = page.getByRole("region", { name: "How it's built" });
    await expect(built.getByRole("list", { name: "How a request travels" })).toContainText(
      "Server Actions re-check the user and validate every input with Zod",
    );
    for (const name of ["Lines 229–237 on GitHub", "Lines 53–57 on GitHub"]) {
      await expect(built.getByRole("link", { name })).toHaveAttribute(
        "href",
        /^https:\/\/github\.com\/Enriquez-Johnmark\/aegir\/blob\/main\/supabase\/(migrations|tests)\/[\w.]+\.sql#L\d+-L\d+$/,
      );
    }
    await expect(built.getByRole("link", { name: "CI on every push" })).toHaveAttribute("href", /\/actions\/workflows\/ci\.yml$/);

    const author = page.getByRole("region", { name: "Built by Johnmark Enriquez" });
    await expect(author.getByRole("link", { name: "GitHub profile" })).toHaveAttribute("href", "https://github.com/Enriquez-Johnmark");
  });

  test("a shared link gets a preview image, served signed out", async ({ page, request }) => {
    await page.goto("/");
    const image = await page.locator('meta[property="og:image"]').getAttribute("content");
    expect(image).toMatch(/\/opengraph-image(\?|$)/);
    const response = await request.get(new URL(image!).pathname, { maxRedirects: 0 });
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("image/png");
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
