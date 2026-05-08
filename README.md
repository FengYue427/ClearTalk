# ClearTalk - 沟通助手

一个帮助年轻人清晰、得体地表达诉求的工具。聚焦"不知道怎么说"的场景，通过结构化填写 + AI 生成，输出可直接使用的沟通文本。

**🌐 Web 版本**：无需安装，浏览器直接使用  
**🔒 安全代理**：API Key 隐藏在后端，支持 Deepseek / OpenAI / Qwen

---

## 核心功能

- **13 个精选场景**：请假申请、加班调休确认、工资异议、退款申诉、外卖问题、退押金、借款催还等
- **三步骤流程**：填写信息 → 确认缺失 → 生成文本
- **多版本输出**：标准版 / 简短版 / 正式版 / 降火版
- **三语气切换**：温和 / 中立 / 坚定
- **本地存储**：历史记录浏览器本地保存，保护隐私
- **后端代理**：API Key 不暴露，安全可控

---

## 项目结构

```
APP/
├── index.html              # 前端页面入口
├── app.js                  # 前端业务逻辑
├── styles.css              # 样式表
├── backend/                # 后端代理服务
│   ├── server.js           # Express 服务器
│   ├── package.json        # 后端依赖
│   ├── .env.example        # 环境变量示例
│   └── README.md           # 后端部署文档
├── start.bat               # Windows 一键启动脚本
└── README.md               # 本文档
```

---

## 快速开始（5 分钟跑起来）

### 方式 1：一键启动（推荐 Windows 用户）

```bash
# 1. 配置 API Key
copy backend\.env.example backend\.env
notepad backend\.env  # 填入你的 Deepseek API Key

# 2. 双击启动
start.bat
```

### 方式 2：手动启动

**步骤 1：启动后端**
```bash
cd backend

# 安装依赖（首次）
npm install

# 配置环境变量
copy .env.example .env
# 编辑 .env，填入 DEEPSEEK_API_KEY

# 启动服务
npm start
```

后端启动后访问 http://localhost:3000/health 测试。

**步骤 2：打开前端**
```bash
# 方法 A：直接双击打开 index.html（简单）

# 方法 B：使用本地服务器（推荐，避免跨域）
npx http-server -p 8080
# 然后访问 http://localhost:8080
```

---

## 获取 Deepseek API Key

1. 访问 https://platform.deepseek.com/
2. 注册/登录账号
3. 进入 API Keys 页面创建新 Key
4. 复制到 `backend/.env` 文件

**费用参考**：
- deepseek-chat: ¥1/百万 tokens
- 一条生成约消耗 500-1000 tokens
- 即每次成本约 ¥0.0005-0.001（非常便宜）

---

## 安全特性

| 特性 | 说明 |
|------|------|
| API Key 隐藏 | 前端不暴露任何 Key，通过后端代理 |
| CORS 限制 | 只允许特定域名访问 |
| 频率限制 | 每 IP 每 15 分钟最多 30 次请求 |
| 输入检查 | 检测敏感信息（身份证/银行卡/手机号） |
| 内容过滤 | 拦截恶意/违规内容 |
| 日志记录 | 所有请求可追溯 |

---

## 场景模板（13个）

### 职场沟通
- 请假申请、紧急请假、加班调休确认、工资/绩效异议、离职交接确认

### 消费平台
- 退款被拒申诉、货不对板/质量问题、自动续费申诉、外卖漏送/食安问题

### 租房物业
- 退押金沟通、维修推诿沟通

### 人际金钱
- 借款催还、事实说明/误会澄清

---

## 自定义扩展

### 添加新场景

在 `app.js` 中的 `SCENES` 数组添加新场景：

```javascript
{
    id: 'my_scene',
    name: '场景名称',
    category: '分类',
    description: '场景描述',
    fields: [
        { key: 'field1', label: '字段名', type: FIELD_TYPES.TEXT, required: true },
        // ... 更多字段
    ]
}
```

字段类型：`text` | `textarea` | `number` | `select` | `boolean` | `date`

---

## 部署上线

### 后端部署（Vercel 免费）
```bash
cd backend
npm i -g vercel
vercel --prod
```

### 前端部署（静态托管）
- GitHub Pages / Vercel / Netlify / Cloudflare Pages
- 直接上传 `index.html` + `app.js` + `styles.css`

### 生产环境配置
1. 修改 `backend/.env` 中的 `ALLOWED_ORIGINS` 为你的前端域名
2. 设置 `NODE_ENV=production`
3. 可选：提高 `RATE_LIMIT_MAX` 限制

---

## 后续计划

- [x] Web 版本
- [x] 后端代理
- [x] 安全护栏
- [x] PWA 支持（离线可用）
- [x] 云同步与多设备数据互通
- [x] 场景模板市场（分享/热门排行榜）
- [ ] 更多场景模板（扩展至 30+）
- [ ] 用户反馈收集
- [ ] 多 AI 供应商切换
- [ ] 语音输入
- [ ] 截图 OCR

---

## 常见问题

**Q: 为什么需要后端代理？不能直接调 Deepseek API？**  
A: 前端直连会暴露 API Key，任何人都可以盗用。后端代理隐藏 Key，还可以加频率限制和内容过滤。

**Q: 可以用 OpenAI / Claude / 文心一言 吗？**  
A: 可以，修改 `backend/server.js` 中的 `callDeepseek` 函数，换成其他 API 调用即可。

**Q: 历史记录会同步到云端吗？**  
A: 默认保存在浏览器本地存储（localStorage）。登录后可在设置中开启云同步，实现多设备数据互通。

---

## 免责声明

本应用生成的文本仅供参考，不构成法律意见。用户应自行核对事实准确性，并对使用后果负责。

---

Made with ❤️ for better communication.
