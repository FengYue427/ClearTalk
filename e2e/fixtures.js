/**
 * E2E 测试前置：使用本地 AI，避免依赖后端 Key
 */
export const E2E_SETTINGS = {
  language: 'zh',
  theme: 'auto',
  haptic: false,
  aiProvider: 'local',
  aiModel: 'deepseek-chat',
  useStream: false
};

export async function primeApp(page) {
  await page.addInitScript((settings) => {
    localStorage.setItem('cleartalk_settings', JSON.stringify(settings));
    localStorage.setItem('cleartalk_language', settings.language || 'zh');
  }, E2E_SETTINGS);
}

export async function gotoHome(page) {
  await page.goto('/');
  await page.waitForSelector('#page-home.active', { timeout: 15_000 });
  await page.waitForSelector('#home-scene-list .scene-card', { timeout: 15_000 });
}
