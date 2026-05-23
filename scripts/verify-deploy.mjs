/**
 * 部署后查验（API errorCode + 前端可达 + 代理）
 * 运行: npm run verify:deploy
 */
const API = process.env.SMOKE_API_URL || 'https://cleartalk-cu84.onrender.com';
const WEB = process.env.SMOKE_WEB_URL || 'https://clear-talk-five.vercel.app';

let failed = 0;
function ok(m) { console.log(`  ✓ ${m}`); }
function fail(m, d = '') { console.error(`  ✗ ${m}${d ? ` — ${d}` : ''}`); failed++; }

async function main() {
  console.log('\n[verify:deploy] 部署查验\n');
  console.log(`API: ${API}`);
  console.log(`WEB: ${WEB}\n`);

  // 1. errorCode（需 Render 已部署含 api-errors 的版本）
  try {
    const r = await fetch(`${API}/api/auth/verify-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: WEB },
      body: JSON.stringify({ email: 'deploy-check@example.com', code: '000000' })
    });
    const body = await r.json();
    if (body.errorCode === 'auth.error.invalid.code') ok('API 返回 errorCode（后端已更新）');
    else fail('API errorCode', JSON.stringify(body).slice(0, 120));
  } catch (e) {
    fail('API errorCode', e.message);
  }

  // 2. Vercel → Render 代理
  try {
    const r = await fetch(`${WEB}/api/scenes/catalog`, {
      headers: { Accept: 'application/json' }
    });
    const body = await r.json().catch(() => ({}));
    if (r.ok && Array.isArray(body.scenes) && body.scenes.length >= 35) {
      ok(`WEB /api/* 代理到 Render（${body.scenes.length} 场景）`);
    } else fail('WEB API proxy', `${r.status} ${JSON.stringify(body).slice(0, 80)}`);
  } catch (e) {
    fail('WEB API proxy', e.message);
  }

  // 3. 法务页
  for (const path of ['/privacy-en.html', '/admin.html']) {
    try {
      const r = await fetch(`${WEB}${path}`, { redirect: 'follow' });
      if (r.ok) ok(`${path} HTTP ${r.status}`);
      else fail(path, String(r.status));
    } catch (e) {
      fail(path, e.message);
    }
  }

  console.log(failed ? `\n[verify:deploy] ${failed} 项失败\n` : '\n[verify:deploy] 全部通过\n');
  process.exit(failed ? 1 : 0);
}

main();
