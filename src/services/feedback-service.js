/**
 * 用户反馈服务 — 本地缓存 + 后端同步
 */

import { api } from './api-client.js';
import { Storage } from '../core/storage.js';
import { logger } from '../core/logger.js';

export const FeedbackService = {
  /**
   * 提交反馈（优先后端，失败则仅本地）
   */
  async submit(payload) {
    const record = {
      ...payload,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };

    Storage.saveFeedback(record);

    try {
      const result = await api.post('/api/feedback', {
        type: payload.type,
        sceneId: payload.sceneId,
        sceneName: payload.sceneName,
        tone: payload.tone,
        reasons: payload.reasons,
        comment: payload.comment,
        textPreview: payload.textPreview,
        meta: {
          source: 'web',
          language: payload.language,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 120) : ''
        }
      });
      return { local: true, remote: true, id: result?.id };
    } catch (err) {
      logger.warn('Feedback API failed, saved locally only:', err.message);
      return { local: true, remote: false };
    }
  }
};

export default FeedbackService;
