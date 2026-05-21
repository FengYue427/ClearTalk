/**
 * AI 供应商解析与调用（Deepseek / OpenAI / 通义千问）
 */

const fetch = require('node-fetch');

const SYSTEM_PROMPT =
  '你是一个专业的沟通助手，帮助用户清晰、得体地表达诉求。你只基于用户提供的事实生成文本，从不编造信息。';

function resolveProvider(model = '') {
  const m = String(model).toLowerCase();
  if (m.includes('qwen')) return 'qwen';
  if (m.includes('deepseek')) return 'deepseek';
  if (m.includes('gpt') || m.includes('openai')) return 'openai';
  return process.env.DEFAULT_AI_PROVIDER || 'deepseek';
}

function getProviderConfig(provider) {
  const configs = {
    deepseek: {
      baseUrl: 'https://api.deepseek.com/v1/chat/completions',
      apiKey: process.env.DEEPSEEK_API_KEY,
      defaultModel: 'deepseek-chat'
    },
    openai: {
      baseUrl: 'https://api.openai.com/v1/chat/completions',
      apiKey: process.env.OPENAI_API_KEY,
      defaultModel: 'gpt-4o-mini'
    },
    qwen: {
      baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      apiKey: process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY,
      defaultModel: 'qwen-turbo'
    }
  };
  return configs[provider] || configs.deepseek;
}

function resolveModel(model, provider) {
  const cfg = getProviderConfig(provider);
  return model || cfg.defaultModel;
}

async function chatCompletion({ prompt, temperature = 0.7, maxTokens = 1000, model }) {
  const provider = resolveProvider(model);
  const cfg = getProviderConfig(provider);

  if (!cfg.apiKey) {
    const err = new Error(`未配置 ${provider.toUpperCase()} API Key`);
    err.code = 'NO_API_KEY';
    throw err;
  }

  const modelName = resolveModel(model, provider);

  const response = await fetch(cfg.baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.apiKey}`
    },
    body: JSON.stringify({
      model: modelName,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      temperature,
      max_tokens: maxTokens
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `AI 服务错误: ${response.status}`);
  }

  const data = await response.json();
  return {
    text: data.choices[0].message.content,
    model: data.model,
    provider
  };
}

function writeSse(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function pipeStreamToSse(upstream, res) {
  return new Promise((resolve, reject) => {
    upstream.body.on('data', (chunk) => {
      const lines = chunk.toString().split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);
        if (data === '[DONE]') {
          writeSse(res, { done: true });
          res.end();
          resolve();
          return;
        }
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content || '';
          if (content) writeSse(res, { content });
        } catch {
          /* ignore partial JSON */
        }
      }
    });

    upstream.body.on('end', () => {
      writeSse(res, { done: true });
      res.end();
      resolve();
    });

    upstream.body.on('error', (err) => {
      writeSse(res, { error: '流式传输中断' });
      res.end();
      reject(err);
    });
  });
}

async function chatCompletionStream({ prompt, temperature = 0.7, maxTokens = 1000, model }, res) {
  const provider = resolveProvider(model);
  const cfg = getProviderConfig(provider);

  if (!cfg.apiKey) {
    writeSse(res, { error: `未配置 ${provider.toUpperCase()} API Key` });
    res.end();
    return;
  }

  const modelName = resolveModel(model, provider);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const response = await fetch(cfg.baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.apiKey}`
    },
    body: JSON.stringify({
      model: modelName,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      temperature,
      max_tokens: maxTokens,
      stream: true
    })
  });

  if (!response.ok) {
    const error = await response.text().catch(() => '');
    writeSse(res, { error: `AI 服务错误: ${response.status} ${error}` });
    res.end();
    return;
  }

  await pipeStreamToSse(response, res);
}

function getAiStatus() {
  const providers = ['deepseek', 'openai', 'qwen'];
  const configured = providers.filter((p) => !!getProviderConfig(p).apiKey);
  return {
    configured,
    defaultProvider: process.env.DEFAULT_AI_PROVIDER || 'deepseek',
    ready: configured.length > 0
  };
}

module.exports = {
  resolveProvider,
  getProviderConfig,
  chatCompletion,
  chatCompletionStream,
  getAiStatus
};
