import 'dart:convert';
import 'package:hive/hive.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/history_record.dart';
import '../models/quick_phrase.dart';

/// 本地存储服务
/// 所有数据默认本地保存，隐私优先
/// 支持云同步数据导入/导出
class StorageService {
  static const String _boxName = 'history';
  late Box<HistoryRecord> _box;
  SharedPreferences? _prefs;

  /// 初始化存储
  Future<void> init() async {
    _box = Hive.box<HistoryRecord>(_boxName);
    _prefs = await SharedPreferences.getInstance();
  }

  /// 保存记录
  Future<void> saveRecord(HistoryRecord record) async {
    await _box.put(record.id, record);
  }

  /// 获取所有记录（按时间倒序）
  List<HistoryRecord> getAllRecords() {
    final records = _box.values.toList();
    records.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    return records;
  }

  /// 按分类获取记录
  List<HistoryRecord> getRecordsByCategory(String category) {
    return getAllRecords()
        .where((r) => r.category == category)
        .toList();
  }

  /// 删除单条记录
  Future<void> deleteRecord(String id) async {
    await _box.delete(id);
  }

  /// 清空所有记录
  Future<void> clearAllRecords() async {
    await _box.clear();
  }

  /// 获取记录总数
  int getRecordCount() {
    return _box.length;
  }

  /// 搜索记录
  List<HistoryRecord> searchRecords(String keyword) {
    return getAllRecords().where((record) {
      final searchText = '${record.sceneName} ${record.generatedText}'.toLowerCase();
      return searchText.contains(keyword.toLowerCase());
    }).toList();
  }

  /// 保存主题模式
  Future<void> saveThemeMode(String themeMode) async {
    await _prefs?.setString('theme_mode', themeMode);
  }

  /// 获取主题模式
  String getThemeMode() {
    return _prefs?.getString('theme_mode') ?? 'system';
  }

  // ========== 快捷短语相关方法 ==========

  /// 获取所有快捷短语（按order排序）
  List<QuickPhrase> getAllPhrases() {
    final phrases = _prefs?.getStringList('quick_phrases') ?? [];
    final list = phrases.map((json) {
      final data = jsonDecode(json) as Map<String, dynamic>;
      return QuickPhrase(
        id: data['id'],
        text: data['text'],
        category: data['category'],
        createdAt: DateTime.parse(data['createdAt']),
        order: data['order'] ?? 0,
      );
    }).toList();
    list.sort((a, b) => a.order.compareTo(b.order));
    return list;
  }

  /// 保存快捷短语
  Future<void> savePhrase(QuickPhrase phrase) async {
    final phrases = getAllPhrases();
    final index = phrases.indexWhere((p) => p.id == phrase.id);
    if (index >= 0) {
      phrases[index] = phrase;
    } else {
      phrases.add(phrase);
    }
    await _savePhrases(phrases);
  }

  /// 删除快捷短语
  Future<void> deletePhrase(String id) async {
    final phrases = getAllPhrases().where((p) => p.id != id).toList();
    await _savePhrases(phrases);
  }

  /// 更新短语排序
  Future<void> updatePhraseOrder(List<QuickPhrase> phrases) async {
    await _savePhrases(phrases);
  }

  /// 保存短语列表到本地
  Future<void> _savePhrases(List<QuickPhrase> phrases) async {
    final jsonList = phrases.map((p) => jsonEncode({
      'id': p.id,
      'text': p.text,
      'category': p.category,
      'createdAt': p.createdAt.toIso8601String(),
      'order': p.order,
    })).toList();
    await _prefs?.setStringList('quick_phrases', jsonList);
  }

  // ========== 云同步支持 ==========

  /// 导出所有数据（用于上传云端）
  Future<Map<String, dynamic>> exportForSync() async {
    final history = getAllRecords().map((r) => r.toJson()).toList();
    final customScenesJson = _prefs?.getString('custom_scenes') ?? '[]';
    final settingsJson = _prefs?.getString('settings') ?? '{}';
    final phrases = _prefs?.getStringList('phrases') ?? [];
    final quickPhrases = _prefs?.getStringList('quick_phrases') ?? [];

    return {
      'history': history,
      'customScenes': jsonDecode(customScenesJson),
      'settings': jsonDecode(settingsJson),
      'phrases': phrases,
      'quickPhrases': quickPhrases,
      'exportTime': DateTime.now().toIso8601String(),
    };
  }

  /// 导入云端数据（支持合并或替换）
  Future<Map<String, dynamic>> importFromSync(
    Map<String, dynamic> data, {
    bool merge = true,
  }) async {
    final List<dynamic> historyData = data['history'] ?? [];
    final List<dynamic> customScenes = data['customScenes'] ?? [];
    final Map<String, dynamic> settings = data['settings'] ?? {};
    final List<dynamic> phrases = data['phrases'] ?? [];
    final List<dynamic> quickPhrases = data['quickPhrases'] ?? [];

    int importedRecords = 0;
    int skippedRecords = 0;

    if (merge) {
      // 合并模式：保留本地数据，添加云端独有的记录
      final localIds = getAllRecords().map((r) => r.id).toSet();

      for (final json in historyData) {
        try {
          final record = HistoryRecord.fromJson(json);
          if (!localIds.contains(record.id)) {
            await saveRecord(record);
            importedRecords++;
          } else {
            skippedRecords++;
          }
        } catch (e) {
          // 跳过无效记录
        }
      }
    } else {
      // 替换模式：清空本地，完全使用云端数据
      await clearAllRecords();
      for (final json in historyData) {
        try {
          final record = HistoryRecord.fromJson(json);
          await saveRecord(record);
          importedRecords++;
        } catch (e) {
          // 跳过无效记录
        }
      }
    }

    // 导入设置（云端优先）
    if (settings.isNotEmpty) {
      await _prefs?.setString('settings', jsonEncode(settings));
    }

    // 导入快捷短语
    if (phrases.isNotEmpty) {
      await _prefs?.setStringList(
        'phrases',
        phrases.map((p) => p.toString()).toList(),
      );
    }

    if (quickPhrases.isNotEmpty) {
      await _prefs?.setStringList(
        'quick_phrases',
        quickPhrases.map((p) => p.toString()).toList(),
      );
    }

    // 保存自定义场景
    if (customScenes.isNotEmpty) {
      await _prefs?.setString('custom_scenes', jsonEncode(customScenes));
    }

    return {
      'importedRecords': importedRecords,
      'skippedRecords': skippedRecords,
      'totalInCloud': historyData.length,
    };
  }

  /// 获取上次同步时间
  DateTime? getLastSyncTime() {
    final timestamp = _prefs?.getInt('last_sync_time');
    return timestamp != null
        ? DateTime.fromMillisecondsSinceEpoch(timestamp)
        : null;
  }

  /// 设置上次同步时间
  Future<void> setLastSyncTime(DateTime time) async {
    await _prefs?.setInt('last_sync_time', time.millisecondsSinceEpoch);
  }

  /// 获取本地数据哈希（用于检测变化）
  String? getDataHash() {
    return _prefs?.getString('data_hash');
  }

  /// 设置数据哈希
  Future<void> setDataHash(String hash) async {
    await _prefs?.setString('data_hash', hash);
  }

  /// 保存快捷短语
  Future<void> savePhrases(List<String> phrases) async {
    await _prefs?.setStringList('phrases', phrases);
  }

  /// 获取快捷短语
  List<String> getPhrases() {
    return _prefs?.getStringList('phrases') ?? [];
  }

  /// 保存自定义场景
  Future<void> saveCustomScenes(List<Map<String, dynamic>> scenes) async {
    await _prefs?.setString('custom_scenes', jsonEncode(scenes));
  }

  /// 获取自定义场景
  List<Map<String, dynamic>> getCustomScenes() {
    final json = _prefs?.getString('custom_scenes') ?? '[]';
    try {
      final List<dynamic> decoded = jsonDecode(json);
      return decoded.cast<Map<String, dynamic>>();
    } catch (e) {
      return [];
    }
  }

  /// 获取同步统计信息
  Map<String, dynamic> getSyncStats() {
    return {
      'recordCount': getRecordCount(),
      'lastSyncTime': getLastSyncTime()?.toIso8601String(),
      'customScenesCount': getCustomScenes().length,
      'phrasesCount': getPhrases().length,
    };
  }
}
