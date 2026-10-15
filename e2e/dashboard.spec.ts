import { expect, test, type Page } from "@playwright/test";

import { signIn, USERS } from "./helpers";

const TERN_VESSEL_ID = "a2000000-0000-4000-8000-000000000005";

/** A headline figure: the number inside the summary link that starts with `label`. */
async function figure(page: Page, label: string): Promise<number> {
  const link = page.getByRole("main").getByRole("link", { name: new RegExp(`^${label}`) });
  const value = await link.locator(":scope > span").nth(1).textContent();
  return Number(value);
}

function panel(page: Page, name: string) {
  return page.getByRole("region", { name });
}

test.describe("dashboard", () => {
  test("shows the organization's live queues and nothing from another organization", async ({ page }) => {
    await signIn(page, USERS.manager);
    await expect(page.getByRole("heading", { name: "Northwind Shipping", level: 2 })).toBeVisible();

    // Seeded overdue work and inspections lead their queues (overdue first).
    await expect(
      panel(page, "Work queue").getByRole("link", { name: "Replace corroded deck railing section" }),
    ).toBeVisible();
    await expect(
      panel(page, "Inspections due").getByRole("link", { name: "Annual life-saving appliances inspection" }),
    ).toBeVisible();
    await expect(panel(page, "Vessels needing attention").getByRole("link", { name: "Northwind Fjord" })).toBeVisible();
    await expect(panel(page, "Pending handovers")).toContainText("Petrel LSA inspection is overdue");

    // Meridian Marine's overdue inspection and open work never appear.
    const main = page.getByRole("main");
    await expect(main.getByText("Cargo tank inspection")).toHaveCount(0);
    await expect(main.getByText("Recalibrate tank 3P level gauge")).toHaveCount(0);

    // Each figure opens the list behind it.
    await main.getByRole("link", { name: /^Open work orders/ }).click();
    await expect(page.getByRole("heading", { name: "Work orders", level: 1 })).toBeVisible();
  });

  test("a failed check is flagged until work is raised, and the figures follow", async ({ page, browser }) => {
    await signIn(page, USERS.inspector);
    const followUpsBefore = await figure(page, "Needs follow-up");
    const openWorkBefore = await figure(page, "Open work orders");

    // Conduct an inspection with one failed check (each run creates its own).
    await page.goto(`/inspections/new?vessel=${TERN_VESSEL_ID}`);
    await page.getByRole("button", { name: "Add from template" }).click();
    await page.getByRole("menuitem", { name: /Life-saving appliances inspection/ }).click();
    const title = `Dashboard LSA ${Date.now()}`;
    await page.getByRole("textbox", { name: "Title" }).fill(title);
    await page.getByRole("button", { name: "Schedule inspection" }).click();
    await expect(page.getByRole("heading", { name: title, level: 1 })).toBeVisible();
    await page.getByRole("button", { name: "Start inspection" }).click();
    const firstCheck = page.getByRole("main").getByRole("group", { name: "Result for check 1" });
    await firstCheck.getByRole("button", { name: "Fail" }).click();
    await page.getByRole("textbox", { name: "What did you find?" }).fill("Liferaft service label expired.");
    // Severity is a set of choice cards carrying the full guidance.
    await page.getByRole("radio", { name: /^High/ }).check();
    await page.getByRole("button", { name: "Record failure" }).click();
    await expect(page.getByText("Needs follow-up", { exact: true }).filter({ visible: true })).toBeVisible();

    // The dashboard flags it, never truncated, with the way to address it.
    await page.goto("/dashboard");
    expect(await figure(page, "Needs follow-up")).toBe(followUpsBefore + 1);
    const row = panel(page, "Failed checks").getByRole("listitem").filter({ hasText: title });
    await expect(row.getByText("Needs follow-up", { exact: true })).toBeVisible();

    // A viewer sees the same open finding but is not offered to raise work.
    const viewerContext = await browser.newContext();
    const viewer = await viewerContext.newPage();
    await signIn(viewer, USERS.viewer);
    const viewerRow = panel(viewer, "Failed checks").getByRole("listitem").filter({ hasText: title });
    await expect(viewerRow.getByText("Needs follow-up", { exact: true })).toBeVisible();
    await expect(viewerRow.getByRole("link", { name: "Raise work order" })).toHaveCount(0);
    await viewerContext.close();

    await row.getByRole("link", { name: "Raise work order" }).click();
    await expect(page.getByRole("textbox", { name: "Title" })).toHaveValue(/^Fix: /);
    await page.getByRole("button", { name: "Raise work order" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Work order raised" })).toBeVisible();

    // Back on the inspection, a failure with work raised is locked as failed (D-037).
    await expect(firstCheck.getByRole("button", { name: "Pass" })).toBeDisabled();
    await expect(page.getByText("Work has been raised for this failure, so its result stays Fail.")).toBeVisible();

    // Back on the dashboard the flag is gone and the work is counted.
    await page.goto("/dashboard");
    expect(await figure(page, "Needs follow-up")).toBe(followUpsBefore);
    expect(await figure(page, "Open work orders")).toBe(openWorkBefore + 1);
    await expect(
      panel(page, "Failed checks").getByRole("listitem").filter({ hasText: title }).getByText("Needs follow-up"),
    ).toHaveCount(0);
  });

  test("speaks to the signed-in user", async ({ browser }) => {
    // The technician's own work is called out and links to their queue.
    const techContext = await browser.newContext();
    const tech = await techContext.newPage();
    await signIn(tech, USERS.technician);
    await tech.getByRole("link", { name: /assigned to you$/ }).click();
    await expect(tech).toHaveURL(/\/work-orders\?view=mine$/);
    await techContext.close();

    // A handover addressed to the inspector is marked and listed first.
    const inspectorContext = await browser.newContext();
    const inspector = await inspectorContext.newPage();
    await signIn(inspector, USERS.inspector);
    const handovers = panel(inspector, "Pending handovers").getByRole("listitem");
    await expect(handovers.first()).toContainText("Petrel LSA inspection is overdue");
    await expect(handovers.first()).toContainText("For you");
    await inspectorContext.close();
  });
});
