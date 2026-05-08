/**
 * ClearTalk AI Proxy Server
 * 安全代理 Deepseek API，隐藏 API Key，添加基础防护
 */

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== 配置 ====================

// 允许的域名
const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:8080', 'http://127.0.0.1:8080'];

// CORS 配置
const corsOptions = {
    origin: function (origin, callback) {
        // 允许：
        // 1. 无来源的请求（curl、Postman）
        // 2. origin 为 null（直接打开文件）
        // 3. 配置的允许域名
        // 4. 通配符 *
        if (!origin || 
            origin === 'null' || 
            allowedOrigins.includes(origin) || 
            allowedOrigins.includes('*')) {
            callback(null, true);
        } else {
            console.warn(`[CORS] 拒绝来源: ${origin}`);
            callback(new Error('CORS 策略拒绝'));
        }
    },
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

// 频率限制配置
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 分钟
    max: parseInt(process.env.RATE_LIMIT_MAX) || 30, // 每 IP 限制
    message: {
        error: '请求过于频繁，请 15 分钟后再试',
        retryAfter: 15 * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        console.warn(`[RateLimit] IP ${req.ip} 触发频率限制`);
        res.status(429).json({
            error: '请求过于频繁，请稍后再试',
            retryAfter: '15分钟'
        });
    }
});

// ==================== 中间件 ====================

app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(limiter);

// 请求日志
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path} - IP: ${req.ip}`);
    next();
});

// ==================== 安全检测 ====================

// 敏感信息检测（身份证号、银行卡、手机号）
const SENSITIVE_PATTERNS = [
    { pattern: /\b\d{17}[\dXx]\b/, name: '身份证号', type: 'id_card' },
    { pattern: /\b\d{16,19}\b/, name: '银行卡号', type: 'bank_card' },
    { pattern: /\b1[3-9]\d{9}\b/, name: '手机号', type: 'phone' },
];

function detectSensitiveInfo(text) {
    const detected = [];
    for (const item of SENSITIVE_PATTERNS) {
        if (item.pattern.test(text)) {
            detected.push(item);
        }
    }
    return detected;
}

// 恶意内容检测（简单关键词）
const BLOCKED_KEYWORDS = [
    '黑社会', '杀人', '爆炸', '恐怖主义', '毒品', '枪支', 
    '自杀', '自残', '骗局教学', '诈骗技巧'
];

function checkBlockedContent(text) {
    const lowerText = text.toLowerCase();
    for (const keyword of BLOCKED_KEYWORDS) {
        if (lowerText.includes(keyword)) {
            return keyword;
        }
    }
    return null;
}

// ==================== API 路由 ====================

// 健康检查
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        service: 'cleartalk-proxy',
        timestamp: new Date().toISOString()
    });
});

// 生成文本
app.post('/api/generate', async (req, res) => {
    try {
        const { scene, values, tone, version } = req.body;
        
        // 参数验证
        if (!scene || !values || !tone) {
            return res.status(400).json({ error: '缺少必要参数' });
        }
        
        // 安全检查：检测敏感信息
        const inputText = JSON.stringify(values);
        const sensitive = detectSensitiveInfo(inputText);
        if (sensitive.length > 0) {
            console.warn(`[Security] 检测到敏感信息: ${sensitive.map(s => s.name).join(', ')}`);
            // 不阻止，但记录日志
        }
        
        // 安全检查：恶意内容
        const blocked = checkBlockedContent(inputText);
        if (blocked) {
            console.error(`[Security] 检测到违规内容: ${blocked}`);
            return res.status(400).json({ 
                error: '输入内容包含不当信息，请修改后重试',
                code: 'BLOCKED_CONTENT'
            });
        }
        
        // 构建 Prompt
        const prompt = buildPrompt(scene, values, tone, version);
        
        // 调用 Deepseek API
        const response = await callDeepseek(prompt);
        
        console.log(`[Success] 为场景 "${scene.name}" 生成文本，长度: ${response.length}`);
        
        res.json({ 
            success: true,
            text: response,
            meta: {
                scene: scene.name,
                tone: tone,
                version: version || 'standard',
                timestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('[Error] 生成失败:', error.message);
        res.status(500).json({ 
            error: '生成失败，请稍后重试',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// 流式生成文本
app.post('/api/generate-stream', async (req, res) => {
    try {
        const { scene, values, tone, version } = req.body;
        
        if (!scene || !values || !tone) {
            return res.status(400).json({ error: '缺少必要参数' });
        }
        
        const prompt = buildPrompt(scene, values, tone, version);
        
        // 设置 SSE 头
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        const apiKey = process.env.DEEPSEEK_API_KEY;
        if (!apiKey) {
            res.write(`data: ${JSON.stringify({ error: '未配置 API Key' })}\n\n`);
            res.end();
            return;
        }
        
        // 调用 Deepseek 流式 API
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    {
                        role: 'system',
                        content: '你是一个专业的沟通助手，帮助用户清晰、得体地表达诉求。你只基于用户提供的事实生成文本，从不编造信息。'
                    },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 1000,
                stream: true
            })
        });
        
        if (!response.ok) {
            const error = await response.text();
            res.write(`data: ${JSON.stringify({ error: `API 错误: ${response.status}` })}\n\n`);
            res.end();
            return;
        }
        
        // 处理流式响应
        const reader = response.body;
        reader.on('data', (chunk) => {
            const lines = chunk.toString().split('\n');
            for (const line of lines) {
                if (line.trim().startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') {
                        res.write('data: [DONE]\n\n');
                        res.end();
                        return;
                    }
                    try {
                        const parsed = JSON.parse(data);
                        const content = parsed.choices?.[0]?.delta?.content || '';
                        if (content) {
                            res.write(`data: ${JSON.stringify({ content })}\n\n`);
                        }
                    } catch (e) {
                        // 忽略解析错误
                    }
                }
            }
        });
        
        reader.on('end', () => {
            res.write('data: [DONE]\n\n');
            res.end();
        });
        
        reader.on('error', (err) => {
            console.error('[Stream Error]', err);
            res.write(`data: ${JSON.stringify({ error: '流式传输中断' })}\n\n`);
            res.end();
        });
        
    } catch (error) {
        console.error('[Error] 流式生成失败:', error.message);
        res.write(`data: ${JSON.stringify({ error: '生成失败' })}\n\n`);
        res.end();
    }
});

// 改写语气
app.post('/api/rewrite', async (req, res) => {
    try {
        const { text, tone } = req.body;
        
        if (!text || !tone) {
            return res.status(400).json({ error: '缺少必要参数' });
        }
        
        const prompt = `请将以下文本按照"${TONES[tone]?.promptModifier || '客观清晰的语气'}"改写，保持原意不变：\n\n原文本：\n${text}\n\n要求：\n1. 只输出改写后的文本，不要解释\n2. 保持事实准确，不要添加不存在的内容\n3. 保持原意和核心诉求不变\n\n改写后文本：`;
        
        const response = await callDeepseek(prompt);
        
        res.json({ 
            success: true,
            text: response,
            meta: {
                tone: tone,
                timestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('[Error] 改写失败:', error.message);
        res.status(500).json({ 
            error: '改写失败，请稍后重试',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// ==================== Deepseek API 调用 ====================

const TONES = {
    soft: { promptModifier: '使用温和、礼貌的语气，表达诉求时给对方留有余地，避免咄咄逼人' },
    neutral: { promptModifier: '使用客观、清晰的语气，事实陈述准确，诉求明确但不过激' },
    firm: { promptModifier: '使用坚定、有力的语气，立场明确，诉求清晰，不卑不亢但保持礼貌' }
};

function buildPrompt(scene, values, tone, version) {
    const tonePrompt = TONES[tone]?.promptModifier || TONES.neutral.promptModifier;
    
    const versionPrompt = {
        'short': '生成简短版本（100-200字），适合微信/短信发送',
        'formal': '生成正式版本，结构完整，适合邮件或工单',
        'softened': '生成"降火"版本，语气缓和但立场清晰，避免激化矛盾',
        'standard': '生成标准版本，结构完整，清晰明确'
    }[version || 'standard'];
    
    // 格式化用户填写的信息
    const valuesText = Object.entries(values)
        .map(([key, value]) => {
            if (value === undefined || value === null || value === '') {
                return `- ${key}: 【待补充】`;
            }
            return `- ${key}: ${value}`;
        })
        .join('\n');
    
    return `你是一个专业的沟通助手。请根据以下信息生成一段沟通文本。

场景：${scene.name}
语气要求：${tonePrompt}

用户填写的信息：
${valuesText}

生成要求：
1. ${versionPrompt}
2. 结构清晰：背景-事实-诉求-期限-结尾
3. 使用${tone === 'soft' ? '温和' : tone === 'firm' ? '坚定' : '客观'}语气
4. 保持事实准确，缺失信息用【待补充】占位
5. 不要编造不存在的事实或证据
6. 语言自然，像真人说话

请直接输出文本，不要加解释：`;
}

async function callDeepseek(prompt) {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    
    if (!apiKey) {
        throw new Error('未配置 DEEPSEEK_API_KEY 环境变量');
    }
    
    // 创建30秒超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    try {
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    {
                        role: 'system',
                        content: '你是一个专业的沟通助手，帮助用户清晰、得体地表达诉求。你只基于用户提供的事实生成文本，从不编造信息。'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 1000,
                stream: false
            }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Deepseek API 错误: ${response.status} - ${error}`);
        }
        
        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('请求超时，请稍后重试');
        }
        throw error;
    }
}

// ==================== 用户系统与数据同步 ====================
// 简单的基于文件的存储（生产环境建议换成数据库）

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// 确保数据目录存在
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 读取用户数据
function loadUsers() {
    try {
        if (fs.existsSync(USERS_FILE)) {
            return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
        }
    } catch (err) {
        console.error('读取用户数据失败:', err);
    }
    return {};
}

// 保存用户数据
function saveUsers(users) {
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
        return true;
    } catch (err) {
        console.error('保存用户数据失败:', err);
        return false;
    }
}

// 生成简单 token
function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

// 密码哈希（简单实现，生产用 bcrypt）
function hashPassword(password) {
    return crypto.createHash('sha256').update(password + 'cleartalk_salt').digest('hex');
}

// 注册用户
app.post('/api/auth/register', (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ error: '邮箱和密码必填' });
    }
    
    if (password.length < 6) {
        return res.status(400).json({ error: '密码至少6位' });
    }
    
    const users = loadUsers();
    
    if (users[email]) {
        return res.status(409).json({ error: '该邮箱已被注册' });
    }
    
    const token = generateToken();
    users[email] = {
        email,
        passwordHash: hashPassword(password),
        token,
        createdAt: Date.now(),
        syncData: null
    };
    
    if (saveUsers(users)) {
        res.json({ 
            success: true, 
            token,
            message: '注册成功'
        });
    } else {
        res.status(500).json({ error: '注册失败' });
    }
});

// 登录
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ error: '邮箱和密码必填' });
    }
    
    const users = loadUsers();
    const user = users[email];
    
    if (!user || user.passwordHash !== hashPassword(password)) {
        return res.status(401).json({ error: '邮箱或密码错误' });
    }
    
    // 生成新 token
    const token = generateToken();
    user.token = token;
    saveUsers(users);
    
    res.json({
        success: true,
        token,
        email: user.email,
        message: '登录成功'
    });
});

// 验证 token 中间件
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: '未登录' });
    }
    
    const token = authHeader.substring(7);
    const users = loadUsers();
    
    const user = Object.values(users).find(u => u.token === token);
    if (!user) {
        return res.status(401).json({ error: '登录已过期' });
    }
    
    req.user = user;
    next();
}

// 同步数据到云端
app.post('/api/sync/upload', authMiddleware, (req, res) => {
    const { history, customScenes } = req.body;
    
    const users = loadUsers();
    const user = users[req.user.email];
    
    user.syncData = {
        history: history || [],
        customScenes: customScenes || [],
        lastSync: Date.now()
    };
    
    if (saveUsers(users)) {
        res.json({ 
            success: true, 
            message: '同步成功',
            lastSync: user.syncData.lastSync
        });
    } else {
        res.status(500).json({ error: '同步失败' });
    }
});

// 从云端下载数据
app.get('/api/sync/download', authMiddleware, (req, res) => {
    const users = loadUsers();
    const user = users[req.user.email];
    
    if (!user.syncData) {
        return res.json({
            success: true,
            history: [],
            customScenes: [],
            lastSync: null
        });
    }
    
    res.json({
        success: true,
        history: user.syncData.history,
        customScenes: user.syncData.customScenes,
        lastSync: user.syncData.lastSync
    });
});

// 删除云端数据
app.post('/api/sync/clear', authMiddleware, (req, res) => {
    const users = loadUsers();
    const user = users[req.user.email];
    
    user.syncData = null;
    
    if (saveUsers(users)) {
        res.json({ success: true, message: '云端数据已清除' });
    } else {
        res.status(500).json({ error: '操作失败' });
    }
});

// ==================== 错误处理 ====================

// 404 处理
app.use((req, res) => {
    res.status(404).json({ error: '接口不存在' });
});

// 全局错误处理
app.use((err, req, res, next) => {
    console.error('[Error] 未捕获错误:', err);
    res.status(500).json({ 
        error: '服务器内部错误',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// ==================== 启动 ====================

app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║     ClearTalk AI Proxy Server          ║
╠════════════════════════════════════════╣
║  端口: ${PORT.toString().padEnd(31)}║
║  环境: ${(process.env.NODE_ENV || 'development').padEnd(31)}║
╚════════════════════════════════════════╝
    `);
    
    if (!process.env.DEEPSEEK_API_KEY) {
        console.warn('\n⚠️ 警告: 未配置 DEEPSEEK_API_KEY');
        console.log('   请复制 .env.example 为 .env 并填入你的 API Key\n');
    } else {
        console.log('✅ Deepseek API Key 已配置\n');
    }
});
