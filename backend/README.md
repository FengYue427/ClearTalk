# ClearTalk AI Proxy Server

安全的 Deepseek API 代理服务，隐藏 API Key，添加基础防护。

## 快速开始

### 1. 安装依赖

```bash
cd backend
npm install
```

### 2. 配置环境变量

```bash
# 复制示例文件
copy .env.example .env

# 编辑 .env，填入你的 Deepseek API Key
DEEPSEEK_API_KEY=your_api_key_here
```

### 3. 启动服务

```bash
# 开发模式（自动重启）
npm run dev

# 生产模式
npm start
```

服务启动后，访问 http://localhost:3000/health 测试。

## API 接口

### POST /api/generate
生成沟通文本

**请求体：**
```json
{
    "scene": {
        "name": "请假申请",
        "fields": [...]
    },
    "values": {
        "recipient": "王经理",
        "leaveType": "事假",
        ...
    },
    "tone": "neutral",
    "version": "standard"
}
```

**响应：**
```json
{
    "success": true,
    "text": "生成的文本内容...",
    "meta": {
        "scene": "请假申请",
        "tone": "neutral",
        "version": "standard",
        "timestamp": "2024-01-15T10:30:00.000Z"
    }
}
```

### POST /api/rewrite
改写语气

**请求体：**
```json
{
    "text": "原文本...",
    "tone": "soft"
}
```

### GET /health
健康检查

## 安全特性

- **API Key 隐藏**：前端不暴露任何 Key
- **CORS 限制**：只允许特定域名访问
- **频率限制**：每 IP 每 15 分钟最多 30 次请求
- **输入检查**：检测敏感信息和违规内容
- **日志记录**：所有请求可追溯

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DEEPSEEK_API_KEY` | Deepseek API Key | 必填 |
| `PORT` | 服务器端口 | 3000 |
| `ALLOWED_ORIGINS` | 允许的域名 | localhost:8080 |
| `RATE_LIMIT_MAX` | 频率限制（每15分钟） | 30 |
| `NODE_ENV` | 运行环境 | development |

## 部署

### 本地开发
```bash
npm run dev
```

### 生产部署（Vercel）
```bash
# 安装 Vercel CLI
npm i -g vercel

# 部署
vercel --prod
```

### 生产部署（Railway/Render）
1. 推送代码到 GitHub
2. 在 Railway/Render 导入项目
3. 设置环境变量
4. 自动部署

## 获取 Deepseek API Key

1. 访问 https://platform.deepseek.com/
2. 注册/登录账号
3. 进入 API Keys 页面
4. 创建新 Key
5. 复制到 .env 文件

**定价参考**：
- deepseek-chat: ¥1/百万 tokens（输入）
- 一条生成约消耗 500-1000 tokens
- 即每次生成成本约 ¥0.0005-0.001

## 故障排查

### 启动报错 "未配置 DEEPSEEK_API_KEY"
- 确认 .env 文件存在且包含有效 Key
- 确认 Key 没有多余的空格或换行

### CORS 错误
- 检查前端访问的域名是否在 ALLOWED_ORIGINS 中
- 开发时设置为 `*` 允许所有域名

### 频率限制触发
- 检查 RATE_LIMIT_MAX 设置
- 生产环境可适当提高限制

## 后续优化建议

1. **添加缓存**：相同输入直接返回缓存结果，节省 API 费用
2. **多模型支持**：根据场景自动选择最优模型
3. **用户认证**：添加简单 token 验证，防止滥用
4. **用量统计**：记录每日生成次数，监控成本
