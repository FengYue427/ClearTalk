import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/scene_template.dart';
import '../models/history_record.dart';
import '../models/quick_phrase.dart';
import '../services/storage_service.dart';
import '../services/ai_service.dart';
import '../templates/builtin_scenes.dart';

/// 存储服务 Provider
final storageServiceProvider = Provider<StorageService>((ref) {
  return StorageService();
});

/// AI 服务 Provider（默认使用 Mock，方便开发测试）
final aiServiceProvider = Provider<AiService>((ref) {
  // 开发阶段使用 Mock，接入真实 API 时替换
  return MockAiService();
});

/// 主题模式 Provider (system/light/dark) with persistence
final themeModeProvider = StateNotifierProvider<ThemeModeNotifier, ThemeMode>((ref) {
  return ThemeModeNotifier(ref.watch(storageServiceProvider));
});

/// 主题模式 Notifier - 加载和保存主题设置
class ThemeModeNotifier extends StateNotifier<ThemeMode> {
  final StorageService _storage;

  ThemeModeNotifier(this._storage) : super(ThemeMode.system) {
    _loadThemeMode();
  }

  Future<void> _loadThemeMode() async {
    await _storage.init();
    final savedMode = _storage.getThemeMode();
    state = _parseThemeMode(savedMode);
  }

  Future<void> setThemeMode(ThemeMode mode) async {
    state = mode;
    await _storage.saveThemeMode(_themeModeToString(mode));
  }

  ThemeMode _parseThemeMode(String value) {
    switch (value) {
      case 'light':
        return ThemeMode.light;
      case 'dark':
        return ThemeMode.dark;
      default:
        return ThemeMode.system;
    }
  }

  String _themeModeToString(ThemeMode mode) {
    switch (mode) {
      case ThemeMode.light:
        return 'light';
      case ThemeMode.dark:
        return 'dark';
      default:
        return 'system';
    }
  }
}

/// 当前选中场景 Provider
final selectedSceneProvider = StateProvider<SceneTemplate?>((ref) => null);

/// 当前填写值 Provider
final formValuesProvider = StateProvider<Map<String, dynamic>>((ref) => {});

/// 当前语气 Provider
final selectedToneProvider = StateProvider<String>((ref) => 'neutral');

/// 生成的文本 Provider
final generatedTextProvider = StateProvider<String?>((ref) => null);

/// 历史记录列表 Provider
final historyRecordsProvider = StateNotifierProvider<HistoryNotifier, List<HistoryRecord>>((ref) {
  return HistoryNotifier(ref.watch(storageServiceProvider));
});

class HistoryNotifier extends StateNotifier<List<HistoryRecord>> {
  final StorageService _storage;

  HistoryNotifier(this._storage) : super([]) {
    _loadRecords();
  }

  Future<void> _loadRecords() async {
    await _storage.init();
    state = _storage.getAllRecords();
  }

  Future<void> addRecord(HistoryRecord record) async {
    await _storage.saveRecord(record);
    state = _storage.getAllRecords();
  }

  Future<void> deleteRecord(String id) async {
    await _storage.deleteRecord(id);
    state = _storage.getAllRecords();
  }

  Future<void> clearAll() async {
    await _storage.clearAllRecords();
    state = [];
  }

  /// 刷新历史记录（用于下拉刷新）
  Future<void> refresh() async {
    await _loadRecords();
  }
}

/// 快捷短语 Provider
final quickPhrasesProvider = StateNotifierProvider<QuickPhrasesNotifier, List<QuickPhrase>>((ref) {
  return QuickPhrasesNotifier(ref.watch(storageServiceProvider));
});

/// 快捷短语 Notifier
class QuickPhrasesNotifier extends StateNotifier<List<QuickPhrase>> {
  final StorageService _storage;

  QuickPhrasesNotifier(this._storage) : super([]) {
    _loadPhrases();
  }

  Future<void> _loadPhrases() async {
    await _storage.init();
    state = _storage.getAllPhrases();
  }

  Future<void> addPhrase(String text, {String? category}) async {
    final phrase = QuickPhrase(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      text: text,
      category: category,
      createdAt: DateTime.now(),
      order: state.length,
    );
    await _storage.savePhrase(phrase);
    state = _storage.getAllPhrases();
  }

  Future<void> deletePhrase(String id) async {
    await _storage.deletePhrase(id);
    state = _storage.getAllPhrases();
  }

  Future<void> updatePhraseOrder(List<QuickPhrase> phrases) async {
    await _storage.updatePhraseOrder(phrases);
    state = _storage.getAllPhrases();
  }

  Future<void> refresh() async {
    await _loadPhrases();
  }
}

/// 按分类获取场景
final scenesByCategoryProvider = Provider.family<List<SceneTemplate>, String>((ref, category) {
  return BuiltinScenes.byCategory(category);
});

/// 所有场景分类
final sceneCategoriesProvider = Provider<List<String>>((ref) {
  final allScenes = BuiltinScenes.all;
  final categories = allScenes.map((s) => s.category).toSet().toList();
  return categories;
});
