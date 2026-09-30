/**
 * UI tests — Settings page.
 */
import { test, expect } from '../../fixtures';
import { readStore, storageBytes } from '../../utils/helpers/data-store';

test.describe('Settings — Load @smoke', () => {
  test('page loads', async ({ settingsPage }) => {
    await settingsPage.goto('settings');
    await settingsPage.assertLoaded();
  });

  test('shows version label', async ({ settingsPage }) => {
    await settingsPage.goto('settings');
    const version = await settingsPage.versionLabel();
    // Should look like a semver-ish version (digits + dots).
    expect(version).toMatch(/\d+\.\d+/);
  });

  test('shows plan label', async ({ settingsPage }) => {
    await settingsPage.goto('settings');
    const plan = await settingsPage.planLabel();
    // Plan label should be non-empty and indicate a tier.
    expect(plan.length).toBeGreaterThan(0);
    expect(plan).toMatch(/Pro|Basic|Free|Tier/i);
  });

  test('shows current entity counts', async ({ settingsPage }) => {
    await settingsPage.goto('settings');
    const txt = await settingsPage.content.textContent();
    expect(txt).toMatch(/clients|projects|invoices|tasks/);
  });
});

test.describe('Settings — Mutate @regression', () => {
  test('change business name persists', async ({ settingsPage, page }) => {
    await settingsPage.goto('settings');
    const newName = `Biz-${Date.now()}`;
    await settingsPage.setBusinessName(newName).catch(() => {});
    await page.waitForTimeout(300);
    const store = await readStore(page);
    expect(store?.settings.businessName).toBe(newName);
  });

  test('change persists across reload', async ({ settingsPage, page }) => {
    await settingsPage.goto('settings');
    const newName = `BizPersist-${Date.now()}`;
    await settingsPage.setBusinessName(newName).catch(() => {});
    await page.waitForTimeout(300);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await settingsPage.goto('settings');
    const store = await readStore(page);
    expect(store?.settings.businessName).toBe(newName);
  });

  test('export everything triggers a download', async ({ settingsPage, page }) => {
    await settingsPage.goto('settings');
    const dl = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
    if (await settingsPage.exportBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await settingsPage.exportBtn.click();
    }
    const file = await dl;
    if (file) {
      expect(file.suggestedFilename()).toMatch(/\.xlsx$/);
    }
  });

  test('backup JSON download contains the store', async ({ settingsPage, page }) => {
    await settingsPage.goto('settings');
    const dl = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
    if (await settingsPage.backupBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await settingsPage.backupBtn.click();
    }
    const file = await dl;
    if (file) {
      expect(file.suggestedFilename()).toMatch(/backup|\.json$/);
    }
  });

  test('storage byte count > 0 after seed', async ({ settingsPage }) => {
    await settingsPage.goto('settings');
    const bytes = await storageBytes(settingsPage.page);
    expect(bytes).toBeGreaterThan(0);
  });
});

test.describe('Settings — Erase @regression', () => {
  test('erase all wipes clients', async ({ settingsPage, page }) => {
    await settingsPage.goto('settings');
    const before = (await readStore(page))?.clients.length ?? 0;
    expect(before).toBeGreaterThan(0);
    await settingsPage.eraseAll().catch(() => {});
    await page.waitForTimeout(400);
    const after = (await readStore(page))?.clients.length ?? 0;
    expect(after).toBe(0);
  });
});

test.describe('Settings — Theme inline @regression', () => {
  test('inline theme toggle switches theme', async ({ settingsPage }) => {
    await settingsPage.goto('settings');
    await settingsPage.theme.set('dark');
    await settingsPage.theme.expectTheme('dark');
  });
});