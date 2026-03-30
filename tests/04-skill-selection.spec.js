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

test.describe('Skill Selection', () => {
  test.beforeEach(async ({ page }) => {
    await setupLordKnightBuild(page);
  });

  test('should display class name as Lord Knight', async ({ page }) => {
    const className = await page.textContent('#bs-class-name');
    expect(className).toContain('Lord Knight');
  });

  test('should have skills in the dropdown', async ({ page }) => {
    const optionCount = await page.locator('#bs-skill-select option').count();
    expect(optionCount).toBeGreaterThan(1);
  });

  test('should select a skill from dropdown', async ({ page }) => {
    // Select first available skill (nth(1) skips the placeholder option)
    const skillOption = page.locator('#bs-skill-select option').nth(1);
    const skillValue = await skillOption.getAttribute('value');
    await page.selectOption('#bs-skill-select', skillValue);

    const selectedValue = await page.inputValue('#bs-skill-select');
    expect(selectedValue).not.toBe('');
  });

  test('should set skill level to max and show SP cost > 0', async ({ page }) => {
    // Select a skill first
    const secondOption = page.locator('#bs-skill-select option').nth(1);
    const value = await secondOption.getAttribute('value');
    await page.selectOption('#bs-skill-select', value);

    // Set skill level to max
    await page.locator('#bs-skill-slider').evaluate(el => {
      el.value = el.max;
      el.dispatchEvent(new Event('input'));
    });

    const spText = await page.textContent('#bs-sp-cost');
    const sp = parseInt(spText.replace(/[^0-9]/g, ''));
    expect(sp).toBeGreaterThan(0);
  });

  test('should show skill info when skill is selected', async ({ page }) => {
    const secondOption = page.locator('#bs-skill-select option').nth(1);
    const value = await secondOption.getAttribute('value');
    await page.selectOption('#bs-skill-select', value);

    // Set skill level to max
    await page.locator('#bs-skill-slider').evaluate(el => {
      el.value = el.max;
      el.dispatchEvent(new Event('input'));
    });

    // At least one of the skill info fields should have content
    const dmgText = await page.textContent('#bs-si-dmg');
    const typeText = await page.textContent('#bs-si-type');
    const infoFilled = dmgText.trim() !== '' || typeText.trim() !== '';
    expect(infoFilled).toBe(true);
  });

  test('should display skill level number', async ({ page }) => {
    const secondOption = page.locator('#bs-skill-select option').nth(1);
    const value = await secondOption.getAttribute('value');
    await page.selectOption('#bs-skill-select', value);

    await page.locator('#bs-skill-slider').evaluate(el => {
      el.value = el.max;
      el.dispatchEvent(new Event('input'));
    });

    const lvText = await page.textContent('#bs-skill-lv-num');
    const lv = parseInt(lvText);
    expect(lv).toBeGreaterThan(0);
  });

  test('should show damage output when weapon equipped and skill selected', async ({ page }) => {
    // Equip a weapon
    await page.fill('.bs-equip-search[data-slot="weapon"]', 'Katana');
    await page.waitForTimeout(700);
    await page.locator('#bs-dd-weapon .bs-dd-item').first().click();
    await expect(page.locator('#bs-sel-weapon')).toBeVisible();

    // Select first available skill
    const skillOpt = page.locator('#bs-skill-select option').nth(1);
    const skillVal = await skillOpt.getAttribute('value');
    await page.selectOption('#bs-skill-select', skillVal);

    // Set skill level to max
    await page.locator('#bs-skill-slider').evaluate(el => {
      el.value = el.max;
      el.dispatchEvent(new Event('input'));
    });

    // Wait for damage calculation
    await page.waitForTimeout(500);

    const hitText = await page.textContent('#bs-d-hit');
    const hit = parseInt(hitText.replace(/[^0-9]/g, ''));
    expect(hit).toBeGreaterThan(0);
  });
});
