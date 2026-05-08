import 'package:flutter_test/flutter_test.dart';
import 'package:cleartalk/templates/builtin_scenes.dart';
import 'package:cleartalk/models/scene_template.dart';

void main() {
  group('BuiltinScenes', () {
    test('all 应返回所有内置场景', () {
      final scenes = BuiltinScenes.all;

      expect(scenes, isNotEmpty);
      expect(scenes.every((s) => s.id.isNotEmpty), true);
      expect(scenes.every((s) => s.name.isNotEmpty), true);
    });

    test('byCategory 应正确按分类过滤', () {
      final workScenes = BuiltinScenes.byCategory('work');
      final consumerScenes = BuiltinScenes.byCategory('consumer');

      expect(workScenes.every((s) => s.category == 'work'), true);
      expect(consumerScenes.every((s) => s.category == 'consumer'), true);
    });

    test('所有场景应包含有效字段', () {
      for (final scene in BuiltinScenes.all) {
        expect(scene.id.isNotEmpty, true, reason: '场景ID不能为空');
        expect(scene.name.isNotEmpty, true, reason: '场景名称不能为空');
        expect(scene.category.isNotEmpty, true, reason: '场景分类不能为空');
        expect(scene.description.isNotEmpty, true, reason: '场景描述不能为空');
        expect(scene.fields, isNotEmpty, reason: '场景字段不能为空');

        // 验证字段有效性
        for (final field in scene.fields) {
          expect(field.key.isNotEmpty, true,
              reason: '字段key不能为空');
          expect(field.label.isNotEmpty, true,
              reason: '字段标签不能为空');
          expect(field.type, isNotNull, reason: '字段类型不能为null');
        }
      }
    });

    test('场景字段类型应有效', () {
      for (final scene in BuiltinScenes.all) {
        for (final field in scene.fields) {
          // 验证所有字段类型都在有效范围内
          expect(
            [FieldType.text, FieldType.textarea, FieldType.select, FieldType.boolean, FieldType.number],
            contains(field.type),
            reason: '字段类型必须有效',
          );
        }
      }
    });
  });
}
