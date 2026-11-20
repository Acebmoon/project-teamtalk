import path from "node:path";
import { defineConfig, devices } from "playwright/test";

export default defineConfig({
  testDir: __dirname,
  testMatch: "mobile.test.ts",
  outputDir: path.resolve(__dirname, "../../test-results"),
  workers: 2,
  use: { baseURL: "http://127.0.0.1:4174", trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "chrome-android", use: { ...devices["Pixel 7"], browserName: "chromium", launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } } },
    { name: "safari-ios", use: { ...devices["iPhone 13"], browserName: "webkit" } },
  ],
  webServer: {
    command: "node node_modules/vite/bin/vite.js --config design-em-react/testes/vite.config.ts --host 127.0.0.1 --port 4174 --strictPort",
    cwd: path.resolve(__dirname, "../.."),
    url: "http://127.0.0.1:4174",
    reuseExistingServer: !process.env.CI,
  },
});
