import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

/**
 * E2E tests run against a production build and the LOCAL Supabase stack with
 * seed data (`npm run db:start && npm run db:reset`). They never touch a
 * remote project.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  // Serial locally: the full Supabase stack + browsers saturate a typical laptop.
  workers: process.env.CI ? 2 : 1,
  expect: { timeout: 10_000 },
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `npm run build && npm run start -- --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
