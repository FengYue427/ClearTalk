/// 场景模板定义
/// 每个模板定义了一个沟通场景的字段和输出结构
class SceneTemplate {
  final String id;
  final String name;
  final String category;
  final String description;
  final List<TemplateField> fields;
  final String defaultTone;
  final List<String> availableTones;
  final String fieldSelectPlaceholder;
  final String datePlaceholder;

  const SceneTemplate({
    required this.id,
    required this.name,
    required this.category,
    required this.description,
    required this.fields,
    this.defaultTone = 'neutral',
    this.availableTones = const ['soft', 'neutral', 'firm'],
    this.fieldSelectPlaceholder = 'Please select',
    this.datePlaceholder = 'Select date',
  });

  /// 获取所有必填字段
  List<TemplateField> get requiredFields => 
      fields.where((f) => f.required).toList();

  /// 检查字段值是否完整
  Map<String, dynamic> checkMissingFields(Map<String, dynamic> values) {
    final missing = <String, dynamic>{};
    for (final field in requiredFields) {
      final value = values[field.key];
      if (value == null || value.toString().trim().isEmpty) {
        missing[field.key] = '【待补充】';
      }
    }
    return missing;
  }
}

/// 模板字段定义
class TemplateField {
  final String key;
  final String label;
  final String? placeholder;
  final FieldType type;
  final bool required;
  final String? hint;
  final List<String>? options;

  const TemplateField({
    required this.key,
    required this.label,
    this.placeholder,
    this.type = FieldType.text,
    this.required = true,
    this.hint,
    this.options,
  });
}

enum FieldType {
  text,
  textarea,
  number,
  date,
  select,
  boolean,
}

/// 语气定义
class Tone {
  final String key;
  final String label;
  final String description;
  final String promptModifier;

  const Tone({
    required this.key,
    required this.label,
    required this.description,
    required this.promptModifier,
  });
}

/// 内置语气配置
class ToneConfig {
  static const soft = Tone(
    key: 'soft',
    label: '温和',
    description: '语气友好，留有余地',
    promptModifier: '使用温和、礼貌的语气，表达诉求时给对方留有余地，避免咄咄逼人',
  );
  
  static const neutral = Tone(
    key: 'neutral',
    label: '中立',
    description: '客观清晰，有理有据',
    promptModifier: '使用客观、清晰的语气，事实陈述准确，诉求明确但不过激',
  );
  
  static const firm = Tone(
    key: 'firm',
    label: '坚定',
    description: '立场明确，不卑不亢',
    promptModifier: '使用坚定、有力的语气，立场明确，诉求清晰，不卑不亢但保持礼貌',
  );
  
  static Tone getByKey(String key) {
    switch (key) {
      case 'soft': return soft;
      case 'firm': return firm;
      default: return neutral;
    }
  }
}
