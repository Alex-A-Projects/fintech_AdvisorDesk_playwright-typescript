import { Component } from './component';
import { Page, Locator, expect } from '@playwright/test';
import { Theme } from '../types';

export class ThemeToggle extends Component {
  readonly root: Locator;

  constructor(page: Page) {
    super(page);
    this.root = page.locator('#themeToggle');
  }

  async current(): Promise<Theme> {
    return this.page.evaluate(() =>
      (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light') as Theme,
    );
  }

  async set(theme: Theme): Promise<void> {
    if ((await this.current()) !== theme) {
      await this.root.click();
    }
    expect(await this.current()).toBe(theme);
  }

  async toggle(): Promise<Theme> {
    const before = await this.current();
    await this.root.click();
    const after = await this.current();
    expect(after).not.toBe(before);
    return after;
  }

  async expectTheme(theme: Theme): Promise<void> {
    await expect(this.page.locator('html')).toHaveAttribute('data-theme', theme);
  }

  /** Helper: read the visible label of the toggle button. */
  async label(): Promise<string> {
    return (await this.root.locator('.theme-label').textContent()) ?? '';
  }
}