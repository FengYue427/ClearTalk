import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/scene_template.dart';
import '../providers/app_provider.dart';
import '../l10n/app_i18n.dart';
import '../services/voice_service.dart';
import 'confirm_page.dart';

class InputPage extends ConsumerStatefulWidget {
  final SceneTemplate scene;

  const InputPage({super.key, required this.scene});

  @override
  ConsumerState<InputPage> createState() => _InputPageState();
}

class _InputPageState extends ConsumerState<InputPage> {
  final Map<String, TextEditingController> _controllers = {};
  final Map<String, String?> _selectedOptions = {};
  final Map<String, bool?> _selectedBooleans = {};
  final VoiceService _voiceService = VoiceService();
  final Map<String, bool> _listeningFields = {};
  String? _focusedFieldKey;

  @override
  void initState() {
    super.initState();
    // 初始化控制器
    for (final field in widget.scene.fields) {
      if (field.type == FieldType.text ||
          field.type == FieldType.textarea) {
        _controllers[field.key] = TextEditingController();
      }
    }
    
    // 恢复已填写的值
    final savedValues = ref.read(formValuesProvider);
    for (final entry in savedValues.entries) {
      if (_controllers.containsKey(entry.key)) {
        _controllers[entry.key]!.text = entry.value?.toString() ?? '';
      } else if (_selectedOptions.containsKey(entry.key)) {
        _selectedOptions[entry.key] = entry.value?.toString();
      } else if (_selectedBooleans.containsKey(entry.key)) {
        _selectedBooleans[entry.key] = entry.value as bool?;
      }
    }
  }

  @override
  void dispose() {
    for (final controller in _controllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  void _saveValues() {
    final values = <String, dynamic>{};

    for (final field in widget.scene.fields) {
      if (_controllers.containsKey(field.key)) {
        values[field.key] = _controllers[field.key]!.text.trim();
      } else if (_selectedOptions.containsKey(field.key)) {
        values[field.key] = _selectedOptions[field.key];
      } else if (_selectedBooleans.containsKey(field.key)) {
        values[field.key] = _selectedBooleans[field.key];
      }
    }

    ref.read(formValuesProvider.notifier).state = values;
  }

  Future<void> _toggleVoiceInput(String fieldKey) async {
    final isListening = _listeningFields[fieldKey] ?? false;
    if (isListening) {
      await _voiceService.stopListening();
      if (mounted) {
        setState(() => _listeningFields[fieldKey] = false);
      }
      return;
    }

    final available = await _voiceService.init();
    if (!available) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('语音识别不可用')),
        );
      }
      return;
    }

    if (mounted) {
      setState(() => _listeningFields[fieldKey] = true);
    }

    await _voiceService.startListening(
      onResult: (text) {
        if (mounted && _controllers.containsKey(fieldKey)) {
          setState(() {
            _controllers[fieldKey]!.text = text;
          });
        }
      },
    );

    if (mounted) {
      setState(() => _listeningFields[fieldKey] = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final i18n = AppI18n.of(context);
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.scene.name),
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
                  _buildStepIndicator(2, i18n.tr('confirm.title'), false),
                  _buildStepConnector(),
                  _buildStepIndicator(3, i18n.tr('input.step.generate'), false),
                ],
              ),
            ),

            // 表单内容
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // 场景描述
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.blue[50],
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.info_outline, color: Colors.blue[700]),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              widget.scene.description,
                              style: TextStyle(
                                color: Colors.blue[800],
                                fontSize: 13,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // 字段表单
                    ...widget.scene.fields.map((field) => _buildField(field)),

                    const SizedBox(height: 32),
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
                child: SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: ElevatedButton(
                    onPressed: _onNext,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF5B8DEF),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: Text(
                      i18n.tr('input.next'),
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
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

  Widget _buildField(TemplateField field) {
    // 检查是否为文本类型字段（支持快捷短语插入）
    final isTextField = field.type == FieldType.text || field.type == FieldType.textarea;

    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                field.label,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
              if (field.required)
                Text(
                  ' *',
                  style: TextStyle(
                    color: Colors.red[400],
                    fontWeight: FontWeight.bold,
                  ),
                ),
            ],
          ),
          if (field.hint != null)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(
                field.hint!,
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey[500],
                ),
              ),
            ),
          const SizedBox(height: 8),
          Focus(
            onFocusChange: (hasFocus) {
              if (hasFocus && isTextField) {
                setState(() {
                  _focusedFieldKey = field.key;
                });
              }
            },
            child: _buildFieldInput(field),
          ),
          // 快捷短语选择器（仅文本字段显示）
          if (isTextField) _buildQuickPhrasesChip(field),
        ],
      ),
    );
  }

  /// 快捷短语芯片选择器
  Widget _buildQuickPhrasesChip(TemplateField field) {
    final phrases = ref.watch(quickPhrasesProvider);
    if (phrases.isEmpty) return const SizedBox.shrink();

    final i18n = AppI18n.of(context);

    return Container(
      margin: const EdgeInsets.only(top: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            i18n.tr('input.quick_phrases'),
            style: TextStyle(
              fontSize: 12,
              color: Colors.grey[600],
            ),
          ),
          const SizedBox(height: 6),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: phrases.take(5).map((phrase) {
              return ActionChip(
                label: Text(
                  phrase.text,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                labelStyle: const TextStyle(fontSize: 12),
                padding: EdgeInsets.zero,
                materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                backgroundColor: Colors.grey[100],
                side: BorderSide.none,
                onPressed: () {
                  _insertPhrase(field.key, phrase.text);
                },
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  /// 插入快捷短语到指定字段
  void _insertPhrase(String fieldKey, String phrase) {
    final controller = _controllers[fieldKey];
    if (controller == null) return;

    final currentText = controller.text;
    final selection = controller.selection;

    // 如果有选中内容，替换它；否则在光标位置插入
    if (selection.start >= 0 && selection.end >= 0) {
      final newText = currentText.substring(0, selection.start) +
          phrase +
          currentText.substring(selection.end);
      controller.text = newText;
      controller.selection = TextSelection.collapsed(offset: selection.start + phrase.length);
    } else {
      // 在末尾追加
      if (currentText.isNotEmpty && !currentText.endsWith(' ')) {
        controller.text = '$currentText $phrase';
      } else {
        controller.text = '$currentText$phrase';
      }
    }

    // 触发保存
    _saveValues();
  }

  Widget _buildFieldInput(TemplateField field) {
    switch (field.type) {
      case FieldType.text:
        return TextField(
          controller: _controllers[field.key],
          decoration: _inputDecoration(field.placeholder, field.key),
        );

      case FieldType.textarea:
        return TextField(
          controller: _controllers[field.key],
          maxLines: 4,
          decoration: _inputDecoration(field.placeholder, field.key),
        );
      
      case FieldType.number:
        return TextField(
          controller: _controllers[field.key],
          keyboardType: TextInputType.number,
          decoration: _inputDecoration(field.placeholder),
        );
      
      case FieldType.select:
        return Container(
          decoration: BoxDecoration(
            border: Border.all(color: Colors.grey[300]!),
            borderRadius: BorderRadius.circular(12),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: _selectedOptions[field.key],
              hint: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Text(
                  widget.scene.fieldSelectPlaceholder,
                  style: TextStyle(color: Colors.grey[500]),
                ),
              ),
              isExpanded: true,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              borderRadius: BorderRadius.circular(12),
              items: field.options?.map((option) {
                return DropdownMenuItem(
                  value: option,
                  child: Text(option),
                );
              }).toList(),
              onChanged: (value) {
                setState(() {
                  _selectedOptions[field.key] = value;
                });
              },
            ),
          ),
        );
      
      case FieldType.boolean:
        return Container(
          decoration: BoxDecoration(
            border: Border.all(color: Colors.grey[300]!),
            borderRadius: BorderRadius.circular(12),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<bool?>(
              value: _selectedBooleans[field.key],
              hint: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Text(
                  widget.scene.fieldSelectPlaceholder,
                  style: TextStyle(color: Colors.grey[500]),
                ),
              ),
              isExpanded: true,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              borderRadius: BorderRadius.circular(12),
              items: [
                DropdownMenuItem(value: true, child: Text(AppI18n.of(context).tr('common.yes'))),
                DropdownMenuItem(value: false, child: Text(AppI18n.of(context).tr('common.no'))),
              ],
              onChanged: (value) {
                setState(() {
                  _selectedBooleans[field.key] = value;
                });
              },
            ),
          ),
        );
      
      case FieldType.date:
        return TextField(
          controller: _controllers[field.key],
          decoration: _inputDecoration(field.placeholder ?? widget.scene.datePlaceholder),
        );
    }
  }

  InputDecoration _inputDecoration(String? hint, [String? fieldKey]) {
    final isListening = fieldKey != null && (_listeningFields[fieldKey] ?? false);
    return InputDecoration(
      hintText: hint,
      hintStyle: TextStyle(color: Colors.grey[400]),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: Colors.grey[300]!),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: Colors.grey[300]!),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFF5B8DEF), width: 2),
      ),
      suffixIcon: fieldKey != null
          ? IconButton(
              icon: Icon(
                isListening ? Icons.mic : Icons.mic_none,
                color: isListening ? Colors.red : Colors.grey,
              ),
              onPressed: () => _toggleVoiceInput(fieldKey),
            )
          : null,
    );
  }

  void _onNext() {
    _saveValues();
    
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ConfirmPage(scene: widget.scene),
      ),
    );
  }
}
