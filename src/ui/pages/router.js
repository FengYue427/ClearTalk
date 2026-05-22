/**
 * 路由系统
 */

import { state, subscribe } from '../../core/state.js';
import { triggerHaptic, debounce } from '../../core/utils.js';
import { logger } from '../../core/logger.js';
import { initHome, refreshHome } from './home.js';
import { initSceneDetail } from './scene-detail.js';
import { initMarket } from './market.js';
import { initUser } from './user.js';
import { initHistory } from './history.js';
import { initDialogue } from './dialogue.js';
import { initSettings } from './settings.js';
import { Seo } from '../../services/seo-service.js';
import { getSceneById } from '../../scenes/index.js';
import { t } from '../../core/i18n.js';
import { getSceneName } from '../../core/scene-l10n.js';

// 页面配置
const PAGES = {
  'home': { init: initHome, keepAlive: true },
  'scene-detail': { init: initSceneDetail, keepAlive: false },
  'market': { init: initMarket, keepAlive: true },
  'user': { init: initUser, keepAlive: true },
  'history': { init: initHistory, keepAlive: true },
  'dialogue': { init: initDialogue, keepAlive: false },
  'settings': { init: initSettings, keepAlive: true }
};

// 当前页面
let currentPage = 'home';
let initializedPages = new Set();

// 记录每个keepAlive页面上次渲染时的语言
const pageLanguageMap = new Map();

// 初始化路由
export function initRouter() {
  // 处理浏览器前进后退
  window.addEventListener('popstate', (e) => {
    const page = e.state?.page || 'home';
    navigateTo(page, false);
  });
  
  // 拦截所有带 data-page 属性的链接点击
  document.addEventListener('click', (e) => {
    const link = e.target.closest('[data-page]');
    if (link) {
      e.preventDefault();
      const page = link.dataset.page;
      navigateTo(page);
    }
  });
  
  // 初始渲染
  navigateTo('home', false);
  handleSceneDeepLink();
  window.addEventListener('hashchange', handleSceneDeepLink);
}

/** 场景落地页：#/scene/leave_request */
export function handleSceneDeepLink() {
  const hash = (window.location.hash || '').replace(/^#\/?/, '');
  const match = hash.match(/^scene\/([a-z0-9_]+)/i);
  if (!match) return;

  const scene = getSceneById(match[1]);
  if (!scene) return;

  state.currentScene = scene;
  state.formValues = {};
  navigateTo('scene-detail', false);
}

// 导航到页面
export function navigateTo(page, pushState = true) {
  if (!PAGES[page]) {
    logger.error('Unknown page:', page);
    page = 'home';
  }
  
  const prevPage = currentPage;
  currentPage = page;
  
  logger.debug('Navigate:', prevPage, '->', page);
  
  // 震动反馈
  triggerHaptic();
  
  // 隐藏所有页面
  document.querySelectorAll('.page').forEach(p => {
    p.classList.remove('active');
    // 如果页面不需要保持，清理它
    if (!PAGES[p.id.replace('page-', '')]?.keepAlive) {
      // 延迟清理，等待过渡动画
      setTimeout(() => {
        if (!p.classList.contains('active')) {
          // 取消订阅
          if (p._unsubscribe) {
            p._unsubscribe();
            p._unsubscribe = null;
          }
        }
      }, 300);
    }
  });
  
  // 显示目标页面
  const targetPage = document.getElementById(`page-${page}`);
  if (targetPage) {
    targetPage.classList.add('active');

    // 检查keepAlive页面是否需要重新渲染（语言变化）
    const pageConfig = PAGES[page];
    const currentLang = state.language;
    const lastLang = pageLanguageMap.get(page);
    const needsReinit = pageConfig.keepAlive &&
                        initializedPages.has(page) &&
                        lastLang &&
                        lastLang !== currentLang;

    // 初始化页面（如果是第一次或语言变化）
    if (!initializedPages.has(page) || !pageConfig.keepAlive || needsReinit) {
      if (pageConfig.init) {
        try {
          pageConfig.init();
          initializedPages.add(page);
          pageLanguageMap.set(page, currentLang);
        } catch (error) {
          logger.error('Page init error:', error);
        }
      }
    }

    // 刷新特定页面
    if (page === 'home' && initializedPages.has('home') && !needsReinit) {
      refreshHome();
    }
  }
  
  // 滚动到顶部
  window.scrollTo({ top: 0, behavior: 'smooth' });
  
  // 更新浏览器历史
  if (pushState) {
    history.pushState({ page }, '', `#${page}`);
  }
  
  // 更新页面标题
  updatePageTitle(page);
  
  // 触发导航事件
  window.dispatchEvent(new CustomEvent('navigate', { 
    detail: { from: prevPage, to: page } 
  }));
}

// 返回上一页
export function goBack() {
  if (history.length > 1) {
    history.back();
  } else {
    navigateTo('home');
  }
}

// 获取当前页面
export function getCurrentPage() {
  return currentPage;
}

// 更新页面标题
function updatePageTitle(page) {
  const suffix = ` - ${t('app.name')}`;
  const titles = {
    home: `${t('home.title')}${suffix}`,
    'scene-detail': state.currentScene
      ? `${getSceneName(state.currentScene)}${suffix}`
      : `${t('scene.detail.title')}${suffix}`,
    market: `${t('market.title')}${suffix}`,
    user: `${t('user.title')}${suffix}`,
    history: `${t('history.title')}${suffix}`,
    dialogue: `${t('dialogue.title')}${suffix}`,
    settings: `${t('settings.title')}${suffix}`
  };

  document.title = titles[page] || t('app.name');
  Seo.updateForPage(page);
}

// 注册新页面（动态扩展）
export function registerPage(name, config) {
  PAGES[name] = config;
}

// 预加载页面（在后台初始化）
export function preloadPage(page) {
  if (PAGES[page] && !initializedPages.has(page)) {
    const pageConfig = PAGES[page];
    if (pageConfig.init) {
      // 创建临时容器初始化
      const tempContainer = document.createElement('div');
      tempContainer.style.display = 'none';
      document.body.appendChild(tempContainer);
      
      try {
        pageConfig.init();
        initializedPages.add(page);
      } catch (error) {
        logger.error('Preload error:', error);
      } finally {
        tempContainer.remove();
      }
    }
  }
}

// 导出当前页面状态
export function isPageInitialized(page) {
  return initializedPages.has(page);
}
