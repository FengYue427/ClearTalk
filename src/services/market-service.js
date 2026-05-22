/**
 * 场景市场服务 - 发现、分享、使用社区场景
 */

import { api } from './api-client.js';
import { Storage } from '../core/storage.js';
import { UserService } from './user-service.js';
import { logger } from '../core/logger.js';
import { events } from '../core/utils.js';

// 缓存
let marketCache = {
  hot: null,
  latest: null,
  my: null,
  lastUpdate: {
    hot: 0,
    latest: 0,
    my: 0
  }
};

const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

export const MarketService = {
  // 获取热门场景
  async getHotScenes(options = {}) {
    const { forceRefresh = false, page = 1, limit = 20 } = options;
    
    // 检查缓存
    if (!forceRefresh && marketCache.hot && 
        (Date.now() - marketCache.lastUpdate.hot) < CACHE_DURATION) {
      return this._paginate(marketCache.hot, page, limit);
    }
    
    try {
      const result = await api.get('/api/market/scenes', {
        sort: 'hot',
        page,
        limit
      });
      
      marketCache.hot = result.scenes || [];
      marketCache.lastUpdate.hot = Date.now();
      
      return {
        scenes: result.scenes || [],
        total: result.total || 0,
        page,
        hasMore: result.hasMore || false
      };
    } catch (error) {
      // 静默处理后端不可用的情况（开发环境预期行为）
      if (error.message?.includes('Unexpected token') || error.message?.includes('is not valid JSON')) {
        // 后端返回HTML 404页面，属于预期行为，不报错
      } else {
        logger.error('Get hot scenes failed:', error);
      }
      return { scenes: [], total: 0, page, hasMore: false };
    }
  },
  
  // 获取最新场景
  async getLatestScenes(options = {}) {
    const { forceRefresh = false, page = 1, limit = 20 } = options;
    
    if (!forceRefresh && marketCache.latest && 
        (Date.now() - marketCache.lastUpdate.latest) < CACHE_DURATION) {
      return this._paginate(marketCache.latest, page, limit);
    }
    
    try {
      const result = await api.get('/api/market/scenes', {
        sort: 'latest',
        page,
        limit
      });
      
      marketCache.latest = result.scenes || [];
      marketCache.lastUpdate.latest = Date.now();
      
      return {
        scenes: result.scenes || [],
        total: result.total || 0,
        page,
        hasMore: result.hasMore || false
      };
    } catch (error) {
      // 静默处理后端不可用的情况（开发环境预期行为）
      if (error.message?.includes('Unexpected token') || error.message?.includes('is not valid JSON')) {
        // 后端返回HTML 404页面，属于预期行为，不报错
      } else {
        logger.error('Get latest scenes failed:', error);
      }
      return { scenes: [], total: 0, page, hasMore: false };
    }
  },
  
  // 获取我的分享
  async getMyScenes(options = {}) {
    const { forceRefresh = false, page = 1, limit = 20 } = options;
    
    if (!UserService.isLoggedIn()) {
      return { scenes: [], total: 0, page, hasMore: false };
    }
    
    if (!forceRefresh && marketCache.my && 
        (Date.now() - marketCache.lastUpdate.my) < CACHE_DURATION) {
      return this._paginate(marketCache.my, page, limit);
    }
    
    try {
      const result = await api.get('/api/market/my-scenes', {
        page,
        limit
      });
      
      marketCache.my = result.scenes || [];
      marketCache.lastUpdate.my = Date.now();
      
      return {
        scenes: result.scenes || [],
        total: result.total || 0,
        page,
        hasMore: result.hasMore || false
      };
    } catch (error) {
      // 静默处理后端不可用的情况（开发环境预期行为）
      if (error.message?.includes('Unexpected token') || error.message?.includes('is not valid JSON')) {
        // 后端返回HTML 404页面，属于预期行为，不报错
      } else {
        logger.error('Get my scenes failed:', error);
      }
      return { scenes: [], total: 0, page, hasMore: false };
    }
  },
  
  // 分享场景到市场
  async shareScene(scene) {
    if (!UserService.isLoggedIn()) {
      return { success: false, error: 'Please login first' };
    }
    
    // 验证场景
    if (!scene.name || !scene.description || !scene.fields || scene.fields.length === 0) {
      return { success: false, error: 'Scene information incomplete' };
    }
    
    try {
      const result = await api.post('/api/market/share', {
        scene: {
          name: scene.name,
          description: scene.description,
          category: scene.category || '日常生活',
          icon: scene.icon || '📝',
          fields: scene.fields,
          tags: scene.tags || []
        }
      });
      
      // 清除缓存
      this.clearCache(['hot', 'latest', 'my']);
      
      events.emit('market:share', result.scene);
      
      return { success: true, scene: result.scene };
    } catch (error) {
      logger.error('Share scene failed:', error);
      return { success: false, error: error.message };
    }
  },
  
  // 从当前场景分享到市场
  async shareCurrentScene() {
    const { state } = await import('../core/state.js');
    const scene = state.currentScene;
    
    if (!scene) {
      return { success: false, error: 'No current scene' };
    }
    
    return this.shareScene(scene);
  },
  
  // 点赞场景
  async likeScene(sceneId) {
    if (!UserService.isLoggedIn()) {
      return { success: false, error: 'Please login first' };
    }
    
    try {
      await api.post(`/api/market/scenes/${sceneId}/like`);
      
      // 更新缓存中的点赞数
      ['hot', 'latest'].forEach(key => {
        if (marketCache[key]) {
          const scene = marketCache[key].find(s => s.id === sceneId);
          if (scene) {
            scene.likes = (scene.likes || 0) + 1;
            scene.isLiked = true;
          }
        }
      });
      
      return { success: true };
    } catch (error) {
      logger.error('Like scene failed:', error);
      return { success: false, error: error.message };
    }
  },
  
  // 取消点赞
  async unlikeScene(sceneId) {
    if (!UserService.isLoggedIn()) {
      return { success: false, error: 'Please login first' };
    }
    
    try {
      await api.delete(`/api/market/scenes/${sceneId}/like`);
      
      // 更新缓存
      ['hot', 'latest'].forEach(key => {
        if (marketCache[key]) {
          const scene = marketCache[key].find(s => s.id === sceneId);
          if (scene) {
            scene.likes = Math.max(0, (scene.likes || 0) - 1);
            scene.isLiked = false;
          }
        }
      });
      
      return { success: true };
    } catch (error) {
      logger.error('Unlike scene failed:', error);
      return { success: false, error: error.message };
    }
  },
  
  // 使用场景（复制到我的场景）
  async useScene(sceneId) {
    try {
      // 获取场景详情
      const scene = await this.getSceneDetail(sceneId);
      
      if (!scene) {
        return { success: false, error: '场景不存在' };
      }
      
      // 添加到本地自定义场景
      const customScene = {
        ...scene,
        id: `custom_${Date.now()}`,
        isCustom: true,
        fromMarket: true,
        originalId: sceneId,
        usedAt: new Date().toISOString()
      };
      
      Storage.addCustomScene(customScene);
      
      // 增加使用计数
      await api.post(`/api/market/scenes/${sceneId}/use`).catch(() => {});
      
      events.emit('market:use', customScene);
      
      return { success: true, scene: customScene };
    } catch (error) {
      logger.error('Use scene failed:', error);
      return { success: false, error: error.message };
    }
  },
  
  // 获取场景详情
  async getSceneDetail(sceneId) {
    // 先从缓存查找
    const fromCache = ['hot', 'latest', 'my'].reduce((found, key) => {
      if (found) return found;
      return marketCache[key]?.find(s => s.id === sceneId);
    }, null);
    
    if (fromCache) return fromCache;
    
    try {
      const result = await api.get(`/api/market/scenes/${sceneId}`);
      return result.scene;
    } catch (error) {
      logger.error('Get scene detail failed:', error);
      return null;
    }
  },
  
  // 搜索场景
  async searchScenes(query, options = {}) {
    const { page = 1, limit = 20 } = options;
    
    try {
      const result = await api.get('/api/market/search', {
        q: query,
        page,
        limit
      });
      
      return {
        scenes: result.scenes || [],
        total: result.total || 0,
        page,
        hasMore: result.hasMore || false
      };
    } catch (error) {
      logger.error('Search scenes failed:', error);
      return { scenes: [], total: 0, page, hasMore: false };
    }
  },
  
  // 删除我的分享
  async deleteMyScene(sceneId) {
    if (!UserService.isLoggedIn()) {
      return { success: false, error: 'Please login first' };
    }
    
    try {
      await api.delete(`/api/market/my-scenes/${sceneId}`);
      
      // 清除缓存
      this.clearCache(['my', 'hot', 'latest']);
      
      return { success: true };
    } catch (error) {
      logger.error('Delete my scene failed:', error);
      return { success: false, error: error.message };
    }
  },
  
  // 清除缓存
  clearCache(types = ['hot', 'latest', 'my']) {
    types.forEach(type => {
      marketCache[type] = null;
      marketCache.lastUpdate[type] = 0;
    });
  },
  
  // 内部分页
  _paginate(items, page, limit) {
    const start = (page - 1) * limit;
    const end = start + limit;
    return {
      scenes: items.slice(start, end),
      total: items.length,
      page,
      hasMore: end < items.length
    };
  }
};

export default MarketService;
