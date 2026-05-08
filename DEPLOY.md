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
   JWT_SECRET=your-random-secret-key
   DEEPSEEK_API_KEY=your-deepseek-key (可选)
   OPENAI_API_KEY=your-openai-key (可选)
   ALLOWED_ORIGINS=https://your-frontend.vercel.app
   ```
6. 点击 **Create Web Service**
7. 记录分配的域名：`https://cleartalk-api.onrender.com`

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
│   ├── data/              # SQLite 数据库
│   └── package.json
├── vercel.json            # Vercel 配置
├── DEPLOY.md              # 本文件
└── README.md
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
- `POST /api/ai/generate` - AI 文本生成

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
