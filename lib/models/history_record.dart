import 'package:hive/hive.dart';

part 'history_record.g.dart';

@HiveType(typeId: 0)
class HistoryRecord extends HiveObject {
  @HiveField(0)
  final String id;
  
  @HiveField(1)
  final String sceneId;
  
  @HiveField(2)
  final String sceneName;
  
  @HiveField(3)
  final Map<String, dynamic> inputValues;
  
  @HiveField(4)
  final String generatedText;
  
  @HiveField(5)
  final String tone;
  
  @HiveField(6)
  final DateTime createdAt;
  
  @HiveField(7)
  final String? category;

  HistoryRecord({
    required this.id,
    required this.sceneId,
    required this.sceneName,
    required this.inputValues,
    required this.generatedText,
    required this.tone,
    required this.createdAt,
    this.category,
  });

  HistoryRecord copyWith({
    String? id,
    String? sceneId,
    String? sceneName,
    Map<String, dynamic>? inputValues,
    String? generatedText,
    String? tone,
    DateTime? createdAt,
    String? category,
  }) {
    return HistoryRecord(
      id: id ?? this.id,
      sceneId: sceneId ?? this.sceneId,
      sceneName: sceneName ?? this.sceneName,
      inputValues: inputValues ?? this.inputValues,
      generatedText: generatedText ?? this.generatedText,
      tone: tone ?? this.tone,
      createdAt: createdAt ?? this.createdAt,
      category: category ?? this.category,
    );
  }

  /// 转换为 JSON
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'sceneId': sceneId,
      'sceneName': sceneName,
      'inputValues': inputValues,
      'generatedText': generatedText,
      'tone': tone,
      'createdAt': createdAt.toIso8601String(),
      'category': category,
    };
  }

  /// 从 JSON 创建实例
  factory HistoryRecord.fromJson(Map<String, dynamic> json) {
    return HistoryRecord(
      id: json['id'] as String,
      sceneId: json['sceneId'] as String,
      sceneName: json['sceneName'] as String,
      inputValues: json['inputValues'] as Map<String, dynamic>,
      generatedText: json['generatedText'] as String,
      tone: json['tone'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
      category: json['category'] as String?,
    );
  }
}
