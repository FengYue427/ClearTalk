import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';
import '../models/scene_template.dart';
import '../providers/app_provider.dart';
import '../services/ai_service.dart';
import '../l10n/app_i18n.dart';
import '../widgets/skeleton_loader.dart';
import '../widgets/loading_indicator.dart';

/// 对话消息模型
class ChatMessage {
  final String id;
  final String content;
  final bool isUser;
  final DateTime timestamp;

  ChatMessage({
    required this.id,
    required this.content,
    required this.isUser,
    required this.timestamp,
  });
}

class DialoguePage extends ConsumerStatefulWidget {
  final SceneTemplate? scene;
  final String initialText;
  final String? tone;

  const DialoguePage({
    super.key,
    this.scene,
    required this.initialText,
    this.tone,
  });

  @override
  ConsumerState<DialoguePage> createState() => _DialoguePageState();
}

class _DialoguePageState extends ConsumerState<DialoguePage> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final List<ChatMessage> _messages = [];
  bool _isSending = false;
  String _currentText = '';

  // 快捷建议（多语言）
  List<String> get _suggestions {
    final i18n = AppI18n.of(context);
    return [
      i18n.tr('dialogue.suggestion.shorter'),
      i18n.tr('dialogue.suggestion.longer'),
      i18n.tr('dialogue.suggestion.softer'),
      i18n.tr('dialogue.suggestion.stronger'),
    ];
  }

  @override
  void initState() {
    super.initState();
    _currentText = widget.initialText;
    // 添加初始系统消息
    _messages.add(ChatMessage(
      id: 'initial',
      content: widget.initialText,
      isUser: false,
      timestamp: DateTime.now(),
    ));
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    Future.delayed(const Duration(milliseconds: 100), () {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _sendMessage([String? text]) async {
    final message = text ?? _messageController.text.trim();
    if (message.isEmpty || _isSending) return;

    final i18n = AppI18n.of(context);

    setState(() {
      _isSending = true;
      // 添加用户消息
      _messages.add(ChatMessage(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        content: message,
        isUser: true,
        timestamp: DateTime.now(),
      ));
    });

    if (text == null) {
      _messageController.clear();
    }
    _scrollToBottom();

    try {
      final aiService = ref.read(aiServiceProvider);
      // 30秒超时保护
      final result = await aiService.chat(
        currentText: _currentText,
        userMessage: message,
        template: widget.scene,
        tone: widget.tone,
      ).timeout(const Duration(seconds: 30), onTimeout: () {
        throw TimeoutException(i18n.tr('error.timeout'));
      });

      setState(() {
        _isSending = false;
        _currentText = result;
        // 添加 AI 回复
        _messages.add(ChatMessage(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          content: result,
          isUser: false,
          timestamp: DateTime.now(),
        ));
      });
      _scrollToBottom();
    } on TimeoutException catch (_) {
      setState(() => _isSending = false);
      _showError(i18n.tr('error.timeout'));
    } on SocketException catch (_) {
      setState(() => _isSending = false);
      _showError(i18n.tr('error.network'));
    } catch (e) {
      setState(() => _isSending = false);
      _showError('${i18n.tr('error.unknown')}: $e');
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red[700],
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  void _copyCurrentText() async {
    final i18n = AppI18n.of(context);
    await Clipboard.setData(ClipboardData(text: _currentText));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(i18n.tr('result.copied')),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  void _shareCurrentText() {
    final i18n = AppI18n.of(context);
    Share.share(_currentText, subject: i18n.tr('result.share.subject'));
  }

  @override
  Widget build(BuildContext context) {
    final i18n = AppI18n.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(i18n.tr('dialogue.title')),
        elevation: 0,
        actions: [
          // 复制按钮（M3: 生成中或无内容时禁用）
          IconButton(
            icon: const Icon(Icons.copy),
            onPressed: (_isSending || _currentText.isEmpty) ? null : _copyCurrentText,
            tooltip: i18n.tr('result.action.copy'),
          ),
          // 分享按钮（M3: 生成中或无内容时禁用）
          IconButton(
            icon: const Icon(Icons.share),
            onPressed: (_isSending || _currentText.isEmpty) ? null : _shareCurrentText,
            tooltip: i18n.tr('result.action.share'),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // 快捷建议栏
            if (_messages.length <= 1) // 只在初始时显示
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.grey[50],
                  border: Border(
                    bottom: BorderSide(color: Colors.grey[200]!),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      i18n.tr('dialogue.suggestions'),
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey[600],
                      ),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: _suggestions.map((suggestion) {
                        return ActionChip(
                          label: Text(suggestion),
                          onPressed: _isSending ? null : () => _sendMessage(suggestion),
                          backgroundColor: Colors.white,
                          side: BorderSide(color: Colors.grey[300]!),
                          labelStyle: const TextStyle(fontSize: 13),
                        );
                      }).toList(),
                    ),
                  ],
                ),
              ),

            // 对话列表
            Expanded(
              child: ListView.builder(
                controller: _scrollController,
                padding: const EdgeInsets.all(16),
                itemCount: _messages.length + (_isSending ? 1 : 0),
                itemBuilder: (context, index) {
                  // 生成中的骨架屏占位
                  if (_isSending && index == _messages.length) {
                    return const ChatMessageSkeleton();
                  }
                  final message = _messages[index];
                  if (index == 0 && !message.isUser) {
                    // 初始文本使用特殊样式
                    return _buildInitialMessage(message, i18n);
                  }
                  return _buildMessageBubble(message, i18n);
                },
              ),
            ),

            // 输入区域
            Container(
              padding: const EdgeInsets.all(12),
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
                      child: TextField(
                        controller: _messageController,
                        enabled: !_isSending,
                        decoration: InputDecoration(
                          hintText: i18n.tr('dialogue.input.hint'),
                          hintStyle: TextStyle(color: Colors.grey[400]),
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 12,
                          ),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(24),
                            borderSide: BorderSide.none,
                          ),
                          filled: true,
                          fillColor: Colors.grey[100],
                        ),
                        maxLines: null,
                        textInputAction: TextInputAction.send,
                        onSubmitted: _isSending ? null : (text) => _sendMessage(),
                      ),
                    ),
                    const SizedBox(width: 8),
                    // 发送按钮（M4: 使用 PulsingDots 动画）
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      child: _isSending
                          ? Container(
                              width: 48,
                              height: 48,
                              padding: const EdgeInsets.all(16),
                              child: const PulsingDots(
                                count: 3,
                                size: 6,
                                color: Color(0xFF5B8DEF),
                              ),
                            )
                          : IconButton(
                              onPressed: _messageController.text.trim().isEmpty
                                  ? null
                                  : () => _sendMessage(),
                              icon: const Icon(Icons.send),
                              color: const Color(0xFF5B8DEF),
                              disabledColor: Colors.grey[300],
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

  Widget _buildInitialMessage(ChatMessage message, AppI18n i18n) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: const Color(0xFF5B8DEF),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Text(
              i18n.tr('dialogue.generated_text'),
              style: const TextStyle(
                color: Colors.white,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.grey[50],
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.grey[200]!),
            ),
            child: SelectableText(
              message.content,
              style: const TextStyle(
                fontSize: 15,
                height: 1.6,
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            i18n.tr('dialogue.follow_up_hint'),
            style: TextStyle(
              fontSize: 13,
              color: Colors.grey[600],
              fontStyle: FontStyle.italic,
            ),
          ),
          const SizedBox(height: 8),
          const Divider(),
        ],
      ),
    );
  }

  Widget _buildMessageBubble(ChatMessage message, AppI18n i18n) {
    final isUser = message.isUser;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      child: Row(
        mainAxisAlignment: isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (!isUser)
            Container(
              width: 32,
              height: 32,
              margin: const EdgeInsets.only(right: 8),
              decoration: BoxDecoration(
                color: const Color(0xFF5B8DEF),
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Icon(
                Icons.smart_toy,
                color: Colors.white,
                size: 18,
              ),
            ),
          Flexible(
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isUser ? const Color(0xFF5B8DEF) : Colors.grey[100],
                borderRadius: BorderRadius.circular(16).copyWith(
                  bottomRight: isUser ? const Radius.circular(4) : null,
                  bottomLeft: !isUser ? const Radius.circular(4) : null,
                ),
              ),
              child: SelectableText(
                message.content,
                style: TextStyle(
                  color: isUser ? Colors.white : Colors.black87,
                  fontSize: 14,
                  height: 1.5,
                ),
              ),
            ),
          ),
          if (isUser)
            Container(
              width: 32,
              height: 32,
              margin: const EdgeInsets.only(left: 8),
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(16),
              ),
              child: Icon(
                Icons.person,
                color: Colors.grey[600],
                size: 18,
              ),
            ),
        ],
      ),
    );
  }
}
