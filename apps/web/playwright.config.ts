import { defineConfig, devices } from "@playwright/test";

// Browser test of the checkout flow (phases.md Phase 7). Runs against the
// built API (:4100) and website (:3000) on a seeded, migrated database —
// never Supabase. CI starts both servers through `webServer` below.
const apiEnv = {
  PORT: "4100",
  NODE_ENV: "test",
  DATABASE_URL: process.env.E2E_DATABASE_URL ?? "",
  JWT_ACCESS_SECRET: "e2e-browser-secret-not-used-anywhere-else-01",
  FRONTEND_ORIGIN: "http://localhost:3000",
};

export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  expect: { timeout: 20_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    launchOptions: process.env.PW_CHROMIUM_PATH
      ? { executablePath: process.env.PW_CHROMIUM_PATH }
      : {},
  },
  projects: [{ name: "mobile", use: { ...devices["Pixel 7"] } }],
  webServer: process.env.E2E_NO_SERVER
    ? undefined
    : [
        {
          command: "node dist/main",
          cwd: "../api",
          url: "http://localhost:4100/api/v1/health",
          env: apiEnv,
          timeout: 120_000,
          reuseExistingServer: !process.env.CI,
        },
        {
          command: "bun run start",
          url: "http://localhost:3000",
          env: { API_PROXY_TARGET: "http://localhost:4100/api/v1" },
          timeout: 120_000,
          reuseExistingServer: !process.env.CI,
        },
      ],
});
