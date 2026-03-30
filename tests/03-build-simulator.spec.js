const { test, expect } = require('@playwright/test');

/**
 * Helper: set up Status Simulator as Lord Knight with stats,
 * then switch to Build Simulator tab.
 */
async function setupLordKnightBuild(page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Set up Status Simulator first
  await page.click('button.tab[data-tab="stat-sim"]');
  await expect(page.locator('#sec-stat-sim')).toBeVisible();

  await page.selectOption('#ss-job', '4008');
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

  // Switch to Build Simulator
  await page.click('button.tab[data-tab="build-sim"]');
  await expect(page.locator('#sec-build-sim')).toBeVisible();
}

test.describe('Build Simulator', () => {
  test('should search and equip a weapon', async ({ page }) => {
    await setupLordKnightBuild(page);

    await page.fill('.bs-equip-search[data-slot="weapon"]', 'Katana');
    // Wait for debounce (500ms) + dropdown to appear
    await page.waitForTimeout(700);
    await expect(page.locator('#bs-dd-weapon .bs-dd-item').first()).toBeVisible();
    await page.locator('#bs-dd-weapon .bs-dd-item').first().click();

    await expect(page.locator('#bs-sel-weapon')).toBeVisible();
  });

  test('should set refine level and show refine bonus', async ({ page }) => {
    await setupLordKnightBuild(page);

    // Equip weapon first
    await page.fill('.bs-equip-search[data-slot="weapon"]', 'Katana');
    await page.waitForTimeout(700);
    await page.locator('#bs-dd-weapon .bs-dd-item').first().click();
    await expect(page.locator('#bs-sel-weapon')).toBeVisible();

    // Set refine to 7
    await page.fill('.bs-refine-input[data-slot="weapon"]', '7');
    await page.locator('.bs-refine-input[data-slot="weapon"]').dispatchEvent('input');

    const refineText = await page.textContent('#bs-b-refine');
    expect(refineText).not.toBe('+0');
  });

  test('should search and equip headgear', async ({ page }) => {
    await setupLordKnightBuild(page);

    await page.fill('.bs-equip-search[data-slot="headTop"]', 'Tiger');
    await page.waitForTimeout(700);
    await expect(page.locator('#bs-dd-headTop .bs-dd-item').first()).toBeVisible();
    await page.locator('#bs-dd-headTop .bs-dd-item').first().click();

    await expect(page.locator('#bs-sel-headTop')).toBeVisible();
  });

  test('should set race bonus and verify display', async ({ page }) => {
    await setupLordKnightBuild(page);

    await page.fill('#bs-bonus-race', '20');
    await page.locator('#bs-bonus-race').dispatchEvent('input');

    const raceText = await page.textContent('#bs-b-race');
    expect(raceText).toContain('+20%');
  });

  test('should set weapon element to Fire', async ({ page }) => {
    await setupLordKnightBuild(page);

    // Equip weapon first
    await page.fill('.bs-equip-search[data-slot="weapon"]', 'Katana');
    await page.waitForTimeout(700);
    await page.locator('#bs-dd-weapon .bs-dd-item').first().click();
    await expect(page.locator('#bs-sel-weapon')).toBeVisible();

    await page.selectOption('#bs-weapon-ele', 'Fire');

    const eleText = await page.textContent('#bs-b-ele');
    expect(eleText).toContain('Fire');
  });

  test('should set costume STR bonus and verify display', async ({ page }) => {
    await setupLordKnightBuild(page);

    await page.fill('#bs-cos-str', '5');
    await page.locator('#bs-cos-str').dispatchEvent('input');

    const costumeText = await page.textContent('#bs-b-costume');
    expect(costumeText).toContain('STR');
  });

  test('should set costume ATK bonus and verify display', async ({ page }) => {
    await setupLordKnightBuild(page);

    await page.fill('#bs-cos-atk', '3');
    await page.locator('#bs-cos-atk').dispatchEvent('input');

    const costumeText = await page.textContent('#bs-b-costume');
    expect(costumeText).toContain('ATK');
  });
});
