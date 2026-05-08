import 'package:flutter/foundation.dart';
import 'package:speech_to_text/speech_to_text.dart';
import 'package:speech_to_text/speech_recognition_result.dart';

/// 语音输入服务封装
class VoiceService {
  static final VoiceService _instance = VoiceService._internal();
  factory VoiceService() => _instance;
  VoiceService._internal();

  final SpeechToText _speech = SpeechToText();
  bool _isAvailable = false;

  bool get isAvailable => _isAvailable;

  /// 初始化语音识别
  Future<bool> init() async {
    if (_isAvailable) return true;
    try {
      _isAvailable = await _speech.initialize(
        onError: (error) {
          if (kDebugMode) {
            print('Speech error: ${error.errorMsg}');
          }
        },
      );
      return _isAvailable;
    } catch (e) {
      if (kDebugMode) {
        print('Speech init failed: $e');
      }
      return false;
    }
  }

  /// 开始识别
  Future<bool> startListening({
    required Function(String text) onResult,
    String localeId = 'zh_CN',
  }) async {
    if (!_isAvailable) {
      final ok = await init();
      if (!ok) return false;
    }

    if (_speech.isListening) {
      await stopListening();
    }

    try {
      await _speech.listen(
        onResult: (SpeechRecognitionResult result) {
          onResult(result.recognizedWords);
        },
        localeId: localeId,
        listenFor: const Duration(seconds: 30),
        pauseFor: const Duration(seconds: 3),
        partialResults: true,
        cancelOnError: true,
      );
      return true;
    } catch (e) {
      if (kDebugMode) {
        print('Speech listen failed: $e');
      }
      return false;
    }
  }

  /// 停止识别
  Future<void> stopListening() async {
    if (_speech.isListening) {
      await _speech.stop();
    }
  }

  /// 是否正在监听
  bool get isListening => _speech.isListening;
}
