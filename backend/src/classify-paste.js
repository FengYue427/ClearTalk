/**
 * AI 粘贴场景分类
 */
const { chatCompletion, getAiStatus } = require('./ai-provider');
const { loadCatalog } = require('./scene-catalog');

function buildClassifyPrompt(text, catalog) {
  const list = catalog
    .map((s) => `- ${s.id}: ${s.name}（${s.category}）${s.description.slice(0, 40)}`)
    .join('\n');

  return `你是场景匹配助手。用户粘贴了一段需要回复或起草的沟通内容，请从下列场景中选择最匹配的 1–3 个。

可选场景：
${list}

用户粘贴内容：
"""
${String(text).slice(0, 2000)}
"""

只输出 JSON 数组，不要其他文字。格式：
[{"id":"scene_id","confidence":0.9,"reason":"简短理由"}]

规则：
1. id 必须来自上面列表
2. confidence 为 0–1 的小数
3. 最多 3 条，按 confidence 降序
4. 无法匹配时返回 []`;
}

function parseClassifyResponse(text, catalog) {
  const ids = new Set(catalog.map((s) => s.id));
  let raw = String(text || '').trim();
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) raw = fence[1].trim();
  const arrMatch = raw.match(/\[[\s\S]*\]/);
  if (!arrMatch) return [];

  try {
    const parsed = JSON.parse(arrMatch[0]);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x) => x && ids.has(x.id))
      .slice(0, 3)
      .map((x) => {
        const scene = catalog.find((s) => s.id === x.id);
        return {
          id: x.id,
          name: scene?.name || x.id,
          category: scene?.category || '',
          icon: '📝',
          confidence: Math.min(1, Math.max(0, Number(x.confidence) || 0.5)),
          reason: String(x.reason || '').slice(0, 120)
        };
      });
  } catch {
    return [];
  }
}

async function classifyPaste(text) {
  const catalog = loadCatalog();
  const trimmed = String(text || '').trim();
  if (!trimmed) return { scenes: [], source: 'empty' };

  const ai = getAiStatus();
  if (!ai.ready) {
    return { scenes: [], source: 'no_ai' };
  }

  try {
    const result = await chatCompletion({
      prompt: buildClassifyPrompt(trimmed, catalog),
      temperature: 0.2,
      maxTokens: 400
    });
    const scenes = parseClassifyResponse(result.text, catalog);
    return { scenes, source: 'ai', model: result.model };
  } catch (err) {
    console.error('[Classify] AI failed:', err.message);
    return { scenes: [], source: 'error', error: err.message };
  }
}

module.exports = { classifyPaste, parseClassifyResponse };
