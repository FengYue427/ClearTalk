/**
 * 场景/字段本地化（与 Flutter scene.* 键对齐）
 * 位于 core 分块，与 i18n 翻译表同包加载
 */

import { t, trScene } from './i18n.js';
import { state } from './state.js';
import fieldLabelEn from '../../scripts/field-label-en.json';

const HAS_CJK = /[\u4e00-\u9fff]/;

function currentLang() {
  return state.language === 'en' ? 'en' : 'zh';
}

function labelEn(text) {
  if (!text || typeof text !== 'string') return text;
  const trimmed = text.trim();
  if (fieldLabelEn[trimmed]) return fieldLabelEn[trimmed];
  const eg = trimmed.match(/^如[：:]\s*(.+)$/);
  if (eg) {
    const inner = fieldLabelEn[eg[1]] || eg[1];
    const sample = HAS_CJK.test(inner) ? '' : inner;
    return sample ? `e.g. ${sample}` : 'e.g.';
  }
  return HAS_CJK.test(trimmed) ? '' : trimmed;
}

/** 英文模式下绝不返回含汉字的字符串 */
function enOnly(text, zhFallback = '') {
  if (currentLang() !== 'en') return text;
  if (!text || !HAS_CJK.test(text)) return text || '';
  const mapped = labelEn(zhFallback || text);
  return HAS_CJK.test(mapped) ? '' : mapped;
}

function pickSceneTranslation(key, fallback = '') {
  const lang = currentLang();
  const text = trScene(key);
  if (text && text !== key && (lang === 'zh' || !HAS_CJK.test(text))) {
    return text;
  }
  if (lang === 'en') {
    return enOnly(fallback, fallback);
  }
  return fallback || text || key;
}

const CATEGORY_I18N_KEYS = {
  职场沟通: 'home.categories.work',
  消费平台: 'home.categories.shopping',
  租房物业: 'home.categories.housing',
  人际金钱: 'home.categories.money',
  日常生活: 'home.categories.daily_life',
  消费维权: 'home.categories.consumer',
  教育培训: 'home.categories.education',
  医疗健康: 'home.categories.healthcare',
  政务服务: 'home.categories.gov'
};

export function sceneNameKey(scene) {
  return scene.translationKey || `scene.${scene.id}.name`;
}

export function sceneDescKey(scene) {
  return scene.descriptionKey || `scene.${scene.id}.desc`;
}

export function getSceneName(scene) {
  if (!scene) return '';
  const key = sceneNameKey(scene);
  const text = pickSceneTranslation(key, '');
  if (text) return text;
  if (currentLang() === 'en') return trScene(key) !== key ? trScene(key) : key;
  return scene.name;
}

export function getSceneDescription(scene) {
  if (!scene) return '';
  const key = sceneDescKey(scene);
  const text = pickSceneTranslation(key, '');
  if (text) return text;
  if (currentLang() === 'en') return trScene(key) !== key ? trScene(key) : '';
  return scene.description || '';
}

export function getFieldLabel(field, sceneId) {
  const perSceneKey = sceneId ? `scene.field.${sceneId}.${field.key}` : null;
  if (perSceneKey) {
    const per = pickSceneTranslation(perSceneKey, '');
    if (per) return per;
  }
  const genericKey = `scene.field.${field.key}`;
  const generic = pickSceneTranslation(genericKey, '');
  if (generic) return generic;
  if (field.translationKey) {
    const ft = t(field.translationKey);
    if (ft !== field.translationKey) return ft;
  }
  return enOnly(field.label || field.key, field.label);
}

export function getFieldPlaceholder(field, sceneId) {
  const key = sceneId
    ? `scene.field.${sceneId}.${field.key}.placeholder`
    : `scene.field.${field.key}.placeholder`;
  const text = pickSceneTranslation(key, '');
  if (text) return text;
  const generic = pickSceneTranslation(`scene.field.${field.key}.placeholder`, '');
  if (generic) return generic;
  return enOnly(field.placeholder || '', field.placeholder);
}

export function getCategoryName(categoryId) {
  if (!categoryId) return '';
  const key = CATEGORY_I18N_KEYS[categoryId];
  if (key) {
    const text = t(key);
    if (text !== key) return text;
  }
  return categoryId;
}

export function getSelectOptionLabel(field, option, sceneId) {
  const raw = typeof option === 'string' ? option : (option.label || option.value);
  const keys = [
    sceneId && `scene.field.${sceneId}.${field.key}.option.${raw}`,
    `scene.field.${field.key}.option.${raw}`
  ].filter(Boolean);
  for (const key of keys) {
    const text = pickSceneTranslation(key, '');
    if (text) return text;
  }
  if (currentLang() === 'en') {
    return enOnly(raw, raw);
  }
  return raw;
}
