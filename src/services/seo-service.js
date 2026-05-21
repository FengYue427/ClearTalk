/**
 * 页面 SEO：动态更新 title / description / canonical
 */
import { state } from '../core/state.js';

const SITE_NAME = 'ClearTalk';
const DEFAULT_DESC_ZH =
  'AI 沟通助手：请假、维权、邻里、政务等 35+ 场景，一键生成得体文案。';
const DEFAULT_DESC_EN =
  'AI communication assistant with 35+ scenarios for work, complaints, and daily life.';

export const Seo = {
  updateForPage(page) {
    const isZh = state.language !== 'en';
    const base = typeof window !== 'undefined' ? window.location.origin : '';

    let title = SITE_NAME;
    let description = isZh ? DEFAULT_DESC_ZH : DEFAULT_DESC_EN;
    let canonical = `${base}/`;

    switch (page) {
      case 'scene-detail':
        if (state.currentScene) {
          title = `${state.currentScene.name} - ${SITE_NAME}`;
          description = state.currentScene.description || description;
          canonical = `${base}/#scene/${state.currentScene.id}`;
        }
        break;
      case 'market':
        title = isZh ? `场景市场 - ${SITE_NAME}` : `Scene Market - ${SITE_NAME}`;
        break;
      case 'dialogue':
        title = isZh ? `对话模拟 - ${SITE_NAME}` : `Dialogue Practice - ${SITE_NAME}`;
        break;
      default:
        break;
    }

    document.title = title;
    setMeta('description', description);
    setMeta('og:title', title, true);
    setMeta('og:description', description, true);
    setLinkCanonical(canonical);
  }
};

function setMeta(name, content, property = false) {
  const attr = property ? 'property' : 'name';
  let el = document.querySelector(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setLinkCanonical(href) {
  let el = document.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.rel = 'canonical';
    document.head.appendChild(el);
  }
  el.href = href;
}

export default Seo;
