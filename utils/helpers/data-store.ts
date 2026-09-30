/**
 * Read-only helpers for interacting with the demo's localStorage store.
 * The demo persists state under key `bizdash_<id>`; we expose typed accessors
 * so we can verify CRUD operations from tests without screen-scraping.
 */
import type { Page } from '@playwright/test';
import type {
  AppStore,
  Client,
  Project,
  Task,
  Invoice,
  Quote,
  CalendarEvent,
  Note,
} from '../../types';
import { log } from './logger';

const STORAGE_KEY = 'bizdash_financial-advisors-demo';

export async function readStore(page: Page): Promise<AppStore | null> {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, STORAGE_KEY);
}

export async function writeStore(page: Page, store: AppStore): Promise<void> {
  await page.evaluate(
    ({ key, value }) => {
      localStorage.setItem(key, value);
    },
    { key: STORAGE_KEY, value: JSON.stringify(store) },
  );
}

export async function clearStore(page: Page): Promise<void> {
  await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);
}

export async function countEntities(
  page: Page,
  entity: keyof Pick<AppStore, 'clients' | 'projects' | 'tasks' | 'invoices' | 'quotes' | 'events' | 'notes'>,
): Promise<number> {
  const store = await readStore(page);
  if (!store) return 0;
  return (store[entity] as unknown[]).length;
}

export async function getFirstClient(page: Page): Promise<Client | null> {
  const store = await readStore(page);
  return store?.clients?.[0] ?? null;
}

export async function getFirstProject(page: Page): Promise<Project | null> {
  const store = await readStore(page);
  return store?.projects?.[0] ?? null;
}

export async function getFirstInvoice(page: Page): Promise<Invoice | null> {
  const store = await readStore(page);
  return store?.invoices?.[0] ?? null;
}

export async function getFirstQuote(page: Page): Promise<Quote | null> {
  const store = await readStore(page);
  return store?.quotes?.[0] ?? null;
}

export async function getFirstEvent(page: Page): Promise<CalendarEvent | null> {
  const store = await readStore(page);
  return store?.events?.[0] ?? null;
}

export async function getFirstNote(page: Page): Promise<Note | null> {
  const store = await readStore(page);
  return store?.notes?.[0] ?? null;
}

export async function getFirstTask(page: Page): Promise<Task | null> {
  const store = await readStore(page);
  return store?.tasks?.[0] ?? null;
}

/**
 * Capture the size (in bytes) of the localStorage entry — used by Settings tests.
 */
export async function storageBytes(page: Page): Promise<number> {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key) || '';
    return new Blob([raw]).size;
  }, STORAGE_KEY);
}

/**
 * Load a known-good store snapshot from disk.
 */
export async function loadSampleData(page: Page): Promise<void> {
  log.step('Loading sample data via Settings → Load sample');
  await page.evaluate(() => {
    const btn = document.querySelector<HTMLButtonElement>('#sSample');
    btn?.click();
  });
  await page.waitForTimeout(500);
}