/**
 * API 客户端 - 封装 fetch 请求
 */

import { API_BASE_URL } from '../core/config.js';
import { logger } from '../core/logger.js';
import { t, translateApiError } from '../core/i18n.js';

// 请求拦截器
const requestInterceptors = [];
// 响应拦截器
const responseInterceptors = [];

// 添加拦截器
export function addInterceptor({ request, response }) {
  if (request) requestInterceptors.push(request);
  if (response) responseInterceptors.push(response);
}

// 基础请求
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // 默认配置
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };
  
  // 应用请求拦截器
  let finalConfig = config;
  for (const interceptor of requestInterceptors) {
    finalConfig = await interceptor(finalConfig) || finalConfig;
  }
  
  try {
    logger.debug('API Request:', url, finalConfig);
    const response = await fetch(url, finalConfig);
    
    // 应用响应拦截器
    let finalResponse = response;
    for (const interceptor of responseInterceptors) {
      finalResponse = await interceptor(finalResponse) || finalResponse;
    }
    
    // 处理错误
    if (!finalResponse.ok) {
      const error = await finalResponse.json().catch(() => ({ message: 'Request failed' }));
      const raw = error.error || error.message || `HTTP ${finalResponse.status}`;
      const msg = translateApiError(raw);
      if (finalResponse.status === 403 && url.includes('/api/') && !API_BASE_URL) {
        throw new Error(`${msg} — ${t('error.api_proxy_hint')}`);
      }
      throw new Error(msg);
    }
    
    // 204 No Content
    if (finalResponse.status === 204) {
      return null;
    }
    
    return await finalResponse.json();
  } catch (error) {
    logger.error('API Error:', error);
    throw error;
  }
}

// HTTP 方法封装
export const api = {
  get: (endpoint, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return request(url, { method: 'GET' });
  },
  
  post: (endpoint, data) => {
    return request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  
  put: (endpoint, data) => {
    return request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  
  delete: (endpoint) => {
    return request(endpoint, { method: 'DELETE' });
  },
  
  // 上传文件
  upload: (endpoint, formData) => {
    return request(endpoint, {
      method: 'POST',
      body: formData,
      headers: {} // 让浏览器自动设置 Content-Type
    });
  }
};

// 添加认证拦截器
addInterceptor({
  request: (config) => {
    const token = localStorage.getItem('cleartalk_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  }
});

// 添加错误处理拦截器
addInterceptor({
  response: (response) => {
    if (response.status === 401) {
      // 清除 token，触发重新登录
      localStorage.removeItem('cleartalk_token');
      localStorage.removeItem('cleartalk_user');
      // 可以在这里触发全局登录事件
    }
    return response;
  }
});

export default api;
