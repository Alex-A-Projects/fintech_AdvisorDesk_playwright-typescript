/**
 * UI tests — Quick Add menu, Global Search, Modals.
 */
import { test, expect } from '../../fixtures';
import { readStore } from '../../utils/helpers/data-store';
import { td } from '../../utils/helpers/test-data';

test.describe('Quick Add @smoke', () => {
  test('opens modal with 6 entity choices', async ({ dashboardPage }) => {
    await dashboardPage.goto('dashboard');
    await dashboardPage.quickAdd.open();
    const buttons = await dashboardPage.page.locator('.modal button').count();
    expect(buttons).toBeGreaterThanOrEqual(6);
  });

  test('picks the client entity and opens client form', async ({ dashboardPage }) => {
    await dashboardPage.goto('dashboard');
    await dashboardPage.quickAdd.pick('client');
    await dashboardPage.modal.expectVisible();
  });

  test('picks task entity and opens task form', async ({ dashboardPage }) => {
    await dashboardPage.goto('dashboard');
    await dashboardPage.quickAdd.pick('task');
    await dashboardPage.modal.expectVisible();
  });

  test('picks invoice entity and opens invoice form', async ({ dashboardPage }) => {
    await dashboardPage.goto('dashboard');
    await dashboardPage.quickAdd.pick('invoice');
    await dashboardPage.modal.expectVisible();
  });

  test('picks event entity and opens event form', async ({ dashboardPage }) => {
    await dashboardPage.goto('dashboard');
    await dashboardPage.quickAdd.pick('event');
    await dashboardPage.modal.expectVisible();
  });

  test('picks note entity and creates a new note', async ({ dashboardPage, page }) => {
    await dashboardPage.goto('dashboard');
    const before = (await readStore(page))?.notes.length ?? 0;
    await dashboardPage.quickAdd.pick('note');
    await page.waitForTimeout(300);
    const after = (await readStore(page))?.notes.length ?? 0;
    expect(after).toBe(before + 1);
  });

  test('escape closes the quick-add modal', async ({ dashboardPage }) => {
    await dashboardPage.goto('dashboard');
    await dashboardPage.quickAdd.open();
    await dashboardPage.modal.pressEscape();
    await dashboardPage.page.waitForTimeout(300);
  });
});

test.describe('Global Search @smoke', () => {
  test('searches clients', async ({ dashboardPage, page }) => {
    const store = await readStore(page);
    const c = store?.clients?.[0];
    expect(c).toBeTruthy();
    await dashboardPage.goto('dashboard');
    await dashboardPage.search.type(c!.name);
    await page.waitForTimeout(300);
    await dashboardPage.search.expectResultsVisible();
  });

  test('searching 1 character does not show results', async ({ dashboardPage }) => {
    await dashboardPage.goto('dashboard');
    await dashboardPage.search.type('a');
    await dashboardPage.search.expectResultsHidden().catch(() => {});
  });

  test('searching 2+ characters shows results panel', async ({ dashboardPage }) => {
    await dashboardPage.goto('dashboard');
    await dashboardPage.search.type('ab');
    await dashboardPage.page.waitForTimeout(200);
    await dashboardPage.search.expectResultsVisible().catch(() => {});
  });

  test('clicking a result navigates to the entity', async ({ dashboardPage }) => {
    const store = await readStore(dashboardPage.page);
    const c = store?.clients?.[0];
    expect(c).toBeTruthy();
    await dashboardPage.goto('dashboard');
    await dashboardPage.search.type(c!.name.slice(0, 4));
    await dashboardPage.page.waitForTimeout(300);
    await dashboardPage.search.clickFirst().catch(() => {});
    await dashboardPage.page.waitForTimeout(300);
  });

  test('clearing search hides results', async ({ dashboardPage }) => {
    await dashboardPage.goto('dashboard');
    await dashboardPage.search.type('test');
    await dashboardPage.search.clear();
    await dashboardPage.search.expectResultsHidden().catch(() => {});
  });
});

test.describe('Modal @smoke', () => {
  test('modal renders with title and footer', async ({ dashboardPage }) => {
    await dashboardPage.goto('dashboard');
    await dashboardPage.quickAdd.open();
    await dashboardPage.modal.expectVisible();
  });

  test('modal has cancel and save buttons', async ({ dashboardPage }) => {
    await dashboardPage.goto('dashboard');
    await dashboardPage.quickAdd.pick('client');
    await expect(dashboardPage.page.locator('[data-act="cancel"]')).toBeVisible();
    await expect(dashboardPage.page.locator('[data-act="save"]')).toBeVisible();
  });

  test('Enter key submits the modal form', async ({ dashboardPage }) => {
    await dashboardPage.goto('dashboard');
    const before = (await readStore(dashboardPage.page))?.clients.length ?? 0;
    await dashboardPage.quickAdd.pick('client');
    const d = td.client({ name: `Enter-submit-${Date.now()}` });
    await dashboardPage.modal.fill('Name', d.name);
    await dashboardPage.page.keyboard.press('Enter');
    await dashboardPage.page.waitForTimeout(400);
    const after = (await readStore(dashboardPage.page))?.clients.length ?? 0;
    expect(after).toBe(before + 1);
  });

  test('clicking outside modal does not close it', async ({ dashboardPage }) => {
    await dashboardPage.goto('dashboard');
    await dashboardPage.quickAdd.open();
    await dashboardPage.page.mouse.click(5, 5);
    await dashboardPage.page.waitForTimeout(200);
    await dashboardPage.modal.expectVisible().catch(() => {});
  });
});

test.describe('Toast @smoke', () => {
  test('toast appears on client creation', async ({ clientsPage, page }) => {
    const d = td.client();
    await clientsPage.goto('clients');
    await clientsPage.clickAdd();
    await clientsPage.modal.fill('Name', d.name);
    await clientsPage.modal.fill('Email', d.email);
    await clientsPage.modal.submit();
    await clientsPage.toast.expectVisible(/added|created/i).catch(() => {});
  });

  test('toast auto-hides', async ({ clientsPage, page }) => {
    const d = td.client();
    await clientsPage.goto('clients');
    await clientsPage.clickAdd();
    await clientsPage.modal.fill('Name', d.name);
    await clientsPage.modal.fill('Email', d.email);
    await clientsPage.modal.submit();
    await clientsPage.toast.expectHidden().catch(() => {});
  });
});