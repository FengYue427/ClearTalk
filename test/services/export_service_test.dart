import 'package:flutter_test/flutter_test.dart';
import 'package:cleartalk/services/export_service.dart';
import 'package:cleartalk/models/history_record.dart';

void main() {
  group('ExportService', () {
    final testRecords = [
      HistoryRecord(
        id: '1',
        sceneId: 'scene1',
        sceneName: '请假',
        category: 'work',
        tone: 'soft',
        inputValues: {'reason': '生病'},
        generatedText: '我想请一天假',
        createdAt: DateTime(2024, 1, 15),
      ),
      HistoryRecord(
        id: '2',
        sceneId: 'scene2',
        sceneName: '投诉',
        category: 'consumer',
        tone: 'firm',
        inputValues: {'product': '商品A', 'issue': '质量问题'},
        generatedText: '商品存在质量问题，要求退货',
        createdAt: DateTime(2024, 1, 20),
      ),
    ];

    test('exportHistoryToText 应返回格式化的文本', () async {
      final result = await ExportService.exportHistoryToText(testRecords);

      expect(result, contains('ClearTalk 历史记录导出'));
      expect(result, contains('【请假】'));
      expect(result, contains('【投诉】'));
      expect(result, contains('我想请一天假'));
      expect(result, contains('商品存在质量问题'));
      expect(result, contains('温和'));
      expect(result, contains('坚定'));
    });

    test('exportHistoryToJson 应返回有效的JSON', () async {
      final result = await ExportService.exportHistoryToJson(testRecords);

      expect(result, isNotNull);
      expect(result, contains('exportTime'));
      expect(result, contains('records'));
      expect(result, contains('请假'));
      expect(result, contains('投诉'));
    });

    test('exportHistoryToText 应正确处理空列表', () async {
      final result = await ExportService.exportHistoryToText([]);

      expect(result, contains('ClearTalk 历史记录导出'));
      expect(result, isNot(contains('【')));
    });

    test('exportHistoryToJson 应正确处理空列表', () async {
      final result = await ExportService.exportHistoryToJson([]);

      expect(result, contains('exportTime'));
      expect(result, contains('"records":[]'));
    });
  });
}
