import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./apps/web/deployed-e2e",
  outputDir: "./test-results/playwright-development",
  fullyParallel: false,
  forbidOnly: true,
  retries: 1,
  workers: 1,
  timeout: 20 * 60 * 1_000,
  reporter: [
    ["github"],
    ["html", { outputFolder: "playwright-report-development", open: "never" }],
  ],
  use: {
    baseURL: process.env.DEV_BASE_URL ?? "https://oss-knowledge-base-dev.pages.dev",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "development-chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
