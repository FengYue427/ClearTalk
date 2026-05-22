# Render 环境变量速查（ClearTalk API）

> 服务示例：`https://cleartalk-cu84.onrender.com`  
> 在 Render → **ClearTalk** → **Environment** 添加后 **Save Changes**，再 **Manual Deploy**。

## 必填（否则无法启动）

| Key | 示例 | 说明 |
|-----|------|------|
| `NODE_ENV` | `production` | |
| `JWT_SECRET` | `paste-a-long-random-string-here-32chars+` | 自行生成，**不要**留空或使用文档默认值 |

生成随机串（本机 PowerShell）：

```powershell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }))
```

## AI 生成（至少填一个）

| Key | 说明 |
|-----|------|
| `DEEPSEEK_API_KEY` | 推荐，与默认模型一致 |
| `OPENAI_API_KEY` | 可选 |
| `QWEN_API_KEY` | 可选 |

## 前后端联通

| Key | 值 |
|-----|-----|
| `ALLOWED_ORIGINS` | `https://你的-vercel域名.vercel.app,http://localhost:5173` |
| `FRONTEND_URL` | `https://你的-vercel域名.vercel.app` |

## 数据持久化（Disk 已挂载时）

| Key | 值 |
|-----|-----|
| `SQLITE_PATH` | `/opt/render/project/src/data/cleartalk.db` |

Disk **Mount Path** 须为：`/opt/render/project/src/data`

## 可选

| Key | 值 |
|-----|-----|
| `FEEDBACK_ADMIN_KEY` | 随机串，供 `/admin.html` 统计 |
| `FREE_DAILY_GENERATIONS` | `20` |
| `EMAIL_HOST` / `EMAIL_USER` / `EMAIL_PASS` | 正式发验证码邮件 |

## 验证

部署 **Live** 后访问：

`https://cleartalk-cu84.onrender.com/health/ready`

应返回 JSON，`"status":"ok"`（需已配置至少一个 AI Key；否则可能 503）。
