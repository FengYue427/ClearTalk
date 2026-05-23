# 163 邮箱 → Render SMTP（ClearTalk）

> 在 [163 邮箱网页版](https://mail.163.com) 开启 SMTP 并获取 **客户端授权密码**（不是登录密码）。

---

## 1. 163 邮箱侧（约 5 分钟）

1. 登录 **163 邮箱** → **设置** → **POP3/SMTP/IMAP**
2. 开启 **SMTP 服务** / **IMAP/SMTP 服务**
3. 按提示完成验证，生成 **授权码**（16 位，形如 `ABCDEFGHIJKLMNOP`）
4. 记下你的完整邮箱，例如：`cleartalk@163.com`

若找不到入口：设置 → 账户 → **客户端授权密码** / **开启 SMTP**。

---

## 2. Render 环境变量（复制到 Environment）

在 **Render** → `cleartalk-api`（或你的 API 服务）→ **Environment** → 添加/修改：

```env
EMAIL_HOST=smtp.163.com
EMAIL_PORT=465
EMAIL_USER=你的邮箱@163.com
EMAIL_PASS=你的163授权码
EMAIL_FROM=ClearTalk <你的邮箱@163.com>
FRONTEND_URL=https://clear-talk-five.vercel.app
```

说明：

| 变量 | 值 |
|------|-----|
| `EMAIL_PORT` | **465**（SSL，与代码 `secure: true` 一致；163 推荐） |
| `EMAIL_PASS` | **授权码**，不是 163 登录密码 |
| `EMAIL_FROM` | 建议带显示名，且地址与 `EMAIL_USER` 一致 |
| `FRONTEND_URL` | 无末尾 `/`，用于重置密码链接 |

**不要**设置 `ALLOW_DEV_EMAIL_PREVIEW=1`（生产会泄露验证码）。

保存后：**Manual Deploy → Deploy latest commit**。

---

## 3. 若 465 失败，试 587

少数网络环境下可改用 STARTTLS：

```env
EMAIL_HOST=smtp.163.com
EMAIL_PORT=587
EMAIL_USER=你的邮箱@163.com
EMAIL_PASS=你的163授权码
EMAIL_FROM=ClearTalk <你的邮箱@163.com
```

Redeploy 后再测。

---

## 4. 验证

### 命令行

```bash
npm run verify:production
```

期望：`email (SMTP): true`

或浏览器打开：

`https://cleartalk-cu84.onrender.com/health/ready`

JSON 中 `"checks": { "email": true }`

### 网站

1. https://clear-talk-five.vercel.app → 用户 → **验证码登录**
2. 填你的 163 邮箱 → 发送验证码
3. 收件箱（或垃圾箱）收到 6 位码；API 响应里 **不应** 出现 `"code"` 字段

### 重置密码

忘记密码 → 收邮件 → 链接域名应为 `clear-talk-five.vercel.app`

---

## 5. 常见错误

| 错误 | 处理 |
|------|------|
| 535 / Authentication failed | 用了登录密码；改 **授权码**；授权码泄露后需在 163 **重新生成** 并更新 Render `EMAIL_PASS` |
| API 500 / 验证码发送失败 | Render **Logs** 搜 `[Email] SMTP 连接验证失败` 或 `EAUTH`；先修 SMTP 再 Deploy |
| `email: true` 但收不到信 | `checks.email` 只表示变量已配；看 `emailSmtpVerified` 或日志是否验证成功 |
| Connection timeout | 确认 `465`；或换 `587` + Redeploy |
| 发送成功但进垃圾箱 | 正常；内测可提示用户看垃圾箱 |
| `email: false` | 缺变量或未 Redeploy；看 Render 日志 `[Email]` |

---

## 6. 内测

SMTP 通过后，发 [`BETA_INVITE.md`](BETA_INVITE.md)，并在 [`LAUNCH_SIGNOFF.md`](LAUNCH_SIGNOFF.md) 勾选 **B10**。
