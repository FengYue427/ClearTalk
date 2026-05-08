/**
 * ClearTalk - 主入口文件
 * 模块化架构，基于 ES6 Modules
 */

// 核心模块
import { state, subscribe } from './core/state.js';
import { Storage } from './core/storage.js';
import { logger, perfStart, perfEnd } from './core/logger.js';
import { events, isOnline } from './core/utils.js';
import { API_BASE_URL, APP_INFO } from './core/config.js';
import { initI18n, t } from './core/i18n.js';

// 服务模块
import { UserService } from './services/user-service.js';
import { SyncService } from './services/sync-service.js';
import { MarketService } from './services/market-service.js';
import { addInterceptor } from './services/api-client.js';

// 页面路由
import { initRouter, navigateTo } from './ui/pages/router.js';

// 版本信息
console.log(`%c${APP_INFO.name} v${APP_INFO.version}`, 
  'color: #5B8DEF; font-size: 16px; font-weight: bold;');
console.log('%c模块化重构版本', 'color: #666;');

// 性能监控标记
perfStart('app-init');

// 初始化应用
async function initApp() {
  logger.info('ClearTalk initializing...', { 
    version: APP_INFO.version,
    api: API_BASE_URL,
    online: isOnline()
  });
  
  // 检查协议（避免 file:// 协议）
  checkProtocol();
  
  // 加载设置
  loadSettings();
  
  // 初始化国际化
  initI18n();
  
  // 初始化服务
  await initServices();
  
  // 初始化主题
  applyTheme(state.theme);
  
  // 初始化语言
  applyLanguage();
  
  // 初始化路由
  initRouter();
  
  // 设置全局事件
  setupGlobalEvents();
  
  // 注册全局组件
  registerGlobalComponents();
  
  // 性能监控结束
  perfEnd('app-init');
  
  logger.info('ClearTalk initialized successfully');
}

// 加载设置
function loadSettings() {
  const settings = Storage.get('cleartalk_settings', {});
  
  if (settings.language) state.language = settings.language;
  if (settings.theme) state.theme = settings.theme;
  if (settings.haptic !== undefined) state.haptic = settings.haptic;
  
  logger.debug('Settings loaded', { language: state.language, theme: state.theme });
}

// 初始化服务
async function initServices() {
  // 设置 API 拦截器 - 自动添加 Token
  addInterceptor({
    request: async (config) => {
      const token = UserService.getToken();
      if (token) {
        config.headers = {
          ...config.headers,
          'Authorization': `Bearer ${token}`
        };
      }
      return config;
    }
  });
  
  // 用户服务
  UserService.init();
  
  // 如果已登录，验证 token
  if (UserService.isLoggedIn()) {
    const valid = await UserService.verifyToken();
    if (!valid) {
      logger.warn('Token expired, user logged out');
    }
  }
  
  // 自动同步（如果开启）
  if (UserService.isLoggedIn() && Storage.getSetting('autoSync', false)) {
    try {
      await SyncService.syncWithDirection();
      logger.info('Auto sync completed');
    } catch (error) {
      logger.error('Auto sync failed:', error);
    }
  }
}

// 应用主题
function applyTheme(theme) {
  const root = document.documentElement;
  
  const isDark = theme === 'dark' || 
    (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  root.classList.toggle('dark', isDark);
  root.setAttribute('data-theme', isDark ? 'dark' : 'light');
  
  logger.debug('Theme applied', { theme, isDark });
}

// 应用语言
function applyLanguage() {
  document.documentElement.lang = state.language === 'zh' ? 'zh-CN' : 'en';
  document.documentElement.setAttribute('data-lang', state.language);
}

// 设置全局事件
function setupGlobalEvents() {
  // 主题变化监听
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (state.theme === 'auto') {
      applyTheme('auto');
    }
  });
  
  // 网络状态监听
  window.addEventListener('online', () => {
    document.getElementById('offline-indicator')?.classList.add('hidden');
    events.emit('online');
    logger.info('Connection restored');
  });
  
  window.addEventListener('offline', () => {
    document.getElementById('offline-indicator')?.classList.remove('hidden');
    events.emit('offline');
    logger.warn('Connection lost');
  });
  
  // 页面可见性变化（用于自动同步）
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && UserService.isLoggedIn()) {
      // 页面重新可见时检查是否需要同步
      const lastSync = Storage.getSetting('lastSyncTime', 0);
      const now = Date.now();
      
      // 如果超过30分钟没有同步，自动同步
      if (now - lastSync > 30 * 60 * 1000 && Storage.getSetting('autoSync', false)) {
        SyncService.syncWithDirection().catch(() => {});
      }
    }
  });
  
  // 错误处理
  window.addEventListener('error', (e) => {
    logger.error('Global error:', e.error);
  });
  
  window.addEventListener('unhandledrejection', (e) => {
    logger.error('Unhandled rejection:', e.reason);
  });
}

// 检查协议
function checkProtocol() {
  if (window.location.protocol === 'file:') {
    const warning = document.createElement('div');
    warning.className = 'protocol-warning';
    warning.innerHTML = `
      <div class="protocol-warning-content">
        <h3>⚠️ 请使用服务器打开</h3>
        <p>直接打开文件无法正常使用部分功能</p>
        <p>建议使用 VS Code Live Server</p>
        <button id="btn-dismiss-warning">我知道了</button>
      </div>
    `;
    document.body.insertBefore(warning, document.body.firstChild);
    
    // 绑定关闭事件
    warning.querySelector('#btn-dismiss-warning')?.addEventListener('click', () => {
      warning.remove();
    });
    
    logger.warn('Running from file:// protocol');
  }
}

// 注册全局组件
function registerGlobalComponents() {
  // 导出到 window 供 HTML 内联事件使用
  window.navigateTo = navigateTo;
  window.showToast = (msg) => import('./ui/components/index.js').then(m => m.showToast(msg));
  window.showModal = (opts) => import('./ui/components/index.js').then(m => m.showModal(opts));
  window.showConfirm = (opts) => import('./ui/components/index.js').then(m => m.showConfirm(opts));
  window.showActionSheet = (opts) => import('./ui/components/index.js').then(m => m.showActionSheet(opts));
}

// 订阅状态变化
subscribe('language', (newLang) => {
  applyLanguage();
  // 触发语言切换事件
  events.emit('language:change', newLang);
});

subscribe('theme', (newTheme) => {
  applyTheme(newTheme);
});

// DOM 加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// 导出核心模块供外部使用
export { state, Storage, logger, events, UserService, SyncService, MarketService };

// PWA 注册
if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    const swUrl = 'sw.js';
    fetch(swUrl, { cache: 'no-store' })
      .then((res) => {
        const contentType = res.headers.get('content-type') || '';
        if (!res.ok) {
          throw new Error(`sw.js fetch failed: ${res.status}`);
        }
        if (!contentType.includes('javascript')) {
          throw new Error(`sw.js content-type is not javascript: ${contentType}`);
        }
        return navigator.serviceWorker.register(swUrl);
      })
      .then((registration) => {
        logger.info('SW registered:', registration.scope);
      })
      .catch((error) => {
        logger.warn('SW registration skipped/failed:', error);
      });
  });
}

console.log('✅ ClearTalk 模块化架构已加载');
