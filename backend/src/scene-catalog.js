/**
 * 内置场景目录（供 AI 粘贴分类等使用）
 */
const fs = require('fs');
const path = require('path');

let cache;

function loadCatalog() {
  if (cache) return cache;
  const jsonPath = path.join(__dirname, '../../assets/scenes/builtin.json');
  const scenes = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  cache = scenes.map((s) => ({
    id: s.id,
    name: s.name,
    category: s.category,
    description: s.description || ''
  }));
  return cache;
}

module.exports = { loadCatalog };
