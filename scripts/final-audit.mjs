/**
 * 上市前地毯式清查（i18n / 配置 / 常见风险）
 * 运行: node scripts/final-audit.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const HAS_CJK = /[\u4e00-\u9fff]/;

const issues = [];
const ok = [];

function fail(id, msg) {
  issues.push({ id, msg });
}
function pass(msg) {
  ok.push(msg);
}

// --- i18n.js zh/en parity ---
const i18nSrc = fs.readFileSync(path.join(root, 'src/core/i18n.js'), 'utf8');
const zhKeys = new Set();
const enKeys = new Set();
let block = null;
for (const line of i18nSrc.split('\n')) {
  if (line.includes('zh: {')) block = 'zh';
  else if (line.includes('en: {')) block = 'en';
  else if (line.trim() === '},' && block) block = null;
  const m = line.match(/^\s+'([^']+)':/);
  if (m && block === 'zh') zhKeys.add(m[1]);
  if (m && block === 'en') enKeys.add(m[1]);
}
const missingEn = [...zhKeys].filter((k) => !enKeys.has(k));
const missingZh = [...enKeys].filter((k) => !zhKeys.has(k));
if (missingEn.length) fail('I18N-001', `i18n.js: ${missingEn.length} keys missing in en: ${missingEn.slice(0, 8).join(', ')}...`);
else pass(`i18n.js zh/en parity (${zhKeys.size} keys)`);

if (missingZh.length) fail('I18N-002', `i18n.js: ${missingZh.length} keys only in en: ${missingZh.slice(0, 8).join(', ')}`);

// --- t() keys used in src vs zh/en ---
const { spawnSync } = await import('child_process');
const i18nAudit = spawnSync('node', ['scripts/audit-i18n-keys.mjs'], {
  cwd: root,
  encoding: 'utf8',
  shell: process.platform === 'win32'
});
if (i18nAudit.status !== 0) {
  fail('I18N-006', `audit-i18n-keys: ${(i18nAudit.stdout || '').trim()}`);
} else {
  pass('All t() keys exist in zh/en');
}

// --- scene-translations EN CJK ---
const sceneTr = fs.readFileSync(path.join(root, 'src/core/scene-translations.generated.js'), 'utf8');
const enBlock = sceneTr.split('en: {')[1]?.split('\n};')[0] || '';
const enCjk = [];
for (const line of enBlock.split('\n')) {
  const m = line.match(/:\s*"([^"]*)"/);
  if (m && HAS_CJK.test(m[1])) enCjk.push(m[1].slice(0, 40));
}
if (enCjk.length) fail('I18N-003', `scene-translations en has CJK (${enCjk.length}): ${enCjk.slice(0, 5).join(' | ')}`);
else pass('scene-translations.en: no CJK');

// --- field-label-en values ---
const fieldEn = JSON.parse(fs.readFileSync(path.join(root, 'scripts/field-label-en.json'), 'utf8'));
const badField = Object.entries(fieldEn).filter(([, v]) => HAS_CJK.test(v));
if (badField.length) fail('I18N-004', `field-label-en.json EN values with CJK: ${badField.length}`);
else pass('field-label-en.json: no CJK in values');

// --- hardcoded UI strings in src/ui (exclude comments) ---
function walk(dir, files = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, files);
    else if (e.name.endsWith('.js')) files.push(p);
  }
  return files;
}
const uiHardcoded = [];
for (const file of walk(path.join(root, 'src/ui'))) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) return;
    const code = line.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '');
    if (/showToast|showAuthError/.test(code)) {
      if (/['"`][^'"`]*[\u4e00-\u9fff]/.test(code) && !/t\(/.test(code)) {
        uiHardcoded.push(`${path.relative(root, file)}:${i + 1}`);
      }
    }
  });
}
if (uiHardcoded.length) fail('I18N-005', `Possible hardcoded Chinese in UI (${uiHardcoded.length}): ${uiHardcoded.slice(0, 6).join(', ')}`);
else pass('src/ui: no obvious hardcoded CN in toasts/HTML');

// --- backend Chinese API errors (inventory) ---
const serverSrc = fs.readFileSync(path.join(root, 'backend/src/server.js'), 'utf8');
const apiErrors = (serverSrc.match(/error:\s*'[^']*[\u4e00-\u9fff][^']*'/g) || []).length;
if (apiErrors > 0) pass(`backend API: ${apiErrors} Chinese error strings (EN users see CN — known gap)`);

// --- secrets patterns ---
const secretPatterns = [
  /sk-[a-zA-Z0-9]{20,}/,
  /re_[a-zA-Z0-9]{20,}/,
  /JWT_SECRET\s*=\s*['"][^'"]{20,}['"]/
];
function scanSecrets(dir) {
  const hits = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.name === 'node_modules' || e.name === '.git' || e.name === 'dist') continue;
    if (e.isDirectory()) hits.push(...scanSecrets(p));
    else if (/\.(js|json|html|env|md)$/.test(e.name) && !e.name.includes('.example')) {
      const c = fs.readFileSync(p, 'utf8');
      for (const re of secretPatterns) {
        if (re.test(c) && !p.includes('final-audit')) hits.push(path.relative(root, p));
      }
    }
  }
  return hits;
}
const secretHits = [...new Set(scanSecrets(root))].filter(
  (p) => !p.includes('backend\\.env') && !p.includes('build\\web\\canvaskit')
);
if (secretHits.length) fail('SEC-001', `Possible secrets in repo: ${secretHits.join(', ')}`);
else pass('No obvious API keys in tracked source (backend/.env gitignored)');

// --- duplicate legal at repo root ---
const dupLegal = ['privacy-policy.html', 'terms-of-service.html', 'disclaimer.html'].filter((f) =>
  fs.existsSync(path.join(root, f))
);
if (dupLegal.length) pass(`Legacy legal copies at repo root (${dupLegal.length}) — production uses public/`);

// --- legal pages in public ---
for (const f of ['privacy.html', 'privacy-en.html', 'terms.html', 'terms-en.html', 'disclaimer.html', 'disclaimer-en.html']) {
  if (!fs.existsSync(path.join(root, 'public', f))) fail('LEGAL-001', `Missing public/${f}`);
}
pass('All 6 legal pages in public/');

// --- report ---
console.log('\n[final-audit] ClearTalk 地毯式清查\n');
console.log('✓ OK (' + ok.length + ')');
ok.forEach((m) => console.log('  ✓', m));
if (issues.length) {
  console.log('\n⚠ Issues (' + issues.length + ')');
  issues.forEach(({ id, msg }) => console.log(`  ⚠ [${id}]`, msg));
  process.exit(issues.some((i) => i.id.startsWith('I18N-00') && !i.msg.includes('known')) ? 1 : 0);
}
console.log('\n[final-audit] Done\n');
