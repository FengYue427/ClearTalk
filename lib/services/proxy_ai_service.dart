import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/scene_template.dart';
import 'ai_service.dart';

/// 通过 ClearTalk 后端代理调用 AI（API Key 保存在服务端）
class ProxyAiService implements AiService {
  static const defaultBaseUrl = 'http://localhost:3000';
  static const _baseUrlKey = 'cleartalk_api_base_url';
  static const _modelKey = 'cleartalk_ai_model';

  final Dio _dio;

  ProxyAiService({Dio? dio}) : _dio = dio ?? Dio();

  Future<String> _baseUrl() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_baseUrlKey)?.trim() ?? defaultBaseUrl;
  }

  Future<String> _model() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_modelKey) ?? 'deepseek-chat';
  }

  Future<String> _generate(String prompt, {int maxTokens = 1000}) async {
    final base = await _baseUrl();
    final model = await _model();
    final response = await _dio.post(
      '$base/api/ai/generate',
      data: {
        'prompt': prompt,
        'temperature': 0.7,
        'maxTokens': maxTokens,
        'model': model,
      },
      options: Options(
        headers: {'Content-Type': 'application/json'},
        receiveTimeout: const Duration(seconds: 60),
      ),
    );

    final data = response.data;
    if (data is Map && data['text'] != null) {
      return data['text'].toString().trim();
    }
    throw Exception('AI 返回为空');
  }

  @override
  Future<String> rewrite({required String text, required Tone tone}) {
    final prompt = '''
请将以下文本按照指定语气改写，保持原意不变：

原文本：
$text

要求语气：${tone.promptModifier}

只输出改写后的文本：
''';
    return _generate(prompt);
  }

  @override
  Future<String> generate({
    required SceneTemplate template,
    required Map<String, dynamic> values,
    required Tone tone,
    String? version,
  }) {
    final versionPrompt = _versionPrompt(version);
    final prompt = '''
你是专业的沟通助手。根据场景和用户信息生成沟通文本。

场景：${template.name}
语气：${tone.promptModifier}

用户信息：
${_formatValues(template, values)}

要求：$versionPrompt
结构：背景-事实-诉求-期限-结尾。不要编造事实。

直接输出文本：
''';
    return _generate(prompt, maxTokens: 1200);
  }

  @override
  Future<List<String>> suggestMissingQuestions({
    required SceneTemplate template,
    required Map<String, dynamic> currentValues,
  }) async {
    final missing = template.checkMissingFields(currentValues);
    if (missing.isEmpty) return [];

    final prompt = '''
场景：${template.name}
已填：${_formatValues(template, currentValues)}
缺失：${missing.keys.join(', ')}

为每个缺失项生成一个简短追问，JSON 数组格式，仅返回 JSON：
''';

    try {
      final raw = await _generate(prompt, maxTokens: 400);
      final parsed = jsonDecode(raw) as List<dynamic>;
      return parsed.map((e) => e.toString()).toList();
    } catch (_) {
      return missing.keys.map((k) {
        final field = template.fields.firstWhere(
          (f) => f.key == k,
          orElse: () => TemplateField(key: k, label: k, type: FieldType.text),
        );
        return '请补充：${field.label}';
      }).toList();
    }
  }

  @override
  Future<String> chat({
    required String currentText,
    required String userMessage,
    SceneTemplate? template,
    String? tone,
  }) {
    final prompt = '''
当前文本：
$currentText

用户要求：
$userMessage

请输出优化后的完整文本，语气保持${tone ?? '中立'}：
''';
    return _generate(prompt);
  }

  String _formatValues(SceneTemplate template, Map<String, dynamic> values) {
    final buf = StringBuffer();
    for (final field in template.fields) {
      final v = values[field.key];
      if (v != null && v.toString().trim().isNotEmpty) {
        buf.writeln('- ${field.label}: $v');
      }
    }
    return buf.toString();
  }

  String _versionPrompt(String? version) {
    switch (version) {
      case 'short':
        return '简短版 100-200 字';
      case 'formal':
        return '正式完整版';
      case 'softened':
        return '降火缓和版';
      default:
        return '标准清晰版';
    }
  }
}
