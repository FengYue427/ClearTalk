import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/scene_template.dart';
import '../providers/app_provider.dart';
import '../services/ai_service.dart';
import '../l10n/app_i18n.dart';
import '../widgets/loading_indicator.dart';
import 'input_page.dart';
import 'result_page.dart';

class ConfirmPage extends ConsumerWidget {
  final SceneTemplate scene;

  const ConfirmPage({super.key, required this.scene});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final values = ref.watch(formValuesProvider);
    final missingFields = scene.checkMissingFields(values);
    
    final i18n = AppI18n.of(context);

    // 将布尔值转换为友好文本
    final displayValues = values.map((key, value) {
      if (value is bool) {
        return MapEntry(key, value ? i18n.tr('common.yes') : i18n.tr('common.no'));
      }
      return MapEntry(key, value?.toString() ?? '');
    });

    return Scaffold(
      appBar: AppBar(
        title: Text(i18n.tr('confirm.title')),
        elevation: 0,
      ),
      body: SafeArea(
        child: Column(
          children: [
            // 进度指示
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              decoration: BoxDecoration(
                color: Colors.grey[50],
                border: Border(
                  bottom: BorderSide(color: Colors.grey[200]!),
                ),
              ),
              child: Row(
                children: [
                  _buildStepIndicator(1, i18n.tr('input.step.fill'), true),
                  _buildStepConnector(),
                  _buildStepIndicator(2, i18n.tr('confirm.title'), true),
                  _buildStepConnector(),
                  _buildStepIndicator(3, i18n.tr('input.step.generate'), false),
                ],
              ),
            ),

            // 内容区域
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // 场景标题
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: const Color(0xFF5B8DEF).withOpacity(0.1),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            scene.name,
                            style: const TextStyle(
                              color: Color(0xFF5B8DEF),
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),

                    // 已填信息汇总
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.grey[50],
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.grey[200]!),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            i18n.tr('confirm.info.confirmed'),
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 12),
                          ...displayValues.entries.where((e) => 
                            e.value.isNotEmpty
                          ).map((entry) {
                            final field = scene.fields.firstWhere(
                              (f) => f.key == entry.key,
                              orElse: () => TemplateField(
                                key: entry.key,
                                label: entry.key,
                                type: FieldType.text,
                              ),
                            );
                            return _buildInfoRow(field.label, entry.value);
                          }),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    // 缺失信息提示
                    if (missingFields.isNotEmpty) ...[
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.orange[50],
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.orange[200]!),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Icon(
                                  Icons.warning_amber_rounded,
                                  color: Colors.orange[700],
                                  size: 20,
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  i18n.tr('confirm.info.missing'),
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                    color: Colors.orange[800],
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Text(
                              i18n.tr('confirm.info.missing.desc'),
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.orange[700],
                              ),
                            ),
                            const SizedBox(height: 12),
                            ...missingFields.keys.map((key) {
                              final field = scene.fields.firstWhere(
                                (f) => f.key == key,
                                orElse: () => TemplateField(
                                  key: key,
                                  label: key,
                                  type: FieldType.text,
                                ),
                              );
                              return Padding(
                                padding: const EdgeInsets.only(bottom: 4),
                                child: Row(
                                  children: [
                                    Icon(
                                      Icons.circle,
                                      size: 6,
                                      color: Colors.orange[400],
                                    ),
                                    const SizedBox(width: 8),
                                    Text(
                                      field.label,
                                      style: TextStyle(
                                        fontSize: 13,
                                        color: Colors.orange[800],
                                      ),
                                    ),
                                  ],
                                ),
                              );
                            }),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                      
                      // 一键补充按钮
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton.icon(
                          onPressed: () {
                            Navigator.pushReplacement(
                              context,
                              MaterialPageRoute(
                                builder: (_) => InputPage(scene: scene),
                              ),
                            );
                          },
                          icon: const Icon(Icons.edit),
                          label: Text(i18n.tr('confirm.action.supplement')),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.orange[700],
                            side: BorderSide(color: Colors.orange[300]!),
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),
                    ],

                    // 语气选择
                    Text(
                      i18n.tr('confirm.tone.select'),
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 12),
                    _buildToneSelector(ref),
                  ],
                ),
              ),
            ),

            // 底部按钮
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                border: Border(
                  top: BorderSide(color: Colors.grey[200]!),
                ),
              ),
              child: SafeArea(
                top: false,
                child: Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => Navigator.pop(context),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: Text(i18n.tr('confirm.action.prev')),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      flex: 2,
                      child: ElevatedButton(
                        onPressed: () => _generate(context, ref),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF5B8DEF),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: Text(
                          i18n.tr('confirm.action.generate'),
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStepIndicator(int step, String label, bool isActive) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 24,
          height: 24,
          decoration: BoxDecoration(
            color: isActive ? const Color(0xFF5B8DEF) : Colors.grey[300],
            shape: BoxShape.circle,
          ),
          child: Center(
            child: Text(
              '$step',
              style: TextStyle(
                color: isActive ? Colors.white : Colors.grey[600],
                fontSize: 12,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ),
        const SizedBox(width: 6),
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: isActive ? Colors.black87 : Colors.grey[500],
            fontWeight: isActive ? FontWeight.w600 : FontWeight.normal,
          ),
        ),
      ],
    );
  }

  Widget _buildStepConnector() {
    return Container(
      width: 20,
      height: 1,
      color: Colors.grey[300],
      margin: const EdgeInsets.symmetric(horizontal: 8),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 80,
            child: Text(
              label,
              style: TextStyle(
                fontSize: 13,
                color: Colors.grey[600],
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildToneSelector(WidgetRef ref) {
    final selectedTone = ref.watch(selectedToneProvider);
    
    return Row(
      children: [
        _buildToneOption(
          ref,
          tone: ToneConfig.soft,
          isSelected: selectedTone == 'soft',
          icon: Icons.sentiment_satisfied_outlined,
          color: Colors.green,
        ),
        const SizedBox(width: 12),
        _buildToneOption(
          ref,
          tone: ToneConfig.neutral,
          isSelected: selectedTone == 'neutral',
          icon: Icons.sentiment_neutral_outlined,
          color: Colors.blue,
        ),
        const SizedBox(width: 12),
        _buildToneOption(
          ref,
          tone: ToneConfig.firm,
          isSelected: selectedTone == 'firm',
          icon: Icons.sentiment_very_satisfied_outlined,
          color: Colors.orange,
        ),
      ],
    );
  }

  Widget _buildToneOption(
    WidgetRef ref, {
    required Tone tone,
    required bool isSelected,
    required IconData icon,
    required Color color,
  }) {
    return Expanded(
      child: GestureDetector(
        onTap: () {
          ref.read(selectedToneProvider.notifier).state = tone.key;
        },
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 16),
          decoration: BoxDecoration(
            color: isSelected ? color.withOpacity(0.1) : Colors.grey[50],
            border: Border.all(
              color: isSelected ? color : Colors.grey[300]!,
              width: isSelected ? 2 : 1,
            ),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            children: [
              Icon(
                icon,
                color: isSelected ? color : Colors.grey[500],
              ),
              const SizedBox(height: 8),
              Text(
                tone.label,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                  color: isSelected ? color : Colors.grey[600],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _generate(BuildContext context, WidgetRef ref) async {
    final i18n = AppI18n.of(context);
    final values = ref.read(formValuesProvider);
    final toneKey = ref.read(selectedToneProvider);
    final tone = ToneConfig.getByKey(toneKey);

    // 显示加载（M4: 使用新的脉冲动画指示器）
    showDialog(
      context: context,
      barrierDismissible: false,
      barrierColor: Colors.black.withOpacity(0.3),
      builder: (_) => Center(
        child: GeneratingIndicator(
          text: i18n.tr('confirm.generating'),
        ),
      ),
    );

    try {
      final aiService = ref.read(aiServiceProvider);
      // 添加30秒超时保护
      final result = await aiService.generate(
        template: scene,
        values: values,
        tone: tone,
      ).timeout(const Duration(seconds: 30), onTimeout: () {
        throw TimeoutException(i18n.tr('error.timeout'));
      });

      ref.read(generatedTextProvider.notifier).state = result;

      Navigator.pop(context); // 关闭加载
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => ResultPage(
            scene: scene,
            generatedText: result,
          ),
        ),
      );
    } on TimeoutException catch (_) {
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(i18n.tr('error.timeout'))),
      );
    } on SocketException catch (_) {
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(i18n.tr('error.network'))),
      );
    } catch (e) {
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('${i18n.tr('error.generate.failed')}: $e')),
      );
    }
  }
}
