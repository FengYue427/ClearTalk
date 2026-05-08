/**
 * 场景模板定义
 */

export const FIELD_TYPES = {
  TEXT: 'text',
  TEXTAREA: 'textarea',
  NUMBER: 'number',
  SELECT: 'select',
  BOOLEAN: 'boolean',
  DATE: 'date'
};

// 语气定义
export const TONES = {
  soft: {
    key: 'soft',
    label: '温和',
    enLabel: 'Soft',
    translationKey: 'scene.tone.soft',
    promptModifierKey: 'scene.tone.soft.modifier'
  },
  neutral: {
    key: 'neutral',
    label: '中立',
    enLabel: 'Neutral',
    translationKey: 'scene.tone.neutral',
    promptModifierKey: 'scene.tone.neutral.modifier'
  },
  firm: {
    key: 'firm',
    label: '坚定',
    enLabel: 'Firm',
    translationKey: 'scene.tone.firm',
    promptModifierKey: 'scene.tone.firm.modifier'
  }
};

// 内置场景模板
export const BUILTIN_SCENES = [
  {
    id: 'ask_leave',
    name: '请假申请',
    description: '向上级申请请假，说明原因和时间安排',
    translationKey: 'scene.ask_leave.name',
    descriptionKey: 'scene.ask_leave.description',
    category: '职场沟通',
    icon: '🏖️',
    fields: [
      {
        key: 'reason',
        type: FIELD_TYPES.TEXTAREA,
        label: '请假原因',
        placeholder: '简要说明请假原因',
        required: true,
        translationKey: 'scene.field.reason',
        placeholderKey: 'scene.field.reason.placeholder'
      },
      {
        key: 'duration',
        type: FIELD_TYPES.TEXT,
        label: '请假时间',
        placeholder: '例如：2天（3月15日-16日）',
        required: true,
        translationKey: 'scene.field.duration',
        placeholderKey: 'scene.field.duration.placeholder'
      },
      {
        key: 'handover',
        type: FIELD_TYPES.TEXTAREA,
        label: '工作交接',
        placeholder: '说明已安排或已完成的工作交接',
        required: false,
        translationKey: 'scene.field.handover',
        placeholderKey: 'scene.field.handover.placeholder'
      }
    ]
  },
  {
    id: 'request_raise',
    name: '申请加薪',
    description: '向领导申请调薪，展示你的价值和贡献',
    translationKey: 'scene.request_raise.name',
    descriptionKey: 'scene.request_raise.description',
    category: '职场沟通',
    icon: '💰',
    fields: [
      {
        key: 'achievement',
        type: FIELD_TYPES.TEXTAREA,
        label: '工作成绩',
        placeholder: '列举近期的工作成果和贡献',
        required: true,
        translationKey: 'scene.field.achievement',
        placeholderKey: 'scene.field.achievement.placeholder'
      },
      {
        key: 'market_value',
        type: FIELD_TYPES.TEXT,
        label: '市场薪资',
        placeholder: '说明同行业类似岗位的薪资水平',
        required: false,
        translationKey: 'scene.field.market_value',
        placeholderKey: 'scene.field.market_value.placeholder'
      },
      {
        key: 'expectation',
        type: FIELD_TYPES.TEXT,
        label: '期望涨幅',
        placeholder: '例如：希望涨幅20%',
        required: true,
        translationKey: 'scene.field.expectation',
        placeholderKey: 'scene.field.expectation.placeholder'
      }
    ]
  },
  {
    id: 'reject_request',
    name: '拒绝请求',
    description: '委婉但坚定地拒绝不合理的请求，同时保持良好关系',
    translationKey: 'scene.reject_request.name',
    descriptionKey: 'scene.reject_request.description',
    category: '职场沟通',
    icon: '🙅',
    fields: [
      {
        key: 'request',
        type: FIELD_TYPES.TEXTAREA,
        label: '对方请求',
        placeholder: '对方提出了什么请求',
        required: true,
        translationKey: 'scene.field.refuse_request.request',
        placeholderKey: 'scene.field.refuse_request.request.placeholder'
      },
      {
        key: 'reason',
        type: FIELD_TYPES.TEXTAREA,
        label: '拒绝原因',
        placeholder: '为什么不能答应',
        required: true,
        translationKey: 'scene.field.refuse_request.reason',
        placeholderKey: 'scene.field.refuse_request.reason.placeholder'
      },
      {
        key: 'alternative',
        type: FIELD_TYPES.TEXTAREA,
        label: '替代方案',
        placeholder: '可以提供的其他帮助（可选）',
        required: false,
        translationKey: 'scene.field.refuse_request.alternative',
        placeholderKey: 'scene.field.refuse_request.alternative.placeholder'
      }
    ]
  },
  {
    id: 'follow_up',
    name: '跟进催促',
    description: '礼貌地跟进未回复的消息或催促事项进度',
    translationKey: 'scene.follow_up.name',
    descriptionKey: 'scene.follow_up.description',
    category: '职场沟通',
    icon: '📬',
    fields: [
      {
        key: 'matter',
        type: FIELD_TYPES.TEXT,
        label: '跟进事项',
        placeholder: '需要跟进的具体事项',
        required: true,
        translationKey: 'scene.field.follow_up.matter',
        placeholderKey: 'scene.field.follow_up.matter.placeholder'
      },
      {
        key: 'previous',
        type: FIELD_TYPES.TEXTAREA,
        label: '此前沟通',
        placeholder: '之前沟通的时间节点和内容',
        required: false,
        translationKey: 'scene.field.follow_up.previous',
        placeholderKey: 'scene.field.follow_up.previous.placeholder'
      },
      {
        key: 'deadline',
        type: FIELD_TYPES.TEXT,
        label: '期望时间',
        placeholder: '希望在什么时候得到回复或完成',
        required: true,
        translationKey: 'scene.field.follow_up.deadline',
        placeholderKey: 'scene.field.follow_up.deadline.placeholder'
      }
    ]
  },
  {
    id: 'express_complaint',
    name: '表达不满',
    description: '合理表达对产品/服务/工作的不满',
    translationKey: 'scene.express_complaint.name',
    descriptionKey: 'scene.express_complaint.description',
    category: '日常沟通',
    icon: '😤',
    fields: [
      {
        key: 'issue',
        type: FIELD_TYPES.TEXTAREA,
        label: '具体问题',
        placeholder: '详细描述遇到的问题',
        required: true,
        translationKey: 'scene.field.complaint.issue',
        placeholderKey: 'scene.field.complaint.issue.placeholder'
      },
      {
        key: 'impact',
        type: FIELD_TYPES.TEXTAREA,
        label: '造成的影响',
        placeholder: '这个问题对你造成了什么影响',
        required: true,
        translationKey: 'scene.field.complaint.impact',
        placeholderKey: 'scene.field.complaint.impact.placeholder'
      },
      {
        key: 'expectation',
        type: FIELD_TYPES.TEXTAREA,
        label: '期望解决',
        placeholder: '希望得到怎样的处理结果',
        required: true,
        translationKey: 'scene.field.complaint.expectation',
        placeholderKey: 'scene.field.complaint.expectation.placeholder'
      }
    ]
  },
  {
    id: 'ask_for_help',
    name: '请求帮助',
    description: '向他人寻求帮助，清晰表达需求和感谢',
    translationKey: 'scene.ask_for_help.name',
    descriptionKey: 'scene.ask_for_help.description',
    category: '日常社交',
    icon: '🆘',
    fields: [
      {
        key: 'situation',
        type: FIELD_TYPES.TEXTAREA,
        label: '当前情况',
        placeholder: '描述你面临的困难或需要帮助的背景',
        required: true,
        translationKey: 'scene.field.ask_for_help.situation',
        placeholderKey: 'scene.field.ask_for_help.situation.placeholder'
      },
      {
        key: 'specific_help',
        type: FIELD_TYPES.TEXTAREA,
        label: '具体帮助',
        placeholder: '明确说明需要对方提供什么帮助',
        required: true,
        translationKey: 'scene.field.ask_for_help.specific_help',
        placeholderKey: 'scene.field.ask_for_help.specific_help.placeholder'
      },
      {
        key: 'timeframe',
        type: FIELD_TYPES.TEXT,
        label: '时间要求',
        placeholder: '什么时候需要（可选）',
        required: false,
        translationKey: 'scene.field.ask_for_help.timeframe',
        placeholderKey: 'scene.field.ask_for_help.timeframe.placeholder'
      }
    ]
  },
  {
    id: 'reschedule',
    name: '改期协商',
    description: '需要推迟或改期已约定的会议或约会',
    translationKey: 'scene.reschedule.name',
    descriptionKey: 'scene.reschedule.description',
    category: '日常社交',
    icon: '📅',
    fields: [
      {
        key: 'original',
        type: FIELD_TYPES.TEXT,
        label: '原定时间',
        placeholder: '原定的会议/约会时间',
        required: true,
        translationKey: 'scene.field.reschedule.original',
        placeholderKey: 'scene.field.reschedule.original.placeholder'
      },
      {
        key: 'reason',
        type: FIELD_TYPES.TEXTAREA,
        label: '改期原因',
        placeholder: '简要说明需要改期的原因',
        required: true,
        translationKey: 'scene.field.reschedule.reason',
        placeholderKey: 'scene.field.reschedule.reason.placeholder'
      },
      {
        key: 'alternatives',
        type: FIELD_TYPES.TEXTAREA,
        label: '可选时间',
        placeholder: '提供几个可选的新时间',
        required: true,
        translationKey: 'scene.field.reschedule.alternatives',
        placeholderKey: 'scene.field.reschedule.alternatives.placeholder'
      }
    ]
  },
  {
    id: 'apologize',
    name: '道歉解释',
    description: '为失误或延误真诚道歉，并提出补救方案',
    translationKey: 'scene.apologize.name',
    descriptionKey: 'scene.apologize.description',
    category: '日常社交',
    icon: '🙏',
    fields: [
      {
        key: 'mistake',
        type: FIELD_TYPES.TEXTAREA,
        label: '具体过失',
        placeholder: '清楚说明发生了什么',
        required: true,
        translationKey: 'scene.field.apologize.mistake',
        placeholderKey: 'scene.field.apologize.mistake.placeholder'
      },
      {
        key: 'impact',
        type: FIELD_TYPES.TEXTAREA,
        label: '造成影响',
        placeholder: '认识到给对方带来了什么影响',
        required: true,
        translationKey: 'scene.field.apologize.impact',
        placeholderKey: 'scene.field.apologize.impact.placeholder'
      },
      {
        key: 'remedy',
        type: FIELD_TYPES.TEXTAREA,
        label: '补救措施',
        placeholder: '将采取什么措施弥补',
        required: true,
        translationKey: 'scene.field.apologize.remedy',
        placeholderKey: 'scene.field.apologize.remedy.placeholder'
      }
    ]
  },
  {
    id: 'introduce_self',
    name: '自我介绍',
    description: '在新场合简洁有力地介绍自己，留下良好印象',
    translationKey: 'scene.introduce_self.name',
    descriptionKey: 'scene.introduce_self.description',
    category: '社交场合',
    icon: '🎤',
    fields: [
      {
        key: 'context',
        type: FIELD_TYPES.TEXT,
        label: '场合背景',
        placeholder: '例如：新入职/行业交流会',
        required: true,
        translationKey: 'scene.field.introduce_self.context',
        placeholderKey: 'scene.field.introduce_self.context.placeholder'
      },
      {
        key: 'background',
        type: FIELD_TYPES.TEXTAREA,
        label: '个人背景',
        placeholder: '工作/学习背景，专业技能',
        required: true,
        translationKey: 'scene.field.introduce_self.background',
        placeholderKey: 'scene.field.introduce_self.background.placeholder'
      },
      {
        key: 'purpose',
        type: FIELD_TYPES.TEXTAREA,
        label: '来此目的',
        placeholder: '参与这次活动的目的或期望',
        required: false,
        translationKey: 'scene.field.introduce_self.purpose',
        placeholderKey: 'scene.field.introduce_self.purpose.placeholder'
      }
    ]
  },
  {
    id: 'networking',
    name: '建立联系',
    description: '在社交或职业场合主动结识有价值的人脉',
    translationKey: 'scene.networking.name',
    descriptionKey: 'scene.networking.description',
    category: '社交场合',
    icon: '🤝',
    fields: [
      {
        key: 'how_know',
        type: FIELD_TYPES.TEXT,
        label: '如何得知',
        placeholder: '在哪里/通过谁了解到对方',
        required: true,
        translationKey: 'scene.field.networking.how_know',
        placeholderKey: 'scene.field.networking.how_know.placeholder'
      },
      {
        key: 'interest',
        type: FIELD_TYPES.TEXTAREA,
        label: '关注领域',
        placeholder: '对方什么经历/成就吸引你',
        required: true,
        translationKey: 'scene.field.networking.interest',
        placeholderKey: 'scene.field.networking.interest.placeholder'
      },
      {
        key: 'value_exchange',
        type: FIELD_TYPES.TEXTAREA,
        label: '价值交换',
        placeholder: '你能提供什么价值/寻求什么合作',
        required: true,
        translationKey: 'scene.field.networking.value_exchange',
        placeholderKey: 'scene.field.networking.value_exchange.placeholder'
      }
    ]
  }
];

// 场景分类 - 使用翻译键
export const CATEGORIES = [
  { id: 'all', name: 'All', translationKey: 'home.categories.all' },
  { id: '职场沟通', name: 'Work', translationKey: 'home.categories.work' },
  { id: '日常沟通', name: 'Daily', translationKey: 'home.categories.daily' },
  { id: '日常社交', name: 'Social', translationKey: 'home.categories.daily_social' },
  { id: '社交场合', name: 'Social Occasion', translationKey: 'home.categories.social_occasion' },
  { id: '社交场景', name: 'Social', translationKey: 'home.categories.social' },
  { id: 'custom', name: 'Custom', translationKey: 'home.custom.scenes' }
];

// 根据分类获取场景
export function getScenesByCategory(categoryId, customScenes = []) {
  if (categoryId === 'all') {
    return [...BUILTIN_SCENES, ...customScenes];
  }
  if (categoryId === 'custom') {
    return customScenes;
  }
  return BUILTIN_SCENES.filter(s => s.category === categoryId);
}

// 搜索场景
export function searchScenes(query, customScenes = []) {
  const allScenes = [...BUILTIN_SCENES, ...customScenes];
  const lowerQuery = query.toLowerCase();
  
  return allScenes.filter(scene => 
    scene.name.toLowerCase().includes(lowerQuery) ||
    scene.description.toLowerCase().includes(lowerQuery) ||
    scene.category.toLowerCase().includes(lowerQuery)
  );
}

// 获取场景详情
export function getSceneById(id, customScenes = []) {
  return BUILTIN_SCENES.find(s => s.id === id) || 
         customScenes.find(s => s.id === id);
}
