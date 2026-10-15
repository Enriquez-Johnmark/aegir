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
    // Completion is offered at the top and at the end of the checklist; both wait for every check.
    await expect(page.getByRole("button", { name: "Complete inspection" })).toHaveCount(2);
    for (const button of await page.getByRole("button", { name: "Complete inspection" }).all()) {
      await expect(button).toBeDisabled();
    }
    // Each Complete button explains why it is disabled.
    await expect(page.getByText("Record 5 more checks to complete the inspection.")).toHaveCount(2);

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
    // Severity is a set of choice cards carrying the full guidance.
    await page.getByRole("radio", { name: /^High/ }).check();
    await page.getByRole("button", { name: "Record failure" }).click();
    await expect(page.getByText("Needs follow-up", { exact: true }).filter(visible)).toBeVisible();
    await expect(page.getByText(/5 of 5 checked/)).toBeVisible();

    // A recorded failure reads as a record until someone chooses to edit it.
    await expect(page.getByRole("button", { name: "Edit finding" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "What did you find?" })).toHaveCount(0);

    // One tap never replaces a recorded failure: it asks first, and keeping it changes nothing.
    await check(page, 4).getByRole("button", { name: "Pass" }).click();
    await expect(page.getByText(/Replace this failure with Pass\?/)).toBeVisible();
    await page.getByRole("button", { name: "Keep the failure" }).click();
    await expect(page.getByText(/Replace this failure/)).toHaveCount(0);
    await expect(page.getByText("Port lifebuoy light missing; bracket empty.").filter(visible)).toBeVisible();

    // Completion waits while a finding is open for editing, so it can't drop the edit.
    await page.getByRole("button", { name: "Edit finding" }).click();
    for (const button of await page.getByRole("button", { name: "Complete inspection" }).all()) {
      await expect(button).toBeDisabled();
    }
    await expect(page.getByText("Save or cancel the open finding to complete the inspection.").first()).toBeVisible();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(page.getByRole("button", { name: "Complete inspection" }).last()).toBeEnabled();

    // Completion is final, so it is confirmed, and the dialog names the failure still without work.
    await page.getByRole("button", { name: "Complete inspection" }).last().click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toContainText("3 passed · 1 failed · 1 N/A");
    await expect(dialog).toContainText("1 failed check has no work order yet");
    await dialog.getByRole("button", { name: "Complete inspection" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Inspection completed · 1 failed check needs a work order" }),
    ).toBeVisible();
    await expect(page.locator("main [data-slot=badge]", { hasText: "Completed" }).first()).toBeVisible();
    // Closed inspections are read-only: no result controls or lifecycle buttons.
    await expect(check(page, 1)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Cancel inspection" })).toHaveCount(0);
    await expect(page.getByText("1 needs follow-up", { exact: true }).filter(visible)).toBeVisible();

    // Dismiss the completion notice: the next notice on this (still mounted) page must show anyway.
    await page.getByRole("button", { name: "Dismiss" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Inspection completed" })).toHaveCount(0);

    // The follow-up: raise a work order straight from the failed check.
    await page.getByRole("link", { name: "Raise work order" }).click();
    await expect(page.getByText("Following up a failed check on Northwind Tern")).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Title" })).toHaveValue(/^Fix: /);
    await expect(page.getByRole("combobox", { name: "Priority" })).toContainText("High");
    await page.getByRole("button", { name: "Raise work order" }).click();
    // Raising it returns to the inspection, where the check now links to its work order.
    await expect(page.getByRole("status").filter({ hasText: "Work order raised" })).toBeVisible();
    await expect(page.getByRole("heading", { name: title, level: 1 })).toBeVisible();
    await expect(page.getByText("Needs follow-up", { exact: true })).toHaveCount(0);
    await expect(page.getByText(/^Work order:/).filter(visible)).toBeVisible();
    await page.getByRole("link", { name: "View work order" }).click();
    await expect(page.getByRole("heading", { name: /^Fix: /, level: 1 })).toBeVisible();
    await expect(page.getByText("Port lifebuoy light missing; bracket empty.").filter(visible).first()).toBeVisible();
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
