import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';
import '../models/scene_template.dart';
import '../models/history_record.dart';
import '../providers/app_provider.dart';
import '../services/ai_service.dart';
import '../l10n/app_i18n.dart';
import '../widgets/skeleton_loader.dart';
import '../widgets/loading_indicator.dart';
import 'home_page.dart';
import 'dialogue_page.dart';
import '../services/feedback_service.dart';
import '../services/share_card_service.dart';

class ResultPage extends ConsumerStatefulWidget {
  final SceneTemplate scene;
  final String generatedText;

  const ResultPage({
    super.key,
    required this.scene,
    required this.generatedText,
  });

  @override
  ConsumerState<ResultPage> createState() => _ResultPageState();
}

class _ResultPageState extends ConsumerState<ResultPage> {
  String _currentText = '';
  String _currentVersion = 'standard';
  bool _isGenerating = false;
  bool _feedbackDone = false;
  final _feedbackService = FeedbackService();

  @override
  void initState() {
    super.initState();
    _currentText = widget.generatedText;
    _saveToHistory();
  }

  void _saveToHistory() async {
    final values = ref.read(formValuesProvider);
    final tone = ref.read(selectedToneProvider);
    
    final record = HistoryRecord(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      sceneId: widget.scene.id,
      sceneName: widget.scene.name,
      category: widget.scene.category,
      inputValues: Map<String, dynamic>.from(values),
      generatedText: _currentText,
      tone: tone,
      createdAt: DateTime.now(),
    );
    
    await ref.read(historyRecordsProvider.notifier).addRecord(record);
  }

  Future<void> _regenerate(String version) async {
    if (_isGenerating) return;

    final i18n = AppI18n.of(context);

    setState(() {
      _isGenerating = true;
      _currentVersion = version;
    });

    try {
      final values = ref.read(formValuesProvider);
      final toneKey = ref.read(selectedToneProvider);
      final tone = ToneConfig.getByKey(toneKey);
      final aiService = ref.read(aiServiceProvider);

      final result = await aiService.generate(
        template: widget.scene,
        values: values,
        tone: tone,
        version: version,
      ).timeout(const Duration(seconds: 30), onTimeout: () {
        throw TimeoutException(i18n.tr('error.timeout'));
      });

      setState(() {
        _currentText = result;
        _isGenerating = false;
      });
    } on TimeoutException catch (_) {
      setState(() => _isGenerating = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(i18n.tr('error.timeout'))),
      );
    } on SocketException catch (_) {
      setState(() => _isGenerating = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(i18n.tr('error.network'))),
      );
    } catch (e) {
      setState(() => _isGenerating = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('${i18n.tr('error.generate.failed')}: $e')),
      );
    }
  }

  Future<void> _submitFeedback(String type) async {
    final i18n = AppI18n.of(context);
    final tone = ref.read(selectedToneProvider);
    await _feedbackService.submit(
      type: type,
      sceneId: widget.scene.id,
      sceneName: widget.scene.name,
      tone: tone,
      textPreview: _currentText.length > 500
          ? _currentText.substring(0, 500)
          : _currentText,
    );
    if (!mounted) return;
    setState(() => _feedbackDone = true);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(i18n.tr('feedback.thanks'))),
    );
  }

  Future<void> _rewriteTone(Tone tone) async {
    if (_isGenerating) return;

    final i18n = AppI18n.of(context);

    setState(() => _isGenerating = true);

    try {
      final aiService = ref.read(aiServiceProvider);
      final result = await aiService.rewrite(
        text: _currentText,
        tone: tone,
      ).timeout(const Duration(seconds: 30), onTimeout: () {
        throw TimeoutException(i18n.tr('error.timeout'));
      });

      ref.read(selectedToneProvider.notifier).state = tone.key;

      setState(() {
        _currentText = result;
        _isGenerating = false;
      });
    } on TimeoutException catch (_) {
      setState(() => _isGenerating = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(i18n.tr('error.timeout'))),
      );
    } on SocketException catch (_) {
      setState(() => _isGenerating = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(i18n.tr('error.network'))),
      );
    } catch (e) {
      setState(() => _isGenerating = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('${i18n.tr('error.rewrite.failed')}: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final selectedTone = ref.watch(selectedToneProvider);
    final i18n = AppI18n.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(i18n.tr('result.title')),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => Navigator.pushAndRemoveUntil(
            context,
            MaterialPageRoute(builder: (_) => const HomePage()),
            (route) => false,
          ),
        ),
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
                  _buildStepIndicator(3, i18n.tr('input.step.generate'), true),
                ],
              ),
            ),

            // 工具栏
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: Colors.white,
                border: Border(
                  bottom: BorderSide(color: Colors.grey[200]!),
                ),
              ),
              child: Column(
                children: [
                  // 版本切换
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        _buildVersionChip('standard', i18n.tr('result.version.standard'), Icons.description),
                        const SizedBox(width: 8),
                        _buildVersionChip('short', i18n.tr('result.version.short'), Icons.short_text),
                        const SizedBox(width: 8),
                        _buildVersionChip('formal', i18n.tr('result.version.formal'), Icons.business),
                        const SizedBox(width: 8),
                        _buildVersionChip('softened', i18n.tr('result.version.softened'), Icons.local_fire_department),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  // 语气切换
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        Text(
                          i18n.tr('result.tone.label'),
                          style: const TextStyle(fontSize: 13),
                        ),
                        _buildToneChip('soft', i18n.tr('confirm.tone.soft'), selectedTone == 'soft'),
                        const SizedBox(width: 8),
                        _buildToneChip('neutral', i18n.tr('confirm.tone.neutral'), selectedTone == 'neutral'),
                        const SizedBox(width: 8),
                        _buildToneChip('firm', i18n.tr('confirm.tone.firm'), selectedTone == 'firm'),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // 生成结果
            Expanded(
              child: Container(
                margin: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.grey[50],
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.grey[200]!),
                ),
                child: Stack(
                  children: [
                    // 文本内容
                    SingleChildScrollView(
                      padding: const EdgeInsets.all(20),
                      child: SelectableText(
                        _currentText,
                        style: const TextStyle(
                          fontSize: 15,
                          height: 1.6,
                        ),
                      ),
                    ),
                    
                    // 加载指示（M4: 使用骨架屏效果）
                    if (_isGenerating)
                      Container(
                        color: Colors.white.withOpacity(0.9),
                        child: const Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              TextGenerationSkeleton(),
                              SizedBox(height: 20),
                              PulsingDots(count: 3, size: 10),
                            ],
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),

            if (!_feedbackDone)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        i18n.tr('feedback.prompt'),
                        style: TextStyle(fontSize: 13, color: Colors.grey[700]),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.thumb_up_outlined),
                      onPressed: _isGenerating ? null : () => _submitFeedback('helpful'),
                    ),
                    IconButton(
                      icon: const Icon(Icons.thumb_down_outlined),
                      onPressed: _isGenerating ? null : () => _submitFeedback('not_helpful'),
                    ),
                  ],
                ),
              ),

            // 风险提示
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              child: Row(
                children: [
                  Icon(Icons.info_outline, size: 16, color: Colors.grey[500]),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      i18n.tr('result.disclaimer'),
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey[600],
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // 底部操作按钮
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
                child: Column(
                  children: [
                    // 继续对话按钮（M3: 生成中或无内容时禁用）
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        onPressed: (_isGenerating || _currentText.isEmpty)
                            ? null
                            : () => _continueDialogue(context),
                        icon: const Icon(Icons.chat_bubble_outline, size: 18),
                        label: Text(i18n.tr('dialogue.action.continue')),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: const Color(0xFF5B8DEF),
                          disabledForegroundColor: Colors.grey[400],
                          side: const BorderSide(color: Color(0xFF5B8DEF)),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: (_isGenerating || _currentText.isEmpty)
                                ? null
                                : () => _copyToClipboard(),
                            icon: const Icon(Icons.copy, size: 18),
                            label: Text(i18n.tr('result.action.copy')),
                            style: OutlinedButton.styleFrom(
                              disabledForegroundColor: Colors.grey[400],
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: (_isGenerating || _currentText.isEmpty)
                                ? null
                                : () => _shareAsCard(i18n),
                            icon: const Icon(Icons.image_outlined, size: 18),
                            label: Text(i18n.tr('share.card.btn')),
                            style: OutlinedButton.styleFrom(
                              disabledForegroundColor: Colors.grey[400],
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: (_isGenerating || _currentText.isEmpty)
                                ? null
                                : () => _shareText(),
                            icon: const Icon(Icons.share, size: 18),
                            label: Text(i18n.tr('result.action.share')),
                            style: OutlinedButton.styleFrom(
                              disabledForegroundColor: Colors.grey[400],
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        // M3: 再写一个按钮在生成中禁用
                        Expanded(
                          flex: 2,
                          child: ElevatedButton.icon(
                            onPressed: _isGenerating ? null : () => _startNew(),
                            icon: const Icon(Icons.refresh, size: 18),
                            label: Text(i18n.tr('result.action.new')),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF5B8DEF),
                              foregroundColor: Colors.white,
                              disabledBackgroundColor: Colors.grey[300],
                              disabledForegroundColor: Colors.grey[500],
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                          ),
                        ),
                      ],
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
            child: isActive
                ? const Icon(Icons.check, size: 14, color: Colors.white)
                : Text(
                    '$step',
                    style: TextStyle(
                      color: Colors.grey[600],
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

  Widget _buildVersionChip(String version, String label, IconData icon) {
    final isSelected = _currentVersion == version;

    return ChoiceChip(
      avatar: Icon(icon, size: 18),
      label: Text(label),
      selected: isSelected,
      onSelected: _isGenerating ? null : (_) => _regenerate(version),
      backgroundColor: Colors.grey[100],
      selectedColor: const Color(0xFF5B8DEF).withOpacity(0.15),
      disabledColor: Colors.grey[200],
      labelStyle: TextStyle(
        color: _isGenerating
            ? Colors.grey[400]
            : (isSelected ? const Color(0xFF5B8DEF) : Colors.grey[700]),
        fontSize: 13,
      ),
    );
  }

  Widget _buildToneChip(String tone, String label, bool isSelected) {
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      onSelected: _isGenerating ? null : (_) => _rewriteTone(ToneConfig.getByKey(tone)),
      backgroundColor: Colors.grey[100],
      selectedColor: Colors.orange.withOpacity(0.15),
      disabledColor: Colors.grey[200],
      labelStyle: TextStyle(
        color: _isGenerating
            ? Colors.grey[400]
            : (isSelected ? Colors.orange[700] : Colors.grey[700]),
        fontSize: 13,
      ),
    );
  }

  void _copyToClipboard() async {
    final i18n = AppI18n.of(context);
    await Clipboard.setData(ClipboardData(text: _currentText));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(i18n.tr('result.copied')),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  Future<void> _shareAsCard(AppI18n i18n) async {
    final toneKey = ref.read(selectedToneProvider);
    final tone = ToneConfig.getByKey(toneKey);
    await ShareCardService.shareAsCard(
      text: _currentText,
      sceneName: widget.scene.name,
      toneLabel: tone.label,
    );
  }

  void _shareText() {
    final i18n = AppI18n.of(context);
    Share.share(_currentText, subject: i18n.tr('result.share.subject'));
  }

  void _continueDialogue(BuildContext context) {
    final selectedTone = ref.read(selectedToneProvider);
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => DialoguePage(
          scene: widget.scene,
          initialText: _currentText,
          tone: selectedTone,
        ),
      ),
    );
  }

  void _startNew() {
    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(builder: (_) => const HomePage()),
      (route) => false,
    );
  }
}
