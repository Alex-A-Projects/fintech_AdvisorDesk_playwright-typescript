import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class SettingsPage extends BasePage {
  readonly businessName: Locator;
  readonly ownerName: Locator;
  readonly emailInput: Locator;
  readonly currencySelect: Locator;
  readonly taxRate: Locator;
  readonly themeToggleInline: Locator;
  readonly accentPicker: Locator;
  readonly loadSample: Locator;
  readonly exportBtn: Locator;
  readonly backupBtn: Locator;
  readonly eraseBtn: Locator;
  readonly versionText: Locator;
  readonly planText: Locator;

  constructor(page: Page) {
    super(page);
    this.businessName = page.locator('#sBiz, #bizName, input[name="businessName"]').first();
    this.ownerName = page.locator('#sName, #ownerName, input[name="ownerName"]').first();
    this.emailInput = page.locator('input[name="email"]').first();
    this.currencySelect = page.locator('select[name="currency"]').first();
    this.taxRate = page.locator('input[name="taxRate"]').first();
    this.themeToggleInline = page.locator('#sTheme, [data-toggle="theme"]').first();
    this.accentPicker = page.locator('#sAccent, [data-pick="accent"]').first();
    this.loadSample = page.locator('#sSample');
    this.exportBtn = page.locator('button').filter({ hasText: /Export everything/ }).first();
    this.backupBtn = page.locator('button').filter({ hasText: /Backup|Download JSON/ }).first();
    this.eraseBtn = page.locator('button').filter({ hasText: /Erase all/ }).first();
    this.versionText = page.locator('text=/Version/i').first();
    this.planText = page.locator('text=/Plan/i').first();
  }

  static async open(page: Page): Promise<SettingsPage> {
    const p = new SettingsPage(page);
    await p.goto('settings');
    return p;
  }

  async assertLoaded(): Promise<void> {
    await expect(this.content).toBeVisible();
  }

  async setBusinessName(name: string): Promise<void> {
    await this.businessName.fill(name);
    // The Settings page persists profile changes via an explicit Save button.
    await this.page.locator('#sSaveProfile').click().catch(() => {});
  }

  async loadSampleData(): Promise<void> {
    await this.loadSample.click();
  }

  async eraseAll(): Promise<void> {
    await this.eraseBtn.click();
    // Erase confirm dialog uses data-act="yes" (danger confirm).
    await this.page.locator('[data-act="yes"]').first().click();
  }

  async versionLabel(): Promise<string> {
    // Target the Version property specifically — the demo also has "Get the
    // full version →" in the top bar which would otherwise match first.
    const label = this.page.locator('.prop-k', { hasText: /^Version$/ }).first();
    if (!(await label.count().catch(() => 0))) return '';
    const value = label.locator('xpath=following-sibling::*[1]');
    return ((await value.textContent()) ?? '').trim();
  }

  async planLabel(): Promise<string> {
    const label = this.page.locator('.prop-k', { hasText: /^Plan$/ }).first();
    if (!(await label.count().catch(() => 0))) return '';
    const value = label.locator('xpath=following-sibling::*[1]');
    return ((await value.textContent()) ?? '').trim();
  }
}