const { test, expect } = require('@playwright/test');

test.describe('Tab Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  const tabs = [
    { tab: 'items', section: 'sec-items' },
    { tab: 'cards', section: 'sec-cards' },
    { tab: 'monsters', section: 'sec-monsters' },
    { tab: 'stat-sim', section: 'sec-stat-sim' },
    { tab: 'build-sim', section: 'sec-build-sim' },
    { tab: 'zeny-calc', section: 'sec-zeny-calc' },
    { tab: 'damage-calc', section: 'sec-damage-calc' },
  ];

  for (const { tab, section } of tabs) {
    test(`should switch to ${tab} tab`, async ({ page }) => {
      await page.click(`button.tab[data-tab="${tab}"]`);
      await expect(page.locator(`#${section}`)).toBeVisible();
    });
  }

  test('should only show one section at a time', async ({ page }) => {
    await page.click('button.tab[data-tab="stat-sim"]');
    await expect(page.locator('#sec-stat-sim')).toBeVisible();
    await expect(page.locator('#sec-items')).not.toBeVisible();
  });

  test('default tab should be items', async ({ page }) => {
    await expect(page.locator('#sec-items')).toBeVisible();
    await expect(page.locator('button.tab[data-tab="items"]')).toHaveClass(/active/);
  });
});
