/**
 * 合并 field-label-en.json + supplement，并校验 builtin 全覆盖
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const basePath = path.join(__dirname, 'field-label-en.json');
const supplementPath = path.join(__dirname, 'field-label-en-supplement.json');
const builtinPath = path.join(root, 'assets', 'scenes', 'builtin.json');
const HAS_CJK = /[\u4e00-\u9fff]/;

const base = JSON.parse(fs.readFileSync(basePath, 'utf8'));
const supplement = JSON.parse(fs.readFileSync(supplementPath, 'utf8'));
const merged = { ...base, ...supplement };
const builtin = JSON.parse(fs.readFileSync(builtinPath, 'utf8'));

const missing = new Set();
for (const scene of builtin) {
  for (const field of scene.fields || []) {
    for (const k of ['label', 'placeholder', 'hint']) {
      if (field[k] && !merged[field[k]]) missing.add(field[k]);
    }
    for (const o of field.options || []) {
      const v = typeof o === 'string' ? o : o.label || o.value;
      if (v && !merged[v]) missing.add(v);
    }
  }
}

const badEn = Object.entries(merged).filter(([, v]) => HAS_CJK.test(v));
fs.writeFileSync(basePath, JSON.stringify(merged, null, 2) + '\n', 'utf8');
console.log(`Merged keys: ${Object.keys(merged).length}`);

if (missing.size) {
  console.error('Still missing EN for builtin strings:', [...missing].sort());
  process.exit(1);
}
if (badEn.length) {
  console.error('EN values still contain CJK:', badEn.slice(0, 10));
  process.exit(1);
}
console.log('field-label-en.json OK — full coverage, no CJK in EN values');
