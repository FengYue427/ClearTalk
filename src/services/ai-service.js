/**
 * AI 服务 - 封装文本生成、润色、对话功能
 */

import { api } from './api-client.js';
import { logger } from '../core/logger.js';
import { state } from '../core/state.js';
import { Storage } from '../core/storage.js';
import { t } from '../core/i18n.js';

// AI 服务配置
const AI_CONFIG = {
  // 场景生成提示词模板
  scenePrompt: (scene, values, tone, isZh) => isZh 
    ? `你是专业的沟通顾问。根据以下场景和用户提供的信息，生成一段得体、清晰的沟通文本。

场景：${scene.name}
场景描述：${scene.description}
语气风格：${tone.label}
语气要求：${tone.promptModifier}

用户提供的信息：
${Object.entries(values)
  .filter(([_, v]) => v !== undefined && v !== null && v !== '')
  .map(([k, v]) => {
    const field = scene.fields.find(f => f.key === k);
    const dynamicKey = `scene.field.${scene.id || 'generic'}.${k}`;
    const fieldLabel = t(dynamicKey) !== dynamicKey ? t(dynamicKey) : (field?.translationKey ? t(field.translationKey) : (field?.label || k));
    return `${fieldLabel}: ${v}`;
  }).join('\n')}

要求：
1. 使用【背景】【事实】【诉求】【期限/期望】【结尾】的结构
2. 语气符合要求
3. 语言自然，符合中文沟通习惯
4. 不要过度道歉，保持平等姿态
5. 总字数控制在 200 字以内

直接输出文本，不要添加任何解释。`
    : `You are a professional communication consultant. Generate a proper and clear communication text based on the following scenario and user information.

Scenario: ${scene.translationKey ? t(scene.translationKey) : scene.name}
Description: ${scene.descriptionKey ? t(scene.descriptionKey) : scene.description}
Tone: ${tone.translationKey ? t(tone.translationKey) : tone.label}
Tone Requirements: ${tone.promptModifierKey ? t(tone.promptModifierKey) : tone.promptModifier}

User Information:
${Object.entries(values)
  .filter(([_, v]) => v !== undefined && v !== null && v !== '')
  .map(([k, v]) => {
    const field = scene.fields.find(f => f.key === k);
    const dynamicKey = `scene.field.${scene.id || 'generic'}.${k}`;
    const fieldLabel = t(dynamicKey) !== dynamicKey ? t(dynamicKey) : (field?.translationKey ? t(field.translationKey) : (field?.label || k));
    return `${fieldLabel}: ${v}`;
  }).join('\n')}

Requirements:
1. Use structure: [Background][Facts][Request][Deadline/Expectation][Closing]
2. Match the requested tone
3. Natural language appropriate for English communication
4. Don't over-apologize, maintain equal stance
5. Keep within 200 words

Output text directly without explanation.`,

  // 润色提示词模板
  polishPrompt: (text, target, isZh) => isZh
    ? `请对以下文本进行润色，使其更加${target === 'professional' ? '专业正式' : target === 'friendly' ? '友好亲切' : '简洁有力'}：

原文：
${text}

要求：
1. 保持原意不变
2. 提供 3 个不同版本的润色结果
3. 输出 JSON 格式：{"versions": ["版本1", "版本2", "版本3"]}`
    : `Please polish the following text to make it more ${target === 'professional' ? 'professional and formal' : target === 'friendly' ? 'friendly and warm' : 'concise and powerful'}:

Original Text:
${text}

Requirements:
1. Maintain original meaning
2. Provide 3 different polished versions
3. Output JSON format: {"versions": ["Version 1", "Version 2", "Version 3"]}`,

  // 对话模拟提示词模板
  dialoguePrompt: (messages, personality, topic, context, isZh) => {
    const history = messages.slice(-10).map(m => 
      `${m.role === 'user' ? 'User' : 'Other'}: ${m.content}`
    ).join('\n');
    
    return isZh
      ? `${personality.prompt}

当前话题：${topic || '一般对话'}
${context.keyInfo ? '\n已确认的信息：' + Object.entries(context.keyInfo).map(([k, v]) => `${k}: ${v}`).join('；') : ''}

你是对话模拟器中的"对方"。请根据对话历史给出自然、真实的下一条回复。

重要要求：
1) 像真实人类一样说话，使用口语化、自然的表达
2) 根据对方人格风格(${personality.name})调整语气和用词
3) 保持对话连贯性，参考之前的对话内容
4) 不要一次性解决所有问题，给对话留有余地
5) 绝对不要返回【背景】【事实】【诉求】等模板标记
6) 同时给出3条简短的我方回复建议

对话历史：
${history}

请输出JSON格式：{"reply":"你的回复内容","suggestions":["建议1","建议2","建议3"]}`
      : `${personality.prompt}

Current Topic: ${topic || 'General Conversation'}
${context.keyInfo ? '\nConfirmed Information: ' + Object.entries(context.keyInfo).map(([k, v]) => `${k}: ${v}`).join('; ') : ''}

You are the "other person" in this conversation simulator. Provide a natural, realistic response based on conversation history.

Important Requirements:
1) Speak like a real human using natural, conversational expressions
2) Adjust tone and vocabulary based on personality style (${personality.name})
3) Maintain conversation continuity, reference previous content
4) Don't resolve all issues at once, leave room for dialogue
5) Never return template markers like [Background][Facts][Request]
6) Also provide 3 brief suggested replies for me

Conversation History:
${history}

Output JSON format: {"reply":"Your response content","suggestions":["Suggestion 1","Suggestion 2","Suggestion 3"]}`;
  }
};

// 本地备用生成逻辑 - 生成自然段落而非结构化列表
function generateLocal(scene, values, tone) {
  const isZh = state.language === 'zh';

  // 提取关键信息
  const background = values.background || values.reason || '';
  const facts = Object.entries(values)
    .filter(([k]) => !['background', 'reason', 'request', 'deadline', 'purpose', 'tone'].includes(k))
    .map(([_, v]) => v)
    .filter(v => v)
    .join(isZh ? '，' : ', ');
  const request = values.request || values.purpose || '';
  const deadline = values.deadline || values.time || '';
  const person = values.person || values.recipient || '';

  // 双语模板库
  const templates = {
    ask_leave: {
      soft: isZh
        ? (person ? `您好，因${background}，需要请假。具体情况是${facts}。希望能得到批准，给您添麻烦了，谢谢！`
          : `您好，因${background}，需要请假${deadline ? ' ' + deadline : ''}。具体情况是${facts}。希望能得到批准，给您添麻烦了，谢谢！`)
        : (person ? `Hello, I need to take leave due to ${background}. The specific situation is ${facts}. I hope to get your approval. Sorry for the trouble, thank you!`
          : `Hello, I need to take leave due to ${background}${deadline ? ' ' + deadline : ''}. The specific situation is ${facts}. I hope to get your approval. Sorry for the trouble, thank you!`),
      neutral: isZh
        ? (person ? `您好，因${background}申请请假。${facts}。望批准。`
          : `您好，因${background}申请请假${deadline ? '，时间为' + deadline : ''}。${facts}。望批准。`)
        : (person ? `Hello, I'm requesting leave due to ${background}. ${facts}. Please approve.`
          : `Hello, I'm requesting leave due to ${background}${deadline ? ', time: ' + deadline : ''}. ${facts}. Please approve.`),
      firm: isZh
        ? (person ? `因${background}，我需要请假。${facts}。请批准。`
          : `因${background}，我需要请假${deadline ? ' ' + deadline : ''}。${facts}。请批准。`)
        : (person ? `Due to ${background}, I need to take leave. ${facts}. Please approve.`
          : `Due to ${background}, I need to take leave${deadline ? ' ' + deadline : ''}. ${facts}. Please approve.`)
    },
    request_raise: {
      soft: isZh
        ? `您好，我想和您谈谈薪资调整的事情。我在公司工作以来一直尽心尽力，近期也取得了一些成绩。希望能有机会讨论一下薪资调整的可能性，期待您的回复。`
        : `Hello, I'd like to discuss salary adjustment. I've been dedicated to my work and have achieved some results recently. I hope to have a chance to discuss the possibility of salary adjustment. Looking forward to your response.`,
      neutral: isZh
        ? `您好，我想申请薪资调整。鉴于我的工作表现和贡献，希望能得到与能力匹配的薪酬。期待与您沟通此事。`
        : `Hello, I'd like to request a salary adjustment. Given my work performance and contributions, I hope to receive compensation matching my abilities. Looking forward to discussing this with you.`,
      firm: isZh
        ? `我需要和您讨论薪资调整事宜。基于我的工作表现和市场行情，期望能得到合理的薪酬调整。请安排时间沟通。`
        : `I need to discuss salary adjustment with you. Based on my performance and market conditions, I expect reasonable compensation adjustment. Please arrange a time to discuss.`
    },
    express_complaint: {
      soft: isZh
        ? `您好，我想反馈一下遇到的问题。${facts || background || '具体情况'}，希望能得到解决。给您添麻烦了，谢谢！`
        : `Hello, I'd like to feedback about an issue I encountered. ${facts || background || 'Specific situation'}, hoping it can be resolved. Sorry for the trouble, thank you!`,
      neutral: isZh
        ? `您好，我需要反馈一个问题。${facts || background || '具体情况'}，望尽快处理。`
        : `Hello, I need to report a problem. ${facts || background || 'Specific situation'}, please handle it as soon as possible.`,
      firm: isZh
        ? `我需要投诉${facts || background || '遇到的问题'}。希望立即处理并给出解决方案。`
        : `I need to complain about ${facts || background || 'the issue encountered'}. Please handle it immediately and provide a solution.`
    },
    reject_request: {
      soft: isZh
        ? `非常感谢您的邀请/提议，但很抱歉我暂时无法接受。${background ? '原因是' + background : ''}希望您能理解，期待下次有机会合作。`
        : `Thank you very much for your invitation/proposal, but I'm sorry I cannot accept it at this time. ${background ? 'The reason is ' + background : ''}I hope you can understand and look forward to future cooperation opportunities.`,
      neutral: isZh
        ? `感谢您的提议，但我需要拒绝。${background || ''}抱歉无法配合。`
        : `Thank you for your proposal, but I need to decline. ${background || ''}Sorry for not being able to cooperate.`,
      firm: isZh
        ? `很抱歉，我无法接受。${background || ''}请理解我的立场。`
        : `I'm sorry, I cannot accept. ${background || ''}Please understand my position.`
    },
    follow_up: {
      soft: isZh
        ? `您好，想跟进一下之前的事情。${facts || background || ''}不知道现在进展如何了？期待您的回复，谢谢！`
        : `Hello, I'd like to follow up on previous matters. ${facts || background || ''}I wonder how it's progressing now? Looking forward to your reply, thank you!`,
      neutral: isZh
        ? `您好，请跟进${facts || background || '此事'}的进展。望回复。`
        : `Hello, please follow up on the progress of ${facts || background || 'this matter'}. Looking forward to your reply.`,
      firm: isZh
        ? `请尽快反馈${facts || background || '此事'}的进展。需要明确的时间节点。`
        : `Please provide feedback on the progress of ${facts || background || 'this matter'} as soon as possible. A clear timeline is needed.`
    },
    ask_for_help: {
      soft: isZh
        ? `您好，能否请您帮个忙？${background || facts || '有个事情'}需要您的协助。给您添麻烦了，非常感谢！`
        : `Hello, could you please help me with something? ${background || facts || 'There is something'} that needs your assistance. Sorry for the trouble, thank you very much!`,
      neutral: isZh
        ? `您好，需要请您协助${background || facts || '此事'}。望支持。`
        : `Hello, I need your assistance with ${background || facts || 'this matter'}. Looking forward to your support.`,
      firm: isZh
        ? `需要你协助${background || facts || '此事'}。请尽快配合。`
        : `I need your assistance with ${background || facts || 'this matter'}. Please cooperate as soon as possible.`
    },
    reschedule: {
      soft: isZh
        ? `抱歉，由于${background || '突发情况'}，原定的安排需要调整。${facts || ''}希望能改期，给您带来不便非常抱歉。`
        : `Sorry, due to ${background || 'unexpected circumstances'}, the original arrangement needs to be adjusted. ${facts || ''}I hope to reschedule. Very sorry for the inconvenience.`,
      neutral: isZh
        ? `因${background || '情况变化'}，需要调整原定安排。${facts || ''}望协调改期。`
        : `Due to ${background || 'changed circumstances'}, the original arrangement needs adjustment. ${facts || ''}Please coordinate to reschedule.`,
      firm: isZh
        ? `由于${background || '客观原因'}，原定安排需要变更。${facts || ''}请协调改期。`
        : `Due to ${background || 'objective reasons'}, the original arrangement needs to change. ${facts || ''}Please coordinate to reschedule.`
    },
    apologize: {
      soft: isZh
        ? `非常抱歉，由于我的${background || '失误'}导致了${facts || '不好的结果'}。这是我的责任，我会${request || '认真改正'}。再次向您道歉。`
        : `I'm very sorry that my ${background || 'mistake'} caused ${facts || 'negative consequences'}. This is my responsibility, and I will ${request || 'correct it seriously'}. I apologize again.`,
      neutral: isZh
        ? `对于${background || '此事'}，我深表歉意。${facts || ''}会${request || '妥善处理'}。`
        : `Regarding ${background || 'this matter'}, I sincerely apologize. ${facts || ''}I will ${request || 'handle it properly'}.`,
      firm: isZh
        ? `关于${background || '此事'}，我承认责任在我。${facts || ''}将${request || '采取补救措施'}。`
        : `Regarding ${background || 'this matter'}, I admit the responsibility is mine. ${facts || ''}I will ${request || 'take remedial measures'}.`
    },
    introduce_self: {
      soft: isZh
        ? `您好，我是${background || facts || 'XXX'}。很高兴认识您，希望能有机会交流。`
        : `Hello, I'm ${background || facts || 'XXX'}. Nice to meet you, and I hope to have the opportunity to communicate.`,
      neutral: isZh
        ? `您好，我是${background || facts || 'XXX'}。${request || '期待与您合作/交流'}。`
        : `Hello, I'm ${background || facts || 'XXX'}. ${request || 'Looking forward to working/communicating with you.'}`,
      firm: isZh
        ? `我是${background || facts || 'XXX'}。${request || '期待建立合作关系'}。`
        : `I'm ${background || facts || 'XXX'}. ${request || 'Looking forward to establishing a cooperative relationship.'}`
    },
    networking: {
      soft: isZh
        ? `您好，我是${background || 'XXX'}，想与您建立联系。${facts || ''}希望能有机会交流，谢谢！`
        : `Hello, I'm ${background || 'XXX'} and would like to connect with you. ${facts || ''}I hope to have the opportunity to communicate, thank you!`,
      neutral: isZh
        ? `您好，${background || ''}想与您建立联系。${facts || ''}望回复。`
        : `Hello, ${background || ''}I'd like to connect with you. ${facts || ''}Looking forward to your reply.`,
      firm: isZh
        ? `${background || ''}希望与您建立合作。${facts || ''}请回复。`
        : `${background || ''}I hope to establish cooperation with you. ${facts || ''}Please reply.`
    }
  };

  // 匹配场景或使用通用模板
  const sceneType = scene.id || scene.template || 'general';
  const template = templates[sceneType]?.[tone.key] || templates[sceneType]?.neutral;

  if (template) {
    // 替换变量
    let result = template
      .replace(/\$\{background\}/g, background || '')
      .replace(/\$\{facts\}/g, facts || '')
      .replace(/\$\{deadline\}/g, deadline || '')
      .replace(/\$\{person\}/g, person || '')
      .replace(/\$\{request\}/g, request || '');

    // 清理空括号（仅中文）
    if (isZh) {
      result = result.replace(/，+/g, '，').replace(/。+/g, '。').replace(/，。/g, '。');
    }

    return result;
  }

  // 通用回退模板
  const tonePrefix = isZh ? {
    soft: '您好，',
    neutral: '',
    firm: ''
  } : {
    soft: 'Hello, ',
    neutral: '',
    firm: ''
  };

  const parts = [];
  if (background) parts.push(isZh ? `关于${background}` : `Regarding ${background}`);
  if (facts) parts.push(facts);
  if (request) parts.push(request);
  if (deadline) parts.push(isZh ? `时间：${deadline}` : `Time: ${deadline}`);

  return tonePrefix[tone.key] + parts.join(isZh ? '，' : ', ') + (isZh ? '。' : '.');
}

// 调用第三方 AI API (OpenAI/DeepSeek)
async function callThirdPartyAI(prompt, temperature = 0.7, maxTokens = 500) {
  const provider = Storage.getSetting('aiProvider', 'local');
  const apiKey = Storage.getSetting('aiApiKey', '');
  
  if (provider === 'local' || !apiKey) {
    throw new Error('No third-party AI configured');
  }
  
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
      messages: [{ role: 'user', content: prompt }],
      temperature: temperature,
      max_tokens: maxTokens
    })
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `API Error: ${response.status}`);
  }
  
  const data = await response.json();
  return data.choices[0].message.content;
}

// AI 服务主对象
export const AIService = {
  // 场景文本生成
  async generate(scene, values, tone) {
    const isZh = state.language === 'zh';
    
    try {
      // 检查是否有必填字段
      const requiredFields = scene.fields.filter(f => f.required);
      const hasAllRequired = requiredFields.every(f => values[f.key] && values[f.key].trim() !== '');
      
      if (!hasAllRequired) {
        throw new Error(isZh ? '请填写必填字段' : 'Please fill in required fields');
      }
      
      // 优先尝试调用后端 API
      try {
        const result = await api.post('/api/ai/generate', {
          prompt: AI_CONFIG.scenePrompt(scene, values, tone, isZh),
          temperature: 0.7
        });
        
        if (result && result.text) {
          return result.text.trim();
        }
      } catch (apiErr) {
        logger.debug('Backend API failed, trying third-party AI:', apiErr.message);
      }
      
      // 后端失败，尝试直接调用第三方 AI
      const prompt = AI_CONFIG.scenePrompt(scene, values, tone, isZh);
      const text = await callThirdPartyAI(prompt, 0.7, 500);
      
      if (text) {
        return text.trim();
      }
      
      throw new Error('Empty response');
    } catch (err) {
      logger.warn('AI generation failed, falling back to local:', err);
      // 降级到本地生成
      return generateLocal(scene, values, tone);
    }
  },
  
  // 自由形式 AI 调用
  async freeform({ prompt, temperature = 0.7, maxTokens = 2000 }) {
    const result = await api.post('/api/ai/generate', {
      prompt,
      temperature,
      maxTokens
    });
    
    return result?.text || '';
  },
  
  // 文本润色
  async polish(text, target = 'professional') {
    const isZh = state.language === 'zh';
    try {
      const result = await api.post('/api/ai/generate', {
        prompt: AI_CONFIG.polishPrompt(text, target, isZh),
        temperature: 0.8
      });
      
      const text_result = result?.text || '';
      
      // 尝试解析 JSON
      try {
        const json = JSON.parse(text_result);
        if (json.versions && Array.isArray(json.versions)) {
          return json.versions.slice(0, 3);
        }
      } catch {
        // 不是 JSON，按换行分割
      }
      
      // 简单分割
      const versions = text_result.split(/\n{2,}/).filter(v => v.trim()).slice(0, 3);
      return versions.length > 0 ? versions : [text_result || text];
    } catch (err) {
      logger.error('Polish failed:', err);
      // 简单本地润色
      const isZh = state.language === 'zh';
      return isZh ? [
        `${text}（优化后更专业的版本）`,
        `${text}（更简洁有力的版本）`,
        text
      ] : [
        `${text} (More professional version)`,
        `${text} (More concise and powerful version)`,
        text
      ];
    }
  },
  
  // 对话回复生成
  async generateDialogueReply({ messages, personality, topic, context }) {
    const isZh = state.language === 'zh';
    try {
      const result = await api.post('/api/ai/generate', {
        prompt: AI_CONFIG.dialoguePrompt(messages, personality, topic, context, isZh),
        temperature: 0.8,
        maxTokens: 500
      });
      
      const text = result?.text || '';
      
      // 尝试解析 JSON
      try {
        const json = JSON.parse(text);
        if (json.reply) {
          return {
            reply: String(json.reply),
            suggestions: Array.isArray(json.suggestions) ? json.suggestions.slice(0, 3) : []
          };
        }
      } catch {
        // 解析失败，返回纯文本
      }
      
      return { reply: text, suggestions: [] };
    } catch (err) {
      logger.error('Dialogue generation failed:', err);
      throw err;
    }
  },
  
  // 批量生成
  async batchGenerate(scenes, baseValues, tone) {
    const results = [];
    for (const scene of scenes) {
      try {
        const text = await this.generate(scene, baseValues, tone);
        results.push({ scene, text, success: true });
      } catch (err) {
        results.push({ scene, text: '', success: false, error: err.message });
      }
    }
    return results;
  }
};

export default AIService;
