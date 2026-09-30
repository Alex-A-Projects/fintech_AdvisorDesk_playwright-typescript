import { Component } from './component';
import { Page, Locator, expect } from '@playwright/test';

export class Toast extends Component {
  readonly root: Locator;

  constructor(page: Page) {
    super(page);
    this.root = page.locator('.toast, #toast, [data-toast]').first();
  }

  async expectVisible(text?: string | RegExp): Promise<void> {
    await expect(this.root).toBeVisible();
    if (text) await expect(this.root).toContainText(text);
  }

  async expectHidden(): Promise<void> {
    await expect(this.root).toBeHidden({ timeout: 6000 });
  }

  async text(): Promise<string> {
    return (await this.root.textContent()) ?? '';
  }
}