import { defineConfig, devices } from "@playwright/test";

// End-to-end tests (architecture §8.2.10) against the dev server and an in-memory
// replica set started by tests/e2e/start-server.mjs.
const port = 3100;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  workers: 1,
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "node tests/e2e/start-server.mjs",
    // A static file: every page redirects or 404s until sign-in exists.
    url: `http://localhost:${port}/avatars/1.png`,
    timeout: 180_000,
    reuseExistingServer: false,
  },
});
