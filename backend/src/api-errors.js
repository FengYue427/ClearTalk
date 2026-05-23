/**
 * API 错误体：errorCode 与前端 i18n 键对齐，error 为中文展示文案。
 */
const DEFAULT_ZH = {
  'error.rate_limit': '请求过于频繁，请稍后再试',
  'error.rate_limit.email': '发送次数过多，请1小时后再试',
  'error.rate_limit.feedback': '反馈提交过于频繁，请稍后再试',
  'error.rate_limit.events': '埋点请求过于频繁',
  'error.rate_limit.market': '使用计数过于频繁',
  'error.rate_limit.paste': '粘贴分析过于频繁',
  'auth.error.login.required': '未提供访问令牌',
  'auth.error.token.expired': '令牌无效或已过期',
  'error.forbidden': '无权限执行此操作',
  'error.admin.forbidden': '无权限访问统计数据',
  'auth.error.empty.fields': '请填写所有必填字段',
  'auth.error.password_short': '密码至少需要6个字符',
  'auth.error.user.exists': '用户名或邮箱已被使用',
  'auth.error.user.not.found': '用户名或密码错误',
  'auth.error.email_invalid': '请输入有效的邮箱地址',
  'auth.error.send.code.failed': '邮件服务暂未开通，请使用密码登录或联系管理员',
  'auth.error.invalid.code': '验证码错误或已过期',
  'auth.error.account.not.found': '用户不存在',
  'auth.error.password_required': '请提供当前密码，且新密码至少 6 位',
  'auth.error.password_confirm_delete': '请提供密码以确认删除账号',
  'auth.error.wrong.password': '当前密码不正确',
  'error.invalid_input': '输入无效或不完整',
  'common.duplicate': '该短语已存在',
  'error.not_found': '未找到请求的资源',
  'error.unknown': '服务器错误',
  'quota.exceeded': '今日 AI 生成次数已用完，明日重置或升级 Pro',
  'error.ai.classify_failed': '分类失败',
  'error.ai.generate_failed': 'AI 生成失败',
  'error.ai.stream_failed': '流式生成失败'
};

function apiError(errorCode, messageZh) {
  return {
    errorCode,
    error: messageZh ?? DEFAULT_ZH[errorCode] ?? errorCode
  };
}

function sendApiError(res, status, errorCode, messageZh) {
  return res.status(status).json(apiError(errorCode, messageZh));
}

module.exports = { apiError, sendApiError, DEFAULT_ZH };
