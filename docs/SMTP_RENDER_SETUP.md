# Render SMTP 配置指南（B 档必做）

> 配好后 `/health/ready` 里 `checks.email` 应为 `true`；验证码/重置密码不再走「开发模式」回传。

**Render 路径**：你的 API 服务 → **Environment** → Add → **Save Changes** → **Manual Deploy**

---

## 1. 环境变量（通用）

| 变量 | 说明 | 示例 |
|------|------|------|
| `EMAIL_HOST` | SMTP 服务器 | `smtp.qq.com` |
| `EMAIL_PORT` | 端口 | `587`（TLS）或 `465`（SSL） |
| `EMAIL_USER` | 登录账号 | 发件邮箱 |
| `EMAIL_PASS` | **授权码 / App Password**（不是网页登录密码） | 16 位授权码 |
| `EMAIL_FROM` | 发件人显示 | `ClearTalk <you@qq.com>` |
| `FRONTEND_URL` | 重置密码链接用 | `https://clear-talk-five.vercel.app` |

**勿设** `ALLOW_DEV_EMAIL_PREVIEW=1`（生产会泄露验证码）。

---

## 2. 按邮箱服务商复制

### QQ 邮箱（国内常用）

1. 登录 [mail.qq.com](https://mail.qq.com) → 设置 → 账户 → 开启 **SMTP** → 生成 **授权码**
2. Render 填写：

```
EMAIL_HOST=smtp.qq.com
EMAIL_PORT=587
EMAIL_USER=你的QQ号@qq.com
EMAIL_PASS=授权码
EMAIL_FROM=ClearTalk <你的QQ号@qq.com>
```

### 163 邮箱

**逐步说明（推荐）**：[`SMTP_163_SETUP.md`](SMTP_163_SETUP.md)

```
EMAIL_HOST=smtp.163.com
EMAIL_PORT=465
EMAIL_USER=xxx@163.com
EMAIL_PASS=客户端授权码
EMAIL_FROM=ClearTalk <xxx@163.com>
```

### Gmail（需 App Password + 2FA）

```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=you@gmail.com
EMAIL_PASS=16位应用专用密码
EMAIL_FROM=ClearTalk <you@gmail.com>
```

### SendGrid

```
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASS=SG.xxxxx（API Key）
EMAIL_FROM=ClearTalk <verified@yourdomain.com>
```

### Resend（SMTP）

```
EMAIL_HOST=smtp.resend.com
EMAIL_PORT=587
EMAIL_USER=resend
EMAIL_PASS=re_xxxx（API Key）
EMAIL_FROM=ClearTalk <onboarding@resend.dev>
```

（Resend 免费档需用其提供的验证域名或绑定自己的域名。）

---

## 3. 部署后验证

### 3.1 健康检查

浏览器或终端：

```bash
curl https://cleartalk-cu84.onrender.com/health/ready
```

期望 JSON 含：

```json
"checks": { "email": true, ... }
```

### 3.2 发验证码（真实邮件）

1. 打开 https://clear-talk-five.vercel.app → 用户 → 验证码登录  
2. 输入你的邮箱 → 发送验证码  
3. **成功**：收到邮件，API 响应**不含** `code` 字段  
4. **失败**：503「邮件服务暂未开通」→ 检查 Render 环境变量与 Manual Deploy

### 3.3 密码重置

用户 → 忘记密码 → 收邮件 → 链接应指向  
`https://clear-talk-five.vercel.app/?token=...&email=...`（与 `FRONTEND_URL` 一致）

---

## 4. 常见问题

| 现象 | 处理 |
|------|------|
| `email: false` | 缺 `EMAIL_HOST/USER/PASS` 任一；Redeploy |
| 535 Authentication failed | 用了登录密码而非授权码 |
| 163 连接超时 | 试 `465` + SSL，或换 587 |
| 邮件进垃圾箱 | `EMAIL_FROM` 用真实域名；后续绑自定义域名 |
| Render 仍休眠 | 首次请求等 ~50s；或升级付费计划 |

---

## 5. 内测期临时方案（不推荐对外）

未配 SMTP 时：

- **密码注册/登录**仍可用  
- 验证码接口返回 503 或（若误开预览）JSON 含 `code` — **仅内测、勿公开推广**

配好 SMTP 后再发 [`BETA_INVITE.md`](BETA_INVITE.md)。
