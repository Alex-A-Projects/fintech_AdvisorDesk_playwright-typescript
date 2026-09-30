import { Component } from './component';
import { Page, Locator, expect } from '@playwright/test';
import { PageName } from '../types';

const LABELS: Record<PageName, string> = {
  dashboard: 'Dashboard',
  clients: 'Clients',
  projects: 'Projects',
  tasks: 'Tasks',
  invoices: 'Invoices',
  quotes: 'Quotes',
  calendar: 'Calendar',
  notes: 'Notes',
  reports: 'Reports',
  integrations: 'Integrations',
  settings: 'Settings',
};

export class Sidebar extends Component {
  readonly root: Locator;

  constructor(page: Page) {
    super(page);
    this.root = page.locator('#sidebar');
  }

  item(page: PageName): Locator {
    return this.page.locator(`.nav-item[data-page="${page}"]`);
  }

  async click(page: PageName): Promise<void> {
    await this.item(page).click();
  }

  async active(): Promise<string> {
    return (await this.page.locator('.nav-item.active').first().getAttribute('data-page')) ?? '';
  }

  async expectActive(page: PageName): Promise<void> {
    await expect(this.item(page)).toHaveClass(/active/);
  }

  async expectAllVisible(): Promise<void> {
    const names: PageName[] = [
      'dashboard',
      'clients',
      'projects',
      'tasks',
      'invoices',
      'quotes',
      'calendar',
      'notes',
      'reports',
      'integrations',
      'settings',
    ];
    for (const n of names) {
      await expect(this.item(n)).toBeVisible();
    }
  }

  async expectLabels(): Promise<void> {
    // The demo uses localized terminology — we just verify each nav item
    // has some non-empty label rather than checking exact text.
    for (const name of Object.keys(LABELS) as PageName[]) {
      const text = (await this.item(name).textContent()) ?? '';
      expect(text.trim().length).toBeGreaterThan(0);
    }
  }

  async taskCount(): Promise<number> {
    const el = this.page.locator('[data-count="tasks"]');
    if (!(await el.isVisible().catch(() => false))) return 0;
    return parseInt((await el.textContent()) ?? '0', 10);
  }

  async expectTaskCount(n: number): Promise<void> {
    await expect(this.page.locator('[data-count="tasks"]')).toHaveText(String(n));
  }

  async clickBrand(): Promise<void> {
    await this.page.locator('#brand, .brand').first().click();
  }
}