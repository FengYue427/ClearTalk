/**
 * 用户服务 - 认证、登录、注册
 */

import { api } from './api-client.js';
import { Storage } from '../core/storage.js';
import { state, subscribe } from '../core/state.js';
import { logger } from '../core/logger.js';
import { events } from '../core/utils.js';

// 用户状态管理
const userState = {
  currentUser: null,
  isLoggedIn: false,
  token: null
};

// 初始化加载
function init() {
  const token = Storage.get('cleartalk_token');
  const user = Storage.get('cleartalk_user');
  
  if (token && user) {
    userState.token = token;
    userState.currentUser = user;
    userState.isLoggedIn = true;
    state.user = user; // 同步到全局状态
  }
}

export const UserService = {
  // 初始化
  init,
  
  // 获取当前用户
  getCurrentUser() {
    return userState.currentUser;
  },
  
  // 检查登录状态
  isLoggedIn() {
    return userState.isLoggedIn;
  },
  
  // 获取 Token
  getToken() {
    return userState.token;
  },
  
  // 注册
  async register({ username, email, password }) {
    try {
      const result = await api.post('/api/auth/register', {
        username,
        email,
        password
      });
      
      if (result.token && result.user) {
        this._setSession(result.token, result.user);
        events.emit('user:login', result.user);
        return { success: true, user: result.user };
      }
      
      return { success: false, error: 'Registration failed' };
    } catch (error) {
      logger.error('Register failed:', error);
      return { success: false, error: error.message };
    }
  },
  
  // 登录
  async login({ username, password }) {
    try {
      const result = await api.post('/api/auth/login', {
        username,
        password
      });
      
      if (result.token && result.user) {
        this._setSession(result.token, result.user);
        events.emit('user:login', result.user);
        
        // 如果开启了自动同步，立即执行
        if (Storage.getSetting('autoSync', false)) {
          const { SyncService } = await import('./sync-service.js');
          SyncService.mergeFromCloud().catch(() => {});
        }
        
        return { success: true, user: result.user };
      }
      
      return { success: false, error: 'Login failed' };
    } catch (error) {
      logger.error('Login failed:', error);
      return { success: false, error: error.message };
    }
  },
  
  // 登出
  logout() {
    this._clearSession();
    events.emit('user:logout');
    return { success: true };
  },
  
  // 更新用户信息
  async updateProfile(updates) {
    if (!userState.isLoggedIn) {
      return { success: false, error: 'Please login first' };
    }
    
    try {
      const result = await api.put('/api/user/profile', updates);
      
      if (result.user) {
        userState.currentUser = { ...userState.currentUser, ...result.user };
        Storage.set('cleartalk_user', userState.currentUser);
        state.user = userState.currentUser;
        return { success: true, user: result.user };
      }
      
      return { success: false, error: 'Update failed' };
    } catch (error) {
      logger.error('Update profile failed:', error);
      return { success: false, error: error.message };
    }
  },
  
  // 修改密码
  async changePassword({ currentPassword, newPassword }) {
    if (!userState.isLoggedIn) {
      return { success: false, error: 'Please login first' };
    }
    
    try {
      await api.put('/api/user/password', {
        currentPassword,
        newPassword
      });
      
      return { success: true };
    } catch (error) {
      logger.error('Change password failed:', error);
      return { success: false, error: error.message };
    }
  },
  
  // ========== 邮箱验证码登录 ==========
  
  // 发送邮箱验证码
  async sendVerificationCode(email, type = 'login') {
    try {
      const result = await api.post('/api/auth/send-code', { email, type });
      return { success: true, message: result.message, code: result.code };
    } catch (error) {
      logger.error('Send verification code failed:', error);
      return { success: false, error: error.message };
    }
  },
  
  // 邮箱验证码登录/注册
  async verifyCodeAndLogin(email, code) {
    try {
      const result = await api.post('/api/auth/verify-code', { email, code });
      
      if (result.token && result.user) {
        this._setSession(result.token, result.user);
        events.emit('user:login', result.user);
        return { success: true, user: result.user, isNewUser: result.isNewUser };
      }
      
      return { success: false, error: 'Verification failed' };
    } catch (error) {
      logger.error('Verify code login failed:', error);
      return { success: false, error: error.message };
    }
  },
  
  // ========== 忘记密码 ==========
  
  // 发送密码重置链接
  async forgotPassword(email) {
    try {
      const result = await api.post('/api/auth/forgot-password', { email });
      return { success: true, message: result.message, resetUrl: result.resetUrl, token: result.token };
    } catch (error) {
      logger.error('Forgot password failed:', error);
      return { success: false, error: error.message };
    }
  },
  
  // 验证重置令牌
  async verifyResetToken(email, token) {
    try {
      const result = await api.post('/api/auth/verify-reset-token', { email, token });
      return { valid: result.valid };
    } catch (error) {
      logger.error('Verify reset token failed:', error);
      return { valid: false, error: error.message };
    }
  },
  
  // 重置密码
  async resetPassword(email, token, newPassword) {
    try {
      const result = await api.post('/api/auth/reset-password', { email, token, newPassword });
      return { success: true, message: result.message };
    } catch (error) {
      logger.error('Reset password failed:', error);
      return { success: false, error: error.message };
    }
  },
  
  // 验证 Token 是否有效
  async verifyToken() {
    if (!userState.token) return false;
    
    try {
      await api.get('/api/auth/verify');
      return true;
    } catch {
      this._clearSession();
      return false;
    }
  },
  
  // 删除账号
  async deleteAccount(password) {
    if (!userState.isLoggedIn) {
      return { success: false, error: 'Please login first' };
    }
    
    try {
      await api.post('/api/user/delete', { password });
      this._clearSession();
      return { success: true };
    } catch (error) {
      logger.error('Delete account failed:', error);
      return { success: false, error: error.message };
    }
  },
  
  // 内部：设置会话
  _setSession(token, user) {
    userState.token = token;
    userState.currentUser = user;
    userState.isLoggedIn = true;
    
    Storage.set('cleartalk_token', token);
    Storage.set('cleartalk_user', user);
    
    state.user = user;
    state.isLoggedIn = true;
  },
  
  // 内部：清除会话
  _clearSession() {
    userState.token = null;
    userState.currentUser = null;
    userState.isLoggedIn = false;
    
    Storage.remove('cleartalk_token');
    Storage.remove('cleartalk_user');
    
    state.user = null;
    state.isLoggedIn = false;
  }
};

// 快捷短语服务
export const PhraseService = {
  // 获取用户的快捷短语
  getPhrases() {
    if (!UserService.isLoggedIn()) {
      return Storage.get('cleartalk_phrases', []);
    }
    return userState.currentUser?.quickPhrases || [];
  },
  
  // 添加短语
  async addPhrase(phrase) {
    const phrases = this.getPhrases();
    
    if (phrases.some(p => p.text === phrase.text)) {
      return { success: false, error: '短语已存在' };
    }
    
    const newPhrase = {
      id: Date.now().toString(),
      text: phrase.text,
      category: phrase.category || 'default',
      createdAt: new Date().toISOString()
    };
    
    phrases.push(newPhrase);
    
    if (!UserService.isLoggedIn()) {
      Storage.set('cleartalk_phrases', phrases);
      return { success: true, phrase: newPhrase };
    }
    
    // 登录状态下同步到云端
    try {
      const result = await api.post('/api/user/phrases', { phrase: newPhrase });
      if (result.user) {
        userState.currentUser = result.user;
        Storage.set('cleartalk_user', result.user);
      }
      return { success: true, phrase: newPhrase };
    } catch (error) {
      logger.error('Add phrase failed:', error);
      return { success: false, error: error.message };
    }
  },
  
  // 删除短语
  async deletePhrase(id) {
    const phrases = this.getPhrases().filter(p => p.id !== id);
    
    if (!UserService.isLoggedIn()) {
      Storage.set('cleartalk_phrases', phrases);
      return { success: true };
    }
    
    try {
      const result = await api.delete(`/api/user/phrases/${id}`);
      if (result.user) {
        userState.currentUser = result.user;
        Storage.set('cleartalk_user', result.user);
      }
      return { success: true };
    } catch (error) {
      logger.error('Delete phrase failed:', error);
      return { success: false, error: error.message };
    }
  }
};

export default UserService;
