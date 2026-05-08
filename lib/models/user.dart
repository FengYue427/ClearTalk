/// 用户模型
class User {
  final String id;
  final String username;
  final String? email;
  final String? avatar;
  final DateTime createdAt;
  final DateTime? lastLoginAt;

  User({
    required this.id,
    required this.username,
    this.email,
    this.avatar,
    required this.createdAt,
    this.lastLoginAt,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] ?? json['_id'] ?? '',
      username: json['username'] ?? '',
      email: json['email'],
      avatar: json['avatar'],
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'])
          : DateTime.now(),
      lastLoginAt: json['lastLoginAt'] != null
          ? DateTime.parse(json['lastLoginAt'])
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'username': username,
      'email': email,
      'avatar': avatar,
      'createdAt': createdAt.toIso8601String(),
      'lastLoginAt': lastLoginAt?.toIso8601String(),
    };
  }

  User copyWith({
    String? id,
    String? username,
    String? email,
    String? avatar,
    DateTime? createdAt,
    DateTime? lastLoginAt,
  }) {
    return User(
      id: id ?? this.id,
      username: username ?? this.username,
      email: email ?? this.email,
      avatar: avatar ?? this.avatar,
      createdAt: createdAt ?? this.createdAt,
      lastLoginAt: lastLoginAt ?? this.lastLoginAt,
    );
  }
}

/// 同步数据模型
class SyncData {
  final List<dynamic> history;
  final List<dynamic> customScenes;
  final Map<String, dynamic> settings;
  final List<dynamic> phrases;
  final Map<String, dynamic> dialogueContexts;
  final DateTime? lastModified;

  SyncData({
    this.history = const [],
    this.customScenes = const [],
    this.settings = const {},
    this.phrases = const [],
    this.dialogueContexts = const {},
    this.lastModified,
  });

  factory SyncData.fromJson(Map<String, dynamic> json) {
    return SyncData(
      history: json['history'] ?? [],
      customScenes: json['customScenes'] ?? [],
      settings: json['settings'] ?? {},
      phrases: json['phrases'] ?? [],
      dialogueContexts: json['dialogueContexts'] ?? {},
      lastModified: json['lastModified'] != null
          ? DateTime.parse(json['lastModified'])
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'history': history,
      'customScenes': customScenes,
      'settings': settings,
      'phrases': phrases,
      'dialogueContexts': dialogueContexts,
      'lastModified': lastModified?.toIso8601String(),
    };
  }
}
