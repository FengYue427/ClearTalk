import { describe, it, expect } from 'vitest';
import { matchScenesFromText, getBestSceneMatch } from './scene-matcher.js';

describe('scene-matcher', () => {
  it('matches leave request from pasted text', () => {
    const matches = matchScenesFromText('王经理您好，我想下周请两天年假，家里有事');
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].scene.id).toBe('leave_request');
  });

  it('matches refund scenario', () => {
    const matches = matchScenesFromText('平台拒绝了我的退款申请，订单12345');
    const ids = matches.map((m) => m.scene.id);
    expect(ids).toContain('refund_rejected');
  });

  it('returns empty for unrelated text', () => {
    const matches = matchScenesFromText('今天天气真好');
    expect(matches.length).toBe(0);
  });

  it('getBestSceneMatch returns top match', () => {
    const best = getBestSceneMatch('外卖漏送了菜品，要求全额退款');
    expect(best?.scene.id).toBe('food_delivery_issue');
  });
});
