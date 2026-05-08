/**
 * ClearTalk - 沟通助手 (Web 版本)
 * 核心功能：场景模板 + AI 生成 + 本地存储
 */

// ==================== 场景模板定义 ====================

const FIELD_TYPES = {
    TEXT: 'text',
    TEXTAREA: 'textarea',
    NUMBER: 'number',
    SELECT: 'select',
    BOOLEAN: 'boolean',
    DATE: 'date'
};

function t(key) {
    const dict = i18n[state.language] || i18n.zh;
    return dict[key] !== undefined ? dict[key] : key;
}

function localizeCategoryLabel(category) {
    if (state.language !== 'en') return category;
    return CATEGORY_I18N.en[category] || category;
}

function localizeScene(scene) {
    if (!scene) return scene;
    if (state.language !== 'en') return scene;
    if (scene.isCustom) return scene;
    const m = SCENE_I18N.en[scene.id];
    if (!m) {
        return {
            ...scene,
            categoryLabel: localizeCategoryLabel(scene.category)
        };
    }
    return {
        ...scene,
        name: m.name || scene.name,
        description: m.description || scene.description,
        categoryLabel: localizeCategoryLabel(scene.category),
        fields: (scene.fields || []).map(f => localizeField(scene.id, f))
    };
}

function localizeField(sceneId, field) {
    if (state.language !== 'en') return field;
    const m = SCENE_I18N.en[sceneId]?.fields?.[field.key];
    if (!m) return field;
    return {
        ...field,
        label: m.label || field.label,
        placeholder: m.placeholder !== undefined ? m.placeholder : field.placeholder,
        hint: m.hint !== undefined ? m.hint : field.hint,
        options: Array.isArray(m.options) ? m.options : field.options
    };
}

const TONES = {
    soft: {
        key: 'soft',
        label: '温和',
        promptModifier: '使用温和、礼貌的语气，表达诉求时给对方留有余地，避免咄咄逼人'
    },
    neutral: {
        key: 'neutral',
        label: '中立',
        promptModifier: '使用客观、清晰的语气，事实陈述准确，诉求明确但不过激'
    },
    firm: {
        key: 'firm',
        label: '坚定',
        promptModifier: '使用坚定、有力的语气，立场明确，诉求清晰，不卑不亢但保持礼貌'
    }
};

const TONE_I18N = {
    en: {
        soft: {
            label: 'Soft',
            promptModifier: 'Use a soft and polite tone. Leave room for the other party and avoid sounding aggressive.'
        },
        neutral: {
            label: 'Neutral',
            promptModifier: 'Use a neutral, clear, and professional tone. State facts accurately and keep the request reasonable.'
        },
        firm: {
            label: 'Firm',
            promptModifier: 'Use a firm and confident tone. Be clear about your stance and request while staying polite.'
        }
    }
};

function getToneMeta(toneKey) {
    if (state.language === 'en') {
        return TONE_I18N.en[toneKey] || { label: toneKey, promptModifier: '' };
    }
    return TONES[toneKey] || { label: toneKey, promptModifier: '' };
}

// 内置13个场景模板
const SCENES = [
    // ===== 职场沟通 =====
    {
        id: 'leave_request',
        name: '请假申请',
        category: '职场沟通',
        description: '向上级申请休假，说明时间和原因',
        fields: [
            { key: 'recipient', label: '收件人称呼', placeholder: '如：王经理', type: FIELD_TYPES.TEXT, required: true },
            { key: 'leaveType', label: '请假类型', type: FIELD_TYPES.SELECT, required: true, options: ['事假', '病假', '年假', '调休', '其他'] },
            { key: 'startDate', label: '开始日期', placeholder: '如：2024年1月15日', type: FIELD_TYPES.TEXT, required: true },
            { key: 'endDate', label: '结束日期', placeholder: '如：2024年1月16日', type: FIELD_TYPES.TEXT, required: true },
            { key: 'days', label: '请假天数', placeholder: '如：2天', type: FIELD_TYPES.TEXT, required: true },
            { key: 'reason', label: '请假原因', placeholder: '简要说明原因', type: FIELD_TYPES.TEXTAREA, required: true, hint: '无需过于详细，点到为止即可' },
            { key: 'handover', label: '工作交接安排', placeholder: '如：已交接给小张，紧急事务可电话联系', type: FIELD_TYPES.TEXTAREA, required: false }
        ]
    },
    {
        id: 'urgent_leave',
        name: '紧急请假',
        category: '职场沟通',
        description: '临时突发事件需要请假',
        fields: [
            { key: 'recipient', label: '收件人称呼', placeholder: '如：王经理', type: FIELD_TYPES.TEXT, required: true },
            { key: 'emergencyType', label: '紧急事由', placeholder: '如：家人突发疾病需送医', type: FIELD_TYPES.TEXT, required: true, hint: '简要说明即可，无需详述' },
            { key: 'expectedBack', label: '预计返岗时间', placeholder: '如：明天下午或后天上午', type: FIELD_TYPES.TEXT, required: true },
            { key: 'contact', label: '紧急联系方式', placeholder: '如：手机保持畅通', type: FIELD_TYPES.TEXT, required: false }
        ]
    },
    {
        id: 'overtime_confirm',
        name: '加班调休确认',
        category: '职场沟通',
        description: '确认加班时长和调休安排',
        fields: [
            { key: 'recipient', label: '收件人称呼', type: FIELD_TYPES.TEXT, required: true },
            { key: 'overtimeDate', label: '加班日期', placeholder: '如：1月10日', type: FIELD_TYPES.TEXT, required: true },
            { key: 'overtimeHours', label: '加班时长', placeholder: '如：3小时', type: FIELD_TYPES.TEXT, required: true },
            { key: 'workContent', label: '加班工作内容', placeholder: '简要说明', type: FIELD_TYPES.TEXTAREA, required: true },
            { key: 'restRequest', label: '调休请求', placeholder: '如：希望本周五下午调休', type: FIELD_TYPES.TEXT, required: true }
        ]
    },
    {
        id: 'salary_dispute',
        name: '工资/绩效异议',
        category: '职场沟通',
        description: '对工资或绩效结果提出疑问',
        fields: [
            { key: 'recipient', label: '收件人称呼', type: FIELD_TYPES.TEXT, required: true },
            { key: 'payPeriod', label: '涉及月份/周期', placeholder: '如：2024年1月工资', type: FIELD_TYPES.TEXT, required: true },
            { key: 'issueType', label: '问题类型', type: FIELD_TYPES.SELECT, required: true, options: ['工资数额不符', '绩效评分疑问', '扣款原因不明', '加班费未算', '其他'] },
            { key: 'expectedAmount', label: '预期金额', placeholder: '如：8000元', type: FIELD_TYPES.TEXT, required: false },
            { key: 'actualAmount', label: '实际金额', placeholder: '如：7500元', type: FIELD_TYPES.TEXT, required: false },
            { key: 'evidence', label: '相关依据', placeholder: '如：劳动合同约定/聊天记录/考勤记录', type: FIELD_TYPES.TEXTAREA, required: false, hint: '有证据可简要提及，无证据也可沟通' },
            { key: 'request', label: '具体诉求', placeholder: '如：请核实并补发差额500元', type: FIELD_TYPES.TEXT, required: true }
        ]
    },
    {
        id: 'resignation_confirm',
        name: '离职交接确认',
        category: '职场沟通',
        description: '确认最后工作日和交接安排',
        fields: [
            { key: 'recipient', label: '收件人称呼', type: FIELD_TYPES.TEXT, required: true },
            { key: 'lastDate', label: '最后工作日', placeholder: '如：2024年2月28日', type: FIELD_TYPES.TEXT, required: true },
            { key: 'handoverTo', label: '交接对象', placeholder: '如：接交人：小李', type: FIELD_TYPES.TEXT, required: true },
            { key: 'handoverItems', label: '交接事项', placeholder: '如：项目文件、客户资料、账号权限等', type: FIELD_TYPES.TEXTAREA, required: true },
            { key: 'salarySettle', label: '工资结算询问', placeholder: '如：请问工资和补偿金何时结算？', type: FIELD_TYPES.TEXT, required: false }
        ]
    },
    // ===== 消费平台 =====
    {
        id: 'refund_rejected',
        name: '退款被拒申诉',
        category: '消费平台',
        description: '商品/服务问题申请退款',
        fields: [
            { key: 'platform', label: '平台/商家名称', placeholder: '如：XX电商平台/XX店铺', type: FIELD_TYPES.TEXT, required: true },
            { key: 'orderId', label: '订单号', placeholder: '如：123456789', type: FIELD_TYPES.TEXT, required: true },
            { key: 'productName', label: '商品/服务名称', type: FIELD_TYPES.TEXT, required: true },
            { key: 'amount', label: '订单金额', placeholder: '如：299元', type: FIELD_TYPES.TEXT, required: true },
            { key: 'purchaseDate', label: '购买日期', placeholder: '如：1月5日', type: FIELD_TYPES.TEXT, required: true },
            { key: 'refundReason', label: '退款原因', type: FIELD_TYPES.SELECT, required: true, options: ['未收到货', '货不对板', '质量问题', '与描述不符', '七天无理由', '其他'] },
            { key: 'rejectedReason', label: '平台拒绝理由', placeholder: '如：影响二次销售', type: FIELD_TYPES.TEXT, required: false },
            { key: 'evidence', label: '证据说明', placeholder: '如：有开箱视频/照片为证', type: FIELD_TYPES.TEXTAREA, required: false }
        ]
    },
    {
        id: 'quality_issue',
        name: '货不对板/质量问题',
        category: '消费平台',
        description: '收到商品与描述不符或有质量问题',
        fields: [
            { key: 'platform', label: '平台/商家', type: FIELD_TYPES.TEXT, required: true },
            { key: 'orderId', label: '订单号', type: FIELD_TYPES.TEXT, required: true },
            { key: 'productName', label: '商品名称', type: FIELD_TYPES.TEXT, required: true },
            { key: 'issueDesc', label: '问题描述', placeholder: '如：颜色与图片完全不符/有明显划痕', type: FIELD_TYPES.TEXTAREA, required: true },
            { key: 'photoEvidence', label: '是否有照片/视频证据', type: FIELD_TYPES.BOOLEAN, required: false },
            { key: 'expectedSolution', label: '期望解决方案', type: FIELD_TYPES.SELECT, required: true, options: ['退货退款', '换货', '部分退款补偿', '补发', '其他'] }
        ]
    },
    {
        id: 'auto_renewal',
        name: '自动续费申诉',
        category: '消费平台',
        description: '未收到提醒被自动扣费',
        fields: [
            { key: 'platform', label: '平台/服务名称', placeholder: '如：XX视频会员', type: FIELD_TYPES.TEXT, required: true },
            { key: 'chargeDate', label: '扣费日期', type: FIELD_TYPES.TEXT, required: true },
            { key: 'amount', label: '扣费金额', type: FIELD_TYPES.TEXT, required: true },
            { key: 'notified', label: '是否收到续费提醒', type: FIELD_TYPES.BOOLEAN, required: true },
            { key: 'usageAfterCharge', label: '扣费后是否使用服务', type: FIELD_TYPES.BOOLEAN, required: true },
            { key: 'request', label: '诉求', type: FIELD_TYPES.SELECT, required: true, options: ['全额退款', '按比例退款', '取消自动续费', '其他'] }
        ]
    },
    {
        id: 'food_delivery_issue',
        name: '外卖漏送/食安问题',
        category: '消费平台',
        description: '外卖订单出现问题',
        fields: [
            { key: 'platform', label: '外卖平台', type: FIELD_TYPES.SELECT, required: true, options: ['美团', '饿了么', '其他'] },
            { key: 'orderId', label: '订单号', type: FIELD_TYPES.TEXT, required: true },
            { key: 'issueType', label: '问题类型', type: FIELD_TYPES.SELECT, required: true, options: ['漏送商品', '送错商品', '食品变质', '异物', '严重超时', '其他'] },
            { key: 'issueDesc', label: '问题描述', type: FIELD_TYPES.TEXTAREA, required: true },
            { key: 'hasPhoto', label: '是否有照片证据', type: FIELD_TYPES.BOOLEAN, required: false },
            { key: 'expectedSolution', label: '期望解决', type: FIELD_TYPES.SELECT, required: true, options: ['全额退款', '补送', '部分退款', '优惠券补偿', '其他'] }
        ]
    },
    // ===== 租房物业 =====
    {
        id: 'deposit_refund',
        name: '退押金沟通',
        category: '租房物业',
        description: '租约到期要求退还押金',
        fields: [
            { key: 'landlord', label: '房东/中介称呼', type: FIELD_TYPES.TEXT, required: true },
            { key: 'address', label: '房屋地址', placeholder: '简要提及', type: FIELD_TYPES.TEXT, required: true },
            { key: 'depositAmount', label: '押金金额', type: FIELD_TYPES.TEXT, required: true },
            { key: 'moveOutDate', label: '退租日期', type: FIELD_TYPES.TEXT, required: true },
            { key: 'handoverDone', label: '是否已交接房屋', type: FIELD_TYPES.BOOLEAN, required: true },
            { key: 'condition', label: '房屋状况', placeholder: '如：已打扫干净，无损坏', type: FIELD_TYPES.TEXT, required: false },
            { key: 'deductionDispute', label: '是否有扣款争议', placeholder: '如：房东说墙面有污渍要扣500', type: FIELD_TYPES.TEXTAREA, required: false }
        ]
    },
    {
        id: 'maintenance_delay',
        name: '维修推诿沟通',
        category: '租房物业',
        description: '报修后物业/房东拖延处理',
        fields: [
            { key: 'recipient', label: '收件人', placeholder: '如：物业/房东', type: FIELD_TYPES.TEXT, required: true },
            { key: 'address', label: '房屋地址', type: FIELD_TYPES.TEXT, required: true },
            { key: 'issue', label: '维修问题', placeholder: '如：水管漏水/热水器不工作', type: FIELD_TYPES.TEXT, required: true },
            { key: 'reportDate', label: '首次报修日期', type: FIELD_TYPES.TEXT, required: true },
            { key: 'timesReported', label: '已报修次数', type: FIELD_TYPES.TEXT, required: false },
            { key: 'urgency', label: '紧急程度', type: FIELD_TYPES.SELECT, required: true, options: ['影响正常生活', '有安全隐患', '一般维修', '其他'] },
            { key: 'deadline', label: '期望处理时间', placeholder: '如：48小时内', type: FIELD_TYPES.TEXT, required: true }
        ]
    },
    // ===== 人际金钱 =====
    {
        id: 'loan_reminder',
        name: '借款催还',
        category: '人际金钱',
        description: '提醒朋友/熟人归还借款',
        fields: [
            { key: 'borrower', label: '借款人称呼', type: FIELD_TYPES.TEXT, required: true },
            { key: 'amount', label: '借款金额', type: FIELD_TYPES.TEXT, required: true },
            { key: 'loanDate', label: '借款日期', type: FIELD_TYPES.TEXT, required: true },
            { key: 'promisedDate', label: '约定还款日期', type: FIELD_TYPES.TEXT, required: false },
            { key: 'paymentMethod', label: '支付方式', placeholder: '如：微信/支付宝/银行卡', type: FIELD_TYPES.TEXT, required: false },
            { key: 'ownSituation', label: '自身情况（可选）', placeholder: '如：我最近也需要用钱', type: FIELD_TYPES.TEXTAREA, required: false }
        ]
    },
    {
        id: 'clarification',
        name: '事实说明/误会澄清',
        category: '人际金钱',
        description: '为自己澄清误会或说明事实',
        fields: [
            { key: 'recipient', label: '收件人', type: FIELD_TYPES.TEXT, required: true },
            { key: 'context', label: '事情背景', placeholder: '简要说明发生了什么', type: FIELD_TYPES.TEXTAREA, required: true },
            { key: 'misunderstanding', label: '对方误解的点', placeholder: '如：对方以为是我泄露的消息', type: FIELD_TYPES.TEXTAREA, required: true },
            { key: 'facts', label: '事实说明', placeholder: '客观陈述事实', type: FIELD_TYPES.TEXTAREA, required: true },
            { key: 'evidence', label: '可佐证的事实', placeholder: '如：当时在场的还有XX', type: FIELD_TYPES.TEXTAREA, required: false },
            { key: 'hope', label: '希望对方理解/做什么', placeholder: '如：希望能消除误会', type: FIELD_TYPES.TEXT, required: false }
        ]
    },
    // ===== 日常生活 =====
    {
        id: 'noise_complaint',
        name: '噪音投诉',
        category: '日常生活',
        description: '向邻居或物业投诉噪音问题',
        fields: [
            { key: 'recipient', label: '收件人', placeholder: '如：邻居/物业', type: FIELD_TYPES.TEXT, required: true },
            { key: 'noiseSource', label: '噪音来源', placeholder: '如：楼上装修/夜间音响', type: FIELD_TYPES.TEXT, required: true },
            { key: 'timePeriod', label: '发生时间段', placeholder: '如：每晚10点后/周末早上', type: FIELD_TYPES.TEXT, required: true },
            { key: 'duration', label: '持续时间', placeholder: '如：已持续一周', type: FIELD_TYPES.TEXT, required: false },
            { key: 'impact', label: '造成的影响', placeholder: '如：影响休息/孩子无法学习', type: FIELD_TYPES.TEXTAREA, required: true },
            { key: 'previousContact', label: '是否已沟通过', type: FIELD_TYPES.BOOLEAN, required: false },
            { key: 'request', label: '期望解决', placeholder: '如：请控制音量/调整装修时间', type: FIELD_TYPES.TEXT, required: true }
        ]
    },
    {
        id: 'parking_occupied',
        name: '车位被占沟通',
        category: '日常生活',
        description: '联系占用你车位的人挪车',
        fields: [
            { key: 'location', label: '车位位置', placeholder: '如：地下车库B区128号', type: FIELD_TYPES.TEXT, required: true },
            { key: 'vehicleInfo', label: '占用车信息', placeholder: '如：白色奥迪A4，车牌京A12345', type: FIELD_TYPES.TEXT, required: true },
            { key: 'myVehicle', label: '您的车辆信息', placeholder: '如：黑色特斯拉，车牌京B67890', type: FIELD_TYPES.TEXT, required: false },
            { key: 'urgency', label: '紧急程度', type: FIELD_TYPES.SELECT, required: true, options: ['急需用车', '半小时内需要', '今晚前挪走即可', '其他'] },
            { key: 'contactMethod', label: '联系方式', placeholder: '如：电话/微信/物业转达', type: FIELD_TYPES.TEXT, required: false }
        ]
    },
    {
        id: 'package_issue',
        name: '快递问题投诉',
        category: '日常生活',
        description: '快递延误、丢失、损坏等问题',
        fields: [
            { key: 'courier', label: '快递公司', type: FIELD_TYPES.SELECT, required: true, options: ['顺丰', '中通', '圆通', '韵达', '申通', '京东', '邮政', '其他'] },
            { key: 'trackingNo', label: '快递单号', type: FIELD_TYPES.TEXT, required: true },
            { key: 'issueType', label: '问题类型', type: FIELD_TYPES.SELECT, required: true, options: ['延误超时', '包裹丢失', '包裹损坏', '未经同意放驿站', '虚假签收', '其他'] },
            { key: 'itemDesc', label: '物品描述', placeholder: '如：电子产品/衣物/文件', type: FIELD_TYPES.TEXT, required: true },
            { key: 'itemValue', label: '物品价值', placeholder: '如：500元', type: FIELD_TYPES.TEXT, required: false },
            { key: 'photoEvidence', label: '是否有照片证据', type: FIELD_TYPES.BOOLEAN, required: false },
            { key: 'expectedSolution', label: '期望解决', type: FIELD_TYPES.SELECT, required: true, options: ['尽快派送', '赔偿损失', '查找包裹', '道歉解释', '其他'] }
        ]
    },
    {
        id: 'pet_complaint',
        name: '宠物扰民沟通',
        category: '日常生活',
        description: '邻居宠物噪音或卫生问题',
        fields: [
            { key: 'recipient', label: '收件人', placeholder: '如：邻居/物业', type: FIELD_TYPES.TEXT, required: true },
            { key: 'petType', label: '宠物类型', placeholder: '如：狗/猫', type: FIELD_TYPES.TEXT, required: true },
            { key: 'issueType', label: '问题类型', type: FIELD_TYPES.SELECT, required: true, options: ['夜间吠叫', '随地大小便', '不牵绳吓人', '气味影响', '其他'] },
            { key: 'frequency', label: '发生频率', placeholder: '如：每天/偶尔', type: FIELD_TYPES.TEXT, required: true },
            { key: 'impact', label: '造成的影响', placeholder: '如：影响睡眠/老人受惊', type: FIELD_TYPES.TEXTAREA, required: true },
            { key: 'previousContact', label: '是否已沟通过', type: FIELD_TYPES.BOOLEAN, required: false },
            { key: 'request', label: '期望解决', placeholder: '如：夜间注意控制/及时清理', type: FIELD_TYPES.TEXT, required: true }
        ]
    },
    // ===== 消费维权 =====
    {
        id: 'gym_refund',
        name: '健身房退卡',
        category: '消费维权',
        description: '健身房退卡或转卡申请',
        fields: [
            { key: 'gymName', label: '健身房名称', type: FIELD_TYPES.TEXT, required: true },
            { key: 'contractDate', label: '办卡日期', type: FIELD_TYPES.TEXT, required: true },
            { key: 'cardType', label: '卡种类型', placeholder: '如：年卡/季卡/私教课', type: FIELD_TYPES.TEXT, required: true },
            { key: 'paidAmount', label: '实付金额', type: FIELD_TYPES.TEXT, required: true },
            { key: 'usedTimes', label: '已使用次数/时长', placeholder: '如：去过5次/用了2个月', type: FIELD_TYPES.TEXT, required: false },
            { key: 'refundReason', label: '退卡原因', type: FIELD_TYPES.SELECT, required: true, options: ['搬家/换工作', '服务质量差', '商家违约', '身体原因', '个人原因', '其他'] },
            { key: 'contractTerms', label: '合同条款说明', placeholder: '如：合同写可退/有违约金条款', type: FIELD_TYPES.TEXTAREA, required: false },
            { key: 'expectedRefund', label: '期望退款金额', placeholder: '如：全额/按比例', type: FIELD_TYPES.TEXT, required: true }
        ]
    },
    {
        id: 'beauty_refund',
        name: '美容院/理发店退费',
        category: '消费维权',
        description: '预付卡退款或服务投诉',
        fields: [
            { key: 'shopName', label: '店铺名称', type: FIELD_TYPES.TEXT, required: true },
            { key: 'serviceType', label: '服务类型', placeholder: '如：美容卡/理发卡/项目套餐', type: FIELD_TYPES.TEXT, required: true },
            { key: 'paidAmount', label: '充值金额', type: FIELD_TYPES.TEXT, required: true },
            { key: 'remainingAmount', label: '剩余金额/次数', placeholder: '如：还剩300元/10次', type: FIELD_TYPES.TEXT, required: true },
            { key: 'refundReason', label: '退款原因', type: FIELD_TYPES.SELECT, required: true, options: ['效果不满意', '服务态度差', '强制推销', '店铺搬迁/关闭', '个人原因', '其他'] },
            { key: 'evidence', label: '证据说明', placeholder: '如：有聊天记录/消费凭证', type: FIELD_TYPES.TEXTAREA, required: false },
            { key: 'refusalReason', label: '商家拒绝理由', placeholder: '如：说特价不退/已过期', type: FIELD_TYPES.TEXT, required: false }
        ]
    },
    {
        id: 'driving_school_refund',
        name: '驾校退费',
        category: '消费维权',
        description: '驾校退学或转校申请',
        fields: [
            { key: 'schoolName', label: '驾校名称', type: FIELD_TYPES.TEXT, required: true },
            { key: 'enrollDate', label: '报名日期', type: FIELD_TYPES.TEXT, required: true },
            { key: 'paidAmount', label: '报名费用', type: FIELD_TYPES.TEXT, required: true },
            { key: 'progress', label: '学习进度', type: FIELD_TYPES.SELECT, required: true, options: ['未开始', '科目一', '科目二', '科目三', '已考完'] },
            { key: 'refundReason', label: '退费原因', type: FIELD_TYPES.SELECT, required: true, options: ['教练态度差', '约车困难', '搬家/换城市', '身体原因', '个人原因', '其他'] },
            { key: 'contractTerms', label: '合同约定', placeholder: '如：合同写明了退费标准', type: FIELD_TYPES.TEXTAREA, required: false },
            { key: 'expectedRefund', label: '期望退款', placeholder: '如：按比例退/扣除已考科目', type: FIELD_TYPES.TEXT, required: true }
        ]
    },
    // ===== 教育培训 =====
    {
        id: 'course_refund',
        name: '课程退费申请',
        category: '教育培训',
        description: '培训班/网课退费',
        fields: [
            { key: 'institution', label: '机构名称', type: FIELD_TYPES.TEXT, required: true },
            { key: 'courseName', label: '课程名称', type: FIELD_TYPES.TEXT, required: true },
            { key: 'enrollDate', label: '报名日期', type: FIELD_TYPES.TEXT, required: true },
            { key: 'paidAmount', label: '实付金额', type: FIELD_TYPES.TEXT, required: true },
            { key: 'progress', label: '上课进度', placeholder: '如：上了3节课/未开始', type: FIELD_TYPES.TEXT, required: true },
            { key: 'refundReason', label: '退费原因', type: FIELD_TYPES.SELECT, required: true, options: ['课程内容不符', '师资不符', '时间安排冲突', '个人原因', '机构违约', '其他'] },
            { key: 'refundPolicy', label: '退款政策说明', placeholder: '如：7天无理由/合同约定', type: FIELD_TYPES.TEXTAREA, required: false },
            { key: 'expectedRefund', label: '期望退款', placeholder: '如：全额/按比例', type: FIELD_TYPES.TEXT, required: true }
        ]
    },
    {
        id: 'school_leave',
        name: '学校请假申请',
        category: '教育培训',
        description: '向学校/老师请假',
        fields: [
            { key: 'recipient', label: '收件人', placeholder: '如：班主任/辅导员', type: FIELD_TYPES.TEXT, required: true },
            { key: 'studentName', label: '学生姓名', type: FIELD_TYPES.TEXT, required: true },
            { key: 'classInfo', label: '班级信息', placeholder: '如：高三2班', type: FIELD_TYPES.TEXT, required: true },
            { key: 'leaveType', label: '请假类型', type: FIELD_TYPES.SELECT, required: true, options: ['事假', '病假', '其他'] },
            { key: 'startDate', label: '开始日期', type: FIELD_TYPES.TEXT, required: true },
            { key: 'endDate', label: '结束日期', type: FIELD_TYPES.TEXT, required: true },
            { key: 'reason', label: '请假原因', placeholder: '简要说明', type: FIELD_TYPES.TEXTAREA, required: true },
            { key: 'parentContact', label: '家长联系方式', type: FIELD_TYPES.TEXT, required: true }
        ]
    },
    {
        id: 'tutor_arrange',
        name: '家教/培训沟通',
        category: '教育培训',
        description: '与家教或培训机构协调时间/内容',
        fields: [
            { key: 'recipient', label: '收件人', placeholder: '如：李老师/机构', type: FIELD_TYPES.TEXT, required: true },
            { key: 'studentName', label: '学生姓名', type: FIELD_TYPES.TEXT, required: true },
            { key: 'subject', label: '科目/课程', placeholder: '如：数学/英语口语', type: FIELD_TYPES.TEXT, required: true },
            { key: 'currentSchedule', label: '当前安排', placeholder: '如：每周六上午', type: FIELD_TYPES.TEXT, required: true },
            { key: 'requestType', label: '请求类型', type: FIELD_TYPES.SELECT, required: true, options: ['调整时间', '调整内容', '暂停课程', '更换老师', '其他'] },
            { key: 'newRequest', label: '新的请求', placeholder: '如：改到周日下午/加强写作训练', type: FIELD_TYPES.TEXTAREA, required: true },
            { key: 'reason', label: '原因说明', placeholder: '如：周六有竞赛/写作是弱项', type: FIELD_TYPES.TEXTAREA, required: false }
        ]
    },
    // ===== 医疗健康 =====
    {
        id: 'appointment_change',
        name: '预约改期/取消',
        category: '医疗健康',
        description: '医院/诊所预约改期或取消',
        fields: [
            { key: 'hospital', label: '医院/诊所名称', type: FIELD_TYPES.TEXT, required: true },
            { key: 'department', label: '科室', type: FIELD_TYPES.TEXT, required: true },
            { key: 'doctor', label: '医生姓名', placeholder: '如：王医生（可选）', type: FIELD_TYPES.TEXT, required: false },
            { key: 'originalDate', label: '原预约时间', placeholder: '如：2024年2月15日下午', type: FIELD_TYPES.TEXT, required: true },
            { key: 'changeType', label: '变更类型', type: FIELD_TYPES.SELECT, required: true, options: ['改期', '取消'] },
            { key: 'newDate', label: '期望新时间（改期时）', placeholder: '如：2月20日上午', type: FIELD_TYPES.TEXT, required: false },
            { key: 'reason', label: '变更原因', placeholder: '如：临时出差/症状缓解', type: FIELD_TYPES.TEXTAREA, required: false }
        ]
    },
    {
        id: 'medical_record_inquiry',
        name: '检查报告询问',
        category: '医疗健康',
        description: '向医生咨询检查结果',
        fields: [
            { key: 'hospital', label: '医院名称', type: FIELD_TYPES.TEXT, required: true },
            { key: 'department', label: '科室', type: FIELD_TYPES.TEXT, required: true },
            { key: 'doctor', label: '医生称呼', type: FIELD_TYPES.TEXT, required: true },
            { key: 'examDate', label: '检查日期', type: FIELD_TYPES.TEXT, required: true },
            { key: 'examType', label: '检查项目', placeholder: '如：CT/核磁共振/验血', type: FIELD_TYPES.TEXT, required: true },
            { key: 'concern', label: '关心的问题', placeholder: '如：结节大小/指标异常', type: FIELD_TYPES.TEXTAREA, required: true },
            { key: 'hasReport', label: '是否已取得报告', type: FIELD_TYPES.BOOLEAN, required: true }
        ]
    },
    {
        id: 'referral_request',
        name: '转诊沟通',
        category: '医疗健康',
        description: '请求医生开具转诊单',
        fields: [
            { key: 'hospital', label: '当前医院', type: FIELD_TYPES.TEXT, required: true },
            { key: 'department', label: '当前科室', type: FIELD_TYPES.TEXT, required: true },
            { key: 'doctor', label: '医生称呼', type: FIELD_TYPES.TEXT, required: true },
            { key: 'diagnosis', label: '当前诊断', placeholder: '简要说明病情', type: FIELD_TYPES.TEXTAREA, required: true },
            { key: 'targetHospital', label: '目标医院', placeholder: '如：协和医院/三甲医院', type: FIELD_TYPES.TEXT, required: true },
            { key: 'targetDepartment', label: '目标科室', type: FIELD_TYPES.TEXT, required: true },
            { key: 'reason', label: '转诊原因', placeholder: '如：需要更专业的检查/离家近', type: FIELD_TYPES.TEXTAREA, required: true }
        ]
    },
    // ===== 政务服务 =====
    {
        id: 'complaint_suggestion',
        name: '投诉建议',
        category: '政务服务',
        description: '向政府部门投诉或提建议',
        fields: [
            { key: 'department', label: '受理部门', placeholder: '如：街道办/12345/市场监管局', type: FIELD_TYPES.TEXT, required: true },
            { key: 'subject', label: '投诉/建议主题', type: FIELD_TYPES.TEXT, required: true },
            { key: 'location', label: '涉及地点', placeholder: '如：XX路段/XX小区', type: FIELD_TYPES.TEXT, required: true },
            { key: 'issueDesc', label: '问题描述', placeholder: '详细说明情况', type: FIELD_TYPES.TEXTAREA, required: true },
            { key: 'duration', label: '持续时间', placeholder: '如：已存在一个月', type: FIELD_TYPES.TEXT, required: false },
            { key: 'impact', label: '造成的影响', placeholder: '如：影响出行/安全隐患', type: FIELD_TYPES.TEXTAREA, required: false },
            { key: 'previousReports', label: '是否已反映过', type: FIELD_TYPES.BOOLEAN, required: false },
            { key: 'request', label: '期望处理', placeholder: '如：尽快维修/加强管理', type: FIELD_TYPES.TEXT, required: true }
        ]
    },
    {
        id: 'admin_inquiry',
        name: '办事咨询',
        category: '政务服务',
        description: '咨询办事流程、所需材料',
        fields: [
            { key: 'department', label: '咨询部门', placeholder: '如：户籍科/社保局', type: FIELD_TYPES.TEXT, required: true },
            { key: 'matter', label: '办理事项', placeholder: '如：户口迁移/社保转移', type: FIELD_TYPES.TEXT, required: true },
            { key: 'currentStatus', label: '当前情况', placeholder: '如：刚毕业/刚购房/工作调动', type: FIELD_TYPES.TEXTAREA, required: true },
            { key: 'specificQuestions', label: '具体问题', placeholder: '如：需要什么材料/能否代办', type: FIELD_TYPES.TEXTAREA, required: true },
            { key: 'contact', label: '联系方式', placeholder: '方便回复的电话/邮箱', type: FIELD_TYPES.TEXT, required: false }
        ]
    },
    {
        id: 'document_progress',
        name: '证件办理进度询问',
        category: '政务服务',
        description: '询问证件办理进度',
        fields: [
            { key: 'department', label: '办理部门', type: FIELD_TYPES.TEXT, required: true },
            { key: 'documentType', label: '证件类型', placeholder: '如：护照/身份证/房产证', type: FIELD_TYPES.TEXT, required: true },
            { key: 'applyDate', label: '申请日期', type: FIELD_TYPES.TEXT, required: true },
            { key: 'applicationNo', label: '申请编号', placeholder: '如：有回执单号可填', type: FIELD_TYPES.TEXT, required: false },
            { key: 'promisedDate', label: '承诺办结时间', placeholder: '如：15个工作日', type: FIELD_TYPES.TEXT, required: false },
            { key: 'currentStatus', label: '当前状态', placeholder: '如：已超过承诺时间/查询显示审核中', type: FIELD_TYPES.TEXTAREA, required: true },
            { key: 'urgency', label: '紧急程度', type: FIELD_TYPES.SELECT, required: true, options: ['急需使用', '较着急', '一般咨询'] }
        ]
    }
];

const CATEGORY_I18N = {
    en: {
        '职场沟通': 'Work',
        '消费平台': 'Shopping Platforms',
        '租房物业': 'Housing & Property',
        '人际金钱': 'Relationships & Money',
        '日常生活': 'Daily Life',
        '消费维权': 'Consumer Rights',
        '教育培训': 'Education',
        '医疗健康': 'Healthcare',
        '政务服务': 'Public Services'
    }
};

const SCENE_I18N = {
    en: {
        leave_request: {
            name: 'Leave Request',
            description: 'Request time off and explain dates and reason',
            fields: {
                recipient: { label: 'Recipient', placeholder: 'e.g., Manager Wang' },
                leaveType: { label: 'Leave Type', options: ['Personal', 'Sick', 'Annual', 'Comp Off', 'Other'] },
                startDate: { label: 'Start Date', placeholder: 'e.g., Jan 15, 2024' },
                endDate: { label: 'End Date', placeholder: 'e.g., Jan 16, 2024' },
                days: { label: 'Duration', placeholder: 'e.g., 2 days' },
                reason: { label: 'Reason', placeholder: 'Briefly state the reason', hint: 'Keep it concise—no need for excessive detail.' },
                handover: { label: 'Handover Plan', placeholder: 'e.g., Handed over to Alex; reachable by phone for urgent matters' }
            }
        },
        urgent_leave: {
            name: 'Urgent Leave',
            description: 'Request urgent leave due to an emergency',
            fields: {
                recipient: { label: 'Recipient', placeholder: 'e.g., Manager Wang' },
                emergencyType: { label: 'Emergency', placeholder: 'e.g., Family member needs medical attention', hint: 'Keep it brief; no need to elaborate.' },
                expectedBack: { label: 'Expected Return', placeholder: 'e.g., Tomorrow afternoon / the day after in the morning' },
                contact: { label: 'Contact', placeholder: 'e.g., Phone available for urgent matters' }
            }
        },
        overtime_confirm: {
            name: 'Overtime & Comp Off Confirmation',
            description: 'Confirm overtime hours and comp off arrangement',
            fields: {
                recipient: { label: 'Recipient' },
                overtimeDate: { label: 'Overtime Date', placeholder: 'e.g., Jan 10' },
                overtimeHours: { label: 'Overtime Hours', placeholder: 'e.g., 3 hours' },
                workContent: { label: 'Work Done', placeholder: 'Briefly describe' },
                restRequest: { label: 'Comp Off Request', placeholder: 'e.g., Request comp off on Friday afternoon' }
            }
        },
        salary_dispute: {
            name: 'Salary/Performance Inquiry',
            description: 'Ask about salary or performance evaluation discrepancies',
            fields: {
                recipient: { label: 'Recipient' },
                payPeriod: { label: 'Period', placeholder: 'e.g., Jan 2024 salary' },
                issueType: { label: 'Issue Type', options: ['Salary mismatch', 'Performance rating question', 'Unknown deduction', 'Overtime pay missing', 'Other'] },
                expectedAmount: { label: 'Expected Amount', placeholder: 'e.g., 8,000' },
                actualAmount: { label: 'Actual Amount', placeholder: 'e.g., 7,500' },
                evidence: { label: 'Evidence', placeholder: 'e.g., Contract / chat / attendance records', hint: 'Mention evidence briefly if available.' },
                request: { label: 'Request', placeholder: 'e.g., Please verify and pay the 500 difference' }
            }
        },
        resignation_confirm: {
            name: 'Resignation Handover Confirmation',
            description: 'Confirm last working day and handover arrangement',
            fields: {
                recipient: { label: 'Recipient' },
                lastDate: { label: 'Last Working Day', placeholder: 'e.g., Feb 28, 2024' },
                handoverTo: { label: 'Handover To', placeholder: 'e.g., Alex' },
                handoverItems: { label: 'Handover Items', placeholder: 'e.g., project docs, client info, accounts' },
                salarySettle: { label: 'Salary Settlement', placeholder: 'e.g., When will salary/compensation be settled?' }
            }
        },
        refund_rejected: {
            name: 'Refund Appeal (Rejected)',
            description: 'Appeal after refund request is rejected',
            fields: {
                platform: { label: 'Platform/Merchant', placeholder: 'e.g., XYZ marketplace / Store name' },
                orderId: { label: 'Order ID', placeholder: 'e.g., 123456789' },
                productName: { label: 'Product/Service' },
                amount: { label: 'Amount', placeholder: 'e.g., $29.9' },
                purchaseDate: { label: 'Purchase Date', placeholder: 'e.g., Jan 5' },
                refundReason: { label: 'Refund Reason', options: ['Not received', 'Wrong item', 'Quality issue', 'Not as described', 'No reason (7-day)', 'Other'] },
                rejectedReason: { label: 'Rejection Reason', placeholder: 'e.g., Affects resale' },
                evidence: { label: 'Evidence', placeholder: 'e.g., Unboxing video/photos' }
            }
        },
        quality_issue: {
            name: 'Wrong Item / Quality Issue',
            description: 'Report item not as described or quality problems',
            fields: {
                platform: { label: 'Platform/Merchant' },
                orderId: { label: 'Order ID' },
                productName: { label: 'Product' },
                issue: { label: 'Issue', placeholder: 'Describe the problem' },
                request: { label: 'Request', placeholder: 'e.g., Refund / replacement' },
                evidence: { label: 'Evidence', placeholder: 'e.g., photos/videos' }
            }
        },
        auto_renewal: {
            name: 'Auto-renewal Charge Dispute',
            description: 'Dispute an auto-renewal charge due to lack of notice',
            fields: {
                appName: { label: 'App/Service', placeholder: 'e.g., Video membership' },
                amount: { label: 'Charged Amount', placeholder: 'e.g., $9.99' },
                chargeDate: { label: 'Charge Date' },
                account: { label: 'Account Info', placeholder: 'e.g., phone/email' },
                request: { label: 'Request', placeholder: 'e.g., Cancel and refund' }
            }
        },
        food_delivery_issue: {
            name: 'Food Delivery Issue',
            description: 'Missing items or food safety issue in delivery order',
            fields: {
                platform: { label: 'Platform' },
                orderId: { label: 'Order ID' },
                restaurant: { label: 'Restaurant' },
                issueType: { label: 'Issue Type', options: ['Missing items', 'Food safety', 'Wrong items', 'Quality issue', 'Other'] },
                issueDesc: { label: 'Details', placeholder: 'Describe what happened' },
                request: { label: 'Request', placeholder: 'e.g., Refund / re-delivery' },
                evidence: { label: 'Evidence', placeholder: 'e.g., photos/video' }
            }
        },
        deposit_refund: {
            name: 'Deposit Refund',
            description: 'Request deposit refund after lease ends',
            fields: {
                landlord: { label: 'Landlord/Property', placeholder: 'e.g., Mr. Li / Property office' },
                address: { label: 'Address', placeholder: 'e.g., Unit 2, Building A' },
                moveOutDate: { label: 'Move-out Date' },
                depositAmount: { label: 'Deposit Amount', placeholder: 'e.g., $500' },
                issueDesc: { label: 'Current Status', placeholder: 'e.g., No refund received yet' },
                request: { label: 'Request', placeholder: 'e.g., Please refund by date X' }
            }
        },
        maintenance_delay: {
            name: 'Maintenance Delay Follow-up',
            description: 'Follow up when maintenance is delayed or passed around',
            fields: {
                contact: { label: 'Contact', placeholder: 'e.g., Property office / landlord' },
                issue: { label: 'Issue', placeholder: 'e.g., Water leak / AC broken' },
                reportDate: { label: 'Reported On', placeholder: 'e.g., Apr 12' },
                impact: { label: 'Impact', placeholder: 'e.g., Safety risk / unusable room' },
                request: { label: 'Request', placeholder: 'e.g., Fix ASAP and confirm timeline' }
            }
        },
        loan_reminder: {
            name: 'Loan Repayment Reminder',
            description: 'Remind a friend/acquaintance to repay a loan',
            fields: {
                person: { label: 'Person', placeholder: 'e.g., Name' },
                amount: { label: 'Amount', placeholder: 'e.g., $200' },
                loanDate: { label: 'Loan Date', placeholder: 'e.g., Mar 1' },
                dueDate: { label: 'Due Date', placeholder: 'e.g., Apr 1' },
                context: { label: 'Context', placeholder: 'e.g., What it was for (optional)' },
                request: { label: 'Request', placeholder: 'e.g., Please repay by...' }
            }
        },
        clarification: {
            name: 'Clarification / Resolve Misunderstanding',
            description: 'Clarify facts and resolve a misunderstanding',
            fields: {
                person: { label: 'Person', placeholder: 'e.g., Name' },
                situation: { label: 'Situation', placeholder: 'What happened' },
                yourPoint: { label: 'Your Clarification', placeholder: 'Your perspective / facts' },
                request: { label: 'Request', placeholder: 'e.g., Hope we can communicate calmly' }
            }
        },
        noise_complaint: {
            name: 'Noise Complaint',
            description: 'Complain about noise to neighbor or property management',
            fields: {
                contact: { label: 'Contact', placeholder: 'Neighbor / property office' },
                noiseTime: { label: 'Time', placeholder: 'e.g., after 11pm' },
                noiseType: { label: 'Noise Type', placeholder: 'e.g., loud music / renovation' },
                impact: { label: 'Impact', placeholder: 'e.g., cannot sleep' },
                request: { label: 'Request', placeholder: 'e.g., Please keep it down' }
            }
        },
        parking_occupied: {
            name: 'Parking Spot Occupied',
            description: 'Ask someone to move their car from your spot',
            fields: {
                contact: { label: 'Contact', placeholder: 'e.g., License plate / phone if available' },
                location: { label: 'Location', placeholder: 'e.g., Spot B12' },
                urgency: { label: 'Urgency', options: ['Need it now', 'Soon', 'Not urgent'] },
                request: { label: 'Request', placeholder: 'e.g., Please move the car' }
            }
        },
        package_issue: {
            name: 'Delivery Issue Complaint',
            description: 'Complain about delivery delay/loss/damage',
            fields: {
                courier: { label: 'Courier Company', placeholder: 'e.g., DHL / FedEx' },
                trackingNo: { label: 'Tracking Number' },
                issueType: { label: 'Issue Type', options: ['Delayed', 'Lost', 'Damaged', 'Delivered to wrong address', 'Other'] },
                issueDesc: { label: 'Details', placeholder: 'Describe the issue' },
                request: { label: 'Request', placeholder: 'e.g., Locate package / compensate' }
            }
        },
        pet_complaint: {
            name: 'Pet Disturbance',
            description: 'Communicate about pet noise/hygiene issues',
            fields: {
                contact: { label: 'Contact', placeholder: 'Neighbor / property office' },
                issue: { label: 'Issue', placeholder: 'e.g., barking at night / hygiene' },
                impact: { label: 'Impact', placeholder: 'e.g., disturbed rest' },
                request: { label: 'Request', placeholder: 'e.g., Please take measures' }
            }
        },
        gym_refund: {
            name: 'Gym Membership Refund',
            description: 'Request membership cancellation/refund or transfer',
            fields: {
                gym: { label: 'Gym', placeholder: 'Gym name' },
                cardType: { label: 'Membership Type', placeholder: 'e.g., annual card' },
                purchaseDate: { label: 'Purchase Date' },
                remaining: { label: 'Remaining', placeholder: 'e.g., 8 months' },
                reason: { label: 'Reason', placeholder: 'Brief reason' },
                request: { label: 'Request', placeholder: 'Refund / transfer / terminate' }
            }
        },
        beauty_refund: {
            name: 'Beauty Salon Refund',
            description: 'Request prepaid card refund or complain about service',
            fields: {
                shop: { label: 'Shop', placeholder: 'Salon/barber name' },
                service: { label: 'Service/Package', placeholder: 'e.g., package name' },
                amount: { label: 'Amount', placeholder: 'e.g., $199' },
                issueDesc: { label: 'Issue', placeholder: 'Describe the issue' },
                request: { label: 'Request', placeholder: 'Refund / compensation' }
            }
        },
        driving_school_refund: {
            name: 'Driving School Refund',
            description: 'Request training refund or transfer',
            fields: {
                school: { label: 'School', placeholder: 'Driving school name' },
                course: { label: 'Course', placeholder: 'e.g., C1 package' },
                paid: { label: 'Paid Amount', placeholder: 'e.g., $1200' },
                progress: { label: 'Progress', placeholder: 'e.g., finished theory' },
                reason: { label: 'Reason', placeholder: 'Brief reason' },
                request: { label: 'Request', placeholder: 'Refund / transfer' }
            }
        },
        course_refund: {
            name: 'Course Refund Request',
            description: 'Request refund for training/online course',
            fields: {
                org: { label: 'Organization', placeholder: 'School/platform name' },
                courseName: { label: 'Course Name' },
                amount: { label: 'Amount', placeholder: 'e.g., $99' },
                purchaseDate: { label: 'Purchase Date' },
                reason: { label: 'Reason', placeholder: 'Brief reason' },
                request: { label: 'Request', placeholder: 'Refund / cancel' }
            }
        },
        school_leave: {
            name: 'School Leave Request',
            description: 'Ask teacher/school for leave',
            fields: {
                teacher: { label: 'Teacher', placeholder: 'e.g., Mr./Ms. Smith' },
                student: { label: 'Student', placeholder: 'Student name' },
                date: { label: 'Date', placeholder: 'e.g., Apr 30' },
                reason: { label: 'Reason', placeholder: 'Brief reason' },
                request: { label: 'Request', placeholder: 'Ask for approval' }
            }
        },
        tutor_arrange: {
            name: 'Tutor/Training Coordination',
            description: 'Coordinate schedule/content with tutor or institution',
            fields: {
                contact: { label: 'Contact', placeholder: 'Tutor/institution' },
                topic: { label: 'Topic', placeholder: 'e.g., lesson plan' },
                time: { label: 'Time', placeholder: 'Proposed time' },
                request: { label: 'Request', placeholder: 'What you want to coordinate' }
            }
        },
        appointment_change: {
            name: 'Appointment Change/Cancel',
            description: 'Change or cancel a clinic appointment',
            fields: {
                hospital: { label: 'Hospital/Clinic' },
                department: { label: 'Department' },
                appointmentTime: { label: 'Appointment Time' },
                reason: { label: 'Reason', placeholder: 'Brief reason' },
                request: { label: 'Request', placeholder: 'Change/cancel and next steps' }
            }
        },
        medical_record_inquiry: {
            name: 'Test Report Inquiry',
            description: 'Ask doctor about test results',
            fields: {
                doctor: { label: 'Doctor' },
                patient: { label: 'Patient' },
                testType: { label: 'Test Type', placeholder: 'e.g., blood test / MRI' },
                testDate: { label: 'Test Date' },
                questions: { label: 'Questions', placeholder: 'What you want to know' }
            }
        },
        referral_request: {
            name: 'Referral Request',
            description: 'Request a referral to another hospital/department',
            fields: {
                doctor: { label: 'Doctor' },
                currentHospital: { label: 'Current Hospital' },
                targetHospital: { label: 'Target Hospital', placeholder: 'e.g., General hospital / specialist center' },
                targetDepartment: { label: 'Target Department' },
                reason: { label: 'Reason', placeholder: 'e.g., need specialized exam / closer to home' }
            }
        },
        complaint_suggestion: {
            name: 'Complaint / Suggestion',
            description: 'Submit a complaint or suggestion to a public department',
            fields: {
                department: { label: 'Department', placeholder: 'e.g., 311 / Consumer bureau' },
                subject: { label: 'Subject' },
                location: { label: 'Location', placeholder: 'e.g., Street / neighborhood' },
                issueDesc: { label: 'Description', placeholder: 'Describe the situation' },
                duration: { label: 'Duration', placeholder: 'e.g., for a month' },
                impact: { label: 'Impact', placeholder: 'e.g., safety risk' },
                previousReports: { label: 'Reported Before?' },
                request: { label: 'Expected Action', placeholder: 'e.g., repair ASAP / strengthen management' }
            }
        },
        admin_inquiry: {
            name: 'Administrative Inquiry',
            description: 'Ask about procedure and required documents',
            fields: {
                department: { label: 'Department', placeholder: 'e.g., Registry / Social Security' },
                matter: { label: 'Matter', placeholder: 'e.g., address change / social security transfer' },
                currentStatus: { label: 'Current Situation', placeholder: 'Brief background' },
                specificQuestions: { label: 'Questions', placeholder: 'e.g., required docs / proxy allowed?' },
                contact: { label: 'Contact', placeholder: 'Phone/email for reply' }
            }
        },
        document_progress: {
            name: 'Document Processing Status',
            description: 'Ask about the progress of document processing',
            fields: {
                department: { label: 'Department' },
                documentType: { label: 'Document Type', placeholder: 'e.g., Passport / ID / Title deed' },
                applyDate: { label: 'Application Date' },
                applicationNo: { label: 'Application Number', placeholder: 'Receipt number (optional)' },
                promisedDate: { label: 'Promised Completion', placeholder: 'e.g., 15 business days' },
                currentStatus: { label: 'Current Status', placeholder: 'e.g., overdue / under review' },
                urgency: { label: 'Urgency', options: ['Urgent', 'Soon', 'Just checking'] }
            }
        }
    }
};

// 分类配置
const CATEGORIES = {
    '职场沟通': { color: '#5B8DEF', icon: 'work' },
    '消费平台': { color: '#FF9F43', icon: 'shopping' },
    '租房物业': { color: '#26DE81', icon: 'housing' },
    '人际金钱': { color: '#FD79A8', icon: 'social' },
    '日常生活': { color: '#A29BFE', icon: 'life' },
    '消费维权': { color: '#FD79A8', icon: 'shield' },
    '教育培训': { color: '#00B894', icon: 'education' },
    '医疗健康': { color: '#E17055', icon: 'medical' },
    '政务服务': { color: '#0984E3', icon: 'government' }
};

// ==================== 状态管理 ====================

const state = {
    currentScene: null,
    formValues: {},
    selectedTone: 'neutral',
    toneIntensity: 50, // 0-100, 0: 极温和, 50: 中立, 100: 极坚定
    user: null,  // 当前登录用户 { email, token }
    isSyncing: false,
    batchGenerateEnabled: false,
    generatedVersions: {}, // { standard: text, short: text, formal: text, softened: text }
    currentResultVersion: 'standard',
    isCurrentFavorite: false,
    filterFavoriteOnly: false,
    generatedText: '',
    currentVersion: 'standard',
    history: [],
    theme: 'light', // 'light', 'dark', 'auto'
    language: 'zh', // 'zh', 'en'
    hapticEnabled: true,
    currentPage: 'home',
    pageHistory: ['home'],
    labSlots: [null, null] // 场景实验室的两个插槽
};

const PAGE_LEVELS = {
    'home': 0,
    'history': 0,
    'user': 0,
    'settings': 1,
    'lab': 1,
    'polish': 1,
    'dialogue': 1,
    'input': 1,
    'custom-scene': 1,
    'confirm': 2,
    'result': 3
};

const i18n = {
    zh: {
        settings: '设置',
        settings_title: '系统设置',
        user_center: '用户中心',
        history: '历史记录',
        language: '语言设置',
        language_desc: '切换界面显示语言',
        haptic: '触感反馈',
        haptic_desc: '操作时产生微弱震动',
        clear: '清空',
        data_management: '数据管理',
        export_data: '导出数据',
        export_data_desc: '将历史记录导出为 JSON',
        reset_app: '重置应用',
        reset_app_desc: '清空所有本地存储的数据',
        lab_title: '场景实验室 (二创)',
        lab_welcome: '场景“二创”计划',
        lab_desc: '将两个不同场景的基因杂交，生成更强大的沟通工具。',
        select_scene_1: '选择母本场景',
        select_scene_2: '选择父本场景',
        start_hybrid: '开始杂交二创',
        how_it_works: '如何运作？',
        lab_step_1: '选择两个具有互补性的场景。',
        lab_step_2: '实验室会自动提取它们的字段并进行逻辑融合。',
        lab_step_3: '生成一个具有双重功能的“杂交版”新场景。',
        create_scene: '创建场景模板',
        sync_data: '同步云端数据',
        offline_mode: '您当前处于离线状态，部分功能受限',
        protocol_warning_title: '请使用本地服务器打开',
        protocol_warning_desc: '直接双击打开会导致功能无法使用。',
        protocol_warning_link: '查看解决方法',
        home_welcome_title: '不知道该怎么说？',
        home_welcome_desc: '选择场景，填写信息，生成清晰得体的沟通文本',
        smart_recommend_title: '智能推荐场景',
        smart_recommend_placeholder: '简单描述你的诉求/场景（例如：外卖吃到异物，想跟平台投诉并要求退款）',
        smart_recommend_action: '推荐场景',
        recent_used: '最近使用',
        view_all: '查看全部',
        choose_scene: '选择场景',
        privacy_policy: '隐私政策',
        terms_of_service: '用户协议',
        disclaimer: '免责声明',
        select_placeholder: '请选择...',
        yes: '是',
        no: '否',
        quick_phrases: '快捷短语',
        create_custom_scene: '创建自定义场景',
        create_custom_scene_desc: '根据您的需求创建专属场景模板',
        my_scenes: '我的场景',
        custom_scene_desc: '自定义场景',
        edit: '编辑',
        delete: '删除',
        user_center: '用户中心',
        settings: '设置',
        account: '账户',
        logged_in_as: '登录账号',
        logout: '退出登录',
        clear_all: '清空',
        search_placeholder: '搜索场景或内容...',
        info_missing_title: '以下信息缺失',
        info_missing_desc: '缺失信息将使用【待补充】占位，您可以在生成后补充',
        no_info_filled: '暂无填写信息',
        back_to_edit: '返回补充信息',
        tone_intensity: '调整语气强度',
        batch_compare: '批量生成对比',
        batch_compare_desc: '一次生成多个版本，便于快速选择',
        generate_btn: '生成沟通文本',
        prev_step: '上一步',
        next_step_confirm: '下一步：确认信息',
        generate_result_title: '生成结果',
        useful: '有用',
        not_satisfied: '不满意',
        copy: '复制',
        share: '分享',
        dialogue: '对话',
        standard_ver: '标准版',
        short_ver: '简短版',
        formal_ver: '正式版',
        softened_ver: '降火版',
        tone_label: '语气：',
        soft_label: '温和',
        neutral_label: '中立',
        firm_label: '坚定',
        home_tab: '首页',
        history_tab: '历史',
        polish_tab: '润色',
        user_tab: '我的',
        hybrid_processing: '正在进行场景杂交...',
        from_scene: '来自',
        merged_fields: '融合字段',
        new_field: '新增',
        recommend_match: '推荐',
        // 润色工坊
        polish_workshop: '润色工坊',
        polish_desc: '已有草稿？让 AI 帮你改得更得体',
        polish_title: '让表达更得体',
        polish_subtitle: '粘贴你的草稿，AI 帮你优化语气、结构和用词',
        polish_input_label: '你的原始文本',
        polish_placeholder: '例如：领导，那个项目我搞不定，你找别人吧。',
        start_polish: '开始润色',
        polish_target: '润色目标',
        target_professional: '更专业得体',
        target_softer: '更温和委婉',
        target_firmer: '更坚定有力',
        target_concise: '更简洁直接',
        polish_result: '润色结果',
        save_to_history: '保存到历史',
        polish_history: '润色历史',
        polish_history_empty: '暂无润色记录，开始你的第一次润色吧',
        dialogue_empty_hint: '点击"开始模拟"后，对话会出现在这里',
        clear_all: '清空全部',
        // 版本对比
        version_compare_title: '版本对比',
        close: '关闭',
        regenerate_all: '重新生成全部',
        use_this_version: '使用此版本',
        compare_tip: '同时生成三种语气，选择最适合的版本',
        share_title: '分享',
        share_system: '系统分享',
        share_copy_plain: '复制文本',
        share_copy_rich: '复制含标题',
        share_download: '下载 .txt',
        share_email: '邮件',
        share_wechat_tip: '微信/钉钉等应用：建议先复制，再粘贴发送',
        dialogue_sim: '对话模拟器',
        dialogue_sim_desc: '演练对方可能的回复，准备更稳妥',
        dialogue_your_text: '你的要说的话',
        dialogue_seed_placeholder: '粘贴你准备发送的文本...',
        dialogue_start: '开始模拟',
        dialogue_reply_placeholder: '输入你的回复...\nEnter 发送，Shift+Enter 换行',
        send: '发送',
        more_actions: '更多操作',
        speak: '朗读',
        apply: '保存',
        write_again: '再写一个'
    },
    en: {
        settings: 'Settings',
        settings_title: 'System Settings',
        user_center: 'User Center',
        history: 'History',
        language: 'Language',
        language_desc: 'Change UI language',
        haptic: 'Haptic Feedback',
        haptic_desc: 'Vibrate on certain interactions',
        clear: 'Clear',
        data_management: 'Data Management',
        export_data: 'Export Data',
        export_data_desc: 'Export history to JSON',
        reset_app: 'Reset Application',
        reset_app_desc: 'Clear all locally stored data',
        lab_title: 'Scene Lab (Hybrid)',
        lab_welcome: 'Scene Hybrid Project',
        lab_desc: 'Hybridize two different scenes to create a more powerful tool.',
        select_scene_1: 'Select Primary Scene',
        select_scene_2: 'Select Secondary Scene',
        start_hybrid: 'Start Hybridization',
        how_it_works: 'How it works?',
        lab_step_1: 'Choose two complementary scenes.',
        lab_step_2: 'The lab will extract and merge their fields logically.',
        lab_step_3: 'A new "Hybrid" scene with dual functionality is generated.',
        create_scene: 'Create Scene Template',
        sync_data: 'Sync Cloud Data',
        offline_mode: 'You are offline. Some features may be limited.',
        protocol_warning_title: 'Please open via a local server',
        protocol_warning_desc: 'Opening the file directly may break some features.',
        protocol_warning_link: 'How to fix',
        home_welcome_title: 'Not sure what to say?',
        home_welcome_desc: 'Pick a scene, fill in details, and generate a clear message',
        smart_recommend_title: 'Smart Scene Recommendation',
        smart_recommend_placeholder: 'Briefly describe your situation (e.g., found foreign object in delivery food, want refund and complain)',
        smart_recommend_action: 'Recommend',
        recent_used: 'Recent',
        view_all: 'View All',
        choose_scene: 'Choose a Scene',
        privacy_policy: 'Privacy Policy',
        terms_of_service: 'Terms of Service',
        disclaimer: 'Disclaimer',
        select_placeholder: 'Select...',
        yes: 'Yes',
        no: 'No',
        quick_phrases: 'Quick Phrases',
        create_custom_scene: 'Create Custom Scene',
        create_custom_scene_desc: 'Create a personalized template for your needs',
        my_scenes: 'My Scenes',
        custom_scene_desc: 'Custom scene',
        edit: 'Edit',
        delete: 'Delete',
        user_center: 'User Center',
        settings: 'Settings',
        account: 'Account',
        logged_in_as: 'Logged in as',
        logout: 'Logout',
        clear_all: 'Clear',
        search_placeholder: 'Search scenes or content...',
        info_missing_title: 'Missing Information',
        info_missing_desc: 'Missing info will be replaced with [To be filled]. You can edit it later.',
        no_info_filled: 'No information filled',
        back_to_edit: 'Back to Edit',
        tone_intensity: 'Adjust Tone Intensity',
        batch_compare: 'Batch Generation',
        batch_compare_desc: 'Generate multiple versions at once for comparison',
        generate_btn: 'Generate Message',
        prev_step: 'Previous',
        next_step_confirm: 'Next: Confirm',
        generate_result_title: 'Generated Result',
        useful: 'Helpful',
        not_satisfied: 'Not satisfied',
        copy: 'Copy',
        share: 'Share',
        dialogue: 'Dialogue',
        standard_ver: 'Standard',
        short_ver: 'Short',
        formal_ver: 'Formal',
        softened_ver: 'Soften',
        tone_label: 'Tone: ',
        soft_label: 'Soft',
        neutral_label: 'Neutral',
        firm_label: 'Firm',
        home_tab: 'Home',
        history_tab: 'History',
        polish_tab: 'Polish',
        user_tab: 'Me',
        hybrid_processing: 'Creating hybrid scene...',
        from_scene: 'From',
        merged_fields: 'Merged Fields',
        new_field: 'New',
        recommend_match: 'Match',
        // Polish Workshop
        polish_workshop: 'Polish Workshop',
        polish_desc: 'Have a draft? Let AI make it more appropriate',
        polish_title: 'Make Expression Better',
        polish_subtitle: 'Paste your draft, AI helps optimize tone, structure, and wording',
        polish_input_label: 'Your Original Text',
        polish_placeholder: 'e.g., Boss, I can\'t handle this project, find someone else.',
        start_polish: 'Start Polish',
        polish_target: 'Polish Target',
        target_professional: 'More Professional',
        target_softer: 'Softer & Politer',
        target_firmer: 'Firmer & Stronger',
        target_concise: 'More Concise',
        polish_result: 'Polished Result',
        save_to_history: 'Save to History',
        polish_history: 'Polish History',
        polish_history_empty: 'No polish records yet. Start your first polish!',
        dialogue_empty_hint: 'Click "Start Simulation" to see dialogue here',
        clear_all: 'Clear All',
        // Version Compare
        version_compare_title: 'Version Comparison',
        close: 'Close',
        regenerate_all: 'Regenerate All',
        use_this_version: 'Use This Version',
        compare_tip: 'Generate three tones simultaneously, choose the best fit',
        share_title: 'Share',
        share_system: 'System Share',
        share_copy_plain: 'Copy Text',
        share_copy_rich: 'Copy w/ Title',
        share_download: 'Download .txt',
        share_email: 'Email',
        share_wechat_tip: 'WeChat/DingTalk: copy first, then paste to send',
        dialogue_sim: 'Dialogue Simulator',
        dialogue_sim_desc: 'Practice possible replies from the other side',
        dialogue_your_text: 'What You Want to Say',
        dialogue_seed_placeholder: 'Paste the message you plan to send...',
        dialogue_start: 'Start Simulation',
        dialogue_reply_placeholder: 'Type your reply...\nEnter to send, Shift+Enter for new line',
        send: 'Send',
        more_actions: 'More Actions',
        speak: 'Speak',
        apply: 'Save',
        write_again: 'Write Again'
    }
};

function applyLanguage() {
    const dict = i18n[state.language] || i18n.zh;

    // text nodes
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (!key) return;
        if (dict[key] !== undefined) el.textContent = dict[key];
    });

    // title
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        if (!key) return;
        if (dict[key] !== undefined) el.setAttribute('title', dict[key]);
    });

    // aria-label
    document.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
        const key = el.getAttribute('data-i18n-aria-label');
        if (!key) return;
        if (dict[key] !== undefined) el.setAttribute('aria-label', dict[key]);
    });

    // placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (!key) return;
        if (dict[key] !== undefined) el.setAttribute('placeholder', dict[key]);
    });

    // title (optional)
    document.title = state.language === 'zh' ? 'ClearTalk' : 'ClearTalk';
}

function triggerHaptic(type = 'light') {
    try {
        if (!state.hapticEnabled) return;
        if (!navigator.vibrate) return;
        const pattern = type === 'strong' ? 25 : 12;
        navigator.vibrate(pattern);
    } catch {
        // ignore
    }
}

function changeLanguage(lang) {
    state.language = lang === 'en' ? 'en' : 'zh';
    Storage.saveSetting('language', state.language);
    applyLanguage();
    triggerHaptic();
}

function toggleHaptic(enabled) {
    state.hapticEnabled = !!enabled;
    Storage.saveSetting('hapticEnabled', state.hapticEnabled);
    triggerHaptic(state.hapticEnabled ? 'light' : 'light');
}

// ========== 云同步控制 ==========

function toggleAutoSync(enabled) {
    Storage.saveSetting('autoSync', enabled);
    showToast(enabled ? '已开启自动同步' : '已关闭自动同步');
}

async function manualSync() {
    if (!UserService.isLoggedIn()) {
        showToast('请先登录');
        navigateTo('user');
        return;
    }

    const directions = {
        'merge': { label: '合并云端和本地', handler: () => SyncService.mergeFromCloud() },
        'upload': { label: '上传到云端（覆盖）', handler: () => SyncService.upload() },
        'download': { label: '从云端下载（覆盖本地）', handler: () => SyncService.downloadAndReplace() }
    };

    const currentDirection = Storage.getSetting('syncDirection', 'merge');

    showActionSheet({
        title: '选择同步方式',
        actions: [
            { label: '智能合并（推荐）', value: 'merge', checked: currentDirection === 'merge' },
            { label: '上传到云端', value: 'upload', checked: currentDirection === 'upload' },
            { label: '从云端下载', value: 'download', checked: currentDirection === 'download' }
        ],
        onSelect: async (value) => {
            Storage.saveSetting('syncDirection', value);
            updateSyncDirectionDisplay(value);

            try {
                showToast('正在同步...');
                state.isSyncing = true;

                if (value === 'merge') {
                    const result = await SyncService.mergeFromCloud();
                    showToast(`同步完成：${result.historyCount} 条历史，${result.scenesCount} 个场景`);
                } else if (value === 'upload') {
                    await SyncService.upload();
                    showToast('已上传到云端');
                } else if (value === 'download') {
                    await SyncService.downloadAndReplace();
                    showToast('已从云端下载');
                }

                updateLastSyncTime();
            } catch (err) {
                const isDirectFile = window.location.protocol === 'file:';
                if (isDirectFile) {
                    showToast('请使用服务器打开应用后再使用云同步');
                } else {
                    showToast('同步失败：' + err.message);
                }
            } finally {
                state.isSyncing = false;
            }
        }
    });
}

function syncDirectionSelect() {
    manualSync();
}

function updateSyncDirectionDisplay(direction) {
    const labels = {
        'merge': '合并云端和本地',
        'upload': '上传到云端',
        'download': '从云端下载'
    };
    const el = document.getElementById('sync-direction');
    if (el) el.textContent = labels[direction] || labels['merge'];
}

function updateLastSyncTime() {
    const el = document.getElementById('last-sync-time');
    if (el) {
        const lastSync = Storage.getSetting('lastSyncTime');
        if (lastSync) {
            const date = new Date(lastSync);
            el.textContent = '上次同步：' + date.toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        } else {
            el.textContent = '上次同步：从未';
        }
    }
}

// 通用操作选择弹窗
function showActionSheet({ title, actions, onSelect }) {
    const items = actions.map(a => `
        <button class="action-sheet-item ${a.checked ? 'checked' : ''}" data-value="${a.value}">
            <span>${a.label}</span>
            ${a.checked ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>' : ''}
        </button>
    `).join('');

    const html = `
        <div class="action-sheet-overlay" onclick="closeModal()">
            <div class="action-sheet" onclick="event.stopPropagation()">
                <div class="action-sheet-header">${title}</div>
                <div class="action-sheet-body">${items}</div>
                <div class="action-sheet-footer">
                    <button class="action-sheet-cancel" onclick="closeModal()">取消</button>
                </div>
            </div>
        </div>
    `;

    const modalContainer = document.getElementById('modal-container');
    const modalContent = document.getElementById('modal-content');
    if (modalContainer && modalContent) {
        modalContent.innerHTML = html;
        modalContainer.classList.remove('hidden');

        // 绑定点击事件
        modalContent.querySelectorAll('.action-sheet-item').forEach(btn => {
            btn.addEventListener('click', () => {
                onSelect(btn.dataset.value);
                closeModal();
            });
        });
    }
}

function exportData() {
    try {
        const data = {
            version: 'cleartalk_export_v1',
            exportedAt: new Date().toISOString(),
            history: Storage.load(),
            polishHistory: Storage.loadPolishHistory ? Storage.loadPolishHistory() : [],
            customScenes: Storage.loadCustomScenes(),
            phrases: Storage.loadPhrases(),
            settings: JSON.parse(localStorage.getItem(Storage.SETTINGS_KEY) || '{}')
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cleartalk_export_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast(state.language === 'zh' ? '已导出数据' : 'Exported');
    } catch (err) {
        console.error('exportData failed:', err);
        showToast(state.language === 'zh' ? '导出失败' : 'Export failed');
    }
    triggerHaptic();
}

function confirmResetAll() {
    const ok = confirm(state.language === 'zh'
        ? '确定要重置应用吗？这会清空本地历史、润色历史、自定义场景、短语与设置。'
        : 'Reset app? This will clear local history, polish history, custom scenes, phrases and settings.');
    if (!ok) return;

    try {
        localStorage.removeItem(Storage.KEY);
        if (Storage.POLISH_HISTORY_KEY) localStorage.removeItem(Storage.POLISH_HISTORY_KEY);
        localStorage.removeItem(Storage.CUSTOM_SCENES_KEY);
        localStorage.removeItem(Storage.FEEDBACK_KEY);
        localStorage.removeItem(Storage.USER_KEY);
        localStorage.removeItem(Storage.PHRASES_KEY);
        localStorage.removeItem(Storage.SETTINGS_KEY);
        showToast(state.language === 'zh' ? '已重置' : 'Reset done');
        // 恢复默认状态
        state.user = null;
        state.filterFavoriteOnly = false;
        navigateTo('home');
        renderHome();
    } catch (err) {
        console.error('reset failed:', err);
        showToast(state.language === 'zh' ? '重置失败' : 'Reset failed');
    }
    triggerHaptic('strong');
}

function renderUserPage() {
    const container = document.getElementById('user-content');
    if (!container) return;

    if (!UserService.isLoggedIn()) {
        container.innerHTML = `
            <div class="user-section">
                <h4 data-i18n="login_register">${state.language === 'zh' ? '登录 / 注册' : 'Login / Register'}</h4>
                <div class="form-group">
                    <label data-i18n="email">${state.language === 'zh' ? '邮箱' : 'Email'}</label>
                    <input id="auth-email" type="email" placeholder="email@example.com" />
                </div>
                <div class="form-group">
                    <label data-i18n="password">${state.language === 'zh' ? '密码' : 'Password'}</label>
                    <input id="auth-password" type="password" placeholder="******" />
                </div>
                <div class="bottom-actions dual" style="margin-top: 12px;">
                    <button class="btn-secondary" onclick="handleRegister()" data-i18n="register">${state.language === 'zh' ? '注册' : 'Register'}</button>
                    <button class="btn-primary" onclick="handleLogin()" data-i18n="login">${state.language === 'zh' ? '登录' : 'Login'}</button>
                </div>
            </div>
            <div class="user-section" id="phrases-management-section">
                <h4 data-i18n="quick_phrases">${state.language === 'zh' ? '快捷短语' : 'Quick Phrases'}</h4>
                <div class="setting-item" onclick="showAddPhraseModal()">
                    <div class="setting-info">
                        <span class="setting-name" data-i18n="add_phrase">${state.language === 'zh' ? '添加短语' : 'Add Phrase'}</span>
                        <span class="setting-desc" data-i18n="add_phrase_desc">${state.language === 'zh' ? '常用回复一键插入' : 'Insert common replies quickly'}</span>
                    </div>
                    <svg class="chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
                </div>
            </div>
        `;
        applyLanguage();
        return;
    }

    const email = escapeHtml(state.user?.email || '');
    const phrases = Storage.loadPhrases();
    container.innerHTML = `
        <div class="user-section">
            <h4 data-i18n="account">${state.language === 'zh' ? '账户' : 'Account'}</h4>
            <div class="setting-item">
                <div class="setting-info">
                    <span class="setting-name" data-i18n="logged_in_as">${state.language === 'zh' ? '当前登录' : 'Logged in as'}</span>
                    <span class="setting-desc">${email}</span>
                </div>
                <button class="btn-outline" style="padding: 10px 12px;" onclick="handleLogout()" data-i18n="logout">${state.language === 'zh' ? '退出登录' : 'Logout'}</button>
            </div>
            <div class="setting-item" onclick="navigateTo('settings')">
                <div class="setting-info">
                    <span class="setting-name" data-i18n="settings">${state.language === 'zh' ? '系统设置' : 'Settings'}</span>
                    <span class="setting-desc" data-i18n="settings_desc">${state.language === 'zh' ? '语言、触感、数据管理' : 'Language, haptic, data'}</span>
                </div>
                <svg class="chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
            </div>
        </div>

        <div class="user-section" id="phrases-management-section">
            <div class="section-header">
                <h4 data-i18n="quick_phrases">${state.language === 'zh' ? '快捷短语' : 'Quick Phrases'}</h4>
                <button class="btn-text" onclick="showAddPhraseModal()" data-i18n="add">${state.language === 'zh' ? '添加' : 'Add'}</button>
            </div>
            <div class="polish-history-list">
                ${phrases.map(p => `
                    <div class="polish-history-item">
                        <div class="target-tag">${escapeHtml(state.language === 'en' ? (CATEGORY_I18N.en[p.category] || p.category) : p.category)}</div>
                        <div class="original">${escapeHtml(p.content || '')}</div>
                        <button class="btn-icon delete-btn" onclick="deletePhrase('${p.id}')" style="margin-left:auto;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                            </svg>
                        </button>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    applyLanguage();
}

// 渲染设置页
function renderSettings() {
    // 初始化云同步设置
    const autoSync = Storage.getSetting('autoSync', false);
    const autoSyncToggle = document.getElementById('auto-sync-toggle');
    if (autoSyncToggle) autoSyncToggle.checked = autoSync;

    // 更新同步方向显示
    const syncDirection = Storage.getSetting('syncDirection', 'merge');
    updateSyncDirectionDisplay(syncDirection);

    // 更新上次同步时间
    updateLastSyncTime();

    // 根据登录状态显示/隐藏云同步区域
    const cloudSection = document.getElementById('cloud-sync-section');
    if (cloudSection) {
        cloudSection.style.display = UserService.isLoggedIn() ? 'block' : 'none';
    }

    // 初始化其他设置
    const hapticToggle = document.getElementById('haptic-toggle');
    if (hapticToggle) hapticToggle.checked = state.hapticEnabled;

    const langSelect = document.getElementById('language-select');
    if (langSelect) langSelect.value = state.language;
}

async function handleLogin() {
    const email = document.getElementById('auth-email')?.value?.trim();
    const password = document.getElementById('auth-password')?.value || '';
    if (!email || !password) {
        showToast(state.language === 'zh' ? '请输入邮箱和密码' : 'Please enter email and password');
        return;
    }
    try {
        await UserService.login(email, password);
        showToast(state.language === 'zh' ? '登录成功' : 'Logged in');
        renderUserPage();
    } catch (err) {
        showToast(err?.message || (state.language === 'zh' ? '登录失败' : 'Login failed'));
    }
    triggerHaptic();
}

async function handleRegister() {
    const email = document.getElementById('auth-email')?.value?.trim();
    const password = document.getElementById('auth-password')?.value || '';
    if (!email || !password) {
        showToast(state.language === 'zh' ? '请输入邮箱和密码' : 'Please enter email and password');
        return;
    }
    try {
        await UserService.register(email, password);
        showToast(state.language === 'zh' ? '注册成功' : 'Registered');
        renderUserPage();
    } catch (err) {
        showToast(err?.message || (state.language === 'zh' ? '注册失败' : 'Register failed'));
    }
    triggerHaptic();
}

function handleLogout() {
    UserService.logout();
    showToast(state.language === 'zh' ? '已退出登录' : 'Logged out');
    renderUserPage();
    triggerHaptic();
}

// ==================== 本地存储 ====================

const Storage = {
    KEY: 'cleartalk_history',
    POLISH_HISTORY_KEY: 'cleartalk_polish_history',
    FEEDBACK_KEY: 'cleartalk_feedback',
    CUSTOM_SCENES_KEY: 'cleartalk_custom_scenes',
    USER_KEY: 'cleartalk_user',
    PHRASES_KEY: 'cleartalk_phrases',
    SETTINGS_KEY: 'cleartalk_settings',

    save(record) {
        try {
            const history = this.load();
            const existingIndex = history.findIndex(h => h.id === record.id);
            if (existingIndex >= 0) {
                // 更新现有记录（保留原来的收藏状态，除非 record 中明确指定）
                history[existingIndex] = { ...history[existingIndex], ...record };
            } else {
                history.unshift(record);
            }
            // 只保留最近 100 条
            if (history.length > 100) history.pop();
            localStorage.setItem(this.KEY, JSON.stringify(history));
        } catch (err) {
            console.error('保存历史记录失败:', err);
            // localStorage 可能已满，尝试清理旧数据
            if (err.name === 'QuotaExceededError') {
                try {
                    const history = this.load();
                    // 删除一半的旧数据
                    const reduced = history.slice(0, Math.floor(history.length / 2));
                    localStorage.setItem(this.KEY, JSON.stringify(reduced));
                    showToast('存储空间不足，已清理部分历史记录');
                } catch {
                    showToast('存储空间不足，请手动清理历史记录');
                }
            }
        }
    },

    toggleFavorite(id) {
        try {
            const history = this.load();
            const item = history.find(h => h.id === id);
            if (item) {
                item.isFavorite = !item.isFavorite;
                this.save(item);
                return item.isFavorite;
            }
        } catch (err) {
            console.error('切换收藏失败:', err);
        }
        return false;
    },

    load() {
        try {
            return JSON.parse(localStorage.getItem(this.KEY) || '[]');
        } catch {
            return [];
        }
    },

    savePolishHistory(record) {
        try {
            const history = this.loadPolishHistory();
            history.unshift(record);
            if (history.length > 50) history.pop();
            localStorage.setItem(this.POLISH_HISTORY_KEY, JSON.stringify(history));
            return true;
        } catch (err) {
            console.error('保存润色历史失败:', err);
            return false;
        }
    },

    loadPolishHistory() {
        try {
            return JSON.parse(localStorage.getItem(this.POLISH_HISTORY_KEY) || '[]');
        } catch {
            return [];
        }
    },

    clearPolishHistory() {
        try {
            localStorage.removeItem(this.POLISH_HISTORY_KEY);
            return true;
        } catch (err) {
            console.error('清空润色历史失败:', err);
            return false;
        }
    },

    delete(id) {
        try {
            const history = this.load().filter(h => h.id !== id);
            localStorage.setItem(this.KEY, JSON.stringify(history));
        } catch (err) {
            console.error('删除记录失败:', err);
        }
    },

    clear() {
        try {
            localStorage.removeItem(this.KEY);
        } catch (err) {
            console.error('清理记录失败:', err);
        }
    },

    // 反馈功能
    saveFeedback(feedback) {
        try {
            const feedbacks = this.loadFeedback();
            feedbacks.unshift({
                ...feedback,
                id: Date.now().toString(),
                timestamp: new Date().toISOString()
            });
            // 只保留最近 50 条反馈
            if (feedbacks.length > 50) feedbacks.pop();
            localStorage.setItem(this.FEEDBACK_KEY, JSON.stringify(feedbacks));
        } catch (err) {
            console.error('保存反馈失败:', err);
            // 存储失败不阻止用户操作
        }
    },

    loadFeedback() {
        try {
            return JSON.parse(localStorage.getItem(this.FEEDBACK_KEY) || '[]');
        } catch {
            return [];
        }
    },

    exportFeedback() {
        const feedbacks = this.loadFeedback();
        return JSON.stringify(feedbacks, null, 2);
    },

    // 自定义场景功能
    saveCustomScene(scene) {
        try {
            const scenes = this.loadCustomScenes();
            // 检查是否已存在（编辑模式）
            const existingIndex = scenes.findIndex(s => s.id === scene.id);
            if (existingIndex >= 0) {
                scenes[existingIndex] = scene;
            } else {
                scenes.unshift(scene);
            }
            // 只保留最近 20 个自定义场景
            if (scenes.length > 20) scenes.pop();
            localStorage.setItem(this.CUSTOM_SCENES_KEY, JSON.stringify(scenes));
            return true;
        } catch (err) {
            console.error('保存自定义场景失败:', err);
            return false;
        }
    },

    loadCustomScenes() {
        try {
            return JSON.parse(localStorage.getItem(this.CUSTOM_SCENES_KEY) || '[]');
        } catch {
            return [];
        }
    },

    deleteCustomScene(id) {
        try {
            const scenes = this.loadCustomScenes().filter(s => s.id !== id);
            localStorage.setItem(this.CUSTOM_SCENES_KEY, JSON.stringify(scenes));
            return true;
        } catch (err) {
            console.error('删除自定义场景失败:', err);
            return false;
        }
    },

    // 用户数据存储
    saveUser(user) {
        try {
            localStorage.setItem(this.USER_KEY, JSON.stringify(user));
            return true;
        } catch (err) {
            console.error('保存用户信息失败:', err);
            return false;
        }
    },

    loadUser() {
        try {
            return JSON.parse(localStorage.getItem(this.USER_KEY) || 'null');
        } catch {
            return null;
        }
    },

    clearUser() {
        localStorage.removeItem(this.USER_KEY);
    },

    // 快捷短语管理
    loadPhrases() {
        try {
            const phrases = JSON.parse(localStorage.getItem(this.PHRASES_KEY));
            if (phrases) return phrases;
            
            // 默认短语
            const defaults = [
                { id: '1', content: '辛苦了，非常感谢！', category: '礼貌用语' },
                { id: '2', content: '收到，我稍后详细回复您。', category: '职场' },
                { id: '3', content: '抱歉久等了，关于您提到的...', category: '职场' },
                { id: '4', content: '好的，没问题。', category: '通用' },
                { id: '5', content: '麻烦您确认一下，谢谢。', category: '通用' }
            ];
            this.savePhrases(defaults);
            return defaults;
        } catch {
            return [];
        }
    },

    savePhrases(phrases) {
        localStorage.setItem(this.PHRASES_KEY, JSON.stringify(phrases));
    },

    addPhrase(content, category = '通用') {
        const phrases = this.loadPhrases();
        phrases.unshift({
            id: Date.now().toString(),
            content,
            category
        });
        this.savePhrases(phrases);
    },

    deletePhrase(id) {
        const phrases = this.loadPhrases().filter(p => p.id !== id);
        this.savePhrases(phrases);
    },

    // 设置管理
    SETTINGS_KEY: 'cleartalk_settings',
    
    getSetting(key, defaultValue = null) {
        try {
            const settings = JSON.parse(localStorage.getItem(this.SETTINGS_KEY) || '{}');
            return settings[key] !== undefined ? settings[key] : defaultValue;
        } catch {
            return defaultValue;
        }
    },
    
    saveSetting(key, value) {
        try {
            const settings = JSON.parse(localStorage.getItem(this.SETTINGS_KEY) || '{}');
            settings[key] = value;
            localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
            return true;
        } catch (err) {
            console.error('保存设置失败:', err);
            return false;
        }
    },

    // 主题管理
    saveTheme(theme) {
        localStorage.setItem('cleartalk_theme', theme);
    },

    loadTheme() {
        return localStorage.getItem('cleartalk_theme') || 'light';
    },

    // 收藏夹管理
    toggleFavorite(id) {
        const history = this.load();
        const item = history.find(h => h.id === id);
        if (item) {
            item.isFavorite = !item.isFavorite;
            this.save(item);
            return item.isFavorite;
        }
        return false;
    }
};

// 获取所有场景（内置 + 自定义）
function getAllScenes() {
    const customScenes = Storage.loadCustomScenes().map(s => ({
        ...s,
        isCustom: true
    }));
    return [...SCENES, ...customScenes];
}

// ==================== 自定义场景功能 ====================

// 当前编辑的自定义场景数据
let customSceneDraft = {
    id: null,
    name: '',
    description: '',
    fields: []
};

// 渲染自定义场景表单
function renderCustomSceneForm() {
    const formContainer = document.getElementById('custom-scene-form');
    if (!formContainer) return;

    const isEdit = !!customSceneDraft.id;
    document.getElementById('custom-scene-title').textContent = isEdit ? '编辑场景' : '创建自定义场景';

    formContainer.innerHTML = `
        <div class="form-group">
            <label class="form-label">场景名称</label>
            <input type="text" id="custom-scene-name" class="form-input" 
                placeholder="例如：请假申请、投诉维权..." 
                value="${escapeHtml(customSceneDraft.name)}">
        </div>
        <div class="form-group">
            <label class="form-label">场景描述</label>
            <textarea id="custom-scene-desc" class="form-textarea" rows="2" 
                placeholder="简要描述这个场景的用途...">${escapeHtml(customSceneDraft.description)}</textarea>
        </div>
        <div class="form-group">
            <div class="fields-section-header">
                <label class="form-label">信息字段</label>
                <span class="fields-count">${customSceneDraft.fields.length} 个字段</span>
            </div>
            <div id="custom-fields-list">
                ${customSceneDraft.fields.length === 0 ? 
                    '<div class="empty-hint">点击"添加字段"来定义需要填写的内容</div>' : 
                    customSceneDraft.fields.map((field, index) => `
                        <div class="custom-field-item" data-index="${index}">
                            <button type="button" class="btn-delete" onclick="removeCustomField(${index})">×</button>
                            <div class="field-row">
                                <div class="field-input-wrapper">
                                    <div class="field-label">字段标识</div>
                                    <input type="text" class="form-input field-key" placeholder="例如：qingjiayuanyin" 
                                        value="${escapeHtml(field.key || '')}">
                                </div>
                                <div class="field-input-wrapper">
                                    <div class="field-label">显示名称</div>
                                    <input type="text" class="form-input field-label-input" placeholder="例如：请假原因" 
                                        value="${escapeHtml(field.label || '')}">
                                </div>
                            </div>
                            <div class="field-row">
                                <div class="field-input-wrapper" style="flex: 2;">
                                    <div class="field-label">占位提示</div>
                                    <input type="text" class="form-input field-placeholder" placeholder="例如：请输入请假原因" 
                                        value="${escapeHtml(field.placeholder || '')}">
                                </div>
                            </div>
                        </div>
                    `).join('')
                }
            </div>
            <button type="button" class="btn-secondary btn-add-field" onclick="addCustomField()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 5v14M5 12h14"/>
                </svg>
                添加字段
            </button>
        </div>
    `;
}

// 添加自定义字段
function addCustomField() {
    customSceneDraft.fields.push({
        key: '',
        label: '',
        placeholder: '',
        type: 'text'
    });
    renderCustomSceneForm();
}

// 移除自定义字段
function removeCustomField(index) {
    customSceneDraft.fields.splice(index, 1);
    renderCustomSceneForm();
}

// 保存自定义场景
function saveCustomScene() {
    const name = document.getElementById('custom-scene-name')?.value?.trim();
    const description = document.getElementById('custom-scene-desc')?.value?.trim();

    if (!name) {
        showToast('请输入场景名称');
        return;
    }

    // 收集字段数据
    const fieldItems = document.querySelectorAll('.custom-field-item');
    const fields = [];
    fieldItems.forEach(item => {
        const key = item.querySelector('.field-key')?.value?.trim();
        const label = item.querySelector('.field-label-input')?.value?.trim();
        const placeholder = item.querySelector('.field-placeholder')?.value?.trim();
        if (key && label) {
            fields.push({ key, label, placeholder, type: 'text', required: true });
        }
    });

    if (fields.length === 0) {
        showToast('请至少添加一个字段');
        return;
    }

    const scene = {
        id: customSceneDraft.id || 'custom_' + Date.now(),
        name,
        description,
        category: 'custom',
        fields
    };

    Storage.saveCustomScene(scene);
    showToast(customSceneDraft.id ? '场景已更新' : '场景创建成功');

    // 重置草稿
    customSceneDraft = { id: null, name: '', description: '', fields: [] };
    navigateTo('home');
}

// 取消自定义场景编辑
function cancelCustomScene() {
    customSceneDraft = { id: null, name: '', description: '', fields: [] };
    navigateBack();
}

// AI 服务配置
// 检测运行环境：localhost / file协议 / 生产环境
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const isFileProtocol = window.location.protocol === 'file:';
const API_BASE_URL = isLocalhost || isFileProtocol 
    ? 'http://localhost:3000' 
    : '';  // 生产环境使用相对路径（同域部署）

const AIService = {
    // 非流式生成（备用）
    async generate({ scene, values, tone, tonePrompt, version = 'standard' }) {
        const isEn = state.language === 'en';
        const finalTonePrompt = tonePrompt || getToneMeta(tone).promptModifier || (isEn ? 'Neutral and professional tone' : '中立、专业的语气');
        
        // 强制 AI 使用对应语言的占位符和结构标签
        const langConstraint = isEn 
            ? "IMPORTANT: Output MUST be in English. Use English labels like [Background], [Facts], [Request], [Deadline], [Closing]. Use [To be filled] for missing info."
            : "请使用中文输出。使用【背景】【事实】【诉求】【期限】【结尾】等标签。缺失信息请使用【待补充】占位。";

        const response = await fetch(`${API_BASE_URL}/api/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                scene: {
                    id: scene.id,
                    name: isEn ? (SCENE_I18N.en[scene.id]?.name || scene.name) : scene.name,
                    description: isEn ? (SCENE_I18N.en[scene.id]?.description || scene.description) : scene.description,
                    category: scene.category,
                    fields: scene.fields.map(f => ({
                        key: f.key,
                        label: isEn ? (SCENE_I18N.en[scene.id]?.fields?.[f.key]?.label || f.label) : f.label,
                        value: values[f.key] || (isEn ? '[To be filled]' : '【待补充】'),
                        required: f.required !== false
                    }))
                },
                values,
                tone: tone || state.selectedTone || 'neutral',
                tonePrompt: `${finalTonePrompt}\n${langConstraint}`,
                version,
                language: state.language || 'zh'
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = '生成失败';
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.error || errorMessage;
            } catch {
                errorMessage = errorText || errorMessage;
            }
            throw new Error(errorMessage);
        }
        
        const data = await response.json();
        return data.text;
    },

    async freeform({ prompt, version = 'standard' }) {
        return this.generate({
            scene: { name: '自由输入', fields: [] },
            values: {},
            tonePrompt: prompt,
            version
        });
    },

    // 流式生成（带回调）
    async generateStream({ scene, values, tone, tonePrompt, version = 'standard' }, onChunk) {
        const isEn = state.language === 'en';
        const finalTonePrompt = tonePrompt || getToneMeta(tone).promptModifier || (isEn ? 'Neutral and professional tone' : '中立、专业的语气');
        
        const langConstraint = isEn 
            ? "IMPORTANT: Output MUST be in English. Use English labels like [Background], [Facts], [Request], [Deadline], [Closing]. Use [To be filled] for missing info."
            : "请使用中文输出。使用【背景】【事实】【诉求】【期限】【结尾】等标签。缺失信息请使用【待补充】占位。";

        const response = await fetch(`${API_BASE_URL}/api/generate-stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                scene: {
                    id: scene.id,
                    name: isEn ? (SCENE_I18N.en[scene.id]?.name || scene.name) : scene.name,
                    description: isEn ? (SCENE_I18N.en[scene.id]?.description || scene.description) : scene.description,
                    category: scene.category,
                    fields: scene.fields.map(f => ({
                        key: f.key,
                        label: isEn ? (SCENE_I18N.en[scene.id]?.fields?.[f.key]?.label || f.label) : f.label,
                        value: values[f.key] || (isEn ? '[To be filled]' : '【待补充】'),
                        required: f.required !== false
                    }))
                },
                values,
                tone: tone || state.selectedTone || 'neutral',
                tonePrompt: `${finalTonePrompt}\n${langConstraint}`,
                version,
                language: state.language || 'zh'
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = '生成失败';
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.error || errorMessage;
            } catch {
                errorMessage = errorText || errorMessage;
            }
            throw new Error(errorMessage);
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop(); // 保留不完整的行
            
            for (const line of lines) {
                if (line.trim().startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') {
                        return;
                    }
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.error) {
                            throw new Error(parsed.error);
                        }
                        if (parsed.content) {
                            onChunk(parsed.content);
                        }
                    } catch (e) {
                        if (e.message !== parsed?.error) {
                            console.warn('Parse error:', e);
                        }
                    }
                }
            }
        }
    },
    
    async rewrite({ text, tone }) {
        const response = await fetch(`${API_BASE_URL}/api/rewrite`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text, tone })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = '改写失败';
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.error || errorMessage;
            } catch {
                errorMessage = errorText || errorMessage;
            }
            throw new Error(errorMessage);
        }
        
        const data = await response.json();
        return data.text;
    }
};

// ==================== 用户服务与同步 ====================

const UserService = {
    // 加载本地保存的登录状态
    init() {
        const user = Storage.loadUser();
        if (user) {
            state.user = user;
        }
    },

    // 注册
    async register(email, password) {
        const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || '注册失败');
        }
        
        state.user = { email, token: data.token };
        Storage.saveUser(state.user);
        return data;
    },

    // 登录
    async login(email, password) {
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || '登录失败');
        }
        
        state.user = { email: data.email, token: data.token };
        Storage.saveUser(state.user);
        return data;
    },

    // 登出
    logout() {
        state.user = null;
        Storage.clearUser();
    },

    // 判断是否登录
    isLoggedIn() {
        return !!state.user;
    }
};

const SyncService = {
    // 上传数据到云端
    async upload() {
        if (!state.user) throw new Error('请先登录');
        
        state.isSyncing = true;
        try {
            const history = Storage.load();
            const customScenes = Storage.loadCustomScenes();
            
            const response = await fetch(`${API_BASE_URL}/api/sync/upload`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${state.user.token}`
                },
                body: JSON.stringify({ history, customScenes })
            });
            
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || '同步失败');
            }

            // 记录同步时间
            Storage.saveSetting('lastSyncTime', Date.now());

            return data;
        } finally {
            state.isSyncing = false;
        }
    },

    // 从云端下载数据
    async download() {
        if (!state.user) throw new Error('请先登录');
        
        state.isSyncing = true;
        try {
            const response = await fetch(`${API_BASE_URL}/api/sync/download`, {
                headers: {
                    'Authorization': `Bearer ${state.user.token}`
                }
            });
            
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || '下载失败');
            }
            
            return data;
        } finally {
            state.isSyncing = false;
        }
    },

    // 合并云端数据到本地（保留本地，补充云端）
    async mergeFromCloud() {
        const cloudData = await this.download();
        
        // 合并历史记录（去重，以时间戳为key）
        const localHistory = Storage.load();
        const cloudHistory = cloudData.history || [];
        const historyMap = new Map();
        
        [...localHistory, ...cloudHistory].forEach(item => {
            if (!historyMap.has(item.id) || historyMap.get(item.id).createdAt < item.createdAt) {
                historyMap.set(item.id, item);
            }
        });
        
        const mergedHistory = Array.from(historyMap.values())
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, 100);
        
        // 合并自定义场景（以id为key，云端优先）
        const localScenes = Storage.loadCustomScenes();
        const cloudScenes = cloudData.customScenes || [];
        const sceneMap = new Map();
        
        [...localScenes, ...cloudScenes].forEach(scene => {
            sceneMap.set(scene.id, scene);
        });
        
        const mergedScenes = Array.from(sceneMap.values()).slice(0, 20);
        
        // 保存合并后的数据
        localStorage.setItem(Storage.KEY, JSON.stringify(mergedHistory));
        localStorage.setItem(Storage.CUSTOM_SCENES_KEY, JSON.stringify(mergedScenes));

        // 记录同步时间
        Storage.saveSetting('lastSyncTime', Date.now());

        return {
            historyCount: mergedHistory.length,
            scenesCount: mergedScenes.length,
            lastSync: cloudData.lastSync
        };
    },

    // 从云端下载并完全替换本地数据
    async downloadAndReplace() {
        const cloudData = await this.download();

        const cloudHistory = cloudData.history || [];
        const cloudScenes = cloudData.customScenes || [];

        // 直接替换本地数据
        localStorage.setItem(Storage.KEY, JSON.stringify(cloudHistory));
        localStorage.setItem(Storage.CUSTOM_SCENES_KEY, JSON.stringify(cloudScenes));

        // 记录同步时间
        Storage.saveSetting('lastSyncTime', Date.now());

        return {
            historyCount: cloudHistory.length,
            scenesCount: cloudScenes.length,
            lastSync: cloudData.lastSync
        };
    },

    // 清除云端数据
    async clearCloud() {
        if (!state.user) throw new Error('请先登录');
        
        const response = await fetch(`${API_BASE_URL}/api/sync/clear`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${state.user.token}`
            }
        });
        
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || '清除失败');
        }
        
        return data;
    }
};

// ==================== 场景市场服务 ====================
const SceneMarketService = {
    // 获取热门场景
    async getHotScenes(limit = 20) {
        const response = await fetch(`${API_BASE_URL}/api/market/scenes/hot?limit=${limit}`);
        if (!response.ok) throw new Error('获取热门场景失败');
        return await response.json();
    },

    // 获取最新场景
    async getLatestScenes(limit = 20, offset = 0) {
        const response = await fetch(`${API_BASE_URL}/api/market/scenes/latest?limit=${limit}&offset=${offset}`);
        if (!response.ok) throw new Error('获取最新场景失败');
        return await response.json();
    },

    // 获取我分享的场景
    async getMySharedScenes() {
        if (!state.user) throw new Error('请先登录');
        const response = await fetch(`${API_BASE_URL}/api/market/scenes/my`, {
            headers: { 'Authorization': `Bearer ${state.user.token}` }
        });
        if (!response.ok) throw new Error('获取我的场景失败');
        return await response.json();
    },

    // 分享场景到市场
    async shareScene(scene) {
        if (!state.user) throw new Error('请先登录');
        const response = await fetch(`${API_BASE_URL}/api/market/scenes/share`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.user.token}`
            },
            body: JSON.stringify({
                name: scene.name,
                description: scene.description,
                category: scene.category,
                fields: scene.fields,
                tags: scene.tags || []
            })
        });
        if (!response.ok) throw new Error('分享场景失败');
        return await response.json();
    },

    // 使用市场场景（复制到我的场景）
    async useScene(sceneId) {
        const response = await fetch(`${API_BASE_URL}/api/market/scenes/${sceneId}`);
        if (!response.ok) throw new Error('获取场景详情失败');
        const scene = await response.json();

        // 复制到我的自定义场景
        const myScene = {
            id: 'custom_' + Date.now(),
            name: scene.name,
            description: scene.description,
            category: 'custom',
            fields: scene.fields,
            isFromMarket: true,
            originalId: sceneId
        };

        Storage.saveCustomScene(myScene);
        return myScene;
    },

    // 点赞场景
    async likeScene(sceneId) {
        if (!state.user) throw new Error('请先登录');
        const response = await fetch(`${API_BASE_URL}/api/market/scenes/${sceneId}/like`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${state.user.token}` }
        });
        if (!response.ok) throw new Error('点赞失败');
        return await response.json();
    }
};

// ==================== 智能推荐场景（v2-1） ====================

function normalizeTextForMatch(text) {
    return (text || '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
}

function tokenizeForMatch(text) {
    const t = normalizeTextForMatch(text);
    if (!t) return [];
    // 中英文混合：按常见分隔符切分，同时保留中文连续片段
    return t
        .replace(/[，。！？、；：()（）\[\]{}<>"'“”‘’]/g, ' ')
        .split(/\s+/)
        .filter(Boolean);
}

function computeSceneMatchScore(scene, queryTokens, queryText) {
    let score = 0;
    const reasons = [];

    const name = normalizeTextForMatch(scene.name);
    const desc = normalizeTextForMatch(scene.description);
    const category = normalizeTextForMatch(scene.category);
    const fieldLabels = (scene.fields || [])
        .map(f => normalizeTextForMatch(f.label || ''))
        .filter(Boolean);

    // 1) 场景名/描述/分类直接命中
    for (const token of queryTokens) {
        if (!token) continue;

        if (name.includes(token)) {
            score += 6;
        } else if (desc.includes(token)) {
            score += 3;
        } else if (category.includes(token)) {
            score += 2;
        }

        // 字段标签命中（说明用户描述里出现了字段语义）
        if (fieldLabels.some(l => l.includes(token))) {
            score += 2;
        }
    }

    // 2) 关键主题词加权（面向常见场景）
    const keywordWeights = [
        { k: ['外卖', '退款', '投诉', '商家', '平台', '订单', '差评', '赔偿', '食物', '异物', '发霉', '变质'], w: 6, reason: '包含消费/平台相关关键词' },
        { k: ['租房', '房东', '押金', '物业', '维修', '漏水', '噪音', '退租', '合同'], w: 6, reason: '包含租房/物业相关关键词' },
        { k: ['请假', '加班', '离职', '入职', '领导', '同事', '绩效', '工资', '调薪', '工作'], w: 6, reason: '包含职场沟通相关关键词' },
        { k: ['朋友', '借钱', '还钱', '转账', '欠款', '人情', '关系'], w: 5, reason: '包含人际/金钱相关关键词' },
        { k: ['医院', '医生', '体检', '诊断', '报销', '医保'], w: 5, reason: '包含医疗相关关键词' },
        { k: ['学校', '老师', '家长', '作业', '请假', '转学'], w: 5, reason: '包含教育相关关键词' }
    ];

    const hitReasons = [];
    for (const group of keywordWeights) {
        const hit = group.k.some(kw => queryText.includes(kw));
        if (hit) {
            // 如果场景本身类别/描述也对得上，额外加分
            const related = group.k.some(kw => name.includes(kw) || desc.includes(kw) || category.includes(kw));
            score += related ? group.w : Math.floor(group.w / 2);
            if (related) hitReasons.push(group.reason);
        }
    }

    // 3) 场景字段数量微弱加成（字段越贴近真实填写需求越好）
    score += Math.min((scene.fields || []).length, 6) * 0.2;

    // 生成理由（最多两条）
    if (score > 0) {
        if (queryTokens.some(t => t && (name.includes(t) || desc.includes(t)))) {
            reasons.push('与你的描述高度相关');
        }
        for (const r of hitReasons) {
            if (reasons.length >= 2) break;
            if (!reasons.includes(r)) reasons.push(r);
        }
        if (reasons.length === 0) reasons.push('基于关键词匹配推荐');
    }

    return { score, reasons };
}

function recommendScenesLocal(query, limit = 3) {
    const queryText = normalizeTextForMatch(query);
    const queryTokens = tokenizeForMatch(queryText);
    if (!queryText || queryTokens.length === 0) return [];

    const scenes = getAllScenes().filter(s => !s.isCustom); // 先推荐内置，稳定
    const scored = scenes
        .map(scene => {
            const { score, reasons } = computeSceneMatchScore(scene, queryTokens, queryText);
            return { scene, score, reasons };
        })
        .filter(x => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

    return scored;
}

function renderSmartRecommendResults(results) {
    const box = document.getElementById('smart-recommend-result');
    if (!box) return;

    if (!results || results.length === 0) {
        box.classList.remove('hidden');
        box.innerHTML = `
            <div class="recommend-card">
                <div class="recommend-card-title">
                    <h4>未找到匹配场景</h4>
                    <span class="recommend-score">建议</span>
                </div>
                <div class="recommend-reason">可以尝试补充关键词（例如：平台/外卖/押金/请假/退款），或直接在下方手动选择场景。</div>
            </div>
        `;
        return;
    }

    box.classList.remove('hidden');
    box.innerHTML = results.map((r, idx) => {
        const pct = Math.min(99, Math.max(60, Math.round((r.score / (results[0].score || 1)) * 90)));
        const reason = (r.reasons || []).slice(0, 2).join(' / ');
        return `
            <div class="recommend-card" onclick="applyRecommendedScene('${r.scene.id}')">
                <div class="recommend-card-title">
                    <h4>${idx + 1}. ${r.scene.name}</h4>
                    <span class="recommend-score">匹配度 ${pct}%</span>
                </div>
                <div class="recommend-reason">${reason}</div>
            </div>
        `;
    }).join('');
}

function applyRecommendedScene(sceneId) {
    // 推荐命中后，直接进入该场景
    selectScene(sceneId);
}

let smartRecommendDebounceId = null;

function runSmartRecommend() {
    const input = document.getElementById('smart-recommend-input');
    if (!input) return;

    const query = input.value;
    if (!query || !query.trim()) {
        showToast('请先简单描述你的诉求');
        return;
    }

    // 简单防抖，避免连点
    if (smartRecommendDebounceId) {
        clearTimeout(smartRecommendDebounceId);
    }

    smartRecommendDebounceId = setTimeout(() => {
        const results = recommendScenesLocal(query, 3);
        renderSmartRecommendResults(results);
    }, 120);
}

function clearSmartRecommend() {
    const input = document.getElementById('smart-recommend-input');
    const result = document.getElementById('smart-recommend-result');
    if (input) input.value = '';
    if (result) {
        result.innerHTML = '';
        result.classList.add('hidden');
    }
}

// ==================== 场景市场 UI ====================

let currentMarketTab = 'hot';
let marketScenesCache = { hot: [], latest: [], my: [] };

function renderSceneMarket() {
    loadMarketTab(currentMarketTab);
}

function switchMarketTab(tab) {
    currentMarketTab = tab;

    // 更新标签样式
    document.querySelectorAll('.market-tab').forEach(el => {
        el.classList.toggle('active', el.dataset.tab === tab);
    });

    // 显示对应列表
    document.getElementById('market-hot-list').classList.toggle('hidden', tab !== 'hot');
    document.getElementById('market-latest-list').classList.toggle('hidden', tab !== 'latest');
    document.getElementById('market-my-list').classList.toggle('hidden', tab !== 'my');

    // 加载数据
    loadMarketTab(tab);
}

async function loadMarketTab(tab) {
    const listEl = document.getElementById(`market-${tab}-list`);
    if (!listEl) return;

    // 如果已有缓存数据，直接渲染
    if (marketScenesCache[tab].length > 0) {
        renderMarketList(listEl, marketScenesCache[tab]);
        return;
    }

    listEl.innerHTML = '<div class="market-loading">加载中...</div>';

    try {
        let scenes = [];
        if (tab === 'hot') {
            scenes = await SceneMarketService.getHotScenes();
        } else if (tab === 'latest') {
            scenes = await SceneMarketService.getLatestScenes();
        } else if (tab === 'my') {
            if (!UserService.isLoggedIn()) {
                listEl.innerHTML = '<div class="market-empty">请先登录后查看</div>';
                return;
            }
            scenes = await SceneMarketService.getMySharedScenes();
        }

        marketScenesCache[tab] = scenes;
        renderMarketList(listEl, scenes);
    } catch (err) {
        const isOffline = !navigator.onLine || err.message?.includes('Failed to fetch');
        const isDirectFile = window.location.protocol === 'file:';

        if (isDirectFile) {
            listEl.innerHTML = `
                <div class="market-error">
                    <p>⚠️ 请使用服务器打开应用</p>
                    <p style="font-size: 12px; margin-top: 8px; color: var(--text-tertiary);">
                        直接打开文件无法访问场景市场<br>
                        建议使用 VS Code Live Server
                    </p>
                </div>`;
        } else if (isOffline) {
            listEl.innerHTML = `
                <div class="market-error">
                    <p>📡 网络连接不可用</p>
                    <p style="font-size: 12px; margin-top: 8px; color: var(--text-tertiary);">
                        请检查网络后重试
                    </p>
                </div>`;
        } else {
            listEl.innerHTML = `<div class="market-error">加载失败：${err.message}</div>`;
        }
    }
}

function renderMarketList(container, scenes) {
    if (scenes.length === 0) {
        container.innerHTML = '<div class="market-empty">暂无场景</div>';
        return;
    }

    container.innerHTML = scenes.map(scene => `
        <div class="market-scene-card" data-id="${scene.id}">
            <div class="market-scene-header">
                <div class="market-scene-icon">${scene.category === 'custom' ? '✨' : '📋'}</div>
                <div class="market-scene-info">
                    <div class="market-scene-name">${escapeHtml(scene.name)}</div>
                    <div class="market-scene-desc">${escapeHtml(scene.description || '')}</div>
                </div>
            </div>
            <div class="market-scene-fields">
                ${(scene.fields || []).slice(0, 3).map(f => `<span class="market-field-tag">${escapeHtml(f.label)}</span>`).join('')}
                ${(scene.fields || []).length > 3 ? `<span class="market-field-tag">+${(scene.fields || []).length - 3}</span>` : ''}
            </div>
            <div class="market-scene-stats">
                <div class="market-stat">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                    <span>${scene.likes || 0}</span>
                </div>
                <div class="market-stat">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    <span>${scene.usageCount || 0}</span>
                </div>
            </div>
            <div class="market-scene-actions">
                <button class="market-btn market-btn-like" onclick="likeMarketScene('${scene.id}', this)">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                    点赞
                </button>
                <button class="market-btn market-btn-use" onclick="useMarketScene('${scene.id}')">使用场景</button>
            </div>
        </div>
    `).join('');
}

async function likeMarketScene(sceneId, btn) {
    if (!UserService.isLoggedIn()) {
        showToast('请先登录后点赞');
        navigateTo('user');
        return;
    }

    try {
        await SceneMarketService.likeScene(sceneId);
        showToast('已点赞');
        btn.classList.add('liked');
        // 刷新当前标签
        marketScenesCache[currentMarketTab] = [];
        loadMarketTab(currentMarketTab);
    } catch (err) {
        showToast('点赞失败：' + err.message);
    }
}

async function useMarketScene(sceneId) {
    try {
        const scene = await SceneMarketService.useScene(sceneId);
        showToast(`已添加场景「${scene.name}」到我的场景`);
        navigateTo('home');
    } catch (err) {
        showToast('使用场景失败：' + err.message);
    }
}

function shareCurrentSceneToMarket() {
    // 获取当前自定义场景列表供选择
    const customScenes = Storage.loadCustomScenes();
    if (customScenes.length === 0) {
        showToast('你还没有创建自定义场景');
        return;
    }

    showActionSheet({
        title: '选择要分享的场景',
        actions: customScenes.map(s => ({
            label: s.name,
            value: s.id
        })),
        onSelect: async (sceneId) => {
            const scene = customScenes.find(s => s.id === sceneId);
            if (!scene) return;

            if (!UserService.isLoggedIn()) {
                showToast('请先登录后分享');
                navigateTo('user');
                return;
            }

            try {
                await SceneMarketService.shareScene(scene);
                showToast('场景分享成功！');
                // 刷新我的分享列表
                marketScenesCache.my = [];
                if (currentMarketTab === 'my') {
                    loadMarketTab('my');
                }
            } catch (err) {
                showToast('分享失败：' + err.message);
            }
        }
    });
}

// ==================== UI 渲染 ====================

function renderHome() {
    // 渲染分类和场景
    const container = document.getElementById('scenes-container');
    const allScenes = getAllScenes();
    const categories = [...new Set(allScenes.map(s => s.category))];
    
    // 添加创建场景入口卡片
    let html = `
        <div class="category-section category-create" onclick="navigateTo('custom-scene')">
            <div class="scene-card create-scene-card">
                <div class="scene-icon" style="background: #E8F4FD; color: #5B8DEF">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="5" x2="12" y2="19"/>
                        <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                </div>
                <div class="scene-info">
                    <h4>${escapeHtml(t('create_custom_scene'))}</h4>
                    <p>${escapeHtml(t('create_custom_scene_desc'))}</p>
                </div>
                <svg class="scene-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 18l6-6-6-6"/>
                </svg>
            </div>
        </div>
    `;
    
    // 渲染自定义场景分类（如果有）
    const customScenes = Storage.loadCustomScenes();
    if (customScenes.length > 0) {
        html += `
            <div class="category-section category-custom">
                <div class="category-header">
                    <div class="category-bar" style="background: #10B981;"></div>
                    <span class="category-name">${escapeHtml(t('my_scenes'))}</span>
                    <span class="category-count">${customScenes.length}</span>
                </div>
                ${customScenes.map(scene => `
                    <div class="scene-card custom-scene-card" data-id="${scene.id}">
                        <div class="scene-icon" style="background: #D1FAE515; color: #10B981">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                        </div>
                        <div class="scene-info" onclick="selectScene('${scene.id}')">
                            <h4>${escapeHtml(scene.name)}</h4>
                            <p>${escapeHtml(scene.description || t('custom_scene_desc'))}</p>
                        </div>
                        <div class="scene-actions">
                            <button class="btn-icon-small" onclick="event.stopPropagation(); editCustomScene('${scene.id}')" title="${escapeHtml(t('edit'))}">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                </svg>
                            </button>
                            <button class="btn-icon-small delete" onclick="event.stopPropagation(); deleteCustomSceneConfirm('${scene.id}')" title="${escapeHtml(t('delete'))}">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    // 渲染内置场景分类
    html += categories.map(category => {
        const scenes = allScenes.filter(s => s.category === category && !s.isCustom);
        if (scenes.length === 0) return '';
        
        const catConfig = CATEGORIES[category];
        const categoryLabel = escapeHtml(localizeCategoryLabel(category));
        
        return `
            <div class="category-section category-${catConfig.icon}">
                <div class="category-header">
                    <div class="category-bar"></div>
                    <span class="category-name">${categoryLabel}</span>
                </div>
                ${scenes.map(scene => `
                    ${(() => { const s = localizeScene(scene); return `
                    <div class="scene-card" onclick="selectScene('${scene.id}')">
                        <div class="scene-icon" style="background: ${catConfig.color}15; color: ${catConfig.color}">
                            ${getIconSvg(catConfig.icon)}
                        </div>
                        <div class="scene-info">
                            <h4>${escapeHtml(s.name)}</h4>
                            <p>${escapeHtml(s.description)}</p>
                        </div>
                        <svg class="scene-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9 18l6-6-6-6"/>
                        </svg>
                    </div>
                    `; })()}
                `).join('')}
            </div>
        `;
    }).join('');
    
    container.innerHTML = html;
    
    // 渲染最近使用
    renderRecent();
}

function renderRecent() {
    const recent = Storage.load().slice(0, 3);
    const section = document.getElementById('recent-section');
    const list = document.getElementById('recent-list');
    
    if (recent.length === 0) {
        section.classList.add('hidden');
        return;
    }
    
    section.classList.remove('hidden');
    list.innerHTML = recent.map(record => {
        const catConfig = CATEGORIES[record.category] || { color: '#999' };
        const categoryLabel = escapeHtml(localizeCategoryLabel(record.category));
        const sceneLabel = escapeHtml(state.language === 'en'
            ? (SCENE_I18N.en[record.sceneId]?.name || record.sceneName)
            : record.sceneName);
        return `
            <div class="recent-card" onclick="viewHistoryRecord('${record.id}')">
                <span class="category-tag" style="background: ${catConfig.color}20; color: ${catConfig.color}">
                    ${categoryLabel}
                </span>
                <div class="scene-name">${sceneLabel}</div>
                <div class="time">${formatTime(record.createdAt)}</div>
            </div>
        `;
    }).join('');
}

function renderForm() {
    const scene = localizeScene(state.currentScene);
    if (!scene) return;
    
    const inputTitleEl = document.getElementById('input-title');
    const sceneDescEl = document.getElementById('scene-description');
    if (inputTitleEl) inputTitleEl.textContent = scene.name;
    if (sceneDescEl) sceneDescEl.textContent = scene.description;
    
    const container = document.getElementById('form-container');
    if (!container) return;
    container.innerHTML = scene.fields.map(field => {
        const savedValue = state.formValues[field.key] || '';
        const isTextField = field.type === FIELD_TYPES.TEXT || field.type === FIELD_TYPES.TEXTAREA;
        
        let inputHtml = '';
        if (field.type === FIELD_TYPES.SELECT) {
            inputHtml = `
                <select onchange="updateField('${field.key}', this.value)">
                    <option value="">${escapeHtml(t('select_placeholder'))}</option>
                    ${field.options.map(opt => `<option value="${opt}" ${savedValue === opt ? 'selected' : ''}>${opt}</option>`).join('')}
                </select>
            `;
        } else if (field.type === FIELD_TYPES.TEXTAREA) {
            inputHtml = `<textarea id="field-${field.key}" placeholder="${field.placeholder || ''}" oninput="updateField('${field.key}', this.value)">${savedValue}</textarea>`;
        } else if (field.type === FIELD_TYPES.BOOLEAN) {
            inputHtml = `
                <select onchange="updateField('${field.key}', this.value)">
                    <option value="true" ${savedValue === 'true' ? 'selected' : ''}>${escapeHtml(t('yes'))}</option>
                    <option value="false" ${savedValue === 'false' ? 'selected' : ''}>${escapeHtml(t('no'))}</option>
                </select>
            `;
        } else {
            inputHtml = `<input id="field-${field.key}" type="${field.type}" value="${savedValue}" placeholder="${field.placeholder || ''}" oninput="updateField('${field.key}', this.value)">`;
        }
        
        return `
            <div class="form-field">
                <div class="field-header">
                    <label>${field.label}${field.required ? '<span class="required">*</span>' : ''}</label>
                    ${isTextField ? `
                        <button class="btn-phrase-trigger" onclick="openPhraseSelector('${field.key}')">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
                            </svg>
                            ${escapeHtml(t('quick_phrases'))}
                        </button>
                    ` : ''}
                </div>
                ${inputHtml}
                ${field.hint ? `<p class="hint">${field.hint}</p>` : ''}
            </div>
        `;
    }).join('');
}

function openPhraseSelector(fieldKey) {
    const phrases = Storage.loadPhrases();
    const modalContainer = document.getElementById('modal-container');
    const modalContent = document.getElementById('modal-content');
    const template = document.getElementById('tpl-phrase-selector');
    
    modalContent.innerHTML = template.innerHTML;
    const listContainer = document.getElementById('modal-phrase-list');
    
    listContainer.innerHTML = phrases.map(p => `
        <div class="phrase-item" onclick="insertPhrase('${fieldKey}', '${p.content.replace(/'/g, "\\'")}')">
            <span class="phrase-cat">${p.category}</span>
            <div class="phrase-content">${p.content}</div>
        </div>
    `).join('');
    
    modalContainer.classList.remove('hidden');
}

function openResultMoreActions() {
    const modalContainer = document.getElementById('modal-container');
    const modalContent = document.getElementById('modal-content');
    const template = document.getElementById('tpl-result-more');

    if (!template) {
        showToast(state.language === 'zh' ? '面板未加载' : 'Panel not loaded');
        return;
    }

    modalContent.innerHTML = template.innerHTML;
    modalContainer.classList.remove('hidden');
    applyLanguage();
}

function insertPhrase(fieldKey, content) {
    const input = document.getElementById(`field-${fieldKey}`);
    if (input) {
        const start = input.selectionStart;
        const end = input.selectionEnd;
        const text = input.value;
        const before = text.substring(0, start);
        const after = text.substring(end);
        
        input.value = before + content + after;
        state.formValues[fieldKey] = input.value;
        
        // 触发 input 事件以确保任何监听器（如重置高度）都能运行
        input.dispatchEvent(new Event('input'));
        
        // 设置光标位置到插入内容之后
        const newPos = start + content.length;
        input.setSelectionRange(newPos, newPos);
        input.focus();
    }
    closeModal();
}

function closeModal() {
    document.getElementById('modal-container').classList.add('hidden');
}

function navigateToPhrasesManagement() {
    closeModal();
    navigateTo('user');
    // 渲染用户中心并滚动到短语管理部分（稍后实现）
    setTimeout(() => {
        const el = document.getElementById('phrases-management-section');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 100);
}

function renderConfirm() {
    console.log('[renderConfirm] called, currentScene:', state.currentScene, 'formValues:', state.formValues);
    
    const scene = localizeScene(state.currentScene);
    const values = state.formValues;
    
    console.log('[renderConfirm] scene:', scene, 'values:', values);
    
    const confirmSceneNameEl = document.getElementById('confirm-scene-name');
    if (confirmSceneNameEl && scene) confirmSceneNameEl.textContent = scene.name;
    
    // 渲染已填信息
    const summaryDiv = document.getElementById('info-summary') || document.getElementById('info-empty');
    const filledFields = scene.fields.filter(f => {
        const v = values[f.key];
        return v !== undefined && v !== null && v.toString().trim() !== '';
    });
    
    console.log('[renderConfirm] summaryDiv:', summaryDiv, 'filledFields:', filledFields.length, 'scene.fields:', scene.fields.length);
    
    if (summaryDiv) {
        console.log('[renderConfirm] updating summaryDiv innerHTML, filledFields:', filledFields.length);
        if (filledFields.length > 0) {
            summaryDiv.innerHTML = `
                <h4>${state.language === 'zh' ? '已确认信息' : 'Confirmed Information'}</h4>
                ${filledFields.map(field => {
                    let displayValue = values[field.key];
                    if (field.type === FIELD_TYPES.BOOLEAN) {
                        displayValue = displayValue === 'true' || displayValue === true 
                            ? (state.language === 'zh' ? '是' : 'Yes') 
                            : (state.language === 'zh' ? '否' : 'No');
                    }
                    return `
                        <div class="info-row">
                            <span class="label">${field.label}</span>
                            <span class="value">${displayValue}</span>
                        </div>
                    `;
                }).join('')}
            `;
        } else {
            summaryDiv.innerHTML = `<p style="color: #999;">${state.language === 'zh' ? '暂无填写信息' : 'No information filled'}</p>`;
        }
    }
    
    // 检查缺失字段
    const missingFields = scene.fields.filter(f => {
        if (!f.required) return false;
        const v = values[f.key];
        return !v || v.toString().trim() === '';
    });
    
    const warningDiv = document.getElementById('missing-warning') || document.getElementById('missing-alert');
    const missingListEl = document.getElementById('missing-list') || document.getElementById('missing-fields-list');
    if (missingFields.length > 0) {
        if (warningDiv) warningDiv.classList.remove('hidden');
        if (missingListEl) {
            missingListEl.innerHTML = missingFields.map(f => 
                `<li>${f.label}${f.hint ? ` (${f.hint})` : ''}</li>`
            ).join('');
        }
    } else {
        if (warningDiv) warningDiv.classList.add('hidden');
    }
    
    // 渲染语气选择
    updateToneSelection();

    // 批量生成开关同步
    const toggle = document.getElementById('batch-toggle') || document.getElementById('batch-generate-toggle');
    if (toggle) {
        toggle.checked = !!state.batchGenerateEnabled;
    }
}

function renderResult() {
    const resultTextEl = document.getElementById('result-text');
    if (resultTextEl) resultTextEl.textContent = state.generatedText;
    
    // 更新收藏按钮状态
    const favoriteBtn = document.getElementById('result-favorite-btn');
    if (favoriteBtn) {
        if (state.isCurrentFavorite) {
            favoriteBtn.classList.add('active');
        } else {
            favoriteBtn.classList.remove('active');
        }
    }

    // 重置反馈区域
    resetFeedbackUI();
}

function closeResult() {
    navigateBack();
}

function goHome() {
    // 重置当前场景和表单数据
    state.currentScene = null;
    state.formValues = {};
    state.generatedText = '';
    state.isCurrentFavorite = false;

    // 清除结果页状态
    const resultContent = document.getElementById('result-content');
    if (resultContent) resultContent.innerHTML = '';

    const favoriteBtn = document.getElementById('result-favorite-btn');
    if (favoriteBtn) favoriteBtn.classList.remove('active');

    // 导航到首页
    navigateTo('home');
    renderHome();
}

function toggleCurrentFavorite() {
    state.isCurrentFavorite = !state.isCurrentFavorite;
    const favoriteBtn = document.getElementById('result-favorite-btn');
    
    if (favoriteBtn) {
        if (state.isCurrentFavorite) {
            favoriteBtn.classList.add('active');
        } else {
            favoriteBtn.classList.remove('active');
        }
    }
    showToast(state.language === 'zh' ? '已加入收藏' : 'Added to favorites');

    // 如果当前已有生成记录的ID，同步更新存储中的状态
    if (state.currentResultId) {
        Storage.toggleFavorite(state.currentResultId);
    }
}

function toggleFavoriteFilter() {
    state.filterFavoriteOnly = !state.filterFavoriteOnly;
    const filterBtn = document.getElementById('filter-favorite-btn');
    
    if (state.filterFavoriteOnly) {
        filterBtn.classList.add('active');
    } else {
        filterBtn.classList.remove('active');
    }
    
    renderHistory();
}

function toggleItemFavorite(e, id) {
    e.stopPropagation();
    const isFavorite = Storage.toggleFavorite(id);
    renderHistory();
    showToast(isFavorite ? (state.language === 'zh' ? '已收藏' : 'Saved') : (state.language === 'zh' ? '已取消收藏' : 'Removed'));
}

// 查看历史记录详情
function viewHistoryItem(id) {
    const history = Storage.load();
    const item = history.find(h => h.id === id);
    if (!item) {
        showToast('记录不存在');
        return;
    }

    // 恢复状态
    state.currentScene = getAllScenes().find(s => s.id === item.sceneId) || { id: item.sceneId, name: item.sceneName, category: item.category };
    state.formValues = item.inputValues || {};
    state.generatedText = item.generatedText;
    state.selectedTone = item.tone || 'neutral';
    state.isCurrentFavorite = item.isFavorite || false;

    // 渲染结果页
    renderResult();
    navigateTo('result');
}

// 删除历史记录
function deleteHistoryItem(e, id) {
    e.stopPropagation();
    if (!confirm(state.language === 'zh' ? '确定要删除这条记录吗？' : 'Delete this record?')) return;

    const history = Storage.load().filter(h => h.id !== id);
    localStorage.setItem(Storage.HISTORY_KEY, JSON.stringify(history));
    renderHistory();
    showToast(state.language === 'zh' ? '已删除' : 'Deleted');
}

function toggleBatchGenerate(checkbox) {
    state.batchGenerateEnabled = !!checkbox.checked;
    showToast(state.batchGenerateEnabled
        ? (state.language === 'zh' ? '已开启批量生成对比' : 'Batch generation enabled')
        : (state.language === 'zh' ? '已关闭批量生成对比' : 'Batch generation disabled'));
}

// HTML中调用的别名函数
function toggleBatchMode() {
    const checkbox = document.getElementById('batch-toggle');
    toggleBatchGenerate(checkbox);
}

function setResultVersion(version) {
    state.currentResultVersion = version;
    state.currentVersion = version;

    const versionLabels = {
        'standard': t('standard_ver'),
        'short': t('short_ver'),
        'formal': t('formal_ver'),
        'softened': t('softened_ver')
    };

    // 更新 chip 样式
    document.querySelectorAll('.version-chips .chip').forEach(el => {
        el.classList.remove('active');
        if (el.textContent.trim() === versionLabels[version]) {
            el.classList.add('active');
        }
    });

    // 如果缓存已有该版本，直接切换
    const cached = state.generatedVersions?.[version];
    if (cached) {
        state.generatedText = cached;
        renderResult();
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('skeleton')?.classList.add('hidden');
        document.getElementById('result-text').classList.remove('hidden');
        return;
    }

    // 否则触发生成
    regenerate(version);
}

function applyCurrentVersionToHistory() {
    const v = state.currentResultVersion || 'standard';
    const text = state.generatedVersions?.[v] || state.generatedText;
    if (!text) {
        showToast(state.language === 'zh' ? '暂无可保存的内容' : 'Nothing to save');
        return;
    }

    // 历史记录保存使用“基础中文字段”（稳定），展示时再按语言本地化
    const baseScene = getAllScenes().find(s => s.id === state.currentScene?.id) || state.currentScene;

    Storage.save({
        id: Date.now().toString(),
        sceneId: baseScene?.id || state.currentScene?.id,
        sceneName: baseScene?.name || state.currentScene?.name,
        category: baseScene?.category || state.currentScene?.category,
        inputValues: { ...state.formValues },
        generatedText: text,
        tone: state.selectedTone,
        createdAt: Date.now(),
        version: v
    });

    showToast(state.language === 'zh' ? '已保存当前版本到历史记录' : 'Saved to history');

    if (UserService.isLoggedIn() && Storage.getSetting('autoSync', false)) {
        SyncService.upload().catch(() => {});
    }
}

// ==================== 反馈功能 ====================

function resetFeedbackUI() {
    const section = document.getElementById('feedback-section');
    const form = document.getElementById('feedback-form');
    const thanks = document.getElementById('feedback-thanks') || document.getElementById('feedback-success');
    const comment = document.getElementById('feedback-comment') || document.getElementById('feedback-more');

    if (section) section.classList.remove('hidden');
    if (form) form.classList.add('hidden');
    if (thanks) thanks.classList.add('hidden');

    // 清除之前的输入
    document.querySelectorAll('.feedback-checkbox input').forEach(cb => cb.checked = false);
    if (comment) comment.value = '';
}

function showFeedbackForm() {
    const section = document.getElementById('feedback-section');
    const form = document.getElementById('feedback-form');
    if (section) section.classList.add('hidden');
    if (form) form.classList.remove('hidden');
}

function hideFeedbackForm() {
    const section = document.getElementById('feedback-section');
    const form = document.getElementById('feedback-form');
    if (form) form.classList.add('hidden');
    if (section) section.classList.remove('hidden');
}

function submitFeedback(type) {
    const feedback = {
        type: type,
        sceneId: state.currentScene?.id,
        sceneName: state.currentScene?.name,
        category: state.currentScene?.category,
        tone: state.selectedTone,
        version: state.currentVersion,
        generatedText: state.generatedText.substring(0, 500), // 只保存前500字
        formValues: state.formValues
    };

    Storage.saveFeedback(feedback);

    // 显示感谢
    const section = document.getElementById('feedback-section');
    const thanks = document.getElementById('feedback-thanks') || document.getElementById('feedback-success');
    if (section) section.classList.add('hidden');
    if (thanks) thanks.classList.remove('hidden');

    showToast(type === 'helpful' ? '感谢您的认可！' : '感谢您的反馈，我们会持续改进');
}

function submitFeedbackForm() {
    submitDetailedFeedback();
}

function submitDetailedFeedback() {
    const reasons = [];
    document.querySelectorAll('.feedback-checkbox input:checked').forEach(cb => {
        reasons.push(cb.value);
    });

    const commentEl = document.getElementById('feedback-comment') || document.getElementById('feedback-more');
    const comment = commentEl ? commentEl.value.trim() : '';

    if (reasons.length === 0 && !comment) {
        showToast(state.language === 'zh' ? '请至少选择一个问题类型或填写建议' : 'Please select at least one issue or add a comment');
        return;
    }

    const feedback = {
        type: 'not_helpful',
        reasons: reasons,
        comment: comment,
        sceneId: state.currentScene?.id,
        sceneName: state.currentScene?.name,
        category: state.currentScene?.category,
        tone: state.selectedTone,
        version: state.currentVersion,
        generatedText: state.generatedText.substring(0, 500),
        formValues: state.formValues
    };

    Storage.saveFeedback(feedback);

    // 显示感谢
    document.getElementById('feedback-form').classList.add('hidden');
    document.getElementById('feedback-thanks').classList.remove('hidden');

    showToast('感谢您的详细反馈！我们会认真改进');
}

function renderHistory() {
    let history = Storage.load();
    const list = document.getElementById('history-list');
    const empty = document.getElementById('history-empty');
    
    // 搜索过滤
    const searchQuery = document.getElementById('search-input').value.toLowerCase();
    if (searchQuery) {
        history = history.filter(item => 
            (item.sceneName || '').toLowerCase().includes(searchQuery) ||
            (state.language === 'en' ? (SCENE_I18N.en[item.sceneId]?.name || '').toLowerCase().includes(searchQuery) : false) ||
            item.generatedText.toLowerCase().includes(searchQuery)
        );
    }

    // 收藏过滤
    if (state.filterFavoriteOnly) {
        history = history.filter(item => item.isFavorite);
    }
    
    if (history.length === 0) {
        list.innerHTML = '';
        empty.classList.remove('hidden');
        empty.querySelector('span').textContent = (searchQuery || state.filterFavoriteOnly)
            ? (state.language === 'zh' ? '未找到相关记录' : 'No matching records')
            : (state.language === 'zh' ? '生成的沟通文本会保存在这里' : 'Your generated messages will appear here');
        return;
    }
    
    empty.classList.add('hidden');
    list.innerHTML = history.map(item => `
        <div class="history-card" onclick="viewHistoryItem('${item.id}')">
            <div class="history-card-header">
                <span class="category-tag category-${item.category}">${escapeHtml(localizeCategoryLabel(item.category))}</span>
                <div class="history-card-actions">
                    <button class="btn-icon star-btn ${item.isFavorite ? 'active' : ''}" onclick="toggleItemFavorite(event, '${item.id}')">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                    </button>
                    <button class="btn-icon delete-btn" onclick="deleteHistoryItem(event, '${item.id}')">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="scene-name">${escapeHtml(state.language === 'en' ? (SCENE_I18N.en[item.sceneId]?.name || item.sceneName) : item.sceneName)}</div>
            <div class="preview-text">${item.generatedText.substring(0, 60)}...</div>
            <div class="history-footer">
                <span class="time">${new Date(item.createdAt).toLocaleString()}</span>
                ${item.version ? `<span class="version-tag">${{
                    'standard': state.language === 'zh' ? '标准' : 'Standard',
                    'short': state.language === 'zh' ? '简短' : 'Short',
                    'formal': state.language === 'zh' ? '正式' : 'Formal',
                    'softened': state.language === 'zh' ? '降火' : 'Soften'
                }[item.version] || ''}${state.language === 'zh' ? '版' : ''}</span>` : ''}
            </div>
        </div>
    `).join('');
}

// ==================== 工具函数 ====================

function getIconSvg(icon) {
    const icons = {
        work: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>',
        shopping: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>',
        housing: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
        social: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>',
        life: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
        shield: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
        education: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 01-3 3H5a3 3 0 01-3-3V3z"/><path d="M18 3h3a2 2 0 012 2v14a2 2 0 01-2 2h-3"/></svg>',
        medical: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
        government: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>'
    };
    return icons[icon] || icons.work;
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (state.language === 'en') {
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 30) return `${days}d ago`;
        return `${date.getMonth() + 1}/${date.getDate()}`;
    }

    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 30) return `${days}天前`;
    return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function formatGroupDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today - 86400000);
    const recordDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (recordDate.getTime() === today.getTime()) return '今天';
    if (recordDate.getTime() === yesterday.getTime()) return '昨天';
    if (now - recordDate < 7 * 86400000) {
        const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        return days[date.getDay()];
    }
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function formatHM(timestamp) {
    const date = new Date(timestamp);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

// ==================== 交互逻辑 ====================

function navigateTo(page) {
    const prevPage = state.currentPage;
    if (prevPage === page) return;

    const prevLevel = PAGE_LEVELS[prevPage] || 0;
    const nextLevel = PAGE_LEVELS[page] || 0;
    
    const prevEl = document.getElementById(`page-${prevPage}`);
    const nextEl = document.getElementById(`page-${page}`);
    
    if (!nextEl) return;

    // 清除之前的动画类
    document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active', 'slide-in-right', 'slide-in-left', 'slide-out-right', 'slide-out-left', 'fade-in');
        // 强制隐藏非目标页面，避免 fixed 元素残留
        if (p.id !== `page-${page}`) p.classList.add('hidden');
    });

    // 移除 hidden 类，确保页面可见
    nextEl.classList.remove('hidden');
    
    // 决定动画方向
    if (prevLevel < nextLevel) {
        // 递进动画 (Push)
        nextEl.classList.add('active', 'slide-in-right');
        if (prevEl) prevEl.classList.add('active', 'slide-out-left');
    } else if (prevLevel > nextLevel) {
        // 返回动画 (Pop)
        nextEl.classList.add('active', 'slide-in-left');
        if (prevEl) prevEl.classList.add('active', 'slide-out-right');
    } else {
        // 同级动画 (Fade)
        nextEl.classList.add('active', 'fade-in');
    }

    state.currentPage = page;
    
    // 维护页面历史（用于返回导航）
    if (!state.pageHistory) state.pageHistory = ['home'];
    if (state.pageHistory[state.pageHistory.length - 1] !== page) {
        state.pageHistory.push(page);
        // 限制历史长度
        if (state.pageHistory.length > 10) {
            state.pageHistory = state.pageHistory.slice(-10);
        }
    }

    // 无论渲染是否抛错，都要在动画结束后清理动画类，避免 transform 残留
    setTimeout(() => {
        document.querySelectorAll('.page').forEach(p => {
            // 清理所有动画类，防止 stuck
            p.classList.remove('slide-in-right', 'slide-in-left', 'slide-out-right', 'slide-out-left', 'fade-in');
            // 非目标页面清理 active
            if (p.id !== `page-${page}`) {
                p.classList.remove('active');
            }
        });
        // 强制当前页面 transform 归零
        if (nextEl) nextEl.style.transform = '';
    }, 400); // 对应 CSS 中的 transition-slow
    
    // 渲染页面内容
    try {
        if (page === 'home') renderHome();
        if (page === 'input') renderForm();
        if (page === 'confirm') renderConfirm();
        if (page === 'history') renderHistory();
        if (page === 'custom-scene') renderCustomSceneForm();
        if (page === 'user') renderUserPage();
        if (page === 'polish') {
            loadPolishHistory();
            // 重置润色状态
            document.getElementById('polish-input').value = '';
            document.getElementById('polish-result-section').classList.add('hidden');
            currentPolishResults = [];
        }
        if (page === 'dialogue') {
            initDialoguePage();
        }
    } catch (e) {
        console.error('[navigateTo] render error:', e);
    }
}

function selectScene(sceneId) {
    const allScenes = getAllScenes();
    state.currentScene = allScenes.find(s => s.id === sceneId);
    state.formValues = {};
    state.selectedTone = 'neutral';
    navigateTo('input');
}

function updateField(key, value) {
    state.formValues[key] = value;
    console.log('[updateField]', key, '=', value, 'formValues:', state.formValues);
}

function goToConfirm() {
    navigateTo('confirm');
}

function navigateBack() {
    // 从历史中移除当前页，获取上一页
    if (state.pageHistory && state.pageHistory.length > 1) {
        state.pageHistory.pop(); // 移除当前页
        const prevPage = state.pageHistory[state.pageHistory.length - 1];
        // 直接导航而不重复添加历史
        _navigateToPage(prevPage);
    } else {
        _navigateToPage('home');
    }
}

// 内部导航函数，不维护历史记录
function _navigateToPage(page) {
    const prevPage = state.currentPage;
    if (prevPage === page) return;

    const prevEl = document.getElementById(`page-${prevPage}`);
    const nextEl = document.getElementById(`page-${page}`);
    
    if (!nextEl) return;

    // 清除之前的动画类
    document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active', 'slide-in-right', 'slide-in-left', 'slide-out-right', 'slide-out-left', 'fade-in');
        // 强制隐藏非目标页面，避免 fixed 元素残留
        if (p.id !== `page-${page}`) p.classList.add('hidden');
    });

    // 移除 hidden 类，确保页面可见
    nextEl.classList.remove('hidden');

    // 返回动画 (Pop)
    nextEl.classList.add('active', 'slide-in-left');
    if (prevEl) prevEl.classList.add('active', 'slide-out-right');

    state.currentPage = page;
    
    // 渲染页面内容
    if (page === 'home') renderHome();
    if (page === 'input') renderForm();
    if (page === 'confirm') renderConfirm();
    if (page === 'history') renderHistory();
    if (page === 'custom-scene') renderCustomSceneForm();
    if (page === 'user') renderUserPage();
    if (page === 'polish') {
        loadPolishHistory();
        const polishInput = document.getElementById('polish-input');
        const polishResult = document.getElementById('polish-result-section');
        if (polishInput) polishInput.value = '';
        if (polishResult) polishResult.classList.add('hidden');
        currentPolishResults = [];
    }
    if (page === 'dialogue') {
        initDialoguePage();
    }
}

function selectTone(tone) {
    state.selectedTone = tone;
    updateToneSelection();
}

function getTonePrompt(intensity) {
    if (state.language === 'en') {
        if (intensity <= 20) return 'Extremely soft, apologetic, and humble. Avoid conflict and use very gentle wording.';
        if (intensity <= 40) return 'Soft and polite. Express requests tactfully and prioritize relationship and understanding.';
        if (intensity <= 60) return 'Neutral, objective, and professional. State facts accurately with clear requests.';
        if (intensity <= 80) return 'Firm and decisive. Clear stance and urgency while staying professional.';
        return 'Very firm and serious. Strong deterrence and clear consequences for severe violations or urgent conflicts.';
    }
    if (intensity <= 20) return "语气极其温和，充满歉意和谦卑，极力避免任何可能的冲突，用词非常委婉";
    if (intensity <= 40) return "语气温和且有礼貌，委婉表达诉求，侧重于维护关系和寻求理解";
    if (intensity <= 60) return "语气中立、客观、专业，事实陈述准确，诉求明确，不卑不亢";
    if (intensity <= 80) return "语气坚定、果断，立场非常明确，强调诉求的合理性和紧迫性，但保持职业素养";
    return "语气极其强硬、严肃，带有不容置疑的威慑力，直接点出后果，用于处理严重违规或极其紧急的冲突";
}

function updateToneSelection() {
    const intensity = state.toneIntensity || 50;
    const slider = document.getElementById('tone-slider');
    const label = document.getElementById('tone-intensity-label');
    const valueEl = document.getElementById('tone-value');
    
    if (slider) slider.value = intensity;
    
    // 渲染文案
    let textKey = 'neutral_label';
    if (intensity <= 20) textKey = 'soft_label'; // 映射更细致的可以加key，这里暂用现有
    else if (intensity <= 40) textKey = 'soft_label';
    else if (intensity <= 60) textKey = 'neutral_label';
    else if (intensity <= 80) textKey = 'firm_label';
    else textKey = 'firm_label';

    const text = t(textKey);
    if (label) label.textContent = text;
    if (valueEl) valueEl.textContent = text;
}

function handleToneSliderChange(value) {
    state.toneIntensity = parseInt(value);
    updateToneSelection();
}

// 启动生成流程（从确认页调用）
async function startGeneration() {
    // 检查是否有当前场景
    if (!state.currentScene) {
        showToast(state.language === 'zh' ? '请先选择场景' : 'Please select a scene first');
        return;
    }
    
    // generate() 内部会导航到结果页
    await generate();
}

async function generate() {
    // 网络检查
    if (!navigator.onLine) {
        showToast(i18n[state.language].offline_mode);
        triggerHaptic();
        return;
    }

    navigateTo('result');

    // 初始化批量生成缓存
    state.generatedVersions = {};
    state.currentResultVersion = state.currentVersion || 'standard';
    
    // 显示骨架屏，准备流式显示区域
    const loadingEl = document.getElementById('loading');
    const skeletonEl = document.getElementById('skeleton');
    const resultTextEl = document.getElementById('result-text');
    
    if (loadingEl) loadingEl.classList.add('hidden');
    if (skeletonEl) skeletonEl.classList.remove('hidden');
    if (resultTextEl) {
        resultTextEl.classList.add('hidden');
        resultTextEl.textContent = '';
    }
    
    let generatedText = '';
    let isFirstChunk = true;
    
    try {
        // 使用流式生成
        await AIService.generateStream({
            scene: state.currentScene,
            values: state.formValues,
            tonePrompt: getTonePrompt(state.toneIntensity),
            version: state.currentVersion
        }, (chunk) => {
            // 第一个字到达时隐藏骨架屏，显示文本
            if (isFirstChunk) {
                if (skeletonEl) skeletonEl.classList.add('hidden');
                if (resultTextEl) resultTextEl.classList.remove('hidden');
                isFirstChunk = false;
            }
            
            generatedText += chunk;
            if (resultTextEl) {
                resultTextEl.textContent = generatedText;
                // 自动滚动到底部
                resultTextEl.scrollTop = resultTextEl.scrollHeight;
            }
        });
        
        // 保存到状态和历史
        state.generatedText = generatedText;

        // 写入版本缓存
        state.generatedVersions[state.currentVersion || 'standard'] = generatedText;

        const resultId = Date.now().toString();
        state.currentResultId = resultId;
        state.isCurrentFavorite = false; // 重置当前收藏状态

        Storage.save({
            id: resultId,
            sceneId: state.currentScene.id,
            sceneName: state.currentScene.name,
            category: state.currentScene.category,
            inputValues: { ...state.formValues },
            generatedText: generatedText,
            tone: state.selectedTone,
            createdAt: Date.now(),
            isFavorite: false
        });
        
        renderResult();

        // 如果开启批量生成：后台并行生成其它版本，写入缓存
        if (state.batchGenerateEnabled) {
            const versions = ['standard', 'short', 'formal', 'softened'];
            const current = state.currentVersion || 'standard';
            const pending = versions.filter(v => v !== current);

            Promise.allSettled(pending.map(v => {
                return AIService.generate({
                    scene: state.currentScene,
                    values: state.formValues,
                    tone: state.selectedTone,
                    version: v
                }).then(text => {
                    state.generatedVersions[v] = text;
                    return true;
                });
            })).then(() => {
                // 若当前页面仍在结果页，且用户切换到了某个版本且已生成，刷新一次
                const activeVersion = state.currentResultVersion || current;
                const cached = state.generatedVersions[activeVersion];
                if (cached && document.getElementById('page-result')?.classList.contains('active')) {
                    state.generatedText = cached;
                    renderResult();
                }
            });
        }
        
        // 自动同步（如果开启）
        if (UserService.isLoggedIn() && Storage.getSetting('autoSync', false)) {
            SyncService.upload().catch(() => {});
        }
        
    } catch (err) {
        showAIError('generate', err);
        if (skeletonEl) skeletonEl.classList.add('hidden');
        if (!generatedText) {
            if (resultTextEl) {
                resultTextEl.classList.remove('hidden');
                resultTextEl.textContent = state.language === 'zh' ? '生成失败，请重试' : 'Generation failed, please retry';
            }
        }
    }
}

async function regenerate(version) {
    state.currentVersion = version;
    state.currentResultVersion = version;
    
    // 使用本地化的版本标签
    const versionLabels = {
        'standard': t('standard_ver'),
        'short': t('short_ver'),
        'formal': t('formal_ver'),
        'softened': t('softened_ver')
    };
    
    // 更新 chip 样式
    document.querySelectorAll('.version-chips .chip').forEach(el => {
        el.classList.remove('active');
        if (el.textContent.trim() === versionLabels[version]) {
            el.classList.add('active');
        }
    });
    
    // 空值检查防止报错
    const loadingEl = document.getElementById('loading');
    const resultTextEl = document.getElementById('result-text');
    if (loadingEl) loadingEl.classList.remove('hidden');
    if (resultTextEl) resultTextEl.classList.add('hidden');
    
    try {
        const text = await AIService.generate({
            scene: state.currentScene,
            values: state.formValues,
            tonePrompt: getTonePrompt(state.toneIntensity),
            version
        });
        state.generatedText = text;
        state.generatedVersions[version] = text;
        renderResult();
        const loadingEl2 = document.getElementById('loading');
        const resultTextEl2 = document.getElementById('result-text');
        if (loadingEl2) loadingEl2.classList.add('hidden');
        if (resultTextEl2) resultTextEl2.classList.remove('hidden');
    } catch (err) {
        showAIError('regenerate', err);
        const loadingEl2 = document.getElementById('loading');
        if (loadingEl2) loadingEl2.classList.add('hidden');
    }
}

async function rewriteTone(tone) {
    // 兼容旧的 tone 胶囊点击逻辑，将其转换为强度数值
    const intensityMap = { 'soft': 20, 'neutral': 50, 'firm': 80 };
    state.toneIntensity = intensityMap[tone] || 50;
    
    // 更新 chip 样式
    document.querySelectorAll('.tone-chips .chip').forEach(el => el.classList.remove('active'));
    const toneChip = document.getElementById(`result-tone-${tone}`);
    if (toneChip) toneChip.classList.add('active');
    
    const loadingEl = document.getElementById('loading');
    const resultTextEl = document.getElementById('result-text');
    if (loadingEl) loadingEl.classList.remove('hidden');
    if (resultTextEl) resultTextEl.classList.add('hidden');
    
    try {
        const text = await AIService.generate({
            scene: state.currentScene,
            values: state.formValues,
            tonePrompt: getTonePrompt(state.toneIntensity),
            version: state.currentVersion
        });
        state.generatedText = text;
        renderResult();
        const loadingEl2 = document.getElementById('loading');
        const resultTextEl2 = document.getElementById('result-text');
        if (loadingEl2) loadingEl2.classList.add('hidden');
        if (resultTextEl2) resultTextEl2.classList.remove('hidden');
    } catch (err) {
        showAIError('rewrite', err);
        const loadingEl2 = document.getElementById('loading');
        if (loadingEl2) loadingEl2.classList.add('hidden');
    }
}

function copyResult() {
    navigator.clipboard.writeText(state.generatedText).then(() => {
        showToast('已复制到剪贴板');
    }).catch(() => {
        showToast('复制失败，请手动复制');
    });
}

function shareResult() {
    openShareSheet();
}

function openShareSheet() {
    const modalContainer = document.getElementById('modal-container');
    const modalContent = document.getElementById('modal-content');
    const template = document.getElementById('tpl-share-sheet');

    if (!template) {
        showToast(state.language === 'zh' ? '分享面板未加载' : 'Share sheet not loaded');
        return;
    }

    modalContent.innerHTML = template.innerHTML;

    const titleEl = document.getElementById('share-preview-title');
    const textEl = document.getElementById('share-preview-text');
    if (titleEl) {
        titleEl.textContent = state.currentScene?.name
            ? `${state.currentScene.name}`
            : (state.language === 'zh' ? '生成结果' : 'Generated Result');
    }
    if (textEl) textEl.textContent = state.generatedText || '';

    const sysBtn = document.getElementById('share-system-btn');
    if (sysBtn) {
        sysBtn.style.display = navigator.share ? '' : 'none';
    }

    modalContainer.classList.remove('hidden');
}

function getShareTitle() {
    if (state.currentScene?.name) return `ClearTalk - ${state.currentScene.name}`;
    return 'ClearTalk';
}

function getShareTextPlain() {
    return state.generatedText || '';
}

function getShareTextRich() {
    const sceneName = state.currentScene?.name || (state.language === 'zh' ? '生成结果' : 'Generated Result');
    return `${sceneName}\n\n${state.generatedText || ''}`;
}

function copyShareText(mode) {
    const text = mode === 'rich' ? getShareTextRich() : getShareTextPlain();
    navigator.clipboard.writeText(text).then(() => {
        showToast(state.language === 'zh' ? '已复制到剪贴板' : 'Copied');
    }).catch(() => {
        showToast(state.language === 'zh' ? '复制失败，请手动复制' : 'Copy failed');
    });
    triggerHaptic();
}

function downloadShareText() {
    const content = getShareTextRich();
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cleartalk_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(state.language === 'zh' ? '已下载' : 'Downloaded');
    triggerHaptic();
}

function shareViaEmail() {
    const subject = encodeURIComponent(getShareTitle());
    const body = encodeURIComponent(getShareTextRich());
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    triggerHaptic();
}

function shareViaSystem() {
    if (!navigator.share) {
        showToast(state.language === 'zh' ? '当前环境不支持系统分享' : 'System share not supported');
        return;
    }

    navigator.share({
        title: getShareTitle(),
        text: getShareTextPlain()
    }).catch(() => {});
    triggerHaptic();
}

let dialogueState = {
    isActive: false,
    seed: '',
    messages: [],
    maxTurns: 12,
    context: {},
    personality: 'neutral',
    topic: '',
    savedContextId: null
};

// 对话上下文记忆服务
const DialogueMemory = {
    STORAGE_KEY: 'cleartalk_dialogue_contexts',

    // 保存对话上下文
    save(contextId, context) {
        const contexts = this.loadAll();
        contexts[contextId] = {
            ...context,
            savedAt: Date.now()
        };
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(contexts));
    },

    // 加载指定上下文
    load(contextId) {
        const contexts = this.loadAll();
        return contexts[contextId] || null;
    },

    // 加载所有上下文
    loadAll() {
        try {
            return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
        } catch {
            return {};
        }
    },

    // 删除上下文
    delete(contextId) {
        const contexts = this.loadAll();
        delete contexts[contextId];
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(contexts));
    },

    // 获取最近的上下文列表
    getRecentList(limit = 10) {
        const contexts = this.loadAll();
        return Object.entries(contexts)
            .map(([id, ctx]) => ({ id, ...ctx }))
            .sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0))
            .slice(0, limit);
    },

    // 生成上下文ID
    generateId(seed) {
        return 'ctx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
};

// 对话人格配置
const DIALOGUE_PERSONALITIES = {
    neutral: {
        name: '中立',
        desc: '平和理性的对话伙伴',
        prompt: '你是一位平和理性的对话伙伴，回复自然得体。'
    },
    professional: {
        name: '专业',
        desc: '正式、专业的职场沟通风格',
        prompt: '你是一位专业严谨的职场人士，回复正式、专业、条理清晰。'
    },
    friendly: {
        name: '友好',
        desc: '亲切随和的朋友式对话',
        prompt: '你是一位亲切随和的朋友，回复温暖、有同理心、使用口语化表达。'
    },
    strict: {
        name: '严格',
        desc: '要求高、注重细节的对话风格',
        prompt: '你是一位要求严格、注重细节的管理者，回复直接、犀利、追求完美。'
    },
    humorous: {
        name: '幽默',
        desc: '轻松幽默的对话风格',
        prompt: '你是一位幽默风趣的对话伙伴，回复轻松有趣，适当使用轻松幽默的表达。'
    }
};

function openDialogueFromHome() {
    dialogueState.seed = '';
    dialogueState.messages = [];
    dialogueState.context = {};
    dialogueState.savedContextId = null;
    navigateTo('dialogue');
}

function openDialogueFromResult() {
    if (!state.generatedText) {
        showToast(state.language === 'zh' ? '没有可用于对话的文本' : 'No text to simulate');
        return;
    }
    dialogueState.seed = getShareTextPlain();
    dialogueState.messages = [];
    navigateTo('dialogue');
    setTimeout(() => {
        const seedEl = document.getElementById('dialogue-seed');
        if (seedEl) seedEl.value = dialogueState.seed;
    }, 0);
}

function initDialoguePage() {
    const setup = document.getElementById('dialogue-setup');
    const thread = document.getElementById('dialogue-thread');
    const inputBar = document.getElementById('dialogue-input-bar');
    const messages = document.getElementById('dialogue-messages');
    const suggestions = document.getElementById('dialogue-suggestions');

    if (messages) messages.innerHTML = '';
    if (suggestions) suggestions.innerHTML = '';

    if (setup) setup.classList.remove('hidden');
    if (thread) thread.classList.add('hidden');
    if (inputBar) inputBar.classList.add('hidden');

    const seedEl = document.getElementById('dialogue-seed');
    if (seedEl) seedEl.value = dialogueState.seed || '';

    dialogueState.isActive = false;

    // 绑定对话输入框键盘事件（仅绑定一次）
    const input = document.getElementById('dialogue-input');
    if (input && !input._hasKeydownBound) {
        input._hasKeydownBound = true;
        input.addEventListener('keydown', onDialogueInputKeydown);
        input.addEventListener('input', adjustDialogueInputHeight);
    }
}

function adjustDialogueInputHeight() {
    const input = document.getElementById('dialogue-input');
    if (!input) return;
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 160) + 'px';
}

function onDialogueInputKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendDialogueMessage();
    }
}

function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function clearDialogueSeed() {
    const el = document.getElementById('dialogue-seed');
    if (el) el.value = '';
    triggerHaptic();
}

function resetDialogue() {
    dialogueState.isActive = false;
    dialogueState.messages = [];
    dialogueState.seed = '';
    dialogueState.context = {};
    dialogueState.savedContextId = null;
    initDialoguePage();
    triggerHaptic();
}

// 保存当前对话上下文
function saveDialogueContext() {
    if (!dialogueState.isActive || dialogueState.messages.length === 0) {
        showToast('没有可保存的对话');
        return;
    }

    const contextId = dialogueState.savedContextId || DialogueMemory.generateId();
    const context = {
        messages: dialogueState.messages,
        seed: dialogueState.seed,
        personality: dialogueState.personality,
        topic: dialogueState.topic,
        context: dialogueState.context,
        preview: dialogueState.messages[0]?.content?.substring(0, 50) + '...'
    };

    DialogueMemory.save(contextId, context);
    dialogueState.savedContextId = contextId;
    showToast('对话已保存');
}

// 加载历史对话
function loadDialogueContext(contextId) {
    const context = DialogueMemory.load(contextId);
    if (!context) {
        showToast('对话记录不存在');
        return;
    }

    dialogueState.messages = context.messages || [];
    dialogueState.seed = context.seed || '';
    dialogueState.personality = context.personality || 'neutral';
    dialogueState.topic = context.topic || '';
    dialogueState.context = context.context || {};
    dialogueState.isActive = true;
    dialogueState.savedContextId = contextId;

    // 更新UI
    const setup = document.getElementById('dialogue-setup');
    const thread = document.getElementById('dialogue-thread');
    const inputBar = document.getElementById('dialogue-input-bar');
    if (setup) setup.classList.add('hidden');
    if (thread) thread.classList.remove('hidden');
    if (inputBar) inputBar.classList.remove('hidden');

    renderDialogueMessages();
    showToast('已恢复对话');
}

// 显示历史对话选择
function showDialogueHistory() {
    const contexts = DialogueMemory.getRecentList(10);
    if (contexts.length === 0) {
        showToast('没有保存的对话记录');
        return;
    }

    showActionSheet({
        title: '继续之前的对话',
        actions: contexts.map(ctx => ({
            label: ctx.preview || '未命名对话',
            value: ctx.id
        })),
        onSelect: (contextId) => {
            loadDialogueContext(contextId);
        }
    });
}

// 设置对话人格
function setDialoguePersonality(personality) {
    dialogueState.personality = personality;
    const p = DIALOGUE_PERSONALITIES[personality];
    showToast(`已切换到${p.name}模式`);
}

async function startDialogue() {
    const seedEl = document.getElementById('dialogue-seed');
    const seed = (seedEl?.value || '').trim();
    if (!seed) {
        showToast(state.language === 'zh' ? '请先输入你要说的话' : 'Please input your message');
        return;
    }

    dialogueState.seed = seed;
    dialogueState.isActive = true;
    dialogueState.messages = [{ role: 'user', content: seed }];

    const setup = document.getElementById('dialogue-setup');
    const thread = document.getElementById('dialogue-thread');
    const inputBar = document.getElementById('dialogue-input-bar');
    if (setup) setup.classList.add('hidden');
    if (thread) thread.classList.remove('hidden');
    if (inputBar) inputBar.classList.remove('hidden');

    renderDialogueMessages();
    await generateOtherSideReply();
}

function sendDialogueMessage() {
    const input = document.getElementById('dialogue-input');
    const text = (input?.value || '').trim();
    if (!text) return;

    if (!dialogueState.isActive) {
        showToast(state.language === 'zh' ? '请先开始模拟' : 'Start simulation first');
        return;
    }

    dialogueState.messages.push({ role: 'user', content: text });
    if (input) {
        input.value = '';
        adjustDialogueInputHeight();
    }
    renderDialogueMessages();
    generateOtherSideReply();
}

function renderDialogueMessages() {
    const container = document.getElementById('dialogue-messages');
    if (!container) return;

    const empty = document.getElementById('dialogue-empty');
    if (!dialogueState.messages || dialogueState.messages.length === 0) {
        container.innerHTML = '';
        if (empty) empty.classList.remove('hidden');
        return;
    }
    if (empty) empty.classList.add('hidden');

    container.innerHTML = dialogueState.messages.map(m => {
        const cls = m.role === 'user' ? 'msg user' : 'msg other';
        const name = m.role === 'user' ? (state.language === 'zh' ? '我' : 'Me') : (state.language === 'zh' ? '对方' : 'Other');
        return `\n            <div class="${cls}">\n                <div class="msg-name">${name}</div>\n                <div class="msg-bubble">${escapeHtml(m.content)}</div>\n            </div>\n        `;
    }).join('');

    container.scrollTop = container.scrollHeight;
}

function renderDialogueSuggestions(list) {
    const container = document.getElementById('dialogue-suggestions');
    if (!container) return;

    if (!list || list.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = list.map(s => {
        const safe = escapeHtml(s);
        return `<button class="suggest-chip" onclick="applyDialogueSuggestion('${safe.replace(/'/g, "\\'")}')">${safe}</button>`;
    }).join('');
}

function applyDialogueSuggestion(text) {
    const input = document.getElementById('dialogue-input');
    if (input) {
        input.value = text;
        input.focus();
    }
    triggerHaptic();
}

async function generateDialogueAI(messages) {
    const lang = state.language === 'zh' ? 'zh' : 'en';
    const personality = DIALOGUE_PERSONALITIES[dialogueState.personality] || DIALOGUE_PERSONALITIES.neutral;

    // 构建上下文记忆
    const contextInfo = dialogueState.context || {};
    const topic = dialogueState.topic || '';

    // 获取最近10条消息作为历史
    const recentMessages = (messages || []).slice(-10);
    const history = recentMessages.map(m => `${m.role === 'user' ? 'User' : 'Other'}: ${m.content}`).join('\n');

    // 提取关键信息用于增强上下文
    const keyInfo = contextInfo.keyInfo || {};
    const infoContext = Object.keys(keyInfo).length > 0
        ? '\n已确认的信息：' + Object.entries(keyInfo).map(([k, v]) => `${k}: ${v}`).join('；')
        : '';

    const promptZh = `${personality.prompt}

当前话题：${topic || '一般对话'}
${infoContext}

你是对话模拟器中的"对方"。请根据对话历史给出自然、真实的下一条回复。

重要要求：
1) 像真实人类一样说话，使用口语化、自然的表达
2) 根据对方人格风格(${personality.name})调整语气和用词
3) 保持对话连贯性，参考之前的对话内容
4) 不要一次性解决所有问题，给对话留有余地
5) 绝对不要返回【背景】【事实】【诉求】等模板标记
6) 同时给出3条简短的我方回复建议

对话历史：
${history}

请输出JSON格式：{"reply":"你的回复内容","suggestions":["建议1","建议2","建议3"]}`;

    const promptEn = `${personality.prompt}

Topic: ${topic || 'General conversation'}
${infoContext}

You are the OTHER party in a dialogue simulator. Reply naturally and realistically based on the conversation history.

Requirements:
1) Speak like a real human with natural, conversational language
2) Adjust tone based on personality (${personality.name})
3) Maintain conversation coherence
4) Keep the conversation open, don't resolve everything at once
5) NEVER use template markers like [Background][Facts][Request]
6) Provide 3 short reply suggestions for the user

History:
${history}

Output JSON: {"reply":"your reply","suggestions":["suggestion 1","suggestion 2","suggestion 3"]}`;

    let text = '';
    try {
        text = await AIService.freeform({
            prompt: lang === 'zh' ? promptZh : promptEn,
            version: 'standard'
        });
    } catch (e) {
        // AI调用失败，降级到本地
        return generateDialogueLocal(messages);
    }

    // 检测是否是模板响应（包含【背景】【事实】等标记）
    const isTemplate = /【(?:背景|事实|诉求|期限|结尾|待补充)/.test(text);
    if (isTemplate) {
        console.log('[Dialogue] AI返回模板，降级到本地生成');
        return generateDialogueLocal(messages);
    }

    try {
        const json = JSON.parse(text);
        if (json && json.reply) {
            return {
                reply: String(json.reply),
                suggestions: Array.isArray(json.suggestions) ? json.suggestions.map(String).slice(0, 3) : []
            };
        }
    } catch (_) {}

    // 模型输出不是 JSON 时，做兜底
    const replyText = String(text || '').trim();
    if (replyText && !isTemplate) {
        return { reply: replyText, suggestions: [] };
    }
    return generateDialogueLocal(messages);
}

function generateDialogueLocal(messages) {
    const lang = state.language === 'zh' ? 'zh' : 'en';
    const lastUser = [...(messages || [])].reverse().find(m => m.role === 'user')?.content || '';
    const text = String(lastUser).toLowerCase();

    if (lang === 'zh') {
        // 根据内容识别场景并给出针对性回复
        if (text.includes('请假') || text.includes('病') || text.includes('不舒服') || text.includes('休息')) {
            return {
                reply: '收到，身体要紧。请问大概需要休息几天？手头的工作我来协调一下，有需要交接的随时跟我说。',
                suggestions: [
                    '大概需要3天，我会提前把手头的工作整理好',
                    '暂时不确定，可能2-3天，我会及时同步恢复情况',
                    '抱歉给您添麻烦了，我尽快恢复回来跟进'
                ]
            };
        }

        if (text.includes('进度') || text.includes(' Deadline') || text.includes('催') || text.includes('什么时候')) {
            return {
                reply: '理解你的着急。目前进展是【待补充具体进展】，预计【待补充时间】可以完成。如果有风险我会提前同步。',
                suggestions: [
                    '能否再确认一下具体的时间节点？',
                    '我这边需要拿到初版才能往下推进，能不能先给一版？',
                    '如果确实有风险，我们可以调整一下优先级'
                ]
            };
        }

        if (text.includes('价格') || text.includes('预算') || text.includes('费用') || text.includes('钱') || text.includes('报价')) {
            return {
                reply: '明白，价格确实是重要考量。我们目前的方案是基于【待补充】定的，如果预算有压力，我们可以调整一下范围或者分阶段交付，你看哪种方式更合适？',
                suggestions: [
                    '预算确实有限，能否砍掉一些非核心功能？',
                    '分阶段可以，第一阶段先解决最紧急的',
                    '价格还能再谈吗？长期合作的话我们可以让一些'
                ]
            };
        }

        if (text.includes('改') || text.includes('调整') || text.includes('修改') || text.includes('需求')) {
            return {
                reply: '收到，调整需求很正常。麻烦你具体说一下需要改哪些点？影响范围大吗？我评估一下时间和成本的变化。',
                suggestions: [
                    '主要是【待补充具体调整点】，范围不大',
                    '可能需要整体调整，我们开个会对一下？',
                    '时间紧，能不能先做一版看看效果再细化？'
                ]
            };
        }

        if (text.includes('谢谢') || text.includes('辛苦')) {
            return {
                reply: '不客气，应该的。后续有进展我第一时间同步你，有其他需要随时找我。',
                suggestions: [
                    '感谢支持，有问题我再请教',
                    '好的，那我们按这个推进',
                    '也辛苦你了，保持沟通'
                ]
            };
        }

        // 通用兜底
        return {
            reply: '收到，我理解你的意思。具体是想怎么推进？我们可以对齐一下下一步。',
            suggestions: [
                '我的想法是…你觉得可行吗？',
                '能否给我一个明确的时间/方案？',
                '没问题，我们按这个来，我这边会配合'
            ]
        };
    }

    // English fallback
    const lower = text;
    if (lower.includes('sick') || lower.includes('leave') || lower.includes('day off')) {
        return {
            reply: 'Got it, health comes first. How many days do you expect to be away? I\'ll help coordinate your tasks.',
            suggestions: [
                'About 3 days, I\'ll wrap up my tasks before leaving',
                'Not sure yet, maybe 2-3 days. I\'ll keep you posted',
                'Sorry for the inconvenience, I\'ll catch up as soon as I\'m back'
            ]
        };
    }

    if (lower.includes('price') || lower.includes('budget') || lower.includes('cost')) {
        return {
            reply: 'Understood, budget is important. We can adjust scope or split into phases. Which works better for you?',
            suggestions: [
                'Can we trim some non-essential features?',
                'Phased approach works, let\'s prioritize',
                'Is there room for negotiation on price?'
            ]
        };
    }

    if (lower.includes('change') || lower.includes('modify') || lower.includes('adjust')) {
        return {
            reply: 'Got it. Can you specify what needs changing and the impact? I\'ll assess time/cost changes.',
            suggestions: [
                'Minor tweaks, mainly around...',
                'Might need significant changes, can we sync?',
                'Tight timeline—can we test a version first?'
            ]
        };
    }

    return {
        reply: 'Got it. How would you like to proceed? Let\'s align on next steps.',
        suggestions: [
            'Here\'s what I think… does that work?',
            'Could you give me a clear timeline?',
            'Sounds good, I\'ll support from my side'
        ]
    };
}

async function generateOtherSideReply() {
    if (dialogueState.messages.length >= dialogueState.maxTurns) {
        showToast(state.language === 'zh' ? '已达到本轮模拟的最大对话次数' : 'Reached max turns');
        return;
    }

    renderDialogueSuggestions([]);

    let reply = '';
    let suggestions = [];
    const online = navigator.onLine && typeof AIService !== 'undefined' && AIService.freeform;

    try {
        if (online) {
            const aiRes = await generateDialogueAI(dialogueState.messages);
            reply = aiRes.reply;
            suggestions = aiRes.suggestions;
        } else {
            const localRes = generateDialogueLocal(dialogueState.messages);
            reply = localRes.reply;
            suggestions = localRes.suggestions;
        }
    } catch (err) {
        console.error('Dialogue reply error:', err);
        showAIFallback('dialogue');
        const localRes = generateDialogueLocal(dialogueState.messages);
        reply = localRes.reply;
        suggestions = localRes.suggestions;
    }

    dialogueState.messages.push({ role: 'other', content: reply });
    renderDialogueMessages();
    renderDialogueSuggestions(suggestions);
}

// ==================== 润色工坊逻辑 ====================

let currentPolishTarget = 'professional';
let currentPolishResults = [];
let currentPolishVersion = 1;

function selectPolishTarget(el) {
    if (!el) return;
    document.querySelectorAll('.polish-target').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    currentPolishTarget = el.dataset.target || 'professional';
    triggerHaptic();
}

function clearPolishInput() {
    const input = document.getElementById('polish-input');
    if (input) input.value = '';
    const resultSection = document.getElementById('polish-result-section');
    if (resultSection) resultSection.classList.add('hidden');
    currentPolishResults = [];
    triggerHaptic();
}

async function startPolish() {
    const inputEl = document.getElementById('polish-input');
    const text = (inputEl?.value || '').trim();
    if (!text) {
        showToast(state.language === 'zh' ? '请先输入原始文本' : 'Please input original text');
        return;
    }

    const resultSection = document.getElementById('polish-result-section');
    const contentEl = document.getElementById('polish-result-content');
    if (resultSection) resultSection.classList.remove('hidden');
    if (contentEl) contentEl.innerHTML = '<div class="loading-text">生成中...</div>';

    try {
        currentPolishResults = await generatePolishVersions(text, currentPolishTarget);
        currentPolishVersion = 1;
        switchPolishVersion(1);
    } catch (err) {
        showAIError('polish', err);
        if (contentEl) contentEl.innerHTML = '<div class="loading-text">生成失败</div>';
    }
    triggerHaptic();
}

function switchPolishVersion(n) {
    currentPolishVersion = n;
    document.querySelectorAll('.polish-versions .version-btn').forEach(btn => {
        btn.classList.toggle('active', String(btn.dataset.version) === String(n));
    });
    const idx = Math.max(0, Math.min(2, (Number(n) || 1) - 1));
    const text = currentPolishResults?.[idx] || '';
    const contentEl = document.getElementById('polish-result-content');
    if (contentEl) contentEl.textContent = text;
}

function copyPolishResult() {
    const idx = Math.max(0, Math.min(2, (Number(currentPolishVersion) || 1) - 1));
    const text = currentPolishResults?.[idx] || '';
    if (!text) {
        showToast(state.language === 'zh' ? '暂无可复制内容' : 'Nothing to copy');
        return;
    }
    navigator.clipboard.writeText(text).then(() => {
        showToast(state.language === 'zh' ? '已复制到剪贴板' : 'Copied');
    }).catch(() => {
        showToast(state.language === 'zh' ? '复制失败，请手动复制' : 'Copy failed');
    });
    triggerHaptic();
}

function savePolishResult() {
    const inputEl = document.getElementById('polish-input');
    const original = (inputEl?.value || '').trim();
    const idx = Math.max(0, Math.min(2, (Number(currentPolishVersion) || 1) - 1));
    const polished = currentPolishResults?.[idx] || '';
    if (!original || !polished) {
        showToast(state.language === 'zh' ? '暂无可保存内容' : 'Nothing to save');
        return;
    }

    const ok = Storage.savePolishHistory({
        id: Date.now().toString(),
        target: currentPolishTarget,
        version: currentPolishVersion,
        originalText: original,
        polishedText: polished,
        language: state.language,
        createdAt: Date.now()
    });

    if (ok) {
        showToast(state.language === 'zh' ? '已保存到润色历史' : 'Saved to polish history');
        loadPolishHistory();
    } else {
        showToast(state.language === 'zh' ? '保存失败' : 'Save failed');
    }
    triggerHaptic();
}

function loadPolishHistory() {
    const listEl = document.getElementById('polish-history-list');
    const emptyEl = document.getElementById('polish-history-empty');
    const items = Storage.loadPolishHistory();

    if (!listEl) return;

    if (!items || items.length === 0) {
        listEl.innerHTML = '';
        if (emptyEl) emptyEl.classList.remove('hidden');
        return;
    }

    if (emptyEl) emptyEl.classList.add('hidden');
    listEl.innerHTML = items.map(item => {
        const date = new Date(item.createdAt || Date.now()).toLocaleString();
        const preview = String(item.polishedText || '').slice(0, 56);
        return `
            <div class="history-card" onclick="restorePolish('${item.id}')">
                <div class="scene-name">${state.language === 'zh' ? '润色' : 'Polish'} · ${escapeHtml(item.target || '')}</div>
                <div class="preview-text">${escapeHtml(preview)}${(item.polishedText || '').length > 56 ? '...' : ''}</div>
                <div class="history-footer"><span class="time">${date}</span></div>
            </div>
        `;
    }).join('');
}

function restorePolish(id) {
    const items = Storage.loadPolishHistory();
    const item = items.find(x => x.id === id);
    if (!item) return;

    const inputEl = document.getElementById('polish-input');
    if (inputEl) inputEl.value = item.originalText || '';

    currentPolishTarget = item.target || 'professional';
    document.querySelectorAll('.polish-target').forEach(t => {
        t.classList.toggle('active', (t.dataset.target || '') === currentPolishTarget);
    });

    currentPolishResults = [item.polishedText || '', '', ''];
    const resultSection = document.getElementById('polish-result-section');
    if (resultSection) resultSection.classList.remove('hidden');
    currentPolishVersion = 1;
    switchPolishVersion(1);
    triggerHaptic();
}

function clearPolishHistory() {
    const ok = Storage.clearPolishHistory();
    if (ok) {
        showToast(state.language === 'zh' ? '已清空润色历史' : 'Cleared');
        loadPolishHistory();
    } else {
        showToast(state.language === 'zh' ? '清空失败' : 'Clear failed');
    }
    triggerHaptic();
}

async function generatePolishVersions(originalText, target) {
    const lang = state.language === 'zh' ? 'zh' : 'en';
    const variations = [0, 1, 2];
    const versions = [];
    const online = navigator.onLine && typeof AIService !== 'undefined' && AIService.freeform;

    if (online) {
        try {
            for (let i = 0; i < 3; i++) {
                const prompt = buildPolishPrompt(originalText, target, variations[i], lang);
                const result = await callPolishAI(prompt, originalText, target);
                versions.push(result);
            }
            return versions;
        } catch (err) {
            console.log('AI 润色失败，降级到本地模拟:', err);
            showAIFallback('polish');
            // 降级到本地模拟
        }
    }

    // 离线模式：使用智能模拟
    for (let i = 0; i < 3; i++) {
        const result = smartPolish(originalText, target, i, lang);
        versions.push(result);
    }

    return versions;
}

// ==================== 版本对比功能 ====================

// 版本对比数据存储
let compareVersions = {};

async function generateCompareVersions() {
    const scene = state.currentScene;
    const values = state.formValues;

    if (!scene) return;

    // 重置对比版本数据
    compareVersions = {};

    const tones = ['soft', 'neutral', 'firm'];

    for (const tone of tones) {
        try {
            const result = await simulateToneVersion(scene, values, tone);
            compareVersions[tone] = result;

            const contentEl = document.getElementById(`compare-${tone}-content`);
            if (contentEl) {
                contentEl.innerHTML = `<div class="compare-text">${result}</div>`;
            }
        } catch (err) {
            console.error(`生成 ${tone} 版本失败:`, err);
            showAIError('compare', err);
            const contentEl = document.getElementById(`compare-${tone}-content`);
            if (contentEl) {
                contentEl.innerHTML = '<div class="loading-text">生成失败</div>';
            }
        }
    }
}

async function simulateToneVersion(scene, values, tone) {
    const lang = state.language === 'zh' ? 'zh' : 'en';
    const online = navigator.onLine && typeof AIService !== 'undefined' && AIService.freeform;

    if (online) {
        const toneMap = {
            soft: lang === 'zh' ? '温和委婉、给对方留台阶' : 'soft and polite, leaving room',
            neutral: lang === 'zh' ? '中立、专业、清晰' : 'neutral, professional, clear',
            firm: lang === 'zh' ? '坚定有力、立场明确、不过度冒犯' : 'firm with clear stance without being offensive'
        };

        const prompt = lang === 'zh'
            ? `请基于以下场景信息，生成同一内容的三个语气版本之一（当前要生成：${tone === 'soft' ? '温和版' : tone === 'firm' ? '坚定版' : '中立版'}）。\n\n场景：${scene.name}\n描述：${scene.description}\n分类：${scene.category}\n用户信息：\n${Object.entries(values).map(([k,v]) => `- ${k}: ${v}`).join('\n')}\n\n语气要求：${toneMap[tone]}\n\n生成要求：\n1) 结构清晰：背景-事实-诉求-期限-结尾\n2) 不编造事实，缺失信息用【待补充】\n3) 更像真人沟通，不要模板腔\n\n请只输出最终文本，不要解释。`
            : `Generate a ${tone} tone version for the same communication content.\n\nScene: ${scene.name}\nDescription: ${scene.description}\nCategory: ${scene.category}\nUser inputs:\n${Object.entries(values).map(([k,v]) => `- ${k}: ${v}`).join('\n')}\n\nTone requirement: ${toneMap[tone]}\n\nRequirements:\n1) Clear structure: background-facts-request-deadline-closing\n2) Do not fabricate facts, use [TO FILL] for missing info\n3) Natural human-like message\n\nOutput only the final text.`;

        try {
            return await AIService.freeform({ prompt, version: 'standard' });
        } catch (e) {
            showAIFallback('compare');
            // fallback below
        }
    }

    // 离线/失败降级：保留原先的模拟输出
    const toneConfig = TONES[tone];
    await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 600));

    if (lang === 'zh') {
        const templates = {
            soft: `${scene.name}（温和版）\n\n尊敬的${values.recipient || '领导'}，\n\n希望您一切顺利。我想就${scene.description}的事情跟您沟通一下。\n\n具体情况是：${Object.entries(values).map(([k, v]) => v).join('，')}。\n\n我理解这可能需要一些协调，如果有什么我可以配合的，请随时告诉我。非常感谢您的时间和理解。\n\n此致\n敬礼`,
            neutral: `${scene.name}（中立版）\n\n${values.recipient || '领导'}，\n\n现就${scene.description}事宜向您说明：\n\n${Object.entries(values).map(([k, v]) => `${k}: ${v}`).join('\n')}\n\n请您查收并确认。如有疑问，欢迎随时沟通。\n\n谢谢。`,
            firm: `${scene.name}（坚定版）\n\n${values.recipient || '领导'}：\n\n关于${scene.description}，我需要明确表达以下立场：\n\n${Object.entries(values).map(([k, v]) => `• ${k}: ${v}`).join('\n')}\n\n以上事项请于规定时间内处理完毕。此事关系到${scene.category}规范，务必重视。\n\n特此通知。`
        };
        return templates[tone] || templates.neutral;
    }

    const templates = {
        soft: `Subject: ${scene.name} (Soft Version)\n\nDear ${values.recipient || 'Manager'},\n\nI hope this message finds you well. I would like to discuss ${scene.description} with you.\n\nThe details are: ${Object.entries(values).map(([k, v]) => v).join(', ')}.\n\nI understand this may require some coordination. Please let me know if there's anything I can do to help. Thank you for your time and understanding.\n\nBest regards,`,
        neutral: `Subject: ${scene.name}\n\n${values.recipient || 'Manager'},\n\nRegarding ${scene.description}:\n\n${Object.entries(values).map(([k, v]) => `${k}: ${v}`).join('\n')}\n\nPlease review and confirm. Feel free to reach out if you have any questions.\n\nThank you.`,
        firm: `Subject: ${scene.name} (Firm Version)\n\n${values.recipient || 'Manager'},\n\nRegarding ${scene.description}, I need to clearly state the following:\n\n${Object.entries(values).map(([k, v]) => `• ${k}: ${v}`).join('\n')}\n\nPlease handle the above matters within the specified timeframe. This is related to ${scene.category} standards and requires your attention.\n\nBest regards.`
    };
    return templates[tone] || templates.neutral;
}

function useCompareVersion(tone) {
    const result = compareVersions[tone];
    if (!result) {
        showToast(state.language === 'zh' ? '版本未生成，请稍后重试' : 'Version not generated, please retry');
        return;
    }
    
    // 更新当前显示的结果
    document.getElementById('result-text').innerHTML = result;
    
    // 更新语气选择按钮
    document.querySelectorAll('.tone-chips .chip').forEach(chip => {
        chip.classList.remove('active');
    });
    const activeChip = document.getElementById(`result-tone-${tone}`);
    if (activeChip) activeChip.classList.add('active');
    
    // 更新当前语气状态
    state.selectedTone = tone;
    
    showToast(state.language === 'zh' ? `已切换到${tone === 'soft' ? '温和' : tone === 'firm' ? '坚定' : '中立'}版` : `Switched to ${tone} version`);
    
    closeCompareModal();
    triggerHaptic();
}

function showVersionCompare() {
    const modal = document.getElementById('compare-modal');
    if (!modal) return;

    // 显示弹窗
    modal.classList.remove('hidden');

    // 重置加载状态
    document.getElementById('compare-soft-content').innerHTML = '<div class="loading-text">生成中...</div>';
    document.getElementById('compare-neutral-content').innerHTML = '<div class="loading-text">生成中...</div>';
    document.getElementById('compare-firm-content').innerHTML = '<div class="loading-text">生成中...</div>';

    // 生成对比版本
    generateCompareVersions();
}

function closeCompareModal() {
    const modal = document.getElementById('compare-modal');
    if (modal) modal.classList.add('hidden');
}

// 朗读当前生成的文本
function speakResult() {
    const text = state.generatedText;
    if (!text) {
        showToast(state.language === 'zh' ? '暂无内容可朗读' : 'No content to speak');
        return;
    }

    // 检查浏览器支持
    if (!('speechSynthesis' in window)) {
        showToast(state.language === 'zh' ? '当前浏览器不支持朗读功能' : 'Browser does not support speech synthesis');
        return;
    }

    // 停止当前播放
    window.speechSynthesis.cancel();

    // 创建朗读实例
    const utterance = new SpeechSynthesisUtterance(text);

    // 设置语言
    utterance.lang = state.language === 'zh' ? 'zh-CN' : 'en-US';

    // 设置语速和音调
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // 开始朗读
    window.speechSynthesis.speak(utterance);

    showToast(state.language === 'zh' ? '开始朗读...' : 'Speaking...');
}

function regenerateAllVersions() {
    document.getElementById('compare-soft-content').innerHTML = '<div class="loading-text">生成中...</div>';
    document.getElementById('compare-neutral-content').innerHTML = '<div class="loading-text">生成中...</div>';
    document.getElementById('compare-firm-content').innerHTML = '<div class="loading-text">生成中...</div>';
    
    generateCompareVersions();
    showToast(state.language === 'zh' ? '重新生成中...' : 'Regenerating...');
}

// ==================== Toast ====================

function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove('hidden');
    
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 2500);
}

let lastAIFallbackToastAt = 0;
let lastAIErrorToastAt = 0;

function getErrorMessage(err) {
    if (!err) return '';
    if (typeof err === 'string') return err;
    if (err.message) return err.message;
    try {
        return JSON.stringify(err);
    } catch {
        return String(err);
    }
}

function showAIError(action, err) {
    const now = Date.now();
    if (now - lastAIErrorToastAt < 800) return;
    lastAIErrorToastAt = now;

    const msg = getErrorMessage(err);
    const isZh = state.language === 'zh';
    const prefix = {
        generate: isZh ? '生成失败' : 'Generation failed',
        regenerate: isZh ? '重新生成失败' : 'Regeneration failed',
        rewrite: isZh ? '改写失败' : 'Rewrite failed',
        compare: isZh ? '对比生成失败' : 'Compare generation failed',
        polish: isZh ? '润色失败' : 'Polish failed'
    }[action] || (isZh ? '操作失败' : 'Operation failed');
    showToast(msg ? `${prefix}：${msg}` : prefix);
}

function showAIFallback(feature) {
    const now = Date.now();
    if (now - lastAIFallbackToastAt < 1800) return;
    lastAIFallbackToastAt = now;

    const isZh = state.language === 'zh';
    const map = {
        polish: isZh ? 'AI 不可用，已切换到离线润色（本地模拟）' : 'AI unavailable. Switched to offline polish (local).',
        compare: isZh ? 'AI 不可用，已切换到离线对比版本（本地模拟）' : 'AI unavailable. Switched to offline compare (local).',
        dialogue: isZh ? 'AI 不可用，已切换到离线对话模拟（本地模拟）' : 'AI unavailable. Switched to offline dialogue (local).'
    };
    showToast(map[feature] || (isZh ? 'AI 不可用，已切换到离线模式' : 'AI unavailable. Switched to offline mode.'));
}

// ==================== PWA 安装逻辑 ====================

let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    // 禁止浏览器默认的安装提示
    e.preventDefault();
    deferredPrompt = e;
    
    // 如果用户是活跃用户且还没安装过，显示提示
    const hasPrompted = localStorage.getItem('cleartalk_install_prompted');
    if (!hasPrompted) {
        setTimeout(() => {
            document.getElementById('install-prompt').classList.remove('hidden');
        }, 5000); // 5秒后显示，避免干扰首屏
    }
});

function hideInstallPrompt() {
    document.getElementById('install-prompt').classList.add('hidden');
    localStorage.setItem('cleartalk_install_prompted', 'true');
}

async function triggerInstall() {
    if (!deferredPrompt) return;
    
    document.getElementById('install-prompt').classList.add('hidden');
    deferredPrompt.prompt();
    
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA] 安装选择: ${outcome}`);
    
    deferredPrompt = null;
    localStorage.setItem('cleartalk_install_prompted', 'true');
}

window.addEventListener('appinstalled', () => {
    console.log('[PWA] 已安装到桌面');
    document.getElementById('install-prompt').classList.add('hidden');
});

// ==================== 网络异常捕获 ====================

function updateOnlineStatus() {
    const indicator = document.getElementById('offline-indicator');
    if (navigator.onLine) {
        indicator.classList.add('hidden');
    } else {
        indicator.classList.remove('hidden');
    }
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

// ==================== 初始化 ====================

// 检测是否直接打开文件
function checkProtocol() {
    if (window.location.protocol === 'file:') {
        const warning = document.getElementById('protocol-warning');
        if (warning) {
            warning.classList.remove('hidden');
        }
        console.warn('[ClearTalk] 检测到直接打开文件，API 功能将不可用');
        return false;
    }
    return true;
}

// 显示解决方法
function showProtocolHelp() {
    alert(`解决方法（任选一种）：

方法1：使用 VS Code Live Server 插件
1. 在 VS Code 中安装 "Live Server" 插件
2. 右键点击 index.html → "Open with Live Server"

方法2：使用 Python 临时服务器
1. 打开命令行，进入项目目录
2. 运行：python -m http.server 8080
3. 浏览器访问：http://localhost:8080

方法3：使用 Node.js http-server
1. 安装：npm install -g http-server
2. 运行：http-server -p 8080
3. 浏览器访问：http://localhost:8080

方法4：双击 start.bat（Windows）
运行后会自动打开浏览器访问正确地址`);
}

document.addEventListener('DOMContentLoaded', () => {
    checkProtocol();
    updateOnlineStatus(); // 初始化网络状态
    UserService.init();
    
    // 初始化主题
    const savedTheme = Storage.loadTheme();
    setTheme(savedTheme);

    // 初始化语言和设置
    const savedSettings = JSON.parse(localStorage.getItem(Storage.SETTINGS_KEY) || '{"language":"zh","hapticEnabled":true}');
    state.language = savedSettings.language || 'zh';
    state.hapticEnabled = savedSettings.hapticEnabled !== undefined ? savedSettings.hapticEnabled : true;
    applyLanguage();
    
    // 监听导航触发触感
    const originalNavigateTo = window.navigateTo;
    window.navigateTo = function(page) {
        triggerHaptic();
        
        // 如果是特殊页面，执行特殊渲染
        if (page === 'settings') {
            renderSettings();
        } else if (page === 'lab') {
            renderLabPage();
        } else if (page === 'scene-market') {
            renderSceneMarket();
        }

        return originalNavigateTo.apply(this, arguments);
    };

    // 监听系统主题变化
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (state.theme === 'auto') {
            applyTheme('auto');
        }
    });

    // 启动时强制规范页面可见性：只显示首页，避免固定元素残留到其它页面
    state.currentPage = 'home';
    if (!state.pageHistory) state.pageHistory = ['home'];
    document.querySelectorAll('.page').forEach(p => {
        if (p.id === 'page-home') {
            p.classList.add('active');
            p.classList.remove('hidden');
        } else {
            p.classList.remove('active');
            p.classList.add('hidden');
        }
    });

    renderHome();
});

function setTheme(theme) {
    state.theme = theme;
    Storage.saveTheme(theme);
    applyTheme(theme);
}

// 短语管理函数
function showAddPhraseModal() {
    const content = prompt('请输入短语内容:');
    if (!content) return;
    const category = prompt('请输入分类 (可选, 默认为通用):') || '通用';
    
    Storage.addPhrase(content, category);
    renderUserPage();
    showToast('添加短语成功');
}

function deletePhrase(id) {
    if (!confirm('确定要删除这条短语吗？')) return;
    Storage.deletePhrase(id);
    renderUserPage();
    showToast('删除短语成功');
}

function applyTheme(theme) {
    const isDark = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    
    // 更新 UI 上的切换按钮状态（如果在用户中心页面）
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) themeSelect.value = theme;
}

// 键盘快捷键
document.addEventListener('keydown', (e) => {
    // ESC 关闭弹窗
    if (e.key === 'Escape') {
        closeModal();
    }
});
