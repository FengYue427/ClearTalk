/**
 * 从 builtin.json 生成 sitemap.xml（含场景落地 hash URL）
 * 运行: node scripts/generate-sitemap.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const baseUrl = process.env.SITE_URL || 'https://cleartalk.app';
const scenes = JSON.parse(
  fs.readFileSync(path.join(root, 'assets/scenes/builtin.json'), 'utf8')
);

const urls = [
  { loc: `${baseUrl}/`, priority: '1.0' },
  ...scenes.map((s) => ({
    loc: `${baseUrl}/#/scene/${s.id}`,
    priority: '0.7'
  }))
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <changefreq>weekly</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`;

fs.writeFileSync(path.join(root, 'public/sitemap.xml'), xml, 'utf8');
console.log(`Sitemap: ${urls.length} URLs → public/sitemap.xml`);
