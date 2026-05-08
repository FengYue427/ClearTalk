/**
 * UI 组件库
 */

import { escapeHtml, triggerHaptic } from '../../core/utils.js';
import { state } from '../../core/state.js';
import { t } from '../../core/i18n.js';
import { CATEGORIES } from '../../scenes/index.js';

// Toast 提示
export function showToast(message, duration = 2000) {
  const toast = document.getElementById('toast') || createToastElement();
  toast.textContent = message;
  toast.classList.remove('hidden');
  
  setTimeout(() => {
    toast.classList.add('hidden');
  }, duration);
}

function createToastElement() {
  const toast = document.createElement('div');
  toast.id = 'toast';
  toast.className = 'toast hidden';
  document.body.appendChild(toast);
  return toast;
}

// 模态框
export function showModal({ title, content, actions = [], onOpen }) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';

  modal.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3>${escapeHtml(title)}</h3>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="modal-body">${content}</div>
      <div class="modal-footer">
        ${actions.map((action, index) => `
          <button class="btn ${action.primary ? 'btn-primary' : 'btn-secondary'}"
                  onclick="this.closest('.modal-overlay').modalAction(${index})">
            ${escapeHtml(action.label)}
          </button>
        `).join('')}
      </div>
    </div>
  `;

  // 绑定按钮事件
  modal.modalAction = (index) => {
    const action = actions[index];
    let shouldClose = true;
    if (action.onClick) {
      const result = action.onClick();
      if (result === false) {
        shouldClose = false;
      }
    }
    if (shouldClose && !action.keepOpen) {
      modal.remove();
    }
  };

  // 点击遮罩关闭
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });

  document.body.appendChild(modal);
  triggerHaptic();

  // 触发 onOpen 回调
  if (onOpen) {
    requestAnimationFrame(() => onOpen());
  }

  return {
    close: () => modal.remove()
  };
}

// 确认对话框
export function showConfirm({ title, message, confirmText, cancelText, onConfirm, onCancel }) {
  const resolvedConfirmText = confirmText ?? t('common.confirm');
  const resolvedCancelText = cancelText ?? t('common.cancel');
  return showModal({
    title,
    content: `<p>${escapeHtml(message)}</p>`,
    actions: [
      { label: resolvedCancelText, onClick: onCancel },
      { label: resolvedConfirmText, primary: true, onClick: onConfirm }
    ]
  });
}

// 操作选择弹窗
export function showActionSheet({ title, actions, onSelect }) {
  const modal = document.createElement('div');
  modal.className = 'action-sheet-overlay';
  
  modal.innerHTML = `
    <div class="action-sheet">
      <div class="action-sheet-header">${escapeHtml(title)}</div>
      <div class="action-sheet-body">
        ${actions.map((action, index) => `
          <button class="action-sheet-item ${action.danger ? 'danger' : ''} ${action.checked ? 'checked' : ''}" 
                  data-index="${index}">
            <span>${escapeHtml(action.label)}</span>
            ${action.checked ? `
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            ` : ''}
          </button>
        `).join('')}
      </div>
      <button class="action-sheet-cancel" onclick="this.closest('.action-sheet-overlay').remove()">
        ${t('common.cancel')}
      </button>
    </div>
  `;
  
  // 绑定选择事件
  modal.querySelectorAll('.action-sheet-item').forEach(item => {
    item.addEventListener('click', () => {
      const index = parseInt(item.dataset.index);
      onSelect(actions[index].value, actions[index]);
      modal.remove();
    });
  });
  
  // 点击遮罩关闭
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
  
  document.body.appendChild(modal);
  triggerHaptic();
}

// 加载指示器
export function showLoading(message) {
  const resolvedMessage = message ?? t('common.loading');
  const loading = document.createElement('div');
  loading.className = 'loading-overlay';
  loading.innerHTML = `
    <div class="loading-content">
      <div class="spinner"></div>
      <p>${escapeHtml(resolvedMessage)}</p>
    </div>
  `;
  document.body.appendChild(loading);
  
  return {
    update: (newMessage) => {
      loading.querySelector('p').textContent = newMessage;
    },
    close: () => loading.remove()
  };
}

// 按钮组件
export function createButton({ text, variant = 'primary', onClick, icon = null, disabled = false }) {
  const button = document.createElement('button');
  button.className = `btn btn-${variant}`;
  button.disabled = disabled;
  
  if (icon) {
    button.innerHTML = `${icon} ${escapeHtml(text)}`;
  } else {
    button.textContent = text;
  }
  
  button.addEventListener('click', () => {
    triggerHaptic();
    onClick();
  });
  
  return button;
}

// 输入框组件
export function createInput({ label, type = 'text', placeholder = '', value = '', required = false, onChange }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'form-group';
  
  wrapper.innerHTML = `
    <label class="form-label">
      ${escapeHtml(label)}
      ${required ? '<span class="required">*</span>' : ''}
    </label>
    <input type="${type}" 
           class="form-input" 
           placeholder="${escapeHtml(placeholder)}"
           value="${escapeHtml(value)}"
           ${required ? 'required' : ''}>
  `;
  
  const input = wrapper.querySelector('input');
  input.addEventListener('input', (e) => {
    onChange?.(e.target.value);
  });
  
  return {
    element: wrapper,
    getValue: () => input.value,
    setValue: (val) => input.value = val,
    focus: () => input.focus()
  };
}

// 文本域组件
export function createTextarea({ label, placeholder = '', value = '', rows = 4, required = false, onChange }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'form-group';
  
  wrapper.innerHTML = `
    <label class="form-label">
      ${escapeHtml(label)}
      ${required ? '<span class="required">*</span>' : ''}
    </label>
    <textarea class="form-textarea" 
              rows="${rows}"
              placeholder="${escapeHtml(placeholder)}"
              ${required ? 'required' : ''}>${escapeHtml(value)}</textarea>
  `;
  
  const textarea = wrapper.querySelector('textarea');
  textarea.addEventListener('input', (e) => {
    onChange?.(e.target.value);
    // 自动调整高度
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  });
  
  return {
    element: wrapper,
    getValue: () => textarea.value,
    setValue: (val) => {
      textarea.value = val;
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    },
    focus: () => textarea.focus()
  };
}

// 下拉选择组件
export function createSelect({ label, options = [], value = '', required = false, onChange }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'form-group';
  
  wrapper.innerHTML = `
    <label class="form-label">
      ${escapeHtml(label)}
      ${required ? '<span class="required">*</span>' : ''}
    </label>
    <select class="form-select" ${required ? 'required' : ''}>
      ${options.map(opt => `
        <option value="${escapeHtml(opt.value)}" ${opt.value === value ? 'selected' : ''}>
          ${escapeHtml(opt.label)}
        </option>
      `).join('')}
    </select>
  `;
  
  const select = wrapper.querySelector('select');
  select.addEventListener('change', (e) => {
    onChange?.(e.target.value);
  });
  
  return {
    element: wrapper,
    getValue: () => select.value,
    setValue: (val) => select.value = val
  };
}

// 场景卡片组件
export function createSceneCard(scene, onClick) {
  const card = document.createElement('div');
  card.className = 'scene-card';
  card.dataset.id = scene.id;
  
  const sceneName = scene.translationKey ? t(scene.translationKey) : escapeHtml(scene.name);
  const sceneDesc = scene.descriptionKey ? t(scene.descriptionKey) : escapeHtml(scene.description);
  const categoryKey = scene.category;
  const categoryI18nKey = CATEGORIES.find((c) => c.id === categoryKey)?.translationKey;
  const sceneCategory = categoryI18nKey ? t(categoryI18nKey) : escapeHtml(categoryKey);
  
  card.innerHTML = `
    <div class="scene-icon">${scene.icon || '📝'}</div>
    <div class="scene-info">
      <div class="scene-name">${sceneName}</div>
      <div class="scene-desc">${sceneDesc}</div>
      <div class="scene-category">${sceneCategory}</div>
    </div>
  `;
  
  card.addEventListener('click', () => {
    triggerHaptic();
    onClick(scene);
  });
  
  return card;
}

// 空状态组件
export function createEmptyState({ icon = '📭', title = t('common.no_data'), description = '', action = null }) {
  const empty = document.createElement('div');
  empty.className = 'empty-state';
  
  empty.innerHTML = `
    <div class="empty-icon">${icon}</div>
    <h3>${escapeHtml(title)}</h3>
    ${description ? `<p>${escapeHtml(description)}</p>` : ''}
    ${action ? `<button class="btn btn-primary">${escapeHtml(action.text)}</button>` : ''}
  `;
  
  if (action) {
    empty.querySelector('button').addEventListener('click', action.onClick);
  }
  
  return empty;
}

// 导出所有组件
export default {
  showToast,
  showModal,
  showConfirm,
  showActionSheet,
  showLoading,
  createButton,
  createInput,
  createTextarea,
  createSelect,
  createSceneCard,
  createEmptyState
};
