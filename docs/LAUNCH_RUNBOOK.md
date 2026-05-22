# ClearTalk 上线 Runbook

> 配合 [`LAUNCH_CHECKLIST.md`](LAUNCH_CHECKLIST.md) 使用。假设主站 Vercel、API Render。

---

> **S7 逐步操作（Render/Vercel/SMTP）**：见 [`S7_OPERATOR_GUIDE.md`](S7_OPERATOR_GUIDE.md)  
> **Render 环境变量复制表**：见 [`RENDER_ENV_COPY.md`](RENDER_ENV_COPY.md)

## 0. 上线前本地预检

```bash
cd /path/to/APP
npm ci
npm run launch:verify
```

通过标准：构建成功、单元测试通过、35 场景、合规页存在、生产 JWT 守卫通过。

---

## 1. 部署后端（Render）

1. New Web Service → Root Directory: `backend`
2. Build: `npm install` · Start: `npm start`
3. Health Check Path: `/health/ready`
4. **Disk**：1GB，mount `/opt/render/project/src/data`（与 `render.yaml` 一致）
5. 环境变量（必填）：

| 变量 | 示例 |
|------|------|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | 随机长字符串（勿用默认值） |
| `DEEPSEEK_API_KEY` | 或 `OPENAI_API_KEY` / `QWEN_API_KEY` 至少一个 |
| `ALLOWED_ORIGINS` | `https://你的前端.vercel.app` |
| `FEEDBACK_ADMIN_KEY` | 随机管理密钥 |
| `SQLITE_PATH` | `/opt/render/project/src/data/cleartalk.db` |
| `FRONTEND_URL` | 前端 URL（密码重置邮件） |

可选：`FREE_DAILY_GENERATIONS=20`、`PRO_DAILY_GENERATIONS=200`、`EMAIL_*` SMTP。

6. 部署完成后访问：`https://<api>/health/ready` → `status: ok`（且非 503）。

---

## 2. 部署前端（Vercel）

1. Import 仓库，Framework: **Vite**
2. Build: `npm run build` · Output: `dist`
3. 环境变量：`VITE_API_URL=https://<你的-api>.onrender.com`
4. 部署后确认：
   - 首页场景列表加载
   - `vercel.json` 将 `/api/*` 代理到 Render（或仅用 `VITE_API_URL` 直连）

---

## 3. 闭环 CORS

在 Render 更新 `ALLOWED_ORIGINS`，包含 Vercel 域名与本地调试源，然后 Redeploy API。

---

## 4. 生产冒烟（约 15 分钟）

| 步骤 | 操作 | 预期 |
|------|------|------|
| 1 | 打开首页 | 35 类场景可见 |
| 2 | 粘贴「想请假两天」→ 分析 | 推荐请假相关场景 |
| 3 | 选场景 → 填表 → 生成（proxy） | 有结果；设置显示配额 |
| 4 | 切换简短/正式版 | 重新生成成功 |
| 5 | 有帮助反馈 | Toast 成功 |
| 6 | 场景市场列表 | 不 404 |
| 7 | `#/scene/leave_request` | 进入请假场景 |
| 8 | `/privacy.html` | 可打开 |
| 9 | 注册账号 | 页脚有协议链接 |
| 10 | `/admin.html` | 输入 `FEEDBACK_ADMIN_KEY` 可看统计 |

---

## 5. 上线后 24h

- [ ] 检查 Render 日志无大量 5xx
- [ ] 备份 `cleartalk.db`（若用 SQLite）
- [ ] 记录管理密钥与域名配置（密码管理器）
- [ ] 可选：配置 Sentry、SMTP

---

## 6. 回滚

- **前端**：Vercel 上一 Deployment → Promote
- **后端**：Render 上一 Deploy 或回滚 env
- **数据**：Disk 快照/手动复制 `cleartalk.db`

---

## 故障速查

| 现象 | 处理 |
|------|------|
| CORS 错误 | 检查 `ALLOWED_ORIGINS` |
| 429 生成次数 | 正常配额；调 `FREE_DAILY_GENERATIONS` 或 Pro 白名单 |
| `/health/ready` 503 | 生产未配置任何 AI Key |
| 重启丢用户数据 | 未挂载 Disk 或未设 `SQLITE_PATH` |
| 市场空列表 | 正常（无用户分享场景） |
