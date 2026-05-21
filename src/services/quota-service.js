/**
 * 生成配额：代理模式走服务端，本地模式走 localStorage
 */
import { api } from './api-client.js';
import { Storage } from '../core/storage.js';
import { DEFAULT_SETTINGS } from '../core/config.js';
import { logger } from '../core/logger.js';

const LOCAL_KEY = 'cleartalk_daily_generations';

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function defaultLocalQuota() {
  const free = 50;
  const raw = Storage.getSetting('localDailyLimit', free);
  const limit = parseInt(raw, 10) || free;
  const data = JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}');
  const used = data[todayKey()] || 0;
  return {
    tier: 'free',
    limit,
    used,
    remaining: Math.max(0, limit - used),
    resetsAt: new Date(new Date().setHours(23, 59, 59, 999)).toISOString(),
    source: 'local'
  };
}

function consumeLocal() {
  const data = JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}');
  const key = todayKey();
  data[key] = (data[key] || 0) + 1;
  localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
}

export const QuotaService = {
  async getStatus() {
    const provider = Storage.getSetting('aiProvider', DEFAULT_SETTINGS.aiProvider);
    if (provider !== 'proxy') {
      return defaultLocalQuota();
    }
    try {
      const status = await api.get('/api/quota');
      return { ...status, source: 'remote' };
    } catch (err) {
      logger.warn('Quota fetch failed:', err.message);
      return defaultLocalQuota();
    }
  },

  async checkBeforeGenerate() {
    const status = await this.getStatus();
    if (status.remaining <= 0) {
      const err = new Error('QUOTA_EXCEEDED');
      err.quota = status;
      throw err;
    }
    return status;
  },

  async recordGenerate() {
    const provider = Storage.getSetting('aiProvider', DEFAULT_SETTINGS.aiProvider);
    if (provider !== 'proxy') {
      consumeLocal();
      return;
    }
    // 服务端在 generate 成功时已扣减；此处仅刷新缓存
  }
};

export default QuotaService;
