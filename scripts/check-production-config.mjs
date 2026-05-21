/**
 * 生产环境配置守卫（CI 用）
 * 验证 NODE_ENV=production 且默认 JWT 时进程应拒绝启动
 */
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(__dirname, '../backend/src/server.js');

function runServer(env, timeoutMs = 8000) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [serverPath], {
      cwd: path.join(__dirname, '../backend'),
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (d) => { stdout += d; });
    child.stderr?.on('data', (d) => { stderr += d; });

    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      resolve({ code: null, killed: true, stdout, stderr });
    }, timeoutMs);

    child.on('exit', (code) => {
      clearTimeout(timer);
      resolve({ code, killed: false, stdout, stderr });
    });
  });
}

async function main() {
  console.log('[check] 测试：生产环境 + 默认 JWT 应退出...');
  const bad = await runServer({
    NODE_ENV: 'production',
    JWT_SECRET: 'your-secret-key-change-in-production',
    PORT: '3999',
    DEEPSEEK_API_KEY: ''
  });

  if (bad.code !== 1) {
    console.error('[check] 失败：期望 exit code 1，实际', bad.code, bad.stdout, bad.stderr);
    process.exit(1);
  }
  console.log('[check] ✓ 默认 JWT 被正确拒绝');

  console.log('[check] 测试：生产环境 + 合法 JWT 应启动...');
  const good = await runServer({
    NODE_ENV: 'production',
    JWT_SECRET: 'ci-test-secret-key-not-default',
    PORT: '3998',
    DEEPSEEK_API_KEY: 'sk-test-placeholder'
  }, 3000);

  if (good.code === 1) {
    console.error('[check] 失败：合法配置不应 exit 1', good.stderr);
    process.exit(1);
  }
  console.log('[check] ✓ 合法 JWT 可通过启动校验');

  console.log('[check] 全部通过');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
