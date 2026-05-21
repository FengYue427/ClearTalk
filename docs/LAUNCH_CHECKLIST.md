# ClearTalk 真正上市检查清单

> 与代码库同步日期：2026-05-21（S5 之后）  
> 图例：**✅ 代码已就绪** · **🚀 待运维/你方部署** · **⚠️ 需人工确认（法务/域名）**

---

## 与代码库对照结论

| 领域 | 结论 |
|------|------|
| 主站 | Vite `dist/` + `vercel.json`（API 代理到 Render）— **代码就绪** |
| 后端 | `backend/src/server.js` v3.2，SQLite/JSON 双模式，Render `render.yaml` 含 **1GB 磁盘** — 需设 `SQLITE_PATH` |
| 场景 | **35** 个内置场景（非 29） |
| S5 已落地 | 配额、AI 粘贴分类、场景深链 `#/scene/{id}`、合规静态页 |
| 仍待部署 | 真实域名、生产 env、Vercel/Render 一键发布 |
| 建议修改（本次已做） | 注册页合规链接、隐私政策补充服务端数据说明、`render.yaml` SQLite 路径、S6 上线脚本与 Admin 看板 |

---

## P0 — 阻塞上线

### 基础设施与部署

| 项 | 状态 | 说明 |
|----|------|------|
| 前端生产构建 | ✅ | `npm run build` → `dist/`；`vercel.json` → `outputDirectory: dist` |
| API 生产部署 | 🚀 | Render：`backend/`、`npm start`、健康检查 `/health/ready` |
| 环境变量 | 🚀 | `JWT_SECRET`、`ALLOWED_ORIGINS`、AI Key、`FEEDBACK_ADMIN_KEY`；见 `backend/.env.example` |
| 启动守卫 | ✅ | 生产默认 JWT 拒绝启动；`npm run check:production` |
| 健康探活 | ✅ | `/health`、`/health/ready` |
| HTTPS 与域名 | 🚀 | 绑定 Vercel + Render 域名；更新 `ALLOWED_ORIGINS` |
| SQLite 持久卷 | ✅/🚀 | `render.yaml` 已声明 disk；部署时设 `SQLITE_PATH=/opt/render/project/src/data/cleartalk.db` |

### 安全与隐私

| 项 | 状态 | 说明 |
|----|------|------|
| 密钥不入库 | ✅ | `.gitignore` 含 `.env`；勿提交真实密钥 |
| AI 输入脱敏 | ✅ | `redactSensitiveText`（身份证/手机/银行卡） |
| 速率限制 | ✅ | 认证、反馈、埋点、市场 use、粘贴分类、配额 |
| 隐私政策页 | ✅/⚠️ | `public/privacy.html`（已补充账号/反馈/埋点说明）；**法务审阅** |
| 用户协议 / 免责声明 | ✅/⚠️ | `public/terms.html`、`disclaimer.html`；设置页 + **注册页** 已链入 |
| 产品定位 | ⚠️ | 沟通辅助，非法律/医疗建议；见免责声明 |

### 核心功能验收

| 项 | 状态 | 说明 |
|----|------|------|
| 35 内置场景 | ✅ | `assets/scenes/builtin.json`；代理 + 本地各抽测 |
| 流式生成 | ✅ | `useStream` + `POST /api/ai/generate-stream`（proxy 模式） |
| 场景市场 | ✅ | `/api/market/*` 与 `market-service.js` |
| 反馈上报 | ✅ | `POST /api/feedback` + `GET /api/feedback/stats` |
| 每日配额 | ✅ | `GET /api/quota`；超限 429 |
| AI 粘贴分类 | ✅ | `POST /api/ai/classify-paste` + 关键词回退 |
| E2E 冒烟 | ✅ | Playwright（local AI）；生产 URL 需 `launch:verify` 或手测 |

---

## P1 — 首月运营

| 项 | 状态 | 说明 |
|----|------|------|
| 错误监控 | 🚀 | 建议 Sentry（前端 + API） |
| 备份策略 | 🚀 | SQLite 文件定期备份（Render disk 路径） |
| 邮件 SMTP | 🚀 | 生产配置 `EMAIL_*`；关闭模拟验证码回显 |
| 埋点看板 | ✅ | `public/admin.html` + `GET /api/events/stats` |
| 客服渠道 | ✅ | 设置页 `mailto:feedback@cleartalk.app` |
| SEO | ✅ | `seo-service.js`、`robots.txt`、`npm run sitemap`（36 URL） |
| 性能 | ✅ | PWA、`vercel.json` assets 长期缓存 |
| Flutter 商店 | 🚀 | 可选；主站以 Vite Web 为准 |

---

## P2 — 规模化（有 DAU 后）

| 项 | 状态 | 说明 |
|----|------|------|
| 托管数据库 | 🚀 | Postgres/Turso 替代单机 SQLite |
| 配额 / Pro | ✅ | 已实现；支付未接 |
| AI 粘贴分类 | ✅ | 已实现 |
| 支付接入 | 🚀 | S6+ / 阶段 8：Stripe 或微信 |
| Admin UI | ✅ | 轻量 `admin.html`（密钥访问） |

---

## 已知技术债

1. **双前端**：仅对外宣传 Vite 主站；`deploy-web.yml`（Flutter Web）勿与主站混用。
2. **本地 AI 模板**：部分 `legacy` 模板 id 与场景 id 不一致，离线模式可能通用化。
3. **E2E**：CI 不跑代理 AI（无 Key）。
4. **隐私政策旧版表述**：已增「服务端数据」章节，上线前建议法务过一遍。

---

## 上线日 Runbook

详见 [`docs/LAUNCH_RUNBOOK.md`](LAUNCH_RUNBOOK.md)。

```bash
npm run launch:verify    # 本地一键预检
npm run check:production
```

顺序摘要：

1. 本地 `npm run launch:verify`
2. Render 部署 API + 磁盘 + env（含 `SQLITE_PATH`）
3. Vercel 部署 + `VITE_API_URL`
4. 手测：注册 → 生成 → 反馈 → 市场 → 粘贴分析
5. 打开 `/admin.html` 验证统计（`FEEDBACK_ADMIN_KEY`）

---

## 快速命令

```bash
npm run launch:verify
npm run build && npm test && npm run test:e2e
npm run check:production
npm run sitemap
cd backend && npm ci && node --check src/server.js
```
