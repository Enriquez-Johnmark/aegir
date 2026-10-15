import { expect, test, type Locator, type Page } from "@playwright/test";

import { randomImo, signIn, USERS } from "./helpers";

// Next 16 (Cache Components) keeps visited routes mounted but hidden: role locators
// exclude hidden elements, other locators use `visible`.
const visible = { visible: true } as const;

const SEED_INSPECTION_ID = "a3000000-0000-4000-8000-000000000001";

/** "Open → In progress": the arrow is hidden from screen readers, which hear "to". */
function moved(from: string, to: string) {
  return new RegExp(`${from} →\\s*to\\s*${to}`);
}

/** Top-level entries (a status entry nests its other changed fields in a list of its own). */
function entriesIn(scope: Locator) {
  return scope.locator("ol > li").filter(visible);
}

/** The History card on a record page. */
function historyCard(page: Page) {
  return page
    .getByRole("main")
    .locator("[data-slot=card]")
    .filter({ has: page.getByRole("heading", { name: "History", level: 2 }) });
}

test.describe("audit log", () => {
  test("a manager's changes show on the record and, for the auditor, in the log", async ({ page, browser, isMobile }) => {
    test.slow(); // two users, two sign-ins and two saves
    const imo = randomImo();
    const name = `Audit Test ${imo}`;

    await signIn(page, USERS.manager);
    await page.goto("/vessels/new");
    await page.getByRole("textbox", { name: "Vessel name" }).fill(name);
    await page.getByRole("textbox", { name: "IMO number" }).fill(imo);
    await page.getByRole("textbox", { name: "Flag state" }).fill("Malta");
    await page.getByRole("combobox", { name: "Vessel type" }).click();
    await page.getByRole("option", { name: "Tug" }).click();
    await page.getByRole("button", { name: "Add vessel" }).click();
    await expect(page.getByRole("heading", { name: new RegExp(name), level: 1 })).toBeVisible();

    await page.getByRole("link", { name: "Edit vessel" }).click();
    await page.getByRole("textbox", { name: "Flag state" }).fill("Panama");
    await page.getByRole("combobox", { name: "Status" }).click();
    await page.getByRole("option", { name: "Laid up" }).click();
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Changes saved" })).toBeVisible();

    // The record's own history, oldest first, attributed to the real actor.
    const entries = entriesIn(historyCard(page));
    await expect(entries).toHaveCount(2);
    await expect(entries.nth(0)).toContainText("Added");
    await expect(entries.nth(0)).toContainText(USERS.manager.name);
    await expect(entries.nth(1)).toContainText(moved("Status: Active", "Laid up"));
    await expect(entries.nth(1)).toContainText(moved("Flag: “Malta”", "“Panama”"));

    // The auditor finds both changes in the organization's log, by type and person.
    const auditor = await (await browser.newContext()).newPage();
    await signIn(auditor, USERS.viewer);
    // On phones the sidebar is a closed sheet.
    if (isMobile) await auditor.getByRole("button", { name: "Toggle Sidebar" }).click();
    await auditor.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Audit log" }).click();
    await expect(auditor.getByRole("heading", { name: "Audit log", level: 1 })).toBeVisible();
    // Following a link closes the phone menu sheet, so the page isn't left covered.
    await expect(auditor.getByRole("dialog", { name: "Sidebar" })).toHaveCount(0);

    await auditor.getByRole("combobox", { name: "Record type" }).click();
    await auditor.getByRole("option", { name: "Vessels" }).click();
    await expect(auditor).toHaveURL(/\/audit\?type=vessels$/);
    await auditor.getByRole("combobox", { name: "Changed by" }).click();
    await auditor.getByRole("option", { name: USERS.manager.name }).click();
    await expect(auditor).toHaveURL(/type=vessels&actor=a1000000-0000-4000-8000-000000000002$/);

    const logged = entriesIn(auditor.getByRole("main")).filter({ hasText: name });
    await expect(logged).toHaveCount(2);
    await expect(logged.first()).toContainText(moved("Status: Active", "Laid up")); // newest first
    await expect(logged.last()).toContainText("Added");
    await logged.first().getByRole("link", { name }).click();
    await expect(auditor.getByRole("heading", { name: new RegExp(name), level: 1 })).toBeVisible();
    await auditor.context().close();
  });

  test("pages through older changes and back", async ({ page }) => {
    await signIn(page, USERS.viewer);
    // Seed events have no actor and nothing else writes them, so this view is stable across runs.
    await page.goto("/audit?actor=system");
    const entries = entriesIn(page.getByRole("main"));
    await expect(entries).toHaveCount(50);
    await expect(page.getByText("Showing the newest 50 changes · by System (seed data)").filter(visible)).toBeVisible();

    await page.getByRole("link", { name: "Older changes" }).click();
    await expect(page).toHaveURL(/\/audit\?actor=system&before=\d+$/);
    await expect(page.getByText(/Showing \d+ changes?, older than the previous page/).filter(visible)).toBeVisible();
    // The oldest seed events are the memberships, written first.
    await expect(entries.filter({ hasText: "Joined as Administrator" })).toHaveCount(1);
    await expect(page.getByRole("link", { name: "Older changes" })).toHaveCount(0);

    // A new filter starts again from the newest page.
    await page.getByRole("combobox", { name: "Record type" }).click();
    await page.getByRole("option", { name: "Members" }).click();
    await expect(page).toHaveURL(/\/audit\?actor=system&type=members$/);
    await expect(entries.filter({ hasText: "Joined as" })).toHaveCount(6);

    await page.goto("/audit?actor=system&before=1");
    await expect(page.getByText("No changes · by System (seed data)").filter(visible)).toBeVisible();
    await page.getByRole("link", { name: "Show all changes" }).click();
    await expect(page).toHaveURL(/\/audit$/);
  });

  test("shows only the organization's own history and ignores bad URLs", async ({ page }) => {
    await signIn(page, USERS.viewer);
    await page.goto("/audit?type=members");
    await expect(entriesIn(page.getByRole("main")).filter({ hasText: "Joined as Viewer" })).toHaveCount(1);
    await expect(page.getByRole("main").getByText(USERS.viewer.name).first()).toBeVisible();
    // Unfiltered: a hidden leak is still a leak.
    await expect(page.getByText(/Meridian|Owen Price|Sofia Marin/)).toHaveCount(0);

    await page.goto("/audit?type=work_orders&actor=admin&before=abc");
    await expect(page.getByRole("combobox", { name: "Record type" })).toContainText("All records");
    await expect(page.getByRole("combobox", { name: "Changed by" })).toContainText("Everyone");
    await expect(page.getByText("Showing the newest 50 changes", { exact: true }).filter(visible)).toBeVisible();
    await expect(page.getByRole("main").getByText("work_orders")).toHaveCount(0);

    // An unknown person id still filters, and the control says so instead of "Everyone".
    await page.goto("/audit?actor=a1000000-0000-4000-8000-0000000000ff");
    await expect(page.getByRole("combobox", { name: "Changed by" })).toContainText("Former or unknown person");
    await expect(page.getByText("No changes · by a former or unknown person").filter(visible)).toBeVisible();
  });

  test("an inspection's history includes its checks, by name", async ({ page }) => {
    await signIn(page, USERS.viewer);
    await page.goto(`/inspections/${SEED_INSPECTION_ID}`);
    const history = historyCard(page);
    const entries = entriesIn(history);
    await expect(entries.first()).toContainText("Scheduled for 25 Sept 2026");
    // A check recorded as failed when it was created says so in its headline.
    await expect(entries.filter({ hasText: "Portable fire extinguishers in date and accessible" })).toContainText(
      "Added to the checklist as Fail (High severity)",
    );
    await expect(history).toContainText("Changes loaded with the demo data show as System (seed data)");

    await expect(entries.last()).toContainText(moved("Status: In progress", "Completed"));
    await expect(entries.last()).toContainText("System (seed data)");

    // In the log, a check names its inspection and vessel, and the whole entry is the link.
    await page.goto("/audit?actor=system&type=checks");
    await expect(
      page.getByRole("link", {
        name: "Portable fire extinguishers in date and accessible · Inspection check · Quarterly safety inspection · Northwind Aurora",
      }),
    ).toBeVisible();
  });
});
