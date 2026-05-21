# ClearTalk 生产安全清单

部署到 Render / Vercel 前请逐项确认。

## 必做（P0）

| 项 | 要求 |
|----|------|
| `NODE_ENV` | 设为 `production` |
| `JWT_SECRET` | **不得**使用 `your-secret-key-change-in-production` |
| `ALLOWED_ORIGINS` | 仅填写你的前端域名，**禁止** `*` |
| AI Key | 至少配置 `DEEPSEEK_API_KEY` 或 `OPENAI_API_KEY` 或 `QWEN_API_KEY` |
| `FEEDBACK_ADMIN_KEY` | 随机长字符串，仅用于内部查看反馈统计 |

## 建议（P1）

| 项 | 说明 |
|----|------|
| Render 探活 | Health Check Path = `/health/ready` |
| HTTPS | 前后端均使用 HTTPS |
| 密钥轮换 | 定期轮换 JWT 与 API Key |
| 数据备份 | 定期备份 `backend/data/db.json`（阶段 5 迁 SQLite 后改库备份） |

## 自动检查（CI）

- `node scripts/check-production-config.mjs` — 验证默认 JWT 在生产环境被拒绝
- Playwright E2E — 核心用户路径冒烟

## 反馈与隐私

- `POST /api/feedback` 仅存文本预览（前 500 字），不存完整对话
- IP 仅存 SHA256 前 16 位哈希
- AI 请求前对身份证/银行卡/手机号做脱敏

## CORS 行为

后端仅允许：

- 无 `Origin` 的请求（如 curl）
- `localhost` / `127.0.0.1`
- `ALLOWED_ORIGINS` 中列出的域名

其他来源将被拒绝。
