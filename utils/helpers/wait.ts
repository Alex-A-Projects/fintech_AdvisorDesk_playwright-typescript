/**
 * Custom Playwright assertions that read better than the default ones
 * and surface meaningful error messages in CI logs.
 */
import { expect as baseExpect, Page, Locator } from '@playwright/test';
import { log } from './logger';

export const expect = baseExpect.extend({
  async toBeVisibleWithin(locator: Locator, timeout: number) {
    const start = Date.now();
    try {
      await locator.waitFor({ state: 'visible', timeout });
      return {
        pass: true,
        message: () => `Locator visible in ${Date.now() - start}ms`,
      };
    } catch (e) {
      return {
        pass: false,
        message: () =>
          `Locator not visible within ${timeout}ms — ${(e as Error).message}`,
      };
    }
  },

  async toHaveCountAtLeast(locator: Locator, n: number) {
    const count = await locator.count();
    return {
      pass: count >= n,
      message: () => `Expected ≥ ${n} elements, found ${count}`,
    };
  },
});

/**
 * Helpers — wrap common waits and assertions to keep test bodies tight.
 */
export const waits = {
  ms: (n: number) => new Promise((r) => setTimeout(r, n)),
  hashRoute: async (page: Page, route: string) => {
    log.debug(`Navigating to hash route ${route}`);
    await page.evaluate((r) => {
      window.location.hash = r;
    }, route);
    await page.waitForFunction(
      (r) => window.location.hash === r,
      route,
      { timeout: 5000 },
    );
  },
  ready: async (page: Page) => {
    await page.waitForFunction(() => {
      const root = document.getElementById('content');
      return root && root.innerHTML.length > 50 && !document.body.innerText.includes('Loading…');
    }, undefined, { timeout: 20_000 });
  },
};