/**
 * 场景/字段本地化（与 Flutter scene.* 键对齐）
 */

import { t } from '../core/i18n.js';

export function sceneNameKey(scene) {
  return scene.translationKey || `scene.${scene.id}.name`;
}

export function sceneDescKey(scene) {
  return scene.descriptionKey || `scene.${scene.id}.desc`;
}

export function getSceneName(scene) {
  if (!scene) return '';
  const key = sceneNameKey(scene);
  const text = t(key);
  return text !== key ? text : scene.name;
}

export function getSceneDescription(scene) {
  if (!scene) return '';
  const key = sceneDescKey(scene);
  const text = t(key);
  return text !== key ? text : (scene.description || '');
}

export function getFieldLabel(field, sceneId) {
  const perSceneKey = sceneId ? `scene.field.${sceneId}.${field.key}` : null;
  if (perSceneKey) {
    const per = t(perSceneKey);
    if (per !== perSceneKey) return per;
  }
  const genericKey = `scene.field.${field.key}`;
  const generic = t(genericKey);
  if (generic !== genericKey) return generic;
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
  const text = t(key);
  if (text !== key) return text;
  const generic = t(`scene.field.${field.key}.placeholder`);
  if (generic !== `scene.field.${field.key}.placeholder`) return generic;
  return field.placeholder || '';
}

export function getSelectOptionLabel(field, option, sceneId) {
  const optKey = typeof option === 'string' ? option : option.value;
  const keys = [
    sceneId && `scene.field.${sceneId}.${field.key}.option.${optKey}`,
    `scene.field.${field.key}.option.${optKey}`
  ].filter(Boolean);
  for (const key of keys) {
    const text = t(key);
    if (text !== key) return text;
  }
  return typeof option === 'string' ? option : (option.label || option.value);
}
