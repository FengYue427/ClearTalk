/**
 * 轻量埋点：上报到后端 /api/events，失败时静默忽略
 */
import { api } from './api-client.js';
import { logger } from '../core/logger.js';

const ALLOWED = new Set([
  'page_view',
  'scene_open',
  'generate_start',
  'generate_ok',
  'generate_fail',
  'share_card',
  'feedback_submit',
  'market_use',
  'paste_analyze'
]);

let enabled = true;

export const Analytics = {
  setEnabled(value) {
    enabled = !!value;
  },

  track(name, payload = {}) {
    if (!enabled || !ALLOWED.has(name)) return;

    const body = {
      name,
      sceneId: payload.sceneId || null,
      meta: {
        ...(payload.meta || {}),
        path: typeof window !== 'undefined' ? window.location?.hash || '' : ''
      }
    };

    api.post('/api/events', body).catch((err) => {
      logger.debug?.('Analytics skip:', err.message);
    });
  }
};

export default Analytics;
