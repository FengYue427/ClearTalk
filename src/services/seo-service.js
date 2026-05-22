/**
 * 页面 SEO：动态更新 title / description / canonical
 */
import { state } from '../core/state.js';
import { t } from '../core/i18n.js';
import { getSceneName, getSceneDescription } from '../scenes/scene-l10n.js';

const SITE_NAME = 'ClearTalk';

export const Seo = {
  updateForPage(page) {
    const base = typeof window !== 'undefined' ? window.location.origin : '';

    let title = t('app.name');
    let description = t('app.description');
    let canonical = `${base}/`;

    switch (page) {
      case 'scene-detail':
        if (state.currentScene) {
          title = `${getSceneName(state.currentScene)} - ${SITE_NAME}`;
          description = getSceneDescription(state.currentScene) || description;
          canonical = `${base}/#scene/${state.currentScene.id}`;
        }
        break;
      case 'market':
        title = `${t('market.title')} - ${SITE_NAME}`;
        break;
      case 'dialogue':
        title = `${t('dialogue.title')} - ${SITE_NAME}`;
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
