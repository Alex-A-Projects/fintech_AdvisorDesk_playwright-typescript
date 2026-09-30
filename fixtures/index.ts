/**
 * Playwright fixtures — auto-instantiate POMs and seed sample data before each test.
 * Tests opt into a specific page object via the destructured argument.
 */
import { test as base, Page } from '@playwright/test';
import { spawn, ChildProcess } from 'child_process';
import { DashboardPage } from '../pages/dashboard.page';
import { ClientsPage } from '../pages/clients.page';
import { ProjectsPage } from '../pages/projects.page';
import { TasksPage } from '../pages/tasks.page';
import { InvoicesPage } from '../pages/invoices.page';
import { QuotesPage } from '../pages/quotes.page';
import { CalendarPage } from '../pages/calendar.page';
import { NotesPage } from '../pages/notes.page';
import { ReportsPage } from '../pages/reports.page';
import { IntegrationsPage } from '../pages/integrations.page';
import { SettingsPage } from '../pages/settings.page';
import { environment } from '../config/environments';
import { waits } from '../utils/helpers/wait';

type Pages = {
  dashboardPage: DashboardPage;
  clientsPage: ClientsPage;
  projectsPage: ProjectsPage;
  tasksPage: TasksPage;
  invoicesPage: InvoicesPage;
  quotesPage: QuotesPage;
  calendarPage: CalendarPage;
  notesPage: NotesPage;
  reportsPage: ReportsPage;
  integrationsPage: IntegrationsPage;
  settingsPage: SettingsPage;
};

/**
 * Boot a local http-server on port 8765 if one isn't already there.
 * Playwright's webServer should do this too, but sometimes it dies between
 * runs; this is the safety net that keeps the bootstrap self-contained.
 */
let staticServer: ChildProcess | null = null;

async function ensureDemoServer(): Promise<void> {
  const url = new URL(environment.baseUrl);
  const port = parseInt(url.port || '8765', 10);

  // Cheap probe: try to open a TCP connection. If it works, the server is up.
  const reachable = await new Promise<boolean>((resolve) => {
    const net = require('net') as typeof import('net');
    const sock = net.createConnection({ host: 'localhost', port }, () => {
      sock.end();
      resolve(true);
    });
    sock.on('error', () => resolve(false));
    setTimeout(() => {
      sock.destroy();
      resolve(false);
    }, 500);
  });

  if (reachable) return;

  // Spin up the demo server ourselves.
  // eslint-disable-next-line no-console
  console.log(`[fixtures] starting http-server on :${port}`);
  staticServer = spawn(
    'npx',
    ['http-server', './public', '-p', String(port), '-s'],
    { stdio: 'ignore', detached: true },
  );
  staticServer.unref();

  // Wait until it's accepting connections (up to 5s).
  const start = Date.now();
  while (Date.now() - start < 5000) {
    const ok = await new Promise<boolean>((resolve) => {
      const net = require('net') as typeof import('net');
      const sock = net.createConnection({ host: 'localhost', port }, () => {
        sock.end();
        resolve(true);
      });
      sock.on('error', () => resolve(false));
    });
    if (ok) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`Could not start demo server on :${port}`);
}

/**
 * Seeds the demo with sample data and dismisses the onboarding flow, so each
 * test starts in a known state. Override via `test.use({ seedSample: false })`.
 */
async function bootstrap(page: Page): Promise<void> {
  await ensureDemoServer();
  await page.goto(environment.baseUrl, { waitUntil: 'domcontentloaded' });
  await waits.ready(page);

  // Wait for the App object to be ready
  await page
    .waitForFunction(() => (window as unknown as { App?: { loadSampleData?: () => void } }).App?.loadSampleData !== undefined, undefined, { timeout: 10000 })
    .catch(() => {});

  // Dismiss onboarding if present
  await page
    .evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.modal button'));
      const startFresh = btns.find((b) => b.textContent?.trim() === 'Start fresh');
      (startFresh as HTMLButtonElement | undefined)?.click();
    })
    .catch(() => {});

  // Inject sample data (we use the demo's built-in load via settings page)
  await page.evaluate(() => {
    const app = (window as unknown as { App: { loadSampleData?: () => void; store?: { save?: () => void; data?: unknown } } }).App;
    app.loadSampleData?.();
    app.store?.save?.();
  });
  await page.waitForTimeout(800);
}

export const test = base.extend<Pages>({
  dashboardPage: async ({ page }, use) => {
    await bootstrap(page);
    await use(new DashboardPage(page));
  },
  clientsPage: async ({ page }, use) => {
    await bootstrap(page);
    await use(new ClientsPage(page));
  },
  projectsPage: async ({ page }, use) => {
    await bootstrap(page);
    await use(new ProjectsPage(page));
  },
  tasksPage: async ({ page }, use) => {
    await bootstrap(page);
    await use(new TasksPage(page));
  },
  invoicesPage: async ({ page }, use) => {
    await bootstrap(page);
    await use(new InvoicesPage(page));
  },
  quotesPage: async ({ page }, use) => {
    await bootstrap(page);
    await use(new QuotesPage(page));
  },
  calendarPage: async ({ page }, use) => {
    await bootstrap(page);
    await use(new CalendarPage(page));
  },
  notesPage: async ({ page }, use) => {
    await bootstrap(page);
    await use(new NotesPage(page));
  },
  reportsPage: async ({ page }, use) => {
    await bootstrap(page);
    await use(new ReportsPage(page));
  },
  integrationsPage: async ({ page }, use) => {
    await bootstrap(page);
    await use(new IntegrationsPage(page));
  },
  settingsPage: async ({ page }, use) => {
    await bootstrap(page);
    await use(new SettingsPage(page));
  },
});

export { expect } from '@playwright/test';
export const { describe, beforeEach, afterEach, beforeAll, afterAll } = test;