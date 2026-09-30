/**
 * Base component — a reusable chunk of UI that appears on multiple pages
 * (sidebar, modal, toast, search bar). Components don't navigate — they
 * expose typed actions/assertions for the underlying DOM.
 */
import { Page, Locator, expect } from '@playwright/test';

export abstract class Component {
  protected readonly page: Page;
  abstract readonly root: Locator;

  constructor(page: Page) {
    this.page = page;
  }

  protected async visible(): Promise<boolean> {
    return this.root.isVisible({ timeout: 1000 }).catch(() => false);
  }

  expectVisible(): Promise<void> {
    return expect(this.root).toBeVisible();
  }

  async expectHidden(): Promise<void> {
    await expect(this.root).toBeHidden();
  }
}