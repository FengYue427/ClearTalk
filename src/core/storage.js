/**
 * 存储服务 - 封装 localStorage 操作
 */

import { STORAGE_KEYS } from './config.js';
import { logger } from './logger.js';

// 安全的 JSON 解析
function safeParse(json, defaultValue = null) {
  try {
    return JSON.parse(json);
  } catch {
    return defaultValue;
  }
}

// 基础存储操作
export const Storage = {
  // 获取
  get(key, defaultValue = null) {
    const value = localStorage.getItem(key);
    return value ? safeParse(value, defaultValue) : defaultValue;
  },
  
  // 设置
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      logger.error('Storage set error:', e);
      return false;
    }
  },
  
  // 删除
  remove(key) {
    localStorage.removeItem(key);
  },
  
  // 清空
  clear() {
    localStorage.clear();
  },
  
  // 获取设置
  getSetting(key, defaultValue = null) {
    const settings = this.get(STORAGE_KEYS.SETTINGS, {});
    return settings[key] !== undefined ? settings[key] : defaultValue;
  },
  
  // 设置设置
  setSetting(key, value) {
    const settings = this.get(STORAGE_KEYS.SETTINGS, {});
    settings[key] = value;
    return this.set(STORAGE_KEYS.SETTINGS, settings);
  },
  
  // 获取历史记录
  getHistory() {
    return this.get(STORAGE_KEYS.HISTORY, []);
  },
  
  // 添加历史记录
  addHistory(item) {
    const history = this.getHistory();
    history.unshift({
      ...item,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    });
    // 限制数量
    const maxItems = 100;
    if (history.length > maxItems) {
      history.splice(maxItems);
    }
    return this.set(STORAGE_KEYS.HISTORY, history);
  },
  
  // 删除历史记录
  deleteHistoryItem(id) {
    const history = this.getHistory().filter(h => h.id !== id);
    return this.set(STORAGE_KEYS.HISTORY, history);
  },
  
  // 更新历史记录
  updateHistoryItem(id, updates) {
    const history = this.getHistory();
    const index = history.findIndex(h => h.id === id);
    if (index >= 0) {
      history[index] = { ...history[index], ...updates };
      return this.set(STORAGE_KEYS.HISTORY, history);
    }
    return false;
  },
  
  // 获取自定义场景
  getCustomScenes() {
    return this.get(STORAGE_KEYS.CUSTOM_SCENES, []);
  },
  
  // 添加自定义场景
  addCustomScene(scene) {
    const scenes = this.getCustomScenes();
    scenes.push({
      ...scene,
      id: 'custom_' + Date.now(),
      isCustom: true,
      createdAt: new Date().toISOString()
    });
    return this.set(STORAGE_KEYS.CUSTOM_SCENES, scenes);
  },
  
  // 删除自定义场景
  deleteCustomScene(id) {
    const scenes = this.getCustomScenes().filter(s => s.id !== id);
    return this.set(STORAGE_KEYS.CUSTOM_SCENES, scenes);
  },
  
  // 导出所有数据
  exportAll() {
    return {
      history: this.getHistory(),
      customScenes: this.getCustomScenes(),
      settings: this.get(STORAGE_KEYS.SETTINGS, {}),
      dialogueContexts: this.get(STORAGE_KEYS.DIALOGUE_CONTEXTS, {}),
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
  },
  
  // 导入数据
  importAll(data) {
    if (data.history) this.set(STORAGE_KEYS.HISTORY, data.history);
    if (data.customScenes) this.set(STORAGE_KEYS.CUSTOM_SCENES, data.customScenes);
    if (data.settings) this.set(STORAGE_KEYS.SETTINGS, data.settings);
    if (data.dialogueContexts) this.set(STORAGE_KEYS.DIALOGUE_CONTEXTS, data.dialogueContexts);
    return true;
  },
  
  // 获取存储大小
  getSize() {
    let size = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        size += localStorage[key].length * 2; // UTF-16
      }
    }
    return {
      bytes: size,
      kb: (size / 1024).toFixed(2),
      mb: (size / 1024 / 1024).toFixed(2)
    };
  }
};
