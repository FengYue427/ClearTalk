/**
 * 同步法务静态页：public/ 为源，更新根目录旧副本与联系邮箱占位
 * 运行: npm run legal:sync
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const publicDir = path.join(root, 'public');

const CONTACT = '18562177928@163.com';

const copies = [
  ['privacy.html', 'privacy-policy.html'],
  ['terms.html', 'terms-of-service.html'],
  ['disclaimer.html', 'disclaimer.html']
];

function patchContact(html) {
  return html
    .replace(/\[您的联系邮箱\]/g, CONTACT)
    .replace(/\[your contact email\]/gi, CONTACT)
    .replace(
      /18562177928@163\.com（法务审阅后可更换为正式客服邮箱）/g,
      CONTACT
    );
}

for (const [srcName, destName] of copies) {
  const src = path.join(publicDir, srcName);
  const dest = path.join(root, destName);
  if (!fs.existsSync(src)) {
    console.error('Missing', src);
    process.exit(1);
  }
  let html = fs.readFileSync(src, 'utf8');
  html = patchContact(html);
  fs.writeFileSync(dest, html, 'utf8');
  console.log('Synced', srcName, '→', destName);
}

for (const name of [
  'privacy.html',
  'privacy-en.html',
  'terms.html',
  'terms-en.html',
  'disclaimer.html',
  'disclaimer-en.html'
]) {
  const p = path.join(publicDir, name);
  const html = patchContact(fs.readFileSync(p, 'utf8'));
  fs.writeFileSync(p, html, 'utf8');
  console.log('Patched contact in public/', name);
}

console.log('Done. Contact:', CONTACT);
