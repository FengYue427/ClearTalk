import 'package:flutter/material.dart';
import '../l10n/app_i18n.dart';

/// 统一错误处理工具类
class ErrorHandler {
  /// 显示错误提示
  static void showError(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red[400],
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  /// 显示成功提示
  static void showSuccess(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.green[400],
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  /// 处理异常并显示友好提示
  static void handleException(BuildContext context, dynamic error, {String? fallbackMessage}) {
    final i18n = AppI18n.of(context);
    String message = fallbackMessage ?? i18n.tr('error.unknown');

    if (error is Exception) {
      final errorStr = error.toString().toLowerCase();
      if (errorStr.contains('timeout')) {
        message = i18n.tr('error.timeout');
      } else if (errorStr.contains('socket') || errorStr.contains('network')) {
        message = i18n.tr('error.network');
      }
    }

    showError(context, message);
  }

  /// 包装异步操作，自动处理错误
  static Future<T?> runWithErrorHandling<T>(
    BuildContext context,
    Future<T> Function() operation, {
    String? successMessage,
    String? errorMessage,
    bool showSuccessMsg = false,
  }) async {
    try {
      final result = await operation();
      if (showSuccessMsg && successMessage != null) {
        showSuccess(context, successMessage);
      }
      return result;
    } catch (e) {
      handleException(context, e, fallbackMessage: errorMessage);
      return null;
    }
  }
}
