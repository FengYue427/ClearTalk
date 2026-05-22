/**
 * 场景模板定义 — 单源数据来自 assets/scenes/builtin.json
 */

import { BUILTIN_SCENES } from './builtin-data.js';
import { buildSceneSearchBlob } from './search-text.js';

export { BUILTIN_SCENES };

export const FIELD_TYPES = {
  TEXT: 'text',
  TEXTAREA: 'textarea',
  NUMBER: 'number',
  SELECT: 'select',
  BOOLEAN: 'boolean',
  DATE: 'date'
};

export const TONES = {
  soft: {
    key: 'soft',
    label: '温和',
    enLabel: 'Soft',
    translationKey: 'scene.tone.soft',
    promptModifierKey: 'scene.tone.soft.modifier',
    promptModifier: '使用温和、礼貌的语气，表达诉求时给对方留有余地，避免咄咄逼人'
  },
  neutral: {
    key: 'neutral',
    label: '中立',
    enLabel: 'Neutral',
    translationKey: 'scene.tone.neutral',
    promptModifierKey: 'scene.tone.neutral.modifier',
    promptModifier: '使用客观、清晰的语气，事实陈述准确，诉求明确但不过激'
  },
  firm: {
    key: 'firm',
    label: '坚定',
    enLabel: 'Firm',
    translationKey: 'scene.tone.firm',
    promptModifierKey: 'scene.tone.firm.modifier',
    promptModifier: '使用坚定、有力的语气，立场明确，诉求清晰，不卑不亢但保持礼貌'
  }
};

/** 解析语气对象（含 promptModifier，供 AI 调用） */
export function resolveTone(toneKey, tFn = (k) => k) {
  const tone = TONES[toneKey] || TONES.neutral;
  const modifier = tFn(tone.promptModifierKey);
  return {
    ...tone,
    promptModifier: modifier !== tone.promptModifierKey ? modifier : tone.promptModifier
  };
}

const CATEGORY_KEYS = {
  '职场沟通': 'home.categories.work',
  '消费平台': 'home.categories.shopping',
  '租房物业': 'home.categories.housing',
  '人际金钱': 'home.categories.money',
  '日常生活': 'home.categories.daily_life',
  '消费维权': 'home.categories.consumer',
  '教育培训': 'home.categories.education',
  '医疗健康': 'home.categories.healthcare',
  '政务服务': 'home.categories.gov'
};

export const CATEGORIES = [
  { id: 'all', name: 'All', translationKey: 'home.categories.all' },
  ...Array.from(new Set(BUILTIN_SCENES.map((s) => s.category))).map((cat) => ({
    id: cat,
    name: cat,
    translationKey: CATEGORY_KEYS[cat] || `home.categories.${cat}`
  })),
  { id: 'custom', name: 'Custom', translationKey: 'home.custom.scenes' }
];

export function getScenesByCategory(categoryId, customScenes = []) {
  if (categoryId === 'all') {
    return [...BUILTIN_SCENES, ...customScenes];
  }
  if (categoryId === 'custom') {
    return customScenes;
  }
  return BUILTIN_SCENES.filter((s) => s.category === categoryId);
}

export function searchScenes(query, customScenes = []) {
  const allScenes = [...BUILTIN_SCENES, ...customScenes];
  const lowerQuery = query.toLowerCase();

  const lang =
    typeof document !== 'undefined'
      ? document.documentElement.getAttribute('data-lang') || 'zh'
      : 'zh';
  return allScenes.filter((scene) => buildSceneSearchBlob(scene, lang).includes(lowerQuery));
}

export function getSceneById(id, customScenes = []) {
  return BUILTIN_SCENES.find((s) => s.id === id) || customScenes.find((s) => s.id === id);
}
