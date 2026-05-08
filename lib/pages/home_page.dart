import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/history_record.dart';
import '../models/scene_template.dart';
import '../providers/app_provider.dart';
import '../l10n/app_i18n.dart';
import '../services/user_service.dart';
import '../templates/builtin_scenes.dart';
import '../templates/scene_template_i18n.dart';
import '../widgets/page_transitions.dart';
import 'input_page.dart';
import 'history_page.dart';
import 'user_page.dart';

class HomePage extends ConsumerStatefulWidget {
  const HomePage({super.key});

  @override
  ConsumerState<HomePage> createState() => _HomePageState();
}

class _HomePageState extends ConsumerState<HomePage> {
  @override
  Widget build(BuildContext context) {
    final categories = ref.watch(sceneCategoriesProvider);
    final recentRecords = ref.watch(historyRecordsProvider).take(3).toList();
    final i18n = AppI18n.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(i18n.tr('app.title'), style: const TextStyle(fontWeight: FontWeight.bold)),
        centerTitle: true,
        actions: [
          // 用户入口
          _buildUserAvatar(context),
          // 历史记录入口
          IconButton(
            icon: const Icon(Icons.history),
            onPressed: () {
              Navigator.push(
                context,
                SlidePageRoute(page: const HistoryPage()),
              );
            },
          ),
        ],
      ),
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
            // 欢迎区域
            SliverToBoxAdapter(
              child: Container(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      i18n.tr('home.welcome.title'),
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      i18n.tr('home.welcome.subtitle'),
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey[600],
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // 最近使用（如果有）
            if (recentRecords.isNotEmpty) ...[
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        i18n.tr('home.recent.title'),
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      TextButton(
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(builder: (_) => const HistoryPage()),
                          );
                        },
                        child: Text(i18n.tr('common.view_all')),
                      ),
                    ],
                  ),
                ),
              ),
              SliverToBoxAdapter(
                child: SizedBox(
                  height: 100,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    itemCount: recentRecords.length,
                    itemBuilder: (context, index) {
                      final record = recentRecords[index];
                      return _buildRecentCard(context, record);
                    },
                  ),
                ),
              ),
            ],

            // 场景分类
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Text(
                  i18n.tr('home.choose_scene'),
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                    color: Colors.grey[800],
                  ),
                ),
              ),
            ),

            // 分类列表
            SliverList(
              delegate: SliverChildBuilderDelegate(
                (context, index) {
                  final category = categories[index];
                  final scenes = BuiltinScenes.byCategory(category);
                  final sceneI18n = SceneTemplateI18n(i18n);
                  final translatedScenes = sceneI18n.byCategory(category);
                  return _buildCategorySection(context, ref, category, translatedScenes);
                },
                childCount: categories.length,
              ),
            ),

            // 底部留白
            const SliverPadding(padding: EdgeInsets.only(bottom: 40)),
          ],
        ),
      ),
    );
  }

  Widget _buildRecentCard(BuildContext context, HistoryRecord record) {
    final i18n = AppI18n.of(context);
    return Container(
      width: 200,
      margin: const EdgeInsets.only(right: 12),
      child: Card(
        elevation: 2,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.blue[100],
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  record.category ?? i18n.tr('common.other'),
                  style: TextStyle(
                    fontSize: 10,
                    color: Colors.blue[800],
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                record.sceneName,
                style: const TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 14,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 4),
              Text(
                _formatDate(context, record.createdAt),
                style: TextStyle(
                  fontSize: 11,
                  color: Colors.grey[500],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCategorySection(
    BuildContext context,
    WidgetRef ref,
    String category,
    List<SceneTemplate> scenes,
  ) {
    final i18n = AppI18n.of(context);
    final sceneI18n = SceneTemplateI18n(i18n);
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Row(
              children: [
                Container(
                  width: 4,
                  height: 20,
                  decoration: BoxDecoration(
                    color: _getCategoryColor(category),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(width: 12),
                Text(
                  i18n.tr(_categoryToI18nKey(category)),
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          ...scenes.map((scene) => _buildSceneCard(context, ref, scene)),
        ],
      ),
    );
  }

  Widget _buildSceneCard(BuildContext context, WidgetRef ref, SceneTemplate scene) {
    final i18n = AppI18n.of(context);
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () {
          // 重置状态
          ref.read(selectedSceneProvider.notifier).state = scene;
          ref.read(formValuesProvider.notifier).state = {};
          ref.read(selectedToneProvider.notifier).state = 'neutral';
          ref.read(generatedTextProvider.notifier).state = null;
          
          // M4: 使用滑动页面过渡动画
          Navigator.push(
            context,
            SlidePageRoute(page: InputPage(scene: scene)),
          );
        },
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: _getCategoryColor(scene.category).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  _getCategoryIcon(scene.category),
                  color: _getCategoryColor(scene.category),
                  size: 24,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      scene.name,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      scene.description,
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey[600],
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              Icon(
                Icons.chevron_right,
                color: Colors.grey[400],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Color _getCategoryColor(String category) {
    // 支持中英文分类名
    switch (category) {
      case '职场沟通':
      case 'Work':
        return const Color(0xFF5B8DEF);
      case '消费平台':
      case 'Consumer':
        return const Color(0xFFFF9F43);
      case '租房物业':
      case 'Housing':
        return const Color(0xFF26DE81);
      case '人际金钱':
      case 'Relationships & Money':
        return const Color(0xFFFD79A8);
      default:
        return const Color(0xFFA29BFE);
    }
  }

  IconData _getCategoryIcon(String category) {
    // 支持中英文分类名
    switch (category) {
      case '职场沟通':
      case 'Work':
        return Icons.work_outline;
      case '消费平台':
      case 'Consumer':
        return Icons.shopping_cart_outlined;
      case '租房物业':
      case 'Housing':
        return Icons.home_outlined;
      case '人际金钱':
      case 'Relationships & Money':
        return Icons.people_outline;
      default:
        return Icons.chat_bubble_outline;
    }
  }

  String _formatDate(BuildContext context, DateTime date) {
    final i18n = AppI18n.of(context);
    final now = DateTime.now();
    final diff = now.difference(date);
    
    if (diff.inMinutes < 60) {
      return i18n.tr('time.minutes_ago', params: {'n': diff.inMinutes.toString()});
    } else if (diff.inHours < 24) {
      return i18n.tr('time.hours_ago', params: {'n': diff.inHours.toString()});
    } else if (diff.inDays < 30) {
      return i18n.tr('time.days_ago', params: {'n': diff.inDays.toString()});
    } else {
      return i18n.tr('time.month_day', params: {'m': date.month.toString(), 'd': date.day.toString()});
    }
  }

  String _categoryToI18nKey(String category) {
    switch (category) {
      case '职场沟通':
        return 'category.work';
      case '消费平台':
        return 'category.consumer';
      case '租房物业':
        return 'category.housing';
      case '人际金钱':
        return 'category.relationships_money';
      default:
        return 'category.other';
    }
  }

  /// 构建用户头像入口
  Widget _buildUserAvatar(BuildContext context) {
    final userService = UserService();
    final isLoggedIn = userService.isLoggedIn;
    final user = userService.currentUser;

    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          SlidePageRoute(page: const UserPage()),
        );
      },
      child: Container(
        margin: const EdgeInsets.only(right: 8),
        child: CircleAvatar(
          radius: 18,
          backgroundColor: isLoggedIn
              ? const Color(0xFF5B8DEF).withOpacity(0.2)
              : Colors.grey[200],
          child: isLoggedIn
              ? Text(
                  user?.username.substring(0, 1).toUpperCase() ?? 'U',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF5B8DEF),
                  ),
                )
              : Icon(
                  Icons.person_outline,
                  size: 20,
                  color: Colors.grey[600],
                ),
        ),
      ),
    );
  }
}
