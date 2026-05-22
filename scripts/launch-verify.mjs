/**
 * 上市前一键预检（本地）
 * 运行: npm run launch:verify
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function run(cmd, args = [], opts = {}) {
  const r = spawnSync(cmd, args, {
    cwd: opts.cwd || root,
    shell: process.platform === 'win32',
    encoding: 'utf8',
    stdio: 'pipe'
  });
  return r;
}

function ok(msg) {
  console.log(`  ✓ ${msg}`);
}

function fail(msg) {
  console.error(`  ✗ ${msg}`);
  process.exitCode = 1;
}

function checkFile(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) fail(`缺少文件: ${rel}`);
  ok(rel);
}

console.log('\n[launch:verify] ClearTalk 上市预检\n');

if (!fs.existsSync(path.join(root, 'node_modules', 'vite'))) {
  console.log('安装依赖 (npm ci)…');
  const ci = run('npm', ['ci']);
  if (ci.status !== 0) {
    console.error(ci.stderr || ci.stdout);
    fail('npm ci 失败，请先在本机或 CI 中安装依赖');
  }
  ok('npm ci');
}

// 1. 关键文件
console.log('1. 静态与配置');
[
  'vercel.json',
  'public/privacy.html',
  'public/privacy-en.html',
  'public/disclaimer.html',
  'public/disclaimer-en.html',
  'public/terms.html',
  'public/terms-en.html',
  'public/robots.txt',
  'public/sitemap.xml',
  'public/admin.html',
  'backend/src/server.js',
  'backend/render.yaml',
  'assets/scenes/builtin.json'
].forEach(checkFile);

const scenes = JSON.parse(
  fs.readFileSync(path.join(root, 'assets/scenes/builtin.json'), 'utf8')
);
if (scenes.length < 35) fail(`场景数 ${scenes.length} < 35`);
ok(`${scenes.length} 内置场景`);

const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
if (vercel.outputDirectory !== 'dist') fail('vercel.json outputDirectory 应为 dist');
ok('vercel.json → dist');

// 2. 构建与测试
console.log('\n2. 构建与单元测试');
let r = run('npm', ['run', 'scenes:build']);
if (r.status !== 0) fail('scenes:build 失败');
ok('scenes:build');

r = run('npm', ['run', 'build']);
if (r.status !== 0) {
  console.error(r.stderr || r.stdout);
  fail('npm run build 失败');
}
ok('npm run build');

if (!fs.existsSync(path.join(root, 'dist/index.html'))) fail('dist/index.html 不存在');
ok('dist/index.html');

r = run('npm', ['test']);
if (r.status !== 0) fail('npm test 失败');
ok('npm test');

// 3. 生产守卫
console.log('\n3. 生产配置守卫');
r = run('npm', ['run', 'check:production']);
if (r.status !== 0) fail('check:production 失败');
ok('check:production');

// 4. 后端语法
console.log('\n4. 后端');
r = run('node', ['--check', 'src/server.js'], { cwd: path.join(root, 'backend') });
if (r.status !== 0) fail('backend server.js 语法错误');
ok('backend syntax');

console.log('\n[launch:verify] 预检完成' + (process.exitCode ? '（有失败项）' : ' — 全部通过') + '\n');
console.log('下一步: 按 docs/LAUNCH_RUNBOOK.md 部署 Render + Vercel\n');
process.exit(process.exitCode || 0);
