/**
 * 数据层入口：优先 SQLite（Linux/Render），不可用时回退 JSON
 */
function pick() {
  if (process.env.USE_JSON_DB === '1') {
    return require('./database-json');
  }
  try {
    require.resolve('better-sqlite3');
    return require('./database-sqlite');
  } catch {
    console.warn('[DB] better-sqlite3 不可用，使用 JSON 文件库（设置 USE_JSON_DB=1 可显式指定）');
    return require('./database-json');
  }
}

module.exports = pick();
