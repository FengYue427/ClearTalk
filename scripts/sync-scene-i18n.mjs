/**
 * 从 lib/l10n/app_i18n.dart + builtin.json 生成 Web 场景翻译
 * 运行: node scripts/sync-scene-i18n.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const dartPath = path.join(root, 'lib', 'l10n', 'app_i18n.dart');
const outPath = path.join(root, 'src', 'core', 'scene-translations.generated.js');
const builtinPath = path.join(root, 'assets', 'scenes', 'builtin.json');
const enSceneFallbacksPath = path.join(__dirname, 'scene-en-fallbacks.json');
const fieldLabelEnPath = path.join(__dirname, 'field-label-en.json');

const dart = fs.readFileSync(dartPath, 'utf8');
const builtin = JSON.parse(fs.readFileSync(builtinPath, 'utf8'));
const enSceneFallbacks = JSON.parse(fs.readFileSync(enSceneFallbacksPath, 'utf8'));
const fieldLabelEn = JSON.parse(fs.readFileSync(fieldLabelEnPath, 'utf8'));

const HAS_CJK = /[\u4e00-\u9fff]/;

function extractLangBlock(lang) {
  const alt = dart.indexOf(`'${lang}': {`);
  if (alt < 0) return '';
  let depth = 0;
  const start = dart.indexOf('{', alt);
  let i = start;
  for (; i < dart.length; i++) {
    if (dart[i] === '{') depth++;
    if (dart[i] === '}') {
      depth--;
      if (depth === 0) break;
    }
  }
  return dart.slice(start + 1, i);
}

function parseSceneKeys(block) {
  const map = {};
  const re = /'((?:scene\.|category\.)[^']+)':\s*'((?:\\'|[^'])*)'/g;
  let m;
  while ((m = re.exec(block)) !== null) {
    const key = m[1];
    const val = m[2].replace(/\\'/g, "'");
    if (key.startsWith('scene.') || key.startsWith('category.')) {
      map[key] = val;
    }
  }
  return map;
}

function enLabel(text) {
  if (!text || typeof text !== 'string') return text;
  const trimmed = text.trim();
  return fieldLabelEn[trimmed] || trimmed;
}

function applyBuiltinFields(scene, zh, en) {
  const sid = scene.id;
  for (const field of scene.fields || []) {
    const base = `scene.field.${sid}.${field.key}`;
    const generic = `scene.field.${field.key}`;

    if (field.label) {
      if (!zh[base]) zh[base] = field.label;
      if (!zh[generic]) zh[generic] = field.label;
      if (!en[base] || HAS_CJK.test(en[base])) en[base] = enLabel(field.label);
      if (!en[generic] || HAS_CJK.test(en[generic])) en[generic] = enLabel(field.label);
    }

    if (field.placeholder) {
      const phKey = `${base}.placeholder`;
      const phGeneric = `${generic}.placeholder`;
      if (!zh[phKey]) zh[phKey] = field.placeholder;
      if (!en[phKey] || HAS_CJK.test(en[phKey])) en[phKey] = enLabel(field.placeholder);
      if (!en[phGeneric] || HAS_CJK.test(en[phGeneric])) en[phGeneric] = enLabel(field.placeholder);
    }

    if (field.hint) {
      const hintKey = `${base}.hint`;
      if (!zh[hintKey]) zh[hintKey] = field.hint;
      if (!en[hintKey] || HAS_CJK.test(en[hintKey])) en[hintKey] = enLabel(field.hint);
    }

    for (const opt of field.options || []) {
      const optVal = typeof opt === 'string' ? opt : opt.value ?? opt.label;
      const optSlug =
        typeof opt === 'object' && opt.value
          ? String(opt.value)
          : String(optVal).replace(/\s+/g, '_').slice(0, 32);
      const optKey = `${base}.option.${optSlug}`;
      if (!zh[optKey]) zh[optKey] = typeof opt === 'string' ? opt : opt.label || opt.value;
      if (!en[optKey] || HAS_CJK.test(en[optKey])) {
        en[optKey] = enLabel(typeof opt === 'string' ? opt : opt.label || opt.value);
      }
    }
  }
}

const zh = parseSceneKeys(extractLangBlock('zh'));
const en = parseSceneKeys(extractLangBlock('en'));

const CATEGORY_HOME_KEYS = {
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

for (const [cat, homeKey] of Object.entries(CATEGORY_HOME_KEYS)) {
  if (!zh[`scene.category.${cat}`]) zh[`scene.category.${cat}`] = cat;
}

for (const scene of builtin) {
  const nameKey = `scene.${scene.id}.name`;
  const descKey = `scene.${scene.id}.desc`;
  const fallback = enSceneFallbacks[scene.id];

  if (!zh[nameKey]) zh[nameKey] = scene.name;
  if (!zh[descKey]) zh[descKey] = scene.description;

  if (!en[nameKey] || HAS_CJK.test(en[nameKey])) {
    en[nameKey] = fallback?.name || en[nameKey] || scene.name;
  }
  if (!en[descKey] || HAS_CJK.test(en[descKey])) {
    en[descKey] = fallback?.desc || en[descKey] || scene.description;
  }

  applyBuiltinFields(scene, zh, en);
}

const content = `/**
 * 场景翻译（由 scripts/sync-scene-i18n.mjs 生成）
 * 源：lib/l10n/app_i18n.dart + assets/scenes/builtin.json + scripts/scene-en-fallbacks.json
 * 请勿手动编辑
 */
export const SCENE_TRANSLATIONS = {
  zh: ${JSON.stringify(zh, null, 2)},
  en: ${JSON.stringify(en, null, 2)}
};
`;

fs.writeFileSync(outPath, content, 'utf8');
console.log(`Scene i18n: zh=${Object.keys(zh).length}, en=${Object.keys(en).length} → ${outPath}`);
