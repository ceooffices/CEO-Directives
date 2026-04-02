/**
 * tests/unit/test-scheduler-state.js
 * Scheduler State Management Tests
 * 
 * diffSnapshots, recordWfRun, getLastRunSummary
 * Chạy: node tests/unit/test-scheduler-state.js
 */

const assert = require('assert');
const { diffSnapshots, recordWfRun, getLastRunSummary, EMPTY_STATE }
  = require('../../automation/lib/scheduler-state');

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

console.log('\n📊 SCHEDULER STATE TESTS');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// ===== DIFF SNAPSHOTS =====
console.log('\n▸ diffSnapshots:');

test('No changes → hasChanges=false', () => {
  const prev = { counts: { pending: 5, confirmed: 3, overdue: 2, active: 10 }, directiveIds: {} };
  const curr = { ...prev, timestamp: new Date().toISOString() };
  const diff = diffSnapshots(prev, curr);
  assert.strictEqual(diff.hasChanges, false);
  assert.strictEqual(diff.summary, 'Không có thay đổi');
});

test('Pending increases → hasChanges=true + correct message', () => {
  const prev = { counts: { pending: 5, confirmed: 3, overdue: 2, active: 10 }, directiveIds: {} };
  const curr = { counts: { pending: 8, confirmed: 3, overdue: 2, active: 10 }, directiveIds: {}, timestamp: new Date().toISOString() };
  const diff = diffSnapshots(prev, curr);
  assert.strictEqual(diff.hasChanges, true);
  assert(diff.summary.includes('pending'), 'Should mention pending');
  assert(diff.summary.includes('5 → 8'), 'Should show 5 → 8');
});

test('Overdue decreases → shows decrease', () => {
  const prev = { counts: { pending: 5, confirmed: 3, overdue: 5, active: 10 }, directiveIds: {} };
  const curr = { counts: { pending: 5, confirmed: 3, overdue: 3, active: 10 }, directiveIds: {}, timestamp: new Date().toISOString() };
  const diff = diffSnapshots(prev, curr);
  assert.strictEqual(diff.hasChanges, true);
  assert(diff.summary.includes('📉'), 'Should show decrease emoji');
});

test('New directive IDs detected', () => {
  const prev = {
    counts: { pending: 1 },
    directiveIds: { pending: ['id-1'], overdue: [], confirmed: [] },
  };
  const curr = {
    counts: { pending: 2 },
    directiveIds: { pending: ['id-1', 'id-2'], overdue: [], confirmed: [] },
    timestamp: new Date().toISOString(),
  };
  const diff = diffSnapshots(prev, curr);
  assert.strictEqual(diff.newPendingCount, 1);
  assert(diff.summary.includes('1 chỉ đạo mới chờ duyệt'));
});

test('Empty prev state (first run) → counts as changes', () => {
  const prev = { ...EMPTY_STATE };
  const curr = {
    counts: { pending: 3, confirmed: 0, overdue: 1, active: 4 },
    directiveIds: { pending: ['a', 'b', 'c'], overdue: ['d'], confirmed: [] },
    timestamp: new Date().toISOString(),
  };
  const diff = diffSnapshots(prev, curr);
  assert.strictEqual(diff.hasChanges, true);
  assert.strictEqual(diff.newPendingCount, 3);
});

test('Time diff calculated correctly', () => {
  const prev = {
    counts: { pending: 0 },
    directiveIds: {},
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 min ago
  };
  const curr = {
    counts: { pending: 0 },
    directiveIds: {},
    timestamp: new Date().toISOString(),
  };
  const diff = diffSnapshots(prev, curr);
  assert(diff.timeDiffMinutes >= 29 && diff.timeDiffMinutes <= 31,
    `Expected ~30 min, got ${diff.timeDiffMinutes}`);
});

// ===== RECORD WF RUN =====
console.log('\n▸ recordWfRun:');

test('Records WF run with current timestamp', () => {
  const state = { lastWfRuns: {} };
  recordWfRun(state, 'wf1');
  assert(state.lastWfRuns.wf1, 'Should have wf1 entry');
  const diff = Date.now() - new Date(state.lastWfRuns.wf1).getTime();
  assert(diff < 1000, 'Timestamp should be within 1s of now');
});

test('Multiple WF runs coexist', () => {
  const state = { lastWfRuns: {} };
  recordWfRun(state, 'wf1');
  recordWfRun(state, 'wf4');
  assert(state.lastWfRuns.wf1);
  assert(state.lastWfRuns.wf4);
});

test('Creates lastWfRuns if missing', () => {
  const state = {};
  recordWfRun(state, 'wf5');
  assert(state.lastWfRuns.wf5);
});

// ===== GET LAST RUN SUMMARY =====
console.log('\n▸ getLastRunSummary:');

test('Empty state → "Chưa có WF nào chạy"', () => {
  const summary = getLastRunSummary({});
  assert.strictEqual(summary, 'Chưa có WF nào chạy');
});

test('With runs → lists WFs with time ago', () => {
  const state = {
    lastWfRuns: {
      wf1: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 min ago
    },
  };
  const summary = getLastRunSummary(state);
  assert(summary.includes('wf1'), 'Should mention wf1');
  assert(summary.includes('5 phút'), 'Should show ~5 min');
});

// ===== EMPTY STATE =====
console.log('\n▸ EMPTY_STATE:');

test('EMPTY_STATE has all required fields', () => {
  assert.deepStrictEqual(EMPTY_STATE.counts, { pending: 0, confirmed: 0, overdue: 0, active: 0 });
  assert.strictEqual(EMPTY_STATE.timestamp, null);
  assert.deepStrictEqual(EMPTY_STATE.lastWfRuns, {});
  assert.strictEqual(EMPTY_STATE.nextCheckMinutes, 30);
});

// ===== SUMMARY =====
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`📋 Scheduler State: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
