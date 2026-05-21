# ClearTalk 部署指南

## 🚀 快速部署（推荐）

### 1. 部署后端（Render - 免费）

1. 访问 [render.com](https://render.com) 注册账号
2. 点击 **New +** → **Web Service**
3. 连接 GitHub 仓库或手动上传
4. 配置：
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. 添加环境变量：
   ```
   NODE_ENV=production
   JWT_SECRET=your-random-secret-key
   DEEPSEEK_API_KEY=your-deepseek-key
   OPENAI_API_KEY=your-openai-key (可选)
   QWEN_API_KEY=your-qwen-key (可选)
   ALLOWED_ORIGINS=https://your-frontend.vercel.app
   FEEDBACK_ADMIN_KEY=random-admin-key-for-stats
   SQLITE_PATH=/opt/render/project/src/data/cleartalk.db
   FREE_DAILY_GENERATIONS=20
   PRO_DAILY_GENERATIONS=200
   ```
6. **健康检查路径**（Render Health Check Path）：`/health/ready`
7. 点击 **Create Web Service**
8. 记录分配的域名：`https://cleartalk-api.onrender.com`

### 2. 部署前端（Vercel - 免费）

1. 访问 [vercel.com](https://vercel.com) 注册账号
2. 导入 GitHub 仓库
3. 配置：
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. 添加环境变量：
   ```
   VITE_API_URL=https://cleartalk-api.onrender.com
   ```
5. 点击 **Deploy**
6. 前端域名：`https://cleartalk.vercel.app`

### 3. 更新后端 CORS

在 Render Dashboard 更新环境变量：
```
ALLOWED_ORIGINS=https://cleartalk.vercel.app,http://localhost:8080
```

然后 **Manual Deploy** → **Deploy Latest Reference**

---

## 📁 项目结构

```
cleartalk/
├── src/                    # 前端源码
│   ├── ui/pages/          # 页面组件
│   ├── services/          # API 服务
│   ├── core/              # 核心模块
│   └── ...
├── backend/                # 后端源码
│   ├── src/server.js      # 主服务器
│   ├── data/              # cleartalk.db（SQLite）或 db.json（回退）
│   └── package.json
├── vercel.json            # Vercel 配置
├── DEPLOY.md              # 本文件
└── README.md
```

---

## 🚀 上市前预检

```bash
npm run launch:verify
```

详见 `docs/LAUNCH_CHECKLIST.md` 与 `docs/LAUNCH_RUNBOOK.md`。运营看板：部署后访问 `/admin.html`。

## 🧪 测试

```bash
# 单元测试
npm test

# E2E（需先 build，自动启动 preview）
npm run build
npm run test:e2e

# 生产配置守卫（CI 同款）
npm run check:production
```

---

## 🔧 本地开发

### 前端
```bash
cd /path/to/APP
npm install
npm run dev          # http://localhost:8080
```

### 后端
```bash
cd /path/to/APP/backend
npm install
npm run dev          # http://localhost:3000
```

### 环境变量

**前端** `.env.local`:
```
VITE_API_URL=http://localhost:3000
```

**后端** `.env`:
```
PORT=3000
JWT_SECRET=your-secret-key
DEEPSEEK_API_KEY=your-key
OPENAI_API_KEY=your-key
ALLOWED_ORIGINS=http://localhost:8080
```

---

## 🌐 API 端点

### 认证
- `POST /api/auth/register` - 注册
- `POST /api/auth/login` - 登录
- `GET /api/auth/verify` - 验证 Token

### 用户
- `PUT /api/user/profile` - 更新资料
- `PUT /api/user/password` - 修改密码
- `POST /api/user/delete` - 删除账号

### 云同步
- `POST /api/sync/upload` - 上传数据
- `GET /api/sync/download` - 下载数据
- `DELETE /api/sync/clear` - 清空数据

### 场景市场
- `GET /api/scenes/hot` - 热门场景
- `GET /api/scenes/latest` - 最新场景
- `GET /api/scenes/my` - 我的场景
- `POST /api/scenes/share` - 分享场景
- `POST /api/scenes/:id/like` - 点赞
- `POST /api/scenes/:id/use` - 使用计数
- `DELETE /api/scenes/:id` - 删除场景

### AI 生成
- `POST /api/ai/generate` - AI 文本生成（计配额）
- `POST /api/ai/generate-stream` - SSE 流式生成（计配额）
- `POST /api/ai/classify-paste` - 粘贴场景分类

### 配额
- `GET /api/quota` - 今日剩余次数（可选登录）

### 埋点
- `POST /api/events` - 行为埋点
- `GET /api/events/stats` - 统计（`X-Admin-Key`）

### 反馈
- `POST /api/feedback` - 提交用户反馈（可选登录）
- `GET /api/feedback/stats` - 统计（需请求头 `X-Admin-Key: FEEDBACK_ADMIN_KEY`）

### 健康检查
- `GET /health` - 服务状态与配置检查
- `GET /health/ready` - 就绪探活（生产未配置 AI Key 时 503）

---

## 线上主站说明

| 产物 | 部署目标 | 说明 |
|------|----------|------|
| **Vite `dist/`** | Vercel（推荐） | 主 Web 应用，`vercel.json` 已配置 |
| Flutter `build/web` | 可选 | `.github/workflows/deploy-web.yml`，与主站二选一 |

---

## 💰 费用估算

| 服务 | 费用 | 说明 |
|------|------|------|
| Vercel 前端 | 免费 | 个人项目无限带宽 |
| Render 后端 | 免费 | 750小时/月，自动休眠 |
| DeepSeek API | 按量 | 约 ¥0.002/千字符 |
| OpenAI API | 按量 | GPT-5.5 Mini 约 $0.15/1M tokens |

**总成本：免费 ~ 每月几元**

---

## 🆘 故障排除

### CORS 错误
检查后端 `ALLOWED_ORIGINS` 是否包含前端域名

### 数据库错误
确保 Render Disk 已挂载到 `/opt/render/project/src/data`

### 前端无法连接后端
检查 `VITE_API_URL` 环境变量是否正确

---

## 📱 PWA 配置

部署后自动支持：
- 离线访问（Service Worker）
- 添加到主屏幕
- 响应式布局
