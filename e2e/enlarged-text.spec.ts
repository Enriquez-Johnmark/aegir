import { expect, test, type Page } from "@playwright/test";

import { signIn, USERS } from "./helpers";

// Enlarged text (WCAG 1.4.4 resize text, 1.4.10 reflow), in the two ways it happens (D-048):
// - the browser's default font size (Chrome: Settings → Appearance → Font size), which also
//   scales rem media queries; emulated through the DevTools protocol;
// - the page's root font size, which scales rem lengths but not media queries.
const PAGES = ["/dashboard", "/vessels", "/inspections", "/work-orders", "/handovers", "/audit", "/work-orders/new"];

async function enlargeDefaultFont(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Page.setFontSizes", { fontSizes: { standard: 32, fixed: 26 } });
}

async function sidewaysScroll(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

/** The sidebar's Work orders link, on screen: in the desktop rail, or in the phone sheet after opening it. */
async function expectNavigationReachable(page: Page) {
  const link = page.locator('[data-sidebar="sidebar"]').getByRole("link", { name: "Work orders", exact: true });
  if (!(await link.isVisible())) {
    await page.getByRole("button", { name: "Toggle Sidebar" }).click();
  }
  await expect(link).toBeInViewport();
}

test.describe("app shell with enlarged text", () => {
  for (const width of [412, 1024, 1360]) {
    test(`a 32px default font at ${width}px keeps the navigation reachable and nothing scrolls sideways`, async ({ page }) => {
      test.setTimeout(90_000);
      await page.setViewportSize({ width, height: 900 });
      await enlargeDefaultFont(page);
      await signIn(page, USERS.manager);
      for (const path of PAGES) {
        await page.goto(path);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        expect(await sidewaysScroll(page), path).toBe(0);
      }
      await page.goto("/dashboard");
      await expectNavigationReachable(page);
    });
  }

  for (const width of [768, 1024]) {
    test(`a 200% root font at ${width}px doesn't scroll sideways`, async ({ page }) => {
      test.setTimeout(90_000);
      await page.setViewportSize({ width, height: 900 });
      await signIn(page, USERS.manager);
      for (const path of PAGES) {
        await page.goto(path);
        await page.addStyleTag({ content: "html { font-size: 200% }" });
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        expect(await sidewaysScroll(page), path).toBe(0);
      }
      await expectNavigationReachable(page);
    });
  }
});
