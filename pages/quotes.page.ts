import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class QuotesPage extends BasePage {
  readonly addButton: Locator;
  readonly quotes: Locator;

  constructor(page: Page) {
    super(page);
    this.addButton = page.locator('#content').getByRole('button', { name: /New quote|Add quote|Create quote/ }).first();
    this.quotes = page.locator('#content .quote, #content [data-entity="quote"]');
  }

  static async open(page: Page): Promise<QuotesPage> {
    const p = new QuotesPage(page);
    await p.goto('quotes');
    return p;
  }

  async assertLoaded(): Promise<void> {
    await expect(this.content).toBeVisible();
  }

  async clickAdd(): Promise<void> {
    await this.addButton.click();
  }
}