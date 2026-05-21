/**
 * 粘贴分析：优先后端 AI 分类，失败回退关键词匹配
 */
import { api } from './api-client.js';
import { matchScenesFromText } from './scene-matcher.js';
import { logger } from '../core/logger.js';

export async function analyzePasteText(text, allScenes, limit = 3) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return { matches: [], source: 'empty' };

  try {
    const result = await api.post('/api/ai/classify-paste', { text: trimmed });
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
