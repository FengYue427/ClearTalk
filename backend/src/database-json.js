/**
 * LowDB JSON 回退（Windows 无 native 编译或 USE_JSON_DB=1）
 */
const fs = require('fs');
const path = require('path');
const dataDir = path.join(__dirname, '../data');
const jsonPath = path.join(dataDir, 'db.json');

const defaultData = {
  users: [],
  userData: [],
  scenes: [],
  likes: [],
  feedback: [],
  events: [],
  verifications: [],
  passwordResets: [],
  dailyUsage: []
};

let db;

async function persist() {
  await db.write();
}

function sceneWithAuthor(s, users) {
  const author = users.find((u) => u.id === s.userId);
  return { ...s, author: author?.username || 'Unknown' };
}

const repo = {
  getMode() {
    return 'json';
  },

  init() {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    db = { data: { ...defaultData } };
    if (fs.existsSync(jsonPath)) {
      try {
        db.data = { ...defaultData, ...JSON.parse(fs.readFileSync(jsonPath, 'utf8')) };
      } catch {
        db.data = { ...defaultData };
      }
    } else {
      writeFileSyncSafe();
    }
    console.log(`[DB] JSON 就绪: ${jsonPath}`);
  },

  findUserByUsernameOrEmail(value) {
    return db.data.users.find((u) => u.username === value || u.email === value) || null;
  },

  findUserByEmail(email) {
    return db.data.users.find((u) => u.email === email) || null;
  },

  findUserById(id) {
    return db.data.users.find((u) => u.id === id) || null;
  },

  createUser(user) {
    db.data.users.push(user);
    writeFileSyncSafe();
    return user;
  },

  updateUser(id, { username, email }) {
    const u = db.data.users.find((x) => x.id === id);
    if (u) {
      u.username = username;
      u.email = email;
      u.updatedAt = new Date().toISOString();
      writeFileSyncSafe();
    }
  },

  findUserConflict(id, username, email) {
    return db.data.users.find((u) => u.id !== id && (u.username === username || u.email === email)) || null;
  },

  saveVerification(v) {
    db.data.verifications = (db.data.verifications || []).filter((x) => x.email !== v.email);
    db.data.verifications.push(v);
    writeFileSyncSafe();
  },

  findValidVerification(email, code) {
    return (db.data.verifications || []).find(
      (v) => v.email === email && v.code === code && new Date(v.expiresAt) > new Date()
    );
  },

  deleteVerification(email) {
    db.data.verifications = (db.data.verifications || []).filter((v) => v.email !== email);
    writeFileSyncSafe();
  },

  savePasswordReset(r) {
    db.data.passwordResets = (db.data.passwordResets || []).filter((x) => x.email !== r.email);
    db.data.passwordResets.push(r);
    writeFileSyncSafe();
  },

  findPasswordReset(token) {
    return (db.data.passwordResets || []).find((r) => r.token === token);
  },

  findValidPasswordReset(email, token) {
    return (db.data.passwordResets || []).find(
      (r) => r.email === email && r.token === token && new Date(r.expiresAt) > new Date()
    );
  },

  deletePasswordResets(email) {
    db.data.passwordResets = (db.data.passwordResets || []).filter((r) => r.email !== email);
    writeFileSyncSafe();
  },

  updateUserPassword(email, hashedPassword) {
    const u = db.data.users.find((x) => x.email === email);
    if (u) {
      u.password = hashedPassword;
      u.updatedAt = new Date().toISOString();
      writeFileSyncSafe();
    }
  },

  upsertUserData(userId, dataType, data, updatedAt) {
    const existing = db.data.userData.find((d) => d.userId === userId && d.dataType === dataType);
    if (existing) {
      existing.data = data;
      existing.updatedAt = updatedAt;
    } else {
      db.data.userData.push({ userId, dataType, data, updatedAt });
    }
    writeFileSyncSafe();
  },

  getUserData(userId) {
    return db.data.userData
      .filter((d) => d.userId === userId)
      .map((d) => ({
        data_type: d.dataType,
        data: JSON.stringify(d.data),
        updated_at: d.updatedAt
      }));
  },

  listPublicScenes({ sort = 'hot', page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;
    let list = db.data.scenes.filter((s) => s.isPublic !== false && (s.status || 'approved') === 'approved');
    if (sort === 'latest') {
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else {
      list.sort((a, b) => (b.likes || 0) + (b.uses || 0) * 2 - ((a.likes || 0) + (a.uses || 0) * 2));
    }
    return list.slice(offset, offset + limit).map((s) => sceneWithAuthor(s, db.data.users));
  },

  listScenesByUser(userId) {
    return db.data.scenes.filter((s) => s.userId === userId).map((s) => sceneWithAuthor(s, db.data.users));
  },

  findSceneById(id) {
    const s = db.data.scenes.find((x) => x.id === id);
    return s ? sceneWithAuthor(s, db.data.users) : null;
  },

  createScene(scene) {
    const row = { likes: 0, uses: 0, isPublic: true, status: 'approved', ...scene };
    db.data.scenes.push(row);
    writeFileSyncSafe();
    return row;
  },

  deleteScene(sceneId, userId) {
    const idx = db.data.scenes.findIndex((s) => s.id === sceneId && s.userId === userId);
    if (idx === -1) return false;
    db.data.scenes.splice(idx, 1);
    db.data.likes = (db.data.likes || []).filter((l) => l.sceneId !== sceneId);
    writeFileSyncSafe();
    return true;
  },

  hasLiked(sceneId, userId) {
    return !!(db.data.likes || []).find((l) => l.sceneId === sceneId && l.userId === userId);
  },

  toggleLike(sceneId, userId) {
    if (repo.hasLiked(sceneId, userId)) {
      db.data.likes = (db.data.likes || []).filter((l) => !(l.sceneId === sceneId && l.userId === userId));
      const s = db.data.scenes.find((x) => x.id === sceneId);
      if (s) s.likes = Math.max(0, (s.likes || 0) - 1);
      writeFileSyncSafe();
      return { liked: false };
    }
    db.data.likes = db.data.likes || [];
    db.data.likes.push({ sceneId, userId, createdAt: new Date().toISOString() });
    const s = db.data.scenes.find((x) => x.id === sceneId);
    if (s) s.likes = (s.likes || 0) + 1;
    writeFileSyncSafe();
    return { liked: true };
  },

  incrementSceneUse(sceneId, userKey) {
    const key = userKey || 'anon';
    const recent = (db.data.events || []).find(
      (e) =>
        e.name === 'scene_use' &&
        e.sceneId === sceneId &&
        e.ipHash === key &&
        Date.now() - new Date(e.createdAt).getTime() < 3600000
    );
    if (recent) return { counted: false, reason: 'rate_limited' };
    const s = db.data.scenes.find((x) => x.id === sceneId);
    if (s) s.uses = (s.uses || 0) + 1;
    writeFileSyncSafe();
    return { counted: true };
  },

  recordSceneUseEvent(sceneId, userId, ipHash) {
    db.data.events = db.data.events || [];
    db.data.events.push({
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: 'scene_use',
      userId,
      sceneId,
      meta: {},
      ipHash,
      createdAt: new Date().toISOString()
    });
    writeFileSyncSafe();
  },

  searchScenes(query, limit = 20) {
    const q = query.toLowerCase();
    return db.data.scenes
      .filter(
        (s) =>
          s.isPublic !== false &&
          (s.name?.toLowerCase().includes(q) ||
            s.description?.toLowerCase().includes(q) ||
            s.category?.toLowerCase().includes(q))
      )
      .sort((a, b) => (b.uses || 0) - (a.uses || 0))
      .slice(0, limit)
      .map((s) => sceneWithAuthor(s, db.data.users));
  },

  insertFeedback(entry) {
    db.data.feedback = db.data.feedback || [];
    db.data.feedback.unshift(entry);
    const max = parseInt(process.env.FEEDBACK_STORE_MAX, 10) || 2000;
    if (db.data.feedback.length > max) db.data.feedback.length = max;
    writeFileSyncSafe();
  },

  getFeedbackStats() {
    return (db.data.feedback || []).slice(0, 2000);
  },

  insertEvent(entry) {
    db.data.events = db.data.events || [];
    db.data.events.push(entry);
    writeFileSyncSafe();
  },

  getEventStats(days = 7) {
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const events = (db.data.events || []).filter((e) => e.createdAt >= since);
    const byNameMap = {};
    const bySceneMap = {};
    for (const e of events) {
      byNameMap[e.name] = (byNameMap[e.name] || 0) + 1;
      if (e.sceneId) bySceneMap[e.sceneId] = (bySceneMap[e.sceneId] || 0) + 1;
    }
    const byName = Object.entries(byNameMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    const byScene = Object.entries(bySceneMap)
      .map(([scene_id, count]) => ({ scene_id, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    return { byName, byScene, since };
  },

  getStats() {
    return {
      users: db.data.users.length,
      scenes: db.data.scenes.length,
      feedback: (db.data.feedback || []).length,
      events: (db.data.events || []).length
    };
  },

  isUserPro(userId) {
    const u = db.data.users.find((x) => x.id === userId);
    return !!(u && u.isPro);
  },

  getDailyGenerateCount(subject, date) {
    const row = (db.data.dailyUsage || []).find(
      (d) => d.subject === subject && d.usageDate === date
    );
    return row?.generateCount || 0;
  },

  incrementDailyGenerate(subject, date) {
    db.data.dailyUsage = db.data.dailyUsage || [];
    const row = db.data.dailyUsage.find((d) => d.subject === subject && d.usageDate === date);
    if (row) row.generateCount += 1;
    else db.data.dailyUsage.push({ subject, usageDate: date, generateCount: 1 });
    writeFileSyncSafe();
  }
};

function writeFileSyncSafe() {
  fs.writeFileSync(jsonPath, JSON.stringify(db.data, null, 2), 'utf8');
}

module.exports = repo;
