/**
 * session-manager.js
 * CEO Directive Automation — Session Memory Manager
 * 
 * Port từ Signal Bot chat_engine.py Session Memory → Node.js
 * 
 * Chức năng:
 *   1. In-memory session store — 20 messages/user
 *   2. Persistent storage — JSON file, sống qua restart
 *   3. Auto-expire — xóa session sau 24h không hoạt động
 *   4. Session stats — cho /whoami hoặc admin
 *   5. Max sessions — evict cũ nhất khi vượt giới hạn
 * 
 * Usage:
 *   const session = require('./session-manager');
 *   session.add(userId, 'user', 'Chào em');
 *   session.add(userId, 'assistant', 'Dạ, chào Thầy...');
 *   const history = session.getForAPI(userId);  // → OpenAI format
 *   const stats = session.getStats(userId);
 */

const fs = require('fs');
const path = require('path');

// ===== CONFIG =====
const MAX_HISTORY = 20;       // 20 messages = 10 cặp user/assistant
const MAX_SESSIONS = 50;      // Giới hạn RAM
const EXPIRE_HOURS = 24;      // Tự xóa sau 24h không hoạt động
const PERSIST_DIR = path.join(__dirname, '..', 'data', 'sessions');
const PERSIST_FILE = path.join(PERSIST_DIR, 'sessions.json');

// ===== IN-MEMORY STORE =====
// Map<userId, { messages: [], lastActive: ISO string }>
const _sessions = new Map();
let _loaded = false;

// ===== PERSISTENCE =====

/** Đảm bảo thư mục sessions tồn tại */
function ensureDir() {
  if (!fs.existsSync(PERSIST_DIR)) {
    fs.mkdirSync(PERSIST_DIR, { recursive: true });
  }
}

/** Load sessions từ disk khi khởi động */
function loadFromDisk() {
  if (_loaded) return;
  _loaded = true;

  try {
    if (fs.existsSync(PERSIST_FILE)) {
      const raw = fs.readFileSync(PERSIST_FILE, 'utf-8');
      const data = JSON.parse(raw);
      let restored = 0;

      for (const [userId, session] of Object.entries(data)) {
        // Skip expired sessions
        if (isExpired(session.lastActive)) continue;
        _sessions.set(userId, session);
        restored++;
      }

      if (restored > 0) {
        console.log(`[SESSION] ☑ Restored ${restored} sessions from disk`);
      }
    }
  } catch (err) {
    console.error(`[SESSION] ⚠ Load error: ${err.message}`);
  }
}

/** Save sessions ra disk — gọi sau mỗi thay đổi */
function saveToDisk() {
  try {
    ensureDir();
    const data = {};
    for (const [userId, session] of _sessions.entries()) {
      data[userId] = session;
    }
    fs.writeFileSync(PERSIST_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`[SESSION] ⚠ Save error: ${err.message}`);
  }
}

/** Kiểm tra session đã expire chưa */
function isExpired(lastActive) {
  if (!lastActive) return true;
  const diff = Date.now() - new Date(lastActive).getTime();
  return diff > EXPIRE_HOURS * 60 * 60 * 1000;
}

// ===== PUBLIC API =====

/**
 * Lấy session của user. Tự tạo nếu chưa có.
 * @param {string|number} userId
 * @returns {{ messages: Array, lastActive: string }}
 */
function getSession(userId) {
  loadFromDisk();
  const key = String(userId);

  if (!_sessions.has(key)) {
    // Evict oldest nếu vượt limit
    if (_sessions.size >= MAX_SESSIONS) {
      const oldestKey = _sessions.keys().next().value;
      _sessions.delete(oldestKey);
      console.log(`[SESSION] Evicted oldest session (user ${oldestKey})`);
    }
    _sessions.set(key, {
      messages: [],
      lastActive: new Date().toISOString(),
    });
  }

  return _sessions.get(key);
}

/**
 * Thêm message vào session.
 * @param {string|number} userId
 * @param {'user'|'assistant'} role
 * @param {string} content
 */
function add(userId, role, content) {
  const session = getSession(userId);

  session.messages.push({
    role,
    content,
    timestamp: new Date().toISOString(),
  });

  // Trim nếu quá dài
  while (session.messages.length > MAX_HISTORY) {
    session.messages.shift();
  }

  session.lastActive = new Date().toISOString();

  // Auto-save
  saveToDisk();
}

/**
 * Lấy session ở format OpenAI/Gemini API.
 * Chỉ trả về role + content (bỏ timestamp).
 * @param {string|number} userId
 * @returns {Array<{ role: string, content: string }>}
 */
function getForAPI(userId) {
  const session = getSession(userId);
  return session.messages.map(m => ({
    role: m.role,
    content: m.content,
  }));
}

/**
 * Lấy thống kê session.
 * @param {string|number} userId
 * @returns {{ messageCount, userMessages, started, lastActive, durationMin }}
 */
function getStats(userId) {
  loadFromDisk();
  const key = String(userId);

  if (!_sessions.has(key) || _sessions.get(key).messages.length === 0) {
    return {
      messageCount: 0,
      userMessages: 0,
      started: null,
      lastActive: null,
      durationMin: 0,
    };
  }

  const session = _sessions.get(key);
  const msgs = session.messages;
  const started = msgs[0]?.timestamp;
  const last = msgs[msgs.length - 1]?.timestamp;
  const durationMs = started && last ? new Date(last) - new Date(started) : 0;

  return {
    messageCount: msgs.length,
    userMessages: msgs.filter(m => m.role === 'user').length,
    started,
    lastActive: session.lastActive,
    durationMin: Math.round(durationMs / 60000),
  };
}

/**
 * Xóa session của user.
 * @param {string|number} userId
 */
function clear(userId) {
  const key = String(userId);
  _sessions.delete(key);
  saveToDisk();
  console.log(`[SESSION] Cleared session for user ${key}`);
}

/**
 * Xóa tất cả sessions đã expire.
 * Gọi định kỳ trong scheduler.
 * @returns {number} Số sessions đã xóa
 */
function cleanup() {
  loadFromDisk();
  let cleaned = 0;

  for (const [key, session] of _sessions.entries()) {
    if (isExpired(session.lastActive)) {
      _sessions.delete(key);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    saveToDisk();
    console.log(`[SESSION] Cleaned ${cleaned} expired sessions`);
  }

  return cleaned;
}

/**
 * Tổng quan tất cả sessions (cho admin).
 * @returns {{ totalSessions, totalMessages, activeSessions }}
 */
function overview() {
  loadFromDisk();
  let totalMessages = 0;
  let activeSessions = 0;

  for (const [, session] of _sessions.entries()) {
    totalMessages += session.messages.length;
    if (!isExpired(session.lastActive)) activeSessions++;
  }

  return {
    totalSessions: _sessions.size,
    totalMessages,
    activeSessions,
  };
}

// ===== EXPORTS =====
module.exports = {
  getSession,
  add,
  getForAPI,
  getStats,
  clear,
  cleanup,
  overview,
  MAX_HISTORY,
  EXPIRE_HOURS,
};
