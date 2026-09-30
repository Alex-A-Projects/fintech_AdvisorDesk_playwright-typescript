import { Component } from './component';
import { Page, Locator, expect } from '@playwright/test';

export class GlobalSearch extends Component {
  readonly root: Locator;
  private readonly input: Locator;
  private readonly results: Locator;

  constructor(page: Page) {
    super(page);
    this.root = page.locator('#globalSearch');
    this.input = page.locator('#globalSearch');
    this.results = page.locator('#searchResults');
  }

  async type(q: string): Promise<void> {
    await this.input.fill(q);
  }

  async clear(): Promise<void> {
    await this.input.fill('');
  }

  async expectResultsCount(n: number): Promise<void> {
    await expect(this.results.locator('.search-hit, [data-hit]')).toHaveCount(n);
  }

  async expectResultsVisible(): Promise<void> {
    await expect(this.results).toBeVisible();
  }

  async expectResultsHidden(): Promise<void> {
    await expect(this.results).toBeHidden();
  }

  async firstResultText(): Promise<string> {
    return (await this.results.locator('.search-hit, [data-hit]').first().textContent()) ?? '';
  }

  async clickFirst(): Promise<void> {
    await this.results.locator('.search-hit, [data-hit]').first().click();
  }
}