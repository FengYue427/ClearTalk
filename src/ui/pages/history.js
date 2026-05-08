/**
 * 历史记录页
 */

import { state } from '../../core/state.js';
import { Storage } from '../../core/storage.js';
import { formatDate, escapeHtml, copyToClipboard, downloadFile, events } from '../../core/utils.js';
import { showToast, showConfirm, showActionSheet, createEmptyState } from '../components/index.js';
import { navigateTo } from './router.js';
import { t } from '../../core/i18n.js';
import { BUILTIN_SCENES } from '../../scenes/index.js';

// 语言变化取消订阅函数
let historyLanguageUnsubscribe = null;

// 当前过滤状态
let filterFavoriteOnly = false;
let currentHistory = [];

// 初始化历史记录页
export function initHistory() {
  const page = document.getElementById('page-history');
  if (!page) return;

  // 如果已有语言监听，先取消
  if (historyLanguageUnsubscribe) {
    historyLanguageUnsubscribe();
    historyLanguageUnsubscribe = null;
  }

  // 清空重建
  page.innerHTML = '';

  // 渲染头部
  renderHeader(page);

  // 渲染过滤器
  renderFilter(page);

  // 渲染列表容器（支持下拉刷新）
  const listContainer = document.createElement('div');
  listContainer.id = 'history-list';
  listContainer.className = 'history-list pull-refresh-container';
  page.appendChild(listContainer);

  // 添加下拉刷新指示器
  const pullIndicator = document.createElement('div');
  pullIndicator.className = 'pull-refresh-indicator';
  pullIndicator.innerHTML = `
    <div class="pull-spinner">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
      </svg>
    </div>
    <span class="pull-text">${t('common.pull_to_refresh')}</span>
  `;
  page.insertBefore(pullIndicator, listContainer);

  // 绑定下拉刷新事件
  bindPullToRefresh(listContainer, pullIndicator);

  // 渲染历史列表
  renderHistoryList();

  // 监听语言变化
  historyLanguageUnsubscribe = () => {
    events.off('language:changed', handleHistoryLanguageChange);
  };
  events.on('language:changed', handleHistoryLanguageChange);

  // 页面销毁时取消订阅
  page._unsubscribe = () => {
    if (historyLanguageUnsubscribe) {
      historyLanguageUnsubscribe();
      historyLanguageUnsubscribe = null;
    }
  };
}

// 语言变化处理函数
function handleHistoryLanguageChange() {
  const page = document.getElementById('page-history');
  if (page && page.classList.contains('active')) {
    initHistory();
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
    <h2>${t('nav.history')}</h2>
    <div class="header-actions">
      <button class="btn-icon" id="btn-export" title="${t('user.export.data')}">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
        </svg>
      </button>
    </div>
  `;
  
  header.querySelector('#btn-back').addEventListener('click', () => navigateTo('home'));
  header.querySelector('#btn-export').addEventListener('click', exportHistory);
  
  container.appendChild(header);
}

// 渲染过滤器
function renderFilter(container) {
  const filter = document.createElement('div');
  filter.className = 'history-filter';
  filter.innerHTML = `
    <button class="filter-btn ${filterFavoriteOnly ? 'active' : ''}" id="btn-filter-fav">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="${filterFavoriteOnly ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
      ${t('history.favorites.only')}
    </button>
    <span class="history-count" id="history-count"></span>
  `;
  
  filter.querySelector('#btn-filter-fav').addEventListener('click', () => {
    filterFavoriteOnly = !filterFavoriteOnly;
    filter.querySelector('#btn-filter-fav').classList.toggle('active', filterFavoriteOnly);
    renderHistoryList();
  });
  
  container.appendChild(filter);
}

// 渲染历史列表
export function renderHistoryList() {
  const container = document.getElementById('history-list');
  if (!container) return;
  
  // 获取历史记录
  let history = Storage.getHistory();
  currentHistory = history;
  
  // 应用收藏过滤
  if (filterFavoriteOnly) {
    history = history.filter(h => h.isFavorite);
  }
  
  // 更新计数
  const countEl = document.getElementById('history-count');
  if (countEl) {
    countEl.textContent = `${t('history.count', { count: history.length })}`;
  }
  
  // 空状态
  if (history.length === 0) {
    container.innerHTML = '';
    const empty = createEmptyState({
      icon: '📭',
      title: filterFavoriteOnly ? t('history.no.favorites') : t('history.empty'),
      description: filterFavoriteOnly ? 'Click heart icon to favorite' : 'Generated text will be saved here',
      action: filterFavoriteOnly ? null : {
        text: 'Go Generate',
        onClick: () => navigateTo('home')
      }
    });
    container.appendChild(empty);
    return;
  }
  
  // 渲染列表
  container.innerHTML = history.map(item => createHistoryItem(item)).join('');
  
  // 绑定事件
  container.querySelectorAll('.history-item').forEach(el => {
    const id = el.dataset.id;
    
    // 查看详情
    el.querySelector('.history-content').addEventListener('click', () => viewHistoryItem(id));
    
    // 收藏
    el.querySelector('.btn-favorite').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFavorite(id);
    });
    
    // 更多操作
    el.querySelector('.btn-more').addEventListener('click', (e) => {
      e.stopPropagation();
      showItemActions(id, el);
    });
  });
}

// 创建历史记录项HTML
function createHistoryItem(item) {
  const text = escapeHtml(item.text || '').substring(0, 100);
  const date = formatDate(item.createdAt);
  const sceneName = escapeHtml(getSceneName(item.sceneId, item.sceneName));
  const toneLabel = getToneLabel(item.tone);
  
  return `
    <div class="history-item ${item.isFavorite ? 'favorite' : ''}" data-id="${item.id}">
      <div class="history-content">
        <div class="history-header">
          <span class="history-scene">${sceneName}</span>
          ${toneLabel ? `<span class="history-tone">${toneLabel}</span>` : ''}
          <span class="history-date">${date}</span>
        </div>
        <div class="history-text">${text}${item.text.length > 100 ? '...' : ''}</div>
      </div>
      <div class="history-actions">
        <button class="btn-icon btn-favorite ${item.isFavorite ? 'active' : ''}" title="${item.isFavorite ? t('history.unfavorite') : t('history.favorite')}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="${item.isFavorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        </button>
        <button class="btn-icon btn-more" title="${t('common.more')}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="5" r="1"/>
            <circle cx="12" cy="12" r="1"/>
            <circle cx="12" cy="19" r="1"/>
          </svg>
        </button>
      </div>
    </div>
  `;
}

// 获取场景名称（支持翻译）
function getSceneName(sceneId, fallbackName) {
  const scene = BUILTIN_SCENES.find(s => s.id === sceneId);
  return scene?.translationKey ? t(scene.translationKey) : (fallbackName || 'Unknown');
}

// 获取语气标签
function getToneLabel(tone) {
  const labels = {
    soft: t('scene.tone.soft'),
    neutral: t('scene.tone.neutral'),
    firm: t('scene.tone.firm')
  };
  return labels[tone] || '';
}

// 查看历史记录详情
function viewHistoryItem(id) {
  const item = currentHistory.find(h => h.id === id);
  if (!item) return;
  
  // 恢复到生成状态
  const scene = BUILTIN_SCENES.find(s => s.id === item.sceneId);
  state.currentScene = scene || {
    id: item.sceneId,
    name: item.sceneName,
    icon: item.sceneIcon
  };
  state.formValues = item.formValues || {};
  state.generatedText = item.text;
  
  navigateTo('scene-detail');
}

// 切换收藏
function toggleFavorite(id) {
  const item = currentHistory.find(h => h.id === id);
  if (!item) return;
  
  const newFavorite = !item.isFavorite;
  Storage.updateHistoryItem(id, { isFavorite: newFavorite });
  
  // 刷新该项UI
  const el = document.querySelector(`.history-item[data-id="${id}"]`);
  if (el) {
    el.classList.toggle('favorite', newFavorite);
    const btn = el.querySelector('.btn-favorite');
    btn.classList.toggle('active', newFavorite);
    btn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="${newFavorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    `;
  }
  
  showToast(newFavorite ? t('history.favorite') : t('history.unfavorite'));
}

// 显示项操作菜单
function showItemActions(id, element) {
  const item = currentHistory.find(h => h.id === id);
  if (!item) return;
  
  showActionSheet({
    title: t('common.actions'),
    actions: [
      { label: t('dialogue.copy'), value: 'copy' },
      { label: t('dialogue.title'), value: 'dialogue' },
      { label: t('common.delete'), value: 'delete', danger: true }
    ],
    onSelect: (value) => {
      switch (value) {
        case 'copy':
          copyHistoryItem(id);
          break;
        case 'dialogue':
          startDialogueFromHistory(id);
          break;
        case 'delete':
          deleteHistoryItem(id);
          break;
      }
    }
  });
}

// 复制历史项
async function copyHistoryItem(id) {
  const item = currentHistory.find(h => h.id === id);
  if (!item) return;
  
  const success = await copyToClipboard(item.text);
  showToast(success ? t('dialogue.copied') : t('dialogue.copy.failed'));
}

// 从历史开始对话
function startDialogueFromHistory(id) {
  const item = currentHistory.find(h => h.id === id);
  if (!item) return;
  
  state.dialogue.seed = item.text;
  state.dialogue.messages = [];
  state.dialogue.isActive = false;
  
  navigateTo('dialogue');
}

// 删除历史项
function deleteHistoryItem(id) {
  showConfirm({
    title: t('common.delete'),
    message: t('history.delete.confirm'),
    onConfirm: () => {
      Storage.deleteHistoryItem(id);
      renderHistoryList();
      showToast(t('common.delete.success'));
    }
  });
}

// 导出历史
function exportHistory() {
  const history = Storage.getHistory();
  if (history.length === 0) {
    showToast(t('history.no.export'));
    return;
  }
  
  const data = {
    history,
    exportedAt: new Date().toISOString(),
    version: '1.0'
  };
  
  const json = JSON.stringify(data, null, 2);
  const filename = `cleartalk_history_${new Date().toISOString().split('T')[0]}.json`;

  downloadFile(json, filename, 'application/json');
  showToast(t('user.export.data'));
}

// 下拉刷新绑定
function bindPullToRefresh(container, indicator) {
  let startY = 0;
  let isPulling = false;
  const threshold = 80; // 触发阈值

  container.addEventListener('touchstart', (e) => {
    if (container.scrollTop === 0) {
      startY = e.touches[0].clientY;
      isPulling = true;
    }
  }, { passive: true });

  container.addEventListener('touchmove', (e) => {
    if (!isPulling) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - startY;

    if (diff > 0 && container.scrollTop === 0) {
      e.preventDefault();
      const pullDistance = Math.min(diff * 0.5, threshold + 20);
      indicator.style.transform = `translateY(${pullDistance}px)`;
      indicator.style.opacity = Math.min(pullDistance / threshold, 1);

      if (pullDistance >= threshold) {
        indicator.classList.add('ready');
      } else {
        indicator.classList.remove('ready');
      }
    }
  }, { passive: false });

  container.addEventListener('touchend', async () => {
    if (!isPulling) return;
    isPulling = false;

    const isReady = indicator.classList.contains('ready');

    if (isReady) {
      indicator.classList.add('refreshing');
      indicator.style.transform = `translateY(${threshold}px)`;

      // 刷新历史记录
      await refreshHistory();

      indicator.classList.remove('refreshing', 'ready');
    }

    indicator.style.transform = 'translateY(0)';
    indicator.style.opacity = '0';
  });
}

// 刷新历史记录
async function refreshHistory() {
  // 重新渲染历史列表
  renderHistoryList();
  showToast(t('common.refreshed'));
}
