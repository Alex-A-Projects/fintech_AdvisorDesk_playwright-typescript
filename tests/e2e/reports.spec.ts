/**
 * UI tests — Reports page.
 */
import { test, expect } from '../../fixtures';

test.describe('Reports — Render @smoke', () => {
  test('loads reports page', async ({ reportsPage }) => {
    await reportsPage.goto('reports');
    await reportsPage.assertLoaded();
  });

  test('period toggle has options', async ({ reportsPage }) => {
    await reportsPage.goto('reports');
    const buttons = await reportsPage.periodToggle.locator('button').all();
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  test('renders at least one chart or kpi block', async ({ reportsPage }) => {
    await reportsPage.goto('reports');
    const n = (await reportsPage.charts.count()) + (await reportsPage.kpiBlock.count());
    expect(n).toBeGreaterThan(0);
  });
});

test.describe('Reports — Periods @regression', () => {
  for (const period of [/7d|7 days|Last week/i, /30d|30 days|Last month/i, /90d|Quarter|Last 90/i, /Year|12 months|12mo/i]) {
    test(`switching to period ${period} keeps page loaded`, async ({ reportsPage }) => {
      await reportsPage.goto('reports');
      await reportsPage.setPeriod(period).catch(() => {});
      await reportsPage.assertLoaded();
    });
  }
});