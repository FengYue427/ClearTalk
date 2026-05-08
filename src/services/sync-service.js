/**
 * 同步服务 - 云同步、多设备数据互通
 */

import { api } from './api-client.js';
import { Storage } from '../core/storage.js';
import { state } from '../core/state.js';
import { logger } from '../core/logger.js';
import { UserService } from './user-service.js';
import { events, deepMerge } from '../core/utils.js';
import { t } from '../core/i18n.js';

export const SyncService = {
  // 上传到云端
  async upload() {
    if (!UserService.isLoggedIn()) {
      throw new Error(t('auth.error.login.required'));
    }
    
    const data = {
      history: Storage.getHistory(),
      customScenes: Storage.getCustomScenes(),
      settings: Storage.get('cleartalk_settings', {}),
      phrases: Storage.get('cleartalk_phrases', []),
      dialogueContexts: Storage.get('cleartalk_dialogue_contexts', {})
    };
    
    const result = await api.post('/api/sync/upload', { data });
    
    // 保存同步时间
    Storage.setSetting('lastSyncTime', Date.now());
    events.emit('sync:upload', result);
    
    return result;
  },
  
  // 从云端下载
  async download() {
    if (!UserService.isLoggedIn()) {
      throw new Error(t('auth.error.login.required'));
    }
    
    const result = await api.get('/api/sync/download');
    
    return {
      history: result.data?.history || [],
      customScenes: result.data?.customScenes || [],
      settings: result.data?.settings || {},
      phrases: result.data?.phrases || [],
      dialogueContexts: result.data?.dialogueContexts || {},
      lastModified: result.lastModified
    };
  },
  
  // 同步到云端（立即上传）
  async syncToCloud() {
    try {
      const result = await this.upload();
      return { success: true, timestamp: result.timestamp };
    } catch (error) {
      logger.error('Sync to cloud failed:', error);
      return { success: false, error: error.message };
    }
  },
  
  // 合并云端和本地数据
  async mergeFromCloud() {
    if (!UserService.isLoggedIn()) {
      throw new Error(t('auth.error.login.required'));
    }
    
    state.isSyncing = true;
    
    try {
      const cloud = await this.download();
      const local = {
        history: Storage.getHistory(),
        customScenes: Storage.getCustomScenes()
      };
      
      // 合并历史记录（去重）
      const mergedHistory = this._mergeHistory(local.history, cloud.history);
      
      // 合并自定义场景（云端优先）
      const mergedScenes = this._mergeScenes(local.customScenes, cloud.customScenes);
      
      // 保存到本地
      Storage.set('cleartalk_history', mergedHistory);
      Storage.set('cleartalk_custom_scenes', mergedScenes);
      
      // 合并设置
      if (Object.keys(cloud.settings).length > 0) {
        const mergedSettings = deepMerge(
          Storage.get('cleartalk_settings', {}),
          cloud.settings
        );
        Storage.set('cleartalk_settings', mergedSettings);
      }
      
      // 保存同步时间
      Storage.setSetting('lastSyncTime', Date.now());
      
      events.emit('sync:merge', {
        historyCount: mergedHistory.length,
        scenesCount: mergedScenes.length
      });
      
      return {
        historyCount: mergedHistory.length,
        scenesCount: mergedScenes.length,
        addedHistory: mergedHistory.length - local.history.length,
        addedScenes: mergedScenes.length - local.customScenes.length
      };
    } finally {
      state.isSyncing = false;
    }
  },
  
  // 下载并覆盖本地
  async downloadAndReplace() {
    if (!UserService.isLoggedIn()) {
      throw new Error(t('auth.error.login.required'));
    }
    
    state.isSyncing = true;
    
    try {
      const cloud = await this.download();
      
      // 直接覆盖
      if (cloud.history.length > 0) {
        Storage.set('cleartalk_history', cloud.history);
      }
      if (cloud.customScenes.length > 0) {
        Storage.set('cleartalk_custom_scenes', cloud.customScenes);
      }
      if (Object.keys(cloud.settings).length > 0) {
        Storage.set('cleartalk_settings', cloud.settings);
      }
      if (cloud.phrases.length > 0) {
        Storage.set('cleartalk_phrases', cloud.phrases);
      }
      
      Storage.setSetting('lastSyncTime', Date.now());
      
      events.emit('sync:replace', cloud);
      
      return {
        historyCount: cloud.history.length,
        scenesCount: cloud.customScenes.length
      };
    } finally {
      state.isSyncing = false;
    }
  },
  
  // 清除云端数据
  async clearCloud() {
    if (!UserService.isLoggedIn()) {
      throw new Error(t('auth.error.login.required'));
    }
    
    await api.delete('/api/sync/clear');
    events.emit('sync:clear');
    return { success: true };
  },
  
  // 获取同步状态
  getStatus() {
    const lastSync = Storage.getSetting('lastSyncTime', 0);
    const autoSync = Storage.getSetting('autoSync', false);
    const direction = Storage.getSetting('syncDirection', 'merge');
    
    return {
      lastSync,
      lastSyncFormatted: lastSync ? new Date(lastSync).toLocaleString('zh-CN') : '从未',
      autoSync,
      direction,
      isSyncing: state.isSyncing,
      canSync: UserService.isLoggedIn()
    };
  },
  
  // 配置自动同步
  setAutoSync(enabled) {
    Storage.setSetting('autoSync', enabled);
    return { success: true };
  },
  
  // 配置同步方向
  setDirection(direction) {
    const validDirections = ['merge', 'upload', 'download'];
    if (!validDirections.includes(direction)) {
      throw new Error(t('settings.sync.invalid.direction'));
    }
    Storage.setSetting('syncDirection', direction);
    return { success: true };
  },
  
  // 执行配置的同步
  async syncWithDirection() {
    const direction = this.getStatus().direction;
    
    switch (direction) {
      case 'merge':
        return await this.mergeFromCloud();
      case 'upload':
        await this.upload();
        return { uploaded: true };
      case 'download':
        return await this.downloadAndReplace();
      default:
        return await this.mergeFromCloud();
    }
  },
  
  // 内部：合并历史记录
  _mergeHistory(local, cloud) {
    const map = new Map();
    
    // 先添加本地
    local.forEach(item => {
      map.set(item.id, item);
    });
    
    // 合并云端（以时间较新的为准）
    cloud.forEach(item => {
      const existing = map.get(item.id);
      if (!existing) {
        map.set(item.id, item);
      } else {
        const localTime = new Date(existing.createdAt || 0).getTime();
        const cloudTime = new Date(item.createdAt || 0).getTime();
        if (cloudTime > localTime) {
          map.set(item.id, item);
        }
      }
    });
    
    // 转回数组，按时间倒序
    return Array.from(map.values()).sort((a, b) => {
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
  },
  
  // 内部：合并场景
  _mergeScenes(local, cloud) {
    const map = new Map();
    
    // 先添加云端
    cloud.forEach(scene => {
      map.set(scene.id, scene);
    });
    
    // 合并本地（本地新增的场景保留）
    local.forEach(scene => {
      if (!map.has(scene.id)) {
        map.set(scene.id, scene);
      }
    });
    
    return Array.from(map.values());
  }
};

export default SyncService;
