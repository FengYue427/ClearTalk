# S7 上市对齐规划（第三轮审查）

> **基线**：`main` @ `985a2219`（Vercel Vite 部署已 Ready）  
> **目标**：在 2–4 周内从「前端可访问」推进到「可对外正式运营」  
> **签收标准**：[`LAUNCH_SIGNOFF.md`](LAUNCH_SIGNOFF.md) B/C/D 表全部勾选

---

## 一、现状快照（2026-05-21）

| 维度 | 状态 | 说明 |
|------|------|------|
| Web 构建 | ✅ | `npm run vercel-build` / `launch:verify` 全绿 |
| Vercel 生产 | ✅ | 你已确认新部署无 Flutter 错误 |
| GitHub `main` | ✅ | 含 i18n、上市文档、`vercel-build` |
| Render API | 🚀 | 需部署；`/health/ready` 需 200 |
| 正式运营 | 🚀 | SMTP、域名、监控、生产冒烟未闭环 |

**结论**：**代码侧可进入「上市对齐执行期」**；阻塞项主要在 **运维配置 + 后端上线 + 生产验收**，而非新功能开发。

---

## 二、第三轮代码审查摘要

### 2.1 已就绪（无需再开发即可上线 Web）

| 模块 | 证据 |
|------|------|
| 35 场景 + 粘贴分析 | `assets/scenes/builtin.json`、`paste-service.js` |
| AI 生成 / 流式 / 多版本 | `ai-service.js`、`scene-detail.js` |
| 配额 | `quota.js`、`quota-service.js` |
| 市场 | `market-service.js` ↔ `/api/market/*` |
| 反馈 / 埋点 / Admin | `feedback-service.js`、`analytics-service.js`、`public/admin.html` |
| 合规页 | `public/privacy.html`、`terms.html`、`disclaimer.html` |
| 中英文 | `src/core/scene-l10n.js`、`scene-translations.generated.js`（EN 零 CJK）、`setLanguage` |
| 安全基线 | 限流、JWT 守卫、`redactSensitiveText`、生产 JWT 检查脚本 |
| CI | `ci.yml`：web 构建、E2E、backend 语法、Flutter analyze |

### 2.2 缺口清单（按上市影响排序）

#### P0 — 上线闭环（运维 + 后端）

| # | 项 | 位置 / 说明 |
|---|-----|-------------|
| P0-1 | **部署 Render API** | `backend/render.yaml`；设 `JWT_SECRET`、`SQLITE_PATH`、AI Key、`ALLOWED_ORIGINS` |
| P0-2 | **前端接 API** | Vercel `VITE_API_URL` = Render 地址；手测登录/生成/配额 |
| P0-3 | **CORS 闭环** | `ALLOWED_ORIGINS` 含 Vercel 生产域名 |
| P0-4 | **生产冒烟 15min** | 按 [`LAUNCH_RUNBOOK.md`](LAUNCH_RUNBOOK.md) §4 |
| P0-5 | **SMTP 或内测策略** | `backend/src/server.js` 未配邮箱时 JSON 回传 `code`/`resetUrl`（`318–320`、`418–419` 行）— 正式对外前必须配 SMTP 或改代码禁止回传 |

#### P1 — 代码一致性（建议 S7 内完成）

| # | 项 | 位置 / 说明 |
|---|-----|-------------|
| P1-1 | **前后端 API 未实现** | 前端 `user-service.js` 调用但 `server.js` **无**对应路由：`PUT /api/user/password`、`POST /api/user/delete`、`POST/DELETE /api/user/phrases`、`DELETE /api/sync/clear` — 当前 UI 多走本地 Storage，但若将来接按钮会 404 |
| P1-2 | **Flutter 后端地址占位** | `lib/services/user_service.dart`、`sync_service.dart`：`your-backend-url.com` |
| P1-3 | **重置密码深链路径** | 邮件/模拟 `resetUrl` 指向 `/reset-password`，Web 实际在 `#/user` + query（`user.js` 已处理 query）— 需确认邮件链接与路由一致 |
| P1-4 | **生产环境变量文档化** | 对照 `backend/.env.example` 与 Render 面板逐项勾选 |

#### P2 — 体验与债务（可上市后迭代）

| # | 项 | 说明 |
|---|-----|------|
| P2-1 | `main.js` `file://` 警告仅中文 | 开发者体验 |
| P2-2 | 语气卡片 `substring(0,20)` | `scene-detail.js` |
| P2-3 | Flutter `history_page` 硬编码 | 「复制全文」「关闭」 |
| P2-4 | `legacy/` 本地模板 id 与场景 id 不一致 | 仅 **local** AI 模式 |
| P2-5 | 场景字段英文键未 100% 覆盖 | ✅ 8d 已解决；仅剩静态法务页中文 |
| P2-6 | `public/` 法务页仅中文 | 可接受，建议法务审阅 |

### 2.3 Web ↔ Flutter 功能对照（上市宣传：以 Web 为准）

| 能力 | Web (Vite) | Flutter App |
|------|------------|-------------|
| 35 场景 | ✅ | ✅ `builtin_scenes.dart` |
| 粘贴推荐 | ✅ | ✅ `SceneMatcher` |
| 多版本输出 | ✅ | 需对照 `result_page` |
| 对话流式 | ✅ SSE | ✅ `proxy_ai_service` |
| 配额 | ✅ | ✅ `quota_service` |
| 场景市场 | ✅ | 部分（依赖 API 配置） |
| 分享卡片 | ✅ Web | ✅ `ShareCardService` |
| 用户注册/同步 | ✅（需 API） | 🚀 需改 `baseUrl` |
| 商店上架 | — | 🚀 非 Web 上市必需 |

---

## 三、冲刺计划（S7 → 正式运营）

### S7（第 1 周）：生产闭环 — **当前重点**

| 天 | 任务 | 产出 |
|----|------|------|
| D1 | Render 部署 + env + Disk | `/health/ready` = ok |
| D1 | Vercel 设 `VITE_API_URL` | 生成/登录走真实 API |
| D2 | `ALLOWED_ORIGINS` + Redeploy API | 无 CORS 错误 |
| D2 | 跑通 `LAUNCH_RUNBOOK` §4 冒烟 | 记录截图/问题 |
| D3 | 配置 SMTP（或明确内测期） | 验证码不进 JSON |
| D4 | 填 `LAUNCH_SIGNOFF` B 表 | 运维签收 |
| D5 | 填 C 表（含英文切换） | 产品签收 |

**S7 代码任务（已完成 `main` 推送后）：**

1. ✅ 用户 API：`password` / `delete` / `phrases` / `sync/clear`（`backend/src/server.js`）  
2. ✅ 生产未配 SMTP 时不回传 `code`/`resetUrl`（503 提示配置邮箱）  
3. ✅ CI `launch:verify` job  
4. ✅ 重置链接 `FRONTEND_URL/?token=&email=` + 前端自动进用户页  
5. ✅ Flutter `--dart-define=CLEARTALK_API_URL=...`  
6. 🚀 **你方操作**：见 [`docs/S7_OPERATOR_GUIDE.md`](S7_OPERATOR_GUIDE.md)  

### S8（第 2 周）：运营就绪

| 任务 | 说明 |
|------|------|
| 自定义域名 | Vercel +（可选）API 子域 |
| Sentry | 前端 + `server.js` 全局错误 |
| SQLite 备份 | Render cron 或手动脚本 |
| `admin.html` 首周数据 | 事件/反馈/场景 TOP |
| 更新 `sitemap` / Search Console | `npm run sitemap` |

### S9（第 3–4 周）：增长与合规收尾

| 任务 | 说明 |
|------|------|
| 市场 UGC 引导 | 分享场景 + 审核策略 |
| 法务终审 | privacy/terms/disclaimer |
| 英文漏网扫描 | 设置 en 走一遍 C 表 |
| Flutter `baseUrl` + 内测包 | 与 Web 同期 API |
| 软启动 / 小范围邀请 | 收集反馈率、生成成功率 |

### S10+（有 DAU）

见 [`POST_LAUNCH_ROADMAP.md`](POST_LAUNCH_ROADMAP.md) 阶段 10–12（支付、Postgres、个性化）。

---

## 四、上市里程碑（建议日期由你填写）

```
[已完成] 代码 S1–S6 + Vercel Ready
    ↓
[S7 本周] Render API + 生产冒烟 + SIGNOFF B/C
    ↓
[S8] 域名 + 监控 + 备份
    ↓
[S9] 法务 + 软启动
    ↓
[正式对外] LAUNCH_SIGNOFF「准予上市」
```

---

## 五、每周自检命令（本地自行执行，无需反复确认）

```bash
npm run launch:verify          # 全量预检
npm run vercel-build           # 与 Vercel 一致
npm test                       # 单元测试
npm run test:e2e               # 需 preview（CI 已跑）
cd backend && node --check src/server.js
```

生产检查：

```text
GET  https://<api>/health/ready
GET  https://<web>/           → 35 场景
GET  https://<web>/#/scene/leave_request
GET  https://<web>/admin.html
```

---

## 六、与文档索引

| 文档 | 用途 |
|------|------|
| [`LAUNCH_SIGNOFF.md`](LAUNCH_SIGNOFF.md) | 最终勾选签收 |
| [`LAUNCH_RUNBOOK.md`](LAUNCH_RUNBOOK.md) | 部署步骤 |
| [`LAUNCH_CHECKLIST.md`](LAUNCH_CHECKLIST.md) | 能力对照表 |
| [`POST_LAUNCH_ROADMAP.md`](POST_LAUNCH_ROADMAP.md) | 上市后 9–12 阶段 |
| [`VERCEL_FIX.md`](VERCEL_FIX.md) | Vercel 构建问题 |
| [`ROADMAP.md`](ROADMAP.md) | 产品阶段总览 |

---

## 七、建议下一步（执行顺序）

1. **你方**：Render 部署 → 把 API URL 写入 Vercel `VITE_API_URL`  
2. **你方**：完成 `LAUNCH_SIGNOFF` B1–B10  
3. **仓库（可选）**：S7 代码项 — 补用户 API / 生产禁回传验证码  
4. **你方**：C1–C8 冒烟 + D1–D3 法务  
5. **对外**：仅宣传 Vite Web 主站 URL（Deployments → Visit）
