import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class IntegrationsPage extends BasePage {
  readonly cards: Locator;
  readonly connectButtons: Locator;

  constructor(page: Page) {
    super(page);
    this.cards = page.locator('#content [data-integration], #content .integration-card, #content .card');
    this.connectButtons = page.locator('#content button').filter({ hasText: /Connect|Configure/ });
  }

  static async open(page: Page): Promise<IntegrationsPage> {
    const p = new IntegrationsPage(page);
    await p.goto('integrations');
    return p;
  }

  async assertLoaded(): Promise<void> {
    await expect(this.content).toBeVisible();
  }

  cardFor(name: string): Locator {
    return this.cards.filter({ hasText: name }).first();
  }

  async connect(name: string): Promise<void> {
    await this.cardFor(name).locator('button').filter({ hasText: /Connect/ }).first().click();
  }

  async disconnect(name: string): Promise<void> {
    await this.cardFor(name).locator('button').filter({ hasText: /Disconnect|Remove/ }).first().click();
  }

  async countCards(): Promise<number> {
    return this.cards.count();
  }
}