import '../models/scene_template.dart';

/// 首批12个内置场景模板
/// 聚焦：职场沟通、消费平台、租房物业、人际金钱往来
class BuiltinScenes {
  static const all = [
    // ===== 职场沟通 =====
    _leaveRequest,
    _urgentLeave,
    _overtimeConfirm,
    _salaryDispute,
    _resignationConfirm,
    
    // ===== 消费平台 =====
    _refundRejected,
    _qualityIssue,
    _autoRenewal,
    _foodDeliveryIssue,
    
    // ===== 租房物业 =====
    _depositRefund,
    _maintenanceDelay,
    
    // ===== 人际金钱 =====
    _loanReminder,
    _clarification,
  ];

  static SceneTemplate? findById(String id) {
    try {
      return all.firstWhere((s) => s.id == id);
    } catch (_) {
      return null;
    }
  }

  static List<SceneTemplate> byCategory(String category) {
    return all.where((s) => s.category == category).toList();
  }

  // ===== 场景1：请假申请 =====
  static const _leaveRequest = SceneTemplate(
    id: 'leave_request',
    name: '请假申请',
    category: '职场沟通',
    description: '向上级申请休假，说明时间和原因',
    fields: [
      TemplateField(
        key: 'recipient',
        label: '收件人称呼',
        placeholder: '如：王经理',
        type: FieldType.text,
        required: true,
      ),
      TemplateField(
        key: 'leaveType',
        label: '请假类型',
        type: FieldType.select,
        required: true,
        options: ['事假', '病假', '年假', '调休', '其他'],
      ),
      TemplateField(
        key: 'startDate',
        label: '开始日期',
        placeholder: '如：2024年1月15日',
        type: FieldType.text,
        required: true,
      ),
      TemplateField(
        key: 'endDate',
        label: '结束日期',
        placeholder: '如：2024年1月16日',
        type: FieldType.text,
        required: true,
      ),
      TemplateField(
        key: 'days',
        label: '请假天数',
        placeholder: '如：2天',
        type: FieldType.text,
        required: true,
      ),
      TemplateField(
        key: 'reason',
        label: '请假原因',
        placeholder: '简要说明原因',
        type: FieldType.textarea,
        required: true,
        hint: '无需过于详细，点到为止即可',
      ),
      TemplateField(
        key: 'handover',
        label: '工作交接安排',
        placeholder: '如：已交接给小张，紧急事务可电话联系',
        type: FieldType.textarea,
        required: false,
      ),
    ],
  );

  // ===== 场景2：紧急请假 =====
  static const _urgentLeave = SceneTemplate(
    id: 'urgent_leave',
    name: '紧急请假',
    category: '职场沟通',
    description: '临时突发事件需要请假',
    fields: [
      TemplateField(
        key: 'recipient',
        label: '收件人称呼',
        placeholder: '如：王经理',
        type: FieldType.text,
        required: true,
      ),
      TemplateField(
        key: 'emergencyType',
        label: '紧急事由',
        placeholder: '如：家人突发疾病需送医',
        type: FieldType.text,
        required: true,
        hint: '简要说明即可，无需详述',
      ),
      TemplateField(
        key: 'expectedBack',
        label: '预计返岗时间',
        placeholder: '如：明天下午或后天上午',
        type: FieldType.text,
        required: true,
      ),
      TemplateField(
        key: 'contact',
        label: '紧急联系方式',
        placeholder: '如：手机保持畅通',
        type: FieldType.text,
        required: false,
      ),
    ],
  );

  // ===== 场景3：加班调休确认 =====
  static const _overtimeConfirm = SceneTemplate(
    id: 'overtime_confirm',
    name: '加班调休确认',
    category: '职场沟通',
    description: '确认加班时长和调休安排',
    fields: [
      TemplateField(
        key: 'recipient',
        label: '收件人称呼',
        type: FieldType.text,
        required: true,
      ),
      TemplateField(
        key: 'overtimeDate',
        label: '加班日期',
        placeholder: '如：1月10日',
        type: FieldType.text,
        required: true,
      ),
      TemplateField(
        key: 'overtimeHours',
        label: '加班时长',
        placeholder: '如：3小时',
        type: FieldType.text,
        required: true,
      ),
      TemplateField(
        key: 'workContent',
        label: '加班工作内容',
        placeholder: '简要说明',
        type: FieldType.textarea,
        required: true,
      ),
      TemplateField(
        key: 'restRequest',
        label: '调休请求',
        placeholder: '如：希望本周五下午调休',
        type: FieldType.text,
        required: true,
      ),
    ],
  );

  // ===== 场景4：工资/绩效异议 =====
  static const _salaryDispute = SceneTemplate(
    id: 'salary_dispute',
    name: '工资/绩效异议',
    category: '职场沟通',
    description: '对工资或绩效结果提出疑问',
    fields: [
      TemplateField(
        key: 'recipient',
        label: '收件人称呼',
        type: FieldType.text,
        required: true,
      ),
      TemplateField(
        key: 'payPeriod',
        label: '涉及月份/周期',
        placeholder: '如：2024年1月工资',
        type: FieldType.text,
        required: true,
      ),
      TemplateField(
        key: 'issueType',
        label: '问题类型',
        type: FieldType.select,
        required: true,
        options: ['工资数额不符', '绩效评分疑问', '扣款原因不明', '加班费未算', '其他'],
      ),
      TemplateField(
        key: 'expectedAmount',
        label: '预期金额',
        placeholder: '如：8000元',
        type: FieldType.text,
        required: false,
      ),
      TemplateField(
        key: 'actualAmount',
        label: '实际金额',
        placeholder: '如：7500元',
        type: FieldType.text,
        required: false,
      ),
      TemplateField(
        key: 'evidence',
        label: '相关依据',
        placeholder: '如：劳动合同约定/聊天记录/考勤记录',
        type: FieldType.textarea,
        required: false,
        hint: '有证据可简要提及，无证据也可沟通',
      ),
      TemplateField(
        key: 'request',
        label: '具体诉求',
        placeholder: '如：请核实并补发差额500元',
        type: FieldType.text,
        required: true,
      ),
    ],
  );

  // ===== 场景5：离职时间与交接 =====
  static const _resignationConfirm = SceneTemplate(
    id: 'resignation_confirm',
    name: '离职交接确认',
    category: '职场沟通',
    description: '确认最后工作日和交接安排',
    fields: [
      TemplateField(
        key: 'recipient',
        label: '收件人称呼',
        type: FieldType.text,
        required: true,
      ),
      TemplateField(
        key: 'lastDate',
        label: '最后工作日',
        placeholder: '如：2024年2月28日',
        type: FieldType.text,
        required: true,
      ),
      TemplateField(
        key: 'handoverTo',
        label: '交接对象',
        placeholder: '如：接交人：小李',
        type: FieldType.text,
        required: true,
      ),
      TemplateField(
        key: 'handoverItems',
        label: '交接事项',
        placeholder: '如：项目文件、客户资料、账号权限等',
        type: FieldType.textarea,
        required: true,
      ),
      TemplateField(
        key: 'salarySettle',
        label: '工资结算询问',
        placeholder: '如：请问工资和补偿金何时结算？',
        type: FieldType.text,
        required: false,
      ),
    ],
  );

  // ===== 场景6：退款被拒申诉 =====
  static const _refundRejected = SceneTemplate(
    id: 'refund_rejected',
    name: '退款被拒申诉',
    category: '消费平台',
    description: '商品/服务问题申请退款',
    fields: [
      TemplateField(
        key: 'platform',
        label: '平台/商家名称',
        placeholder: '如：XX电商平台/XX店铺',
        type: FieldType.text,
        required: true,
      ),
      TemplateField(
        key: 'orderId',
        label: '订单号',
        placeholder: '如：123456789',
        type: FieldType.text,
        required: true,
      ),
      TemplateField(
        key: 'productName',
        label: '商品/服务名称',
        type: FieldType.text,
        required: true,
      ),
      TemplateField(
        key: 'amount',
        label: '订单金额',
        placeholder: '如：299元',
        type: FieldType.text,
        required: true,
      ),
      TemplateField(
        key: 'purchaseDate',
        label: '购买日期',
        placeholder: '如：1月5日',
        type: FieldType.text,
        required: true,
      ),
      TemplateField(
        key: 'refundReason',
        label: '退款原因',
        type: FieldType.select,
        required: true,
        options: ['未收到货', '货不对板', '质量问题', '与描述不符', '七天无理由', '其他'],
      ),
      TemplateField(
        key: 'rejectedReason',
        label: '平台拒绝理由',
        placeholder: '如：影响二次销售',
        type: FieldType.text,
        required: false,
      ),
      TemplateField(
        key: 'evidence',
        label: '证据说明',
        placeholder: '如：有开箱视频/照片为证',
        type: FieldType.textarea,
        required: false,
      ),
    ],
  );

  // ===== 场景7：质量问题沟通 =====
  static const _qualityIssue = SceneTemplate(
    id: 'quality_issue',
    name: '货不对板/质量问题',
    category: '消费平台',
    description: '收到商品与描述不符或有质量问题',
    fields: [
      TemplateField(
        key: 'platform',
        label: '平台/商家',
        type: FieldType.text,
        required: true,
      ),
      TemplateField(
        key: 'orderId',
        label: '订单号',
        type: FieldType.text,
        required: true,
      ),
      TemplateField(
        key: 'productName',
        label: '商品名称',
        type: FieldType.text,
        required: true,
      ),
      TemplateField(
        key: 'issueDesc',
        label: '问题描述',
        placeholder: '如：颜色与图片完全不符/有明显划痕',
        type: FieldType.textarea,
        required: true,
      ),
      TemplateField(
        key: 'photoEvidence',
        label: '是否有照片/视频证据',
        type: FieldType.boolean,
        required: false,
      ),
      TemplateField(
        key: 'expectedSolution',
        label: '期望解决方案',
        type: FieldType.select,
        required: true,
        options: ['退货退款', '换货', '部分退款补偿', '补发', '其他'],
      ),
    ],
  );

  // ===== 场景8：自动续费申诉 =====
  static const _autoRenewal = SceneTemplate(
    id: 'auto_renewal',
    name: '自动续费申诉',
    category: '消费平台',
    description: '未收到提醒被自动扣费',
    fields: [
      TemplateField(
        key: 'platform',
        label: '平台/服务名称',
        placeholder: '如：XX视频会员',
        type: FieldType.text,
        required: true,
      ),
      TemplateField(
        key: 'chargeDate',
        label: '扣费日期',
        type: FieldType.text,
        required: true,
      ),
      TemplateField(
        key: 'amount',
        label: '扣费金额',
        type: FieldType.text,
        required: true,
      ),
      TemplateField(
        key: 'notified',
        label: '是否收到续费提醒',
        type: FieldType.boolean,
        required: true,
      ),
      TemplateField(
        key: 'usageAfterCharge',
        label: '扣费后是否使用服务',
        type: FieldType.boolean,
        required: true,
      ),
      TemplateField(
        key: 'request',
        label: '诉求',
        type: FieldType.select,
        required: true,
        options: ['全额退款', '按比例退款', '取消自动续费', '其他'],
      ),
    ],
  );

  // ===== 场景9：外卖问题沟通 =====
  static const _foodDeliveryIssue = SceneTemplate(
    id: 'food_delivery_issue',
    name: '外卖漏送/食安问题',
    category: '消费平台',
    description: '外卖订单出现问题',
    fields: [
      TemplateField(
        key: 'platform',
        label: '外卖平台',
        type: FieldType.select,
        required: true,
        options: ['美团', '饿了么', '其他'],
      ),
      TemplateField(
        key: 'orderId',
        label: '订单号',
        type: FieldType.text,
        required: true,
      ),
      TemplateField(
        key: 'issueType',
        label: '问题类型',
        type: FieldType.select,
        required: true,
        options: ['漏送商品', '送错商品', '食品变质', '异物', '严重超时', '其他'],
      ),
      TemplateField(
        key: 'issueDesc',
        label: '问题描述',
        type: FieldType.textarea,
        required: true,
      ),
      TemplateField(
        key: 'hasPhoto',
        label: '是否有照片证据',
        type: FieldType.boolean,
        required: false,
      ),
      TemplateField(
        key: 'expectedSolution',
        label: '期望解决',
        type: FieldType.select,
        required: true,
        options: ['全额退款', '补送', '部分退款', '优惠券补偿', '其他'],
      ),
    ],
  );

  // ===== 场景10：退押金 =====
  static const _depositRefund = SceneTemplate(
    id: 'deposit_refund',
    name: '退押金沟通',
    category: '租房物业',
    description: '租约到期要求退还押金',
    fields: [
      TemplateField(
        key: 'landlord',
        label: '房东/中介称呼',
        type: FieldType.text,
        required: true,
      ),
      TemplateField(
        key: 'address',
        label: '房屋地址',
        placeholder: '简要提及',
        type: FieldType.text,
        required: true,
      ),
      TemplateField(
        key: 'depositAmount',
        label: '押金金额',
        type: FieldType.text,
        required: true,
      ),
      TemplateField(
        key: 'moveOutDate',
        label: '退租日期',
        type: FieldType.text,
        required: true,
      ),
      TemplateField(
        key: 'handoverDone',
        label: '是否已交接房屋',
        type: FieldType.boolean,
        required: true,
      ),
      TemplateField(
        key: 'condition',
        label: '房屋状况',
        placeholder: '如：已打扫干净，无损坏',
        type: FieldType.text,
        required: false,
      ),
      TemplateField(
        key: 'deductionDispute',
        label: '是否有扣款争议',
        placeholder: '如：房东说墙面有污渍要扣500',
        type: FieldType.textarea,
        required: false,
      ),
    ],
  );

  // ===== 场景11：维修推诿 =====
  static const _maintenanceDelay = SceneTemplate(
    id: 'maintenance_delay',
    name: '维修推诿沟通',
    category: '租房物业',
    description: '报修后物业/房东拖延处理',
    fields: [
      TemplateField(
        key: 'recipient',
        label: '收件人',
        placeholder: '如：物业/房东',
        type: FieldType.text,
        required: true,
      ),
      TemplateField(
        key: 'address',
        label: '房屋地址',
        type: FieldType.text,
        required: true,
      ),
      TemplateField(
        key: 'issue',
        label: '维修问题',
        placeholder: '如：水管漏水/热水器不工作',
        type: FieldType.text,
        required: true,
      ),
      TemplateField(
        key: 'reportDate',
        label: '首次报修日期',
        type: FieldType.text,
        required: true,
      ),
      TemplateField(
        key: 'timesReported',
        label: '已报修次数',
        type: FieldType.text,
        required: false,
      ),
      TemplateField(
        key: 'urgency',
        label: '紧急程度',
        type: FieldType.select,
        required: true,
        options: ['影响正常生活', '有安全隐患', '一般维修', '其他'],
      ),
      TemplateField(
        key: 'deadline',
        label: '期望处理时间',
        placeholder: '如：48小时内',
        type: FieldType.text,
        required: true,
      ),
    ],
  );

  // ===== 场景12：借款催还 =====
  static const _loanReminder = SceneTemplate(
    id: 'loan_reminder',
    name: '借款催还',
    category: '人际金钱',
    description: '提醒朋友/熟人归还借款',
    fields: [
      TemplateField(
        key: 'borrower',
        label: '借款人称呼',
        type: FieldType.text,
        required: true,
      ),
      TemplateField(
        key: 'amount',
        label: '借款金额',
        type: FieldType.text,
        required: true,
      ),
      TemplateField(
        key: 'loanDate',
        label: '借款日期',
        type: FieldType.text,
        required: true,
      ),
      TemplateField(
        key: 'promisedDate',
        label: '约定还款日期',
        type: FieldType.text,
        required: false,
      ),
      TemplateField(
        key: 'paymentMethod',
        label: '支付方式',
        placeholder: '如：微信/支付宝/银行卡',
        type: FieldType.text,
        required: false,
      ),
      TemplateField(
        key: 'ownSituation',
        label: '自身情况（可选）',
        placeholder: '如：我最近也需要用钱',
        type: FieldType.textarea,
        required: false,
      ),
    ],
  );

  // ===== 场景13：误会澄清 =====
  static const _clarification = SceneTemplate(
    id: 'clarification',
    name: '事实说明/误会澄清',
    category: '人际金钱',
    description: '为自己澄清误会或说明事实',
    fields: [
      TemplateField(
        key: 'recipient',
        label: '收件人',
        type: FieldType.text,
        required: true,
      ),
      TemplateField(
        key: 'context',
        label: '事情背景',
        placeholder: '简要说明发生了什么',
        type: FieldType.textarea,
        required: true,
      ),
      TemplateField(
        key: 'misunderstanding',
        label: '对方误解的点',
        placeholder: '如：对方以为是我泄露的消息',
        type: FieldType.textarea,
        required: true,
      ),
      TemplateField(
        key: 'facts',
        label: '事实说明',
        placeholder: '客观陈述事实',
        type: FieldType.textarea,
        required: true,
      ),
      TemplateField(
        key: 'evidence',
        label: '可佐证的事实',
        placeholder: '如：当时在场的还有XX',
        type: FieldType.textarea,
        required: false,
      ),
      TemplateField(
        key: 'hope',
        label: '希望对方理解/做什么',
        placeholder: '如：希望能消除误会',
        type: FieldType.text,
        required: false,
      ),
    ],
  );
}
