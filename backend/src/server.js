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
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const DB = require('./database');
const { chatCompletion, chatCompletionStream, getAiStatus } = require('./ai-provider');
const quota = require('./quota');
const { classifyPaste } = require('./classify-paste');
const { loadCatalog } = require('./scene-catalog');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 信任代理头（解决 express-rate-limit 在反向代理/端口转发下的警告）
app.set('trust proxy', 1);
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

function ipHash(req) {
  return crypto.createHash('sha256').update(req.ip || '').digest('hex').slice(0, 16);
}

// ============== 邮箱服务 ==============
let transporter = null;
/** SMTP verify() 通过后才为 true（仅表示能连上服务器，不等于每封都能送达） */
let smtpVerified = false;

function buildSmtpTransport() {
  const emailHost = process.env.EMAIL_HOST;
  const emailPort = parseInt(process.env.EMAIL_PORT, 10) || 587;
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  const secure = emailPort === 465;

  return nodemailer.createTransport({
    host: emailHost,
    port: emailPort,
    secure,
    auth: {
      user: emailUser,
      pass: emailPass
    },
    connectionTimeout: 20000,
    greetingTimeout: 20000,
    socketTimeout: 20000,
    ...(secure
      ? { tls: { servername: emailHost, minVersion: 'TLSv1.2' } }
      : { requireTLS: true, tls: { servername: emailHost, minVersion: 'TLSv1.2' } })
  });
}

/** 163 等要求发件人地址与登录邮箱一致 */
function getMailFrom() {
  const user = (process.env.EMAIL_USER || '').trim();
  const from = (process.env.EMAIL_FROM || user).trim();
  if (!user) return from;
  if (from.includes(user)) return from;
  return `"ClearTalk" <${user}>`;
}

function initEmailService() {
  const emailHost = process.env.EMAIL_HOST;
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (emailHost && emailUser && emailPass) {
    transporter = buildSmtpTransport();
    console.log(`[Email] 邮箱服务已配置 (${emailHost}:${process.env.EMAIL_PORT || 587})`);
    transporter
      .verify()
      .then(() => {
        smtpVerified = true;
        console.log('[Email] SMTP 连接验证成功');
      })
      .catch((err) => {
        smtpVerified = false;
        console.error('[Email] SMTP 连接验证失败:', err.message);
        if (err.code) console.error('[Email]   code:', err.code);
        if (err.response) console.error('[Email]   response:', err.response);
        console.error('[Email]   请检查 163 授权码、EMAIL_PORT(465/587)，见 docs/SMTP_163_SETUP.md');
      });
  } else {
    console.log('[Email] 邮箱服务未配置，将使用模拟模式');
  }
}

function getFrontendBase() {
  return (process.env.FRONTEND_URL || 'http://localhost:8080').replace(/\/$/, '');
}

function buildPasswordResetUrl(token, email) {
  return `${getFrontendBase()}/?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
}

/** 生产环境未配置 SMTP 时不向客户端泄露验证码/重置链接 */
function emailExtrasAllowed() {
  return process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEV_EMAIL_PREVIEW === '1';
}

// 发送邮件
async function sendEmail(to, subject, html) {
  if (!transporter) {
    console.log(`[Email] 模拟发送邮件到 ${to}: ${subject}`);
    return { success: true, simulated: true };
  }

  try {
    const from = getMailFrom();
    const envelopeFrom = (process.env.EMAIL_USER || '').trim() || from;
    const result = await transporter.sendMail({
      from,
      to,
      subject,
      html,
      envelope: { from: envelopeFrom, to }
    });
    console.log(`[Email] 邮件已发送到 ${to}: ${result.messageId}`);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('[Email] 发送失败:', error.message);
    if (error.code) console.error('[Email]   code:', error.code);
    if (error.response) console.error('[Email]   response:', error.response);
    return { success: false, error: error.message, code: error.code };
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
const feedbackLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.FEEDBACK_RATE_LIMIT_MAX, 10) || 20,
  message: { error: '反馈提交过于频繁，请稍后再试' }
});

const eventsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.EVENTS_RATE_LIMIT_MAX, 10) || 60,
  message: { error: '埋点请求过于频繁' }
});

const marketUseLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: '使用计数过于频繁' }
});

app.use('/api/feedback', feedbackLimiter);
app.use('/api/events', eventsLimiter);
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

/** 可选登录：有 token 则解析 user，无 token 也放行 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return next();

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (!err) req.user = user;
    next();
  });
};

const FEEDBACK_ADMIN_KEY = process.env.FEEDBACK_ADMIN_KEY || '';

const requireFeedbackAdmin = (req, res, next) => {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (!FEEDBACK_ADMIN_KEY || key !== FEEDBACK_ADMIN_KEY) {
    return res.status(403).json({ error: '无权限访问统计数据' });
  }
  next();
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
    const existingUser = DB.findUserByUsernameOrEmail(username) || DB.findUserByUsernameOrEmail(email);
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

    DB.createUser(newUser);

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

    const user = DB.findUserByUsernameOrEmail(username);
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
    DB.saveVerification({
      email,
      code,
      type,
      expiresAt,
      createdAt: new Date().toISOString()
    });

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
      if (!emailExtrasAllowed()) {
        return res.status(503).json({
          error: '邮件服务暂未开通，请使用密码登录或联系管理员配置 SMTP'
        });
      }
      res.json({ success: true, message: '验证码已发送（开发模式）', code });
    } else if (emailResult.success) {
      res.json({ success: true, message: '验证码已发送到您的邮箱' });
    } else {
      const hint = emailResult.code === 'EAUTH'
        ? '邮件认证失败，请检查 163 授权码与 SMTP 是否已开启'
        : '验证码发送失败，请稍后重试';
      res.status(500).json({ error: hint });
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
    const verification = DB.findValidVerification(email, code);

    if (!verification) {
      return res.status(400).json({ error: '验证码错误或已过期' });
    }

    DB.deleteVerification(email);

    let user = DB.findUserByEmail(email);
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      user = {
        id: Date.now().toString(),
        username: email.split('@')[0],
        email,
        password: await bcrypt.hash(generateCode(), 10),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isEmailVerified: true
      };
      DB.createUser(user);
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: { id: user.id, username: user.username, email: user.email, isEmailVerified: true },
      isNewUser
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

    const user = DB.findUserByEmail(email);
    if (!user) {
      // 出于安全考虑，不暴露邮箱是否存在
      return res.json({ success: true, message: '如果该邮箱存在，我们已发送重置链接' });
    }

    const token = generateResetToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    DB.savePasswordReset({
      email,
      token,
      expiresAt,
      createdAt: new Date().toISOString()
    });

    // 发送重置邮件
    const resetUrl = buildPasswordResetUrl(token, email);
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
      if (!emailExtrasAllowed()) {
        return res.status(503).json({
          error: '邮件服务暂未开通，无法发送重置邮件，请联系管理员'
        });
      }
      res.json({ success: true, message: '重置链接已发送（开发模式）', resetUrl, token });
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

    const reset = DB.findValidPasswordReset(email, token);

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

    const reset = DB.findValidPasswordReset(email, token);

    if (!reset) {
      return res.status(400).json({ error: '重置链接已过期或无效' });
    }

    const user = DB.findUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    await DB.updateUserPassword(email, await bcrypt.hash(newPassword, 10));
    DB.deletePasswordResets(email);

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

  const user = DB.findUserById(userId);
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }

  const existing = DB.findUserConflict(userId, username, email);
  if (existing) {
    return res.status(400).json({ error: '用户名或邮箱已被使用' });
  }

  DB.updateUser(userId, { username, email });

  res.json({ success: true, user: { id: userId, username, email } });
});

app.put('/api/user/password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || String(newPassword).length < 6) {
      return res.status(400).json({ error: '请提供当前密码，且新密码至少 6 位' });
    }
    const user = DB.findUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return res.status(401).json({ error: '当前密码不正确' });
    }
    const hashed = await bcrypt.hash(newPassword, 10);
    DB.updateUserPasswordById(user.id, hashed);
    res.json({ success: true, message: '密码已更新' });
  } catch (error) {
    console.error('[User] 修改密码失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

app.post('/api/user/delete', authenticateToken, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: '请提供密码以确认删除账号' });
    }
    const user = DB.findUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: '密码不正确' });
    }
    DB.deleteUserAccount(user.id);
    res.json({ success: true, message: '账号已删除' });
  } catch (error) {
    console.error('[User] 删除账号失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

app.post('/api/user/phrases', authenticateToken, (req, res) => {
  try {
    const { phrase } = req.body;
    if (!phrase?.text || !String(phrase.text).trim()) {
      return res.status(400).json({ error: '短语内容不能为空' });
    }
    const userId = req.user.userId;
    const phrases = DB.getPhrases(userId);
    const entry = {
      id: phrase.id || `ph_${Date.now()}`,
      text: String(phrase.text).trim(),
      createdAt: phrase.createdAt || new Date().toISOString()
    };
    if (phrases.some((p) => p.text === entry.text)) {
      return res.status(400).json({ error: '该短语已存在' });
    }
    phrases.push(entry);
    DB.setPhrases(userId, phrases);
    res.json({ success: true, phrase: entry });
  } catch (error) {
    console.error('[User] 添加快捷短语失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

app.delete('/api/user/phrases/:id', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;
    const phrases = DB.getPhrases(userId).filter((p) => p.id !== req.params.id);
    DB.setPhrases(userId, phrases);
    res.json({ success: true });
  } catch (error) {
    console.error('[User] 删除快捷短语失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
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
      DB.upsertUserData(userId, type, data[key], timestamp);
    }
  }
  res.json({ success: true, timestamp });
});

app.get('/api/sync/download', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const userData = DB.getUserData(userId);

  const result = {
    history: [],
    customScenes: [],
    settings: {},
    phrases: [],
    quickPhrases: [],
    lastSync: null
  };

  userData.forEach((item) => {
    const key = item.data_type === 'scenes' ? 'customScenes' : item.data_type;
    result[key] = JSON.parse(item.data);
    if (!result.lastSync || new Date(item.updated_at) > new Date(result.lastSync)) {
      result.lastSync = item.updated_at;
    }
  });

  res.json(result);
});

app.delete('/api/sync/clear', authenticateToken, (req, res) => {
  try {
    DB.clearUserSyncData(req.user.userId);
    res.json({ success: true, message: '云端数据已清除' });
  } catch (error) {
    console.error('[Sync] 清除云端数据失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// ============== 场景市场 API ==============

function formatMarketList(scenes, page, limit) {
  const p = parseInt(page, 10) || 1;
  const l = parseInt(limit, 10) || 20;
  return {
    scenes,
    total: scenes.length,
    page: p,
    hasMore: scenes.length >= l
  };
}

function handleMarketList(req, res, sort) {
  const { page = 1, limit = 20 } = req.query;
  const scenes = DB.listPublicScenes({ sort, page: parseInt(page, 10), limit: parseInt(limit, 10) });
  res.json(formatMarketList(scenes, page, limit));
}

app.get('/api/scenes/hot', (req, res) => handleMarketList(req, res, 'hot'));
app.get('/api/scenes/latest', (req, res) => handleMarketList(req, res, 'latest'));
app.get('/api/market/scenes', (req, res) => {
  const sort = req.query.sort === 'latest' ? 'latest' : 'hot';
  handleMarketList(req, res, sort);
});

app.get('/api/scenes/my', authenticateToken, (req, res) => {
  res.json({ scenes: DB.listScenesByUser(req.user.userId) });
});
app.get('/api/market/my-scenes', authenticateToken, (req, res) => {
  res.json({ scenes: DB.listScenesByUser(req.user.userId) });
});

app.get('/api/market/scenes/:id', (req, res) => {
  const scene = DB.findSceneById(req.params.id);
  if (!scene || !scene.isPublic) {
    return res.status(404).json({ error: '场景不存在' });
  }
  res.json({ scene });
});

app.get('/api/market/search', (req, res) => {
  const { q = '', limit = 20 } = req.query;
  if (!q || String(q).trim().length < 1) {
    return res.json({ scenes: [], total: 0 });
  }
  const scenes = DB.searchScenes(String(q).trim(), parseInt(limit, 10) || 20);
  res.json({ scenes, total: scenes.length });
});

function shareSceneHandler(req, res) {
  const { scene } = req.body;
  const userId = req.user.userId;

  if (!scene?.name || !scene?.fields?.length) {
    return res.status(400).json({ error: '场景信息不完整' });
  }

  const newScene = {
    id: Date.now().toString(),
    userId,
    name: scene.name,
    description: scene.description || '',
    category: scene.category || '',
    icon: scene.icon || '📝',
    fields: scene.fields,
    isPublic: scene.isPublic !== false,
    status: 'approved',
    createdAt: new Date().toISOString()
  };

  DB.createScene(newScene);
  res.json({ success: true, scene: newScene, sceneId: newScene.id });
}

app.post('/api/scenes/share', authenticateToken, shareSceneHandler);
app.post('/api/market/share', authenticateToken, shareSceneHandler);

function likeSceneHandler(req, res) {
  const sceneId = req.params.id;
  const userId = req.user.userId;
  const scene = DB.findSceneById(sceneId);
  if (!scene) return res.status(404).json({ error: '场景不存在' });

  const result = DB.toggleLike(sceneId, userId);
  res.json({ success: true, liked: result.liked });
}

app.post('/api/scenes/:id/like', authenticateToken, likeSceneHandler);
app.post('/api/market/scenes/:id/like', authenticateToken, likeSceneHandler);

app.delete('/api/market/scenes/:id/like', authenticateToken, (req, res) => {
  const sceneId = req.params.id;
  const userId = req.user.userId;
  if (DB.hasLiked(sceneId, userId)) {
    DB.toggleLike(sceneId, userId);
  }
  res.json({ success: true, liked: false });
});

function useSceneHandler(req, res) {
  const sceneId = req.params.id;
  const scene = DB.findSceneById(sceneId);
  if (!scene) return res.status(404).json({ error: '场景不存在' });

  const key = req.user?.userId || ipHash(req);
  const result = DB.incrementSceneUse(sceneId, key);
  if (result.counted) {
    DB.recordSceneUseEvent(sceneId, req.user?.userId || null, key);
  }
  res.json({ success: true, counted: result.counted, uses: scene.uses + (result.counted ? 1 : 0) });
}

app.post('/api/scenes/:id/use', marketUseLimiter, optionalAuth, useSceneHandler);
app.post('/api/market/scenes/:id/use', marketUseLimiter, optionalAuth, useSceneHandler);

function deleteSceneHandler(req, res) {
  const ok = DB.deleteScene(req.params.id, req.user.userId);
  if (!ok) return res.status(403).json({ error: '删除失败或无权限' });
  res.json({ success: true });
}

app.delete('/api/scenes/:id', authenticateToken, deleteSceneHandler);
app.delete('/api/market/my-scenes/:id', authenticateToken, deleteSceneHandler);

// ============== AI 生成 API ==============

const SENSITIVE_PATTERNS = [
  { pattern: /\b\d{17}[\dXx]\b/g, replacement: '[身份证号已脱敏]' },
  { pattern: /\b\d{16,19}\b/g, replacement: '[银行卡号已脱敏]' },
  { pattern: /\b1[3-9]\d{9}\b/g, replacement: '[手机号已脱敏]' }
];

function redactSensitiveText(text) {
  let result = String(text);
  for (const { pattern, replacement } of SENSITIVE_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

app.get('/api/quota', optionalAuth, (req, res) => {
  res.json(quota.getStatus(req));
});

app.get('/api/scenes/catalog', (req, res) => {
  res.json({ scenes: loadCatalog() });
});

const classifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.CLASSIFY_RATE_LIMIT_MAX, 10) || 15,
  message: { error: '粘贴分析过于频繁' }
});

app.post('/api/ai/classify-paste', classifyLimiter, optionalAuth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || String(text).trim().length < 2) {
      return res.status(400).json({ error: '请提供有效文本' });
    }
    const result = await classifyPaste(text);
    res.json(result);
  } catch (error) {
    console.error('[Classify] 失败:', error);
    res.status(500).json({ error: error.message || '分类失败' });
  }
});

app.post('/api/ai/generate', optionalAuth, quota.checkQuota, async (req, res) => {
  try {
    const { prompt, temperature = 0.7, maxTokens = 1000, model } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: '缺少 prompt' });
    }

    const safePrompt = redactSensitiveText(prompt);
    const result = await chatCompletion({
      prompt: safePrompt,
      temperature,
      maxTokens,
      model
    });

    quota.recordGeneration(req);
    res.json({
      text: result.text,
      model: result.model,
      provider: result.provider,
      quota: quota.getStatus(req)
    });
  } catch (error) {
    console.error('[AI] 生成失败:', error);
    res.status(500).json({ error: error.message || 'AI 生成失败' });
  }
});

app.post('/api/ai/generate-stream', optionalAuth, quota.checkQuota, async (req, res) => {
  try {
    const { prompt, temperature = 0.7, maxTokens = 1000, model } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: '缺少 prompt' });
    }

    const safePrompt = redactSensitiveText(prompt);
    await chatCompletionStream(
      { prompt: safePrompt, temperature, maxTokens, model },
      res
    );
    quota.recordGeneration(req);
  } catch (error) {
    console.error('[AI] 流式生成失败:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || '流式生成失败' });
    }
  }
});

// ============== 用户反馈 API ==============

app.post('/api/feedback', optionalAuth, async (req, res) => {
  try {
    const { type, sceneId, sceneName, tone, reasons, comment, textPreview, meta } = req.body;

    if (!type || !['helpful', 'not_helpful'].includes(type)) {
      return res.status(400).json({ error: '无效的反馈类型' });
    }

    const entry = {
      id: crypto.randomUUID(),
      type,
      sceneId: sceneId || null,
      sceneName: sceneName ? String(sceneName).slice(0, 100) : null,
      tone: tone || null,
      reasons: Array.isArray(reasons) ? reasons.slice(0, 10) : [],
      comment: comment ? String(comment).slice(0, 1000) : '',
      textPreview: textPreview ? String(textPreview).slice(0, 500) : '',
      userId: req.user?.userId || null,
      meta: meta && typeof meta === 'object' ? meta : {},
      ipHash: ipHash(req),
      createdAt: new Date().toISOString()
    };

    DB.insertFeedback(entry);

    res.status(201).json({ success: true, id: entry.id });
  } catch (error) {
    console.error('[Feedback] 保存失败:', error);
    res.status(500).json({ error: '反馈保存失败' });
  }
});

app.get('/api/feedback/stats', requireFeedbackAdmin, async (req, res) => {
  const list = DB.getFeedbackStats();
  const helpful = list.filter((f) => f.type === 'helpful').length;
  const notHelpful = list.filter((f) => f.type === 'not_helpful').length;

  const byScene = {};
  for (const f of list) {
    const key = f.sceneId || 'unknown';
    byScene[key] = (byScene[key] || 0) + 1;
  }

  const topScenes = Object.entries(byScene)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([sceneId, count]) => ({
      sceneId,
      sceneName: list.find((f) => f.sceneId === sceneId)?.sceneName || sceneId,
      count
    }));

  const reasonCounts = {};
  for (const f of list) {
    for (const r of f.reasons || []) {
      reasonCounts[r] = (reasonCounts[r] || 0) + 1;
    }
  }

  res.json({
    total: list.length,
    helpful,
    notHelpful,
    helpfulRate: list.length ? Math.round((helpful / list.length) * 100) : 0,
    topScenes,
    reasonCounts,
    recent: list.slice(0, 20).map((f) => ({
      id: f.id,
      type: f.type,
      sceneName: f.sceneName,
      createdAt: f.createdAt
    }))
  });
});

// ============== 埋点 API ==============

const ALLOWED_EVENTS = new Set([
  'page_view',
  'scene_open',
  'generate_start',
  'generate_ok',
  'generate_fail',
  'share_card',
  'feedback_submit',
  'market_use',
  'paste_analyze'
]);

app.post('/api/events', optionalAuth, (req, res) => {
  try {
    const { name, sceneId, meta } = req.body;
    if (!name || !ALLOWED_EVENTS.has(name)) {
      return res.status(400).json({ error: '无效的事件名称' });
    }

    const entry = {
      id: crypto.randomUUID(),
      name,
      sceneId: sceneId || null,
      userId: req.user?.userId || null,
      meta: meta && typeof meta === 'object' ? meta : {},
      ipHash: ipHash(req),
      createdAt: new Date().toISOString()
    };

    DB.insertEvent(entry);
    res.status(201).json({ success: true, id: entry.id });
  } catch (error) {
    console.error('[Events] 保存失败:', error);
    res.status(500).json({ error: '事件保存失败' });
  }
});

app.get('/api/events/stats', requireFeedbackAdmin, (req, res) => {
  const days = parseInt(req.query.days, 10) || 7;
  const stats = DB.getEventStats(days);
  const dbStats = DB.getStats();
  res.json({ ...stats, totals: dbStats });
});

// ============== 健康检查 ==============

function getHealthPayload() {
  const ai = getAiStatus();
  const isProd = process.env.NODE_ENV === 'production';
  const jwtOk = JWT_SECRET && JWT_SECRET !== 'your-secret-key-change-in-production';

  const warnings = [];
  if (isProd && !jwtOk) warnings.push('JWT_SECRET 未正确配置');
  if (isProd && !ai.ready) warnings.push('未配置任何 AI API Key');
  if (isProd && allowedOrigins.length === 0) warnings.push('ALLOWED_ORIGINS 为空');

  return {
    status: warnings.length && isProd ? 'degraded' : 'ok',
    service: 'cleartalk-api',
    version: '3.1.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    checks: {
      database: DB.getMode?.() || 'sqlite',
      email: !!transporter,
      emailSmtpVerified: smtpVerified,
      ai,
      jwt: jwtOk,
      corsOrigins: allowedOrigins.length
    },
    warnings,
    features: ['auth', 'email', 'reset-password', 'sync', 'market', 'ai', 'ai-stream', 'feedback', 'events', 'sqlite', 'quota', 'classify-paste']
  };
}

app.get('/health', (req, res) => {
  res.json(getHealthPayload());
});

app.get('/health/ready', (req, res) => {
  const payload = getHealthPayload();
  const ai = getAiStatus();
  if (process.env.NODE_ENV === 'production' && !ai.ready) {
    return res.status(503).json({ ...payload, status: 'unavailable' });
  }
  res.json(payload);
});

// ============== 启动 ==============

function validateStartup() {
  const isProd = process.env.NODE_ENV === 'production';
  const ai = getAiStatus();

  if (isProd) {
    if (JWT_SECRET === 'your-secret-key-change-in-production') {
      console.error('[Startup] 生产环境必须设置 JWT_SECRET');
      process.exit(1);
    }
    if (!ai.ready) {
      console.warn('[Startup] 警告: 未配置 AI Key，生成功能将不可用');
    }
    if (allowedOrigins.length === 0) {
      console.warn('[Startup] 警告: ALLOWED_ORIGINS 未配置');
    }
  }

  console.log(`[Startup] AI 已配置: ${ai.configured.join(', ') || '无'}`);
}

function start() {
  DB.init();
  initEmailService();
  validateStartup();

  app.listen(PORT, () => {
    const ai = getAiStatus();
    const stats = DB.getStats();
    console.log(`
╔════════════════════════════════════════╗
║     ClearTalk API Server v3.2.0        ║
╠════════════════════════════════════════╣
║  Port: ${PORT}                            ║
║  Database: ${(DB.getMode?.() || 'sqlite').padEnd(28)}║
║  Users: ${stats.users}  Scenes: ${stats.scenes}              ║
║  Email: ${transporter ? 'Enabled' : 'Simulated'}                ║
║  AI: ${ai.configured.join(', ') || 'none'}                       ║
╠════════════════════════════════════════╣
║  Features:                               ║
║    ✓ Auth / Sync / Market / AI Stream    ║
║    ✓ Feedback / Events / SQLite          ║
╚════════════════════════════════════════╝
    `);
  });
}

start();
