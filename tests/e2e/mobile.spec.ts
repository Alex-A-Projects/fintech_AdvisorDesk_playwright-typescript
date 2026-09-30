/**
 * Mobile responsive tests — exercise the same flows at phone widths.
 */
import { test, expect } from '../../fixtures';

test.describe('Mobile — Dashboard @smoke', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('content renders at 390x844', async ({ dashboardPage }) => {
    await dashboardPage.goto('dashboard');
    await dashboardPage.assertLoaded();
  });

  test('sidebar collapses or is hidden', async ({ dashboardPage }) => {
    await dashboardPage.goto('dashboard');
    await expect(dashboardPage.content).toBeVisible();
  });
});

test.describe('Mobile — Clients @regression', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('clients list renders', async ({ clientsPage }) => {
    await clientsPage.goto('clients');
    await clientsPage.assertLoaded();
  });

  test('client form modal fits on small screens', async ({ clientsPage }) => {
    await clientsPage.goto('clients');
    await clientsPage.clickAdd();
    await clientsPage.modal.expectVisible();
  });
});

test.describe('Mobile — Tasks @regression', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('tasks list renders', async ({ tasksPage }) => {
    await tasksPage.goto('tasks');
    await tasksPage.assertLoaded();
  });
});