import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30000,
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: "http://127.0.0.1:43174",
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "off"
  },
  projects: [
    {
      name: "chrome",
      use: {
        browserName: "chromium",
        channel: "chrome"
      }
    }
  ],
  webServer: {
    command: "python3 -m http.server 43174",
    url: "http://127.0.0.1:43174",
    reuseExistingServer: !process.env.CI,
    timeout: 30000
  }
});
