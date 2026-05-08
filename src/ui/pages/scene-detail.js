/**
 * 场景详情页 - 填写字段并生成文本
 */

import { state, subscribe } from '../../core/state.js';
import { Storage } from '../../core/storage.js';
import { triggerHaptic } from '../../core/utils.js';
import { TONES } from '../../scenes/index.js';
import { AIService } from '../../services/ai-service.js';
import { showToast, showLoading, createButton, createEmptyState } from '../components/index.js';
import { navigateTo } from './router.js';
import { t } from '../../core/i18n.js';
import { isVoiceSupported, createVoiceRecognizer, getVoiceLanguage } from '../../services/voice-service.js';
import { logger } from '../../core/logger.js';

// 当前页面状态
let currentTone = 'neutral';
let isGenerating = false;

function setGeneratingState(next) {
  isGenerating = next;
  const btn = document.getElementById('btn-generate');
  if (!btn) return;

  if (next) {
    btn.disabled = true;
    btn.classList.add('is-loading');
    btn.dataset.originalHtml = btn.dataset.originalHtml || btn.innerHTML;
    btn.innerHTML = `⏳ ${t('common.loading')}`;
  } else {
    btn.disabled = false;
    btn.classList.remove('is-loading');
    if (btn.dataset.originalHtml) btn.innerHTML = btn.dataset.originalHtml;
  }
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error('timeout')), ms);
    })
  ]);
}

// 初始化场景详情页
export function initSceneDetail() {
  const page = document.getElementById('page-scene-detail');
  if (!page) return;
  
  // 清空并重建
  page.innerHTML = '';
  
  // 渲染头部
  renderHeader(page);
  
  // 渲染内容区
  const content = document.createElement('div');
  content.className = 'scene-detail-content';
  page.appendChild(content);
  
  const scene = state.currentScene;
  if (!scene) {
    // 没有选中场景，显示空状态
    const empty = createEmptyState({
      icon: '🤔',
      title: 'No scene selected',
      description: 'Please select a scene first',
      action: {
        text: t('nav.back'),
        onClick: () => navigateTo('home')
      }
    });
    content.appendChild(empty);
    return;
  }
  
  // 渲染场景信息
  renderSceneInfo(content, scene);
  
  // 渲染语气选择
  renderToneSelector(content);
  
  // 渲染表单
  renderForm(content, scene);
  
  // 渲染操作按钮
  renderActions(content);
  
  // 渲染结果区（初始隐藏）
  renderResultArea(content);
}

// 渲染头部
function renderHeader(container) {
  const scene = state.currentScene;
  
  const header = document.createElement('header');
  header.className = 'header';
  header.innerHTML = `
    <button class="btn-icon" id="btn-back">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 12H5M12 19l-7-7 7-7"/>
      </svg>
    </button>
    <h2>${scene ? (scene.translationKey ? t(scene.translationKey) : scene.name) : t('home.categories.all')}</h2>
    <div class="header-actions">
      <button class="btn-icon" id="btn-favorite" title="${t('history.favorite')}">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      </button>
    </div>
  `;
  
  // 绑定事件
  header.querySelector('#btn-back').addEventListener('click', () => {
    navigateTo('home');
  });
  
  if (scene) {
    const favBtn = header.querySelector('#btn-favorite');
    updateFavoriteIcon(favBtn, isSceneFavorite(scene.id));
    favBtn.addEventListener('click', () => toggleFavorite(scene, favBtn));
  }
  
  container.appendChild(header);
}

// 渲染场景信息
function renderSceneInfo(container, scene) {
  const info = document.createElement('div');
  info.className = 'scene-info-section';
  info.innerHTML = `
    <div class="scene-icon-large">${scene.icon || '📝'}</div>
    <div class="scene-meta">
      <h1 class="scene-header-title">${scene ? t(scene.translationKey) : t('scene.not.found')}</h1>
      <p class="scene-header-desc">${scene ? t(scene.descriptionKey) : ''}</p>
    </div>
  `;
  container.appendChild(info);
}

// 渲染语气选择
function renderToneSelector(container) {
  const selector = document.createElement('div');
  selector.className = 'tone-selector';
  selector.innerHTML = `
    <label>${t('dialogue.tone')}</label>
    <div class="tone-options">
      ${Object.entries(TONES).map(([key, tone]) => `
        <button class="tone-option ${key === currentTone ? 'active' : ''}" data-tone="${key}">
          <span class="tone-label">${t(tone.translationKey)}</span>
          <span class="tone-desc">${t(tone.promptModifierKey).substring(0, 20)}...</span>
        </button>
      `).join('')}
    </div>
  `;
  
  selector.querySelectorAll('.tone-option').forEach(btn => {
    btn.addEventListener('click', () => {
      currentTone = btn.dataset.tone;
      selector.querySelectorAll('.tone-option').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      triggerHaptic();
    });
  });
  
  container.appendChild(selector);
}

// 渲染表单
function renderForm(container, scene) {
  const form = document.createElement('div');
  form.className = 'scene-form';
  form.id = 'scene-form';
  
  scene.fields.forEach(field => {
    const fieldEl = createFormField(field);
    form.appendChild(fieldEl);
  });
  
  container.appendChild(form);
}

// 创建表单字段
function createFormField(field) {
  const wrapper = document.createElement('div');
  wrapper.className = 'form-field';
  
  const label = document.createElement('label');
  label.className = 'field-label';
  // Dynamic translation key: scene.field.{sceneId}.{fieldKey}
  const sceneId = state.currentScene?.id || 'generic';
  const dynamicKey = `scene.field.${sceneId}.${field.key}`;
  const labelText = t(dynamicKey) !== dynamicKey ? t(dynamicKey) : (field.translationKey ? t(field.translationKey) : field.label);
  label.innerHTML = `
    ${labelText}
    ${field.required ? '<span class="required">*</span>' : ''}
  `;
  wrapper.appendChild(label);
  
  let input;
  switch (field.type) {
    case 'textarea':
      input = document.createElement('textarea');
      input.rows = 4;
      break;
    case 'select':
      input = document.createElement('select');
      field.options?.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value || opt;
        option.textContent = opt.label || opt;
        input.appendChild(option);
      });
      break;
    case 'boolean':
      input = document.createElement('input');
      input.type = 'checkbox';
      wrapper.classList.add('checkbox-field');
      break;
    default:
      input = document.createElement('input');
      input.type = field.type || 'text';
  }
  
  input.className = 'field-input';
  // Dynamic placeholder key: scene.field.{sceneId}.{fieldKey}.placeholder
  const dynamicPlaceholderKey = `scene.field.${sceneId}.${field.key}.placeholder`;
  const placeholderText = t(dynamicPlaceholderKey) !== dynamicPlaceholderKey ? t(dynamicPlaceholderKey) : (field.placeholderKey ? t(field.placeholderKey) : field.placeholder);
  input.placeholder = placeholderText || '';
  input.dataset.key = field.key;
  input.required = field.required;

  // 恢复已填写的值
  if (state.formValues[field.key]) {
    if (field.type === 'boolean') {
      input.checked = state.formValues[field.key];
    } else {
      input.value = state.formValues[field.key];
    }
  }

  // 绑定输入事件
  input.addEventListener('input', (e) => {
    const value = field.type === 'boolean' ? e.target.checked : e.target.value;
    state.formValues[field.key] = value;
  });

  wrapper.appendChild(input);

  // 为文本/多行文本字段添加语音输入按钮
  if ((field.type === 'text' || field.type === 'textarea') && isVoiceSupported()) {
    const voiceBtn = document.createElement('button');
    voiceBtn.className = 'btn-voice-input';
    voiceBtn.type = 'button';
    voiceBtn.title = t('input.voice') || '语音输入';
    voiceBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="23"/>
        <line x1="8" y1="23" x2="16" y2="23"/>
      </svg>
    `;

    let recognizer = null;
    voiceBtn.addEventListener('click', () => {
      if (recognizer && recognizer.isListening) {
        recognizer.stop();
        voiceBtn.classList.remove('listening');
        return;
      }

      recognizer = createVoiceRecognizer({
        lang: getVoiceLanguage(state.language),
        continuous: false,
        interimResults: true,
        onStart: () => {
          voiceBtn.classList.add('listening');
          input.placeholder = t('input.voice.listening') || '正在聆听...';
        },
        onResult: (text, isFinal) => {
          input.value = text;
          state.formValues[field.key] = text;
          if (isFinal) {
            voiceBtn.classList.remove('listening');
            input.placeholder = placeholderText || '';
          }
        },
        onError: (err) => {
          logger.warn('Voice input error:', err);
          voiceBtn.classList.remove('listening');
          input.placeholder = placeholderText || '';
          showToast(t('input.voice.error') || '语音识别失败');
        },
        onEnd: () => {
          voiceBtn.classList.remove('listening');
          input.placeholder = placeholderText || '';
        }
      });

      if (recognizer) {
        recognizer.start();
      } else {
        showToast(t('input.voice.unsupported') || '浏览器不支持语音输入');
      }
    });

    wrapper.appendChild(voiceBtn);
  }

  // 提示文字
  if (field.hint) {
    const hint = document.createElement('span');
    hint.className = 'field-hint';
    hint.textContent = field.hint;
    wrapper.appendChild(hint);
  }

  return wrapper;
}

// 渲染操作按钮
function renderActions(container) {
  const actions = document.createElement('div');
  actions.className = 'scene-actions';
  
  const generateBtn = createButton({
    text: t('scene.generate'),
    variant: 'primary',
    icon: '✨',
    onClick: generateText
  });
  generateBtn.id = 'btn-generate';
  generateBtn.classList.add('btn-large');
  generateBtn.dataset.originalHtml = generateBtn.innerHTML;
  
  actions.appendChild(generateBtn);
  container.appendChild(actions);
}

// 渲染结果区域
function renderResultArea(container) {
  const resultArea = document.createElement('div');
  resultArea.className = 'result-section hidden';
  resultArea.id = 'result-section';
  
  resultArea.innerHTML = `
    <div class="result-header">
      <h3>${t('scene.result')}</h3>
      <span class="result-tone"></span>
    </div>
    <div class="result-content" id="result-content"></div>
    <div class="result-actions">
      <button class="btn btn-secondary" id="btn-copy" disabled>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
        </svg>
        ${t('dialogue.copy')}
      </button>
      <button class="btn btn-secondary" id="btn-share" disabled>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="18" cy="5" r="3"/>
          <circle cx="6" cy="12" r="3"/>
          <circle cx="18" cy="19" r="3"/>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
        </svg>
        ${t('dialogue.share')}
      </button>
      <button class="btn btn-secondary" id="btn-dialogue" disabled>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
        </svg>
        ${t('dialogue.title')}
      </button>
    </div>
  `;
  
  // 绑定按钮事件
  resultArea.querySelector('#btn-copy').addEventListener('click', copyResult);
  resultArea.querySelector('#btn-share').addEventListener('click', shareResult);
  resultArea.querySelector('#btn-dialogue').addEventListener('click', enterDialogue);
  
  container.appendChild(resultArea);
}

// 生成文本
async function generateText() {
  if (isGenerating) return;
  
  const scene = state.currentScene;
  if (!scene) return;
  
  // 验证必填字段
  const missingFields = scene.fields.filter(f => {
    if (!f.required) return false;
    const value = state.formValues[f.key];
    return !value || (typeof value === 'string' && value.trim() === '');
  });
  
  if (missingFields.length > 0) {
    const sceneId = state.currentScene?.id || 'generic';
    const missingLabels = missingFields.map(f => {
      const dynamicKey = `scene.field.${sceneId}.${f.key}`;
      const labelText = t(dynamicKey) !== dynamicKey ? t(dynamicKey) : (f.translationKey ? t(f.translationKey) : f.label);
      return labelText;
    });
    showToast(`${t('scene.info.empty.fields')}: ${missingLabels.join(', ')}`);
    return;
  }

  setGeneratingState(true);
  const loading = showLoading(t('loading'));
  
  try {
    const tone = TONES[currentTone];
    const text = await withTimeout(
      AIService.generate(scene, state.formValues, tone),
      30000
    );
    
    // 保存结果
    state.generatedText = text;
    
    // 添加到历史
    Storage.addHistory({
      sceneId: scene.id,
      sceneName: scene.name,
      sceneIcon: scene.icon,
      tone: currentTone,
      formValues: { ...state.formValues },
      text: text
    });
    
    // 显示结果
    displayResult(text, tone);
    
    showToast(t('scene.success'));
  } catch (error) {
    if (error?.message === 'timeout') {
      showToast(t('error.timeout'));
    } else if (navigator.onLine === false) {
      showToast(t('error.network'));
    } else {
      showToast(t('error.unknown'));
    }
    console.error('Generate error:', error);
  } finally {
    setGeneratingState(false);
    loading.close();
  }
}

// 显示结果
function displayResult(text, tone) {
  const resultSection = document.getElementById('result-section');
  const resultContent = document.getElementById('result-content');
  const resultTone = resultSection.querySelector('.result-tone');

  resultContent.textContent = text;
  resultTone.textContent = tone.label;

  resultSection.classList.remove('hidden');

  // 启用结果区按钮
  const btnCopy = document.getElementById('btn-copy');
  const btnShare = document.getElementById('btn-share');
  const btnDialogue = document.getElementById('btn-dialogue');
  if (btnCopy) btnCopy.disabled = false;
  if (btnShare) btnShare.disabled = false;
  if (btnDialogue) btnDialogue.disabled = false;

  // 滚动到结果区
  resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// 复制结果
async function copyResult() {
  if (!state.generatedText) return;
  
  try {
    await navigator.clipboard.writeText(state.generatedText);
    showToast(t('dialogue.copied'));
  } catch {
    showToast(t('dialogue.copy.failed'));
  }
}

// 分享结果
function shareResult() {
  if (!state.generatedText) {
    showToast(t('scene.empty.result'));
    return;
  }

  // 使用 Web Share API
  if (navigator.share) {
    navigator.share({
      title: t('share.title'),
      text: state.generatedText
    }).catch(() => {});
  } else {
    // 降级到复制
    copyResult();
  }
}

// 进入对话
function enterDialogue() {
  if (!state.generatedText) {
    showToast(t('scene.empty.result'));
    return;
  }
  navigateTo('dialogue');
}

// 检查场景是否收藏
function isSceneFavorite(sceneId) {
  const history = Storage.getHistory();
  return history.some(h => h.sceneId === sceneId && h.isFavorite);
}

// 切换收藏
function toggleFavorite(scene, btn) {
  // 这里简化处理，实际应该从历史记录中找到并切换
  showToast(t('history.favorite'));
  updateFavoriteIcon(btn, true);
}

// 更新收藏图标
function updateFavoriteIcon(btn, isFavorite) {
  btn.innerHTML = isFavorite 
    ? `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
       </svg>`
    : `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
       </svg>`;
}
