import { Component } from './component';
import { Page, Locator, expect } from '@playwright/test';

export type QuickAddEntity = 'client' | 'project' | 'task' | 'invoice' | 'event' | 'note';

export class QuickAdd extends Component {
  readonly root: Locator;

  constructor(page: Page) {
    super(page);
    this.root = page.locator('#quickAdd');
  }

  async open(): Promise<void> {
    await this.root.click();
    await expect(this.page.locator('.modal')).toBeVisible();
  }

  async pick(entity: QuickAddEntity): Promise<void> {
    await this.open();
    // The demo renders the Quick Add buttons in a fixed 6-up grid
    // (clients, projects, tasks, invoices, events, notes). The first button
    // is the modal close (empty text), so entity buttons start at index 1.
    // Label text is edition-dependent (e.g. "Client" vs "Customer",
    // "Engagement" vs "Project") and brittle across editions.
    const order: QuickAddEntity[] = ['client', 'project', 'task', 'invoice', 'event', 'note'];
    const entityIndex = order.indexOf(entity);
    if (entityIndex < 0) throw new Error(`Unknown Quick Add entity: ${entity}`);
    await this.page.locator('.modal button').nth(entityIndex + 1).click();
  }

  async expectOpen(): Promise<void> {
    await expect(this.page.locator('.modal')).toBeVisible();
  }

  async expectClosed(): Promise<void> {
    await expect(this.page.locator('.modal')).toBeHidden();
  }
}