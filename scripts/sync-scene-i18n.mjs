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
const fieldLabelSupplementPath = path.join(__dirname, 'field-label-en-supplement.json');

const dart = fs.readFileSync(dartPath, 'utf8');
const builtin = JSON.parse(fs.readFileSync(builtinPath, 'utf8'));
const enSceneFallbacks = JSON.parse(fs.readFileSync(enSceneFallbacksPath, 'utf8'));
const fieldLabelEn = {
  ...JSON.parse(fs.readFileSync(fieldLabelEnPath, 'utf8')),
  ...(fs.existsSync(fieldLabelSupplementPath)
    ? JSON.parse(fs.readFileSync(fieldLabelSupplementPath, 'utf8'))
    : {})
};

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
  if (fieldLabelEn[trimmed]) return fieldLabelEn[trimmed];
  const eg = trimmed.match(/^如[：:]\s*(.+)$/);
  if (eg) {
    const inner = fieldLabelEn[eg[1]] || eg[1];
    return `e.g. ${inner}`;
  }
  if (trimmed === '简要说明原因') return 'Brief reason';
  if (trimmed === '简要说明') return 'Brief description';
  if (trimmed === '简要说明即可，无需详述') return 'Brief note is enough';
  if (HAS_CJK.test(trimmed)) {
    console.warn(`[sync-scene-i18n] missing EN map: ${trimmed.slice(0, 40)}`);
  }
  return trimmed;
}

function scrubEnFromZh(zh, en) {
  for (const [key, zhVal] of Object.entries(zh)) {
    const cur = en[key];
    if (cur === undefined || HAS_CJK.test(String(cur))) {
      const mapped = enLabel(zhVal);
      if (!HAS_CJK.test(mapped)) en[key] = mapped;
    }
  }
}

function applyBuiltinFields(scene, zh, en) {
  const sid = scene.id;
  for (const field of scene.fields || []) {
    const base = `scene.field.${sid}.${field.key}`;
    const generic = `scene.field.${field.key}`;

    if (field.label) {
      if (!zh[base]) zh[base] = field.label;
      if (!zh[generic]) zh[generic] = field.label;
      en[base] = enLabel(field.label);
      en[generic] = enLabel(field.label);
    }

    if (field.placeholder) {
      const phKey = `${base}.placeholder`;
      const phGeneric = `${generic}.placeholder`;
      if (!zh[phKey]) zh[phKey] = field.placeholder;
      en[phKey] = enLabel(field.placeholder);
      en[phGeneric] = enLabel(field.placeholder);
    }

    if (field.hint) {
      const hintKey = `${base}.hint`;
      if (!zh[hintKey]) zh[hintKey] = field.hint;
      en[hintKey] = enLabel(field.hint);
    }

    for (const opt of field.options || []) {
      const optVal = typeof opt === 'string' ? opt : opt.value ?? opt.label;
      const optKey = `${base}.option.${optVal}`;
      const optGeneric = `${generic}.option.${optVal}`;
      const label = typeof opt === 'string' ? opt : opt.label || opt.value;
      if (!zh[optKey]) zh[optKey] = label;
      if (!zh[optGeneric]) zh[optGeneric] = label;
      en[optKey] = enLabel(label);
      en[optGeneric] = enLabel(label);
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
    en[nameKey] = fallback?.name || nameKey;
  }
  if (!en[descKey] || HAS_CJK.test(en[descKey])) {
    en[descKey] = fallback?.desc || '';
  }

  applyBuiltinFields(scene, zh, en);
}

scrubEnFromZh(zh, en);

const enCjk = Object.entries(en).filter(([, v]) => HAS_CJK.test(String(v)));
if (enCjk.length) {
  console.error(`EN dict still has ${enCjk.length} CJK entries, e.g.:`, enCjk.slice(0, 5));
  process.exit(1);
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
