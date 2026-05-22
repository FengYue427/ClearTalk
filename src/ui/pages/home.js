/**
 * 首页 - 场景选择
 */

import { state, subscribe } from '../../core/state.js';
import { Storage } from '../../core/storage.js';
import { triggerHaptic, debounce, events, escapeHtml } from '../../core/utils.js';
import { CATEGORIES, BUILTIN_SCENES, getScenesByCategory, searchScenes } from '../../scenes/index.js';
import { analyzePasteText } from '../../services/paste-service.js';
import { Analytics } from '../../services/analytics-service.js';
import { createSceneCard, createEmptyState, showToast } from '../components/index.js';
import { initSceneDetail } from './scene-detail.js';
import { navigateTo } from './router.js';
import { t } from '../../core/i18n.js';
import { getSceneName, getCategoryName } from '../../scenes/scene-l10n.js';

// 语言变化取消订阅函数
let homeLanguageUnsubscribe = null;

// 当前状态
let currentCategory = 'all';
let searchQuery = '';

// 初始化首页
export function initHome() {
  const page = document.getElementById('page-home');
  if (!page) return;

  // 如果已有语言监听，先取消
  if (homeLanguageUnsubscribe) {
    homeLanguageUnsubscribe();
    homeLanguageUnsubscribe = null;
  }

  // 清空页面重新渲染
  page.innerHTML = '';

  // 渲染头部（如果还没有）
  renderHeader(page);

  // 粘贴分析入口
  renderQuickPaste(page);

  // 渲染搜索栏
  renderSearchBar(page);

  // 渲染分类标签
  renderCategoryTabs(page);

  // 渲染场景列表容器
  const listContainer = document.createElement('div');
  listContainer.id = 'home-scene-list';
  listContainer.className = 'scene-list';
  page.appendChild(listContainer);

  // 初始渲染
  renderSceneList();

  // 订阅自定义场景变化
  const unsubscribe = subscribe('customScenesUpdated', () => {
    if (currentCategory === 'custom' || currentCategory === 'all') {
      renderSceneList();
    }
  });

  // 监听语言变化
  homeLanguageUnsubscribe = () => {
    events.off('language:changed', handleHomeLanguageChange);
  };
  events.on('language:changed', handleHomeLanguageChange);

  // 页面销毁时取消订阅
  page._unsubscribe = () => {
    unsubscribe();
    if (homeLanguageUnsubscribe) {
      homeLanguageUnsubscribe();
      homeLanguageUnsubscribe = null;
    }
  };
}

// 语言变化处理函数
function handleHomeLanguageChange() {
  const page = document.getElementById('page-home');
  if (page && page.classList.contains('active')) {
    initHome();
  }
}

// 绑定头部事件（用于已存在的header）
function bindHeaderEvents(container) {
  const btnMarket = container.querySelector('#btn-market');
  const btnUser = container.querySelector('#btn-user');
  const btnHistory = container.querySelector('#btn-history');
  
  if (btnMarket) {
    btnMarket.addEventListener('click', () => navigateTo('market'));
  }
  if (btnUser) {
    btnUser.addEventListener('click', () => navigateTo('user'));
  }
  if (btnHistory) {
    btnHistory.addEventListener('click', () => navigateTo('history'));
  }
}

// 渲染头部
function renderHeader(container) {
  if (container.querySelector('.header')) {
    // Header 已存在，只绑定事件
    bindHeaderEvents(container);
    return;
  }
  
  const header = document.createElement('header');
  header.className = 'header';
  header.innerHTML = `
    <h1>${t('app.name')}</h1>
    <div class="header-actions">
      <button class="btn-icon" id="btn-market" title="${t('nav.market')}">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
        </svg>
      </button>
      <button class="btn-icon" id="btn-user" title="${t('nav.user')}">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      </button>
      <button class="btn-icon" id="btn-history" title="${t('nav.history')}">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      </button>
    </div>
  `;
  
  // 绑定导航事件
  bindHeaderEvents(header);
  
  container.insertBefore(header, container.firstChild);
}

// 粘贴消息 → 推荐场景
function renderQuickPaste(container) {
  if (container.querySelector('.quick-paste')) return;

  const section = document.createElement('section');
  section.className = 'quick-paste';
  section.innerHTML = `
    <div class="quick-paste-header">
      <span class="quick-paste-icon">💬</span>
      <div>
        <h3 class="quick-paste-title">${t('home.paste.title')}</h3>
        <p class="quick-paste-desc">${t('home.paste.desc')}</p>
      </div>
    </div>
    <textarea
      id="quick-paste-input"
      class="quick-paste-input"
      rows="3"
      placeholder="${t('home.paste.placeholder')}"
    ></textarea>
    <div class="quick-paste-actions">
      <button type="button" class="btn btn-secondary btn-sm" id="btn-paste-clipboard">${t('home.paste.from_clipboard')}</button>
      <button type="button" class="btn btn-primary btn-sm" id="btn-analyze-paste">${t('home.paste.analyze')}</button>
    </div>
    <div id="quick-paste-results" class="quick-paste-results hidden"></div>
  `;

  const input = section.querySelector('#quick-paste-input');
  const resultsEl = section.querySelector('#quick-paste-results');

  section.querySelector('#btn-paste-clipboard').addEventListener('click', async () => {
    try {
      const clip = await navigator.clipboard.readText();
      if (clip) {
        input.value = clip;
        analyzePaste(input.value, resultsEl);
      } else {
        showToast(t('home.paste.empty'));
      }
    } catch {
      showToast(t('home.paste.clipboard_denied'));
    }
  });

  section.querySelector('#btn-analyze-paste').addEventListener('click', () => {
    analyzePaste(input.value, resultsEl);
  });

  container.appendChild(section);
}

async function analyzePaste(text, resultsEl) {
  const trimmed = String(text || '').trim();
  if (!trimmed) {
    showToast(t('home.paste.empty'));
    return;
  }

  triggerHaptic();
  const customScenes = Storage.getCustomScenes();
  const allScenes = [...BUILTIN_SCENES, ...customScenes];

  resultsEl.classList.remove('hidden');
  resultsEl.innerHTML = `<p class="quick-paste-loading">${t('common.loading')}</p>`;

  const { matches, source } = await analyzePasteText(trimmed, allScenes, 3);
  Analytics.track('paste_analyze', {
    meta: { matchCount: matches.length, textLen: trimmed.length, source }
  });

  resultsEl.innerHTML = '';

  if (matches.length === 0) {
    resultsEl.innerHTML = `<p class="quick-paste-no-match">${t('home.paste.no_match')}</p>`;
    return;
  }

  const title = document.createElement('p');
  title.className = 'quick-paste-results-title';
  title.textContent = t('home.paste.suggested');
  resultsEl.appendChild(title);

  const list = document.createElement('div');
  list.className = 'quick-paste-match-list';

  matches.forEach(({ scene, matchedKeywords }) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'quick-paste-match-item';
    btn.innerHTML = `
      <span class="match-icon">${scene.icon || '📝'}</span>
      <span class="match-info">
        <strong>${getSceneName(scene)}</strong>
        <small>${escapeHtml(getCategoryName(scene.category))}${matchedKeywords.length ? ' · ' + escapeHtml(matchedKeywords.slice(0, 2).join(', ')) : ''}</small>
      </span>
      <span class="match-arrow">→</span>
    `;
    btn.addEventListener('click', () => {
      state.currentScene = scene;
      state.formValues = { _pastedContext: trimmed };
      navigateTo('scene-detail');
      showToast(t('home.paste.opened', { name: getSceneName(scene) }));
    });
    list.appendChild(btn);
  });

  resultsEl.appendChild(list);
}

// 渲染搜索栏
function renderSearchBar(container) {
  if (container.querySelector('.search-bar')) return;
  
  const searchBar = document.createElement('div');
  searchBar.className = 'search-bar';
  searchBar.innerHTML = `
    <div class="search-input-wrapper">
      <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input type="text" id="scene-search" placeholder="${t('home.search.placeholder')}" autocomplete="off">
      <button class="search-clear hidden" id="search-clear">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  `;
  
  let input = searchBar.querySelector('#scene-search');
  const clearBtn = searchBar.querySelector('#search-clear');
  
  // 克隆输入框以清除任何缓存的内联事件处理器
  const newInput = input.cloneNode(true);
  input.parentNode.replaceChild(newInput, input);
  input = newInput;
  
  // 搜索功能（防抖）
  input.addEventListener('input', debounce((e) => {
    searchQuery = e.target.value.trim();
    clearBtn.classList.toggle('hidden', !searchQuery);
    renderSceneList();
  }, 300));
  
  // 清除搜索
  clearBtn.addEventListener('click', () => {
    input.value = '';
    searchQuery = '';
    clearBtn.classList.add('hidden');
    renderSceneList();
    input.focus();
  });
  
  container.appendChild(searchBar);
}

// 渲染分类标签
function renderCategoryTabs(container) {
  if (container.querySelector('.category-tabs')) return;
  
  const tabs = document.createElement('div');
  tabs.className = 'category-tabs';
  
  // 获取自定义场景数量
  const customScenes = Storage.getCustomScenes();
  const customCount = customScenes.length;
  
  CATEGORIES.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = `category-tab ${cat.id === currentCategory ? 'active' : ''}`;
    btn.dataset.category = cat.id;
    
    let label = cat.translationKey ? t(cat.translationKey) : cat.name;
    if (cat.id === 'custom' && customCount > 0) {
      label += ` (${customCount})`;
    }
    btn.textContent = label;
    
    btn.addEventListener('click', () => {
      triggerHaptic();
      switchCategory(cat.id);
    });
    
    tabs.appendChild(btn);
  });
  
  container.appendChild(tabs);
}

// 切换分类
export function switchCategory(categoryId) {
  currentCategory = categoryId;
  searchQuery = ''; // 清空搜索
  
  // 更新标签状态
  document.querySelectorAll('.category-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.category === categoryId);
  });
  
  // 清空搜索框
  const searchInput = document.getElementById('scene-search');
  if (searchInput) {
    searchInput.value = '';
    document.getElementById('search-clear')?.classList.add('hidden');
  }
  
  renderSceneList();
}

// 渲染场景列表
export function renderSceneList() {
  const container = document.getElementById('home-scene-list');
  if (!container) return;
  
  // 获取场景数据
  let scenes;
  if (searchQuery) {
    scenes = searchScenes(searchQuery, Storage.getCustomScenes());
  } else {
    scenes = getScenesByCategory(currentCategory, Storage.getCustomScenes());
  }
  
  // 清空容器
  container.innerHTML = '';
  
  // 空状态
  if (scenes.length === 0) {
    const empty = createEmptyState({
      icon: searchQuery ? '🔍' : '📭',
      title: searchQuery ? t('home.search.empty') : t('empty'),
      description: searchQuery ? t('home.search.empty.hint') : t('home.empty.market.hint'),
      action: searchQuery ? null : {
        text: t('nav.market'),
        onClick: () => navigateTo('market')
      }
    });
    container.appendChild(empty);
    return;
  }
  
  // 渲染场景卡片
  scenes.forEach(scene => {
    const card = createSceneCard(scene, (selectedScene) => {
      state.currentScene = selectedScene;
      state.formValues = {};
      navigateTo('scene-detail');
    });
    container.appendChild(card);
  });
}

// 更新分类标签上的数量
export function updateCategoryCount() {
  const customScenes = Storage.getCustomScenes();
  const customTab = document.querySelector('.category-tab[data-category="custom"]');
  if (customTab) {
    const baseName = t('home.custom.scenes') || 'Custom';
    customTab.textContent = customScenes.length > 0 
      ? `${baseName} (${customScenes.length})` 
      : baseName;
  }
}

// 刷新首页
export function refreshHome() {
  renderSceneList();
  updateCategoryCount();
}
