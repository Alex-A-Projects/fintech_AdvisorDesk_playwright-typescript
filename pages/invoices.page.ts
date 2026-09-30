import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class InvoicesPage extends BasePage {
  readonly addButton: Locator;
  readonly invoices: Locator;
  readonly statusFilter: Locator;
  readonly revenueWidget: Locator;
  readonly outstandingWidget: Locator;

  constructor(page: Page) {
    super(page);
    this.addButton = page.locator('#content').getByRole('button', { name: /New invoice|Add invoice|Create invoice/ }).first();
    this.invoices = page.locator('#content .invoice, #content [data-entity="invoice"], #content table tbody tr');
    this.statusFilter = page.locator('#content .seg button').first();
    this.revenueWidget = page.locator('#content').filter({ hasText: 'Revenue' }).first();
    this.outstandingWidget = page.locator('#content').filter({ hasText: 'Outstanding' }).first();
  }

  static async open(page: Page): Promise<InvoicesPage> {
    const p = new InvoicesPage(page);
    await p.goto('invoices');
    return p;
  }

  async assertLoaded(): Promise<void> {
    await expect(this.content).toBeVisible();
  }

  async clickAdd(): Promise<void> {
    await this.addButton.click();
  }

  async filterStatus(label: string | RegExp): Promise<void> {
    await this.page.locator('#content .seg button').filter({ hasText: label }).first().click();
  }

  async rowByNumber(num: string): Promise<Locator> {
    return this.invoices.filter({ hasText: num }).first();
  }
}

export class InvoiceDetailPage extends BasePage {
  readonly number: Locator;
  readonly statusPill: Locator;
  readonly total: Locator;
  readonly lines: Locator;
  readonly markPaid: Locator;
  readonly printBtn: Locator;
  readonly sendBtn: Locator;

  constructor(page: Page) {
    super(page);
    this.number = page.locator('#content h1').first();
    this.statusPill = page.locator('#content .pill').first();
    this.total = page.locator('#content .total, #content [data-field="total"]').first();
    this.lines = page.locator('#content .line, #content table tbody tr');
    this.markPaid = page.locator('#content button').filter({ hasText: /Mark paid|Paid/ }).first();
    this.printBtn = page.locator('#content button').filter({ hasText: /Print/ }).first();
    this.sendBtn = page.locator('#content button').filter({ hasText: /Send/ }).first();
  }

  async assertLoaded(): Promise<void> {
    await expect(this.number).toBeVisible();
  }
}