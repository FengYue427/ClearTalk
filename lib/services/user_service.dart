import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user.dart';

/// 用户服务 - 认证、登录、注册
class UserService {
  static final UserService _instance = UserService._internal();
  factory UserService() => _instance;
  UserService._internal();

  final Dio _dio = Dio(BaseOptions(
    baseUrl: 'https://your-backend-url.com', // TODO: 替换为实际后端地址
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 10),
    headers: {'Content-Type': 'application/json'},
  ));

  static const String _baseUrlPrefKey = 'cleartalk_api_base_url';

  User? _currentUser;
  String? _token;
  SharedPreferences? _prefs;

  // 状态监听器
  final List<Function(User?)> _userListeners = [];

  /// 初始化
  Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();

    final savedBaseUrl = _prefs?.getString(_baseUrlPrefKey);
    if (savedBaseUrl != null && savedBaseUrl.trim().isNotEmpty) {
      _dio.options.baseUrl = savedBaseUrl.trim();
    }

    _token = _prefs?.getString('cleartalk_token');
    
    final userJson = _prefs?.getString('cleartalk_user');
    if (userJson != null) {
      try {
        _currentUser = User.fromJson(jsonDecode(userJson));
      } catch (e) {
        // 解析失败，清除存储
        await clearSession();
      }
    }

    // 设置 Dio 拦截器自动添加 Token
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) {
        if (_token != null) {
          options.headers['Authorization'] = 'Bearer $_token';
        }
        handler.next(options);
      },
      onError: (error, handler) async {
        // Token 过期处理
        if (error.response?.statusCode == 401) {
          await clearSession();
        }
        handler.next(error);
      },
    ));
  }

  /// 获取当前用户
  User? get currentUser => _currentUser;

  /// 检查登录状态
  bool get isLoggedIn => _token != null && _currentUser != null;

  /// 获取 Token
  String? get token => _token;

  /// 添加用户状态监听
  void addListener(Function(User?) listener) {
    _userListeners.add(listener);
  }

  /// 移除用户状态监听
  void removeListener(Function(User?) listener) {
    _userListeners.remove(listener);
  }

  /// 通知监听器
  void _notifyListeners() {
    for (final listener in _userListeners) {
      listener(_currentUser);
    }
  }

  /// 注册
  Future<Map<String, dynamic>> register({
    required String username,
    required String email,
    required String password,
  }) async {
    try {
      final response = await _dio.post('/api/auth/register', data: {
        'username': username,
        'email': email,
        'password': password,
      });

      final result = response.data;
      if (result['token'] != null && result['user'] != null) {
        final user = User.fromJson(result['user']);
        await _setSession(result['token'], user);
        return {'success': true, 'user': user};
      }

      return {'success': false, 'error': 'Registration failed'};
    } on DioException catch (e) {
      final message = e.response?.data?['error'] ?? e.message ?? 'Network error';
      return {'success': false, 'error': message};
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  /// 登录
  Future<Map<String, dynamic>> login({
    required String username,
    required String password,
  }) async {
    try {
      final response = await _dio.post('/api/auth/login', data: {
        'username': username,
        'password': password,
      });

      final result = response.data;
      if (result['token'] != null && result['user'] != null) {
        final user = User.fromJson(result['user']);
        await _setSession(result['token'], user);
        return {'success': true, 'user': user};
      }

      return {'success': false, 'error': 'Login failed'};
    } on DioException catch (e) {
      final message = e.response?.data?['error'] ?? e.message ?? 'Network error';
      return {'success': false, 'error': message};
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  /// 登出
  Future<void> logout() async {
    try {
      // 通知后端登出（可选）
      if (_token != null) {
        await _dio.post('/api/auth/logout');
      }
    } catch (e) {
      // 忽略登出错误
    } finally {
      await clearSession();
    }
  }

  /// 清除会话
  Future<void> clearSession() async {
    _token = null;
    _currentUser = null;
    await _prefs?.remove('cleartalk_token');
    await _prefs?.remove('cleartalk_user');
    _notifyListeners();
  }

  /// 更新用户信息
  Future<Map<String, dynamic>> updateProfile({
    String? username,
    String? email,
    String? avatar,
  }) async {
    if (!isLoggedIn) {
      return {'success': false, 'error': 'Not logged in'};
    }

    try {
      final response = await _dio.put('/api/user/profile', data: {
        if (username != null) 'username': username,
        if (email != null) 'email': email,
        if (avatar != null) 'avatar': avatar,
      });

      final result = response.data;
      if (result['user'] != null) {
        final user = User.fromJson(result['user']);
        _currentUser = user;
        await _prefs?.setString('cleartalk_user', jsonEncode(user.toJson()));
        _notifyListeners();
        return {'success': true, 'user': user};
      }

      return {'success': false, 'error': 'Update failed'};
    } on DioException catch (e) {
      final message = e.response?.data?['error'] ?? e.message ?? 'Network error';
      return {'success': false, 'error': message};
    }
  }

  /// 修改密码
  Future<Map<String, dynamic>> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    if (!isLoggedIn) {
      return {'success': false, 'error': 'Not logged in'};
    }

    try {
      final response = await _dio.post('/api/user/change-password', data: {
        'currentPassword': currentPassword,
        'newPassword': newPassword,
      });

      return {'success': true};
    } on DioException catch (e) {
      final message = e.response?.data?['error'] ?? e.message ?? 'Network error';
      return {'success': false, 'error': message};
    }
  }

  /// 设置会话
  Future<void> _setSession(String token, User user) async {
    _token = token;
    _currentUser = user;
    await _prefs?.setString('cleartalk_token', token);
    await _prefs?.setString('cleartalk_user', jsonEncode(user.toJson()));
    _notifyListeners();
  }

  /// 获取快捷短语
  Future<List<String>> getPhrases() async {
    if (!isLoggedIn) {
      return _prefs?.getStringList('local_phrases') ?? [];
    }

    try {
      final response = await _dio.get('/api/user/phrases');
      return List<String>.from(response.data['phrases'] ?? []);
    } catch (e) {
      // 失败返回本地存储
      return _prefs?.getStringList('local_phrases') ?? [];
    }
  }

  /// 保存快捷短语
  Future<bool> savePhrases(List<String> phrases) async {
    // 先保存到本地
    await _prefs?.setStringList('local_phrases', phrases);

    if (!isLoggedIn) return true;

    try {
      await _dio.put('/api/user/phrases', data: {'phrases': phrases});
      return true;
    } catch (e) {
      return false;
    }
  }

  /// 设置后端地址（用于测试）
  void setBaseUrl(String url) {
    _dio.options.baseUrl = url;
    _prefs?.setString(_baseUrlPrefKey, url);
  }

  String get baseUrl => _dio.options.baseUrl;
}
