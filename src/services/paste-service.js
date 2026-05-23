/**
 * 粘贴分析：优先后端 AI 分类，失败回退关键词匹配
 */
import { api } from './api-client.js';
import { matchScenesFromText } from './scene-matcher.js';
import { logger } from '../core/logger.js';

const CLASSIFY_TIMEOUT_MS = 3500;

function classifyWithTimeout(text) {
  return Promise.race([
    api.post('/api/ai/classify-paste', { text }),
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error('classify_timeout')), CLASSIFY_TIMEOUT_MS);
    })
  ]);
}

export async function analyzePasteText(text, allScenes, limit = 3) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return { matches: [], source: 'empty' };

  // 无 API 基址（E2E / 纯静态预览）直接用本地关键词
  const apiBase = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || '';
  if (!String(apiBase).trim()) {
    return {
      matches: matchScenesFromText(trimmed, allScenes, limit),
      source: 'keywords'
    };
  }

  try {
    const result = await classifyWithTimeout(trimmed);
    if (result?.scenes?.length) {
      const matches = result.scenes
        .map((item) => {
          const scene = allScenes.find((s) => s.id === item.id);
          if (!scene) return null;
          return {
            scene,
            score: Math.round((item.confidence || 0.5) * 10),
            matchedKeywords: item.reason ? [item.reason] : []
          };
        })
        .filter(Boolean)
        .slice(0, limit);
      if (matches.length) {
        return { matches, source: result.source || 'ai' };
      }
    }
  } catch (err) {
    logger.debug?.('Classify API fallback:', err.message);
  }

  return {
    matches: matchScenesFromText(trimmed, allScenes, limit),
    source: 'keywords'
  };
}

export default { analyzePasteText };
