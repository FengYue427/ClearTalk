import 'package:flutter_test/flutter_test.dart';
import 'package:cleartalk/templates/builtin_scenes.dart';
import 'package:cleartalk/models/scene_template.dart';

void main() {
  group('BuiltinScenes', () {
    test('all 应包含 35 个内置场景', () {
      final scenes = BuiltinScenes.all;

      expect(scenes.length, 35);
      expect(scenes.every((s) => s.id.isNotEmpty), true);
      expect(scenes.every((s) => s.name.isNotEmpty), true);
    });

    test('byCategory 应正确按分类过滤', () {
      final workScenes = BuiltinScenes.byCategory('职场沟通');

      expect(workScenes, isNotEmpty);
      expect(workScenes.every((s) => s.category == '职场沟通'), true);
    });

    test('findById 可查找请假场景', () {
      final scene = BuiltinScenes.findById('leave_request');
      expect(scene?.name, '请假申请');
    });

    test('所有场景应包含有效字段', () {
      for (final scene in BuiltinScenes.all) {
        expect(scene.id.isNotEmpty, true);
        expect(scene.name.isNotEmpty, true);
        expect(scene.category.isNotEmpty, true);
        expect(scene.description.isNotEmpty, true);
        expect(scene.fields, isNotEmpty);

        for (final field in scene.fields) {
          expect(field.key.isNotEmpty, true);
          expect(field.label.isNotEmpty, true);
          expect(
            [
              FieldType.text,
              FieldType.textarea,
              FieldType.select,
              FieldType.boolean,
              FieldType.number,
              FieldType.date,
            ],
            contains(field.type),
          );
        }
      }
    });
  });
}
