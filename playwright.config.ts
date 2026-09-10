import { defineConfig, devices } from "@playwright/test";

/**
 * E2E suite for UNITIANS (demo mode — no Supabase env required).
 * Run: npm run test:e2e
 * Requires: npm run build && npm run start  OR  webServer below.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3010",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run start -- -p 3010",
    url: "http://127.0.0.1:3010",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 13"] } },
  ],
});
