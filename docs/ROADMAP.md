# ClearTalk 产品路线图

> 主站：**Vite Web**（`dist/` → Vercel）  
> API：**backend/src/server.js**（→ Render）  
> 移动端：**Flutter**（App 为主，Web 可选）

---

## 已完成

| 阶段 | 内容 |
|------|------|
| 0 | 架构收敛、CI、文档 |
| 1 | 29 场景单源、`legacy/` 归档 |
| 2 | SSE 流式、多模型、Flutter 代理 |
| 3 | 粘贴推荐、分享卡片、本地反馈 |
| 4（S1–S2） | 反馈 API、健康检查、Playwright E2E、安全守卫 |
| 5（S3） | SQLite、埋点 API、市场路由对齐、防刷 use |
| 6（S4） | 多版本输出、对话流式、35 场景、Flutter 粘贴/反馈、SEO |
| 7（S5） | 配额/Pro 预备、AI 粘贴分类、场景落地页、合规页、Flutter 分享卡片 |
| 8（S6） | 上市清单同步、Runbook、launch:verify、Admin 看板、注册合规链 |
| 8b | 第二轮审查：场景 i18n 同步、设置语言修复、UI 硬编码清理 |
| 8c | Vercel Vite 部署修复（`vercel-build`）、上市文档与签收单 |

---

## 阶段 8c：部署稳定（进行中 → 你方已确认 Vercel Ready）

| 任务 | 状态 |
|------|------|
| 去掉 Flutter Web 生产构建 | ✅ |
| `vercel-build` + `VERCEL_FIX.md` | ✅ |
| Vercel 生产 Ready | ✅（你方确认） |
| Render API 上线 | 🚀 S7 重点 |

**执行计划**：见 [`docs/PLAN_S7_LAUNCH_ALIGNMENT.md`](PLAN_S7_LAUNCH_ALIGNMENT.md)

---

## 阶段 8b：质量审查（已完成）

| 任务 | 状态 |
|------|------|
| 设置语言/主题/AI 持久化 | ✅ |
| 35 场景中英文（Flutter → Web） | ✅ `sync-scene-i18n.mjs` |
| 路由标题与空状态 i18n | ✅ |
| `launch:verify` 全绿 | ✅ |

---

## 阶段 4–5：生产与数据（已完成）

| 任务 | 状态 | 说明 |
|------|------|------|
| 反馈 API | ✅ | `POST /api/feedback`、`GET /api/feedback/stats` |
| 健康检查 | ✅ | `/health`、`/health/ready`、启动校验 |
| E2E / 安全 | ✅ | Playwright、`docs/SECURITY.md` |
| SQLite | ✅ | `backend/src/database.js`，自动从 `db.json` 迁移 |
| 埋点 | ✅ | `POST /api/events`、`Analytics` 前端、`GET /api/events/stats` |
| 场景市场 | ✅ | `/api/market/*` 别名、`POST .../use` 限流 |
| 上市清单 | ✅ | `docs/LAUNCH_CHECKLIST.md` |

---

## 阶段 6（S4）：体验与内容（已完成）

| 任务 | 状态 | 说明 |
|------|------|------|
| Web 多版本输出 | ✅ | 标准/简短/正式/降火，`scene-detail` 版本切换 |
| 对话流式 | ✅ | `generateDialogueStream` + proxy SSE |
| 35+ 场景 | ✅ | +6 场景，`scenes:build --from-json` |
| Flutter 粘贴 | ✅ | `SceneMatcher` + 首页粘贴卡片 |
| Flutter 反馈 | ✅ | `FeedbackService` + 结果页 👍/👎 |
| SEO 基础 | ✅ | `seo-service.js`、`robots.txt`、`sitemap.xml` |

## 阶段 7（S5）：变现预备与增长（已完成）

| 任务 | 状态 | 说明 |
|------|------|------|
| 每日配额 | ✅ | `GET /api/quota`，AI 生成扣减，`FREE/PRO_DAILY_GENERATIONS` |
| Pro 白名单 | ✅ | `PRO_USER_IDS` / `users.is_pro` |
| AI 粘贴分类 | ✅ | `POST /api/ai/classify-paste`，Web/Flutter 回退关键词 |
| 场景落地页 | ✅ | `#/scene/{id}` + sitemap 生成脚本 |
| 合规页入口 | ✅ | `public` 链到 privacy/disclaimer/terms |
| Flutter 分享卡片 | ✅ | `ShareCardService` 格式化分享 |

## 阶段 8（S6）：上市准备（已完成）

| 任务 | 状态 | 说明 |
|------|------|------|
| 清单与代码对照 | ✅ | `docs/LAUNCH_CHECKLIST.md` 更新至 35 场景/S5 能力 |
| 上线 Runbook | ✅ | `docs/LAUNCH_RUNBOOK.md` |
| 预检脚本 | ✅ | `npm run launch:verify` |
| Admin 看板 | ✅ | `public/admin.html` |
| Render SQLite 路径 | ✅ | `render.yaml` + `SQLITE_PATH` |
| 注册合规链接 | ✅ | 注册页链 privacy/terms/disclaimer |
| 隐私政策修订 | ✅ | 补充服务端存储说明 |

**待运维（你方执行）**：Vercel + Render 部署、域名、SMTP、Sentry、确认生产 URL

详见 [`docs/POST_LAUNCH_ROADMAP.md`](POST_LAUNCH_ROADMAP.md)。

---

## 阶段 9：运营稳固（上市后 0–4 周）

- 生产 SMTP + 关闭验证码 API 回显
- Sentry、自定义域名、SQLite 备份
- CI 集成 `launch:verify`

## 阶段 10：体验与增长（1–2 月）

- 字段 i18n 补全、语气 UI、市场 UGC、看板增强

## 阶段 11：商业化（有 DAU 后）

- Pro 订阅支付（Stripe/微信）
- 托管数据库（Postgres/Turso）

## 阶段 12：智能化（差异化）

- 粘贴多轮澄清、个性化推荐、多语言扩展

---

## API 速查（新增）

```http
POST /api/feedback
Content-Type: application/json
Authorization: Bearer <optional>

{
  "type": "helpful" | "not_helpful",
  "sceneId": "leave_request",
  "sceneName": "请假申请",
  "tone": "neutral",
  "reasons": ["tone_wrong"],
  "comment": "语气太硬",
  "textPreview": "..."
}
```

```http
GET /api/feedback/stats
X-Admin-Key: <FEEDBACK_ADMIN_KEY>
```

```http
POST /api/events
{ "name": "scene_open", "sceneId": "loan_reminder", "meta": {} }

GET /api/events/stats?days=7
X-Admin-Key: <FEEDBACK_ADMIN_KEY>

GET /api/quota
Authorization: Bearer <optional>

POST /api/ai/classify-paste
{ "text": "领导您好，我想请假两天…" }

GET /health/ready
```
