/**
 * 从遗留 app.js 提取 SCENES，生成单源 JSON 与 ES 模块
 * 运行: node scripts/extract-scenes.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const assetsDir = path.join(root, 'assets', 'scenes');
const jsonPath = path.join(assetsDir, 'builtin.json');
const fromJson = process.argv.includes('--from-json');

let normalized;

if (fromJson && fs.existsSync(jsonPath)) {
  normalized = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
} else {
const legacyPath = path.join(root, 'legacy', 'app.js');
const appJsPath = fs.existsSync(legacyPath) ? legacyPath : path.join(root, 'app.js');
const appJs = fs.readFileSync(appJsPath, 'utf8');

const FIELD_TYPES = {
  TEXT: 'text',
  TEXTAREA: 'textarea',
  NUMBER: 'number',
  SELECT: 'select',
  BOOLEAN: 'boolean',
  DATE: 'date',
};

const match = appJs.match(/const SCENES = \[([\s\S]*?)\];\s*\nconst CATEGORY_I18N/);
if (!match) {
  console.error('Could not find SCENES array in app.js');
  process.exit(1);
}

const scenesBody = match[1].replace(/FIELD_TYPES\.(\w+)/g, (_, k) => JSON.stringify(FIELD_TYPES[k]));
// eslint-disable-next-line no-eval
const SCENES = eval(`[${scenesBody}]`);

const CATEGORY_ICONS = {
  '职场沟通': '💼',
  '消费平台': '🛒',
  '租房物业': '🏠',
  '人际金钱': '💬',
  '日常生活': '🏡',
  '消费维权': '⚖️',
  '教育培训': '📚',
  '医疗健康': '🏥',
  '政务服务': '🏛️',
};

normalized = SCENES.map((scene) => ({
  id: scene.id,
  name: scene.name,
  category: scene.category,
  description: scene.description,
  icon: CATEGORY_ICONS[scene.category] || '📝',
  fields: (scene.fields || []).map((f) => ({
    key: f.key,
    label: f.label,
    placeholder: f.placeholder || '',
    type: f.type,
    required: !!f.required,
    ...(f.options ? { options: f.options } : {}),
    ...(f.hint ? { hint: f.hint } : {}),
  })),
}));
}

if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}
fs.writeFileSync(
  path.join(assetsDir, 'builtin.json'),
  JSON.stringify(normalized, null, 2),
  'utf8'
);

const moduleContent = `/**
 * 内置场景（由 scripts/extract-scenes.mjs 从 assets/scenes/builtin.json 生成）
 * 请勿手动编辑 — 修改 assets/scenes/builtin.json 后运行: npm run scenes:build
 */
export const BUILTIN_SCENES = ${JSON.stringify(normalized, null, 2)};
`;

fs.writeFileSync(path.join(root, 'src', 'scenes', 'builtin-data.js'), moduleContent, 'utf8');
console.log(`Extracted ${normalized.length} scenes → assets/scenes/builtin.json & src/scenes/builtin-data.js`);
