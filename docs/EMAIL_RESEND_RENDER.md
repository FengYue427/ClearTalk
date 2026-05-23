# Render 发信：Resend（推荐）

> **结论**：163 / QQ 的 SMTP（465、587）在 Render 海外机房常 **`ETIMEDOUT`**，与授权码无关。  
> 在 Render 上请用 **Resend HTTP API**（不走 SMTP 端口）。

---

## 1. 注册 Resend

1. 打开 [resend.com](https://resend.com) 注册
2. **API Keys** → Create → 复制 `re_...` 密钥

---

## 2. Render 环境变量

在 **ClearTalk** API 服务 → **Environment**：

```env
RESEND_API_KEY=re_你的密钥
EMAIL_PROVIDER=resend
EMAIL_FROM=ClearTalk <onboarding@resend.dev>
```

说明：

| 变量 | 说明 |
|------|------|
| `RESEND_API_KEY` | 必填 |
| `EMAIL_PROVIDER` | 设为 `resend`（或只配 `RESEND_API_KEY` 也会自动启用） |
| `EMAIL_FROM` | 未验证域名前可用 `onboarding@resend.dev`；正式请绑定自己的域名 |

**可删除或保留** 原 `EMAIL_HOST` / `EMAIL_PASS`（启用 Resend 后不再走 SMTP）。

保存 → **Save, rebuild, and deploy**。

---

## 3. 验证

Logs 应出现：

```text
[Email] Resend HTTP API 已启用
Email: Enabled (Resend API)
```

`https://cleartalk-cu84.onrender.com/health/ready`：

```json
"emailProvider": "resend",
"emailSmtpVerified": true
```

站上 **验证码登录** → Get Code → 查收件箱。

---

## 4. 免费档限制

- 测试发件人：`onboarding@resend.dev`
- 未验证域名时，收件人可能仅限你在 Resend 注册的邮箱
- 上线前在 Resend 添加并验证自己的域名，再把 `EMAIL_FROM` 改为 `ClearTalk <noreply@你的域名>`

---

## 5. 本地开发

本地仍可用 163 SMTP（`.env` 里不配 `RESEND_API_KEY` 即可）。

---

相关：[`SMTP_163_SETUP.md`](SMTP_163_SETUP.md)（仅适合国内服务器或本机 SMTP 可达时）
