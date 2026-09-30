import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class NotesPage extends BasePage {
  readonly addButton: Locator;
  readonly notes: Locator;
  readonly searchInput: Locator;

  constructor(page: Page) {
    super(page);
    this.addButton = page.locator('#content').getByRole('button', { name: /New note|Add note/ }).first();
    this.notes = page.locator('#content .note, #content [data-entity="note"]');
    this.searchInput = page.locator('#content input[type="search"]').first();
  }

  static async open(page: Page): Promise<NotesPage> {
    const p = new NotesPage(page);
    await p.goto('notes');
    return p;
  }

  async assertLoaded(): Promise<void> {
    await expect(this.content).toBeVisible();
  }

  async clickAdd(): Promise<void> {
    await this.addButton.click();
  }

  async openByTitle(title: string): Promise<void> {
    await this.notes.filter({ hasText: title }).first().click();
  }
}

export class NoteDetailPage extends BasePage {
  readonly title: Locator;
  readonly body: Locator;
  readonly saveButton: Locator;

  constructor(page: Page) {
    super(page);
    this.title = page.locator('#content input[type="text"], #content .note-title').first();
    this.body = page.locator('#content textarea').first();
    this.saveButton = page.locator('#content button').filter({ hasText: /Save/ }).first();
  }

  async assertLoaded(): Promise<void> {
    await expect(this.title).toBeVisible();
  }

  async setTitle(t: string): Promise<void> {
    await this.title.fill(t);
  }

  async setBody(b: string): Promise<void> {
    await this.body.fill(b);
  }

  async save(): Promise<void> {
    await this.saveButton.click();
  }
}