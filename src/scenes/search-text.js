/**
 * 场景搜索文本（不依赖 i18n 运行时，避免测试环境循环引用）
 */

import { SCENE_TRANSLATIONS } from '../core/scene-translations.generated.js';

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

function pickTranslation(lang, key, fallback = '') {
  const dict = SCENE_TRANSLATIONS[lang] || SCENE_TRANSLATIONS.zh;
  const val = dict[key];
  return val && val !== key ? val : fallback;
}

export function buildSceneSearchBlob(scene, lang = 'zh') {
  if (!scene) return '';
  const name = pickTranslation(lang, `scene.${scene.id}.name`, scene.name);
  const desc = pickTranslation(lang, `scene.${scene.id}.desc`, scene.description || '');
  const catKey = CATEGORY_I18N_KEYS[scene.category];
  const category = catKey
    ? pickTranslation(lang, catKey, scene.category)
    : scene.category;
  return [name, desc, category, scene.name, scene.description, scene.category]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}
