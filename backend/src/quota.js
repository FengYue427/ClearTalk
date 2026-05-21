/**
 * 每日生成配额（免费 / Pro 预备，无真实支付）
 */
const DB = require('./database');

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function endOfDayIso() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

function getLimits(tier) {
  const free = parseInt(process.env.FREE_DAILY_GENERATIONS, 10) || 20;
  const pro = parseInt(process.env.PRO_DAILY_GENERATIONS, 10) || 200;
  return tier === 'pro' ? pro : free;
}

function getProUserIds() {
  return (process.env.PRO_USER_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function resolveTier(req) {
  const userId = req.user?.userId;
  if (!userId) return 'free';
  if (getProUserIds().includes(userId)) return 'pro';
  if (DB.isUserPro?.(userId)) return 'pro';
  return 'free';
}

function ipHashFromReq(req) {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(req.ip || '').digest('hex').slice(0, 16);
}

function resolveSubject(req) {
  return req.user?.userId || req.ipHash || ipHashFromReq(req);
}

function getStatus(req) {
  const subject = resolveSubject(req);
  const tier = resolveTier(req);
  const used = DB.getDailyGenerateCount(subject, todayKey());
  const limit = getLimits(tier);
  return {
    tier,
    limit,
    used,
    remaining: Math.max(0, limit - used),
    resetsAt: endOfDayIso(),
    subject: subject.slice(0, 8) + '…'
  };
}

function checkQuota(req, res, next) {
  const status = getStatus(req);
  if (status.remaining <= 0) {
    return res.status(429).json({
      error: '今日 AI 生成次数已用完，明日重置或升级 Pro',
      code: 'QUOTA_EXCEEDED',
      quota: status
    });
  }
  req._quotaSubject = resolveSubject(req);
  next();
}

function recordGeneration(req) {
  const subject = req._quotaSubject || resolveSubject(req);
  DB.incrementDailyGenerate(subject, todayKey());
}

module.exports = {
  getStatus,
  checkQuota,
  recordGeneration,
  getLimits,
  resolveTier
};
