# P0 生产验证日志

> 自动/半自动检查结果。人工项请在 [`LAUNCH_SIGNOFF.md`](LAUNCH_SIGNOFF.md) 勾选。

## 2026-05-22

| 检查项 | 结果 | 证据 |
|--------|------|------|
| `npm run launch:verify` | ✅ 全绿 | 本地 CI 等价预检 |
| Render `/health/ready` | ✅ `status: ok` | `jwt: true`, `ai.ready: true`, `email: false` |
| CORS + 注册 | ✅ HTTP 200 | `POST /api/auth/register` + `Origin: clear-talk-five.vercel.app` |
| Vercel 首页 EN 场景 | ✅ | 35 场景含 Package Delivery Issue、Leave Request 等 |
| `/privacy.html` | ✅ | HTTP 200 |
| `npm run smoke:production` | ✅ | API 注册 CORS、core 含 Leave Request / Package Delivery Issue |
| SMTP | ⚠️ 未配 | `checks.email: false` — **A 档可过，B 档必配** |
| 英文表单零汉字 | ✅（代码） | `121971a9`：`scenes:build` EN 词典 0 CJK |

**代码基线**：`main` @ `121971a9`

### 待你本机 5 分钟人工项（C 表）

- [ ] 设置 → English → 打开 `package_issue`：字段标签/下拉均为英文
- [ ] 填表 → 生成一段文本（proxy）
- [ ] 切换简短/正式版
- [ ] 有帮助反馈 Toast
- [ ] `#/scene/leave_request` 深链
- [ ] `/admin.html` + `FEEDBACK_ADMIN_KEY`

### 下一档（B 软启动）

见 [`SOFT_LAUNCH_CHECKLIST.md`](SOFT_LAUNCH_CHECKLIST.md)
