/**
 * 从 lib/l10n/app_i18n.dart 提取 scene.* 键，生成 Web 场景翻译模块
 * 运行: node scripts/sync-scene-i18n.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const dartPath = path.join(root, 'lib', 'l10n', 'app_i18n.dart');
const outPath = path.join(root, 'src', 'core', 'scene-translations.generated.js');

const dart = fs.readFileSync(dartPath, 'utf8');

function extractLangBlock(lang) {
  const re = new RegExp(`'${lang}':\\s*\\{([\\s\\S]*?)\\n\\s*\\},\\s*\\n\\s*'`, 'm');
  const alt = dart.indexOf(`'${lang}': {`);
  if (alt < 0) return '';
  let depth = 0;
  let start = dart.indexOf('{', alt);
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

// 从 builtin.json 补充 scene.{id}.name / .desc（中文）
const builtinPath = path.join(root, 'assets', 'scenes', 'builtin.json');
const builtin = JSON.parse(fs.readFileSync(builtinPath, 'utf8'));

const zhBlock = extractLangBlock('zh');
const enBlock = extractLangBlock('en');
const zh = parseSceneKeys(zhBlock);
const en = parseSceneKeys(enBlock);

for (const scene of builtin) {
  const nameKey = `scene.${scene.id}.name`;
  const descKey = `scene.${scene.id}.desc`;
  if (!zh[nameKey]) zh[nameKey] = scene.name;
  if (!zh[descKey]) zh[descKey] = scene.description;
  if (!en[nameKey] && en[nameKey] !== nameKey) {
    /* keep flutter en */
  } else if (!en[nameKey]) {
    en[nameKey] = scene.name;
  }
  if (!en[descKey]) en[descKey] = scene.description;
}

const content = `/**
 * 场景翻译（由 scripts/sync-scene-i18n.mjs 生成，源：lib/l10n/app_i18n.dart + builtin.json）
 * 请勿手动编辑
 */
export const SCENE_TRANSLATIONS = {
  zh: ${JSON.stringify(zh, null, 2)},
  en: ${JSON.stringify(en, null, 2)}
};
`;

fs.writeFileSync(outPath, content, 'utf8');
console.log(`Scene i18n: zh=${Object.keys(zh).length}, en=${Object.keys(en).length} → ${outPath}`);
