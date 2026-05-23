/**
 * 扫描 src 中 t('key') 是否在 i18n.js 的 zh/en 中存在
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const i18nSrc = fs.readFileSync(path.join(root, 'src/core/i18n.js'), 'utf8');
const zh = new Set();
const en = new Set();
let block = null;
for (const line of i18nSrc.split('\n')) {
  if (line.includes('zh: {')) block = 'zh';
  else if (line.includes('en: {')) block = 'en';
  else if (line.trim() === '},' && block) block = null;
  const m = line.match(/^\s+'([^']+)':/);
  if (m && block === 'zh') zh.add(m[1]);
  if (m && block === 'en') en.add(m[1]);
}

function walk(dir, files = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory() && e.name !== 'node_modules') walk(p, files);
    else if (e.name.endsWith('.js')) files.push(p);
  }
  return files;
}

const used = new Set();
const re = /\bt\(\s*['"]([^'"]+)['"]/g;
for (const file of walk(path.join(root, 'src'))) {
  if (file.includes('i18n.js') || file.includes('scene-translations')) continue;
  const src = fs.readFileSync(file, 'utf8');
  let m;
  while ((m = re.exec(src))) used.add(m[1]);
}

const missingZh = [...used].filter((k) => !zh.has(k)).sort();
const missingEn = [...used].filter((k) => !en.has(k)).sort();

console.log('t() keys used:', used.size);
console.log('missing zh:', missingZh.length, missingZh.slice(0, 40));
console.log('missing en:', missingEn.length, missingEn.slice(0, 40));
if (missingZh.length || missingEn.length) process.exit(1);
