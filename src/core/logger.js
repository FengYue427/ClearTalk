/**
 * 日志工具 - 生产环境自动禁用
 */

const isDev = (typeof __DEV__ !== 'undefined' && __DEV__) || false;

export const logger = {
  debug: (...args) => {
    if (isDev) console.debug('[Debug]', ...args);
  },
  
  info: (...args) => {
    if (isDev) console.info('[Info]', ...args);
  },
  
  warn: (...args) => {
    console.warn('[Warn]', ...args);
  },
  
  error: (...args) => {
    console.error('[Error]', ...args);
  },
  
  group: (label) => {
    if (isDev) console.group(label);
  },
  
  groupEnd: () => {
    if (isDev) console.groupEnd();
  }
};

// 性能监控
export function perfStart(label) {
  if (isDev && performance) {
    performance.mark(`${label}-start`);
  }
}

export function perfEnd(label) {
  if (isDev && performance) {
    performance.mark(`${label}-end`);
    performance.measure(label, `${label}-start`, `${label}-end`);
    const entries = performance.getEntriesByName(label);
    if (entries.length > 0) {
      logger.info(`${label}: ${entries[entries.length - 1].duration.toFixed(2)}ms`);
    }
  }
}
