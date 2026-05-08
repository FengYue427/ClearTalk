import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../models/history_record.dart';
import '../providers/app_provider.dart';
import '../services/export_service.dart';
import '../l10n/app_i18n.dart';
import '../widgets/empty_state.dart';

class _HistoryListItem {
  final String? dateGroup; // null表示是记录项，非null表示日期标题
  final HistoryRecord? record;
  final String key;

  _HistoryListItem.date(this.dateGroup, this.key) : record = null;
  _HistoryListItem.record(this.record, this.key) : dateGroup = null;
}

class HistoryPage extends ConsumerStatefulWidget {
  const HistoryPage({super.key});

  @override
  ConsumerState<HistoryPage> createState() => _HistoryPageState();
}

class _HistoryPageState extends ConsumerState<HistoryPage> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<HistoryRecord> _filterRecords(List<HistoryRecord> records) {
    if (_searchQuery.isEmpty) return records;
    
    return records.where((record) {
      final searchText = 
          '${record.sceneName} ${record.generatedText} ${record.category}'.toLowerCase();
      return searchText.contains(_searchQuery.toLowerCase());
    }).toList();
  }

  /// 将分组数据扁平化为列表项，优化ListView性能
  List<_HistoryListItem> _flattenRecords(
    Map<String, List<HistoryRecord>> groupedRecords,
  ) {
    final items = <_HistoryListItem>[];
    int dateIndex = 0;

    for (final entry in groupedRecords.entries) {
      // 添加日期分组标题
      items.add(_HistoryListItem.date(entry.key, 'date_$dateIndex'));

      // 添加该分组下的所有记录
      for (int i = 0; i < entry.value.length; i++) {
        final record = entry.value[i];
        items.add(_HistoryListItem.record(record, 'record_${record.id}'));
      }
      dateIndex++;
    }

    return items;
  }

  Map<String, List<HistoryRecord>> _groupByDate(List<HistoryRecord> records, AppI18n i18n) {
    final groups = <String, List<HistoryRecord>>{};

    for (final record in records) {
      final date = _formatGroupDate(record.createdAt, i18n);
      groups.putIfAbsent(date, () => []).add(record);
    }

    return groups;
  }

  String _formatGroupDate(DateTime date, AppI18n i18n) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final yesterday = today.subtract(const Duration(days: 1));
    final recordDate = DateTime(date.year, date.month, date.day);

    if (recordDate == today) return i18n.locale.languageCode == 'zh' ? '今天' : 'Today';
    if (recordDate == yesterday) return i18n.locale.languageCode == 'zh' ? '昨天' : 'Yesterday';
    if (now.difference(recordDate).inDays < 7) {
      return DateFormat('EEEE', i18n.locale.languageCode == 'zh' ? 'zh_CN' : 'en_US').format(date);
    }
    return DateFormat(i18n.locale.languageCode == 'zh' ? 'yyyy年M月d日' : 'MMM d, yyyy').format(date);
  }

  @override
  Widget build(BuildContext context) {
    final i18n = AppI18n.of(context);
    final allRecords = ref.watch(historyRecordsProvider);
    final filteredRecords = _filterRecords(allRecords);
    final groupedRecords = _groupByDate(filteredRecords, i18n);
    final flattenedItems = _flattenRecords(groupedRecords);

    return Scaffold(
      appBar: AppBar(
        title: Text(i18n.tr('history.title')),
        elevation: 0,
        actions: [
          if (allRecords.isNotEmpty) ...[
            IconButton(
              icon: const Icon(Icons.share_outlined),
              tooltip: i18n.tr('history.export.share'),
              onPressed: () => _showExportDialog(context, ref, allRecords),
            ),
            TextButton(
              onPressed: () => _showClearDialog(context, ref),
              child: Text(
                i18n.tr('common.clear'),
                style: const TextStyle(color: Colors.red),
              ),
            ),
          ],
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // 搜索栏
            Container(
              padding: const EdgeInsets.all(16),
              child: TextField(
                controller: _searchController,
                onChanged: (value) => setState(() => _searchQuery = value),
                decoration: InputDecoration(
                  hintText: i18n.tr('history.search.placeholder'),
                  prefixIcon: const Icon(Icons.search),
                  suffixIcon: _searchQuery.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear),
                          onPressed: () {
                            _searchController.clear();
                            setState(() => _searchQuery = '');
                          },
                        )
                      : null,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none,
                  ),
                  filled: true,
                  fillColor: Colors.grey[100],
                ),
              ),
            ),

            // 记录列表
            Expanded(
              child: allRecords.isEmpty
                  ? _buildEmptyState()
                  : filteredRecords.isEmpty
                      ? _buildNoSearchResult()
                      : _buildOptimizedRecordList(flattenedItems),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    final i18n = AppI18n.of(context);
    return HistoryEmptyState(
      title: i18n.tr('history.empty'),
      subtitle: '',
    );
  }

  Widget _buildNoSearchResult() {
    final i18n = AppI18n.of(context);
    return SearchEmptyState(title: i18n.tr('history.search.empty'));
  }

  /// 性能优化：使用扁平化数据 + addAutomaticKeepAlives: false + Key优化
  Widget _buildOptimizedRecordList(List<_HistoryListItem> items) {
    return RefreshIndicator(
      onRefresh: () async {
        await ref.read(historyRecordsProvider.notifier).refresh();
      },
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: items.length,
        addAutomaticKeepAlives: false, // 性能优化：不自动保持状态
        addRepaintBoundaries: true, // 添加重绘边界
        cacheExtent: 200, // 预缓存高度，减少滚动时的卡顿
        itemBuilder: (context, index) {
          final item = items[index];

          if (item.dateGroup != null) {
            // 日期分组标题
            return Padding(
              key: ValueKey(item.key),
              padding: const EdgeInsets.only(top: 16, bottom: 8),
              child: Text(
                item.dateGroup!,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: Colors.grey[600],
                ),
              ),
            );
          } else {
            // 记录卡片 - 使用RepaintBoundary隔离重绘
            return RepaintBoundary(
              key: ValueKey(item.key),
              child: _buildRecordCard(item.record!),
            );
          }
        },
      ),
    );
  }

  /// 保留旧方法用于兼容性
  Widget _buildRecordList(Map<String, List<HistoryRecord>> groupedRecords) {
    final items = _flattenRecords(groupedRecords);
    return _buildOptimizedRecordList(items);
  }

  Widget _buildRecordCard(HistoryRecord record) {
    final toneLabel = _getToneLabel(record.tone);
    
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => _showRecordDetail(record),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: _getCategoryColor(record.category).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      record.category ?? '其他',
                      style: TextStyle(
                        fontSize: 11,
                        color: _getCategoryColor(record.category),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.grey[100],
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      toneLabel,
                      style: TextStyle(
                        fontSize: 11,
                        color: Colors.grey[600],
                      ),
                    ),
                  ),
                  const Spacer(),
                  Text(
                    DateFormat('HH:mm').format(record.createdAt),
                    style: TextStyle(
                      fontSize: 11,
                      color: Colors.grey[400],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                record.sceneName,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                record.generatedText,
                style: TextStyle(
                  fontSize: 13,
                  color: Colors.grey[600],
                  height: 1.5,
                ),
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  _buildActionButton(
                    icon: Icons.copy,
                    label: '复制',
                    onTap: () => _copyRecord(record),
                  ),
                  const SizedBox(width: 16),
                  _buildActionButton(
                    icon: Icons.delete_outline,
                    label: '删除',
                    onTap: () => _deleteRecord(record),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildActionButton({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: Colors.grey[500]),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              color: Colors.grey[500],
            ),
          ),
        ],
      ),
    );
  }

  void _showRecordDetail(HistoryRecord record) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        maxChildSize: 0.9,
        minChildSize: 0.5,
        expand: false,
        builder: (context, scrollController) {
          return Container(
            padding: const EdgeInsets.all(20),
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
                const SizedBox(height: 20),
                
                // 标题
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: _getCategoryColor(record.category).withOpacity(0.1),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        record.sceneName,
                        style: TextStyle(
                          color: _getCategoryColor(record.category),
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  DateFormat('yyyy年M月d日 HH:mm').format(record.createdAt),
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[500],
                  ),
                ),
                const SizedBox(height: 20),
                
                // 内容
                Expanded(
                  child: SingleChildScrollView(
                    controller: scrollController,
                    child: SelectableText(
                      record.generatedText,
                      style: const TextStyle(
                        fontSize: 15,
                        height: 1.8,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                
                // 底部按钮
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () {
                          _copyRecord(record);
                          Navigator.pop(context);
                        },
                        icon: const Icon(Icons.copy),
                        label: const Text('复制全文'),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () => Navigator.pop(context),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF5B8DEF),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                        child: const Text('关闭'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  void _copyRecord(HistoryRecord record) async {
    final i18n = AppI18n.of(context);
    await Clipboard.setData(ClipboardData(text: record.generatedText));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(i18n.tr('result.copied'))),
    );
  }

  void _deleteRecord(HistoryRecord record) {
    final i18n = AppI18n.of(context);
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(i18n.tr('common.confirm_delete')),
        content: Text(i18n.tr('common.delete_warning')),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(i18n.tr('common.cancel')),
          ),
          TextButton(
            onPressed: () async {
              await ref.read(historyRecordsProvider.notifier).deleteRecord(record.id);
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text(i18n.tr('common.delete.success'))),
              );
            },
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: Text(i18n.tr('common.delete')),
          ),
        ],
      ),
    );
  }

  /// 显示导出对话框
  void _showExportDialog(BuildContext context, WidgetRef ref, List<HistoryRecord> records) {
    final i18n = AppI18n.of(context);

    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
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
                i18n.tr('history.export.title'),
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                i18n.tr('history.export.subtitle').replaceAll('{count}', records.length.toString()),
                style: TextStyle(
                  fontSize: 13,
                  color: Colors.grey[600],
                ),
              ),
              const SizedBox(height: 20),

              // 导出选项
              _buildExportOption(
                icon: Icons.text_snippet_outlined,
                color: Colors.blue,
                title: i18n.tr('history.export.text'),
                subtitle: i18n.tr('history.export.text_desc'),
                onTap: () async {
                  Navigator.pop(context);
                  final text = await ExportService.exportHistoryToText(records);
                  await ExportService.copyToClipboard(text);
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(i18n.tr('history.export.copied'))),
                    );
                  }
                },
              ),
              const SizedBox(height: 12),

              _buildExportOption(
                icon: Icons.code_outlined,
                color: Colors.green,
                title: i18n.tr('history.export.json'),
                subtitle: i18n.tr('history.export.json_desc'),
                onTap: () async {
                  Navigator.pop(context);
                  await ExportService.exportAndShare(records, format: ExportFormat.json);
                },
              ),
              const SizedBox(height: 12),

              _buildExportOption(
                icon: Icons.share_outlined,
                color: Colors.orange,
                title: i18n.tr('history.export.share'),
                subtitle: i18n.tr('history.export.share_desc'),
                onTap: () async {
                  Navigator.pop(context);
                  await ExportService.exportAndShare(records, format: ExportFormat.text);
                },
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildExportOption({
    required IconData icon,
    required Color color,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          border: Border.all(color: Colors.grey[200]!),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: color, size: 24),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey[600],
                    ),
                  ),
                ],
              ),
            ),
            Icon(Icons.chevron_right, color: Colors.grey[400]),
          ],
        ),
      ),
    );
  }

  void _showClearDialog(BuildContext context, WidgetRef ref) {
    final i18n = AppI18n.of(context);
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(i18n.tr('history.clear.title')),
        content: Text(i18n.tr('history.clear.warning')),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(i18n.tr('common.cancel')),
          ),
          TextButton(
            onPressed: () async {
              await ref.read(historyRecordsProvider.notifier).clearAll();
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text(i18n.tr('history.clear.success'))),
              );
            },
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: Text(i18n.tr('history.clear.all')),
          ),
        ],
      ),
    );
  }

  String _getToneLabel(String tone) {
    switch (tone) {
      case 'soft':
        return '温和';
      case 'firm':
        return '坚定';
      case 'neutral':
      default:
        return '中立';
    }
  }

  Color _getCategoryColor(String? category) {
    switch (category) {
      case '职场沟通':
        return const Color(0xFF5B8DEF);
      case '消费平台':
        return const Color(0xFFFF9F43);
      case '租房物业':
        return const Color(0xFF26DE81);
      case '人际金钱':
        return const Color(0xFFFD79A8);
      default:
        return const Color(0xFFA29BFE);
    }
  }
}
