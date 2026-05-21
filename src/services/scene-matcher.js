/**
 * 根据粘贴的文本推荐匹配场景（关键词 + 名称/描述）
 */

import { BUILTIN_SCENES } from '../scenes/index.js';

/** 场景关键词权重表 */
const SCENE_KEYWORDS = {
  leave_request: ['请假', '休假', '年假', '病假', '调休', '事假'],
  urgent_leave: ['紧急请假', '突发', '临时请假', '急假'],
  overtime_confirm: ['加班', '调休', '补休', '工时'],
  salary_dispute: ['工资', '绩效', '薪资', '扣款', '加班费'],
  resignation_confirm: ['离职', '辞职', '交接', '最后工作日'],
  refund_rejected: ['退款', '退货', '拒退', '申诉', '不退款'],
  quality_issue: ['质量问题', '货不对板', '瑕疵', '损坏', '与描述不符'],
  auto_renewal: ['自动续费', '扣费', '续订', '未提醒'],
  food_delivery_issue: ['外卖', '漏送', '送错', '变质', '美团', '饿了么'],
  deposit_refund: ['押金', '退租', '租房押金'],
  maintenance_delay: ['维修', '物业', '报修', '漏水', '推诿'],
  loan_reminder: ['借款', '还钱', '催还', '欠款'],
  clarification: ['误会', '澄清', '说明事实', '误解'],
  noise_complaint: ['噪音', '扰民', '装修声', '音响'],
  parking_occupied: ['车位', '占用车位', '挪车'],
  package_issue: ['快递', '包裹', '延误', '丢件', '损坏'],
  pet_complaint: ['宠物', '吠叫', '遛狗', '粪便'],
  gym_refund: ['健身房', '退卡', '健身卡'],
  beauty_refund: ['美容', '理发', '预付卡', '充值'],
  driving_school_refund: ['驾校', '学车', '退费'],
  course_refund: ['课程', '培训班', '网课', '退费'],
  school_leave: ['学校请假', '班主任', '学生请假'],
  tutor_arrange: ['家教', '培训', '调课', '换老师'],
  appointment_change: ['预约', '改期', '取消预约', '挂号'],
  medical_record_inquiry: ['检查报告', '化验', 'CT', '核磁', '体检结果'],
  referral_request: ['转诊', '转院', '转诊单'],
  complaint_suggestion: ['投诉', '建议', '12345', '街道办'],
  admin_inquiry: ['办事', '咨询', '材料', '户籍', '社保'],
  document_progress: ['证件', '办理进度', '护照', '身份证', '房产证'],
  work_handover: ['交接', '离职交接', '工作交接', '调岗'],
  meeting_followup: ['会议纪要', '会议跟进', '待办', 'action item'],
  subscription_cancel: ['取消订阅', '退订', '取消会员', '关闭自动续费'],
  insurance_claim: ['保险', '理赔', '报案', '保单'],
  neighbor_notice: ['邻居', '装修通知', '邻里', '噪音告知'],
  wedding_invite_reply: ['婚礼', '婚宴', '邀请函', '出席婚礼']
};

/**
 * @param {string} text 用户粘贴的消息
 * @param {object[]} scenes 候选场景列表
 * @param {number} limit 返回条数
 * @returns {{ scene: object, score: number, matchedKeywords: string[] }[]}
 */
export function matchScenesFromText(text, scenes = BUILTIN_SCENES, limit = 3) {
  const input = String(text || '').trim();
  if (!input) return [];

  const lower = input.toLowerCase();

  const scored = scenes.map((scene) => {
    let score = 0;
    const matchedKeywords = [];

    const keywords = SCENE_KEYWORDS[scene.id] || [];
    for (const kw of keywords) {
      if (lower.includes(kw.toLowerCase())) {
        score += 4;
        matchedKeywords.push(kw);
      }
    }

    if (lower.includes(scene.name.toLowerCase())) {
      score += 6;
      matchedKeywords.push(scene.name);
    }

    const descParts = scene.description.split(/[，。、\s]+/).filter((w) => w.length >= 2);
    for (const part of descParts) {
      if (lower.includes(part.toLowerCase())) {
        score += 2;
        matchedKeywords.push(part);
      }
    }

    return { scene, score, matchedKeywords: [...new Set(matchedKeywords)] };
  });

  return scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function getBestSceneMatch(text, scenes = BUILTIN_SCENES) {
  const matches = matchScenesFromText(text, scenes, 1);
  return matches[0] || null;
}
