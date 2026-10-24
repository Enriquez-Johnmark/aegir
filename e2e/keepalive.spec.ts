import { expect, test } from "@playwright/test";

// The database keep-alive that Vercel Cron calls once a day (D-052): public, signed
// out, never cached, and it says only whether the database answered.
test("the keep-alive reaches the database signed out and is never cached", async ({ request }) => {
  const response = await request.get("/api/keepalive", { maxRedirects: 0 });
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(await response.json()).toEqual({ ok: true });
});
