# S7 运维操作指南（需你本人在浏览器完成）

> 代码侧 S7 已完成：用户 API、生产邮箱安全、重置链接、CI `launch:verify`。  
> 下列步骤无法在仓库内代劳，请按顺序操作。

---

## ⚠️ 常见误配（你当前截图）

若 Build Logs 里是 **`npm install; npm run build`**（在装 Vite 前端），说明 **Root Directory 没设为 `backend`**，API 会部署失败或跑错项目。

**请立刻在 Render → Settings 改为：**

| 项 | 正确值 | 错误示例 |
|----|--------|----------|
| **Root Directory** | `backend` | （留空 = 仓库根目录） |
| **Build Command** | `npm install` | `npm install; npm run build` |
| **Start Command** | `npm start` | 其它 |
| **Health Check Path** | `/health/ready` | |

改完后 **Manual Deploy → Deploy latest commit**。  
你的 API 地址示例：`https://cleartalk-cu84.onrender.com`（以 Render 显示的 URL 为准）。

---

## 第一步：部署 Render API（约 20 分钟）

1. 打开 [https://dashboard.render.com](https://dashboard.render.com) → **New +** → **Web Service**
2. 连接 GitHub 仓库 **FengYue427/ClearTalk**
3. 配置：

| 项 | 值 |
|----|-----|
| Name | `cleartalk-api`（或 `ClearTalk`，记下域名） |
| **Root Directory** | **`backend`**（必填） |
| Runtime | Node |
| Build Command | `npm install`（仅安装后端依赖，不要 `npm run build`） |
| Start Command | `npm start` |
| Health Check Path | `/health/ready` |

4. **Disk**（必做，否则用户数据重启丢失）：
   - Add Disk → 1 GB
   - Mount Path: `/opt/render/project/src/data`

5. **Environment Variables**（Environment → Add）：

| 变量 | 值 | 说明 |
|------|-----|------|
| `NODE_ENV` | `production` | |
| `JWT_SECRET` | 随机 32+ 字符 | 勿用默认值 |
| `DEEPSEEK_API_KEY` | 你的 Key | 或 `OPENAI_API_KEY` / `QWEN_API_KEY` 至少一个 |
| `ALLOWED_ORIGINS` | `https://你的-vercel域名.vercel.app` | 多个用英文逗号 |
| `SQLITE_PATH` | `/opt/render/project/src/data/cleartalk.db` | |
| `FRONTEND_URL` | `https://你的-vercel域名.vercel.app` | 密码重置邮件链接 |
| `FEEDBACK_ADMIN_KEY` | 随机字符串 | 管理看板用 |
| `FREE_DAILY_GENERATIONS` | `20` | 可选 |
| `PRO_DAILY_GENERATIONS` | `200` | 可选 |

6. **SMTP（正式对外强烈建议）**：

| 变量 | 示例 |
|------|------|
| `EMAIL_HOST` | `smtp.qq.com` |
| `EMAIL_PORT` | `587` |
| `EMAIL_USER` | 发件邮箱 |
| `EMAIL_PASS` | 授权码（非登录密码） |
| `EMAIL_FROM` | 显示名称 `<you@qq.com>` |

7. 点击 **Create Web Service**，等待 Deploy 成功。

8. 验证：浏览器打开  
   `https://<你的服务名>.onrender.com/health/ready`  
   应返回 JSON 且 `"status":"ok"`（不是 404/503）。

记下 API 根地址，例如：`https://cleartalk-cu84.onrender.com`（你当前服务）

**Free 计划**：闲置后会休眠，首次请求可能等 50 秒，属正常现象。

---

## 第二步：配置 Vercel 前端（约 5 分钟）

1. [Vercel Dashboard](https://vercel.com) → 项目 **clear-talk** → **Settings** → **Environment Variables**
2. 添加（Production）：

| Name | Value |
|------|--------|
| `VITE_API_URL` | `https://cleartalk-cu84.onrender.com`（换成你 Render 显示的 URL，无末尾 `/`） |

3. **Settings → Build** 确认：
   - Build Command: `npm run vercel-build` 或 Use `vercel.json`
   - Output: `dist`

4. **Deployments** → 最新一条 → **Redeploy**（让环境变量生效）

5. 打开 **Visit** 链接，确认：
   - 首页有「粘贴分析」+ 场景列表
   - 设置里切换 English 正常

---

## 第三步：闭环 CORS（约 2 分钟）

1. 回到 Render → 你的 API 服务 → **Environment**
2. 确认 `ALLOWED_ORIGINS` 包含 Vercel 的完整 URL，例如：  
   `https://clear-talk-xxx.vercel.app,http://localhost:5173`
3. **Manual Deploy** → Deploy latest commit

---

## 第四步：生产冒烟（约 15 分钟）

对照 [`LAUNCH_SIGNOFF.md`](LAUNCH_SIGNOFF.md) **B 表 + C 表** 逐项打勾。

快速清单：

- [ ] 注册 / 登录（密码或验证码；未配 SMTP 时验证码接口会 503，可用密码注册）
- [ ] 选「请假申请」→ 填表 → 生成
- [ ] 设置里看配额
- [ ] `#/scene/leave_request` 深链
- [ ] `/admin.html` 输入 `FEEDBACK_ADMIN_KEY` 看统计
- [ ] `/privacy.html` 可打开

---

## 第五步：签收

填完 [`LAUNCH_SIGNOFF.md`](LAUNCH_SIGNOFF.md) 后，即可视为 **S7 运维闭环完成**。

---

## 常见问题

| 现象 | 处理 |
|------|------|
| 前端 CORS 报错 | 检查 Render `ALLOWED_ORIGINS` 是否含 Vercel 域名 |
| 生成 429 | 配额用尽；调 `FREE_DAILY_GENERATIONS` 或登录 Pro 白名单 |
| 验证码 503 | 未配 SMTP；配好 `EMAIL_*` 后 Redeploy API |
| `/health/ready` 503 | 未配置任何 AI Key |
| 重置密码链接无效 | 确认 `FRONTEND_URL` 与 Vercel 访问域名一致 |

---

## Flutter App（可选）

构建时传入 API 地址：

```bash
flutter run --dart-define=CLEARTALK_API_URL=https://你的-api.onrender.com
```

或在 App 内写入 SharedPreferences 键 `cleartalk_api_base_url`（与 `UserService` 一致）。
