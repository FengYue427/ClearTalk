/**
 * 对话模拟页
 */

import { state } from '../../core/state.js';
import { Storage } from '../../core/storage.js';
import { AIService } from '../../services/ai-service.js';
import { logger } from '../../core/logger.js';
import { triggerHaptic, copyToClipboard, isOnline } from '../../core/utils.js';
import { showToast, showLoading, createButton, createEmptyState } from '../components/index.js';
import { navigateTo } from './router.js';
import { t } from '../../core/i18n.js';

// 人格配置 - 使用翻译键
const PERSONALITIES = {
  neutral: { key: 'neutral', translationKey: 'dialogue.personality.neutral', prompt: 'You are a neutral and rational dialogue partner.' },
  professional: { key: 'professional', translationKey: 'dialogue.personality.professional', prompt: 'You are a professional workplace communicator.' },
  friendly: { key: 'friendly', translationKey: 'dialogue.personality.friendly', prompt: 'You are a friendly and warm friend.' },
  strict: { key: 'strict', translationKey: 'dialogue.personality.strict', prompt: 'You are a strict manager with high standards.' },
  humorous: { key: 'humorous', translationKey: 'dialogue.personality.humorous', prompt: 'You are a humorous and witty partner.' }
};

// 对话状态
let isReplying = false;

// 初始化对话页
export function initDialogue() {
  const page = document.getElementById('page-dialogue');
  if (!page) return;
  
  // 清空重建
  page.innerHTML = '';
  
  // 渲染头部
  renderHeader(page);
  
  // 根据状态渲染内容
  if (!state.dialogue.isActive) {
    renderSetup(page);
  } else {
    renderThread(page);
  }
}

// 渲染头部
function renderHeader(container) {
  const header = document.createElement('header');
  header.className = 'header';
  header.innerHTML = `
    <button class="btn-icon" id="btn-back">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 12H5M12 19l-7-7 7-7"/>
      </svg>
    </button>
    <h2>${t('dialogue.title')}</h2>
    <div class="header-actions">
      <button class="btn-icon" id="btn-reset" title="${t('dialogue.restart')}">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 12"/>
        </svg>
      </button>
    </div>
  `;
  
  header.querySelector('#btn-back').addEventListener('click', () => navigateTo('home'));
  header.querySelector('#btn-reset').addEventListener('click', resetDialogue);
  
  container.appendChild(header);
}

// 渲染设置区
function renderSetup(container) {
  const setup = document.createElement('div');
  setup.className = 'dialogue-setup';
  
  // 如果有seed，显示
  const hasSeed = state.dialogue.seed || state.generatedText;
  
  setup.innerHTML = `
    <div class="setup-section">
      <label>${t('dialogue.seed')}</label>
      <textarea id="dialogue-seed" rows="4" placeholder="${t('dialogue.seed.placeholder')}">${hasSeed || ''}</textarea>
      ${hasSeed ? `<button class="btn-text" id="btn-clear-seed">${t('common.clear')}</button>` : ''}
    </div>
    
    <div class="setup-section">
      <label>${t('dialogue.personality')}</label>
      <div class="personality-grid">
        ${Object.entries(PERSONALITIES).map(([key, p]) => `
          <button class="personality-card ${key === state.dialogue.personality ? 'active' : ''}" data-key="${key}">
            <span class="personality-name">${t(p.translationKey)}</span>
            <span class="personality-desc">${t(p.translationKey + '.desc')}</span>
          </button>
        `).join('')}
      </div>
    </div>
    
    <div class="setup-section">
      <label>${t('dialogue.topic')}</label>
      <input type="text" id="dialogue-topic" placeholder="${t('dialogue.topic.placeholder')}" value="${state.dialogue.topic || ''}">
    </div>
    
    <button class="btn btn-primary btn-large" id="btn-start">
      ${t('dialogue.start')}
    </button>
  `;
  
  // 人格选择
  setup.querySelectorAll('.personality-card').forEach(card => {
    card.addEventListener('click', () => {
      setup.querySelectorAll('.personality-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      state.dialogue.personality = card.dataset.key;
      triggerHaptic();
    });
  });
  
  // 清除种子
  const clearBtn = setup.querySelector('#btn-clear-seed');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      setup.querySelector('#dialogue-seed').value = '';
      state.dialogue.seed = '';
    });
  }
  
  // 开始按钮
  setup.querySelector('#btn-start').addEventListener('click', startDialogue);
  
  container.appendChild(setup);
}

// 渲染对话线程
function renderThread(container) {
  // 对话容器
  const thread = document.createElement('div');
  thread.className = 'dialogue-thread';
  thread.id = 'dialogue-thread';
  
  // 渲染消息
  thread.innerHTML = state.dialogue.messages.map((msg, index) => `
    <div class="message ${msg.role}">
      <div class="message-avatar">${msg.role === 'user' ? t('dialogue.me') : t('dialogue.other')}</div>
      <div class="message-bubble">
        <div class="message-text">${escapeHtml(msg.content)}</div>
        ${index === state.dialogue.messages.length - 1 && msg.role === 'other' ? `
          <div class="message-actions">
            <button class="btn-text btn-copy-msg" data-index="${index}">${t('dialogue.copy')}</button>
          </div>
        ` : ''}
      </div>
    </div>
  `).join('');
  
  // 建议回复（最后一条是对方时）
  const lastMsg = state.dialogue.messages[state.dialogue.messages.length - 1];
  if (lastMsg?.role === 'other' && lastMsg.suggestions?.length > 0) {
    const suggestions = document.createElement('div');
    suggestions.className = 'message-suggestions';
    suggestions.innerHTML = `
      <label>${t('dialogue.suggestions')}</label>
      <div class="suggestion-chips">
        ${lastMsg.suggestions.map((s, i) => `
          <button class="suggestion-chip" data-index="${i}">${escapeHtml(s)}</button>
        `).join('')}
      </div>
    `;
    
    suggestions.querySelectorAll('.suggestion-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const index = parseInt(chip.dataset.index);
        const text = lastMsg.suggestions[index];
        document.getElementById('dialogue-input').value = text;
      });
    });
    
    thread.appendChild(suggestions);
  }
  
  // 绑定复制事件
  thread.querySelectorAll('.btn-copy-msg').forEach(btn => {
    btn.addEventListener('click', async () => {
      const index = parseInt(btn.dataset.index);
      const text = state.dialogue.messages[index].content;
      const success = await copyToClipboard(text);
      showToast(success ? t('dialogue.copied') : t('dialogue.copy.failed'));
    });
  });
  
  // 输入区
  const inputBar = document.createElement('div');
  inputBar.className = 'dialogue-input-bar';
  inputBar.innerHTML = `
    <div class="input-wrapper">
      <textarea id="dialogue-input" rows="1" placeholder="${t('dialogue.input.placeholder')}"></textarea>
      <button class="btn-send" id="btn-send">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="22" y1="2" x2="11" y2="13"/>
          <polygon points="22 2 15 22 11 13 2 9 22 2"/>
        </svg>
      </button>
    </div>
    <div class="input-hint">${t('dialogue.input.hint')}</div>
  `;
  
  // 自动调整高度
  const textarea = inputBar.querySelector('#dialogue-input');
  textarea.addEventListener('input', () => {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  });
  
  // 发送
  const sendBtn = inputBar.querySelector('#btn-send');
  sendBtn.addEventListener('click', () => sendMessage(sendBtn, textarea));
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(sendBtn, textarea);
    }
  });
  
  container.appendChild(thread);
  container.appendChild(inputBar);
  
  // 滚动到底部
  setTimeout(() => {
    thread.scrollTop = thread.scrollHeight;
  }, 0);
}

// 开始对话
async function startDialogue() {
  const seedEl = document.getElementById('dialogue-seed');
  const topicEl = document.getElementById('dialogue-topic');
  const seedInput = seedEl;
  
  const seed = seedEl?.value.trim() || state.generatedText;
  const topic = topicEl?.value.trim();
  
  if (!seed || !seed.trim()) {
      showToast(t('dialogue.seed.required'));
      seedInput.focus();
      return;
    }
  
  state.dialogue.seed = seed;
  state.dialogue.topic = topic;
  state.dialogue.isActive = true;
  state.dialogue.messages = [{ role: 'user', content: seed }];
  
  // 重新渲染为对话模式
  initDialogue();
  
  // 获取AI回复
  await generateReply();
}

// 设置输入区状态
function setInputState(enabled, sendBtn, textarea) {
  if (sendBtn) sendBtn.disabled = !enabled;
  if (textarea) textarea.disabled = !enabled;
}

// 发送消息
async function sendMessage(sendBtn, textarea) {
  if (isReplying) return;

  const input = document.getElementById('dialogue-input');
  const text = input?.value.trim();

  if (!text) return;

  isReplying = true;
  setInputState(false, sendBtn, textarea);

  // 添加用户消息
  state.dialogue.messages.push({ role: 'user', content: text });

  // 清空输入
  input.value = '';
  input.style.height = 'auto';

  // 重新渲染（保持输入区禁用状态）
  initDialogue();
  const newTextarea = document.getElementById('dialogue-input');
  const newSendBtn = document.getElementById('btn-send');
  setInputState(false, newSendBtn, newTextarea);

  // 获取AI回复
  await generateReply(newSendBtn, newTextarea);
}

// 生成AI回复
async function generateReply(sendBtn, textarea) {
  const loading = showLoading(t('loading'));

  try {
    const personality = PERSONALITIES[state.dialogue.personality];

    // 添加30秒超时
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('timeout')), 30000);
    });

    const useStream = AIService.shouldUseStream?.() ?? false;
    let result;

    if (useStream) {
      const placeholder = {
        role: 'other',
        content: '',
        suggestions: []
      };
      state.dialogue.messages.push(placeholder);
      initDialogue();
      const bubble = document.querySelector('#dialogue-thread .message.other:last-child .message-text');

      result = await Promise.race([
        AIService.generateDialogueStream(
          {
            messages: state.dialogue.messages.slice(0, -1),
            personality,
            topic: state.dialogue.topic,
            context: state.dialogue.context
          },
          (_chunk, full) => {
            placeholder.content = full;
            if (bubble) bubble.textContent = full;
          }
        ),
        timeoutPromise
      ]);

      placeholder.content = result.reply;
      placeholder.suggestions = result.suggestions;
    } else {
      result = await Promise.race([
        AIService.generateDialogueReply({
          messages: state.dialogue.messages,
          personality,
          topic: state.dialogue.topic,
          context: state.dialogue.context
        }),
        timeoutPromise
      ]);

      state.dialogue.messages.push({
        role: 'other',
        content: result.reply,
        suggestions: result.suggestions
      });
    }

  } catch (error) {
    logger.error('Dialogue generation failed:', error);

    // 更精确的错误提示
    let errorKey = 'error.unknown';
    if (error?.message === 'timeout') {
      errorKey = 'error.timeout';
    } else if (navigator.onLine === false) {
      errorKey = 'error.network';
    }
    showToast(t(errorKey));

    const last = state.dialogue.messages[state.dialogue.messages.length - 1];
    if (last?.role === 'other' && !last.content) {
      state.dialogue.messages.pop();
    }

    const fallbackReply = generateLocalReply();
    state.dialogue.messages.push({
      role: 'other',
      content: fallbackReply,
      suggestions: [t('dialogue.suggestion.got_it'), t('dialogue.suggestion.elaborate'), t('dialogue.suggestion.other_thoughts')]
    });
  } finally {
    loading.close();
    isReplying = false;

    // 重新渲染并恢复输入状态
    initDialogue();
    const newTextarea = document.getElementById('dialogue-input');
    const newSendBtn = document.getElementById('btn-send');
    setInputState(true, newSendBtn, newTextarea);

    // 自动聚焦输入框
    setTimeout(() => newTextarea?.focus(), 100);
  }
}

// 本地备用回复
function generateLocalReply() {
  const lastUser = state.dialogue.messages
    .slice()
    .reverse()
    .find(m => m.role === 'user');
  
  const text = lastUser?.content?.toLowerCase() || '';
  
  // 简单关键词匹配
  if (text.includes('好') || text.includes('ok') || text.includes('可以')) {
    return t('dialogue.fallback.agree');
  }
  if (text.includes('？') || text.includes('?')) {
    return t('dialogue.fallback.question');
  }
  if (text.includes('不') || text.includes('拒绝') || text.includes('不行')) {
    return t('dialogue.fallback.reject');
  }
  if (text.includes('谢')) {
    return t('dialogue.fallback.thanks');
  }
  
  return t('dialogue.fallback.default');
}

// 重置对话
function resetDialogue() {
  state.dialogue.isActive = false;
  state.dialogue.messages = [];
  state.dialogue.seed = '';
  state.dialogue.topic = '';
  initDialogue();
  showToast(t('dialogue.restart'));
}

// HTML转义
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
