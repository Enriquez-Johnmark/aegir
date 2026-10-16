import { expect, test, type Browser } from "@playwright/test";

import { signIn, USERS } from "./helpers";

// See vessels.spec.ts: hidden, still-mounted routes mean role locators or `visible`.
const visible = { visible: true } as const;

const MERIDIAN_WORK_ORDER_ID = "b4000000-0000-4000-8000-000000000001";

async function signedInPage(browser: Browser, user: (typeof USERS)[keyof typeof USERS]) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, user);
  return page;
}

test.describe("work orders", () => {
  test("a manager raises work and the assignee carries it through to completion", async ({ browser }) => {
    // Seeded work orders are left untouched: each run creates its own.
    const manager = await signedInPage(browser, USERS.manager);
    await manager.goto("/work-orders/new");
    const title = `Replace mooring line ${Date.now()}`;
    await manager.getByRole("combobox", { name: "Vessel" }).click();
    await manager.getByRole("option", { name: "Northwind Tern" }).click();
    await manager.getByRole("textbox", { name: "Title" }).fill(title);
    await manager.getByRole("combobox", { name: "Priority" }).click();
    await manager.getByRole("option", { name: "High" }).click();
    await manager.getByRole("combobox", { name: "Assignee" }).click();
    await manager.getByRole("option", { name: USERS.technician.name }).click();
    await manager.getByRole("button", { name: "Raise work order" }).click();
    await expect(manager.getByRole("status").filter({ hasText: "Work order raised" })).toBeVisible();
    const url = manager.url();
    await manager.context().close();

    const tech = await signedInPage(browser, USERS.technician);
    await tech.goto(url);
    await expect(tech.getByRole("heading", { name: title, level: 1 })).toBeVisible();
    // Assignees move the work along but can't edit its details.
    await expect(tech.getByRole("link", { name: "Edit details" })).toHaveCount(0);

    await tech.getByRole("button", { name: "Start work" }).click();
    await expect(tech.getByRole("button", { name: "Mark completed" })).toBeVisible();

    // Blocking needs a reason.
    await tech.getByRole("button", { name: "Mark blocked" }).click();
    const reason = tech.getByRole("textbox", { name: "What is blocking the work?" });
    await expect(reason).toBeFocused();
    await tech.getByRole("button", { name: "Mark blocked" }).click();
    await expect(tech.getByText("Say what is blocking the work, so someone can unblock it.").filter(visible)).toBeVisible();
    await reason.fill("Waiting for a new line from the chandler.");
    await tech.getByRole("button", { name: "Mark blocked" }).click();
    await expect(tech.getByRole("button", { name: "Resume work" })).toBeVisible();
    await expect(tech.getByText("Waiting for a new line from the chandler.").filter(visible).first()).toBeVisible();

    await tech.getByRole("button", { name: "Resume work" }).click();
    await tech.getByRole("button", { name: "Mark completed" }).click();
    const dialog = tech.getByRole("alertdialog");
    await expect(dialog).toContainText("closed for good");
    await dialog.getByRole("button", { name: "Mark completed" }).click();

    await expect(tech.locator("main [data-slot=badge]", { hasText: "Completed" }).filter(visible).first()).toBeVisible();
    await expect(tech.getByRole("button", { name: "Start work" })).toHaveCount(0);
    // The history comes from the audit log, attributed to the real actors.
    const history = tech.getByRole("main").getByRole("listitem").filter(visible);
    await expect(history.filter({ hasText: "Raised" }).first()).toContainText(USERS.manager.name);
    await expect(history.filter({ hasText: "Blocked" }).first()).toContainText(USERS.technician.name);
    // The arrow is hidden from screen readers, who hear "to".
    await expect(history.filter({ hasText: /In progress\s*→\s*to\s*Completed/ })).toHaveCount(1);
    await tech.context().close();
  });

  test("the form explains what is missing", async ({ page }) => {
    await signIn(page, USERS.manager);
    await page.goto("/work-orders/new");
    await page.getByRole("button", { name: "Raise work order" }).click();
    await expect(page.getByText("Choose a vessel.").filter(visible)).toBeVisible();
    await expect(page.getByText("Give the work order a title of at least 3 characters.").filter(visible)).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Vessel" })).toBeFocused();
  });

  test("a viewer follows work orders but cannot change them", async ({ page }) => {
    await signIn(page, USERS.viewer);
    await page.goto("/work-orders");
    await expect(page.getByRole("heading", { name: "Work orders", level: 1 })).toBeVisible();
    await expect(page.getByText(/open work orders? ·/).filter(visible)).toBeVisible();
    await expect(page.getByRole("link", { name: "Raise work order" })).toHaveCount(0);

    await page.getByRole("link", { name: "Repair main engine fuel pump seal" }).filter(visible).click();
    await expect(page.getByRole("heading", { name: "Repair main engine fuel pump seal", level: 1 })).toBeVisible();
    await expect(page.getByText("Awaiting replacement seal kit").filter(visible).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Resume work" })).toHaveCount(0);

    await page.goto("/work-orders/new");
    await expect(page.getByText("You can't raise work orders").filter(visible)).toBeVisible();
  });

  test("another organization's work order is not found", async ({ page }) => {
    await signIn(page, USERS.manager);
    await page.goto(`/work-orders/${MERIDIAN_WORK_ORDER_ID}`);
    await expect(page.getByText("Work order not found").filter(visible)).toBeVisible();
    await expect(page.getByText("Recalibrate tank 3P level gauge")).toHaveCount(0); // unfiltered: a hidden leak is still a leak
  });
});
