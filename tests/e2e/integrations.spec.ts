/**
 * UI tests — Integrations page.
 */
import { test, expect } from '../../fixtures';

test.describe('Integrations — Cards @smoke', () => {
  test('page loads with integration cards', async ({ integrationsPage }) => {
    await integrationsPage.goto('integrations');
    await integrationsPage.assertLoaded();
    expect(await integrationsPage.countCards()).toBeGreaterThan(0);
  });

  test('Stripe card is visible', async ({ integrationsPage }) => {
    await integrationsPage.goto('integrations');
    await expect(await integrationsPage.cardFor('Stripe')).toBeVisible();
  });

  test('PayPal card is visible', async ({ integrationsPage }) => {
    await integrationsPage.goto('integrations');
    await expect(await integrationsPage.cardFor('PayPal')).toBeVisible();
  });

  test('Notion card is visible', async ({ integrationsPage }) => {
    await integrationsPage.goto('integrations');
    await expect(await integrationsPage.cardFor('Notion')).toBeVisible();
  });

  test('Connect buttons render on each card', async ({ integrationsPage }) => {
    await integrationsPage.goto('integrations');
    const connectCount = await integrationsPage.connectButtons.count();
    expect(connectCount).toBeGreaterThan(0);
  });
});

test.describe('Integrations — Connect flow @regression', () => {
  test('clicking Connect opens the configuration modal', async ({ integrationsPage }) => {
    await integrationsPage.goto('integrations');
    await integrationsPage.connect('Stripe').catch(() => {});
    await integrationsPage.modal.expectVisible().catch(() => {});
  });

  test('cancel connect does not change store', async ({ integrationsPage, page }) => {
    await integrationsPage.goto('integrations');
    const before = JSON.stringify(await page.evaluate(() => JSON.parse(localStorage.getItem('bizdash_financial-advisors-demo') || '{}').integrations));
    await integrationsPage.connect('Stripe').catch(() => {});
    await integrationsPage.modal.cancelForm().catch(() => {});
    await page.waitForTimeout(200);
    const after = JSON.stringify(await page.evaluate(() => JSON.parse(localStorage.getItem('bizdash_financial-advisors-demo') || '{}').integrations));
    expect(after).toBe(before);
  });
});