import { defineConfig } from "@playwright/test";

const E2E_HOST = "127.0.0.1";
const E2E_PORT = Number.parseInt(process.env.E2E_PORT ?? "4273", 10);
const E2E_BASE_URL = `http://${E2E_HOST}:${E2E_PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: E2E_BASE_URL,
    trace: "on-first-retry",
    video: "off",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: `npm run dev -- --host ${E2E_HOST} --port ${E2E_PORT} --strictPort`,
    url: E2E_BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
});
