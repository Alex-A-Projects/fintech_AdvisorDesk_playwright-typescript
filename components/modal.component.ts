import { Component } from './component';
import { Page, Locator, expect } from '@playwright/test';

export class Modal extends Component {
  readonly root: Locator;
  readonly dialog: Locator;
  private readonly title: Locator;
  private readonly body: Locator;
  private readonly footer: Locator;
  private readonly cancel: Locator;

  constructor(page: Page) {
    super(page);
    this.root = page.locator('.modal-overlay, .overlay');
    this.dialog = page.locator('.modal');
    this.title = page.locator('.modal .modal-header h2, .modal h2').first();
    this.body = page.locator('.modal .modal-body');
    this.footer = page.locator('.modal .modal-footer');
    this.cancel = page.locator('[data-act="cancel"]');
  }

  async expectVisible(): Promise<void> {
    await expect(this.dialog).toBeVisible();
  }

  async expectHidden(): Promise<void> {
    await expect(this.dialog).toBeHidden();
  }

  async expectTitle(text: string | RegExp): Promise<void> {
    await expect(this.title).toHaveText(text);
  }

  async field(label: string): Promise<Locator> {
    return this.body.locator('.field').filter({ hasText: label }).first();
  }

  async input(label: string): Promise<Locator> {
    const f = await this.field(label);
    return f.locator('input, textarea, select').first();
  }

  async fill(label: string, value: string): Promise<void> {
    const i = await this.input(label);
    await i.fill(value);
  }

  async select(label: string, value: string): Promise<void> {
    const s = await this.input(label);
    await s.selectOption(value);
  }

  async submit(): Promise<void> {
    // Forms created via App.formModal() have a [data-act="save"] button.
    // Forms created via App.modal() directly (e.g. invoice form) just have
    // a `.btn-primary` button in the footer. Try the data-act first, fall
    // back to the primary footer button.
    const dataAct = this.page.locator('[data-act="save"]');
    if (await dataAct.count().catch(() => 0)) {
      await dataAct.first().click();
      return;
    }
    const primary = this.page.locator('.modal .modal-footer .btn-primary, .modal .btn-primary').last();
    await primary.click();
  }

  async cancelForm(): Promise<void> {
    // Same fall-back pattern as submit(): formModal() buttons have data-act,
    // direct modal() buttons don't.
    const dataAct = this.page.locator('[data-act="cancel"]');
    if (await dataAct.count().catch(() => 0)) {
      await dataAct.first().click();
      return;
    }
    // Fall back: the first non-primary button in the modal footer.
    const plainBtn = this.page.locator('.modal .modal-footer .btn:not(.btn-primary), .modal .btn:not(.btn-primary)').first();
    await plainBtn.click();
  }

  async pressEscape(): Promise<void> {
    await this.page.keyboard.press('Escape');
  }

  async expectError(label: string, msg: RegExp): Promise<void> {
    const err = await this.field(label);
    await expect(err.locator('.err, .error, .field-err')).toHaveText(msg);
  }

  async close(): Promise<void> {
    await this.cancel.click().catch(async () => {
      await this.page.locator('.modal-close, [data-close]').first().click().catch(() => {});
    });
  }

  async snapshot(): Promise<string> {
    return (await this.title.textContent()) ?? '';
  }
}