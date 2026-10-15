import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { signIn, USERS } from "./helpers";

// WCAG 2.2 A/AA rules (axe tags). Every route, desktop and Pixel 7 (the two projects).
const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"];

const SIGNED_OUT = ["/", "/login"];
const SIGNED_IN = [
  "/dashboard",
  "/vessels",
  "/vessels/a2000000-0000-4000-8000-000000000003",
  "/vessels/new",
  "/vessels/a2000000-0000-4000-8000-000000000003/edit",
  "/inspections",
  "/inspections/new",
  "/inspections/a3000000-0000-4000-8000-000000000002",
  "/inspections/a3000000-0000-4000-8000-000000000003",
  "/work-orders",
  "/work-orders/new",
  "/work-orders/a4000000-0000-4000-8000-000000000002",
  "/work-orders/a4000000-0000-4000-8000-000000000002/edit",
  "/handovers",
  "/handovers/new",
  "/handovers/a5000000-0000-4000-8000-000000000003",
];

async function violations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  // Compact, readable failure output: rule, impact and the first offending selectors.
  return results.violations.map((v) => ({
    rule: v.id,
    impact: v.impact,
    help: v.help,
    nodes: v.nodes.slice(0, 3).map((n) => n.target.join(" ")),
  }));
}

test.describe("accessibility (axe, WCAG 2.2 AA)", () => {
  test("signed-out pages", async ({ page }) => {
    for (const path of SIGNED_OUT) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
      expect(await violations(page), path).toEqual([]);
    }
  });

  test("every signed-in page, as a manager", async ({ page }) => {
    test.setTimeout(120_000);
    await signIn(page, USERS.manager);
    for (const path of SIGNED_IN) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(await violations(page), path).toEqual([]);
    }
  });

  test("an inspector recording results (toggles, fail panel, severity cards)", async ({ page }) => {
    await signIn(page, USERS.inspector);
    await page.goto("/inspections/a3000000-0000-4000-8000-000000000003");
    await page.getByRole("main").getByRole("group", { name: "Result for check 3" }).getByRole("button", { name: "Fail" }).click();
    await expect(page.getByRole("textbox", { name: "What did you find?" })).toBeVisible();
    expect(await violations(page), "inspection with the fail panel open").toEqual([]);
  });
});
