import { defineConfig, devices } from '@playwright/test';

const port = 5173;
const apiPort = Number(process.env.FIXTURE_API_PORT ?? 4100);
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH;

// The e2e suite runs the app against a fixture API rather than Rails, so it
// is deterministic and needs no database (web.md Verification). CI installs
// Chromium first (.github/workflows/ci.yml); locally PLAYWRIGHT_CHROMIUM_PATH
// can point at an existing Chromium instead of downloading one.
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
  // One project. AC-6 and AC-7 turn on the user agent, not the engine, and
  // those tests build their own context with the string they need, so a
  // second project only ran every other test twice.
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Two servers: the fixture API, then the app pointed at it. Every loader
  // runs in Node, so an in-browser mock would sit on the wrong side of the
  // boundary and never see the request.
  webServer: [
    {
      command: 'pnpm fixture-api',
      url: `http://localhost:${apiPort}/v1/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: { FIXTURE_API_PORT: String(apiPort) },
    },
    {
      command: 'pnpm dev',
      url: `http://localhost:${port}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        API_URL: `http://localhost:${apiPort}`,
        SHARE_BASE_URL: 'https://curbsocial.club',
        // APP_STORE_ID is unknown until App Store Connect reserves the app
        // (web.md Risks), so the suite sets a fake one to exercise R-11.
        APP_STORE_ID: '6740000000',
        TEAM_ID: 'ABCDE12345',
        // A local style, so the map test does not depend on OpenFreeMap
        // being up or reachable from CI.
        VITE_MAP_STYLE_URL: `http://localhost:${apiPort}/map-style.json`,
        VITE_API_URL: `http://localhost:${apiPort}`,
      },
    },
  ],
});
