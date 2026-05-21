import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/scene_template.dart';
import '../templates/builtin_scenes.dart';
import 'proxy_ai_service.dart';
import 'scene_matcher.dart';

class PasteClassifyService {
  final Dio _dio;

  PasteClassifyService({Dio? dio}) : _dio = dio ?? Dio();

  Future<List<SceneMatch>> analyze(String text, {int limit = 3}) async {
    final trimmed = text.trim();
    if (trimmed.isEmpty) return [];

    final prefs = await SharedPreferences.getInstance();
    final base = prefs.getString('cleartalk_api_base_url')?.trim() ??
        ProxyAiService.defaultBaseUrl;

    try {
      final res = await _dio.post(
        '$base/api/ai/classify-paste',
        data: {'text': trimmed},
        options: Options(headers: {'Content-Type': 'application/json'}),
      );
      final scenes = res.data['scenes'] as List<dynamic>? ?? [];
      final matches = <SceneMatch>[];
      for (final item in scenes) {
        final id = item['id']?.toString();
        if (id == null) continue;
        final scene = BuiltinScenes.findById(id);
        if (scene == null) continue;
        matches.add(SceneMatch(
          scene: scene,
          score: (((item['confidence'] as num?) ?? 0.5) * 10).round(),
          matchedKeywords: [
            if (item['reason'] != null) item['reason'].toString(),
          ],
        ));
      }
      if (matches.isNotEmpty) return matches.take(limit).toList();
    } catch (_) {
      /* fallback */
    }

    return SceneMatcher.matchFromText(trimmed, limit: limit);
  }
}
