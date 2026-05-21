import { test, expect } from '@playwright/test';
import { primeApp, gotoHome } from './fixtures.js';

test.describe('ClearTalk 核心流程', () => {
  test.beforeEach(async ({ page }) => {
    await primeApp(page);
  });

  test('首页加载并展示场景列表', async ({ page }) => {
    await gotoHome(page);
    const cards = page.locator('#home-scene-list .scene-card');
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThan(5);
  });

  test('选择场景 → 填写 → 本地生成 → 显示结果', async ({ page }) => {
    await gotoHome(page);

    await page.locator('.scene-card[data-id="loan_reminder"]').click();
    await expect(page.locator('#page-scene-detail.active')).toBeVisible({ timeout: 10_000 });

    await page.locator('[data-key="borrower"]').fill('小李');
    await page.locator('[data-key="amount"]').fill('500元');
    await page.locator('[data-key="loanDate"]').fill('2025-12-01');

    await page.locator('#btn-generate').click();

    await expect(page.locator('#result-section')).not.toHaveClass(/hidden/, { timeout: 15_000 });

    const result = page.locator('#result-content');
    await expect(result).not.toBeEmpty();

    const text = await result.textContent();
    expect(text.length).toBeGreaterThan(5);

    await expect(page.locator('#btn-copy')).toBeEnabled();
  });

  test('提交有帮助反馈', async ({ page }) => {
    await page.route('**/api/feedback', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, id: 'e2e-feedback-1' })
      });
    });

    await gotoHome(page);
    await page.locator('.scene-card[data-id="loan_reminder"]').click();
    await expect(page.locator('#page-scene-detail.active')).toBeVisible();

    await page.locator('[data-key="borrower"]').fill('小李');
    await page.locator('[data-key="amount"]').fill('500元');
    await page.locator('[data-key="loanDate"]').fill('2025-12-01');

    await page.locator('#btn-generate').click();
    await expect(page.locator('#result-content')).not.toBeEmpty({ timeout: 15_000 });

    await page.locator('#fb-helpful').click();
    await expect(page.locator('#feedback-thanks')).toBeVisible();
  });

  test('打开历史记录页', async ({ page }) => {
    await gotoHome(page);
    await page.locator('#btn-history').click();
    await expect(page.locator('#page-history.active')).toBeVisible({ timeout: 10_000 });
  });
});
