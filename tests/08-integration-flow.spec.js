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

test.describe('Integration Flow', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Full Lord Knight build planning flow', async ({ page }) => {
    // 1. Status Sim: Create LK build
    await page.click('button.tab[data-tab="stat-sim"]');
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

    // Verify ATK
    const atk = parseInt(await page.textContent('#ss-r-atk'));
    expect(atk).toBeGreaterThan(0);

    // 2. Build Simulator: Equipment
    await page.click('button.tab[data-tab="build-sim"]');
    await expect(page.locator('#bs-class-name')).toHaveText('Lord Knight');

    // Equip weapon
    await page.fill('.bs-equip-search[data-slot="weapon"]', 'Two-Handed Sword');
    await page.waitForTimeout(500);
    const weaponItem = page.locator('#bs-dd-weapon .bs-dd-item').first();
    await expect(weaponItem).toBeVisible();
    await weaponItem.click();
    await expect(page.locator('#bs-sel-weapon')).toBeVisible();

    // Set refine +7
    await page.fill('.bs-refine-input[data-slot="weapon"]', '7');
    await page.locator('.bs-refine-input[data-slot="weapon"]').dispatchEvent('input');

    // Set bonuses
    await page.fill('#bs-bonus-race', '20');
    await page.locator('#bs-bonus-race').dispatchEvent('input');
    await page.selectOption('#bs-weapon-ele', 'Fire');

    // Set costume bonus
    await page.fill('#bs-cos-str', '5');
    await page.locator('#bs-cos-str').dispatchEvent('input');

    // 3. Skill Selection
    const skillOptions = await page.locator('#bs-skill-select option').count();
    expect(skillOptions).toBeGreaterThan(1);
    // Select first non-empty skill
    const firstSkillValue = await page.locator('#bs-skill-select option:not([value=""])').first().getAttribute('value');
    await page.selectOption('#bs-skill-select', firstSkillValue);
    // Set skill to max level
    await page.locator('#bs-skill-slider').evaluate(el => {
      el.value = el.max;
      el.dispatchEvent(new Event('input'));
    });

    // 4. Target Monster
    await page.fill('#bs-monster-search', 'Orc');
    await page.waitForTimeout(500);
    const monItem = page.locator('#bs-monster-dd .bs-dd-item').first();
    await expect(monItem).toBeVisible();
    await monItem.click();

    // Verify damage
    await page.waitForTimeout(300);
    const hitText = await page.textContent('#bs-d-hit');
    const hit = parseInt(hitText.replace(/,/g, ''));
    expect(hit).toBeGreaterThan(0);

    const dpsText = await page.textContent('#bs-d-dps');
    const dps = parseInt(dpsText.replace(/,/g, ''));
    expect(dps).toBeGreaterThan(0);

    const kphText = await page.textContent('#bs-d-kph');
    expect(kphText).not.toBe('-');

    // 5. Zeny Calc Integration
    await page.click('button.tab[data-tab="zeny-calc"]');
    await page.click('#zc-use-build');
    await page.waitForTimeout(500);
    const rows = await page.locator('#zc-tbody tr').count();
    expect(rows).toBeGreaterThan(0);
  });

  test('tab switching preserves Status Sim data', async ({ page }) => {
    // Set up Status Sim
    await setupStatusSim(page);

    // Read current STR value
    const strBefore = await page.inputValue('#ss-val-str');
    expect(strBefore).toBe('99');

    // Read ATK
    const atkBefore = await page.textContent('#ss-r-atk');

    // Switch to Build Sim tab
    await page.click('button.tab[data-tab="build-sim"]');
    await expect(page.locator('#bs-class-name')).toBeVisible();

    // Switch to Items tab
    await page.click('button.tab[data-tab="items"]');
    await expect(page.locator('#itemSearch')).toBeVisible();

    // Switch back to Status Sim
    await page.click('button.tab[data-tab="stat-sim"]');

    // Verify data is preserved
    const strAfter = await page.inputValue('#ss-val-str');
    expect(strAfter).toBe('99');

    const atkAfter = await page.textContent('#ss-r-atk');
    const atkNum = parseInt(atkAfter);
    expect(atkNum).toBeGreaterThan(0);

    // Verify job is still Lord Knight
    const jobVal = await page.inputValue('#ss-job');
    expect(jobVal).toBe('4008');
  });

  test('build data carries to Zeny Calc', async ({ page }) => {
    // Set up Status Sim with LK build
    await setupStatusSim(page);

    // Switch to Build Sim and equip weapon + select monster
    await page.click('button.tab[data-tab="build-sim"]');
    await expect(page.locator('#bs-class-name')).toHaveText('Lord Knight');

    // Equip a weapon
    await page.fill('.bs-equip-search[data-slot="weapon"]', 'Katana');
    await page.waitForTimeout(500);
    await page.locator('#bs-dd-weapon .bs-dd-item').first().click();

    // Set refine
    await page.fill('.bs-refine-input[data-slot="weapon"]', '7');
    await page.locator('.bs-refine-input[data-slot="weapon"]').dispatchEvent('input');

    // Select target monster for DPS calculation
    await page.fill('#bs-monster-search', 'Poring');
    await page.waitForTimeout(500);
    await page.locator('#bs-monster-dd .bs-dd-item').first().click();
    await page.waitForTimeout(300);

    // Verify damage is calculated
    const hitText = await page.textContent('#bs-d-hit');
    const hit = parseInt(hitText.replace(/,/g, ''));
    expect(hit).toBeGreaterThan(0);

    // Switch to Zeny Calc and use build
    await page.click('button.tab[data-tab="zeny-calc"]');
    await expect(page.locator('#sec-zeny-calc')).toBeVisible();

    await page.click('#zc-use-build');
    await page.waitForTimeout(500);

    // Zeny Calc should have data loaded from build
    const rowCount = await page.locator('#zc-tbody tr').count();
    expect(rowCount).toBeGreaterThan(0);

    // Summary should be visible
    await expect(page.locator('#zc-summary')).toBeVisible();
  });

  test('full database search across all tabs', async ({ page }) => {
    // Search items
    await page.click('button.tab[data-tab="items"]');
    await page.fill('#itemSearch', 'Sword');
    await page.waitForTimeout(500);
    const itemCount = await page.locator('#itemBody tr').count();
    expect(itemCount).toBeGreaterThan(0);

    // Search cards
    await page.click('button.tab[data-tab="cards"]');
    await page.fill('#cardSearch', 'Andre');
    await page.waitForTimeout(500);
    const cardCount = await page.locator('#cardBody tr').count();
    expect(cardCount).toBeGreaterThan(0);

    // Search monsters
    await page.click('button.tab[data-tab="monsters"]');
    await page.fill('#mobSearch', 'Goblin');
    await page.waitForTimeout(500);
    const monsterCount = await page.locator('#mobBody tr').count();
    expect(monsterCount).toBeGreaterThan(0);

    // Go back to items - section should be visible
    await page.click('button.tab[data-tab="items"]');
    await expect(page.locator('#sec-items')).toBeVisible();
  });

});
