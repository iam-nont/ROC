const { test, expect } = require('@playwright/test');

test.describe('Status Simulator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.click('button.tab[data-tab="stat-sim"]');
    await expect(page.locator('#sec-stat-sim')).toBeVisible();
  });

  test('should select Lord Knight and set levels', async ({ page }) => {
    await page.selectOption('#ss-job', '4008');
    await page.fill('#ss-base-lv', '99');
    await page.locator('#ss-base-lv').dispatchEvent('input');
    await page.fill('#ss-job-lv', '70');
    await page.locator('#ss-job-lv').dispatchEvent('input');

    await expect(page.locator('#ss-job')).toHaveValue('4008');
    await expect(page.locator('#ss-base-lv')).toHaveValue('99');
    await expect(page.locator('#ss-job-lv')).toHaveValue('70');
  });

  test('should set stats and verify ATK > 0', async ({ page }) => {
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

    const atk = parseInt(await page.textContent('#ss-r-atk'));
    expect(atk).toBeGreaterThan(0);
  });

  test('should show HP > 0 after setting stats', async ({ page }) => {
    await page.selectOption('#ss-job', '4008');
    await page.fill('#ss-base-lv', '99');
    await page.locator('#ss-base-lv').dispatchEvent('input');
    await page.fill('#ss-job-lv', '70');
    await page.locator('#ss-job-lv').dispatchEvent('input');

    await page.fill('#ss-val-str', '99');
    await page.locator('#ss-val-str').dispatchEvent('input');

    const hpText = await page.textContent('#ss-hp-val');
    const hp = parseInt(hpText.replace(/,/g, ''));
    expect(hp).toBeGreaterThan(0);
  });

  test('should show ASPD > 0 after setting stats', async ({ page }) => {
    await page.selectOption('#ss-job', '4008');
    await page.fill('#ss-base-lv', '99');
    await page.locator('#ss-base-lv').dispatchEvent('input');
    await page.fill('#ss-job-lv', '70');
    await page.locator('#ss-job-lv').dispatchEvent('input');

    await page.fill('#ss-val-agi', '60');
    await page.locator('#ss-val-agi').dispatchEvent('input');

    const aspd = parseInt(await page.textContent('#ss-r-aspd'));
    expect(aspd).toBeGreaterThan(0);
  });

  test('should display remaining stat points', async ({ page }) => {
    await page.selectOption('#ss-job', '4008');
    await page.fill('#ss-base-lv', '99');
    await page.locator('#ss-base-lv').dispatchEvent('input');

    const remaining = await page.textContent('#ss-remaining');
    expect(remaining.trim()).not.toBe('');
  });

  test('should reset stats when reset button is clicked', async ({ page }) => {
    await page.selectOption('#ss-job', '4008');
    await page.fill('#ss-base-lv', '99');
    await page.locator('#ss-base-lv').dispatchEvent('input');

    await page.fill('#ss-val-str', '99');
    await page.locator('#ss-val-str').dispatchEvent('input');

    await page.click('#ss-reset');

    const strVal = await page.inputValue('#ss-val-str');
    expect(parseInt(strVal)).toBeLessThanOrEqual(1);
  });

  test('should update ROC_BUILD state when setting stats', async ({ page }) => {
    await page.selectOption('#ss-job', '4008');
    await page.fill('#ss-base-lv', '99');
    await page.locator('#ss-base-lv').dispatchEvent('input');
    await page.fill('#ss-job-lv', '70');
    await page.locator('#ss-job-lv').dispatchEvent('input');

    await page.locator('#ss-val-str').evaluate(el => {
      el.value = 99;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.waitForTimeout(300);

    const str = await page.evaluate(() => window.ROC_BUILD.state.stats.str);
    expect(str).toBeGreaterThan(1);
  });

  test('should increment STR with plus button', async ({ page }) => {
    await page.selectOption('#ss-job', '4008');
    await page.fill('#ss-base-lv', '99');
    await page.locator('#ss-base-lv').dispatchEvent('input');

    const beforeVal = parseInt(await page.inputValue('#ss-val-str'));
    await page.click('button[data-action="inc"][data-stat="str"]');
    const afterVal = parseInt(await page.inputValue('#ss-val-str'));

    expect(afterVal).toBe(beforeVal + 1);
  });
});
