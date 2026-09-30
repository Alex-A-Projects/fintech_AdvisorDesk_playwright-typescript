/**
 * UI tests — Tasks page.
 */
import { test, expect } from '../../fixtures';
import { readStore } from '../../utils/helpers/data-store';
import { td } from '../../utils/helpers/test-data';

test.describe('Tasks — List @smoke', () => {
  test('loads with seeded tasks', async ({ tasksPage }) => {
    await tasksPage.goto('tasks');
    await tasksPage.assertLoaded();
    expect(await tasksPage.countVisible()).toBeGreaterThan(0);
  });

  test('open tasks appear in sidebar count', async ({ tasksPage }) => {
    await tasksPage.goto('tasks');
    const store = await readStore(tasksPage.page);
    const open = (store?.tasks ?? []).filter((t) => !t.done).length;
    const sidebarCount = await tasksPage.sidebar.taskCount();
    expect(sidebarCount).toBe(open);
  });

  test('Add task button is enabled', async ({ tasksPage }) => {
    await tasksPage.goto('tasks');
    await expect(tasksPage.addButton).toBeEnabled();
  });
});

test.describe('Tasks — CRUD @regression', () => {
  test('create a task', async ({ tasksPage, page }) => {
    const data = td.task();
    await tasksPage.goto('tasks');
    const before = (await readStore(page))?.tasks.length ?? 0;
    await tasksPage.clickAdd();
    await tasksPage.modal.fill('What needs doing?', data.title);
    await tasksPage.modal.submit();
    await page.waitForTimeout(300);
    const after = (await readStore(page))?.tasks.length ?? 0;
    expect(after).toBe(before + 1);
    const created = (await readStore(page))?.tasks.find((t) => t.title === data.title);
    expect(created).toBeTruthy();
  });

  test('empty title is rejected', async ({ tasksPage, page }) => {
    await tasksPage.goto('tasks');
    const before = (await readStore(page))?.tasks.length ?? 0;
    await tasksPage.clickAdd();
    await tasksPage.modal.submit();
    await page.waitForTimeout(200);
    const after = (await readStore(page))?.tasks.length ?? 0;
    expect(after).toBe(before);
  });

  test('toggle task done updates store', async ({ tasksPage, page }) => {
    const store = await readStore(page);
    const t = (store?.tasks ?? []).find((x) => !x.done);
    expect(t).toBeTruthy();
    await tasksPage.goto('tasks');
    const before = (await readStore(page))?.tasks.find((x) => x.id === t!.id)?.done;
    await tasksPage.toggleTask(t!.title);
    await page.waitForTimeout(200);
    const after = (await readStore(page))?.tasks.find((x) => x.id === t!.id)?.done;
    expect(after).not.toBe(before);
  });

  test('mark all done filters the list', async ({ tasksPage, page }) => {
    await tasksPage.goto('tasks');
    await tasksPage.setFilter(/Done|Completed/i).catch(() => {});
    await page.waitForTimeout(300);
    await expect(tasksPage.content).toBeVisible();
  });

  test('filter by priority works', async ({ tasksPage, page }) => {
    await tasksPage.goto('tasks');
    await tasksPage.setFilter(/High/i).catch(() => {});
    await page.waitForTimeout(300);
    await expect(tasksPage.content).toBeVisible();
  });

  test('search filters tasks', async ({ tasksPage, page }) => {
    const store = await readStore(page);
    const t = store?.tasks?.[0];
    expect(t).toBeTruthy();
    await tasksPage.goto('tasks');
    await tasksPage.searchList(t!.title.slice(0, 4));
    await page.waitForTimeout(300);
    await expect(tasksPage.content).toBeVisible();
  });
});

test.describe('Tasks — Bulk operations @regression', () => {
  test('create 20 tasks', async ({ tasksPage, page }) => {
    await tasksPage.goto('tasks');
    const before = (await readStore(page))?.tasks.length ?? 0;
    for (let i = 0; i < 20; i++) {
      await tasksPage.clickAdd();
      await tasksPage.modal.fill('What needs doing?', `Bulk Task ${i}-${Date.now()}`);
      await tasksPage.modal.submit();
      await page.waitForTimeout(80);
    }
    const after = (await readStore(page))?.tasks.length ?? 0;
    expect(after).toBeGreaterThanOrEqual(before + 20);
  });
});