const { test, expect } = require('@playwright/test');

test.describe('Search Databases', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('search items for "Stiletto" returns results', async ({ page }) => {
    await page.click('button.tab[data-tab="items"]');
    await page.fill('#itemSearch', 'Stiletto');
    await page.waitForTimeout(500);

    const rowCount = await page.locator('#itemBody tr').count();
    expect(rowCount).toBeGreaterThan(0);
  });

  test('search cards for "Hydra" returns results', async ({ page }) => {
    await page.click('button.tab[data-tab="cards"]');
    await expect(page.locator('#cardSearch')).toBeVisible();

    await page.fill('#cardSearch', 'Hydra');
    await page.waitForTimeout(500);

    const rowCount = await page.locator('#cardBody tr').count();
    expect(rowCount).toBeGreaterThan(0);
  });

  test('search monsters for "Poring" returns results', async ({ page }) => {
    await page.click('button.tab[data-tab="monsters"]');
    await expect(page.locator('#mobSearch')).toBeVisible();

    await page.fill('#mobSearch', 'Poring');
    await page.waitForTimeout(500);

    const rowCount = await page.locator('#mobBody tr').count();
    expect(rowCount).toBeGreaterThan(0);
  });

  test('nonsense search returns no results', async ({ page }) => {
    await page.click('button.tab[data-tab="items"]');
    await page.fill('#itemSearch', 'xyznonexistent');
    await page.waitForTimeout(500);

    const rowCount = await page.locator('#itemBody tr').count();
    expect(rowCount).toBe(0);
  });

  test('clear search restores results', async ({ page }) => {
    await page.click('button.tab[data-tab="items"]');

    await page.fill('#itemSearch', 'Stiletto');
    await page.waitForTimeout(500);
    const filteredCount = await page.locator('#itemBody tr').count();
    expect(filteredCount).toBeGreaterThan(0);

    // Clear search
    await page.fill('#itemSearch', '');
    await page.locator('#itemSearch').dispatchEvent('input');
    await page.waitForTimeout(500);

    // Results should restore
    const restoredCount = await page.locator('#itemBody tr').count();
    expect(restoredCount).toBeGreaterThanOrEqual(filteredCount);
  });

  test('item search results contain relevant text', async ({ page }) => {
    await page.click('button.tab[data-tab="items"]');
    await page.fill('#itemSearch', 'Stiletto');
    await page.waitForTimeout(500);

    const firstRowText = await page.locator('#itemBody tr').first().textContent();
    expect(firstRowText.toLowerCase()).toContain('stiletto');
  });

  test('monster search results contain relevant text', async ({ page }) => {
    await page.click('button.tab[data-tab="monsters"]');
    await page.fill('#mobSearch', 'Poring');
    await page.waitForTimeout(500);

    const firstRowText = await page.locator('#mobBody tr').first().textContent();
    expect(firstRowText.toLowerCase()).toContain('poring');
  });

  test('card search results contain relevant text', async ({ page }) => {
    await page.click('button.tab[data-tab="cards"]');
    await page.fill('#cardSearch', 'Hydra');
    await page.waitForTimeout(500);

    const firstRowText = await page.locator('#cardBody tr').first().textContent();
    expect(firstRowText.toLowerCase()).toContain('hydra');
  });

});
