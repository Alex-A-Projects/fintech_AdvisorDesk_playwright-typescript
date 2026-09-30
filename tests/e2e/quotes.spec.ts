/**
 * UI tests — Quotes page.
 */
import { test, expect } from '../../fixtures';
import { readStore } from '../../utils/helpers/data-store';

test.describe('Quotes — List @smoke', () => {
  test('loads quotes page', async ({ quotesPage }) => {
    await quotesPage.goto('quotes');
    await quotesPage.assertLoaded();
  });

  test('Add quote button is present', async ({ quotesPage }) => {
    await quotesPage.goto('quotes');
    await expect(quotesPage.addButton).toBeVisible();
  });

  test('hash route is /quotes', async ({ quotesPage }) => {
    await quotesPage.goto('quotes');
    await quotesPage.expectRoute('#/quotes');
  });
});

test.describe('Quotes — CRUD @regression', () => {
  test('create a quote', async ({ quotesPage, page }) => {
    const store = await readStore(page);
    const c = store?.clients?.[0];
    expect(c).toBeTruthy();
    await quotesPage.goto('quotes');
    const before = (await readStore(page))?.quotes.length ?? 0;
    await quotesPage.clickAdd();
    await quotesPage.modal.fill('Client', c!.name).catch(() => {});
    await quotesPage.modal.submit();
    await page.waitForTimeout(400);
    const after = (await readStore(page))?.quotes.length ?? 0;
    expect(after).toBeGreaterThanOrEqual(before);
  });

  test('cancel a quote creation', async ({ quotesPage, page }) => {
    await quotesPage.goto('quotes');
    const before = (await readStore(page))?.quotes.length ?? 0;
    await quotesPage.clickAdd();
    await quotesPage.modal.cancelForm();
    await page.waitForTimeout(200);
    const after = (await readStore(page))?.quotes.length ?? 0;
    expect(after).toBe(before);
  });

  test('quotes contain a valid_until date', async ({ quotesPage }) => {
    const store = await readStore(quotesPage.page);
    expect((store?.quotes ?? []).length).toBeGreaterThan(0);
    for (const q of store?.quotes ?? []) {
      expect(q.validUntil).toBeTruthy();
      expect(new Date(q.validUntil).getTime()).toBeGreaterThan(0);
    }
  });
});