/**
 * 检查生产 API 健康与 SMTP 是否就绪
 * 运行: npm run verify:production
 */
const API = process.env.SMOKE_API_URL || 'https://cleartalk-cu84.onrender.com';

async function main() {
  console.log('\n[verify:production] ClearTalk API\n');
  const res = await fetch(`${API}/health/ready`);
  const data = await res.json().catch(() => ({}));

  if (!res.ok || data.status !== 'ok') {
    console.error('✗ /health/ready 异常', res.status, JSON.stringify(data).slice(0, 200));
    process.exit(1);
  }

  console.log('✓ status:', data.status);
  console.log('  jwt:', data.checks?.jwt);
  console.log('  ai.ready:', data.checks?.ai?.ready);
  console.log('  email (SMTP):', data.checks?.email);

  if (data.checks?.email) {
    console.log('\n✓ SMTP 已配置 — 可发内测邀请\n');
  } else {
    console.log('\n⚠ SMTP 未配置 — 请按 docs/SMTP_RENDER_SETUP.md 配置后再内测\n');
    console.log('  内测前仍可用：密码注册/登录\n');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
