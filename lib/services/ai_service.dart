import 'dart:convert';
import 'package:dio/dio.dart';
import '../models/scene_template.dart';

/// AI 服务抽象层
/// 支持多供应商：OpenAI、Deepseek、Qwen
abstract class AiService {
  /// 改写文本语气
  Future<String> rewrite({
    required String text,
    required Tone tone,
  });
  
  /// 根据模板生成文本
  Future<String> generate({
    required SceneTemplate template,
    required Map<String, dynamic> values,
    required Tone tone,
    String? version, // 'short', 'formal', 'softened'
  });
  
  /// 检查缺失信息并建议补充问题
  Future<List<String>> suggestMissingQuestions({
    required SceneTemplate template,
    required Map<String, dynamic> currentValues,
  });

  /// 对话追问 - 基于已有文本继续对话
  Future<String> chat({
    required String currentText,
    required String userMessage,
    SceneTemplate? template,
    String? tone,
  });
}

/// AI 供应商配置
class AiProviderConfig {
  final String name;
  final String baseUrl;
  final String model;
  final Map<String, dynamic> defaultParams;

  const AiProviderConfig({
    required this.name,
    required this.baseUrl,
    required this.model,
    required this.defaultParams,
  });
}

/// 供应商预设配置
class AiProviders {
  static const openAI = AiProviderConfig(
    name: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-3.5-turbo',
    defaultParams: {
      'temperature': 0.7,
      'max_tokens': 1000,
    },
  );
  
  static const deepseek = AiProviderConfig(
    name: 'deepseek',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    defaultParams: {
      'temperature': 0.7,
      'max_tokens': 1000,
    },
  );
  
  static const qwen = AiProviderConfig(
    name: 'qwen',
    baseUrl: 'https://dashscope.aliyuncs.com/api/v1',
    model: 'qwen-turbo',
    defaultParams: {
      'temperature': 0.7,
      'max_tokens': 1000,
    },
  );
}

/// 通用 AI 服务实现
class GenericAiService implements AiService {
  final Dio _dio;
  final AiProviderConfig _config;
  final String? _apiKey;

  GenericAiService({
    required AiProviderConfig config,
    String? apiKey,
  })  : _config = config,
        _apiKey = apiKey,
        _dio = Dio(BaseOptions(
          baseUrl: config.baseUrl,
          headers: apiKey != null
              ? {'Authorization': 'Bearer $apiKey'}
              : null,
        ));

  @override
  Future<String> rewrite({
    required String text,
    required Tone tone,
  }) async {
    final prompt = '''
请将以下文本按照指定语气改写，保持原意不变：

原文本：
$text

要求语气：${tone.promptModifier}

要求：
1. 只输出改写后的文本，不要解释
2. 保持事实准确，不要添加不存在的内容
3. 保持原意和核心诉求不变

改写后文本：
''';

    return _callLLM(prompt);
  }

  @override
  Future<String> generate({
    required SceneTemplate template,
    required Map<String, dynamic> values,
    required Tone tone,
    String? version,
  }) async {
    final versionPrompt = _getVersionPrompt(version);
    
    final prompt = '''
你是一个专业的沟通助手。请根据以下信息生成一段沟通文本。

场景：${template.name}
语气要求：${tone.promptModifier}

用户填写的信息：
${_formatValues(values)}

生成要求：
1. $versionPrompt
2. 结构清晰：背景-事实-诉求-期限-结尾
3. 使用${tone.label}语气
4. 保持事实准确，缺失信息用【待补充】占位
5. 不要编造不存在的事实或证据
6. 语言自然，像真人说话

请直接输出文本，不要加解释：
''';

    return _callLLM(prompt);
  }

  @override
  Future<List<String>> suggestMissingQuestions({
    required SceneTemplate template,
    required Map<String, dynamic> currentValues,
  }) async {
    final missingFields = template.checkMissingFields(currentValues);
    if (missingFields.isEmpty) return [];

    final prompt = '''
场景：${template.name}

当前已填信息：
${_formatValues(currentValues)}

缺失的关键信息：
${_formatValues(missingFields)}

请为每个缺失字段生成一个简洁的询问问题，帮助用户补充信息。
问题要具体、有引导性，让用户容易回答。

请用JSON数组格式返回，例如：["问题1", "问题2"]
只返回JSON数组，不要有其他内容。
''';

    try {
      final response = await _callLLM(prompt);
      final List<dynamic> parsed = jsonDecode(response);
      return parsed.cast<String>();
    } catch (_) {
      // 如果解析失败，返回简单的提示
      return missingFields.keys.map((k) {
        final field = template.fields.firstWhere(
          (f) => f.key == k,
          orElse: () => TemplateField(
            key: k,
            label: k,
            type: FieldType.text,
          ),
        );
        return '请补充：${field.label}${field.hint != null ? ' (${field.hint})' : ''}';
      }).toList();
    }
  }

  String _getVersionPrompt(String? version) {
    switch (version) {
      case 'short':
        return '生成简短版本（100-200字），适合微信/短信发送';
      case 'formal':
        return '生成正式版本，结构完整，适合邮件或工单';
      case 'softened':
        return '生成"降火"版本，语气缓和但立场清晰，避免激化矛盾';
      default:
        return '生成标准版本，结构完整，清晰明确';
    }
  }

  String _formatValues(Map<String, dynamic> values) {
    return values.entries.map((e) => '- ${e.key}: ${e.value}').join('\n');
  }

  Future<String> _callLLM(String prompt) async {
    // 实际实现需要调用对应供应商的 API
    // 这里提供通用 OpenAI 兼容格式的实现
    
    final response = await _dio.post('/chat/completions', data: {
      'model': _config.model,
      'messages': [
        {'role': 'system', 'content': '你是一个专业的沟通助手，帮助用户清晰、得体地表达诉求。你只基于用户提供的事实生成文本，从不编造信息。'},
        {'role': 'user', 'content': prompt},
      ],
      ..._config.defaultParams,
    });

    return response.data['choices'][0]['message']['content'] as String;
  }

  @override
  Future<String> chat({
    required String currentText,
    required String userMessage,
    SceneTemplate? template,
    String? tone,
  }) async {
    final prompt = '''
你是一位专业的沟通助手。用户有以下沟通文本，并想进行追问或修改。

当前文本：
$currentText

用户的追问/要求：
$userMessage

请根据用户的要求，生成优化后的文本。要求：
1. 保持原有的事实和信息不变
2. 满足用户的追问/修改要求
3. 语气保持${tone ?? '中立'}
4. 只输出优化后的文本，不要解释

优化后文本：
''';

    return _callLLM(prompt);
  }
}

/// 模拟 AI 服务（用于开发测试，无需 API Key）
class MockAiService implements AiService {
  @override
  Future<String> rewrite({required String text, required Tone tone}) async {
    await Future.delayed(const Duration(milliseconds: 500));
    return '【${tone.label}版】\n\n$text\n\n（此为模拟输出，接入真实 API 后将生成优化版本）';
  }

  @override
  Future<String> generate({
    required SceneTemplate template,
    required Map<String, dynamic> values,
    required Tone tone,
    String? version,
  }) async {
    await Future.delayed(const Duration(milliseconds: 800));
    
    final toneLabel = tone.label;
    final versionLabel = version ?? '标准';
    
    final buffer = StringBuffer();
    buffer.writeln('【$toneLabel - $versionLabel版】\n');
    buffer.writeln('尊敬的相关负责人：');
    buffer.writeln();
    buffer.writeln('关于${template.name}事宜，说明如下：');
    buffer.writeln();
    
    for (final entry in values.entries) {
      if (entry.value != null && entry.value.toString().isNotEmpty) {
        buffer.writeln('• ${entry.key}: ${entry.value}');
      } else {
        buffer.writeln('• ${entry.key}: 【待补充】');
      }
    }
    
    buffer.writeln();
    buffer.writeln('恳请协助处理，期待回复。');
    buffer.writeln();
    buffer.writeln('此致');
    buffer.writeln('敬礼');
    buffer.writeln();
    buffer.writeln('（此为模拟输出，接入真实 API 后将生成优化版本）');
    
    return buffer.toString();
  }

  @override
  Future<List<String>> suggestMissingQuestions({
    required SceneTemplate template,
    required Map<String, dynamic> currentValues,
  }) async {
    await Future.delayed(const Duration(milliseconds: 300));
    
    final missing = template.checkMissingFields(currentValues);
    return missing.keys.map((k) {
      final field = template.fields.firstWhere(
        (f) => f.key == k,
        orElse: () => TemplateField(key: k, label: k, type: FieldType.text),
      );
      return '请补充：${field.label}${field.hint != null ? ' (${field.hint})' : ''}';
    }).toList();
  }

  @override
  Future<String> chat({
    required String currentText,
    required String userMessage,
    SceneTemplate? template,
    String? tone,
  }) async {
    await Future.delayed(const Duration(milliseconds: 800));
    
    return '''【对话回复】

根据您的要求「$userMessage」，已优化文本：

---

$currentText

---

（此为模拟对话回复，接入真实 API 后将根据您的要求生成优化版本）''';
  }
}
