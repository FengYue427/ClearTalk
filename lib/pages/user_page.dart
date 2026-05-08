import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'dart:convert';
import 'dart:io';
import 'package:file_picker/file_picker.dart';
import 'package:crypto/crypto.dart';
import 'package:share_plus/share_plus.dart';
import '../services/user_service.dart';
import '../services/sync_service.dart';
import '../l10n/app_i18n.dart';
import '../providers/app_provider.dart';
import '../utils/error_handler.dart';

/// 用户中心页面 - 登录/注册/个人信息
class UserPage extends ConsumerStatefulWidget {
  const UserPage({super.key});

  @override
  ConsumerState<UserPage> createState() => _UserPageState();
}

class _UserPageState extends ConsumerState<UserPage> {
  final UserService _userService = UserService();
  final SyncService _syncService = SyncService();

  static const int _backupFormatVersion = 1;

  bool _isLogin = true; // true=登录, false=注册
  bool _isLoading = false;
  bool _obscurePassword = true;

  final _formKey = GlobalKey<FormState>();
  final _usernameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  @override
  void dispose() {
    _usernameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final i18n = AppI18n.of(context);

    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        title: Text(_userService.isLoggedIn
            ? i18n.tr('user.profile.title')
            : (_isLogin ? i18n.tr('auth.login.title') : i18n.tr('auth.register.title'))),
        elevation: 0,
        backgroundColor: Colors.transparent,
        foregroundColor: Colors.black87,
      ),
      body: _userService.isLoggedIn
          ? _buildProfileView(i18n)
          : _buildAuthForm(i18n),
    );
  }

  /// 已登录 - 个人信息视图
  Widget _buildProfileView(AppI18n i18n) {
    final user = _userService.currentUser;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          // 头像和用户名
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 10,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Column(
              children: [
                CircleAvatar(
                  radius: 50,
                  backgroundColor: const Color(0xFF5B8DEF).withOpacity(0.1),
                  child: Text(
                    user?.username.substring(0, 1).toUpperCase() ?? 'U',
                    style: const TextStyle(
                      fontSize: 36,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF5B8DEF),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  user?.username ?? '',
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                if (user?.email != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    user!.email!,
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey[600],
                    ),
                  ),
                ],
              ],
            ),
          ),

          const SizedBox(height: 20),

          // 同步状态
          _buildSyncCard(i18n),

          const SizedBox(height: 20),

          // 主题模式设置
          _buildThemeCard(i18n),

          const SizedBox(height: 20),

          // 快捷短语设置
          _buildPhrasesCard(i18n),

          const SizedBox(height: 20),

          // 登出按钮
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: _isLoading ? null : _logout,
              icon: const Icon(Icons.logout),
              label: Text(i18n.tr('auth.logout')),
              style: OutlinedButton.styleFrom(
                foregroundColor: Colors.red[400],
                side: BorderSide(color: Colors.red[200]!),
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _showBaseUrlDialog() async {
    final i18n = AppI18n.of(context);
    final controller = TextEditingController(text: _syncService.baseUrl);

    final result = await showDialog<String>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: Text(i18n.tr('sync.server.base_url')),
          content: TextField(
            controller: controller,
            decoration: InputDecoration(
              hintText: i18n.tr('sync.server.base_url_hint'),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text(i18n.tr('common.cancel')),
            ),
            TextButton(
              onPressed: () => Navigator.pop(context, controller.text.trim()),
              child: Text(i18n.tr('common.save')),
            ),
          ],
        );
      },
    );

    if (result == null || result.isEmpty) return;

    await ErrorHandler.runWithErrorHandling(
      context,
      () async {
        _syncService.setBaseUrl(result);
        _userService.setBaseUrl(result);
        if (mounted) {
          setState(() {});
          ErrorHandler.showSuccess(context, i18n.tr('sync.server.base_url_saved'));
        }
      },
    );
  }

  /// 同步状态卡片
  Widget _buildSyncCard(AppI18n i18n) {
    final lastSync = _syncService.lastSyncTime;
    String syncText;
    if (lastSync == null) {
      syncText = i18n.tr('sync.never');
    } else {
      final diff = DateTime.now().difference(lastSync);
      if (diff.inMinutes < 1) {
        syncText = i18n.tr('sync.just_now');
      } else if (diff.inHours < 1) {
        syncText = i18n.tr('sync.minutes_ago', params: {'minutes': diff.inMinutes.toString()});
      } else if (diff.inDays < 1) {
        syncText = i18n.tr('sync.hours_ago', params: {'hours': diff.inHours.toString()});
      } else {
        syncText = i18n.tr('sync.days_ago', params: {'days': diff.inDays.toString()});
      }
    }

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          ListTile(
            leading: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.teal.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(
                Icons.dns_outlined,
                color: Colors.teal,
              ),
            ),
            title: Text(i18n.tr('sync.server.base_url')),
            subtitle: Text(_syncService.baseUrl),
            trailing: const Icon(Icons.chevron_right),
            onTap: _isLoading ? null : _showBaseUrlDialog,
          ),
          const Divider(height: 1, indent: 72),
          ListTile(
            leading: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFF5B8DEF).withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(
                Icons.sync,
                color: Color(0xFF5B8DEF),
              ),
            ),
            title: Text(i18n.tr('sync.title')),
            subtitle: Text('${i18n.tr('sync.last')}: $syncText'),
            trailing: _isLoading
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.chevron_right),
            onTap: _isLoading ? null : _syncNow,
          ),
          const Divider(height: 1, indent: 72),
          ListTile(
            leading: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.orange.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(
                Icons.cloud_download,
                color: Colors.orange,
              ),
            ),
            title: Text(i18n.tr('sync.download')),
            subtitle: Text(i18n.tr('sync.download_hint')),
            onTap: _isLoading ? null : () => _syncFromCloud(false),
          ),
          const Divider(height: 1, indent: 72),
          ListTile(
            leading: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.green.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(
                Icons.download_outlined,
                color: Colors.green,
              ),
            ),
            title: Text(i18n.tr('sync.backup.export')),
            subtitle: Text(i18n.tr('sync.backup.export_hint')),
            onTap: _isLoading ? null : _exportBackupToFile,
          ),
          const Divider(height: 1, indent: 72),
          ListTile(
            leading: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.purple.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(
                Icons.upload_file_outlined,
                color: Colors.purple,
              ),
            ),
            title: Text(i18n.tr('sync.backup.import')),
            subtitle: Text(i18n.tr('sync.backup.import_hint')),
            onTap: _isLoading ? null : _importBackupFromFile,
          ),
        ],
      ),
    );
  }

  Future<bool?> _selectImportMode() async {
    final i18n = AppI18n.of(context);
    return showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: Text(i18n.tr('sync.backup.import_title')),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, true),
              child: Text(i18n.tr('sync.backup.import_merge')),
            ),
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: Text(i18n.tr('sync.backup.import_replace')),
            ),
          ],
        );
      },
    );
  }

  Future<void> _exportBackupToFile() async {
    setState(() => _isLoading = true);
    final i18n = AppI18n.of(context);

    await ErrorHandler.runWithErrorHandling(
      context,
      () async {
        final storage = ref.read(storageServiceProvider);
        final rawData = await storage.exportForSync();

        // A2: 添加版本号与校验，便于后续兼容
        final canonicalPayload = jsonEncode(rawData);
        final checksum = sha256.convert(utf8.encode(canonicalPayload)).toString();
        final data = <String, dynamic>{
          ...rawData,
          'backupVersion': _backupFormatVersion,
          'checksum': checksum,
          'checksumAlgo': 'sha256',
        };
        final content = const JsonEncoder.withIndent('  ').convert(data);

        final defaultName = 'cleartalk_backup_${DateTime.now().millisecondsSinceEpoch}.json';
        final savePath = await FilePicker.platform.saveFile(
          dialogTitle: i18n.tr('sync.backup.export'),
          fileName: defaultName,
          type: FileType.custom,
          allowedExtensions: ['json'],
        );

        if (savePath == null) return;
        await File(savePath).writeAsString(content);

        // A1: 导出后直接分享文件（桌面/移动端），Web 端可能不支持文件分享
        try {
          await Share.shareXFiles(
            [XFile(savePath)],
            subject: 'ClearTalk Backup',
            text: i18n.tr('sync.backup.export_success'),
          );
        } catch (_) {
          // ignore: share may not be available on some platforms
        }

        if (mounted) {
          ErrorHandler.showSuccess(context, i18n.tr('sync.backup.export_success'));
        }
      },
    );

    if (mounted) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _importBackupFromFile() async {
    setState(() => _isLoading = true);
    final i18n = AppI18n.of(context);

    await ErrorHandler.runWithErrorHandling(
      context,
      () async {
        final picked = await FilePicker.platform.pickFiles(
          dialogTitle: i18n.tr('sync.backup.import'),
          type: FileType.custom,
          allowedExtensions: ['json'],
          withData: true,
        );

        if (picked == null || picked.files.isEmpty) return;

        final mode = await _selectImportMode();
        if (mode == null) return;

        final file = picked.files.first;
        final raw = file.bytes != null
            ? utf8.decode(file.bytes!)
            : await File(file.path!).readAsString();

        final decoded = jsonDecode(raw);
        if (decoded is! Map<String, dynamic>) {
          throw Exception(i18n.tr('sync.backup.invalid_format'));
        }

        // A2: 校验备份版本与checksum（如果存在）
        final checksumAlgo = decoded['checksumAlgo'];
        final checksum = decoded['checksum'];
        if (checksumAlgo is String && checksum is String) {
          if (checksumAlgo != 'sha256') {
            throw Exception(i18n.tr('sync.backup.unsupported_checksum'));
          }

          final payload = Map<String, dynamic>.from(decoded);
          payload.remove('checksum');
          payload.remove('checksumAlgo');
          payload.remove('backupVersion');

          final canonical = jsonEncode(payload);
          final expected = sha256.convert(utf8.encode(canonical)).toString();
          if (expected != checksum) {
            throw Exception(i18n.tr('sync.backup.corrupted'));
          }
        }

        final version = decoded['backupVersion'];
        if (version != null && version is! int) {
          throw Exception(i18n.tr('sync.backup.invalid_format'));
        }

        final payload = Map<String, dynamic>.from(decoded);
        payload.remove('checksum');
        payload.remove('checksumAlgo');
        payload.remove('backupVersion');

        final storage = ref.read(storageServiceProvider);
        await storage.importFromSync(payload, merge: mode);

        await ref.read(historyRecordsProvider.notifier).refresh();
        await ref.read(quickPhrasesProvider.notifier).refresh();

        if (mounted) {
          ErrorHandler.showSuccess(context, i18n.tr('sync.backup.import_success'));
        }
      },
    );

    if (mounted) {
      setState(() => _isLoading = false);
    }
  }

  /// 主题模式卡片
  Widget _buildThemeCard(AppI18n i18n) {
    final themeMode = ref.watch(themeModeProvider);

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: ListTile(
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: Colors.indigo.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: const Icon(
            Icons.dark_mode,
            color: Colors.indigo,
          ),
        ),
        title: Text(i18n.tr('settings.theme')),
        subtitle: Text(
          themeMode == ThemeMode.system
              ? i18n.tr('settings.theme_auto')
              : (themeMode == ThemeMode.light
                  ? i18n.tr('settings.theme_light')
                  : i18n.tr('settings.theme_dark')),
        ),
        trailing: const Icon(Icons.chevron_right),
        onTap: () {
          _showThemeSelector(i18n, themeMode);
        },
      ),
    );
  }

  void _showThemeSelector(AppI18n i18n, ThemeMode currentMode) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                margin: const EdgeInsets.only(top: 8),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(20),
                child: Text(
                  i18n.tr('settings.theme'),
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              _buildThemeOption(
                i18n.tr('settings.theme_auto'),
                Icons.brightness_auto,
                ThemeMode.system,
                currentMode,
              ),
              _buildThemeOption(
                i18n.tr('settings.theme_light'),
                Icons.light_mode,
                ThemeMode.light,
                currentMode,
              ),
              _buildThemeOption(
                i18n.tr('settings.theme_dark'),
                Icons.dark_mode,
                ThemeMode.dark,
                currentMode,
              ),
              const SizedBox(height: 20),
            ],
          ),
        );
      },
    );
  }

  Widget _buildThemeOption(
    String title,
    IconData icon,
    ThemeMode mode,
    ThemeMode currentMode,
  ) {
    final isSelected = mode == currentMode;
    return ListTile(
      leading: Icon(
        icon,
        color: isSelected ? const Color(0xFF5B8DEF) : Colors.grey[600],
      ),
      title: Text(
        title,
        style: TextStyle(
          color: isSelected ? const Color(0xFF5B8DEF) : Colors.black87,
          fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
        ),
      ),
      trailing: isSelected
          ? const Icon(
              Icons.check_circle,
              color: Color(0xFF5B8DEF),
            )
          : null,
      onTap: () async {
        await ref.read(themeModeProvider.notifier).setThemeMode(mode);
        Navigator.pop(context);
      },
    );
  }

  /// 快捷短语卡片
  Widget _buildPhrasesCard(AppI18n i18n) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: ListTile(
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: Colors.green.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: const Icon(
            Icons.short_text,
            color: Colors.green,
          ),
        ),
        title: Text(i18n.tr('phrases.title')),
        subtitle: Text(i18n.tr('phrases.subtitle')),
        trailing: const Icon(Icons.chevron_right),
        onTap: () {
          _showPhrasesDialog(i18n);
        },
      ),
    );
  }

  /// 登录/注册表单
  Widget _buildAuthForm(AppI18n i18n) {
    final theme = Theme.of(context);

    InputDecoration inputDecoration({required String label, required Widget icon, Widget? suffix}) {
      return InputDecoration(
        labelText: label,
        prefixIcon: icon,
        suffixIcon: suffix,
        filled: true,
        fillColor: Colors.grey[50],
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: Colors.grey[300]!),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: Colors.grey[300]!),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: Color(0xFF5B8DEF), width: 2),
        ),
      );
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        return Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                const Color(0xFF5B8DEF).withOpacity(0.08),
                Colors.white,
              ],
            ),
          ),
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 28),
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 520),
                child: Card(
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20),
                    side: BorderSide(color: Colors.grey[200]!),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          // Logo/标题
                          Container(
                            width: 68,
                            height: 68,
                            decoration: BoxDecoration(
                              color: const Color(0xFF5B8DEF).withOpacity(0.12),
                              borderRadius: BorderRadius.circular(18),
                            ),
                            alignment: Alignment.center,
                            child: const Icon(
                              Icons.chat_bubble_outline,
                              size: 34,
                              color: Color(0xFF5B8DEF),
                            ),
                          ),
                          const SizedBox(height: 16),
                          Text(
                            _isLogin ? i18n.tr('auth.login.title') : i18n.tr('auth.register.title'),
                            style: theme.textTheme.headlineSmall?.copyWith(
                              fontWeight: FontWeight.w700,
                              letterSpacing: -0.2,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            i18n.tr('app.name'),
                            style: theme.textTheme.bodyMedium?.copyWith(
                              color: Colors.grey[600],
                            ),
                          ),
                          const SizedBox(height: 12),
                          Align(
                            alignment: Alignment.centerLeft,
                            child: OutlinedButton.icon(
                              onPressed: _isLoading ? null : _showBaseUrlDialog,
                              icon: const Icon(Icons.dns_outlined, size: 18),
                              label: Text(i18n.tr('sync.server.base_url')),
                              style: OutlinedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 20),

                          // 切换标签
                          Container(
                            padding: const EdgeInsets.all(4),
                            decoration: BoxDecoration(
                              color: Colors.grey[100],
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: Colors.grey[200]!),
                            ),
                            child: Row(
                              children: [
                                Expanded(
                                  child: _buildTabButton(
                                    i18n.tr('auth.login.tab'),
                                    _isLogin,
                                    () => setState(() => _isLogin = true),
                                  ),
                                ),
                                const SizedBox(width: 6),
                                Expanded(
                                  child: _buildTabButton(
                                    i18n.tr('auth.register.tab'),
                                    !_isLogin,
                                    () => setState(() => _isLogin = false),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 20),

                          // 用户名
                          TextFormField(
                            controller: _usernameController,
                            decoration: inputDecoration(
                              label: i18n.tr('auth.username'),
                              icon: const Icon(Icons.person_outline),
                            ),
                            validator: (value) {
                              if (value?.isEmpty ?? true) {
                                return i18n.tr('auth.error.username_required');
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 14),

                          // 邮箱（仅注册显示）
                          if (!_isLogin) ...[
                            TextFormField(
                              controller: _emailController,
                              keyboardType: TextInputType.emailAddress,
                              decoration: inputDecoration(
                                label: i18n.tr('auth.email'),
                                icon: const Icon(Icons.email_outlined),
                              ),
                              validator: (value) {
                                if (value?.isEmpty ?? true) {
                                  return i18n.tr('auth.error.email_required');
                                }
                                if (!value!.contains('@')) {
                                  return i18n.tr('auth.error.email_invalid');
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: 14),
                          ],

                          // 密码
                          TextFormField(
                            controller: _passwordController,
                            obscureText: _obscurePassword,
                            decoration: inputDecoration(
                              label: i18n.tr('auth.password'),
                              icon: const Icon(Icons.lock_outline),
                              suffix: IconButton(
                                icon: Icon(
                                  _obscurePassword ? Icons.visibility_off : Icons.visibility,
                                ),
                                onPressed: () {
                                  setState(() => _obscurePassword = !_obscurePassword);
                                },
                              ),
                            ),
                            validator: (value) {
                              if (value?.isEmpty ?? true) {
                                return i18n.tr('auth.error.password_required');
                              }
                              if (!_isLogin && (value?.length ?? 0) < 6) {
                                return i18n.tr('auth.error.password_short');
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 14),

                          // 确认密码（仅注册显示）
                          if (!_isLogin) ...[
                            TextFormField(
                              controller: _confirmPasswordController,
                              obscureText: _obscurePassword,
                              decoration: inputDecoration(
                                label: i18n.tr('auth.confirm_password'),
                                icon: const Icon(Icons.lock_outline),
                              ),
                              validator: (value) {
                                if (value != _passwordController.text) {
                                  return i18n.tr('auth.error.password_mismatch');
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: 18),
                          ] else ...[
                            const SizedBox(height: 6),
                          ],

                          // 提交按钮
                          SizedBox(
                            height: 48,
                            child: ElevatedButton(
                              onPressed: _isLoading ? null : (_isLogin ? _login : _register),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF5B8DEF),
                                foregroundColor: Colors.white,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(14),
                                ),
                              ),
                              child: _isLoading
                                  ? const SizedBox(
                                      width: 20,
                                      height: 20,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                      ),
                                    )
                                  : Text(
                                      _isLogin ? i18n.tr('auth.login.button') : i18n.tr('auth.register.button'),
                                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                                    ),
                            ),
                          ),
                          const SizedBox(height: 10),

                          // 游客模式提示
                          TextButton(
                            onPressed: () => Navigator.pop(context),
                            style: TextButton.styleFrom(
                              foregroundColor: Colors.grey[700],
                            ),
                            child: Text(i18n.tr('auth.guest_mode')),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildTabButton(String text, bool isActive, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: isActive ? Colors.white : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
          boxShadow: isActive
              ? [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.06),
                    blurRadius: 10,
                    offset: const Offset(0, 3),
                  ),
                ]
              : null,
        ),
        child: Text(
          text,
          textAlign: TextAlign.center,
          style: TextStyle(
            color: isActive ? const Color(0xFF5B8DEF) : Colors.grey[700],
            fontWeight: isActive ? FontWeight.w700 : FontWeight.w600,
          ),
        ),
      ),
    );
  }

  /// 登录
  Future<void> _login() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    final result = await _userService.login(
      username: _usernameController.text.trim(),
      password: _passwordController.text,
    );

    setState(() => _isLoading = false);

    if (result['success']) {
      // 登录成功后自动同步
      await _syncService.autoSync();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(AppI18n.of(context).tr('auth.login.success'))),
        );
      }
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(result['error'] ?? 'Login failed'),
            backgroundColor: Colors.red[400],
          ),
        );
      }
    }
  }

  /// 注册
  Future<void> _register() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    final result = await _userService.register(
      username: _usernameController.text.trim(),
      email: _emailController.text.trim(),
      password: _passwordController.text,
    );

    setState(() => _isLoading = false);

    if (result['success']) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(AppI18n.of(context).tr('auth.register.success'))),
        );
      }
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(result['error'] ?? 'Registration failed'),
            backgroundColor: Colors.red[400],
          ),
        );
      }
    }
  }

  /// 登出
  Future<void> _logout() async {
    setState(() => _isLoading = true);
    await _userService.logout();
    setState(() => _isLoading = false);
  }

  /// 立即同步
  Future<void> _syncNow() async {
    setState(() => _isLoading = true);

    final result = await _syncService.syncToCloud();

    setState(() => _isLoading = false);

    if (mounted) {
      final i18n = AppI18n.of(context);
      if (result['success']) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(i18n.tr('sync.success'))),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(result['error'] ?? i18n.tr('sync.failed')),
            backgroundColor: Colors.red[400],
          ),
        );
      }
    }
  }

  /// 从云端同步（可选择是否合并）
  Future<void> _syncFromCloud(bool merge) async {
    setState(() => _isLoading = true);

    final result = await _syncService.syncFromCloud(merge: merge);

    setState(() => _isLoading = false);

    if (mounted) {
      final i18n = AppI18n.of(context);
      if (result['success']) {
        final count = result['recordsCount'] ?? 0;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(i18n.tr('sync.download_success', params: {'count': count.toString()}))),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(result['error'] ?? i18n.tr('sync.failed')),
            backgroundColor: Colors.red[400],
          ),
        );
      }
    }
  }

  /// 显示快捷短语对话框
  void _showPhrasesDialog(AppI18n i18n) {
    final phrases = ref.read(quickPhrasesProvider);
    final textController = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
        ),
        child: Container(
          padding: const EdgeInsets.all(20),
          height: MediaQuery.of(context).size.height * 0.7,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 拖动条
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey[300],
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // 标题
              Text(
                i18n.tr('phrases.title'),
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                i18n.tr('phrases.subtitle'),
                style: TextStyle(
                  fontSize: 13,
                  color: Colors.grey[600],
                ),
              ),
              const SizedBox(height: 16),

              // 添加输入框
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: textController,
                      maxLines: 3,
                      decoration: InputDecoration(
                        hintText: i18n.tr('phrases.add_hint'),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        contentPadding: const EdgeInsets.all(12),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  ElevatedButton(
                    onPressed: () async {
                      final text = textController.text.trim();
                      if (text.isNotEmpty) {
                        await ref.read(quickPhrasesProvider.notifier).addPhrase(text);
                        textController.clear();
                        Navigator.pop(context);
                        _showPhrasesDialog(i18n); // 重新打开刷新
                      }
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF5B8DEF),
                      foregroundColor: Colors.white,
                      shape: const CircleBorder(),
                      padding: const EdgeInsets.all(16),
                    ),
                    child: const Icon(Icons.add),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // 短语列表
              Expanded(
                child: phrases.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.text_snippet_outlined, size: 48, color: Colors.grey[400]),
                            const SizedBox(height: 12),
                            Text(
                              i18n.tr('phrases.empty'),
                              style: TextStyle(color: Colors.grey[600]),
                            ),
                          ],
                        ),
                      )
                    : ReorderableListView.builder(
                        itemCount: phrases.length,
                        itemBuilder: (context, index) {
                          final phrase = phrases[index];
                          return ListTile(
                            key: ValueKey(phrase.id),
                            title: Text(
                              phrase.text,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                            subtitle: phrase.category != null
                                ? Text(
                                    phrase.category!,
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: Colors.grey[600],
                                    ),
                                  )
                                : null,
                            trailing: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                IconButton(
                                  icon: Icon(Icons.delete_outline, color: Colors.red[400]),
                                  onPressed: () async {
                                    await ref.read(quickPhrasesProvider.notifier).deletePhrase(phrase.id);
                                    Navigator.pop(context);
                                    _showPhrasesDialog(i18n); // 刷新
                                  },
                                ),
                                const Icon(Icons.drag_handle),
                              ],
                            ),
                            onTap: () {
                              Navigator.pop(context);
                            },
                          );
                        },
                        onReorder: (oldIndex, newIndex) async {
                          if (newIndex > oldIndex) newIndex--;
                          final reordered = [...phrases];
                          final item = reordered.removeAt(oldIndex);
                          reordered.insert(newIndex, item);
                          // 更新order字段
                          for (var i = 0; i < reordered.length; i++) {
                            reordered[i] = reordered[i].copyWith(order: i);
                          }
                          await ref.read(quickPhrasesProvider.notifier).updatePhraseOrder(reordered);
                        },
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
