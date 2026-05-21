# ClearTalk - 沟通助手

帮助年轻人在「不知道怎么说」的场景下，通过结构化填写 + AI 生成，输出可直接使用的沟通文本。

**主交付线**：Vite 模块化 Web（`src/`）+ 后端 API（`backend/src/server.js`）  
**可选客户端**：Flutter 跨端（`lib/`，Android / iOS / Web / 桌面）

---

## 核心功能

- **35 个内置场景**：职场、消费、租房、人际、日常、维权、教育、医疗、政务等
- **三语气**：温和 / 中立 / 坚定
- **后端 AI 代理**：API Key 不暴露前端，支持 Deepseek / OpenAI
- **用户与云同步**：注册登录、多设备数据合并
- **场景市场**：分享、热门、点赞（需后端）
- **PWA**：离线缓存（Vite PWA 插件）

---

## 项目结构

```
APP/
├── src/                    # Web 前端（Vite，推荐）
│   ├── core/               # 配置、状态、i18n、存储
│   ├── services/           # AI、用户、同步、市场
│   ├── scenes/             # 场景定义（由 JSON 生成）
│   └── ui/                 # 页面与组件
├── assets/scenes/          # 场景单源数据 builtin.json
├── scripts/                # extract-scenes.mjs
├── backend/                # Express API v3
│   └── src/server.js
├── lib/                    # Flutter 客户端
├── legacy/                 # 已归档的旧版 Web（app.js）
├── vercel.json             # Web 部署（输出 dist/）
└── .github/workflows/      # CI
```

---

## 快速开始

### 1. 环境要求

- Node.js >= 18
- （可选）Flutter SDK 3.24+

### 2. 配置后端

```bash
cd backend
copy .env.example .env   # Windows
# 编辑 .env，填入 DEEPSEEK_API_KEY 或 OPENAI_API_KEY、JWT_SECRET
npm install
```

### 3. 启动（推荐一键）

```bash
# 项目根目录
npm install
copy .env.example .env.local   # 可选，默认走 Vite 代理到 localhost:3000
start.bat                      # 或: npm run dev:all
```

- 前端：http://localhost:8080  
- 后端：http://localhost:3000/health  

### 4. 仅启动前端 / 后端

```bash
npm run dev              # 仅 Vite
npm run dev:backend      # 仅 API
```

---

## 场景模板维护

场景数据以 **`assets/scenes/builtin.json`** 为单源（可从 `legacy/app.js` 重新提取）：

```bash
npm run scenes:build     # 生成 src/scenes/builtin-data.js
```

修改 JSON 后执行上述命令，再提交 `builtin.json` 与 `builtin-data.js`。

---

## 构建与测试

```bash
npm run build            # 输出 dist/
npm test                 # Vitest 场景单测
npm run lint
```

Flutter：

```bash
flutter pub get
flutter run
flutter build web
```

---

## 部署

| 组件 | 平台 | 说明 |
|------|------|------|
| Web | Vercel | `npm run build`，`dist/`，见 `vercel.json` |
| API | Render | `backend/`，见 `DEPLOY.md` |
| Flutter Web | Vercel / GH Actions | `flutter build web` → `build/web`（可选） |

生产环境请设置：

- 前端：`VITE_API_URL=https://your-api.onrender.com`
- 后端：`ALLOWED_ORIGINS=https://your-web.vercel.app`

**上市前**：`npm run launch:verify` → [docs/LAUNCH_CHECKLIST.md](docs/LAUNCH_CHECKLIST.md) · [docs/LAUNCH_RUNBOOK.md](docs/LAUNCH_RUNBOOK.md)

---

## 场景同步命令

```bash
npm run scenes:build      # Web: JSON → src/scenes/builtin-data.js
npm run scenes:flutter    # Flutter: JSON → lib/templates/builtin_scenes.dart
```

## 路线图

- [x] Vite 模块化 Web
- [x] 35 场景单源化（Web + Flutter 脚本同步）
- [x] 后端 v3 API + 敏感信息脱敏
- [x] 流式生成（SSE）+ 多模型（Deepseek / OpenAI / Qwen）
- [x] Flutter ProxyAiService 走后端代理
- [x] CI（Web + Backend + Flutter）
- [x] 分享卡片（Canvas + 二维码）
- [x] 粘贴消息 → 场景推荐
- [x] 生成结果 👍/👎 反馈（本地 + 服务端 API）
- [x] 健康检查 `/health/ready` 与生产启动校验
- [x] E2E 测试（Playwright）
- [x] 生产配置守卫（`npm run check:production`）
- [x] SQLite + 配额 + AI 粘贴分类 + 上市 Runbook（S3–S6）

详细排期见 [docs/ROADMAP.md](docs/ROADMAP.md)。

---

## 免责声明

生成文本仅供参考，不构成法律意见。请自行核对事实并对使用后果负责。
