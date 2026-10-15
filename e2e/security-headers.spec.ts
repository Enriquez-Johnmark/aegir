import { expect, test } from "@playwright/test";

import { signIn, USERS } from "./helpers";

test.describe("security headers (D-039)", () => {
  test("every page carries the CSP and anti-framing headers", async ({ request }) => {
    for (const path of ["/", "/login"]) {
      const response = await request.get(path);
      const headers = response.headers();
      expect(headers["content-security-policy"], path).toContain("frame-ancestors 'none'");
      expect(headers["content-security-policy"], path).toContain("object-src 'none'");
      expect(headers["x-frame-options"], path).toBe("DENY");
      expect(headers["x-content-type-options"], path).toBe("nosniff");
      expect(headers["referrer-policy"], path).toBe("strict-origin-when-cross-origin");
    }
  });

  test("the policy blocks nothing the app needs", async ({ page }) => {
    const violations: string[] = [];
    page.on("console", (message) => {
      if (/Content Security Policy|Refused to (load|execute|apply|connect|frame)/i.test(message.text())) {
        violations.push(message.text());
      }
    });

    // Sign-in form (a Server Action), the streamed dashboard, lists, a record with client components.
    await signIn(page, USERS.manager);
    for (const path of ["/dashboard", "/vessels", "/inspections", "/work-orders", "/work-orders/new"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }
    // A client-side interaction (Base UI select popup) still works under the policy.
    await page.getByRole("combobox", { name: "Priority" }).click();
    await expect(page.getByRole("option", { name: "High" })).toBeVisible();

    expect(violations).toEqual([]);
  });
});
