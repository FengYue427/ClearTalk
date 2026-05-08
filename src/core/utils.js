/**
 * 通用工具函数
 */

import { logger } from './logger.js';

// 防抖
export function debounce(fn, delay = 300) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// 节流
export function throttle(fn, limit = 300) {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// HTML 转义
export function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 复制到剪贴板
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    logger.error('Copy failed:', err);
    return false;
  }
}

// 震动反馈
export function triggerHaptic() {
  if (navigator.vibrate) {
    navigator.vibrate(10);
  }
}

// 生成唯一ID
export function generateId(prefix = '') {
  return `${prefix}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 格式化日期
export function formatDate(date, format = 'short') {
  const d = new Date(date);
  const now = new Date();
  const diff = now - d;
  
  // 今天
  if (diff < 86400000 && d.getDate() === now.getDate()) {
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }
  
  // 昨天
  if (diff < 172800000 && d.getDate() === now.getDate() - 1) {
    return '昨天';
  }
  
  // 本周
  if (diff < 604800000) {
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return days[d.getDay()];
  }
  
  // 默认
  if (format === 'short') {
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  }
  
  return d.toLocaleDateString('zh-CN', { 
    month: 'short', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

// 下载文件
export function downloadFile(content, filename, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 深度合并对象
export function deepMerge(target, source) {
  const output = { ...target };
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        output[key] = deepMerge(output[key] || {}, source[key]);
      } else {
        output[key] = source[key];
      }
    }
  }
  return output;
}

// 检查是否在线
export function isOnline() {
  return navigator.onLine;
}

// 重试函数
export async function retry(fn, maxAttempts = 3, delay = 1000) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      logger.warn(`Attempt ${attempt} failed:`, error);
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  }
  throw lastError;
}

// 事件发射器（简单实现）
export class EventEmitter {
  constructor() {
    this.events = {};
  }
  
  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
    
    return () => this.off(event, callback);
  }
  
  off(event, callback) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(cb => cb !== callback);
  }
  
  emit(event, ...args) {
    if (!this.events[event]) return;
    this.events[event].forEach(cb => {
      try {
        cb(...args);
      } catch (err) {
        logger.error('Event handler error:', err);
      }
    });
  }
}

// 全局事件总线
export const events = new EventEmitter();
