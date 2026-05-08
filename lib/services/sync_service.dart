import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/history_record.dart';
import 'user_service.dart';
import 'storage_service.dart';

/// 同步服务 - 云同步、多设备数据互通
class SyncService {
  static final SyncService _instance = SyncService._internal();
  factory SyncService() => _instance;
  SyncService._internal();

  final Dio _dio = Dio(BaseOptions(
    baseUrl: 'https://your-backend-url.com', // TODO: 替换为实际后端地址
    connectTimeout: const Duration(seconds: 30),
    receiveTimeout: const Duration(seconds: 30),
    headers: {'Content-Type': 'application/json'},
  ));

  static const String _baseUrlPrefKey = 'cleartalk_api_base_url';

  final UserService _userService = UserService();
  StorageService? _storageService;
  SharedPreferences? _prefs;

  // 同步状态
  bool _isSyncing = false;
  DateTime? _lastSyncTime;

  // 状态监听器
  final List<Function(bool)> _syncListeners = [];

  /// 初始化
  Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();

    final savedBaseUrl = _prefs?.getString(_baseUrlPrefKey);
    if (savedBaseUrl != null && savedBaseUrl.trim().isNotEmpty) {
      _dio.options.baseUrl = savedBaseUrl.trim();
    }

    _lastSyncTime = _prefs?.getInt('last_sync_time') != null
        ? DateTime.fromMillisecondsSinceEpoch(_prefs!.getInt('last_sync_time')!)
        : null;

    // 设置 Dio 拦截器
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) {
        final token = _userService.token;
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
    ));
  }

  /// 设置存储服务
  void setStorageService(StorageService storage) {
    _storageService = storage;
  }

  /// 是否正在同步
  bool get isSyncing => _isSyncing;

  /// 上次同步时间
  DateTime? get lastSyncTime => _lastSyncTime;

  /// 添加同步状态监听
  void addListener(Function(bool) listener) {
    _syncListeners.add(listener);
  }

  /// 移除同步状态监听
  void removeListener(Function(bool) listener) {
    _syncListeners.remove(listener);
  }

  /// 通知监听器
  void _notifyListeners(bool syncing) {
    for (final listener in _syncListeners) {
      listener(syncing);
    }
  }

  /// 上传到云端
  Future<Map<String, dynamic>> upload() async {
    if (!_userService.isLoggedIn) {
      throw Exception('Login required');
    }

    if (_storageService == null) {
      throw Exception('Storage service not initialized');
    }

    try {
      // 收集本地数据（与本地备份逻辑保持一致）
      final data = await _storageService!.exportForSync();

      final response = await _dio.post('/api/sync/upload', data: {'data': data});

      // 保存同步时间
      _lastSyncTime = DateTime.now();
      await _prefs?.setInt('last_sync_time', _lastSyncTime!.millisecondsSinceEpoch);

      return {
        'success': true,
        'timestamp': _lastSyncTime,
        'serverTime': response.data['timestamp'],
      };
    } on DioException catch (e) {
      final message = e.response?.data?['error'] ?? e.message ?? 'Network error';
      throw Exception(message);
    }
  }

  /// 从云端下载
  Future<Map<String, dynamic>> download() async {
    if (!_userService.isLoggedIn) {
      throw Exception('Login required');
    }

    try {
      final response = await _dio.get('/api/sync/download');
      final data = response.data;

      return {
        'success': true,
        'history': (data?['history'] as List<dynamic>?)?.map((json) {
          try {
            return HistoryRecord.fromJson(json);
          } catch (_) {
            return null;
          }
        }).whereType<HistoryRecord>().toList() ?? [],
        'customScenes': data?['customScenes'] ?? [],
        'settings': data?['settings'] ?? {},
        'phrases': List<String>.from(data?['phrases'] ?? []),
        'quickPhrases': List<String>.from(data?['quickPhrases'] ?? []),
        'lastModified': data?['lastSync'] != null
            ? DateTime.tryParse(data['lastSync'].toString())
            : null,
      };
    } on DioException catch (e) {
      final message = e.response?.data?['error'] ?? e.message ?? 'Network error';
      throw Exception(message);
    }
  }

  /// 同步到云端（立即上传）
  Future<Map<String, dynamic>> syncToCloud() async {
    _isSyncing = true;
    _notifyListeners(true);

    try {
      final result = await upload();
      _isSyncing = false;
      _notifyListeners(false);
      return {'success': true, 'timestamp': result['timestamp']};
    } catch (error) {
      _isSyncing = false;
      _notifyListeners(false);
      return {'success': false, 'error': error.toString()};
    }
  }

  /// 从云端同步（下载并合并）
  Future<Map<String, dynamic>> syncFromCloud({bool merge = true}) async {
    if (!_userService.isLoggedIn) {
      return {'success': false, 'error': 'Not logged in'};
    }

    _isSyncing = true;
    _notifyListeners(true);

    try {
      final cloud = await download();

      if (_storageService == null) {
        throw Exception('Storage service not initialized');
      }

      final payload = <String, dynamic>{
        'history': (cloud['history'] as List<HistoryRecord>).map((r) => r.toJson()).toList(),
        'customScenes': cloud['customScenes'],
        'settings': cloud['settings'],
        'phrases': cloud['phrases'],
        'quickPhrases': cloud['quickPhrases'],
      };

      await _storageService!.importFromSync(payload, merge: merge);

      // 更新同步时间
      _lastSyncTime = DateTime.now();
      await _prefs?.setInt('last_sync_time', _lastSyncTime!.millisecondsSinceEpoch);

      _isSyncing = false;
      _notifyListeners(false);

      return {
        'success': true,
        'timestamp': _lastSyncTime,
        'recordsCount': (cloud['history'] as List).length,
      };
    } catch (error) {
      _isSyncing = false;
      _notifyListeners(false);
      return {'success': false, 'error': error.toString()};
    }
  }

  /// 自动同步（登录后调用）
  Future<void> autoSync() async {
    if (!_userService.isLoggedIn) return;

    // 检查网络状态（实际实现需要 connectivity_plus）
    try {
      // 优先从云端下载合并
      await syncFromCloud(merge: true);
      // 然后上传本地新数据
      await syncToCloud();
    } catch (e) {
      // 自动同步失败不抛出错误
      print('Auto sync failed: $e');
    }
  }

  /// 获取同步状态文本
  String getSyncStatusText() {
    if (_isSyncing) return 'syncing';
    if (_lastSyncTime == null) return 'never';
    
    final diff = DateTime.now().difference(_lastSyncTime!);
    if (diff.inMinutes < 1) return 'just_now';
    if (diff.inHours < 1) return '${diff.inMinutes} minutes ago';
    if (diff.inDays < 1) return '${diff.inHours} hours ago';
    return '${diff.inDays} days ago';
  }

  /// 设置后端地址
  void setBaseUrl(String url) {
    _dio.options.baseUrl = url;
    _prefs?.setString(_baseUrlPrefKey, url);
  }

  String get baseUrl => _dio.options.baseUrl;
}
