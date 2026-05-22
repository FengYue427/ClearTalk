/**
 * 场景/字段本地化（与 Flutter scene.* 键对齐）
 */

import { t } from '../core/i18n.js';
import { state } from '../core/state.js';
import { SCENE_TRANSLATIONS } from '../core/scene-translations.generated.js';

const HAS_CJK = /[\u4e00-\u9fff]/;

function currentLang() {
  return state.language === 'en' ? 'en' : 'zh';
}

/** 优先读 scene-translations.generated，避免 t() 英文回落中文 */
function pickSceneTranslation(key, fallback = '') {
  const lang = currentLang();
  const fromDict = SCENE_TRANSLATIONS[lang]?.[key];
  if (fromDict && fromDict !== key && (lang === 'zh' || !HAS_CJK.test(fromDict))) {
    return fromDict;
  }
  const viaT = t(key);
  if (viaT !== key && (lang === 'zh' || !HAS_CJK.test(viaT))) {
    return viaT;
  }
  if (lang === 'en') {
    const enVal = SCENE_TRANSLATIONS.en?.[key];
    if (enVal && !HAS_CJK.test(enVal)) return enVal;
  }
  return fallback;
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
  return pickSceneTranslation(sceneNameKey(scene), scene.name);
}

export function getSceneDescription(scene) {
  if (!scene) return '';
  return pickSceneTranslation(sceneDescKey(scene), scene.description || '');
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
  return field.label || field.key;
}

export function getFieldPlaceholder(field, sceneId) {
  const key = sceneId
    ? `scene.field.${sceneId}.${field.key}.placeholder`
    : `scene.field.${field.key}.placeholder`;
  const text = pickSceneTranslation(key, '');
  if (text) return text;
  const generic = pickSceneTranslation(`scene.field.${field.key}.placeholder`, '');
  if (generic) return generic;
  return field.placeholder || '';
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
  const optKey = typeof option === 'string' ? option : option.value;
  const keys = [
    sceneId && `scene.field.${sceneId}.${field.key}.option.${optKey}`,
    `scene.field.${field.key}.option.${optKey}`
  ].filter(Boolean);
  for (const key of keys) {
    const text = pickSceneTranslation(key, '');
    if (text) return text;
  }
  return typeof option === 'string' ? option : (option.label || option.value);
}
