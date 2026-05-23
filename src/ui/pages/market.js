/**
 * 场景市场页
 */

import { MarketService } from '../../services/market-service.js';
import { UserService } from '../../services/user-service.js';
import { state } from '../../core/state.js';
import { logger } from '../../core/logger.js';
import { triggerHaptic, isOnline, events } from '../../core/utils.js';
import { showToast, showLoading, showConfirm, createEmptyState, createSceneCard } from '../components/index.js';
import { navigateTo } from './router.js';
import { t, translateApiError } from '../../core/i18n.js';
import {
  getSceneName,
  getSceneDescription,
  getCategoryName,
  getFieldLabel
} from '../../core/scene-l10n.js';
import { CATEGORIES } from '../../scenes/index.js';

// 语言变化取消订阅函数
let marketLanguageUnsubscribe = null;

// 当前标签和状态
let currentTab = 'hot';
let currentPage = 1;
let hasMore = true;
let isLoading = false;
let scenesCache = [];

// 初始化市场页
export function initMarket() {
  const page = document.getElementById('page-market');
  if (!page) return;

  // 如果已有语言监听，先取消
  if (marketLanguageUnsubscribe) {
    marketLanguageUnsubscribe();
    marketLanguageUnsubscribe = null;
  }

  // 清空重建
  page.innerHTML = '';

  // 渲染头部
  renderHeader(page);

  // 渲染标签栏
  renderTabs(page);

  // 渲染列表容器
  const listContainer = document.createElement('div');
  listContainer.id = 'market-list';
  listContainer.className = 'market-list';
  page.appendChild(listContainer);

  // 初始加载
  loadScenes();

  // 滚动加载更多
  listContainer.addEventListener('scroll', handleScroll);

  // 监听语言变化
  marketLanguageUnsubscribe = () => {
    events.off('language:changed', handleMarketLanguageChange);
  };
  events.on('language:changed', handleMarketLanguageChange);

  // 页面销毁时取消订阅
  page._unsubscribe = () => {
    if (marketLanguageUnsubscribe) {
      marketLanguageUnsubscribe();
      marketLanguageUnsubscribe = null;
    }
  };
}

// 语言变化处理函数
function handleMarketLanguageChange() {
  const page = document.getElementById('page-market');
  if (page && page.classList.contains('active')) {
    initMarket();
  }
}

// 渲染头部
function renderHeader(container) {
  const header = document.createElement('header');
  header.className = 'header';
  header.innerHTML = `
    <button class="btn-icon" id="btn-back">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 12H5M12 19l-7-7 7-7"/>
      </svg>
    </button>
    <h2>${t('nav.market')}</h2>
    <div class="header-actions">
      <button class="btn-icon" id="btn-share" title="${t('market.share.scene')}">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/>
        </svg>
      </button>
    </div>
  `;
  
  header.querySelector('#btn-back').addEventListener('click', () => navigateTo('home'));
  header.querySelector('#btn-share').addEventListener('click', shareCurrentScene);
  
  container.appendChild(header);
}

// 渲染标签
function renderTabs(container) {
  const tabs = document.createElement('div');
  tabs.className = 'market-tabs';
  tabs.innerHTML = `
    <button class="market-tab ${currentTab === 'hot' ? 'active' : ''}" data-tab="hot">
      <span class="tab-icon">🔥</span> ${t('market.tab.hot')}
    </button>
    <button class="market-tab ${currentTab === 'latest' ? 'active' : ''}" data-tab="latest">
      <span class="tab-icon">✨</span> ${t('market.tab.latest')}
    </button>
    <button class="market-tab ${currentTab === 'my' ? 'active' : ''}" data-tab="my">
      <span class="tab-icon">📤</span> ${t('market.tab.my')}
    </button>
  `;
  
  tabs.querySelectorAll('.market-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const newTab = tab.dataset.tab;
      if (newTab === 'my' && !UserService.isLoggedIn()) {
        showToast(t('auth.login.required'));
        navigateTo('user');
        return;
      }
      
      currentTab = newTab;
      currentPage = 1;
      hasMore = true;
      scenesCache = [];
      
      // 更新标签状态
      tabs.querySelectorAll('.market-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      triggerHaptic();
      loadScenes();
    });
  });
  
  container.appendChild(tabs);
}

// 加载场景列表
async function loadScenes() {
  if (isLoading || !hasMore) return;
  
  isLoading = true;
  const container = document.getElementById('market-list');
  
  // 显示加载提示
  if (currentPage === 1) {
    container.innerHTML = `<div class="loading-hint">${t('loading')}...</div>`;
  }
  
  try {
    let result;
    
    switch (currentTab) {
      case 'hot':
        result = await MarketService.getHotScenes({ page: currentPage });
        break;
      case 'latest':
        result = await MarketService.getLatestScenes({ page: currentPage });
        break;
      case 'my':
        result = await MarketService.getMyScenes({ page: currentPage });
        break;
    }
    
    // 检查是否是直接打开文件
    if (window.location.protocol === 'file:') {
      container.innerHTML = `
        <div class="market-error">
          <p>${t('market.error.file.protocol')}</p>
          <p class="error-hint">${t('market.error.file.protocol.hint')}</p>
        </div>
      `;
      return;
    }
    
    // 检查网络
    if (!isOnline()) {
      container.innerHTML = `
        <div class="market-error">
          <p>📡 ${t('error.network')}</p>
          <p class="error-hint">${t('market.error.network.hint')}</p>
        </div>
      `;
      return;
    }
    
    hasMore = result.hasMore;
    
    if (currentPage === 1) {
      scenesCache = result.scenes;
    } else {
      scenesCache.push(...result.scenes);
    }
    
    renderScenes();
    
  } catch (error) {
    logger.error('Load market scenes failed:', error);
    
    if (currentPage === 1) {
      container.innerHTML = `
        <div class="market-error">
          <p>${t('error.loading')}</p>
          <p class="error-hint">${error.message}</p>
        </div>
      `;
    }
  } finally {
    isLoading = false;
  }
}

// 渲染场景列表
function renderScenes() {
  const container = document.getElementById('market-list');
  if (!container) return;
  
  // 空状态
  if (scenesCache.length === 0) {
    container.innerHTML = '';
    const empty = createEmptyState({
      icon: currentTab === 'my' ? '📤' : '📭',
      title: currentTab === 'my' ? t('market.empty.my') : t('market.empty.all'),
      description: currentTab === 'my' 
        ? 'Share your custom scenes' 
        : 'Create scenes from the home page',
      action: currentTab === 'my' ? null : {
        text: 'Go Create',
        onClick: () => navigateTo('home')
      }
    });
    container.appendChild(empty);
    return;
  }
  
  // 渲染列表
  container.innerHTML = scenesCache.map(scene => createMarketCard(scene)).join('');
  
  // 绑定事件
  container.querySelectorAll('.market-card').forEach(card => {
    const id = card.dataset.id;
    
    // 查看详情
    card.querySelector('.card-content').addEventListener('click', () => viewSceneDetail(id));
    
    // 点赞
    const likeBtn = card.querySelector('.btn-like');
    if (likeBtn) {
      likeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleLike(id, likeBtn);
      });
    }
    
    // 使用
    const useBtn = card.querySelector('.btn-use');
    if (useBtn) {
      useBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        useScene(id);
      });
    }
    
    // 删除（我的分享）
    const deleteBtn = card.querySelector('.btn-delete');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteMyScene(id);
      });
    }
  });
}

// 创建市场卡片
function createMarketCard(scene) {
  const isMyTab = currentTab === 'my';
  const isLiked = scene.isLiked || false;
  
  return `
    <div class="market-card" data-id="${scene.id}">
      <div class="card-content">
        <div class="card-header">
          <div class="card-icon">${scene.icon || '📝'}</div>
          <div class="card-title">
            <h4>${escapeHtml(getSceneName(scene))}</h4>
            <span class="card-category">${escapeHtml(getCategoryName(scene.category))}</span>
          </div>
        </div>
        <p class="card-desc">${escapeHtml(getSceneDescription(scene))}</p>
        <div class="card-fields">
          ${(scene.fields || []).slice(0, 3).map((f) => {
            const fieldLabel = getFieldLabel(f, scene.id);
            return `<span class="field-tag">${escapeHtml(fieldLabel)}</span>`;
          }).join('')}
          ${(scene.fields || []).length > 3 ? `<span class="field-tag">+${scene.fields.length - 3}</span>` : ''}
        </div>
        <div class="card-stats">
          <span class="stat">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            ${scene.likes || 0}
          </span>
          <span class="stat">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            ${scene.usageCount || 0}
          </span>
        </div>
      </div>
      <div class="card-actions">
        ${!isMyTab ? `
          <button class="btn-icon btn-like ${isLiked ? 'active' : ''}" title="${isLiked ? t('history.unfavorite') : t('history.favorite')}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </button>
          <button class="btn btn-primary btn-sm btn-use">${t('market.use')}</button>
        ` : `
          <button class="btn-icon btn-delete" title="${t('common.delete')}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
            </svg>
          </button>
        `}
      </div>
    </div>
  `;
}

// 查看场景详情
function viewSceneDetail(id) {
  const scene = scenesCache.find(s => s.id === id);
  if (!scene) return;
  
  // 复制为可编辑场景
  state.currentScene = {
    ...scene,
    isFromMarket: true,
    originalId: id
  };
  state.formValues = {};
  
  navigateTo('scene-detail');
}

// 切换点赞
async function toggleLike(id, btn) {
  if (!UserService.isLoggedIn()) {
    showToast(t('auth.login.required'));
    return;
  }
  
  const scene = scenesCache.find(s => s.id === id);
  if (!scene) return;
  
  const isLiked = !scene.isLiked;
  
  btn.disabled = true;
  
  try {
    if (isLiked) {
      await MarketService.likeScene(id);
      scene.likes = (scene.likes || 0) + 1;
    } else {
      await MarketService.unlikeScene(id);
      scene.likes = Math.max(0, (scene.likes || 0) - 1);
    }
    
    scene.isLiked = isLiked;
    
    // 更新按钮状态
    btn.classList.toggle('active', isLiked);
    btn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    `;
    
    // 更新统计数字
    const statEl = btn.closest('.market-card').querySelector('.stat svg').parentNode;
    statEl.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
      ${scene.likes}
    `;
    
  } catch (error) {
    showToast(t('error.unknown'));
  } finally {
    btn.disabled = false;
  }
}

// 使用场景
async function useScene(id) {
  const loading = showLoading(t('loading'));
  
  try {
    const result = await MarketService.useScene(id);
    if (result.success) {
      showToast(t('market.added'));
    } else {
      showToast(translateApiError(result.error || '') || t('error.unknown'));
    }
  } catch (error) {
    showToast(t('error.unknown'));
  } finally {
    loading.close();
  }
}

// 删除我的场景
function deleteMyScene(id) {
  showConfirm({
    title: t('common.delete'),
    message: t('market.delete.confirm'),
    onConfirm: async () => {
      const loading = showLoading(t('loading'));
      
      try {
        const result = await MarketService.deleteMyScene(id);
        if (result.success) {
          // 从列表移除
          scenesCache = scenesCache.filter(s => s.id !== id);
          renderScenes();
          showToast(t('common.delete.success'));
        } else {
          showToast(translateApiError(result.error || '') || t('common.delete.failed'));
        }
      } catch (error) {
        showToast(t('common.delete.failed'));
      } finally {
        loading.close();
      }
    }
  });
}

// 分享当前场景
function shareCurrentScene() {
  if (!UserService.isLoggedIn()) {
    showToast(t('auth.login.required'));
    navigateTo('user');
    return;
  }
  
  if (!state.currentScene) {
    showToast(t('market.no.scene'));
    return;
  }
  
  showConfirm({
    title: t('market.share.scene'),
    message: t('market.share.confirm').replace('{name}', state.currentScene.name),
    onConfirm: async () => {
      const loading = showLoading(t('market.sharing'));
      
      try {
        const result = await MarketService.shareCurrentScene();
        if (result.success) {
          showToast(t('market.share.success'));
          // 切换到我的分享
          currentTab = 'my';
          currentPage = 1;
          scenesCache = [];
          initMarket();
        } else {
          showToast(translateApiError(result.error || '') || t('market.share.failed'));
        }
      } catch (error) {
        showToast(t('market.share.failed'));
      } finally {
        loading.close();
      }
    }
  });
}

// 滚动加载更多
function handleScroll(e) {
  const container = e.target;
  const scrollBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
  
  if (scrollBottom < 100 && !isLoading && hasMore) {
    currentPage++;
    loadScenes();
  }
}

// HTML转义
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
