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
  console.log('  email configured:', data.checks?.email);
  console.log('  email provider:', data.checks?.emailProvider || '(smtp)');
  console.log('  email ready:', data.checks?.emailSmtpVerified);

  if (data.checks?.email && data.checks?.emailSmtpVerified) {
    const via = data.checks?.emailProvider === 'resend' ? 'Resend' : 'SMTP';
    console.log(`\n✓ 发信已就绪（${via}）— 可发验证码登录\n`);
  } else if (data.checks?.email) {
    console.log('\n⚠ Render 有 EMAIL_* 变量但 SMTP 未验证 — 验证码可能仍失败');
    console.log('  查看 Render Logs: [Email] 环境变量检测 / SMTP 连接验证失败');
    console.log('  常见：163 授权码错误 → 重新生成 EMAIL_PASS，或 EMAIL_PORT=587\n');
  } else {
    console.log('\n✗ 生产未读取到 EMAIL_* 环境变量（日志会显示 Email: Simulated）');
    console.log('  Render → ClearTalk 服务 → Environment → 确认 EMAIL_HOST/USER/PASS 在本服务上');
    console.log('  修改后必须点 Save, rebuild, and deploy\n');
    console.log('\n⚠ SMTP 未配置 — 请按 docs/SMTP_RENDER_SETUP.md 配置后再内测\n');
    console.log('  内测前仍可用：密码注册/登录\n');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
