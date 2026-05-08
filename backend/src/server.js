/**
 * ClearTalk Backend API v3.0
 * 完整功能：认证、邮箱验证码、找回密码、数据库、AI代理、场景市场、云同步
 */

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const fetch = require('node-fetch');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 信任代理头（解决 express-rate-limit 在反向代理/端口转发下的警告）
app.set('trust proxy', 1);
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// ============== 数据库初始化 ==============
const dataDir = path.join(__dirname, '../data');
const dbPath = path.join(dataDir, 'db.json');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const adapter = new JSONFile(dbPath);

// 默认数据结构
const defaultData = {
  users: [],
  userData: [],
  scenes: [],
  likes: [],
  // 验证码表：邮箱验证码、重置令牌
  verifications: [],
  passwordResets: []
};

const db = new Low(adapter, defaultData);

// 初始化数据库
async function initDb() {
  await db.read();
  db.data = db.data || defaultData;
  await db.write();
  console.log('[DB] 数据库初始化完成');
}

// ============== 邮箱服务 ==============
let transporter = null;

function initEmailService() {
  const emailHost = process.env.EMAIL_HOST;
  const emailPort = process.env.EMAIL_PORT;
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (emailHost && emailUser && emailPass) {
    transporter = nodemailer.createTransporter({
      host: emailHost,
      port: parseInt(emailPort) || 587,
      secure: parseInt(emailPort) === 465,
      auth: {
        user: emailUser,
        pass: emailPass
      }
    });
    console.log('[Email] 邮箱服务已配置');
  } else {
    console.log('[Email] 邮箱服务未配置，将使用模拟模式');
  }
}

// 发送邮件
async function sendEmail(to, subject, html) {
  if (!transporter) {
    console.log(`[Email] 模拟发送邮件到 ${to}: ${subject}`);
    return { success: true, simulated: true };
  }

  try {
    const result = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      html
    });
    console.log(`[Email] 邮件已发送到 ${to}: ${result.messageId}`);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('[Email] 发送失败:', error);
    return { success: false, error: error.message };
  }
}

// 生成6位验证码
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 生成重置令牌
function generateResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

// ============== 中间件 ==============
const allowedOrigins = (process.env.ALLOWED_ORIGINS?.split(',') || [])
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    if (isLocalhost) return callback(null, true);

    if (allowedOrigins.includes(origin)) return callback(null, true);

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));

// 频率限制
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: '请求过于频繁，请稍后再试' }
});

const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: '发送次数过多，请1小时后再试' }
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: '请求过于频繁' }
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/send-code', emailLimiter);
app.use('/api/auth/forgot-password', emailLimiter);
app.use('/api/', apiLimiter);

// JWT 认证
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '未提供访问令牌' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: '令牌无效或已过期' });
    }
    req.user = user;
    next();
  });
};

// ============== 认证 API ==============

// 注册
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: '请填写所有必填字段' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: '密码至少需要6个字符' });
    }

    // 检查是否已存在
    const existingUser = db.data.users.find(u => u.username === username || u.email === email);
    if (existingUser) {
      return res.status(400).json({ error: '用户名或邮箱已被使用' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: Date.now().toString(),
      username,
      email,
      password: hashedPassword,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isEmailVerified: false
    };

    db.data.users.push(newUser);
    await db.write();

    const token = jwt.sign(
      { userId: newUser.id, username, email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: { id: newUser.id, username, email, isEmailVerified: false }
    });
  } catch (error) {
    console.error('[Auth] 注册失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 登录（用户名/邮箱 + 密码）
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = db.data.users.find(u => u.username === username || u.email === username);
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: { id: user.id, username: user.username, email: user.email, isEmailVerified: user.isEmailVerified }
    });
  } catch (error) {
    console.error('[Auth] 登录失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 发送邮箱验证码
app.post('/api/auth/send-code', async (req, res) => {
  try {
    const { email, type = 'login' } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: '请输入有效的邮箱地址' });
    }

    // 生成验证码
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10分钟过期

    // 保存验证码
    db.data.verifications = db.data.verifications.filter(v => v.email !== email);
    db.data.verifications.push({
      email,
      code,
      type,
      expiresAt,
      createdAt: new Date().toISOString()
    });
    await db.write();

    // 发送邮件
    const subject = type === 'reset' ? 'ClearTalk 密码重置验证码' : 'ClearTalk 登录验证码';
    const html = `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <h2 style="color: #5B8DEF;">ClearTalk</h2>
        <p>您的验证码是：</p>
        <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333; border-radius: 8px; margin: 20px 0;">
          ${code}
        </div>
        <p style="color: #666;">验证码有效期为 10 分钟，请勿泄露给他人。</p>
        <p style="color: #999; font-size: 12px;">如非本人操作，请忽略此邮件。</p>
      </div>
    `;

    const emailResult = await sendEmail(email, subject, html);

    if (emailResult.simulated) {
      // 模拟模式下返回验证码（仅用于测试）
      res.json({ success: true, message: '验证码已发送（模拟模式）', code });
    } else if (emailResult.success) {
      res.json({ success: true, message: '验证码已发送到您的邮箱' });
    } else {
      res.status(500).json({ error: '验证码发送失败，请稍后重试' });
    }
  } catch (error) {
    console.error('[Auth] 发送验证码失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 邮箱验证码登录/注册
app.post('/api/auth/verify-code', async (req, res) => {
  try {
    const { email, code } = req.body;

    // 查找验证码
    const verification = db.data.verifications.find(
      v => v.email === email && v.code === code && new Date(v.expiresAt) > new Date()
    );

    if (!verification) {
      return res.status(400).json({ error: '验证码错误或已过期' });
    }

    // 删除已使用的验证码
    db.data.verifications = db.data.verifications.filter(v => v.email !== email);

    // 查找或创建用户
    let user = db.data.users.find(u => u.email === email);

    if (!user) {
      // 自动注册
      user = {
        id: Date.now().toString(),
        username: email.split('@')[0],
        email,
        password: await bcrypt.hash(generateCode(), 10),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isEmailVerified: true
      };
      db.data.users.push(user);
    } else {
      user.isEmailVerified = true;
      user.updatedAt = new Date().toISOString();
    }

    await db.write();

    const token = jwt.sign(
      { userId: user.id, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: { id: user.id, username: user.username, email: user.email, isEmailVerified: true },
      isNewUser: !user.createdAt
    });
  } catch (error) {
    console.error('[Auth] 验证码登录失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 忘记密码 - 发送重置链接
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    const user = db.data.users.find(u => u.email === email);
    if (!user) {
      // 出于安全考虑，不暴露邮箱是否存在
      return res.json({ success: true, message: '如果该邮箱存在，我们已发送重置链接' });
    }

    // 生成重置令牌
    const token = generateResetToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1小时过期

    // 保存重置令牌
    db.data.passwordResets = db.data.passwordResets.filter(r => r.email !== email);
    db.data.passwordResets.push({
      email,
      token,
      expiresAt,
      createdAt: new Date().toISOString()
    });
    await db.write();

    // 发送重置邮件
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
    const subject = 'ClearTalk 密码重置';
    const html = `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <h2 style="color: #5B8DEF;">ClearTalk</h2>
        <p>您 requested a password reset. Click the link below to reset your password:</p>
        <a href="${resetUrl}" style="display: inline-block; background: #5B8DEF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 20px 0;">重置密码</a>
        <p style="color: #666;">或者复制以下链接到浏览器：</p>
        <p style="background: #f5f5f5; padding: 10px; word-break: break-all; font-size: 12px;">${resetUrl}</p>
        <p style="color: #999; font-size: 12px;">此链接有效期为 1 小时。如非本人操作，请忽略此邮件。</p>
      </div>
    `;

    const emailResult = await sendEmail(email, subject, html);

    if (emailResult.simulated) {
      res.json({ success: true, message: '重置链接已发送（模拟模式）', resetUrl, token });
    } else {
      res.json({ success: true, message: '重置链接已发送到您的邮箱' });
    }
  } catch (error) {
    console.error('[Auth] 忘记密码失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 验证重置令牌
app.post('/api/auth/verify-reset-token', async (req, res) => {
  try {
    const { email, token } = req.body;

    const reset = db.data.passwordResets.find(
      r => r.email === email && r.token === token && new Date(r.expiresAt) > new Date()
    );

    if (!reset) {
      return res.status(400).json({ error: '重置链接已过期或无效' });
    }

    res.json({ valid: true });
  } catch (error) {
    console.error('[Auth] 验证令牌失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 重置密码
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: '密码至少需要6个字符' });
    }

    const reset = db.data.passwordResets.find(
      r => r.email === email && r.token === token && new Date(r.expiresAt) > new Date()
    );

    if (!reset) {
      return res.status(400).json({ error: '重置链接已过期或无效' });
    }

    const user = db.data.users.find(u => u.email === email);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 更新密码
    user.password = await bcrypt.hash(newPassword, 10);
    user.updatedAt = new Date().toISOString();

    // 删除重置令牌
    db.data.passwordResets = db.data.passwordResets.filter(r => r.email !== email);
    await db.write();

    res.json({ success: true, message: '密码已重置，请使用新密码登录' });
  } catch (error) {
    console.error('[Auth] 重置密码失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 验证 Token
app.get('/api/auth/verify', authenticateToken, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// ============== 用户资料 API ==============

app.put('/api/user/profile', authenticateToken, async (req, res) => {
  const { username, email } = req.body;
  const userId = req.user.userId;

  const user = db.data.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }

  const existing = db.data.users.find(u => 
    u.id !== userId && (u.username === username || u.email === email)
  );
  if (existing) {
    return res.status(400).json({ error: '用户名或邮箱已被使用' });
  }

  user.username = username;
  user.email = email;
  user.updatedAt = new Date().toISOString();
  await db.write();

  res.json({ success: true, user: { id: userId, username, email } });
});

// ============== 云同步 API ==============

app.post('/api/sync/upload', authenticateToken, async (req, res) => {
  const { data } = req.body;
  const userId = req.user.userId;
  const timestamp = new Date().toISOString();

  const types = ['history', 'scenes', 'settings', 'phrases', 'quickPhrases'];
  
  for (const type of types) {
    const key = type === 'scenes' ? 'customScenes' : type;
    if (data[key]) {
      const existing = db.data.userData.find(d => d.userId === userId && d.dataType === type);
      if (existing) {
        existing.data = data[key];
        existing.updatedAt = timestamp;
      } else {
        db.data.userData.push({ userId, dataType: type, data: data[key], updatedAt: timestamp });
      }
    }
  }

  await db.write();
  res.json({ success: true, timestamp });
});

app.get('/api/sync/download', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const userData = db.data.userData.filter(d => d.userId === userId);
  
  const result = {
    history: [],
    customScenes: [],
    settings: {},
    phrases: [],
    quickPhrases: [],
    lastSync: null
  };

  userData.forEach(item => {
    const key = item.dataType === 'scenes' ? 'customScenes' : item.dataType;
    result[key] = item.data;
    if (!result.lastSync || new Date(item.updatedAt) > new Date(result.lastSync)) {
      result.lastSync = item.updatedAt;
    }
  });

  res.json(result);
});

// ============== 场景市场 API ==============

app.get('/api/scenes/hot', (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const start = (page - 1) * limit;
  const end = start + parseInt(limit);

  const scenes = db.data.scenes
    .filter(s => s.isPublic)
    .sort((a, b) => (b.likes || 0) - (a.likes || 0) || (b.uses || 0) - (a.uses || 0))
    .slice(start, end);

  const users = db.data.users;
  const formatted = scenes.map(s => {
    const author = users.find(u => u.id === s.userId);
    return { ...s, author: author?.username || 'Unknown' };
  });

  res.json({ scenes: formatted, page: parseInt(page), hasMore: scenes.length === parseInt(limit) });
});

app.get('/api/scenes/latest', (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const start = (page - 1) * limit;
  const end = start + parseInt(limit);

  const scenes = db.data.scenes
    .filter(s => s.isPublic)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(start, end);

  const users = db.data.users;
  const formatted = scenes.map(s => {
    const author = users.find(u => u.id === s.userId);
    return { ...s, author: author?.username || 'Unknown' };
  });

  res.json({ scenes: formatted, page: parseInt(page), hasMore: scenes.length === parseInt(limit) });
});

app.get('/api/scenes/my', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const scenes = db.data.scenes.filter(s => s.userId === userId);
  res.json({ scenes });
});

app.post('/api/scenes/share', authenticateToken, async (req, res) => {
  const { scene } = req.body;
  const userId = req.user.userId;

  const newScene = {
    id: Date.now().toString(),
    userId,
    name: scene.name,
    description: scene.description,
    category: scene.category,
    icon: scene.icon,
    fields: scene.fields,
    likes: 0,
    uses: 0,
    isPublic: scene.isPublic !== false,
    createdAt: new Date().toISOString()
  };

  db.data.scenes.push(newScene);
  await db.write();

  res.json({ success: true, sceneId: newScene.id });
});

app.post('/api/scenes/:id/like', authenticateToken, async (req, res) => {
  const sceneId = req.params.id;
  const userId = req.user.userId;

  const existingLike = db.data.likes.find(l => l.sceneId === sceneId && l.userId === userId);
  
  if (existingLike) {
    return res.json({ success: true, liked: false });
  }

  db.data.likes.push({ sceneId, userId, createdAt: new Date().toISOString() });
  
  const scene = db.data.scenes.find(s => s.id === sceneId);
  if (scene) {
    scene.likes = (scene.likes || 0) + 1;
  }

  await db.write();
  res.json({ success: true, liked: true });
});

app.delete('/api/scenes/:id', authenticateToken, async (req, res) => {
  const sceneId = req.params.id;
  const userId = req.user.userId;

  const sceneIndex = db.data.scenes.findIndex(s => s.id === sceneId && s.userId === userId);
  if (sceneIndex === -1) {
    return res.status(403).json({ error: '删除失败或无权限' });
  }

  db.data.scenes.splice(sceneIndex, 1);
  db.data.likes = db.data.likes.filter(l => l.sceneId !== sceneId);
  await db.write();

  res.json({ success: true });
});

// ============== AI 生成 API ==============

app.post('/api/ai/generate', async (req, res) => {
  try {
    const { prompt, temperature = 0.7, maxTokens = 500, model } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: '缺少 prompt' });
    }

    const provider = model?.includes('deepseek') ? 'deepseek' : 'openai';
    const apiKey = provider === 'deepseek'
      ? process.env.DEEPSEEK_API_KEY
      : process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'AI 服务未配置' });
    }

    const baseUrl = provider === 'deepseek'
      ? 'https://api.deepseek.com/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions';

    const modelName = model || (provider === 'deepseek' ? 'deepseek-v4-pro' : 'gpt-5.5-mini');

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: 'user', content: prompt }],
        temperature,
        max_tokens: maxTokens
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return res.status(500).json({
        error: error.error?.message || `AI 服务错误: ${response.status}`
      });
    }

    const data = await response.json();
    const text = data.choices[0].message.content;

    res.json({ text, model: data.model });
  } catch (error) {
    console.error('[AI] 生成失败:', error);
    res.status(500).json({ error: 'AI 生成失败: ' + error.message });
  }
});

// ============== 健康检查 ==============

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'cleartalk-api',
    version: '3.0.0',
    timestamp: new Date().toISOString(),
    features: ['auth', 'email', 'reset-password', 'sync', 'market', 'ai']
  });
});

// ============== 启动 ==============

async function start() {
  await initDb();
  initEmailService();
  
  app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║     ClearTalk API Server v3.0.0        ║
╠════════════════════════════════════════╣
║  Port: ${PORT}                            ║
║  Database: LowDB (JSON)                  ║
║  Email: ${transporter ? 'Enabled' : 'Simulated'}                ║
╠════════════════════════════════════════╣
║  Features:                               ║
║    ✓ Auth (Password + Email Code)        ║
║    ✓ Password Reset                      ║
║    ✓ Cloud Sync                          ║
║    ✓ Scene Market                        ║
║    ✓ AI Proxy                            ║
╚════════════════════════════════════════╝
    `);
  });
}

start();
