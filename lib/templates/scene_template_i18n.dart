import '../l10n/app_i18n.dart';
import '../models/scene_template.dart';
import 'builtin_scenes.dart';

/// 场景模板国际化工具类
/// 根据当前语言环境返回翻译后的场景模板内容
class SceneTemplateI18n {
  final AppI18n i18n;

  const SceneTemplateI18n(this.i18n);

  /// 获取所有场景的翻译后列表
  List<SceneTemplate> get allScenes {
    return BuiltinScenes.all.map(_translateScene).toList();
  }

  /// 根据分类获取场景
  List<SceneTemplate> byCategory(String category) {
    return allScenes.where((s) => s.category == category).toList();
  }

  /// 根据ID查找场景
  SceneTemplate? findById(String id) {
    try {
      final original = BuiltinScenes.findById(id);
      if (original == null) return null;
      return _translateScene(original);
    } catch (_) {
      return null;
    }
  }

  /// 翻译单个场景
  SceneTemplate _translateScene(SceneTemplate scene) {
    return SceneTemplate(
      id: scene.id,
      name: _translateSceneName(scene.id),
      category: _translateCategory(scene.category),
      description: _translateSceneDesc(scene.id),
      fields: scene.fields.map(_translateField).toList(),
      defaultTone: scene.defaultTone,
      availableTones: scene.availableTones,
    );
  }

  /// 翻译场景名称
  String _translateSceneName(String sceneId) {
    final key = 'scene.$sceneId.name';
    final translated = i18n.tr(key);
    // 如果翻译不存在，返回原始值
    if (translated == key) {
      final original = BuiltinScenes.findById(sceneId);
      return original?.name ?? sceneId;
    }
    return translated;
  }

  /// 翻译场景描述
  String _translateSceneDesc(String sceneId) {
    final key = 'scene.$sceneId.desc';
    final translated = i18n.tr(key);
    if (translated == key) {
      final original = BuiltinScenes.findById(sceneId);
      return original?.description ?? '';
    }
    return translated;
  }

  /// 翻译分类名称
  String _translateCategory(String category) {
    final Map<String, String> categoryMap = {
      '职场沟通': 'scene.category.work',
      '消费平台': 'scene.category.consumer',
      '租房物业': 'scene.category.housing',
      '人际金钱': 'scene.category.relationships_money',
      'Work': 'scene.category.work',
      'Consumer': 'scene.category.consumer',
      'Housing': 'scene.category.housing',
      'Relationships & Money': 'scene.category.relationships_money',
    };

    final key = categoryMap[category];
    if (key != null) {
      final translated = i18n.tr(key);
      if (translated != key) return translated;
    }
    return category;
  }

  /// 翻译字段
  TemplateField _translateField(TemplateField field) {
    return TemplateField(
      key: field.key,
      label: _translateFieldLabel(field.key),
      placeholder: _translateFieldPlaceholder(field.key),
      type: field.type,
      required: field.required,
      hint: _translateFieldHint(field.key),
      options: field.options != null
          ? _translateOptions(field.key, field.options!)
          : null,
    );
  }

  /// 翻译字段标签
  String _translateFieldLabel(String fieldKey) {
    final key = 'scene.field.$fieldKey';
    final translated = i18n.tr(key);
    return translated != key ? translated : _defaultLabel(fieldKey);
  }

  /// 翻译字段占位符
  String? _translateFieldPlaceholder(String fieldKey) {
    final key = 'scene.field.$fieldKey.placeholder';
    final translated = i18n.tr(key);
    return translated != key ? translated : null;
  }

  /// 翻译字段提示
  String? _translateFieldHint(String fieldKey) {
    final key = 'scene.field.$fieldKey.hint';
    final translated = i18n.tr(key);
    return translated != key ? translated : null;
  }

  /// 翻译选项列表
  List<String> _translateOptions(String fieldKey, List<String> originalOptions) {
    // 根据字段key确定选项类型
    final optionKey = _getOptionKey(fieldKey);
    if (optionKey == null) return originalOptions;

    return originalOptions.map((opt) {
      // 尝试各种可能的匹配方式
      final key = 'scene.field.$optionKey.option.${_normalizeOption(opt)}';
      final translated = i18n.tr(key);
      return translated != key ? translated : opt;
    }).toList();
  }

  /// 获取选项的key前缀
  String? _getOptionKey(String fieldKey) {
    // 映射字段key到选项key
    final Map<String, String> keyMap = {
      'leaveType': 'leaveType',
      'issueType': 'issueType',
      'refundReason': 'refundReason',
      'expectedSolution': 'expectedSolution',
      'platform': 'deliveryPlatform',
      'issueType': 'deliveryIssueType',
      'expectedSolution': 'deliverySolution',
      'request': 'renewalRequest',
      'urgency': 'urgency',
    };
    return keyMap[fieldKey];
  }

  /// 标准化选项值用于key
  String _normalizeOption(String option) {
    // 将选项文本转换为key格式
    final Map<String, String> normalizations = {
      '事假': 'personal',
      '病假': 'sick',
      '年假': 'annual',
      '调休': 'compoff',
      '其他': 'other',
      '是': 'yes',
      '否': 'no',
      '工资数额不符': 'amount',
      '绩效评分疑问': 'performance',
      '扣款原因不明': 'deduction',
      '加班费未算': 'overtime',
      '未收到货': 'not_received',
      '货不对板': 'wrong_item',
      '质量问题': 'quality',
      '与描述不符': 'mismatch',
      '七天无理由': 'no_reason',
      '退货退款': 'refund',
      '换货': 'exchange',
      '部分退款补偿': 'partial',
      '补发': 'resend',
      '全额退款': 'full',
      '按比例退款': 'partial',
      '取消自动续费': 'cancel',
      '美团': 'meituan',
      '饿了么': 'eleme',
      '漏送商品': 'missing',
      '送错商品': 'wrong',
      '食品变质': 'spoiled',
      '异物': 'foreign',
      '严重超时': 'late',
      '补送': 'resend',
      '部分退款': 'partial',
      '优惠券补偿': 'coupon',
      '影响正常生活': 'life',
      '有安全隐患': 'safety',
      '一般维修': 'normal',
    };
    return normalizations[option] ?? option.toLowerCase().replaceAll(' ', '_');
  }

  /// 默认字段标签（当翻译不存在时）
  String _defaultLabel(String fieldKey) {
    final Map<String, String> defaults = {
      'recipient': '收件人称呼',
      'leaveType': '请假类型',
      'startDate': '开始日期',
      'endDate': '结束日期',
      'days': '请假天数',
      'reason': '请假原因',
      'handover': '工作交接安排',
      'emergencyType': '紧急事由',
      'expectedBack': '预计返岗时间',
      'contact': '紧急联系方式',
      'overtimeDate': '加班日期',
      'overtimeHours': '加班时长',
      'workContent': '加班工作内容',
      'restRequest': '调休请求',
      'payPeriod': '涉及月份/周期',
      'issueType': '问题类型',
      'expectedAmount': '预期金额',
      'actualAmount': '实际金额',
      'evidence': '相关依据',
      'request': '具体诉求',
      'lastDate': '最后工作日',
      'handoverTo': '交接对象',
      'handoverItems': '交接事项',
      'salarySettle': '工资结算询问',
      'platform': '平台/商家名称',
      'orderId': '订单号',
      'productName': '商品/服务名称',
      'amount': '订单金额',
      'purchaseDate': '购买日期',
      'refundReason': '退款原因',
      'rejectedReason': '平台拒绝理由',
      'issueDesc': '问题描述',
      'photoEvidence': '是否有照片/视频证据',
      'expectedSolution': '期望解决方案',
      'chargeDate': '扣费日期',
      'chargeAmount': '扣费金额',
      'notified': '是否收到续费提醒',
      'usageAfterCharge': '扣费后是否使用服务',
      'hasPhoto': '是否有照片证据',
      'landlord': '房东/中介称呼',
      'address': '房屋地址',
      'depositAmount': '押金金额',
      'moveOutDate': '退租日期',
      'handoverDone': '是否已交接房屋',
      'condition': '房屋状况',
      'deductionDispute': '是否有扣款争议',
      'issue': '维修问题',
      'reportDate': '首次报修日期',
      'timesReported': '已报修次数',
      'urgency': '紧急程度',
      'deadline': '期望处理时间',
      'borrower': '借款人称呼',
      'loanDate': '借款日期',
      'promisedDate': '约定还款日期',
      'paymentMethod': '支付方式',
      'ownSituation': '自身情况（可选）',
      'context': '事情背景',
      'misunderstanding': '对方误解的点',
      'facts': '事实说明',
      'supportingEvidence': '可佐证的事实',
      'hope': '希望对方理解/做什么',
    };
    return defaults[fieldKey] ?? fieldKey;
  }
}
