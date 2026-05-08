/**
 * 语音输入服务 - 基于 Web Speech API
 */

import { logger } from '../core/logger.js';

// 检测浏览器是否支持语音识别
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

/**
 * 检查浏览器是否支持语音识别
 */
export function isVoiceSupported() {
  return !!SpeechRecognition;
}

/**
 * 创建语音识别实例
 * @param {Object} options
 * @param {string} options.lang - 语言代码 (e.g. 'zh-CN', 'en-US')
 * @param {boolean} options.continuous - 是否连续识别
 * @param {boolean} options.interimResults - 是否返回临时结果
 * @param {Function} options.onResult - 识别结果回调 (text, isFinal)
 * @param {Function} options.onError - 错误回调
 * @param {Function} options.onStart - 开始识别回调
 * @param {Function} options.onEnd - 结束识别回调
 */
export function createVoiceRecognizer(options = {}) {
  if (!SpeechRecognition) {
    logger.warn('SpeechRecognition not supported');
    return null;
  }

  const recognizer = new SpeechRecognition();
  recognizer.lang = options.lang || 'zh-CN';
  recognizer.continuous = options.continuous !== false;
  recognizer.interimResults = options.interimResults !== false;
  recognizer.maxAlternatives = 1;

  let isListening = false;

  recognizer.onstart = () => {
    isListening = true;
    logger.info('Voice recognition started');
    if (options.onStart) options.onStart();
  };

  recognizer.onresult = (event) => {
    let finalTranscript = '';
    let interimTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }

    if (options.onResult) {
      options.onResult(finalTranscript || interimTranscript, !!finalTranscript);
    }
  };

  recognizer.onerror = (event) => {
    isListening = false;
    logger.error('Voice recognition error:', event.error);
    if (options.onError) options.onError(event.error);
  };

  recognizer.onend = () => {
    isListening = false;
    logger.info('Voice recognition ended');
    if (options.onEnd) options.onEnd();
  };

  return {
    start() {
      if (!isListening) {
        try {
          recognizer.start();
        } catch (err) {
          logger.error('Failed to start voice recognition:', err);
          if (options.onError) options.onError(err.message);
        }
      }
    },
    stop() {
      if (isListening) {
        recognizer.stop();
      }
    },
    abort() {
      recognizer.abort();
      isListening = false;
    },
    get isListening() {
      return isListening;
    }
  };
}

/**
 * 检测最佳语言设置
 * @param {string} appLanguage - 应用当前语言
 * @returns {string}
 */
export function getVoiceLanguage(appLanguage) {
  const langMap = {
    'zh': 'zh-CN',
    'zh-CN': 'zh-CN',
    'zh-TW': 'zh-TW',
    'en': 'en-US',
    'en-US': 'en-US',
    'en-GB': 'en-GB',
    'ja': 'ja-JP',
    'ko': 'ko-KR',
    'es': 'es-ES',
    'fr': 'fr-FR',
    'de': 'de-DE'
  };
  return langMap[appLanguage] || 'zh-CN';
}
