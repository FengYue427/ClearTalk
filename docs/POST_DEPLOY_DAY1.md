# 部署完成 · 接下来 7 天

> 你已完成 Vercel + Render 部署。按本页顺序执行即可进入 **B 档软启动**。

**生产地址**

- Web：https://clear-talk-five.vercel.app  
- API：https://cleartalk-cu84.onrender.com  

---

## Day 0（今天，约 45 分钟）

### ① 生产冒烟（浏览器）

打开 [`LAUNCH_SIGNOFF.md`](LAUNCH_SIGNOFF.md) **C 表**，逐项打勾：

- [x] English 模式 + `package_issue` 表单全英文（2026-05-23 用户确认 + `npm run smoke:production`）  
- [x] 粘贴「想请假两天」→ 推荐请假场景  
- [x] 填表 → 生成 → 简短/正式切换  
- [x] 👍 反馈  
- [x] `#/scene/leave_request`  
- [x] 注册页法务链接（英文应打开 `*-en.html`）  
- [x] 验证码登录 + 163 收件（Resend）

自动检查：`npm run smoke:production` 全绿。

### ② 运维确认（Render / Vercel 面板）

在 [`LAUNCH_SIGNOFF.md`](LAUNCH_SIGNOFF.md) **B 表**勾选：

- [x] B1 Vercel Ready  
- [x] B5 `JWT_SECRET` 已改（`/health/ready` → `jwt: true`）  
- [x] B6 `ALLOWED_ORIGINS` 含 Vercel 域名（`corsOrigins: 2`）  
- [ ] B7 Disk + `SQLITE_PATH`（见 [`RENDER_B7_B9.md`](RENDER_B7_B9.md)）  
- [ ] B9 `FEEDBACK_ADMIN_KEY` + `/admin.html`（见 [`RENDER_B7_B9.md`](RENDER_B7_B9.md)）  

### ③ 配置发信（B 档关键）✅

Render 使用 **Resend**（163 SMTP 在海外机房超时）。见 [`EMAIL_RESEND_RENDER.md`](EMAIL_RESEND_RENDER.md)。  
`/health/ready` → `emailProvider: resend`, `emailSmtpVerified: true`。

---

## Day 1–2（当前步骤）

- [ ] 复制 [`BETA_INVITE_READY.txt`](BETA_INVITE_READY.txt) 发到内测群（20–50 人）  
- [ ] 记录 3 条必测路径：粘贴推荐、请假、快递投诉  
- [ ] （可选）Sentry 前端 + API  

---

## 法务审阅（D 表，可与内测并行）

按 [`LEGAL_REVIEW.md`](LEGAL_REVIEW.md) 审阅六份页面（中 + 英），勾选 [`LAUNCH_SIGNOFF.md`](LAUNCH_SIGNOFF.md) D1–D3。

---

## Day 3–7

对照 [`SOFT_LAUNCH_CHECKLIST.md`](SOFT_LAUNCH_CHECKLIST.md) 看指标：

| 指标 | 目标 |
|------|------|
| 完成至少 1 次生成 | > 15% 访问用户 |
| 反馈率 | > 5% |
| API 可用 | `/health/ready` 稳定 |

- [ ] 备份 `cleartalk.db`（Render Disk）  
- [ ] 填 [`LAUNCH_SIGNOFF.md`](LAUNCH_SIGNOFF.md) 结论：**有条件上市** 或 **准予上市**  

---

## 命令速查

```bash
npm run launch:verify      # 本地全量预检
npm run smoke:production   # API + 前端包抽检（Vercel 偶发 403 可忽略，以浏览器为准）
```

---

## 文档索引

| 文档 | 用途 |
|------|------|
| [`SMTP_RENDER_SETUP.md`](SMTP_RENDER_SETUP.md) | 邮箱配置 |
| [`BETA_INVITE.md`](BETA_INVITE.md) | 内测文案 |
| [`SOFT_LAUNCH_CHECKLIST.md`](SOFT_LAUNCH_CHECKLIST.md) | 7 天指标 |
| [`LAUNCH_MASTER_PLAN.md`](LAUNCH_MASTER_PLAN.md) | A/B/C 档位 |
| [`POST_LAUNCH_ROADMAP.md`](POST_LAUNCH_ROADMAP.md) | 上线后产品路线 |
