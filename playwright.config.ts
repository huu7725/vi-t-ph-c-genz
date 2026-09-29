import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  workers: 2,
  reporter: "list",
  use: { baseURL: "http://127.0.0.1:5174", trace: "retain-on-failure" },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: [
    { command: 'npx tsx backend/src/tests/e2eServer.ts', url: 'http://127.0.0.1:5101/health', env: { FRONTEND_URL: 'http://localhost:5174' }, reuseExistingServer: false, timeout: 60000 },
    { command: 'npm run dev -w frontend -- --port 5174', url: 'http://127.0.0.1:5174', env: { API_TARGET: 'http://127.0.0.1:5101' }, reuseExistingServer: false, timeout: 60000 },
  ],
});
