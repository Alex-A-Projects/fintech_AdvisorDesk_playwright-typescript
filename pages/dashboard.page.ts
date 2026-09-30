import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';
import { readStore } from '../utils/helpers/data-store';

export class DashboardPage extends BasePage {
  readonly kpiCards: Locator;
  readonly recentClients: Locator;
  readonly recentProjects: Locator;
  readonly upcomingEvents: Locator;
  readonly openTasks: Locator;

  constructor(page: Page) {
    super(page);
    this.kpiCards = page.locator('#content .kpi, #content .stat, #content [data-kpi]');
    this.recentClients = page.locator('#content [data-section="recent-clients"], #content .recent-clients');
    this.recentProjects = page.locator('#content [data-section="recent-projects"], #content .recent-projects');
    this.upcomingEvents = page.locator('#content [data-section="upcoming"], #content .upcoming');
    this.openTasks = page.locator('#content [data-section="open-tasks"], #content .open-tasks');
  }

  static async open(page: Page): Promise<DashboardPage> {
    const p = new DashboardPage(page);
    await p.goto('dashboard');
    return p;
  }

  async assertLoaded(): Promise<void> {
    await expect(this.content).toBeVisible();
  }

  async kpiValue(name: string): Promise<string> {
    const card = this.kpiCards.filter({ hasText: name }).first();
    return (await card.locator('.kpi-value, .stat-value, .value').first().textContent()) ?? '';
  }

  async kpiLabels(): Promise<string[]> {
    const labels = await this.kpiCards.allTextContents();
    return labels.map((t) => t.trim());
  }

  async expectKpiCountAtLeast(n: number): Promise<void> {
    const cnt = await this.kpiCards.count();
    expect(cnt).toBeGreaterThanOrEqual(n);
  }

  async snapshotStore() {
    return readStore(this.page);
  }
}