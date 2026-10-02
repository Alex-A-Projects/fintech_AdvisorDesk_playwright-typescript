import 'dotenv/config';
import { defineConfig } from '@playwright/test';

/** Proposed backend contract. No browser, static demo server, or public APIs. */
export default defineConfig({
  testDir: './tests-advisordesk-api',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  workers: 2,
  retries: 0,
  forbidOnly: !!process.env.CI,
  outputDir: 'test-results/advisordesk-api',
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report/advisordesk-api' }]],
});
