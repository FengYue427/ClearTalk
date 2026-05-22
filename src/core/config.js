/**
 * 全局配置
 */

// API 基础配置
const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {};

/** 去掉末尾斜杠；生产构建见 .env.production 或 Vercel 环境变量 */
export const API_BASE_URL = (() => {
  const raw = env.VITE_API_URL || '';
  const trimmed = String(raw).trim().replace(/\/$/, '');
  if (trimmed) return trimmed;
  // 开发：走 Vite proxy（相对路径 /api）
  return '';
})();

// 应用信息
export const APP_INFO = {
  name: 'ClearTalk',
  version: (typeof __APP_VERSION__ !== 'undefined' && __APP_VERSION__) || '1.0.0',
  description: 'AI驱动的沟通文本生成助手',
  author: 'ClearTalk Team'
};

// 存储键名
export const STORAGE_KEYS = {
  LANGUAGE: 'cleartalk_language',
  THEME: 'cleartalk_theme',
  HISTORY: 'cleartalk_history',
  CUSTOM_SCENES: 'cleartalk_custom_scenes',
  SETTINGS: 'cleartalk_settings',
  USER: 'cleartalk_user',
  TOKEN: 'cleartalk_token',
  DIALOGUE_CONTEXTS: 'cleartalk_dialogue_contexts',
  INSTALL_PROMPTED: 'cleartalk_install_prompted',
  LAST_SYNC_TIME: 'lastSyncTime',
  AUTO_SYNC: 'autoSync',
  SYNC_DIRECTION: 'syncDirection',
  FEEDBACK: 'cleartalk_feedback'
};

// 默认设置
export const DEFAULT_SETTINGS = {
  language: 'zh',
  theme: 'auto',
  haptic: true,
  autoSync: false,
  syncDirection: 'merge',
  aiProvider: 'proxy',
  aiModel: 'deepseek-chat',
  useStream: true
};

/** 后端代理模式下的可选模型 */
export const PROXY_AI_MODELS = [
  { value: 'deepseek-chat', labelKey: 'settings.ai.model.deepseek_chat', provider: 'deepseek' },
  { value: 'gpt-4o-mini', labelKey: 'settings.ai.model.gpt_4o_mini', provider: 'openai' },
  { value: 'gpt-4o', labelKey: 'settings.ai.model.gpt_4o', provider: 'openai' },
  { value: 'qwen-turbo', labelKey: 'settings.ai.model.qwen_turbo', provider: 'qwen' }
];

// 分页配置
export const PAGINATION = {
  historyPerPage: 20,
  marketPerPage: 20
};

// 对话配置
export const DIALOGUE_CONFIG = {
  maxTurns: 12,
  maxHistoryLength: 10
};

// 字段类型
export const FIELD_TYPES = {
  TEXT: 'text',
  TEXTAREA: 'textarea',
  NUMBER: 'number',
  SELECT: 'select',
  BOOLEAN: 'boolean',
  DATE: 'date'
};
