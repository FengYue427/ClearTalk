/**
 * 生产环境 P0 冒烟（只读 + 一次测试注册）
 * 运行: node scripts/production-smoke.mjs
 */
const API = process.env.SMOKE_API_URL || 'https://cleartalk-cu84.onrender.com';
const WEB = process.env.SMOKE_WEB_URL || 'https://clear-talk-five.vercel.app';
const ORIGIN = WEB;

let failed = 0;

function ok(label) {
  console.log(`  ✓ ${label}`);
}

function fail(label, detail = '') {
  console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
  failed++;
}

async function main() {
  console.log('\n[production-smoke] ClearTalk P0\n');
  console.log(`API: ${API}`);
  console.log(`WEB: ${WEB}\n`);

  try {
    const health = await fetch(`${API}/health/ready`);
    const h = await health.json();
    if (health.ok && h.status === 'ok') {
      ok(`/health/ready status=ok ai=${h.checks?.ai?.ready}`);
      if (!h.checks?.jwt) fail('JWT configured');
      if (!h.checks?.ai?.ready) fail('AI ready');
      if (h.checks?.email === false) {
        console.log('  ⚠ email/SMTP not configured (B10 — OK for tier A, required for B)');
      }
    } else {
      fail('/health/ready', JSON.stringify(h).slice(0, 120));
    }
  } catch (e) {
    fail('/health/ready', e.message);
  }

  try {
    const id = Date.now();
    const email = `smoke-${id}@example.com`;
    const res = await fetch(`${API}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
      body: JSON.stringify({ email, password: 'TestPass123!', username: `smoke${id}` })
    });
    const body = await res.json().catch(() => ({}));
    if (res.status === 200 && body.success) ok('POST /api/auth/register (CORS + 200)');
    else fail('POST /api/auth/register', `${res.status} ${JSON.stringify(body).slice(0, 80)}`);
  } catch (e) {
    fail('POST /api/auth/register', e.message);
  }

  try {
    const webRes = await fetch(WEB, { signal: AbortSignal.timeout(45000) });
    if (!webRes.ok) fail('WEB index', String(webRes.status));
    else ok(`WEB index HTTP ${webRes.status}`);
    const html = await webRes.text();
    const coreMatch = html.match(/assets\/core-[A-Za-z0-9_-]+\.js/);
    if (!coreMatch) {
      fail('WEB core chunk', 'not found in index.html');
    } else {
      const coreUrl = `${WEB}/${coreMatch[0]}`;
      const coreRes = await fetch(coreUrl, { signal: AbortSignal.timeout(60000) });
      const js = await coreRes.text();
      const bundleChecks = [
        ['Leave Request', 'EN scene title in bundle'],
        ['Package Delivery Issue', 'EN package_issue in bundle'],
        ['scene.package_issue.name', 'i18n keys in bundle']
      ];
      for (const [needle, label] of bundleChecks) {
        if (js.includes(needle)) ok(label);
        else fail(label);
      }
    }
    if (html.includes('privacy') || html.includes('page-home')) ok('WEB shell structure');
  } catch (e) {
    fail('WEB fetch', e.message);
  }

  try {
    const pr = await fetch(`${WEB}/privacy.html`);
    if (pr.ok) ok('/privacy.html accessible');
    else fail('/privacy.html', String(pr.status));
  } catch (e) {
    fail('/privacy.html', e.message);
  }

  console.log(failed ? `\n[production-smoke] ${failed} failed\n` : '\n[production-smoke] All P0 automated checks passed\n');
  process.exit(failed ? 1 : 0);
}

main();
