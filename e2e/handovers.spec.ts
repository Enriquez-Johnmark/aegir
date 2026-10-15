import { expect, test, type Browser } from "@playwright/test";

import { signIn, USERS } from "./helpers";

// Hidden, still-mounted or briefly duplicated streamed content can match too (D-030).
const visible = { visible: true } as const;

// Seed: the OWS alarm work order on Northwind Fjord is assigned to Tomas (technician).
const OWS_WORK_ORDER_ID = "a4000000-0000-4000-8000-000000000003";
// Seed: "Petrel LSA inspection is overdue", pending, from Marcus to Ingrid.
const PETREL_HANDOVER_ID = "a5000000-0000-4000-8000-000000000003";
const MERIDIAN_HANDOVER_ID = "b5000000-0000-4000-8000-000000000001";

async function signedInPage(browser: Browser, user: (typeof USERS)[keyof typeof USERS]) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, user);
  return page;
}

test.describe("handovers", () => {
  test("a technician hands a job over and only the recipient can acknowledge it", async ({ browser }) => {
    const tech = await signedInPage(browser, USERS.technician);
    await tech.goto(`/work-orders/${OWS_WORK_ORDER_ID}`);
    await tech.getByRole("link", { name: "Hand over" }).click();
    await expect(tech.getByText("Handing over a work order on Northwind Fjord").filter(visible)).toBeVisible();

    const summary = `End of shift: OWS alarm ${Date.now()}`;
    await tech.getByRole("combobox", { name: "Hand over to" }).click();
    await tech.getByRole("option", { name: USERS.manager.name }).click();
    await tech.getByRole("textbox", { name: "Summary" }).fill(summary);
    await tech.getByRole("textbox", { name: "Outstanding tasks" }).fill("Sensor rewired; test discharge still to do.");
    await tech.getByRole("button", { name: "Hand over" }).click();

    await expect(tech.getByRole("status").filter({ hasText: "Handover sent" })).toBeVisible();
    await expect(tech.getByRole("heading", { name: summary, level: 1 })).toBeVisible();
    // The sender can't acknowledge their own handover.
    await expect(tech.getByRole("button", { name: "Acknowledge handover" })).toHaveCount(0);
    await expect(tech.getByText(`Waiting for ${USERS.manager.name} to acknowledge it.`, { exact: false }).filter(visible)).toBeVisible();
    const url = tech.url();
    await tech.context().close();

    // The recipient sees it on the dashboard, addressed to them, and acknowledges it.
    const manager = await signedInPage(browser, USERS.manager);
    const row = manager.getByRole("region", { name: "Pending handovers" }).getByRole("listitem").filter({ hasText: summary });
    await expect(row.getByText("For you").filter(visible)).toBeVisible();
    await row.getByRole("link", { name: summary }).click();
    await expect(manager).toHaveURL(url.replace(/\?.*$/, ""));
    await manager.getByRole("button", { name: "Acknowledge handover" }).click();
    await expect(manager.getByRole("status").filter({ hasText: "Handover acknowledged" })).toBeVisible();
    await expect(manager.getByRole("button", { name: "Acknowledge handover" })).toHaveCount(0);
    await expect(manager.locator("main [data-slot=badge]", { hasText: "Acknowledged" }).first()).toBeVisible();
    await manager.context().close();
  });

  test("the form explains what is missing", async ({ page }) => {
    await signIn(page, USERS.manager);
    await page.goto("/handovers/new");
    await page.getByRole("button", { name: "Hand over" }).click();
    await expect(page.getByText("Choose the vessel this handover is about.").filter(visible)).toBeVisible();
    await expect(page.getByText("Choose who takes this over.").filter(visible)).toBeVisible();
    await expect(page.getByText("Sum it up in at least 3 characters.").filter(visible)).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Vessel" })).toBeFocused();
  });

  test("a viewer follows handovers but can't send or acknowledge them", async ({ page }) => {
    await signIn(page, USERS.viewer);
    await page.goto("/handovers");
    await expect(page.getByRole("heading", { name: "Handovers", level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: "New handover" })).toHaveCount(0);

    await page.goto(`/handovers/${PETREL_HANDOVER_ID}`);
    await expect(page.getByRole("heading", { name: "Petrel LSA inspection is overdue", level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: "Acknowledge handover" })).toHaveCount(0);

    await page.goto("/handovers/new");
    await expect(page.getByText("You can't hand work over").filter(visible)).toBeVisible();
  });

  test("the inspector sees the handover waiting for her", async ({ page }) => {
    await signIn(page, USERS.inspector);
    await page.goto("/handovers?view=for-you");
    await expect(page.getByRole("main").getByRole("link", { name: "Petrel LSA inspection is overdue" })).toBeVisible();
  });

  test("another organization's handover is not found", async ({ page }) => {
    await signIn(page, USERS.manager);
    await page.goto(`/handovers/${MERIDIAN_HANDOVER_ID}`);
    await expect(page.getByText("Handover not found").filter(visible)).toBeVisible();
    // Unfiltered on purpose: none of its content may reach the page, hidden or not.
    await expect(page.getByText("Tank 3P gauge recalibration")).toHaveCount(0);
  });
});
