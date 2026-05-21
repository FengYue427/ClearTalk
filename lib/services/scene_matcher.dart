import '../models/scene_template.dart';
import '../templates/builtin_scenes.dart';

class SceneMatch {
  final SceneTemplate scene;
  final int score;
  final List<String> matchedKeywords;

  SceneMatch({
    required this.scene,
    required this.score,
    required this.matchedKeywords,
  });
}

/// 根据粘贴文本推荐场景（与 Web scene-matcher 对齐）
class SceneMatcher {
  static const Map<String, List<String>> _keywords = {
    'leave_request': ['请假', '休假', '年假', '病假'],
    'loan_reminder': ['借款', '还钱', '催还', '欠款'],
    'refund_rejected': ['退款', '退货', '拒退'],
    'work_handover': ['交接', '离职交接', '工作交接'],
    'meeting_followup': ['会议纪要', '会议跟进', '待办'],
    'subscription_cancel': ['取消订阅', '退订', '自动续费'],
    'insurance_claim': ['保险', '理赔', '保单'],
    'neighbor_notice': ['邻居', '装修通知', '邻里'],
    'wedding_invite_reply': ['婚礼', '婚宴', '邀请'],
    'admin_inquiry': ['办事', '咨询', '户籍', '社保'],
    'document_progress': ['证件', '办理进度', '护照'],
  };

  static List<SceneMatch> matchFromText(
    String text, {
    List<SceneTemplate>? scenes,
    int limit = 3,
  }) {
    final input = text.trim();
    if (input.isEmpty) return [];

    final list = scenes ?? BuiltinScenes.all;
    final lower = input.toLowerCase();

    final scored = <SceneMatch>[];
    for (final scene in list) {
      var score = 0;
      final matched = <String>[];

      for (final kw in _keywords[scene.id] ?? []) {
        if (lower.contains(kw.toLowerCase())) {
          score += 4;
          matched.add(kw);
        }
      }

      if (lower.contains(scene.name.toLowerCase())) {
        score += 6;
        matched.add(scene.name);
      }

      if (score > 0) {
        scored.add(SceneMatch(
          scene: scene,
          score: score,
          matchedKeywords: matched.toSet().toList(),
        ));
      }
    }

    scored.sort((a, b) => b.score.compareTo(a.score));
    return scored.take(limit).toList();
  }
}
