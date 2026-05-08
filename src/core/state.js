/**
 * 全局状态管理 - 基于 Proxy 的响应式状态
 */

import { STORAGE_KEYS, DEFAULT_SETTINGS } from './config.js';
import { logger } from './logger.js';
import { Storage } from './storage.js';

// 创建响应式状态
function createReactiveState(initialState, listeners = new Map()) {
  return new Proxy(initialState, {
    set(target, prop, value) {
      const oldValue = target[prop];
      target[prop] = value;
      
      // 通知监听器
      const keyListeners = listeners.get(prop);
      if (keyListeners) {
        keyListeners.forEach(cb => cb(value, oldValue));
      }
      
      return true;
    }
  });
}

// 全局状态定义
const initialState = {
  // 用户设置
  language: Storage.getSetting('language', DEFAULT_SETTINGS.language),
  theme: Storage.getSetting('theme', DEFAULT_SETTINGS.theme),
  haptic: Storage.getSetting('haptic', DEFAULT_SETTINGS.haptic),
  
  // 当前操作状态
  currentScene: null,
  formValues: {},
  generatedText: '',
  isGenerating: false,
  isSyncing: false,
  
  // 应用状态
  filterFavoriteOnly: false,
  batchMode: false,
  
  // 对话状态
  dialogue: {
    isActive: false,
    seed: '',
    messages: [],
    maxTurns: 12,
    context: {},
    personality: 'neutral',
    topic: '',
    savedContextId: null
  },
  
  // 离线模式状态
  offlineMode: localStorage.getItem(STORAGE_KEYS.SETTINGS) ? 
    JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS)).offlineMode === true : 
    false,
  offlineUser: null
};

// 监听器存储
const listeners = new Map();

// 导出全局状态
export const state = createReactiveState(initialState, listeners);

// 订阅状态变化
export function subscribe(key, callback) {
  if (!listeners.has(key)) {
    listeners.set(key, new Set());
  }
  listeners.get(key).add(callback);
  
  // 返回取消订阅函数
  return () => {
    listeners.get(key).delete(callback);
  };
}

// 批量更新状态
export function batchUpdate(updates) {
  Object.entries(updates).forEach(([key, value]) => {
    state[key] = value;
  });
}

// 重置特定状态
export function resetState(keys) {
  keys.forEach(key => {
    if (key in initialState) {
      state[key] = JSON.parse(JSON.stringify(initialState[key]));
    }
  });
}

// 持久化设置
export function persistSettings() {
  Storage.set('cleartalk_settings', {
    language: state.language,
    theme: state.theme,
    haptic: state.haptic,
    batchMode: state.batchMode
  });
  logger.info('Settings persisted');
}

// 订阅持久化
subscribe('language', () => {
  Storage.setSetting('language', state.language);
});

subscribe('theme', () => {
  Storage.setSetting('theme', state.theme);
  // Apply theme to HTML element for CSS variable switching
  if (state.theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else if (state.theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    // Auto - follow system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  }
});

subscribe('haptic', () => {
  Storage.setSetting('haptic', state.haptic);
});
