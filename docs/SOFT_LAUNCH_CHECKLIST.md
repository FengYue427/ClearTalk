# ClearTalk 软启动清单（B 档）

> 完成 [`P0_VERIFICATION_LOG.md`](P0_VERIFICATION_LOG.md) 与签收 B/C 表后使用。目标：20–50 人真实使用 7 天。

---

## 1. 上线阻塞（必做）

| # | 任务 | 完成 |
|---|------|------|
| 1 | Render 配置 SMTP（见 [`S7_OPERATOR_GUIDE.md`](S7_OPERATOR_GUIDE.md) §SMTP） | ☐ |
| 2 | 确认注册邮件/验证码**不再**在 API JSON 里返回 `code` | ☐ |
| 3 | Sentry：前端 + API DSN | ☐ |
| 4 | SQLite 备份：每周复制 `cleartalk.db` 或 Render 快照 | ☐ |
| 5 | 记录 `FEEDBACK_ADMIN_KEY`、`JWT_SECRET` 到密码管理器 | ☐ |

---

## 2. 内测招募

| # | 任务 | 完成 |
|---|------|------|
| 6 | 定内测群（微信/Telegram/邮件列表）20–50 人 | ☐ |
| 7 | 发一页说明：主站 URL、English 切换、3 个示例场景 | ☐ |
| 8 | 收集反馈渠道：应用内 👍/👎 + 群聊 | ☐ |

**建议让内测完成的 3 条路径**：

1. 粘贴对方消息 → 跟推荐场景生成  
2. 请假场景 `leave_request` 全流程  
3. 快递投诉 `package_issue`（英文模式）

---

## 3. 指标（7 天）

| 指标 | 目标 | 实际 |
|------|------|------|
| API `/health/ready` 可用率 | > 99% | |
| 访问 → 至少 1 次生成 | > 15% | |
| 生成页反馈提交率 | > 5% | |
| 英文路径用户投诉「仍见中文」 | 0 条 | |
| 5xx / 未捕获异常 | < 0.5%（有 Sentry 后） | |

数据来源：`/admin.html` 埋点 + 反馈统计 + Sentry。

---

## 4. 软启动结束决策

- [ ] **进入 C 正式上架**：指标达标 + SMTP + 法务勾选 D 表  
- [ ] **延长内测 2 周**：SMTP/生成失败率未达标  
- [ ] **暂缓**：列出阻塞：________________

---

相关：[`LAUNCH_MASTER_PLAN.md`](LAUNCH_MASTER_PLAN.md) · [`POST_LAUNCH_ROADMAP.md`](POST_LAUNCH_ROADMAP.md)
