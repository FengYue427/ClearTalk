/**
 * 设置页
 */

import { state, subscribe } from '../../core/state.js';
import { Storage } from '../../core/storage.js';
import { SyncService } from '../../services/sync-service.js';
import { UserService } from '../../services/user-service.js';
import { logger } from '../../core/logger.js';
import { isOnline, downloadFile, events } from '../../core/utils.js';
import { showToast, showConfirm, showActionSheet } from '../components/index.js';
import { navigateTo } from './router.js';
import { t, setLanguage } from '../../core/i18n.js';
import { PROXY_AI_MODELS, DEFAULT_SETTINGS } from '../../core/config.js';
import { QuotaService } from '../../services/quota-service.js';

// 设置项定义 - 使用 i18n
function getSettingsGroups() {
  return [
    {
      title: t('settings.section.general'),
      items: [
        {
          key: 'theme',
          label: t('settings.theme'),
          type: 'select',
          options: [
            { value: 'auto', label: t('settings.theme.auto') },
            { value: 'light', label: t('settings.theme.light') },
            { value: 'dark', label: t('settings.theme.dark') }
          ]
        },
        {
          key: 'language',
          label: t('settings.language'),
          type: 'select',
          options: [
            { value: 'zh', label: t('settings.language.zh') },
            { value: 'en', label: t('settings.language.en') }
          ],
          onChange: (value) => {
            setLanguage(value);
            showToast(t('toast.updated'));
            // 直接重新渲染设置页以应用新语言
            setTimeout(() => initSettings(), 100);
          }
        },
        {
          key: 'haptic',
          label: t('settings.haptic'),
          type: 'toggle'
        }
      ]
    },
    {
      title: t('settings.section.account'),
      items: [
        {
          key: 'autoSync',
          label: t('settings.auto.sync'),
          type: 'toggle',
          disabled: () => !UserService.isLoggedIn()
        },
        {
          key: 'syncDirection',
          label: t('settings.sync.direction'),
          type: 'action',
          disabled: () => !UserService.isLoggedIn(),
          actionLabel: () => {
            const labels = { 
              merge: t('settings.sync.merge'), 
              upload: t('settings.sync.upload'), 
              download: t('settings.sync.download') 
            };
          return labels[Storage.getSetting('syncDirection', 'merge')];
        }
      },
      {
        key: 'lastSync',
        label: t('user.last.sync'),
        type: 'info',
        value: () => SyncService.getStatus().lastSyncFormatted
      }
    ]
  },
  {
    title: t('settings.section.about'),
    items: [
      {
        key: 'export',
        label: t('user.export.data'),
        type: 'action',
        action: exportAllData
      },
      {
        key: 'clearHistory',
        label: t('history.clear.all'),
        type: 'danger',
        action: clearHistory
      },
      {
        key: 'clearAll',
        label: t('settings.delete.account'),
        type: 'danger',
        action: resetAllData
      }
    ]
  },
  {
    title: t('settings.section.ai'),
    items: [
      {
        key: 'aiProvider',
        label: t('settings.ai.provider'),
        type: 'select',
        options: [
          { value: 'proxy', label: t('settings.ai.provider.proxy') },
          { value: 'local', label: t('settings.ai.provider.local') },
          { value: 'openai', label: t('settings.ai.provider.openai') },
          { value: 'deepseek', label: t('settings.ai.provider.deepseek') }
        ]
      },
      {
        key: 'aiModel',
        label: t('settings.ai.model'),
        type: 'select',
        options: () => {
          const provider = Storage.getSetting('aiProvider', DEFAULT_SETTINGS.aiProvider);
          if (provider === 'proxy') {
            return PROXY_AI_MODELS.map((m) => ({
              value: m.value,
              label: t(m.labelKey)
            }));
          }
          if (provider === 'openai') {
            return [
              { value: 'gpt-4o', label: 'GPT-4o' },
              { value: 'gpt-4o-mini', label: `${t('settings.ai.model.gpt_4o_mini')} (${t('common.recommended')})` }
            ];
          }
          if (provider === 'deepseek') {
            return [
              { value: 'deepseek-chat', label: `${t('settings.ai.model.deepseek_chat')} (${t('common.recommended')})` }
            ];
          }
          return [{ value: 'local', label: t('settings.ai.model.local_templates') }];
        }
      },
      {
        key: 'useStream',
        label: t('settings.ai.stream'),
        type: 'toggle',
        disabled: () => Storage.getSetting('aiProvider', DEFAULT_SETTINGS.aiProvider) !== 'proxy'
      },
      {
        key: 'aiApiKey',
        label: t('settings.ai.apikey'),
        type: 'input',
        inputType: 'password',
        placeholder: t('settings.ai.apikey.placeholder'),
        disabled: () => Storage.getSetting('aiProvider', DEFAULT_SETTINGS.aiProvider) === 'proxy'
      },
      {
        key: 'testAi',
        label: t('settings.ai.test'),
        type: 'action',
        action: testAiConnection
      }
    ]
  },
  {
    title: t('settings.section.about'),
    items: [
      {
        key: 'version',
        label: t('settings.version'),
        type: 'info',
        value: () => 'v1.0.0'
      },
      {
        key: 'privacy',
        label: t('settings.privacy'),
        type: 'link',
        url: '/privacy.html'
      },
      {
        key: 'disclaimer',
        label: t('settings.disclaimer'),
        type: 'link',
        url: '/disclaimer.html'
      },
      {
        key: 'terms',
        label: t('settings.terms'),
        type: 'link',
        url: '/terms.html'
      },
      {
        key: 'feedback',
        label: t('settings.contact'),
        type: 'action',
        action: () => window.open('mailto:feedback@cleartalk.app', '_blank')
      }
    ]
  }
  ];
}

// 语言变化监听（用于重新渲染）
let settingsLanguageUnsubscribe = null;

// 初始化设置页
export function initSettings() {
  const page = document.getElementById('page-settings');
  if (!page) return;

  // 如果已有语言监听，先取消
  if (settingsLanguageUnsubscribe) {
    settingsLanguageUnsubscribe();
    settingsLanguageUnsubscribe = null;
  }

  // 清空重建
  page.innerHTML = '';

  // 渲染头部
  renderHeader(page);

  // 渲染设置内容
  const content = document.createElement('div');
  content.className = 'settings-content';

  getSettingsGroups().forEach(group => {
    renderGroup(content, group);
  });

  const quotaBanner = document.createElement('div');
  quotaBanner.className = 'settings-quota-banner';
  quotaBanner.textContent = t('common.loading');
  content.prepend(quotaBanner);
  QuotaService.getStatus().then((q) => {
    const tierLabel = q.tier === 'pro' ? 'Pro' : t('quota.tier.free');
    quotaBanner.textContent = t('quota.status', {
      used: q.used,
      limit: q.limit,
      remaining: q.remaining,
      tier: tierLabel
    });
  }).catch(() => {
    quotaBanner.textContent = '';
  });

  page.appendChild(content);

  // 监听语言变化，重新渲染
  settingsLanguageUnsubscribe = () => {
    events.off('language:changed', handleLanguageChange);
  };
  events.on('language:changed', handleLanguageChange);

  // 保存取消订阅函数到页面元素
  page._unsubscribe = settingsLanguageUnsubscribe;
}

// 语言变化处理函数
function handleLanguageChange() {
  const page = document.getElementById('page-settings');
  if (page && page.classList.contains('active')) {
    initSettings();
  }
}

// 渲染头部
function renderHeader(container) {
  const header = document.createElement('header');
  header.className = 'header';
  header.innerHTML = `
    <button class="btn-icon" id="btn-back" title="${t('nav.back')}">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 12H5M12 19l-7-7 7-7"/>
      </svg>
    </button>
    <h2>${t('settings.title')}</h2>
    <div class="header-spacer"></div>
  `;
  
  header.querySelector('#btn-back').addEventListener('click', () => navigateTo('user'));
  container.appendChild(header);
}

// 渲染设置组
function renderGroup(container, group) {
  const section = document.createElement('div');
  section.className = 'settings-group';
  
  // 标题
  const title = document.createElement('h3');
  title.className = 'settings-group-title';
  title.textContent = group.title;
  section.appendChild(title);
  
  // 设置项
  const list = document.createElement('div');
  list.className = 'settings-list';
  
  group.items.forEach(item => {
    // 检查是否禁用
    if (item.disabled && item.disabled()) {
      return;
    }
    
    const row = document.createElement('div');
    row.className = 'settings-row';
    
    // 标签
    const label = document.createElement('span');
    label.className = 'settings-label';
    label.textContent = item.label;
    row.appendChild(label);
    
    // 控制元素
    const control = document.createElement('div');
    control.className = 'settings-control';
    
    switch (item.type) {
      case 'select':
        const select = document.createElement('select');
        select.className = 'settings-select';
        select.dataset.key = item.key;
        
        // 支持动态选项
        const options = typeof item.options === 'function' ? item.options() : item.options;
        
        select.innerHTML = ''; // 清空
        options.forEach(opt => {
          const option = document.createElement('option');
          option.value = opt.value;
          option.textContent = opt.label;
          option.selected = Storage.getSetting(item.key, options[0]?.value) === opt.value;
          select.appendChild(option);
        });
        
        select.addEventListener('change', (e) => {
          handleSettingChange(item.key, e.target.value);
          // 如果是服务商切换，刷新页面更新模型选项
          if (item.key === 'aiProvider') {
            setTimeout(() => initSettings(), 100);
          }
        });
        control.appendChild(select);
        break;
        
      case 'toggle':
        const toggle = document.createElement('label');
        toggle.className = 'toggle';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = Storage.getSetting(
          item.key,
          DEFAULT_SETTINGS[item.key] ?? state[item.key] ?? false
        );
        checkbox.addEventListener('change', (e) => {
          handleSettingChange(item.key, e.target.checked);
        });
        const slider = document.createElement('span');
        slider.className = 'toggle-slider';
        toggle.appendChild(checkbox);
        toggle.appendChild(slider);
        control.appendChild(toggle);
        break;
        
      case 'action':
        const actionBtn = document.createElement('button');
        actionBtn.className = 'settings-action';
        actionBtn.innerHTML = `
          <span>${item.actionLabel ? item.actionLabel() : '>'}</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        `;
        actionBtn.addEventListener('click', () => {
          if (item.key === 'syncDirection') {
            showSyncDirectionSelect();
          } else if (item.action) {
            item.action();
          }
        });
        control.appendChild(actionBtn);
        break;
        
      case 'info':
        const info = document.createElement('span');
        info.className = 'settings-info';
        info.textContent = item.value ? item.value() : state[item.key];
        control.appendChild(info);
        break;
        
      case 'link':
        const link = document.createElement('a');
        link.className = 'settings-link';
        link.href = item.url;
        link.innerHTML = `
          <span>></span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        `;
        control.appendChild(link);
        break;
        
      case 'input':
        const input = document.createElement('input');
        input.type = item.inputType || 'text';
        input.className = 'settings-input';
        // 支持动态 placeholder
        const placeholder = typeof item.placeholder === 'function' ? item.placeholder() : (item.placeholder || '');
        input.placeholder = placeholder;
        input.value = Storage.getSetting(item.key, '');
        input.addEventListener('change', (e) => {
          handleSettingChange(item.key, e.target.value);
        });
        control.appendChild(input);
        break;
        
      case 'danger':
        const dangerBtn = document.createElement('button');
        dangerBtn.className = 'settings-danger';
        dangerBtn.textContent = '>';
        dangerBtn.addEventListener('click', () => {
          if (item.action) item.action();
        });
        control.appendChild(dangerBtn);
        break;
    }
    
    row.appendChild(control);
    list.appendChild(row);
  });
  
  section.appendChild(list);
  container.appendChild(section);
}

// 处理设置变更
function handleSettingChange(key, value) {
  switch (key) {
    case 'theme':
      state.theme = value;
      break;
    case 'language':
      state.language = value;
      break;
    case 'haptic':
      state.haptic = value;
      break;
    case 'autoSync':
      SyncService.setAutoSync(value);
      break;
  }
  
  // 持久化
  const settings = Storage.get('cleartalk_settings', {});
  settings[key] = value;
  Storage.set('cleartalk_settings', settings);
  
  showToast(t('toast.saved'));
}

// 显示同步方向选择
function showSyncDirectionSelect() {
  const current = Storage.getSetting('syncDirection', 'merge');
  
  showActionSheet({
    title: t('settings.sync.direction'),
    actions: [
      { label: t('settings.sync.merge') + ' (Recommended)', value: 'merge', checked: current === 'merge' },
      { label: t('settings.sync.upload'), value: 'upload', checked: current === 'upload' },
      { label: t('settings.sync.download'), value: 'download', checked: current === 'download' }
    ],
    onSelect: (value) => {
      SyncService.setDirection(value);
      initSettings(); // 刷新页面
      showToast(t('toast.updated'));
    }
  });
}

// 导出所有数据
function exportAllData() {
  const data = Storage.exportAll();
  const json = JSON.stringify(data, null, 2);
  const filename = `cleartalk_backup_${new Date().toISOString().split('T')[0]}.json`;
  
  downloadFile(json, filename, 'application/json');
  showToast(t('toast.saved'));
  logger.info('Data exported');
}

// 清空历史记录
function clearHistory() {
  showConfirm({
    title: t('history.clear.all'),
    message: t('history.clear.confirm'),
    onConfirm: () => {
      Storage.set('cleartalk_history', []);
      showToast(t('toast.deleted'));
      logger.info('History cleared');
    }
  });
}

// 测试 AI 连接
async function testAiConnection() {
  const provider = Storage.getSetting('aiProvider', 'local');
  const apiKey = Storage.getSetting('aiApiKey', '');

  if (provider === 'local') {
    showToast(t('toast.ai.local'));
    return;
  }

  if (!apiKey) {
    showToast(t('toast.ai.nokey'));
    return;
  }

  showToast(t('toast.ai.testing'));

  try {
    const result = await testOpenAIConnection(apiKey, provider);
    if (result.success) {
      showToast(t('toast.ai.success') + result.model);
    } else {
      showToast(t('toast.ai.fail') + result.error);
    }
  } catch (error) {
    showToast(t('toast.ai.error') + error.message);
  }
}

// 测试 OpenAI/DeepSeek API
async function testOpenAIConnection(apiKey, provider) {
  const model = Storage.getSetting('aiModel', provider === 'openai' ? 'gpt-4o-mini' : 'deepseek-chat');
  const baseUrl = provider === 'deepseek' 
    ? 'https://api.deepseek.com/v1/chat/completions'
    : 'https://api.openai.com/v1/chat/completions';
  
  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [{ role: 'user', content: '你好，这是一个测试' }],
      max_tokens: 10
    })
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    return { success: false, error: error.error?.message || `HTTP ${response.status}` };
  }
  
  const data = await response.json();
  return { success: true, model: data.model };
}

// 重置所有数据
function resetAllData() {
  showConfirm({
    title: t('dialog.title.warning'),
    message: t('settings.delete.confirm'),
    confirmText: t('dialog.button.delete'),
    onConfirm: () => {
      Storage.clear();
      showToast(t('toast.deleted') + '，' + t('toast.reloading'));
      logger.warn('All data reset');
      
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    }
  });
}
