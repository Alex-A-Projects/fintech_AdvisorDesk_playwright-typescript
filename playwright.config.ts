import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config — AdvisorDesk.
 *
 * Projects (each shows up as its own root in the VS Code Test Explorer):
 *
 *   chromium   → tests/e2e/**         (UI tests in Chrome)
 *   firefox    → tests/e2e/**         (UI tests in Firefox)
 *   webkit     → tests/e2e/**         (UI tests in Safari)
 *   mobile     → tests/e2e/mobile.*   (UI tests at phone widths)
 *   api        → tests/api/**         (HTTP API tests, no browser)
 *   db         → tests/db/**          (SQLite tests, no browser)
 *
 * Run a subset:
 *   npx playwright test --project=api
 *   npx playwright test --project=chromium --grep "@smoke"
 */
export default defineConfig({
  // NOTE: `testDir` only applies to the FIRST project. We use per-project
  // `testMatch` to scope each project to its own folder, since Playwright's
  // Test Explorer needs concrete, unambiguous folder paths to render them.
  testDir: './tests',
  timeout: 90_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Retries on both local + CI. Free public APIs rate-limit hard when we
  // hit 13 of them back-to-back, so transient 429/5xx errors get a second
  // (and third) chance before we count them as a real failure.
  retries: 2,

  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],

  // Shared defaults — each project overrides what it needs.
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:8765/demo.html',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
    viewport: { width: 1440, height: 900 },
  },

  projects: [
    // -------------------------------------------------------------------
    // UI tests — need a real browser. Live in ./tests/e2e/.
    // -------------------------------------------------------------------
    {
      name: 'chromium',
      testDir: './tests/e2e',
      testMatch: '**/*.spec.ts',
      testIgnore: 'mobile*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      testDir: './tests/e2e',
      testMatch: '**/*.spec.ts',
      testIgnore: 'mobile*.spec.ts',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testDir: './tests/e2e',
      testMatch: '**/*.spec.ts',
      testIgnore: 'mobile*.spec.ts',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile',
      testDir: './tests/e2e',
      testMatch: 'mobile*.spec.ts',
      use: { ...devices['Pixel 7'] },
    },

    // -------------------------------------------------------------------
    // API tests — pure HTTP, no browser. Live in ./tests-api/.
    // testDir is per-project so the Playwright VS Code extension renders
    // `tests-api/` as a top-level folder in the Test Explorer.
    // Capped to 4 workers to avoid hitting free-tier rate limits.
    // -------------------------------------------------------------------
    {
      name: 'api',
      testDir: './tests-api',
      testMatch: '**/*.spec.ts',
      workers: 4,
    },

    // -------------------------------------------------------------------
    // DB tests — pure SQLite. Live in ./tests-db/.
    // Single worker because they share a single SQLite file.
    // -------------------------------------------------------------------
    {
      name: 'db',
      testDir: './tests-db',
      testMatch: '**/*.spec.ts',
      testIgnore: 'postgres*.spec.ts',
      fullyParallel: false,
      workers: 1,
    },

    // -------------------------------------------------------------------
    // Browser ↔ DB integration tests. Live in ./tests/e2e/.
    // -------------------------------------------------------------------
    {
      name: 'db-integration',
      testDir: './tests/e2e',
      testMatch: 'db-integration*.spec.ts',
      fullyParallel: false,
      workers: 1,
    },

    // -------------------------------------------------------------------
    // Postgres tests — real RDBMS via docker compose.
    // Bring it up with: npm run db:up.
    // Tests skip gracefully if Postgres isn't reachable.
    // -------------------------------------------------------------------
    {
      name: 'db-postgres',
      testDir: './tests-db',
      testMatch: 'postgres*.spec.ts',
      fullyParallel: false,
      workers: 1,
    },
  ],

  // Boots a local copy of the demo so tests don't hit the sandboxed
  // Shopify CDN (which would block localStorage access).
  webServer: {
    command: 'npx http-server ./public -p 8765 -s',
    url: 'http://localhost:8765',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },

  // Optional Postgres — only used by the `db-postgres` project.
  // Set DB_TYPE=postgres in .env, then `npm run db:up`.
});