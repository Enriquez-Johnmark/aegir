#!/usr/bin/env node
// Smoke test for a deployed Aegir site (DEPLOYMENT.md). Read-only: it signs in with
// the published demo accounts, reads pages and checks permissions; it creates nothing.
//
//   read -s DEMO_PASSWORD && export DEMO_PASSWORD
//   node scripts/smoke.mjs [screenshot-dir]               # the hosted demo
//   BASE_URL=http://127.0.0.1:3000 LANDING_ONLY=1 node scripts/smoke.mjs
//
// It makes 7 sign-ins, so run it at most once per 5 minutes from one IP: the edge
// allows 10 sign-in attempts per 5 minutes (D-044). LANDING_ONLY=1 runs only the
// landing-page checks, which sign in to nothing (no password needed).
// The password comes from the environment, never from this file (D-011).
import { mkdirSync } from "node:fs";

import { chromium, devices } from "@playwright/test";

const out = process.argv[2];
if (out) mkdirSync(out, { recursive: true });
const BASE = process.env.BASE_URL ?? "https://aegir-eight.vercel.app";
const LANDING_ONLY = process.env.LANDING_ONLY === "1";
const DEMO = process.env.DEMO_PASSWORD;
if (!LANDING_ONLY && !DEMO) {
  console.error("Set DEMO_PASSWORD first (see the comment at the top of this file), or LANDING_ONLY=1.");
  process.exit(1);
}
const ROLES = {
  manager: "marcus.reyes@northwind.example",
  inspector: "ingrid.solberg@northwind.example",
  technician: "tomas.okafor@northwind.example",
  viewer: "vera.lindqvist@northwind.example",
};
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
};

const browser = await chromium.launch();

// Signed-in pages stream their sections in after the load event, so wait for what
// is being counted or read before checking it (the same rule as the E2E locators).
async function settled(locator) {
  await locator.first().waitFor({ timeout: 15000 }).catch(() => {});
  return locator;
}

async function signIn(page, email, password = DEMO) {
  await page.goto(`${BASE}/login`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  const started = Date.now();
  await page.getByRole("button", { name: "Sign in" }).click();
  return started;
}

// Landing page (D-046): static, no sign-in, so it costs nothing against the rate limit.
for (const [vp, options] of [["desktop", { viewport: { width: 1440, height: 900 } }], ["pixel7", devices["Pixel 7"]]]) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  const response = await page.goto(`${BASE}/`);
  const headers = response.headers();
  check(`landing/${vp}: / is 200 with the CSP`, response.status() === 200 && /img-src 'self' blob: data:/.test(headers["content-security-policy"] ?? ""), `x-vercel-cache: ${headers["x-vercel-cache"] ?? "n/a"}`);
  check(`landing/${vp}: h1 is the promise`, (await page.getByRole("heading", { level: 1 }).innerText()) === "Every failed check stays in sight until the work is done.");
  const picker = page.getByRole("region", { name: "Try the live demo as" });
  check(`landing/${vp}: role picker in the first viewport`, await picker.getByRole("link", { name: "Sign in as Fleet manager" }).isVisible() && (await picker.getByRole("link", { name: "Sign in as Fleet manager" }).boundingBox()).y < page.viewportSize().height);
  const images = page.locator("main img");
  let loaded = 0;
  for (const image of await images.all()) {
    await image.scrollIntoViewIfNeeded();
    await page.waitForFunction((img) => img.complete, await image.elementHandle(), { timeout: 15000 }).catch(() => {});
    const ok = await image.evaluate((img) => img.naturalWidth > 0 && new URL(img.currentSrc).origin === location.origin);
    if (ok) loaded += 1;
  }
  check(`landing/${vp}: all 6 screenshots load from this site`, loaded === 6 && (await images.count()) === 6, `${loaded}/${await images.count()}`);
  await page.goto(`${BASE}/login?as=inspector`);
  check(`landing/${vp}: ?as=inspector pre-fills the email only`, (await page.getByLabel("Email").inputValue()) === ROLES.inspector && (await page.getByLabel("Password").inputValue()) === "");
  await page.goto(`${BASE}/login?as=admin`);
  check(`landing/${vp}: ?as=admin pre-fills nothing`, (await page.getByLabel("Email").inputValue()) === "");
  check(`landing/${vp}: no console errors`, errors.length === 0, errors.slice(0, 2).join(" | "));
  await context.close();
}

for (const [role, email] of Object.entries(LANDING_ONLY ? {} : ROLES)) {
  for (const [vp, options] of [["desktop", { viewport: { width: 1360, height: 900 } }], ["pixel7", devices["Pixel 7"]]]) {
    if (vp === "pixel7" && role !== "technician") continue; // one phone pass is enough
    const context = await browser.newContext(options);
    const page = await context.newPage();
    const errors = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(String(e)));
    const started = await signIn(page, email);
    try {
      await page.waitForURL(/\/dashboard$/, { timeout: 20000 });
      await page.getByRole("region", { name: "Work queue" }).waitFor({ timeout: 20000 });
      check(`${role}/${vp}: signs in and sees the dashboard`, true, `${Date.now() - started} ms to content`);
    } catch {
      check(`${role}/${vp}: signs in and sees the dashboard`, false, page.url());
      if (out) await page.screenshot({ path: `${out}/${role}-${vp}-signin-fail.png`, fullPage: true });
      await context.close();
      continue;
    }
    const main = page.getByRole("main");
    const text = await main.innerText();
    check(`${role}/${vp}: organization is Northwind Shipping`, text.includes("Northwind Shipping"));
    check(`${role}/${vp}: nothing from Meridian Tankers`, !/Meridian|Cargo tank inspection|Recalibrate tank 3P/.test(text));
    const figures = await page.evaluate(() =>
      [...document.querySelectorAll("main ul.grid a[aria-label]")].map((a) => a.getAttribute("aria-label")),
    );
    if (role === "manager" && vp === "desktop") console.log("      figures:", JSON.stringify(figures));
    if (out) await page.screenshot({ path: `${out}/${role}-${vp}-dashboard.png`, fullPage: true });

    if (role === "viewer") {
      check("viewer: no Raise/Add/Schedule controls on the dashboard", (await main.getByRole("link", { name: /Raise work order|Add vessel|Schedule inspection/ }).count()) === 0);
      await page.goto(`${BASE}/vessels/new`);
      check("viewer: /vessels/new refuses", /can't|cannot|not allowed|don't have/i.test(await page.getByRole("main").innerText()));
      await page.goto(`${BASE}/inspections/new`);
      check("viewer: /inspections/new refuses", /can't schedule/i.test(await page.getByRole("main").innerText()));
      await page.goto(`${BASE}/handovers/new`);
      check("viewer: /handovers/new refuses", /can't hand work over/i.test(await page.getByRole("main").innerText()));
      // Audit log (D-042): the auditor reads it; nothing from another organization; seeded failures show.
      await page.goto(`${BASE}/audit`);
      await settled(page.getByText(/Showing the newest \d+ change/));
      const log = await page.getByRole("main").innerText();
      check("viewer: /audit lists changes", /Showing the newest \d+ change/.test(log));
      check("viewer: /audit shows nothing from Meridian", !/Meridian|Owen Price|Sofia Marin/.test(await page.content()));
      await page.goto(`${BASE}/inspections/a3000000-0000-4000-8000-000000000001`);
      await settled(page.getByText("Added to the checklist as Fail (High severity)"));
      check("viewer: inspection history shows the seeded failure", (await page.getByRole("main").innerText()).includes("Added to the checklist as Fail (High severity)"));
      await page.goto(`${BASE}/audit?actor=system&type=checks`);
      const checkEntries = await settled(page.getByRole("link", { name: /Inspection check · .+ · Northwind / }));
      check("viewer: check entries name inspection and vessel", (await checkEntries.count()) > 0, `${await checkEntries.count()} entries`);
    }
    if (role === "manager" && vp === "desktop") {
      for (const [label, path] of [
        ["another organization's inspection", "/inspections/b3000000-0000-4000-8000-000000000001"],
        ["another organization's vessel", "/vessels/b2000000-0000-4000-8000-000000000001"],
        ["another organization's work order", "/work-orders/b4000000-0000-4000-8000-000000000001"],
        ["another organization's handover", "/handovers/b5000000-0000-4000-8000-000000000001"],
      ]) {
        await page.goto(`${BASE}${path}`);
        const body = await page.getByRole("main").innerText();
        check(`manager: ${label} is not found`, /not found|doesn't exist|no longer exists/i.test(body) && !/Meridian/.test(body));
      }
      for (const path of ["/vessels", "/inspections", "/work-orders", "/handovers", "/handovers/a5000000-0000-4000-8000-000000000003", "/handovers/new"]) {
        const t0 = Date.now();
        await page.goto(`${BASE}${path}`);
        await page.getByRole("heading", { level: 1 }).waitFor();
        check(`manager: ${path} loads`, true, `${Date.now() - t0} ms`);
      }
      // The 'All' views (fixed in e05fb14): choose each and confirm it sticks. Read-only.
      for (const [path, all] of [["/work-orders", "All work orders"], ["/inspections", "All inspections"], ["/handovers", "All handovers"]]) {
        await page.goto(`${BASE}${path}`);
        await page.getByRole("combobox", { name: "Show" }).click();
        await page.getByRole("option", { name: all }).click();
        await page.waitForURL(new RegExp(`${path}\\?view=all$`), { timeout: 10000 }).catch(() => {});
        check(`manager: '${all}' can be chosen`, page.url().endsWith(`${path}?view=all`) && (await page.getByRole("combobox", { name: "Show" }).innerText()).includes(all));
      }
      await page.goto(`${BASE}/dashboard`);
      const handoverRows = await settled(page.getByRole("main").locator('a[href^="/handovers/a5"]'));
      check("manager: dashboard handover rows open the handover", (await handoverRows.count()) > 0, `${await handoverRows.count()} rows`);
    }
    if (vp === "pixel7") {
      await page.goto(`${BASE}/dashboard`);
      await page.getByRole("button", { name: "Toggle Sidebar" }).click();
      await page.getByRole("dialog", { name: "Sidebar" }).getByRole("link", { name: "Audit log" }).click();
      await page.waitForURL(/\/audit$/);
      await page.waitForTimeout(1000);
      check(`${role}/${vp}: phone menu closes after navigating`, !(await page.getByRole("dialog", { name: "Sidebar" }).isVisible()));
    }
    check(`${role}/${vp}: no console errors`, errors.length === 0, errors.slice(0, 2).join(" | "));
    await context.close();
  }
}

// Unpublished accounts must not open with the demo password.
if (!LANDING_ONLY) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, "amelia.hart@northwind.example");
  const alert = page.getByRole("alert").filter({ hasText: "Sign-in failed" });
  await alert.waitFor({ timeout: 15000 }).catch(() => {});
  check("admin: refused with the demo password", (await alert.count()) > 0 && !page.url().endsWith("/dashboard"));
  await signIn(page, "owen.price@meridian.example");
  await page.waitForTimeout(3000);
  check("Meridian manager: refused with the demo password", !page.url().endsWith("/dashboard"));
  await context.close();
}

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
