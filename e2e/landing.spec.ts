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

  test("sign-in names the picked role, and offers the demo roles to everyone else (D-051)", async ({ page }) => {
    await page.goto("/login?as=technician");
    await expect(page.getByText("Signing in as Technician · Tomas Okafor")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Trying the demo? Sign in as" })).toHaveCount(0);

    await page.goto("/login");
    const roles = page.getByRole("navigation", { name: "Trying the demo? Sign in as" });
    await roles.getByRole("link", { name: "Viewer" }).click();
    await expect(page).toHaveURL(/\/login\?as=viewer$/);
    await expect(page.getByLabel("Email")).toHaveValue(USERS.viewer.email);
    await page.getByRole("link", { name: "Aegir home" }).click();
    await expect(page).toHaveURL(/\/$/);
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
    // Hero, four steps, the roles section's phone and the audit log (D-051).
    await expect(images).toHaveCount(7);
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

  test("a client finds what it replaces, what it doesn't do, and who to talk to (D-051)", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("banner").getByRole("link", { name: "Try the demo" }).click();
    await expect(page).toHaveURL(/#try-the-demo$/);
    await expect(page.getByRole("region", { name: "Try it as each role" })).toBeInViewport();

    const scope = page.getByRole("region", { name: "What it replaces, and what it doesn't do yet" });
    await expect(scope.getByRole("list").last()).toContainText("Offline use at sea");
    await expect(scope).toContainText("not certified");

    const contact = page.getByRole("region", { name: "Want this for your fleet?" });
    await expect(contact.getByRole("link", { name: "Talk to Johnmark on LinkedIn" })).toHaveAttribute(
      "href",
      "https://www.linkedin.com/in/johnmark-enriquez/",
    );
  });

  test("the engineering page has how it's built and who built it (D-050, D-051)", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("contentinfo").getByRole("link", { name: "For engineers" }).click();
    await expect(page).toHaveURL(/\/engineering$/);
    await expect(page).toHaveTitle("How it's built · Aegir");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("How Aegir is built");

    const guarantees = page.getByRole("region", { name: "The promises, and what keeps them" });
    await expect(guarantees.getByRole("link", { name: "12_read_isolation.test.sql" })).toHaveAttribute(
      "href",
      /\/supabase\/tests\/12_read_isolation\.test\.sql$/,
    );

    const built = page.getByRole("region", { name: "From the browser to the database" });
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
    await expect(author.getByRole("link", { name: "LinkedIn" })).toHaveAttribute("href", "https://www.linkedin.com/in/johnmark-enriquez/");
  });

  test("a shared link gets a preview image, served signed out", async ({ page, request }) => {
    await page.goto("/");
    const image = await page.locator('meta[property="og:image"]').getAttribute("content");
    expect(image).toMatch(/\/opengraph-image(\?|$)/);
    const response = await request.get(new URL(image!).pathname, { maxRedirects: 0 });
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("image/png");
  });

  test("the footer links to the engineering page and the repository", async ({ page }) => {
    await page.goto("/");
    const footerLinks = page.getByRole("navigation", { name: "Source and documentation" }).getByRole("link");
    await expect(footerLinks).toHaveCount(5);
    await expect(footerLinks.first()).toHaveAttribute("href", "/engineering");
    for (const link of (await footerLinks.all()).slice(1)) {
      await expect(link).toHaveAttribute("href", /^https:\/\/github\.com\/Enriquez-Johnmark\/aegir(\/|$)/);
    }
  });

  test("nothing scrolls sideways at 320px or with 200% text", async ({ page }) => {
    for (const viewport of [{ width: 320, height: 640 }, { width: 1360, height: 900 }]) {
      for (const path of ["/", "/engineering"]) {
        await page.setViewportSize(viewport);
        await page.goto(path);
        await page.addStyleTag({ content: "html { font-size: 200% }" });
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, `${path} at ${viewport.width}px`).toBe(0);
      }
      await page.goto("/");
      await expect(page.getByRole("link", { name: "Sign in as Viewer" }).first()).toBeVisible();
    }
  });
});
