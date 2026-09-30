import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class TasksPage extends BasePage {
  readonly addButton: Locator;
  readonly searchInput: Locator;
  readonly filter: Locator;
  readonly tasks: Locator;
  readonly counter: Locator;

  constructor(page: Page) {
    super(page);
    this.addButton = page.locator('#content').getByRole('button', { name: /New task|Add task/ }).first();
    this.searchInput = page.locator('#content input[type="search"], #content input[placeholder*="Search"]').first();
    this.filter = page.locator('#content .seg button, #content .filter-status button').first();
    this.tasks = page.locator('#content .task-row, #content [data-entity="task"]');
    this.counter = page.locator('#content .count, #content [data-count="tasks-page"]').first();
  }

  static async open(page: Page): Promise<TasksPage> {
    const p = new TasksPage(page);
    await p.goto('tasks');
    return p;
  }

  async assertLoaded(): Promise<void> {
    await expect(this.content).toBeVisible();
  }

  async clickAdd(): Promise<void> {
    await this.addButton.click();
  }

  /** Search the local task list filter. */
  async searchList(q: string): Promise<void> {
    await this.searchInput.fill(q);
  }

  async setFilter(label: string | RegExp): Promise<void> {
    await this.page.locator('#content .seg button').filter({ hasText: label }).first().click();
  }

  async toggleTask(title: string): Promise<void> {
    // The demo toggles tasks via `<div class="task-check" data-check="…">`,
    // not an input[type=checkbox].
    const row = this.tasks.filter({ hasText: title }).first();
    await row.locator('.task-check, [data-check]').first().click();
  }

  async countVisible(): Promise<number> {
    return this.tasks.count();
  }

  async counterText(): Promise<string> {
    return (await this.counter.textContent().catch(() => '')) ?? '';
  }
}