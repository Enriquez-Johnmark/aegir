import { expect, test } from "@playwright/test";

import { signIn, USERS } from "./helpers";

// The "All" views used to fall back to the default: the view value "all" collided
// with the filters' "no filter" token, which removes the key from the URL.
const LISTS = [
  { path: "/work-orders", all: "All work orders" },
  { path: "/inspections", all: "All inspections" },
  { path: "/handovers", all: "All handovers" },
] as const;

test.describe("list filters", () => {
  test("every list's 'All' view can be chosen and sticks", async ({ page }) => {
    await signIn(page, USERS.manager);
    for (const list of LISTS) {
      await page.goto(list.path);
      await page.getByRole("combobox", { name: "Show" }).click();
      await page.getByRole("option", { name: list.all }).click();
      await expect(page, list.path).toHaveURL(new RegExp(`${list.path}\\?view=all$`));
      await expect(page.getByRole("combobox", { name: "Show" }), list.path).toContainText(list.all);
    }
  });

  test("filters never show raw values from the URL", async ({ page }) => {
    await signIn(page, USERS.manager);
    await page.goto("/handovers?view=bogus&vessel=not-a-vessel");
    await expect(page.getByRole("combobox", { name: "Show" })).toContainText("Pending (yours first)");
    await expect(page.getByRole("combobox", { name: "Vessel" })).toContainText("All vessels");
    await expect(page.getByRole("main").getByText("bogus")).toHaveCount(0);
  });
});
