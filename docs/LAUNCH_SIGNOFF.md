# ClearTalk 上市签收单（最终）

> 用途：对外「真正上市」前最后一页勾选。  
> 代码基线：`main` @ `d63c2097` 及之后。  
> 自动验证：[`P0_VERIFICATION_LOG.md`](P0_VERIFICATION_LOG.md) · 部署后行动：[`POST_DEPLOY_DAY1.md`](POST_DEPLOY_DAY1.md)

**部署状态（你方确认已完成）**：Vercel Web + Render API 已上线 → **A 档基本达成**，进入 **B 档软启动**。

---

## A. 自动预检（本地/CI）

```bash
npm run launch:verify
```

- [x] 全部 ✓（2026-05-22 `npm run launch:verify` 全绿）

---

## B. 生产环境（运维）

| # | 检查项 | 通过 |
|---|--------|------|
| B1 | Vercel 最新部署 **Ready**，构建命令为 `npm run build`（非 Flutter） | ☑ |
| B2 | 访问生产 URL：首页有 **粘贴分析 + 35 场景** | ☑ |
| B3 | `VITE_API_URL` 指向正确 Render 服务 | ☑ |
| B4 | Render `/health/ready` → `status: ok` | ☑ |
| B5 | `JWT_SECRET` 非默认值 | ☑ |
| B6 | `ALLOWED_ORIGINS` 含生产前端域名 | ☑ |
| B7 | `SQLITE_PATH` + Disk 已挂载（用户数据不丢） | ☐ |
| B8 | 至少一个 AI Key（DeepSeek/OpenAI/Qwen） | ☑ |
| B9 | `FEEDBACK_ADMIN_KEY` 已设；`/admin.html` 可查看统计 | ☐ |
| B10 | 生产已配发信（Resend API / SMTP） | ☑ |

---

## C. 功能冒烟（约 15 分钟）

| # | 操作 | 通过 |
|---|------|------|
| C1 | 切换 **English**：场景名/设置项为英文 | ☑ |
| C2 | 粘贴「想请假两天」→ 推荐请假场景 | ☑ |
| C3 | 填表 → 生成（proxy）→ 多版本切换 | ☑ |
| C4 | 有帮助反馈成功 | ☑ |
| C5 | 场景市场可打开 | ☑ |
| C6 | `#/scene/leave_request` 深链 | ☑ |
| C7 | 注册页链到 privacy / terms / disclaimer | ☑ |
| C8 | `/privacy.html` 可访问 | ☑ |

---

## D. 法务与品牌

| # | 检查项 | 通过 |
|---|--------|------|
| D1 | 隐私政策 / 用户协议 / 免责声明已审阅（中 + 英版本已提供） | ☐ |
| D2 | 产品对外表述为「沟通辅助」，非法律/医疗建议 | ☐ |
| D3 | 对外宣传仅 **Vite Web 主站**（不混 Flutter Web 部署） | ☐ |

---

## 签收

| 角色 | 姓名 | 日期 |
|------|------|------|
| 产品/负责人 | | |
| 技术 | | |

**结论（勾选其一）：**

- [x] **有条件上市** — 内测期，SMTP 已配；完成 C 表冒烟 + B5–B9 后可升 **准予上市**  
- [ ] **准予上市** — A 全过，B/C 无阻塞项  
- [ ] **暂缓** — 说明阻塞项：________________

---

相关文档：[`LAUNCH_CHECKLIST.md`](LAUNCH_CHECKLIST.md) · [`LAUNCH_RUNBOOK.md`](LAUNCH_RUNBOOK.md) · [`POST_LAUNCH_ROADMAP.md`](POST_LAUNCH_ROADMAP.md)
