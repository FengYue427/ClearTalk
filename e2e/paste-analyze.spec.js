import { test, expect } from '@playwright/test';
import { primeApp, gotoHome } from './fixtures.js';

test.describe('粘贴分析', () => {
  test.beforeEach(async ({ page }) => {
    await primeApp(page);
  });

  test('粘贴请假消息应推荐请假场景', async ({ page }) => {
    await gotoHome(page);

    const input = page.locator('#quick-paste-input');
    await expect(input).toBeVisible();

    await input.fill('王经理您好，我想下周请两天年假，家里有事需要处理');
    await page.locator('#btn-analyze-paste').click();

    const results = page.locator('#quick-paste-results');
    await expect(results).toBeVisible();
    await expect(results).not.toHaveClass(/hidden/);

    const match = page.locator('.quick-paste-match-item').first();
    await expect(match).toBeVisible({ timeout: 15_000 });
    await expect(match).toContainText(/请假|Leave/i);
  });
});
