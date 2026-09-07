import { defineConfig, devices } from '@playwright/test';

const port = 5173;
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH;

// One smoke test against the dev server. CI installs Chromium first
// (.github/workflows/ci.yml); locally PLAYWRIGHT_CHROMIUM_PATH can point at
// an existing Chromium instead of downloading one.
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'retain-on-failure',
    ...(executablePath ? { launchOptions: { executablePath } } : {}),
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm dev',
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
