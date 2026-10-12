import { expect, test } from "@playwright/test";

import { randomImo, signIn, USERS } from "./helpers";

// Next 16 (Cache Components) keeps visited routes mounted but hidden, and streaming can
// briefly duplicate content: use role locators (hidden elements excluded) or `visible`.
const visible = { visible: true } as const;

const MERIDIAN_VESSEL_ID = "b2000000-0000-4000-8000-000000000001";

test.describe("vessels", () => {
  test("lists only the signed-in organization's fleet and filters it", async ({ page }) => {
    await signIn(page, USERS.viewer);
    await page.goto("/vessels");

    await expect(page.getByRole("heading", { name: "Vessels", level: 1 })).toBeVisible();
    // Watch list: the vessel with critical, blocked work leads by default.
    const main = page.getByRole("main");
    const firstRow = main.getByRole("row").nth(1).or(main.getByRole("listitem").first()).filter(visible);
    await expect(firstRow.first()).toContainText("Northwind Fjord");
    await expect(firstRow.first()).toContainText("1 critical");
    await expect(page.getByRole("link", { name: "Northwind Aurora" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Northwind Fjord" })).toBeVisible();
    await expect(page.getByText("Meridian Star").filter(visible)).toHaveCount(0);

    await page.getByRole("searchbox", { name: /search vessels/i }).fill("Fjord");
    await expect(page).toHaveURL(/q=Fjord/);
    await expect(page.getByRole("link", { name: "Northwind Fjord" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Northwind Aurora" })).toHaveCount(0);

    await page.getByRole("searchbox", { name: /search vessels/i }).fill("no such vessel");
    await expect(page.getByText(/No vessels match “no such vessel”/).filter(visible)).toBeVisible();

    // Clearing filters also clears the search box.
    await page.getByRole("link", { name: "Clear filters" }).click();
    await expect(page.getByRole("link", { name: "Northwind Aurora" })).toBeVisible();
    await expect(page.getByRole("searchbox", { name: /search vessels/i })).toHaveValue("");
  });

  test("shows a vessel's open work and inspection history", async ({ page }) => {
    await signIn(page, USERS.viewer);
    await page.goto("/vessels");
    await page.getByRole("link", { name: "Northwind Fjord" }).click();

    await expect(page.getByRole("heading", { name: /Northwind Fjord/, level: 1 })).toBeVisible();
    await expect(page.getByText("Repair main engine fuel pump seal").filter(visible)).toBeVisible();
    await expect(page.getByText("Blocked", { exact: true }).filter(visible)).toBeVisible();
    await expect(page.getByText("Pre-maintenance survey").filter(visible)).toBeVisible();
    // Viewers get no edit control; the breadcrumb leads back to the list.
    await expect(page.getByRole("link", { name: "Edit vessel" })).toHaveCount(0);
    await page.getByRole("navigation", { name: "breadcrumb" }).getByRole("link", { name: "Vessels" }).click();
    await expect(page).toHaveURL(/\/vessels$/);
  });

  test("does not reveal another organization's vessel", async ({ page }) => {
    await signIn(page, USERS.viewer);
    await page.goto(`/vessels/${MERIDIAN_VESSEL_ID}`);
    await expect(page.getByText("Vessel not found").filter(visible)).toBeVisible();
    await expect(page.getByText("Meridian Star").filter(visible)).toHaveCount(0);
  });

  test("blocks technicians from adding vessels", async ({ page }) => {
    await signIn(page, USERS.technician);
    await page.goto("/vessels");
    await expect(page.getByRole("link", { name: "Northwind Aurora" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Add vessel" })).toHaveCount(0);

    await page.goto("/vessels/new");
    await expect(page.getByText("You can't add vessels").filter(visible)).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Vessel name" })).toHaveCount(0);
  });

  test("lets a manager add and then edit a vessel", async ({ page }) => {
    const imo = randomImo();
    const name = `Northwind Test ${imo}`;

    await signIn(page, USERS.manager);
    await page.goto("/vessels");
    await page.getByRole("link", { name: "Add vessel" }).click();
    await expect(page).toHaveURL(/\/vessels\/new$/);

    // Server-side validation: a wrong IMO check digit is explained.
    await page.getByRole("textbox", { name: "Vessel name" }).fill(name);
    await page.getByRole("textbox", { name: "IMO number" }).fill(`${imo.slice(0, 6)}${(Number(imo[6]) + 1) % 10}`);
    await page.getByRole("textbox", { name: "Flag state" }).fill("Malta");
    await page.getByRole("button", { name: "Add vessel" }).click();
    await expect(page.getByText(/check digit is wrong/).filter(visible)).toBeVisible();
    // Focus lands on the first invalid field.
    await expect(page.getByRole("textbox", { name: "IMO number" })).toBeFocused();
    await expect(page.getByText("Choose a vessel type.").filter(visible)).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Vessel name" })).toHaveValue(name);

    await page.getByRole("textbox", { name: "IMO number" }).fill(imo);
    await page.getByRole("combobox", { name: "Vessel type" }).click();
    await page.getByRole("option", { name: "Tug" }).click();
    await page.getByRole("textbox", { name: "Year built" }).fill("2019");
    await page.getByRole("button", { name: "Add vessel" }).click();

    await expect(page.getByRole("heading", { name: new RegExp(name), level: 1 })).toBeVisible();
    await expect(page.getByText(imo, { exact: true }).filter(visible)).toBeVisible();
    await expect(page.getByText("No open work").filter(visible)).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: "Vessel added" })).toBeVisible();
    await expect(page).not.toHaveURL(/saved=/);

    await page.getByRole("link", { name: "Edit vessel" }).click();
    await expect(page.getByRole("textbox", { name: "Vessel name" })).toHaveValue(name);
    await page.getByRole("textbox", { name: "Vessel name" }).fill(`${name} II`);
    await page.getByRole("combobox", { name: "Status" }).click();
    await page.getByRole("option", { name: "Laid up" }).click();
    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(page.getByRole("heading", { name: new RegExp(`${name} II`), level: 1 })).toBeVisible();
    await expect(page.getByText("Laid up", { exact: true }).filter(visible)).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: "Changes saved" })).toBeVisible();

    // A duplicate IMO in the same fleet is rejected with a field error.
    await page.goto("/vessels/new");
    await page.getByRole("textbox", { name: "Vessel name" }).fill("Duplicate");
    await page.getByRole("textbox", { name: "IMO number" }).fill(imo);
    await page.getByRole("textbox", { name: "Flag state" }).fill("Malta");
    await page.getByRole("combobox", { name: "Vessel type" }).click();
    await page.getByRole("option", { name: "Tug" }).click();
    await page.getByRole("button", { name: "Add vessel" }).click();
    await expect(page.getByText("A vessel with this IMO number is already in your fleet.").filter(visible)).toBeVisible();
  });
});
