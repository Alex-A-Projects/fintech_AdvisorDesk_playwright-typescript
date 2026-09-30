import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class ReportsPage extends BasePage {
  readonly periodToggle: Locator;
  readonly charts: Locator;
  readonly kpiBlock: Locator;

  constructor(page: Page) {
    super(page);
    this.periodToggle = page.locator('#content .seg').first();
    this.charts = page.locator('#content svg, #content canvas, #content .chart');
    this.kpiBlock = page.locator('#content .kpi, #content .stat').first();
  }

  static async open(page: Page): Promise<ReportsPage> {
    const p = new ReportsPage(page);
    await p.goto('reports');
    return p;
  }

  async assertLoaded(): Promise<void> {
    await expect(this.content).toBeVisible();
  }

  async setPeriod(p: string | RegExp): Promise<void> {
    await this.page.locator('#content .seg button').filter({ hasText: p }).first().click();
  }
}