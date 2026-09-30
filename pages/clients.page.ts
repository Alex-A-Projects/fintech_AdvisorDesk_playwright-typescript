import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class ClientsPage extends BasePage {
  readonly searchInput: Locator;
  readonly statusFilter: Locator;
  readonly addButton: Locator;
  readonly importButton: Locator;
  readonly exportButton: Locator;
  readonly clientCards: Locator;
  readonly emptyState: Locator;
  readonly table: Locator;

  constructor(page: Page) {
    super(page);
    this.searchInput = page
      .locator('#content input[type="search"], #content input[placeholder*="Search"], #content .search-input')
      .first();
    this.statusFilter = page.locator('#content .seg button, #content .filter-status button').first();
    this.addButton = page.locator('#content').getByRole('button', { name: /Add|New/ }).first();
    this.importButton = page.locator('#content').getByRole('button', { name: /Import/ }).first();
    this.exportButton = page.locator('#content').getByRole('button', { name: /Export/ }).first();
    this.clientCards = page.locator('#content tr.clickable[data-id], #content [data-entity="client"], #content .client-card');
    this.emptyState = page.locator('#content .empty, #content .empty-state');
    this.table = page.locator('#content table');
  }

  static async open(page: Page): Promise<ClientsPage> {
    const p = new ClientsPage(page);
    await p.goto('clients');
    return p;
  }

  async assertLoaded(): Promise<void> {
    await expect(this.content).toBeVisible();
    await this.page.waitForTimeout(200);
  }

  /** Search the local client-list filter (not the global search bar). */
  async searchList(q: string): Promise<void> {
    await this.searchInput.fill(q);
  }

  async clickAdd(): Promise<void> {
    await this.addButton.click();
  }

  async clickImport(): Promise<void> {
    await this.importButton.click();
  }

  async clickExport(): Promise<void> {
    await this.exportButton.click();
  }

  async selectStatusFilter(label: string | RegExp): Promise<void> {
    // Demo uses a <select id="crmStatus"> for status filtering.
    const sel = this.page.locator('#content #crmStatus, #content select[name="status"]').first();
    const re = typeof label === 'string' ? new RegExp(label, 'i') : label;
    const optionValue = await sel
      .locator('option')
      .filter({ hasText: re })
      .first()
      .getAttribute('value', { timeout: 5000 })
      .catch(() => null);
    if (optionValue) await sel.selectOption(optionValue);
  }

  cardByName(name: string): Locator {
    return this.clientCards.filter({ hasText: name }).first();
  }

  async countCards(): Promise<number> {
    return this.clientCards.count();
  }

  async openClientByName(name: string): Promise<void> {
    await this.cardByName(name).click();
  }
}

export class ClientDetailPage extends BasePage {
  readonly name: Locator;
  readonly company: Locator;
  readonly statusPill: Locator;
  readonly editButton: Locator;
  readonly deleteButton: Locator;
  readonly linkedProjects: Locator;
  readonly linkedInvoices: Locator;
  readonly linkedTasks: Locator;

  constructor(page: Page) {
    super(page);
    this.name = page.locator('#content h1, .detail-title').first();
    this.company = page.locator('#content .detail-company, #content .subtitle').first();
    this.statusPill = page.locator('#content .pill').first();
    this.editButton = page.locator('#content').getByRole('button', { name: /Edit/ }).first();
    this.deleteButton = page.locator('#content').getByRole('button', { name: /Delete|Remove/ }).first();
    this.linkedProjects = page.locator('#content [data-related="projects"], #content .related-projects');
    this.linkedInvoices = page.locator('#content [data-related="invoices"], #content .related-invoices');
    this.linkedTasks = page.locator('#content [data-related="tasks"], #content .related-tasks');
  }

  async assertLoaded(): Promise<void> {
    await expect(this.name).toBeVisible();
  }

  async clickEdit(): Promise<void> {
    await this.editButton.click();
  }

  async clickDelete(): Promise<void> {
    await this.deleteButton.click();
  }

  async nameText(): Promise<string> {
    return (await this.name.textContent()) ?? '';
  }
}