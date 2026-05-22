/**
 * SQLite 数据层（替代 LowDB JSON）
 */
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../data');
const dbPath = process.env.SQLITE_PATH || path.join(dataDir, 'cleartalk.db');
const jsonPath = path.join(dataDir, 'db.json');

let db;

function parseJson(val, fallback = null) {
  if (val == null) return fallback;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

function initSchema() {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      is_email_verified INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      data_type TEXT NOT NULL,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(user_id, data_type)
    );

    CREATE TABLE IF NOT EXISTS scenes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      icon TEXT,
      fields TEXT,
      likes INTEGER DEFAULT 0,
      uses INTEGER DEFAULT 0,
      is_public INTEGER DEFAULT 1,
      status TEXT DEFAULT 'approved',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS scene_likes (
      scene_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (scene_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS verifications (
      email TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      type TEXT,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      token TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS feedback (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      scene_id TEXT,
      scene_name TEXT,
      tone TEXT,
      reasons TEXT,
      comment TEXT,
      text_preview TEXT,
      user_id TEXT,
      meta TEXT,
      ip_hash TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      user_id TEXT,
      scene_id TEXT,
      meta TEXT,
      ip_hash TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_scenes_public ON scenes(is_public, status);
    CREATE INDEX IF NOT EXISTS idx_events_name ON events(name, created_at);
    CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback(created_at);

    CREATE TABLE IF NOT EXISTS daily_usage (
      subject TEXT NOT NULL,
      usage_date TEXT NOT NULL,
      generate_count INTEGER DEFAULT 0,
      PRIMARY KEY (subject, usage_date)
    );
  `);

  try {
    db.exec('ALTER TABLE users ADD COLUMN is_pro INTEGER DEFAULT 0');
  } catch {
    /* column exists */
  }
}

function migrateFromJsonIfNeeded() {
  if (!fs.existsSync(jsonPath)) return;
  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  if (userCount > 0) return;

  const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (id, username, email, password, is_email_verified, created_at, updated_at)
    VALUES (@id, @username, @email, @password, @is_email_verified, @created_at, @updated_at)
  `);

  for (const u of raw.users || []) {
    insertUser.run({
      id: u.id,
      username: u.username,
      email: u.email,
      password: u.password,
      is_email_verified: u.isEmailVerified ? 1 : 0,
      created_at: u.createdAt,
      updated_at: u.updatedAt || u.createdAt
    });
  }

  for (const d of raw.userData || []) {
    db.prepare(`
      INSERT OR IGNORE INTO user_data (user_id, data_type, data, updated_at)
      VALUES (?, ?, ?, ?)
    `).run(d.userId, d.dataType, JSON.stringify(d.data), d.updatedAt);
  }

  const insertScene = db.prepare(`
    INSERT OR IGNORE INTO scenes (id, user_id, name, description, category, icon, fields, likes, uses, is_public, status, created_at)
    VALUES (@id, @user_id, @name, @description, @category, @icon, @fields, @likes, @uses, @is_public, @status, @created_at)
  `);

  for (const s of raw.scenes || []) {
    insertScene.run({
      id: s.id,
      user_id: s.userId,
      name: s.name,
      description: s.description || '',
      category: s.category || '',
      icon: s.icon || '📝',
      fields: JSON.stringify(s.fields || []),
      likes: s.likes || 0,
      uses: s.uses || 0,
      is_public: s.isPublic !== false ? 1 : 0,
      status: s.status || 'approved',
      created_at: s.createdAt
    });
  }

  for (const l of raw.likes || []) {
    db.prepare(`
      INSERT OR IGNORE INTO scene_likes (scene_id, user_id, created_at) VALUES (?, ?, ?)
    `).run(l.sceneId, l.userId, l.createdAt);
  }

  for (const f of raw.feedback || []) {
    db.prepare(`
      INSERT OR IGNORE INTO feedback (id, type, scene_id, scene_name, tone, reasons, comment, text_preview, user_id, meta, ip_hash, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      f.id || `${Date.now()}`,
      f.type,
      f.sceneId,
      f.sceneName,
      f.tone,
      JSON.stringify(f.reasons || []),
      f.comment || '',
      f.textPreview || '',
      f.userId,
      JSON.stringify(f.meta || {}),
      f.ipHash || '',
      f.createdAt
    );
  }

  console.log('[DB] 已从 db.json 迁移到 SQLite');
}

function rowToUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    password: row.password,
    isEmailVerified: !!row.is_email_verified,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function rowToScene(row, authorName) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    category: row.category,
    icon: row.icon,
    fields: parseJson(row.fields, []),
    likes: row.likes,
    uses: row.uses,
    isPublic: !!row.is_public,
    status: row.status,
    createdAt: row.created_at,
    author: authorName || 'Unknown'
  };
}

const repo = {
  getMode() {
    return 'sqlite';
  },

  init() {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    db = new Database(dbPath);
    initSchema();
    migrateFromJsonIfNeeded();
    console.log(`[DB] SQLite 就绪: ${dbPath}`);
  },

  // --- Users ---
  findUserByUsernameOrEmail(value) {
    return rowToUser(
      db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(value, value)
    );
  },

  findUserByEmail(email) {
    return rowToUser(db.prepare('SELECT * FROM users WHERE email = ?').get(email));
  },

  findUserById(id) {
    return rowToUser(db.prepare('SELECT * FROM users WHERE id = ?').get(id));
  },

  createUser(user) {
    db.prepare(`
      INSERT INTO users (id, username, email, password, is_email_verified, created_at, updated_at)
      VALUES (@id, @username, @email, @password, @is_email_verified, @created_at, @updated_at)
    `).run({
      id: user.id,
      username: user.username,
      email: user.email,
      password: user.password,
      is_email_verified: user.isEmailVerified ? 1 : 0,
      created_at: user.createdAt,
      updated_at: user.updatedAt
    });
    return user;
  },

  updateUser(id, { username, email }) {
    db.prepare('UPDATE users SET username = ?, email = ?, updated_at = ? WHERE id = ?').run(
      username,
      email,
      new Date().toISOString(),
      id
    );
  },

  findUserConflict(id, username, email) {
    return rowToUser(
      db.prepare('SELECT * FROM users WHERE id != ? AND (username = ? OR email = ?)').get(id, username, email)
    );
  },

  // --- Verifications ---
  saveVerification({ email, code, type, expiresAt, createdAt }) {
    db.prepare('DELETE FROM verifications WHERE email = ?').run(email);
    db.prepare(`
      INSERT INTO verifications (email, code, type, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(email, code, type, expiresAt, createdAt);
  },

  findValidVerification(email, code) {
    return db.prepare(`
      SELECT * FROM verifications WHERE email = ? AND code = ? AND expires_at > ?
    `).get(email, code, new Date().toISOString());
  },

  deleteVerification(email) {
    db.prepare('DELETE FROM verifications WHERE email = ?').run(email);
  },

  // --- Password resets ---
  savePasswordReset({ token, email, expiresAt, createdAt }) {
    db.prepare('DELETE FROM password_resets WHERE email = ?').run(email);
    db.prepare(`
      INSERT INTO password_resets (token, email, expires_at, created_at) VALUES (?, ?, ?, ?)
    `).run(token, email, expiresAt, createdAt);
  },

  findPasswordReset(token) {
    return db.prepare('SELECT * FROM password_resets WHERE token = ?').get(token);
  },

  findValidPasswordReset(email, token) {
    return db.prepare(`
      SELECT * FROM password_resets WHERE email = ? AND token = ? AND expires_at > ?
    `).get(email, token, new Date().toISOString());
  },

  deletePasswordResets(email) {
    db.prepare('DELETE FROM password_resets WHERE email = ?').run(email);
  },

  updateUserPassword(email, hashedPassword) {
    db.prepare('UPDATE users SET password = ?, updated_at = ? WHERE email = ?').run(
      hashedPassword,
      new Date().toISOString(),
      email
    );
  },

  updateUserPasswordById(userId, hashedPassword) {
    db.prepare('UPDATE users SET password = ?, updated_at = ? WHERE id = ?').run(
      hashedPassword,
      new Date().toISOString(),
      userId
    );
  },

  deleteUserAccount(userId) {
    const user = db.prepare('SELECT email FROM users WHERE id = ?').get(userId);
    db.prepare('DELETE FROM user_data WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM scene_likes WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM scenes WHERE user_id = ?').run(userId);
    if (user?.email) {
      db.prepare('DELETE FROM verifications WHERE email = ?').run(user.email);
      db.prepare('DELETE FROM password_resets WHERE email = ?').run(user.email);
    }
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  },

  clearUserSyncData(userId) {
    db.prepare('DELETE FROM user_data WHERE user_id = ?').run(userId);
  },

  getPhrases(userId) {
    const row = db.prepare(
      "SELECT data FROM user_data WHERE user_id = ? AND data_type = 'phrases'"
    ).get(userId);
    return row ? parseJson(row.data, []) : [];
  },

  setPhrases(userId, phrases) {
    repo.upsertUserData(userId, 'phrases', phrases, new Date().toISOString());
  },

  // --- Sync ---
  upsertUserData(userId, dataType, data, updatedAt) {
    db.prepare(`
      INSERT INTO user_data (user_id, data_type, data, updated_at) VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id, data_type) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
    `).run(userId, dataType, JSON.stringify(data), updatedAt);
  },

  getUserData(userId) {
    return db.prepare('SELECT * FROM user_data WHERE user_id = ?').all(userId);
  },

  // --- Scenes ---
  listPublicScenes({ sort = 'hot', page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;
    const order =
      sort === 'latest'
        ? 's.created_at DESC'
        : '(s.likes + s.uses * 2) DESC, s.created_at DESC';

    const rows = db.prepare(`
      SELECT s.*, u.username as author_name
      FROM scenes s
      LEFT JOIN users u ON u.id = s.user_id
      WHERE s.is_public = 1 AND s.status = 'approved'
      ORDER BY ${order}
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    return rows.map((r) => rowToScene(r, r.author_name));
  },

  listScenesByUser(userId) {
    return db
      .prepare('SELECT * FROM scenes WHERE user_id = ? ORDER BY created_at DESC')
      .all(userId)
      .map((r) => rowToScene(r));
  },

  findSceneById(id) {
    const row = db.prepare(`
      SELECT s.*, u.username as author_name FROM scenes s
      LEFT JOIN users u ON u.id = s.user_id WHERE s.id = ?
    `).get(id);
    return row ? rowToScene(row, row.author_name) : null;
  },

  createScene(scene) {
    db.prepare(`
      INSERT INTO scenes (id, user_id, name, description, category, icon, fields, likes, uses, is_public, status, created_at)
      VALUES (@id, @user_id, @name, @description, @category, @icon, @fields, 0, 0, @is_public, @status, @created_at)
    `).run({
      id: scene.id,
      user_id: scene.userId,
      name: scene.name,
      description: scene.description || '',
      category: scene.category || '',
      icon: scene.icon || '📝',
      fields: JSON.stringify(scene.fields || []),
      is_public: scene.isPublic !== false ? 1 : 0,
      status: scene.status || 'approved',
      created_at: scene.createdAt
    });
    return scene;
  },

  deleteScene(sceneId, userId) {
    const r = db.prepare('DELETE FROM scenes WHERE id = ? AND user_id = ?').run(sceneId, userId);
    if (r.changes) {
      db.prepare('DELETE FROM scene_likes WHERE scene_id = ?').run(sceneId);
    }
    return r.changes > 0;
  },

  hasLiked(sceneId, userId) {
    return !!db.prepare('SELECT 1 FROM scene_likes WHERE scene_id = ? AND user_id = ?').get(sceneId, userId);
  },

  toggleLike(sceneId, userId) {
    if (repo.hasLiked(sceneId, userId)) {
      db.prepare('DELETE FROM scene_likes WHERE scene_id = ? AND user_id = ?').run(sceneId, userId);
      db.prepare('UPDATE scenes SET likes = MAX(0, likes - 1) WHERE id = ?').run(sceneId);
      return { liked: false };
    }
    db.prepare('INSERT INTO scene_likes (scene_id, user_id, created_at) VALUES (?, ?, ?)').run(
      sceneId,
      userId,
      new Date().toISOString()
    );
    db.prepare('UPDATE scenes SET likes = likes + 1 WHERE id = ?').run(sceneId);
    return { liked: true };
  },

  incrementSceneUse(sceneId, userKey) {
    const key = userKey || 'anon';
    const recent = db.prepare(`
      SELECT 1 FROM events
      WHERE name = 'scene_use' AND scene_id = ? AND ip_hash = ?
      AND created_at > datetime('now', '-1 hour')
    `).get(sceneId, key);

    if (recent) return { counted: false, reason: 'rate_limited' };

    db.prepare('UPDATE scenes SET uses = uses + 1 WHERE id = ?').run(sceneId);
    return { counted: true };
  },

  recordSceneUseEvent(sceneId, userId, ipHash) {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    db.prepare(`
      INSERT INTO events (id, name, user_id, scene_id, meta, ip_hash, created_at)
      VALUES (?, 'scene_use', ?, ?, '{}', ?, ?)
    `).run(id, userId, sceneId, ipHash, new Date().toISOString());
  },

  searchScenes(query, limit = 20) {
    const q = `%${query}%`;
    const rows = db.prepare(`
      SELECT s.*, u.username as author_name FROM scenes s
      LEFT JOIN users u ON u.id = s.user_id
      WHERE s.is_public = 1 AND s.status = 'approved'
      AND (s.name LIKE ? OR s.description LIKE ? OR s.category LIKE ?)
      ORDER BY s.uses DESC LIMIT ?
    `).all(q, q, q, limit);
    return rows.map((r) => rowToScene(r, r.author_name));
  },

  // --- Feedback ---
  insertFeedback(entry) {
    db.prepare(`
      INSERT INTO feedback (id, type, scene_id, scene_name, tone, reasons, comment, text_preview, user_id, meta, ip_hash, created_at)
      VALUES (@id, @type, @scene_id, @scene_name, @tone, @reasons, @comment, @text_preview, @user_id, @meta, @ip_hash, @created_at)
    `).run({
      id: entry.id,
      type: entry.type,
      scene_id: entry.sceneId,
      scene_name: entry.sceneName,
      tone: entry.tone,
      reasons: JSON.stringify(entry.reasons || []),
      comment: entry.comment || '',
      text_preview: entry.textPreview || '',
      user_id: entry.userId,
      meta: JSON.stringify(entry.meta || {}),
      ip_hash: entry.ipHash || '',
      created_at: entry.createdAt
    });
    const max = parseInt(process.env.FEEDBACK_STORE_MAX, 10) || 2000;
    db.prepare(`
      DELETE FROM feedback WHERE id NOT IN (
        SELECT id FROM feedback ORDER BY created_at DESC LIMIT ?
      )
    `).run(max);
  },

  getFeedbackStats() {
    const list = db.prepare('SELECT * FROM feedback ORDER BY created_at DESC LIMIT 2000').all();
    return list.map((f) => ({
      id: f.id,
      type: f.type,
      sceneId: f.scene_id,
      sceneName: f.scene_name,
      tone: f.tone,
      reasons: parseJson(f.reasons, []),
      comment: f.comment,
      textPreview: f.text_preview,
      userId: f.user_id,
      createdAt: f.created_at
    }));
  },

  // --- Events ---
  insertEvent(entry) {
    db.prepare(`
      INSERT INTO events (id, name, user_id, scene_id, meta, ip_hash, created_at)
      VALUES (@id, @name, @user_id, @scene_id, @meta, @ip_hash, @created_at)
    `).run({
      id: entry.id,
      name: entry.name,
      user_id: entry.userId,
      scene_id: entry.sceneId,
      meta: JSON.stringify(entry.meta || {}),
      ip_hash: entry.ipHash || '',
      created_at: entry.createdAt
    });
  },

  getEventStats(days = 7) {
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const byName = db.prepare(`
      SELECT name, COUNT(*) as count FROM events WHERE created_at >= ? GROUP BY name ORDER BY count DESC
    `).all(since);
    const byScene = db.prepare(`
      SELECT scene_id, COUNT(*) as count FROM events
      WHERE created_at >= ? AND scene_id IS NOT NULL
      GROUP BY scene_id ORDER BY count DESC LIMIT 10
    `).all(since);
    return { byName, byScene, since };
  },

  getStats() {
    return {
      users: db.prepare('SELECT COUNT(*) as c FROM users').get().c,
      scenes: db.prepare('SELECT COUNT(*) as c FROM scenes').get().c,
      feedback: db.prepare('SELECT COUNT(*) as c FROM feedback').get().c,
      events: db.prepare('SELECT COUNT(*) as c FROM events').get().c
    };
  },

  isUserPro(userId) {
    const row = db.prepare('SELECT is_pro FROM users WHERE id = ?').get(userId);
    return !!(row && row.is_pro);
  },

  getDailyGenerateCount(subject, date) {
    const row = db.prepare(
      'SELECT generate_count FROM daily_usage WHERE subject = ? AND usage_date = ?'
    ).get(subject, date);
    return row?.generate_count || 0;
  },

  incrementDailyGenerate(subject, date) {
    db.prepare(`
      INSERT INTO daily_usage (subject, usage_date, generate_count) VALUES (?, ?, 1)
      ON CONFLICT(subject, usage_date) DO UPDATE SET generate_count = generate_count + 1
    `).run(subject, date);
  }
};

module.exports = repo;
