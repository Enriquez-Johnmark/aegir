#!/usr/bin/env node
// Captures the README screenshots (docs/screenshots/) from a running Aegir site.
// Read-only: it signs in with the published demo accounts and only navigates.
//
//   read -s DEMO_PASSWORD && export DEMO_PASSWORD
//   node scripts/capture-screenshots.mjs                       # the hosted demo
//   BASE_URL=http://localhost:3000 node scripts/capture-screenshots.mjs
//
// The password comes from the environment, never from this file (D-011).
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { chromium, devices } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "https://aegir-eight.vercel.app";
const PASSWORD = process.env.DEMO_PASSWORD;
if (!PASSWORD) {
  console.error("Set DEMO_PASSWORD first (see the comment at the top of this file).");
  process.exit(1);
}
const OUT = fileURLToPath(new URL("../docs/screenshots/", import.meta.url));
mkdirSync(OUT, { recursive: true });

const DESKTOP = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 };

// [account, path, file, clipToContent]
const SHOTS = [
  ["marcus.reyes", "/dashboard", "dashboard.png", false],
  ["marcus.reyes", "/vessels", "vessels.png", true],
  ["ingrid.solberg", "/inspections/a3000000-0000-4000-8000-000000000002", "inspection.png", false],
  ["marcus.reyes", "/work-orders/a4000000-0000-4000-8000-000000000002", "work-order.png", false],
  ["ingrid.solberg", "/handovers", "handovers.png", true],
  ["vera.lindqvist", "/audit", "audit-log.png", false],
];

const browser = await chromium.launch();

async function signedIn(account, options) {
  const context = await browser.newContext({ ...options, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(`${BASE}/login`);
  await page.getByLabel("Email").fill(`${account}@northwind.example`);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/dashboard$/);
  return page;
}

async function open(page, path) {
  await page.goto(`${BASE}${path}`);
  await page.getByRole("heading", { level: 1 }).first().waitFor();
  await page.waitForLoadState("networkidle");
}

/** Bottom of the visible content: leaf elements only, since layout wrappers stretch to the viewport. */
function contentBottom(page) {
  return page.evaluate(() =>
    Math.max(
      ...[...document.querySelectorAll("main *")]
        .filter((el) => el.children.length === 0 && el.checkVisibility() && el.getBoundingClientRect().height > 0)
        .map((el) => el.getBoundingClientRect().bottom),
    ),
  );
}

for (const [account, path, file, clip] of SHOTS) {
  const page = await signedIn(account, DESKTOP);
  await open(page, path);
  const height = clip ? Math.min(900, Math.ceil((await contentBottom(page)) + 40)) : 900;
  await page.screenshot({ path: `${OUT}${file}`, clip: { x: 0, y: 0, width: 1440, height } });
  console.log(`docs/screenshots/${file}`);
  await page.context().close();
}

const phone = await signedIn("marcus.reyes", devices["Pixel 7"]);
await open(phone, "/dashboard");
await phone.screenshot({ path: `${OUT}phone-dashboard.png` });
console.log("docs/screenshots/phone-dashboard.png");

await browser.close();
