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

test.describe('Damage Output - Build Simulator', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await setupStatusSim(page);
    await page.click('button.tab[data-tab="build-sim"]');
    await expect(page.locator('#bs-class-name')).toBeVisible();
  });

  test('equip weapon and set refine', async ({ page }) => {
    // Search weapon "Katana"
    await page.fill('.bs-equip-search[data-slot="weapon"]', 'Katana');
    await page.waitForTimeout(500);
    const weaponItem = page.locator('#bs-dd-weapon .bs-dd-item').first();
    await expect(weaponItem).toBeVisible();
    await weaponItem.click();

    // Verify weapon is selected
    await expect(page.locator('#bs-sel-weapon')).toBeVisible();

    // Set refine to +7
    await page.fill('.bs-refine-input[data-slot="weapon"]', '7');
    await page.locator('.bs-refine-input[data-slot="weapon"]').dispatchEvent('input');

    // Verify refine value stuck
    const refineVal = await page.inputValue('.bs-refine-input[data-slot="weapon"]');
    expect(refineVal).toBe('7');
  });

  test('set bonus race percentage', async ({ page }) => {
    // Set bonus race to 20%
    await page.fill('#bs-bonus-race', '20');
    await page.locator('#bs-bonus-race').dispatchEvent('input');

    const val = await page.inputValue('#bs-bonus-race');
    expect(val).toBe('20');
  });

  test('search and select target monster', async ({ page }) => {
    // Search monster "Poring"
    await page.fill('#bs-monster-search', 'Poring');
    await page.waitForTimeout(500);

    // Dropdown should appear with results
    const monsterItem = page.locator('#bs-monster-dd .bs-dd-item').first();
    await expect(monsterItem).toBeVisible();
    await monsterItem.click();

    // Target display should show the selected monster
    await expect(page.locator('#bs-target-display')).toBeVisible();
    const targetText = await page.textContent('#bs-target-display');
    expect(targetText.length).toBeGreaterThan(0);
  });

  test('damage numbers appear after full setup', async ({ page }) => {
    // Equip weapon
    await page.fill('.bs-equip-search[data-slot="weapon"]', 'Katana');
    await page.waitForTimeout(500);
    await page.locator('#bs-dd-weapon .bs-dd-item').first().click();

    // Set refine +7
    await page.fill('.bs-refine-input[data-slot="weapon"]', '7');
    await page.locator('.bs-refine-input[data-slot="weapon"]').dispatchEvent('input');

    // Set bonus race 20%
    await page.fill('#bs-bonus-race', '20');
    await page.locator('#bs-bonus-race').dispatchEvent('input');

    // Select target monster
    await page.fill('#bs-monster-search', 'Poring');
    await page.waitForTimeout(500);
    await page.locator('#bs-monster-dd .bs-dd-item').first().click();
    await page.waitForTimeout(300);

    // Verify hit damage is numeric and > 0
    const hitText = await page.textContent('#bs-d-hit');
    const hit = parseInt(hitText.replace(/,/g, ''));
    expect(hit).toBeGreaterThan(0);

    // Verify DPS > 0
    const dpsText = await page.textContent('#bs-d-dps');
    const dps = parseInt(dpsText.replace(/,/g, ''));
    expect(dps).toBeGreaterThan(0);

    // Verify KPH > 0
    const kphText = await page.textContent('#bs-d-kph');
    expect(kphText).not.toBe('-');
    expect(kphText).not.toBe('0');
  });

  test('breakdown table has rows after target selected', async ({ page }) => {
    // Equip weapon
    await page.fill('.bs-equip-search[data-slot="weapon"]', 'Katana');
    await page.waitForTimeout(500);
    await page.locator('#bs-dd-weapon .bs-dd-item').first().click();

    // Select target monster
    await page.fill('#bs-monster-search', 'Poring');
    await page.waitForTimeout(500);
    await page.locator('#bs-monster-dd .bs-dd-item').first().click();
    await page.waitForTimeout(300);

    // Verify breakdown body has rows
    const rowCount = await page.locator('#bs-breakdown-body tr').count();
    expect(rowCount).toBeGreaterThan(0);
  });

});
