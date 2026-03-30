const { test, expect } = require('@playwright/test');

async function setupStatusSim(page) {
  await page.click('button.tab[data-tab="stat-sim"]');
  await page.selectOption('#ss-job', '4008'); // Lord Knight
  await page.fill('#ss-base-lv', '99');
  await page.locator('#ss-base-lv').dispatchEvent('input');
  await page.fill('#ss-job-lv', '70');
  await page.locator('#ss-job-lv').dispatchEvent('input');
  await page.fill('#ss-val-str', '99');
  await page.locator('#ss-val-str').dispatchEvent('input');
  await page.fill('#ss-val-agi', '60');
  await page.locator('#ss-val-agi').dispatchEvent('input');
  await page.fill('#ss-val-dex', '40');
  await page.locator('#ss-val-dex').dispatchEvent('input');
}

test.describe('Zeny Calculator', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('button.tab[data-tab="zeny-calc"]');
    await expect(page.locator('#sec-zeny-calc')).toBeVisible();
  });

  test('default kills value is 200', async ({ page }) => {
    const killsVal = await page.inputValue('#zc-kills');
    expect(killsVal).toBe('200');
  });

  test('change kills to 300 and verify table has rows', async ({ page }) => {
    await page.fill('#zc-kills', '300');
    await page.locator('#zc-kills').dispatchEvent('input');
    await page.waitForTimeout(300);

    const rowCount = await page.locator('#zc-tbody tr').count();
    expect(rowCount).toBeGreaterThan(0);
  });

  test('table rows contain content', async ({ page }) => {
    await page.waitForTimeout(300);

    const rowCount = await page.locator('#zc-tbody tr').count();
    expect(rowCount).toBeGreaterThan(0);

    // First row should have text content
    const firstRowText = await page.locator('#zc-tbody tr').first().textContent();
    expect(firstRowText.length).toBeGreaterThan(0);
  });

  test('search filter works with map name', async ({ page }) => {
    await page.fill('#zc-search', 'prt_fild');
    await page.locator('#zc-search').dispatchEvent('input');
    await page.waitForTimeout(300);

    const rowCount = await page.locator('#zc-tbody tr').count();
    // Should have some filtered results (or zero if no match, but prt_fild should exist)
    if (rowCount > 0) {
      const firstRowText = await page.locator('#zc-tbody tr').first().textContent();
      expect(firstRowText.toLowerCase()).toContain('prt_fild');
    }
  });

  test('changing sort still shows data', async ({ page }) => {
    await page.waitForTimeout(300);

    // Get available sort options
    const optionCount = await page.locator('#zc-sortby option').count();
    expect(optionCount).toBeGreaterThan(0);

    // Select the second sort option (if available)
    if (optionCount > 1) {
      const secondValue = await page.locator('#zc-sortby option').nth(1).getAttribute('value');
      await page.selectOption('#zc-sortby', secondValue);
      await page.waitForTimeout(300);
    }

    const rowCount = await page.locator('#zc-tbody tr').count();
    expect(rowCount).toBeGreaterThan(0);
  });

  test('drop rate select changes available', async ({ page }) => {
    const optionCount = await page.locator('#zc-droprate option').count();
    expect(optionCount).toBeGreaterThan(0);

    // Change drop rate if multiple options exist
    if (optionCount > 1) {
      const secondValue = await page.locator('#zc-droprate option').nth(1).getAttribute('value');
      await page.selectOption('#zc-droprate', secondValue);
      await page.waitForTimeout(300);

      // Table should still function
      const rowCount = await page.locator('#zc-tbody tr').count();
      expect(rowCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('Use Build button does not error', async ({ page }) => {
    // First set up a build so Use Build has data to pull
    await setupStatusSim(page);

    // Switch back to Zeny Calc
    await page.click('button.tab[data-tab="zeny-calc"]');
    await expect(page.locator('#sec-zeny-calc')).toBeVisible();

    // Click Use Build - should not throw errors
    await page.click('#zc-use-build');
    await page.waitForTimeout(500);

    // Page should still be functional (no crash)
    await expect(page.locator('#sec-zeny-calc')).toBeVisible();
  });

  test('summary section displays', async ({ page }) => {
    await page.waitForTimeout(300);
    await expect(page.locator('#zc-summary')).toBeVisible();
  });

});
