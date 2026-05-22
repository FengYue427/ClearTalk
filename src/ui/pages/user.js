/**
 * 用户中心页 - 完整认证系统
 * 支持：账号密码登录、邮箱验证码登录、注册、忘记密码、重置密码
 */

import { state, subscribe } from '../../core/state.js';
import { Storage } from '../../core/storage.js';
import { triggerHaptic, events, isOnline } from '../../core/utils.js';
import { UserService } from '../../services/user-service.js';
import { showToast, showConfirm, showModal } from '../components/index.js';
import { navigateTo } from './router.js';
import { t } from '../../core/i18n.js';
import { getLegalPageUrl } from '../../core/legal-urls.js';

// 页面状态
let currentMode = 'login'; // 'login', 'register', 'code-login', 'forgot-password'
let isLoginMode = true;
let countdownTimer = null;

// 语言变化取消订阅函数
let userLanguageUnsubscribe = null;

function getPasswordResetParams() {
  const search = new URLSearchParams(window.location.search);
  if (search.get('token') && search.get('email')) {
    return { token: search.get('token'), email: search.get('email') };
  }
  const hash = window.location.hash || '';
  const qIndex = hash.indexOf('?');
  if (qIndex >= 0) {
    const hashParams = new URLSearchParams(hash.slice(qIndex + 1));
    return { token: hashParams.get('token'), email: hashParams.get('email') };
  }
  return { token: null, email: null };
}

// ========== 初始化 ==========

export function initUser() {
  const page = document.getElementById('page-user');
  if (!page) return;

  // 如果已有语言监听，先取消
  if (userLanguageUnsubscribe) {
    userLanguageUnsubscribe();
    userLanguageUnsubscribe = null;
  }

  page.innerHTML = '';
  
  // 检查是否是重置密码页面（支持 /?token= 与 #/user?token=）
  const { token: resetToken, email: resetEmail } = getPasswordResetParams();
  
  if (resetToken && resetEmail) {
    renderResetPasswordPage(page, resetEmail, resetToken);
    return;
  }
  
  // 根据登录状态或离线模式渲染内容
  const isLoggedIn = UserService.isLoggedIn();
  const isOfflineMode = Storage.getSetting('offlineMode', false) || state.offlineUser;
  
  // 渲染头部
  renderHeader(page, isLoggedIn || isOfflineMode);
  
  // 渲染内容
  if (isLoggedIn || isOfflineMode) {
    renderLoggedInContent(page, !isLoggedIn);
  } else {
    renderAuthPage(page);
  }

  // 监听语言变化
  userLanguageUnsubscribe = () => {
    events.off('language:changed', handleUserLanguageChange);
  };
  events.on('language:changed', handleUserLanguageChange);

  // 页面销毁时取消订阅
  page._unsubscribe = () => {
    if (userLanguageUnsubscribe) {
      userLanguageUnsubscribe();
      userLanguageUnsubscribe = null;
    }
  };
}

// 语言变化处理函数
function handleUserLanguageChange() {
  const page = document.getElementById('page-user');
  if (page && page.classList.contains('active')) {
    initUser();
  }
}

// ========== 头部 ==========

function renderHeader(container, showSettings = false) {
  const isLoggedIn = UserService.isLoggedIn();
  const isOfflineMode = Storage.getSetting('offlineMode', false);
  const shouldShowSettings = showSettings || isLoggedIn || isOfflineMode;
  
  const header = document.createElement('header');
  header.className = 'header';
  header.innerHTML = `
    <button class="btn-icon" id="btn-back" title="${t('nav.back')}">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 12H5M12 19l-7-7 7-7"/>
      </svg>
    </button>
    <h1>${t('user.title')}</h1>
    ${shouldShowSettings ? `
      <button class="btn-icon" id="btn-settings" title="${t('nav.settings')}">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
        </svg>
      </button>
    ` : '<div></div>'}
  `;
  
  header.querySelector('#btn-back')?.addEventListener('click', () => navigateTo('home'));
  header.querySelector('#btn-settings')?.addEventListener('click', () => navigateTo('settings'));
  
  container.appendChild(header);
}

// ========== 认证页面（登录/注册/验证码登录/忘记密码） ==========

function renderAuthPage(container) {
  const content = document.createElement('div');
  content.className = 'auth-content';
  
  // 根据当前模式渲染不同内容
  switch (currentMode) {
    case 'login':
      content.innerHTML = renderLoginForm();
      break;
    case 'code-login':
      content.innerHTML = renderCodeLoginForm();
      break;
    case 'register':
      content.innerHTML = renderRegisterForm();
      break;
    case 'forgot-password':
      content.innerHTML = renderForgotPasswordForm();
      break;
  }
  
  container.appendChild(content);
  
  // 绑定事件
  bindAuthEvents(content);
}

// 账号密码登录表单
function renderLoginForm() {
  return `
    <div class="auth-welcome">
      <div class="auth-logo">🎯</div>
      <h2 class="auth-title">${t('user.welcome.back')}</h2>
      <p class="auth-subtitle">${t('user.login.subtitle')}</p>
    </div>
    
    <div class="auth-tabs">
      <button class="auth-tab active" data-mode="login">${t('user.tab.login')}</button>
      <button class="auth-tab" data-mode="code-login">${t('user.tab.code')}</button>
    </div>
    
    <form class="auth-form" id="auth-form">
      <div class="auth-error" id="auth-error" style="display: none;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span id="auth-error-text"></span>
      </div>
      
      <div class="form-group">
        <label>${t('user.field.login.username')}</label>
        <div class="input-wrapper">
          <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          <input type="text" name="username" required placeholder="${t('user.field.login.username.placeholder')}" autocomplete="username">
        </div>
      </div>
      
      <div class="form-group">
        <label>${t('user.field.password')}</label>
        <div class="input-wrapper">
          <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0110 0v4"/>
          </svg>
          <input type="password" name="password" required placeholder="${t('user.field.login.password.placeholder')}" minlength="6" autocomplete="current-password">
          <button type="button" class="btn-toggle-password" id="btn-toggle-password">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
        </div>
      </div>
      
      <div class="form-options">
        <label class="checkbox-label">
          <input type="checkbox" name="rememberMe" id="remember-me" checked>
          <span class="checkmark"></span>
          <span>${t('user.button.remember.me')}</span>
        </label>
        <button type="button" class="btn-forgot-password" id="btn-forgot-password">${t('user.button.forgot.password')}</button>
      </div>
      
      <button type="submit" class="btn btn-primary btn-large btn-submit" id="btn-submit">
        <span class="btn-text">${t('user.button.login')}</span>
        <span class="btn-loading" style="display: none;">
          <svg class="spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
          </svg>
          ${t('user.button.logging.in')}
        </span>
      </button>
    </form>
    
    <div class="auth-footer">
      <span class="auth-footer-text">${t('user.link.no.account')}</span>
      <button class="btn-link" id="btn-switch-mode">${t('user.link.register.now')}</button>
    </div>
    
    <div class="offline-mode-section">
      <div class="divider"><span>${t('user.or.divider')}</span></div>
      <button class="btn btn-secondary btn-large" id="btn-offline-mode">
        📱 ${t('user.offline.title')}
      </button>
      <p class="offline-mode-desc">${t('user.offline.desc')}</p>
    </div>
  `;
}

// 验证码登录表单
function renderCodeLoginForm() {
  return `
    <div class="auth-welcome">
      <div class="auth-logo">📧</div>
      <h2 class="auth-title">${t('user.tab.code')}</h2>
      <p class="auth-subtitle">${t('user.login.subtitle')}</p>
    </div>
    
    <div class="auth-tabs">
      <button class="auth-tab" data-mode="login">${t('user.tab.login')}</button>
      <button class="auth-tab active" data-mode="code-login">${t('user.tab.code')}</button>
    </div>
    
    <form class="auth-form" id="code-login-form">
      <div class="auth-error" id="auth-error" style="display: none;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span id="auth-error-text"></span>
      </div>
      
      <div class="form-group">
        <label>${t('user.field.email')}</label>
        <div class="input-wrapper">
          <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
          <input type="email" name="email" id="code-email" required placeholder="${t('user.field.email.placeholder')}">
        </div>
      </div>
      
      <div class="form-group">
        <label>${t('user.field.code')}</label>
        <div class="input-wrapper code-input-wrapper">
          <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0110 0v4"/>
          </svg>
          <input type="text" name="code" required placeholder="${t('user.field.code.placeholder')}" maxlength="6" pattern="[0-9]{6}">
          <button type="button" class="btn-send-code" id="btn-send-code">${t('user.button.send.code')}</button>
        </div>
      </div>
      
      <button type="submit" class="btn btn-primary btn-large btn-submit" id="btn-submit">
        <span class="btn-text">${t('user.button.login')}</span>
        <span class="btn-loading" style="display: none;">
          <svg class="spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
          </svg>
          ${t('user.button.logging.in')}
        </span>
      </button>
    </form>
    
    <div class="auth-footer">
      <span class="auth-footer-text">${t('user.link.no.account')}</span>
      <button class="btn-link" id="btn-switch-register">${t('user.link.register.now')}</button>
    </div>
    
    <div class="offline-mode-section">
      <div class="divider"><span>${t('user.or.divider')}</span></div>
      <button class="btn btn-secondary btn-large" id="btn-offline-mode">
        📱 ${t('user.offline.title')}
      </button>
    </div>
  `;
}

// 注册表单
function renderRegisterForm() {
  return `
    <div class="auth-welcome">
      <div class="auth-logo">📝</div>
      <h2 class="auth-title">${t('user.create.account')}</h2>
      <p class="auth-subtitle">${t('user.register.subtitle')}</p>
    </div>
    
    <form class="auth-form" id="register-form">
      <div class="auth-error" id="auth-error" style="display: none;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span id="auth-error-text"></span>
      </div>
      
      <div class="form-group">
        <label>${t('user.field.username')}</label>
        <div class="input-wrapper">
          <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          <input type="text" name="username" required placeholder="${t('user.field.username.placeholder')}" minlength="2" maxlength="20">
          <span class="input-status" id="username-status"></span>
        </div>
        <span class="input-hint">Supports Chinese, letters, numbers, underscores</span>
      </div>
      
      <div class="form-group">
        <label>${t('user.field.email')}</label>
        <div class="input-wrapper">
          <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
          <input type="email" name="email" required placeholder="${t('user.field.email.placeholder')}">
          <span class="input-status" id="email-status"></span>
        </div>
      </div>
      
      <div class="form-group">
        <label>${t('user.field.password')}</label>
        <div class="input-wrapper">
          <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0110 0v4"/>
          </svg>
          <input type="password" name="password" required placeholder="${t('user.field.password.placeholder')}" minlength="6" id="password-input">
          <button type="button" class="btn-toggle-password" id="btn-toggle-password">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
        </div>
        <div class="password-strength" id="password-strength">
          <div class="strength-bar"></div>
          <span class="strength-text">${t('user.password.strength')}</span>
        </div>
      </div>
      
      <div class="form-group">
        <label>${t('user.field.confirm.password')}</label>
        <div class="input-wrapper">
          <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0110 0v4"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          <input type="password" name="confirmPassword" required placeholder="${t('user.field.confirm.placeholder')}" minlength="6">
          <span class="input-status" id="confirm-status"></span>
        </div>
      </div>
      
      <p class="auth-legal">
        ${t('user.register.legal')}
        <a href="${getLegalPageUrl('/privacy.html')}" target="_blank" rel="noopener">${t('settings.privacy')}</a>
        ·
        <a href="${getLegalPageUrl('/terms.html')}" target="_blank" rel="noopener">${t('settings.terms')}</a>
        ·
        <a href="${getLegalPageUrl('/disclaimer.html')}" target="_blank" rel="noopener">${t('settings.disclaimer')}</a>
      </p>

      <button type="submit" class="btn btn-primary btn-large btn-submit" id="btn-submit">
        <span class="btn-text">${t('user.button.register')}</span>
        <span class="btn-loading" style="display: none;">
          <svg class="spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
          </svg>
          ${t('user.button.registering')}
        </span>
      </button>
    </form>
    
    <div class="auth-footer">
      <span class="auth-footer-text">${t('user.link.has.account')}</span>
      <button class="btn-link" id="btn-switch-login">${t('user.link.login.now')}</button>
    </div>
  `;
}

// 忘记密码表单
function renderForgotPasswordForm() {
  return `
    <div class="auth-welcome">
      <div class="auth-logo">🔐</div>
      <h2 class="auth-title">${t('forgot.title')}</h2>
      <p class="auth-subtitle">${t('forgot.subtitle')}</p>
    </div>
    
    <form class="auth-form" id="forgot-form">
      <div class="auth-error" id="auth-error" style="display: none;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span id="auth-error-text"></span>
      </div>
      
      <div class="success-message" id="success-message" style="display: none;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <span id="success-text"></span>
      </div>
      
      <div class="form-group">
        <label>${t('forgot.field.email')}</label>
        <div class="input-wrapper">
          <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
          <input type="email" name="email" required placeholder="${t('user.field.email.placeholder')}">
        </div>
      </div>
      
      <button type="submit" class="btn btn-primary btn-large btn-submit" id="btn-submit">
        <span class="btn-text">${t('forgot.button.send')}</span>
        <span class="btn-loading" style="display: none;">
          <svg class="spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
          </svg>
          ${t('user.button.sending')}
        </span>
      </button>
    </form>
    
    <div class="auth-footer">
      <button class="btn-link" id="btn-back-login">← ${t('forgot.back.login')}</button>
    </div>
  `;
}

// 重置密码页面
async function renderResetPasswordPage(container, email, token) {
  renderHeader(container, false);
  
  const content = document.createElement('div');
  content.className = 'auth-content';
  
  // 验证令牌
  const verifyResult = await UserService.verifyResetToken(email, token);
  
  if (!verifyResult.valid) {
    content.innerHTML = `
      <div class="auth-welcome">
        <div class="auth-logo">${t('auth.error.token.expired.icon')}</div>
        <h2 class="auth-title">${t('auth.error.token.expired')}</h2>
        <p class="auth-subtitle">${t('auth.error.invalid.code')}</p>
      </div>
      <div class="auth-footer" style="margin-top: 40px;">
        <button class="btn btn-primary btn-large" id="btn-retry">${t('forgot.button.send')}</button>
      </div>
    `;
    content.querySelector('#btn-retry')?.addEventListener('click', () => {
      currentMode = 'forgot-password';
      navigateTo('user');
    });
    container.appendChild(content);
    return;
  }
  
  content.innerHTML = `
    <div class="auth-welcome">
      <div class="auth-logo">${t('reset.icon')}</div>
      <h2 class="auth-title">${t('reset.title')}</h2>
      <p class="auth-subtitle">${t('reset.subtitle')}</p>
    </div>
    
    <form class="auth-form" id="reset-form">
      <div class="auth-error" id="auth-error" style="display: none;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span id="auth-error-text"></span>
      </div>
      
      <div class="form-group">
        <label>${t('reset.field.new.password')}</label>
        <div class="input-wrapper">
          <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0110 0v4"/>
          </svg>
          <input type="password" name="newPassword" required placeholder="${t('user.field.password.placeholder')}" minlength="6" id="new-password">
          <button type="button" class="btn-toggle-password" id="btn-toggle-password">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
        </div>
        <div class="password-strength" id="password-strength">
          <div class="strength-bar"></div>
          <span class="strength-text">${t('user.password.strength')}</span>
        </div>
      </div>
      
      <div class="form-group">
        <label>${t('reset.field.confirm')}</label>
        <div class="input-wrapper">
          <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0110 0v4"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          <input type="password" name="confirmPassword" required placeholder="${t('user.field.confirm.placeholder')}" minlength="6">
        </div>
      </div>
      
      <button type="submit" class="btn btn-primary btn-large btn-submit" id="btn-submit">
        <span class="btn-text">${t('reset.button.reset')}</span>
        <span class="btn-loading" style="display: none;">
          <svg class="spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
          </svg>
          ${t('loading')}...
        </span>
      </button>
    </form>
  `;
  
  // 绑定事件
  content.querySelector('#reset-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAuthError();
    setLoading(true);
    
    const formData = new FormData(e.target);
    const newPassword = formData.get('newPassword');
    const confirmPassword = formData.get('confirmPassword');
    
    if (newPassword !== confirmPassword) {
      showAuthError(t('auth.error.password.mismatch'));
      setLoading(false);
      return;
    }
    
    const result = await UserService.resetPassword(email, token, newPassword);
    
    if (result.success) {
      showToast('✅ ' + t('reset.success') + ', ' + t('auth.login.success'));
      setTimeout(() => {
        currentMode = 'login';
        navigateTo('user');
      }, 1500);
    } else {
      showAuthError(result.error || t('auth.error.reset.failed'));
    }
    
    setLoading(false);
  });
  
  // 密码显示切换
  content.querySelector('#btn-toggle-password')?.addEventListener('click', function() {
    const input = content.querySelector('#new-password');
    togglePasswordVisibility(this, input);
  });
  
  // 密码强度检测
  content.querySelector('#new-password')?.addEventListener('input', (e) => {
    updatePasswordStrength(e.target.value, content);
  });
  
  container.appendChild(content);
}

// ========== 事件绑定 ==========

function bindAuthEvents(content) {
  // 标签切换
  content.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      currentMode = tab.dataset.mode;
      initUser();
    });
  });
  
  // 模式切换
  content.querySelector('#btn-switch-mode')?.addEventListener('click', () => {
    currentMode = 'register';
    initUser();
  });
  
  content.querySelector('#btn-switch-login')?.addEventListener('click', () => {
    currentMode = 'login';
    initUser();
  });
  
  content.querySelector('#btn-switch-register')?.addEventListener('click', () => {
    currentMode = 'register';
    initUser();
  });
  
  // 忘记密码
  content.querySelector('#btn-forgot-password')?.addEventListener('click', () => {
    currentMode = 'forgot-password';
    initUser();
  });
  
  content.querySelector('#btn-back-login')?.addEventListener('click', () => {
    currentMode = 'login';
    initUser();
  });
  
  // 密码显示切换
  content.querySelector('#btn-toggle-password')?.addEventListener('click', function() {
    const input = content.querySelector('input[name="password"], input[name="newPassword"]');
    togglePasswordVisibility(this, input);
  });
  
  // 表单提交
  content.querySelector('#auth-form')?.addEventListener('submit', handlePasswordLogin);
  content.querySelector('#code-login-form')?.addEventListener('submit', handleCodeLogin);
  content.querySelector('#register-form')?.addEventListener('submit', handleRegister);
  content.querySelector('#forgot-form')?.addEventListener('submit', handleForgotPassword);
  
  // 发送验证码
  content.querySelector('#btn-send-code')?.addEventListener('click', handleSendCode);
  
  // 离线模式
  content.querySelector('#btn-offline-mode')?.addEventListener('click', enableOfflineMode);
  
  // 实时验证
  setupRealtimeValidation(content);
}

// 密码显示切换
function togglePasswordVisibility(btn, input) {
  if (!input) return;
  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';
  
  btn.innerHTML = isPassword ? `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ` : `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  `;
}

// 实时验证
function setupRealtimeValidation(content) {
  // 用户名验证
  content.querySelector('input[name="username"]')?.addEventListener('input', (e) => {
    const status = content.querySelector('#username-status');
    const value = e.target.value.trim();
    if (!status) return;
    if (value.length >= 2) {
      if (isValidUsername(value)) {
        status.innerHTML = '✓';
        status.className = 'input-status valid';
      } else {
        status.innerHTML = '✗';
        status.className = 'input-status invalid';
      }
    } else {
      status.innerHTML = '';
    }
  });
  
  // 邮箱验证
  content.querySelector('input[name="email"]')?.addEventListener('input', (e) => {
    const status = content.querySelector('#email-status');
    const value = e.target.value.trim();
    if (!status) return;
    if (value.length > 0) {
      if (isValidEmail(value)) {
        status.innerHTML = '✓';
        status.className = 'input-status valid';
      } else {
        status.innerHTML = '✗';
        status.className = 'input-status invalid';
      }
    } else {
      status.innerHTML = '';
    }
  });
  
  // 密码强度
  content.querySelector('#password-input, #new-password')?.addEventListener('input', (e) => {
    updatePasswordStrength(e.target.value, content);
  });
  
  // 确认密码
  content.querySelector('input[name="confirmPassword"]')?.addEventListener('input', (e) => {
    const password = content.querySelector('input[name="password"], input[name="newPassword"]')?.value || '';
    const status = content.querySelector('#confirm-status');
    const value = e.target.value;
    if (!status) return;
    
    if (value.length > 0) {
      if (value === password) {
        status.innerHTML = '✓';
        status.className = 'input-status valid';
      } else {
        status.innerHTML = '✗';
        status.className = 'input-status invalid';
      }
    } else {
      status.innerHTML = '';
    }
  });
}

// 密码强度更新
function updatePasswordStrength(value, container) {
  const strengthEl = container.querySelector('#password-strength');
  const barEl = strengthEl?.querySelector('.strength-bar');
  const textEl = strengthEl?.querySelector('.strength-text');
  
  if (strengthEl && value.length > 0) {
    let strength = 0;
    if (value.length >= 6) strength++;
    if (value.length >= 8) strength++;
    if (/[a-z]/.test(value) && /[A-Z]/.test(value)) strength++;
    if (/\d/.test(value)) strength++;
    if (/[^a-zA-Z0-9]/.test(value)) strength++;
    
    const colors = ['#ff4d4f', '#ff7a45', '#ffa940', '#73d13d', '#52c41a'];
    const texts = [t('user.password.weak'), t('user.password.fair'), t('user.password.good'), t('user.password.strong'), t('user.password.very.strong')];
    
    barEl.style.width = `${(strength / 5) * 100}%`;
    barEl.style.backgroundColor = colors[strength - 1] || '#ff4d4f';
    textEl.textContent = `${t('user.password.strength')}: ${texts[strength - 1] || t('user.password.weak')}`;
    textEl.style.color = colors[strength - 1] || '#ff4d4f';
  }
}

// ========== 表单提交处理 ==========

// 账号密码登录
async function handlePasswordLogin(e) {
  e.preventDefault();
  hideAuthError();
  setLoading(true);
  
  const formData = new FormData(e.target);
  const username = formData.get('username').trim();
  const password = formData.get('password');
  
  if (!username || !password) {
    showAuthError(t('auth.error.empty.fields'));
    setLoading(false);
    return;
  }
  
  const result = await UserService.login({ username, password });
  
  if (result.success) {
    showToast('✅ ' + t('auth.login.success'));
    initUser();
  } else {
    if (result.error?.includes('401')) {
      showAuthError('❌ ' + t('auth.error.user.not.found'));
    } else if (result.error?.includes('404') || result.error?.includes('Failed to fetch')) {
      showAuthError('⚠️ ' + t('error.network'));
    } else {
      showAuthError('❌ ' + result.error);
    }
  }
  
  setLoading(false);
}

// 发送验证码
async function handleSendCode() {
  const emailInput = document.querySelector('#code-email');
  const email = emailInput?.value.trim();
  
  if (!email || !isValidEmail(email)) {
    showAuthError(t('auth.error.invalid.email'));
    return;
  }
  
  const btn = document.querySelector('#btn-send-code');
  btn.disabled = true;
  
  const result = await UserService.sendVerificationCode(email, 'login');
  
  if (result.success) {
    showToast('✅ ' + t('forgot.success'));
    if (result.code) {
      console.log('Verification code:', result.code);
    }
    
    // 倒计时
    let countdown = 60;
    countdownTimer = setInterval(() => {
      btn.textContent = `${countdown}s`;
      countdown--;
      if (countdown < 0) {
        clearInterval(countdownTimer);
        btn.disabled = false;
        btn.textContent = t('user.button.send.code');
      }
    }, 1000);
  } else {
    showAuthError('❌ ' + result.error);
    btn.disabled = false;
  }
}

// 验证码登录
async function handleCodeLogin(e) {
  e.preventDefault();
  hideAuthError();
  setLoading(true);
  
  const formData = new FormData(e.target);
  const email = formData.get('email').trim();
  const code = formData.get('code').trim();
  
  if (!email || !code) {
    showAuthError(t('auth.error.empty.fields'));
    setLoading(false);
    return;
  }
  
  const result = await UserService.verifyCodeAndLogin(email, code);
  
  if (result.success) {
    showToast(result.isNewUser ? '✅ ' + t('auth.register.success') : '✅ ' + t('auth.login.success'));
    initUser();
  } else {
    showAuthError('❌ ' + result.error);
  }
  
  setLoading(false);
}

// 注册
async function handleRegister(e) {
  e.preventDefault();
  hideAuthError();
  setLoading(true);
  
  const formData = new FormData(e.target);
  const username = formData.get('username').trim();
  const email = formData.get('email').trim();
  const password = formData.get('password');
  const confirmPassword = formData.get('confirmPassword');
  
  // 验证
  if (!username || !email || !password) {
    showAuthError(t('auth.error.empty.fields'));
    setLoading(false);
    return;
  }
  
  if (!isValidUsername(username)) {
    showAuthError(t('auth.error.invalid.username'));
    setLoading(false);
    return;
  }
  
  if (!isValidEmail(email)) {
    showAuthError(t('auth.error.invalid.email'));
    setLoading(false);
    return;
  }
  
  if (password !== confirmPassword) {
    showAuthError(t('auth.error.password.mismatch'));
    setLoading(false);
    return;
  }
  
  const result = await UserService.register({ username, email, password });
  
  if (result.success) {
    showToast('✅ ' + t('auth.register.success'));
    initUser();
  } else {
    showAuthError('❌ ' + result.error);
  }
  
  setLoading(false);
}

// 忘记密码
async function handleForgotPassword(e) {
  e.preventDefault();
  hideAuthError();
  hideSuccessMessage();
  setLoading(true);
  
  const formData = new FormData(e.target);
  const email = formData.get('email').trim();
  
  if (!email || !isValidEmail(email)) {
    showAuthError(t('auth.error.invalid.email'));
    setLoading(false);
    return;
  }
  
  const result = await UserService.forgotPassword(email);
  
  if (result.success) {
    showSuccessMessage(result.message);
    if (result.resetUrl) {
      console.log('Reset URL:', result.resetUrl);
    }
  } else {
    showAuthError('❌ ' + result.error);
  }
  
  setLoading(false);
}

// ========== 工具函数 ==========

function showAuthError(message) {
  const errorEl = document.querySelector('#auth-error');
  const errorTextEl = document.querySelector('#auth-error-text');
  if (errorEl && errorTextEl) {
    errorTextEl.textContent = message;
    errorEl.style.display = 'flex';
    setTimeout(() => {
      errorEl.style.display = 'none';
    }, 5000);
  }
}

function hideAuthError() {
  const errorEl = document.querySelector('#auth-error');
  if (errorEl) errorEl.style.display = 'none';
}

function showSuccessMessage(message) {
  const el = document.querySelector('#success-message');
  const textEl = document.querySelector('#success-text');
  if (el && textEl) {
    textEl.textContent = message;
    el.style.display = 'flex';
  }
}

function hideSuccessMessage() {
  const el = document.querySelector('#success-message');
  if (el) el.style.display = 'none';
}

function setLoading(loading) {
  const btnText = document.querySelector('#btn-submit .btn-text');
  const btnLoading = document.querySelector('#btn-submit .btn-loading');
  const submitBtn = document.querySelector('#btn-submit');
  
  if (btnText && btnLoading && submitBtn) {
    if (loading) {
      btnText.style.display = 'none';
      btnLoading.style.display = 'flex';
      submitBtn.disabled = true;
    } else {
      btnText.style.display = 'block';
      btnLoading.style.display = 'none';
      submitBtn.disabled = false;
    }
  }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidUsername(username) {
  return /^[a-zA-Z0-9_\u4e00-\u9fa5]{2,20}$/.test(username);
}

// ========== 已登录内容 ==========

function renderLoggedInContent(container, isOfflineMode = false) {
  // ... 保持原有已登录内容不变
  let user = isOfflineMode ? state.offlineUser : UserService.getCurrentUser();
  
  if (!user) {
    user = { username: t('user.offline.mode'), email: 'local@offline' };
  }
  
  const content = document.createElement('div');
  content.className = 'user-content';
  
  content.innerHTML = `
    <div class="user-profile-card">
      <div class="user-avatar">${user.username?.[0]?.toUpperCase() || 'U'}</div>
      <div class="user-info">
        <h2>${user.username}</h2>
        <p>${user.email || ''}</p>
        ${isOfflineMode ? `<span class="badge badge-offline">${t('user.offline.mode')}</span>` : `<span class="badge badge-online">${t('user.logged.in')}</span>`}
      </div>
    </div>
    
    <div class="user-sections">
      <div class="user-section">
        <h3>${t('user.quick.phrases')}</h3>
        <div class="phrase-list" id="phrase-list"></div>
        <button class="btn btn-secondary" id="btn-add-phrase">+ ${t('user.add.phrase')}</button>
      </div>
      
      ${!isOfflineMode ? `
        <div class="user-section">
          <h3>${t('user.cloud.sync')}</h3>
          <div class="sync-status" id="sync-status">
            <span class="sync-icon">☁️</span>
            <span>${t('user.last.sync')}: ${Storage.get('lastSyncTime') ? new Date(Storage.get('lastSyncTime')).toLocaleString() : t('user.never.synced')}</span>
          </div>
          <button class="btn btn-primary" id="btn-sync-now">${t('user.sync.now')}</button>
          <button class="btn btn-secondary" id="btn-sync-settings">${t('user.sync.settings')}</button>
        </div>
      ` : `
        <div class="user-section">
          <h3>Local Data</h3>
          <button class="btn btn-primary" id="btn-export-data">${t('user.export.data')}</button>
        </div>
      `}
      
      <div class="user-section danger-zone">
        <h3>${t('user.account.actions')}</h3>
        <button class="btn btn-danger" id="btn-logout">${isOfflineMode ? t('user.exit.offline') : t('user.logout')}</button>
      </div>
    </div>
  `;
  
  // 绑定事件
  content.querySelector('#btn-add-phrase')?.addEventListener('click', showAddPhraseModal);
  content.querySelector('#btn-logout')?.addEventListener('click', isOfflineMode ? exitOfflineMode : handleLogout);
  content.querySelector('#btn-sync-now')?.addEventListener('click', syncNow);
  content.querySelector('#btn-sync-settings')?.addEventListener('click', () => navigateTo('settings'));
  content.querySelector('#btn-export-data')?.addEventListener('click', exportOfflineData);
  
  // 渲染短语列表
  const phraseList = content.querySelector('#phrase-list');
  if (phraseList) renderPhrases(phraseList);
  
  container.appendChild(content);
}

// ========== 其他函数 ==========

function enableOfflineMode() {
  Storage.setSetting('offlineMode', true);
  state.offlineUser = {
    id: 'offline',
    username: t('user.offline.mode'),
    email: 'local@offline'
  };
  showToast('✅ ' + t('user.offline.mode'));
  initUser();
}

function exitOfflineMode() {
  showConfirm({
    title: t('user.exit.offline'),
    message: 'Local data will be preserved',
    onConfirm: () => {
      Storage.setSetting('offlineMode', false);
      state.offlineUser = null;
      currentMode = 'login';
      showToast(t('user.exit.offline'));
      initUser();
    }
  });
}

function handleLogout() {
  showConfirm({
    title: t('user.logout'),
    message: 'Are you sure you want to logout?',
    onConfirm: () => {
      UserService.logout();
      showToast(t('auth.logout.success'));
      initUser();
    }
  });
}

async function syncNow() {
  showToast(t('sync.uploading'));
  const { SyncService } = await import('../../services/sync-service.js');
  const result = await SyncService.syncToCloud();
  
  if (result.success) {
    showToast('✅ ' + t('sync.success'));
    initUser();
  } else {
    showToast('❌ ' + t('sync.failed') + ': ' + result.error);
  }
}

function exportOfflineData() {
  const data = {
    history: Storage.get('cleartalk_history') || [],
    customScenes: Storage.get('cleartalk_custom_scenes') || [],
    settings: Storage.get('cleartalk_settings') || {}
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cleartalk-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  
  showToast('✅ ' + t('toast.saved'));
}

// 快捷短语功能
function renderPhrases(container) {
  const phrases = Storage.get('cleartalk_phrases') || [];
  
  if (phrases.length === 0) {
    container.innerHTML = `<p class="empty-hint">${t('user.no.phrases')}</p>`;
    return;
  }
  
  container.innerHTML = phrases.map((phrase, index) => `
    <div class="phrase-item">
      <span class="phrase-text">${phrase}</span>
      <button class="btn-delete-phrase" data-index="${index}">×</button>
    </div>
  `).join('');
  
  container.querySelectorAll('.btn-delete-phrase').forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.dataset.index);
      phrases.splice(index, 1);
      Storage.set('cleartalk_phrases', phrases);
      renderPhrases(container);
    });
  });
}

function showAddPhraseModal() {
  const maxLength = 200;

  showModal({
    title: t('user.add.phrase'),
    content: `
      <div class="phrase-form">
        <div class="form-field">
          <label for="phrase-input">${t('dialogue.phrase.content')}</label>
          <textarea
            id="phrase-input"
            class="phrase-textarea"
            rows="4"
            maxlength="${maxLength}"
            placeholder="${t('dialogue.phrase.placeholder')}"
          ></textarea>
          <div class="char-counter"><span id="char-count">0</span> / ${maxLength}</div>
        </div>
      </div>
    `,
    onOpen: () => {
      const textarea = document.getElementById('phrase-input');
      const counter = document.getElementById('char-count');

      textarea?.focus();

      textarea?.addEventListener('input', () => {
        const len = textarea.value.length;
        counter.textContent = len;
        if (len > maxLength * 0.9) {
          counter.parentElement.classList.add('near-limit');
        } else {
          counter.parentElement.classList.remove('near-limit');
        }
      });
    },
    actions: [
      {
        label: t('common.cancel'),
        onClick: () => {}
      },
      {
        label: t('common.confirm'),
        primary: true,
        onClick: () => {
          const input = document.getElementById('phrase-input');
          const text = input?.value.trim();

          if (!text) {
            showToast(t('scene.info.empty.fields'), 'error');
            return false;
          }

          const phrases = Storage.get('cleartalk_phrases') || [];
          if (phrases.includes(text)) {
            showToast(t('common.duplicate'), 'warning');
            return false;
          }

          phrases.unshift(text);
          Storage.set('cleartalk_phrases', phrases);

          const container = document.querySelector('#phrase-list');
          if (container) renderPhrases(container);

          showToast('✅ ' + t('user.phrase.added'));
          return true;
        }
      }
    ]
  });
}

// 清理倒计时
window.addEventListener('beforeunload', () => {
  if (countdownTimer) clearInterval(countdownTimer);
});
