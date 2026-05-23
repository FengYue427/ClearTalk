# 部署完成 · 接下来 7 天

> 你已完成 Vercel + Render 部署。按本页顺序执行即可进入 **B 档软启动**。

**生产地址**

- Web：https://clear-talk-five.vercel.app  
- API：https://cleartalk-cu84.onrender.com  

---

## Day 0（今天，约 45 分钟）

### ① 生产冒烟（浏览器）

打开 [`LAUNCH_SIGNOFF.md`](LAUNCH_SIGNOFF.md) **C 表**，逐项打勾：

- [ ] English 模式 + `package_issue` 表单全英文  
- [ ] 粘贴「想请假两天」→ 推荐请假场景  
- [ ] 填表 → 生成 → 简短/正式切换  
- [ ] 👍 反馈  
- [ ] `#/scene/leave_request`  
- [ ] 注册页法务链接（英文应打开 `*-en.html`）  

### ② 运维确认（Render / Vercel 面板）

在 [`LAUNCH_SIGNOFF.md`](LAUNCH_SIGNOFF.md) **B 表**勾选：

- [ ] B1 Vercel Ready  
- [ ] B5 `JWT_SECRET` 已改（非默认）  
- [ ] B6 `ALLOWED_ORIGINS` 含 Vercel 域名  
- [ ] B7 Disk + `SQLITE_PATH`  
- [ ] B9 `FEEDBACK_ADMIN_KEY` + `/admin.html`  

### ③ 配置 SMTP（B 档关键）

跟 [`SMTP_RENDER_SETUP.md`](SMTP_RENDER_SETUP.md) 配好后，确认 `/health/ready` → `"email": true`。

---

## Day 1–2

- [ ] 复制 [`BETA_INVITE.md`](BETA_INVITE.md) 发到内测群（20–50 人）  
- [ ] 记录 3 条必测路径：粘贴推荐、请假、快递投诉  
- [ ] （可选）Sentry 前端 + API  

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
