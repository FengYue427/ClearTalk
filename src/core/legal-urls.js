/**
 * 法务静态页 URL（随应用语言切换中英版本）
 */
import { state } from './state.js';
import { LEGAL_CONTACT_EMAIL } from './legal-constants.js';

const EN_PAGES = {
  '/privacy.html': '/privacy-en.html',
  '/terms.html': '/terms-en.html',
  '/disclaimer.html': '/disclaimer-en.html'
};

export function getLegalPageUrl(path) {
  if (!path) return path;
  if (state.language === 'en' && EN_PAGES[path]) {
    return EN_PAGES[path];
  }
  return path;
}

export function getLegalContactMailto() {
  return `mailto:${LEGAL_CONTACT_EMAIL}`;
}

export { LEGAL_CONTACT_EMAIL };
