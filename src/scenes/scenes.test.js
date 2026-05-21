import { describe, it, expect } from 'vitest';
import { BUILTIN_SCENES, getSceneById, getScenesByCategory, CATEGORIES } from './index.js';

describe('builtin scenes', () => {
  it('has 35+ builtin scenes', () => {
    expect(BUILTIN_SCENES.length).toBeGreaterThanOrEqual(35);
  });

  it('each scene has required fields', () => {
    for (const scene of BUILTIN_SCENES) {
      expect(scene.id).toBeTruthy();
      expect(scene.name).toBeTruthy();
      expect(scene.category).toBeTruthy();
      expect(scene.fields.length).toBeGreaterThan(0);
    }
  });

  it('finds leave_request scene', () => {
    const scene = getSceneById('leave_request');
    expect(scene?.name).toBe('请假申请');
  });

  it('categories include all scene categories', () => {
    const categoryIds = CATEGORIES.map((c) => c.id);
    const sceneCats = new Set(BUILTIN_SCENES.map((s) => s.category));
    for (const cat of sceneCats) {
      expect(categoryIds).toContain(cat);
    }
  });

  it('filters by category', () => {
    const work = getScenesByCategory('职场沟通');
    expect(work.length).toBeGreaterThan(0);
    expect(work.every((s) => s.category === '职场沟通')).toBe(true);
  });
});
