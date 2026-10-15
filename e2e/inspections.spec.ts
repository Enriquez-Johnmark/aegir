import { expect, test, type Locator, type Page } from "@playwright/test";

import { signIn, USERS } from "./helpers";

// See vessels.spec.ts: hidden, still-mounted routes mean role locators or `visible`.
const visible = { visible: true } as const;

const TERN_VESSEL_ID = "a2000000-0000-4000-8000-000000000005";
const FJORD_SURVEY_ID = "a3000000-0000-4000-8000-000000000002";
const MERIDIAN_INSPECTION_ID = "b3000000-0000-4000-8000-000000000001";

function check(page: Page, position: number): Locator {
  return page.getByRole("main").getByRole("group", { name: `Result for check ${position}` });
}

test.describe("inspections", () => {
  test("an inspector schedules, conducts and completes an inspection", async ({ page }) => {
    await signIn(page, USERS.inspector);
    await page.goto(`/inspections/new?vessel=${TERN_VESSEL_ID}`);
    await expect(page.getByRole("heading", { name: "Schedule inspection", level: 1 })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Vessel" })).toContainText("Northwind Tern");
    // An inspector is assigned to the inspections they schedule unless they choose otherwise.
    await expect(page.getByRole("combobox", { name: "Inspector" })).toContainText(USERS.inspector.name);

    // A template fills the title and the checklist; a typed check is kept.
    await page.getByRole("button", { name: "Add from template" }).click();
    await page.getByRole("menuitem", { name: /Life-saving appliances inspection/ }).click();
    await expect(page.getByRole("textbox", { name: "Title" })).toHaveValue("Life-saving appliances inspection");
    await page.getByRole("button", { name: "Add check" }).click();
    // Category inputs suggest values (a datalist), so their role is combobox.
    await expect(page.getByRole("combobox", { name: "Check 5 category" })).toBeFocused();
    await page.getByRole("combobox", { name: "Check 5 category" }).fill("Hull & structure");
    await page.getByRole("textbox", { name: "Check 5: what to check" }).fill("Moorings secure and chafe-free");
    const title = `LSA check ${Date.now()}`;
    await page.getByRole("textbox", { name: "Title" }).fill(title);
    await page.getByRole("button", { name: "Schedule inspection" }).click();

    await expect(page).toHaveURL(/\/inspections\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("status").filter({ hasText: "Inspection scheduled" })).toBeVisible();
    await expect(page.getByRole("heading", { name: title, level: 1 })).toBeVisible();
    await expect(page.getByText("5 checks, none recorded yet.")).toBeVisible();

    // Results can only be recorded once the inspection is started.
    await expect(check(page, 1)).toHaveCount(0);
    await page.getByRole("button", { name: "Start inspection" }).click();
    await expect(check(page, 1)).toBeVisible();
    await expect(page.getByRole("button", { name: "Complete inspection" })).toBeDisabled();
    await expect(page.getByText("Record 5 more checks to complete the inspection.")).toBeVisible();

    // Pass and N/A save on tap.
    await check(page, 1).getByRole("button", { name: "Pass" }).click();
    await expect(page.getByText(/1 of 5 checked/)).toBeVisible();
    for (const position of [2, 3]) {
      await check(page, position).getByRole("button", { name: "Pass" }).click();
      await expect(page.getByText(new RegExp(`${position} of 5 checked`))).toBeVisible();
    }
    await check(page, 5).getByRole("button", { name: "N/A" }).click();
    await expect(page.getByText(/4 of 5 checked/)).toBeVisible();

    // A failure needs a finding and a severity before it saves.
    await check(page, 4).getByRole("button", { name: "Fail" }).click();
    const finding = page.getByRole("textbox", { name: "What did you find?" });
    await expect(finding).toBeFocused();
    await page.getByRole("button", { name: "Record failure" }).click();
    await expect(page.getByText("Describe what you found.")).toBeVisible();
    await expect(page.getByText("Choose how severe it is.")).toBeVisible();
    await finding.fill("Port lifebuoy light missing; bracket empty.");
    await page.getByRole("combobox", { name: "Severity" }).click();
    await page.getByRole("option", { name: /^High/ }).click();
    await page.getByRole("button", { name: "Record failure" }).click();
    await expect(page.getByText("Needs follow-up", { exact: true }).filter(visible)).toBeVisible();
    await expect(page.getByText(/5 of 5 checked/)).toBeVisible();

    await page.getByRole("button", { name: "Complete inspection" }).click();
    await expect(page.locator("main [data-slot=badge]", { hasText: "Completed" }).first()).toBeVisible();
    // Closed inspections are read-only: no result controls or lifecycle buttons.
    await expect(check(page, 1)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Cancel inspection" })).toHaveCount(0);
    await expect(page.getByText("1 needs follow-up", { exact: true }).filter(visible)).toBeVisible();
  });

  test("the schedule form explains what is missing", async ({ page }) => {
    await signIn(page, USERS.inspector);
    await page.goto("/inspections/new");
    await page.getByRole("textbox", { name: "Title" }).fill("Ad hoc");
    await page.getByRole("button", { name: "Schedule inspection" }).click();

    await expect(page.getByText("Choose a vessel.")).toBeVisible();
    await expect(page.getByText("Enter a category.")).toBeVisible();
    await expect(page.getByText("Describe what to check.")).toBeVisible();
    // Focus lands on the first problem.
    await expect(page.getByRole("combobox", { name: "Vessel" })).toBeFocused();
  });

  test("a viewer follows inspections but cannot change them", async ({ page }) => {
    await signIn(page, USERS.viewer);
    await page.goto("/inspections");
    await expect(page.getByRole("heading", { name: "Inspections", level: 1 })).toBeVisible();
    await expect(page.getByText(/open inspections? · \d+ overdue/).filter(visible)).toBeVisible();
    await expect(page.getByRole("link", { name: "Schedule inspection" })).toHaveCount(0);

    await page.goto(`/inspections/${FJORD_SURVEY_ID}`);
    await expect(page.getByRole("heading", { name: "Pre-maintenance survey", level: 1 })).toBeVisible();
    await expect(page.getByText("Work order: Repair main engine fuel pump seal")).toBeVisible();
    await expect(page.getByRole("button", { name: "Pass" })).toHaveCount(0);

    await page.goto("/inspections/new");
    await expect(page.getByText("You can't schedule inspections").filter(visible)).toBeVisible();
  });

  test("another organization's inspection is not found", async ({ page }) => {
    await signIn(page, USERS.manager);
    await page.goto(`/inspections/${MERIDIAN_INSPECTION_ID}`);
    await expect(page.getByText("Inspection not found").filter(visible)).toBeVisible();
    await expect(page.getByText("Cargo tank inspection")).toHaveCount(0);
  });
});
