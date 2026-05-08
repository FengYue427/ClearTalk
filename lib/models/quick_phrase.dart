/// 快捷短语模型
class QuickPhrase {
  final String id;

  final String text;

  final String? category;

  final DateTime createdAt;

  final int order;

  QuickPhrase({
    required this.id,
    required this.text,
    this.category,
    required this.createdAt,
    this.order = 0,
  });

  QuickPhrase copyWith({
    String? id,
    String? text,
    String? category,
    DateTime? createdAt,
    int? order,
  }) {
    return QuickPhrase(
      id: id ?? this.id,
      text: text ?? this.text,
      category: category ?? this.category,
      createdAt: createdAt ?? this.createdAt,
      order: order ?? this.order,
    );
  }
}
