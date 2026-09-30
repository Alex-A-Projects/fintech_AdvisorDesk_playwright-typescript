/**
 * Base Page — every page object extends this. Provides the navigation primitives
 * and global UI helpers (sidebar, theme, quick-add, search) that are present on
 * every page.
 */
import { Page, Locator, expect } from '@playwright/test';
import { waits } from '../utils/helpers/wait';
import { PageName } from '../types';
import { Sidebar } from '../components/sidebar.component';
import { ThemeToggle } from '../components/theme-toggle.component';
import { QuickAdd } from '../components/quick-add.component';
import { GlobalSearch } from '../components/global-search.component';
import { Modal } from '../components/modal.component';
import { Toast } from '../components/toast.component';

export abstract class BasePage {
  readonly page: Page;
  readonly sidebar: Sidebar;
  readonly theme: ThemeToggle;
  readonly quickAdd: QuickAdd;
  readonly search: GlobalSearch;
  readonly modal: Modal;
  readonly toast: Toast;

  constructor(page: Page) {
    this.page = page;
    this.sidebar = new Sidebar(page);
    this.theme = new ThemeToggle(page);
    this.quickAdd = new QuickAdd(page);
    this.search = new GlobalSearch(page);
    this.modal = new Modal(page);
    this.toast = new Toast(page);
  }

  /** Navigate via in-page hash router. */
  async goto(name: PageName, id?: string, sub?: string): Promise<void> {
    const route = id ? (sub ? `#/${name}/${id}/${sub}` : `#/${name}/${id}`) : `#/${name}`;
    await waits.hashRoute(this.page, route);
    await waits.ready(this.page);
  }

  async gotoDirect(url: string): Promise<void> {
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    await waits.ready(this.page);
  }

  /** The brand mark in the sidebar top. */
  get brand(): Locator {
    return this.page.locator('.brand-mark, #brandMark, #brand');
  }

  /** The dynamic <main id="content"> element where the page renders. */
  get content(): Locator {
    return this.page.locator('#content');
  }

  /** First h1 / page title — most pages set this. */
  get pageTitle(): Locator {
    return this.page.locator('#content h1, #content h2.page-title, .page-title').first();
  }

  /** Page description paragraph (subhead under the title). */
  get pageDesc(): Locator {
    return this.page.locator('#content .page-desc').first();
  }

  /** All action buttons in the page header. */
  get headerActions(): Locator {
    return this.page.locator('#content .actions .btn, #content .page-actions .btn');
  }

  /** Open onboarding dialog (if it's not already dismissed). */
  async dismissOnboardingIfPresent(): Promise<void> {
    const onboarding = this.page.locator('.welcome-hero');
    if (await onboarding.isVisible({ timeout: 500 }).catch(() => false)) {
      await this.page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('.welcome-hero ~ * button, .modal button'));
        const startFresh = btns.find((b) => b.textContent?.trim() === 'Start fresh') as HTMLButtonElement | undefined;
        startFresh?.click();
      });
      await this.page.waitForTimeout(300);
    }
  }

  /** Inject a fully-formed store snapshot via localStorage and reload. */
  async loadStoreSnapshot(snapshot: object): Promise<void> {
    await this.page.evaluate((s) => {
      localStorage.setItem('bizdash_financial-advisors-demo', JSON.stringify(s));
    }, snapshot);
    await this.page.reload({ waitUntil: 'domcontentloaded' });
    await waits.ready(this.page);
  }

  async waitForContent(): Promise<void> {
    await waits.ready(this.page);
  }

  /** Wait for the URL hash to match. */
  async expectRoute(route: string): Promise<void> {
    await expect.poll(async () => this.page.evaluate(() => window.location.hash)).toBe(route);
  }

  /** Page-specific assertions; subclasses override to assert page-level invariants. */
  abstract assertLoaded(): Promise<void>;
}