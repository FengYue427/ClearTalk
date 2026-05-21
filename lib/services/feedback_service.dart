import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'proxy_ai_service.dart';

/// 反馈上报（优先后端 API，失败静默）
class FeedbackService {
  final Dio _dio;

  FeedbackService({Dio? dio}) : _dio = dio ?? Dio();

  Future<bool> submit({
    required String type,
    String? sceneId,
    String? sceneName,
    String? tone,
    String? textPreview,
    List<String>? reasons,
    String? comment,
  }) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final base = prefs.getString('cleartalk_api_base_url')?.trim() ??
          ProxyAiService.defaultBaseUrl;

      await _dio.post(
        '$base/api/feedback',
        data: {
          'type': type,
          'sceneId': sceneId,
          'sceneName': sceneName,
          'tone': tone,
          'textPreview': textPreview,
          'reasons': reasons ?? [],
          'comment': comment ?? '',
          'meta': {'source': 'flutter'},
        },
        options: Options(
          headers: {'Content-Type': 'application/json'},
          sendTimeout: const Duration(seconds: 10),
          receiveTimeout: const Duration(seconds: 10),
        ),
      );
      return true;
    } catch (_) {
      return false;
    }
  }
}
