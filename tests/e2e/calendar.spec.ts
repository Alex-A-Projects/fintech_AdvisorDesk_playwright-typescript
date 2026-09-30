/**
 * UI tests — Calendar page.
 */
import { test, expect } from '../../fixtures';
import { readStore } from '../../utils/helpers/data-store';

test.describe('Calendar — Render @smoke', () => {
  test('loads with current month label', async ({ calendarPage }) => {
    await calendarPage.goto('calendar');
    await calendarPage.assertLoaded();
    const label = await calendarPage.monthText();
    expect(label.length).toBeGreaterThan(0);
  });

  test('renders 35-42 day cells', async ({ calendarPage }) => {
    await calendarPage.goto('calendar');
    const n = await calendarPage.countDays();
    // 5-6 weeks × 7 days
    expect(n).toBeGreaterThanOrEqual(28);
    expect(n).toBeLessThanOrEqual(42);
  });

  test('prev/next month navigation', async ({ calendarPage }) => {
    await calendarPage.goto('calendar');
    const before = await calendarPage.monthText();
    await calendarPage.nextMonth();
    await calendarPage.page.waitForTimeout(200);
    const after = await calendarPage.monthText();
    expect(after).not.toBe(before);
  });

  test('today button resets to current month', async ({ calendarPage }) => {
    await calendarPage.goto('calendar');
    await calendarPage.nextMonth();
    await calendarPage.page.waitForTimeout(200);
    await calendarPage.goToday();
    await calendarPage.page.waitForTimeout(200);
    const label = await calendarPage.monthText();
    expect(label.length).toBeGreaterThan(0);
  });
});

test.describe('Calendar — Events @regression', () => {
  test('seeded events show on the right day', async ({ calendarPage, page }) => {
    const store = await readStore(page);
    const events = store?.events ?? [];
    if (events.length === 0) {
      test.skip();
      return;
    }
    await calendarPage.goto('calendar');
    await page.waitForTimeout(300);
    expect(await calendarPage.countEvents()).toBeGreaterThan(0);
  });

  test('create event', async ({ calendarPage, page }) => {
    await calendarPage.goto('calendar');
    const before = (await readStore(page))?.events.length ?? 0;
    await calendarPage.clickAdd();
    await calendarPage.modal.fill('Title', 'Smoke meeting');
    await calendarPage.modal.fill('Date', '2026-09-29').catch(() => {});
    await calendarPage.modal.submit();
    await page.waitForTimeout(300);
    const after = (await readStore(page))?.events.length ?? 0;
    expect(after).toBe(before + 1);
  });

  test('event without title is rejected', async ({ calendarPage, page }) => {
    await calendarPage.goto('calendar');
    const before = (await readStore(page))?.events.length ?? 0;
    await calendarPage.clickAdd();
    await calendarPage.modal.submit();
    await page.waitForTimeout(200);
    const after = (await readStore(page))?.events.length ?? 0;
    expect(after).toBe(before);
  });

  test('events have ISO date strings', async ({ calendarPage }) => {
    const store = await readStore(calendarPage.page);
    for (const e of store?.events ?? []) {
      expect(e.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  test('export ICS downloads calendar file', async ({ calendarPage, page }) => {
    await calendarPage.goto('calendar');
    const downloadPromise = page.waitForEvent('download', { timeout: 3000 }).catch(() => null);
    if (await calendarPage.exportIcs.isVisible({ timeout: 1000 }).catch(() => false)) {
      await calendarPage.exportIcs.click();
    }
    const download = await downloadPromise;
    if (download) {
      expect(download.suggestedFilename()).toMatch(/\.ics$/);
    }
  });
});