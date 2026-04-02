/**
 * tests/unit/test-session-manager.js
 * Session Manager Tests
 * 
 * In-memory session store, expiry, API format, stats, cleanup
 * Chạy: node tests/unit/test-session-manager.js
 */

const assert = require('assert');
const session = require('../../automation/session-manager');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ☑ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✖ ${name}`);
    console.error(`    → ${err.message}`);
    failed++;
  }
}

// Test user IDs (unique per run to avoid cross-contamination)
const UID = `test_${Date.now()}`;

console.log('\n💬 SESSION MANAGER TESTS');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// ===== ADD & RETRIEVE =====
console.log('\n▸ Add & retrieve:');

test('New session starts empty', () => {
  const s = session.getSession(UID);
  assert.strictEqual(s.messages.length, 0);
});

test('Can add user message', () => {
  session.add(UID, 'user', 'Chào em');
  const s = session.getSession(UID);
  assert.strictEqual(s.messages.length, 1);
  assert.strictEqual(s.messages[0].role, 'user');
  assert.strictEqual(s.messages[0].content, 'Chào em');
});

test('Can add assistant message', () => {
  session.add(UID, 'assistant', 'Dạ chào Thầy');
  const s = session.getSession(UID);
  assert.strictEqual(s.messages.length, 2);
  assert.strictEqual(s.messages[1].role, 'assistant');
});

test('Messages have timestamps', () => {
  const s = session.getSession(UID);
  assert(s.messages[0].timestamp, 'Should have timestamp');
  const ts = new Date(s.messages[0].timestamp);
  assert(!isNaN(ts.getTime()), 'Timestamp should be valid ISO date');
});

// ===== API FORMAT =====
console.log('\n▸ API format:');

test('getForAPI returns role+content only (no timestamp)', () => {
  const api = session.getForAPI(UID);
  assert.strictEqual(api.length, 2);
  assert.strictEqual(api[0].role, 'user');
  assert.strictEqual(api[0].content, 'Chào em');
  assert.strictEqual(api[0].timestamp, undefined, 'Should not include timestamp');
});

// ===== MAX HISTORY TRIM =====
console.log('\n▸ Max history trimming:');

test(`Messages trimmed at MAX_HISTORY=${session.MAX_HISTORY}`, () => {
  const uid2 = `test_trim_${Date.now()}`;
  // Add more than MAX_HISTORY messages
  for (let i = 0; i < session.MAX_HISTORY + 5; i++) {
    session.add(uid2, 'user', `Msg ${i}`);
  }
  const s = session.getSession(uid2);
  assert.strictEqual(s.messages.length, session.MAX_HISTORY,
    `Should be exactly ${session.MAX_HISTORY}`);
  // First message should be the 6th one (0-4 trimmed)
  assert.strictEqual(s.messages[0].content, 'Msg 5',
    'Oldest messages should be trimmed');
  session.clear(uid2);
});

// ===== STATS =====
console.log('\n▸ Stats:');

test('getStats returns correct counts', () => {
  const stats = session.getStats(UID);
  assert.strictEqual(stats.messageCount, 2);
  assert.strictEqual(stats.userMessages, 1);
  assert(stats.started, 'Should have start time');
  assert(stats.lastActive, 'Should have lastActive');
});

test('Non-existent user → empty stats', () => {
  const stats = session.getStats('nonexistent_user_xyz');
  assert.strictEqual(stats.messageCount, 0);
  assert.strictEqual(stats.started, null);
});

// ===== CLEAR =====
console.log('\n▸ Clear:');

test('clear() removes session', () => {
  session.clear(UID);
  const s = session.getSession(UID);
  assert.strictEqual(s.messages.length, 0, 'Session should be empty after clear');
});

// ===== OVERVIEW =====
console.log('\n▸ Overview:');

test('overview() returns aggregate stats', () => {
  const ov = session.overview();
  assert(typeof ov.totalSessions === 'number');
  assert(typeof ov.totalMessages === 'number');
  assert(typeof ov.activeSessions === 'number');
});

// ===== CLEANUP =====
console.log('\n▸ Cleanup:');

test('cleanup() runs without error', () => {
  const cleaned = session.cleanup();
  assert(typeof cleaned === 'number', 'Should return number of cleaned sessions');
});

// Clean test data
session.clear(UID);

// ===== SUMMARY =====
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`📋 Session Manager: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
