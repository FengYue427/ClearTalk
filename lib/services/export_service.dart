import 'dart:io';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import '../models/history_record.dart';

/// 导出服务 - 支持文本导出和分享
class ExportService {
  /// 导出历史记录为文本
  static Future<String> exportHistoryToText(List<HistoryRecord> records) async {
    final buffer = StringBuffer();
    buffer.writeln('ClearTalk 历史记录导出');
    buffer.writeln('导出时间: ${DateTime.now().toIso8601String()}');
    buffer.writeln('=' * 40);
    buffer.writeln();

    for (final record in records) {
      buffer.writeln('【${record.sceneName}】');
      buffer.writeln('时间: ${_formatDate(record.createdAt)}');
      buffer.writeln('语气: ${_getToneLabel(record.tone)}');
      buffer.writeln('内容:');
      buffer.writeln(record.generatedText);
      buffer.writeln('-' * 40);
      buffer.writeln();
    }

    return buffer.toString();
  }

  /// 导出历史记录为JSON
  static Future<String> exportHistoryToJson(List<HistoryRecord> records) async {
    final data = records.map((r) => {
      'id': r.id,
      'sceneName': r.sceneName,
      'sceneId': r.sceneId,
      'category': r.category,
      'tone': r.tone,
      'inputValues': r.inputValues,
      'generatedText': r.generatedText,
      'createdAt': r.createdAt.toIso8601String(),
    }).toList();

    return jsonEncode({'exportTime': DateTime.now().toIso8601String(), 'records': data});
  }

  /// 复制到剪贴板
  static Future<void> copyToClipboard(String text) async {
    await Clipboard.setData(ClipboardData(text: text));
  }

  /// 分享文本（使用系统分享面板）
  static Future<void> shareText(String text, {String? subject}) async {
    await Share.share(text, subject: subject);
  }

  /// 保存到文件并分享
  static Future<void> exportAndShare(
    List<HistoryRecord> records, {
    ExportFormat format = ExportFormat.text,
  }) async {
    final content = format == ExportFormat.text
        ? await exportHistoryToText(records)
        : await exportHistoryToJson(records);

    final extension = format == ExportFormat.text ? 'txt' : 'json';
    final fileName = 'cleartalk_history_${_formatFileDate(DateTime.now())}.$extension';

    if (kIsWeb) {
      // Web平台直接分享文本
      await shareText(content, subject: 'ClearTalk 历史记录');
    } else {
      // 移动平台保存文件后分享
      final tempDir = await getTemporaryDirectory();
      final file = File('${tempDir.path}/$fileName');
      await file.writeAsString(content);

      await Share.shareXFiles(
        [XFile(file.path)],
        subject: 'ClearTalk 历史记录',
        text: '导出历史记录',
      );
    }
  }

  /// 保存到下载目录（仅桌面平台）
  static Future<String?> saveToDownloads(
    List<HistoryRecord> records, {
    ExportFormat format = ExportFormat.text,
  }) async {
    if (kIsWeb) return null;

    final content = format == ExportFormat.text
        ? await exportHistoryToText(records)
        : await exportHistoryToJson(records);

    final extension = format == ExportFormat.text ? 'txt' : 'json';
    final fileName = 'cleartalk_history_${_formatFileDate(DateTime.now())}.$extension';

    String? savePath;
    if (Platform.isAndroid || Platform.isIOS) {
      final tempDir = await getTemporaryDirectory();
      savePath = '${tempDir.path}/$fileName';
    } else {
      final downloadsDir = await getDownloadsDirectory();
      savePath = '${downloadsDir?.path}/$fileName';
    }

    if (savePath != null) {
      final file = File(savePath);
      await file.writeAsString(content);
      return savePath;
    }
    return null;
  }

  static String _formatDate(DateTime date) {
    return '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
  }

  static String _formatFileDate(DateTime date) {
    return '${date.year}${date.month.toString().padLeft(2, '0')}${date.day.toString().padLeft(2, '0')}_${date.hour.toString().padLeft(2, '0')}${date.minute.toString().padLeft(2, '0')}';
  }

  static String _getToneLabel(String tone) {
    switch (tone) {
      case 'soft':
        return '温和';
      case 'neutral':
        return '中性';
      case 'firm':
        return '坚定';
      default:
        return tone;
    }
  }
}

/// 导出格式枚举
enum ExportFormat {
  text,
  json,
}
