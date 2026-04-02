/**
 * tests/unit/test-intent-detector.js
 * Intent Detection Engine Tests
 * 
 * Test 12 intent types + edge cases
 * Chạy: node tests/unit/test-intent-detector.js
 */

const assert = require('assert');
const { detectIntent, getQuickReply, intentToCommand, extractWorkflowName, INTENT_TYPES } 
  = require('../../automation/intent-detector');

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

console.log('\n🧠 INTENT DETECTOR TESTS');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// ===== GREETING =====
console.log('\n▸ Greeting intent:');

test('Exact "chào" → GREETING', () => {
  const r = detectIntent('chào');
  assert.strictEqual(r.type, INTENT_TYPES.GREETING);
  assert.strictEqual(r.needsAI, false);
});

test('"Chào em" (case insensitive) → GREETING', () => {
  const r = detectIntent('Chào em');
  assert.strictEqual(r.type, INTENT_TYPES.GREETING);
});

test('"Hello" → GREETING', () => {
  assert.strictEqual(detectIntent('hello').type, INTENT_TYPES.GREETING);
});

test('"hi em" → GREETING', () => {
  assert.strictEqual(detectIntent('hi em').type, INTENT_TYPES.GREETING);
});

test('Greeting has quickReply (not null)', () => {
  const intent = detectIntent('chào');
  const reply = getQuickReply(intent, { firstName: 'Kha' });
  assert(reply !== null, 'Quick reply should not be null for greeting');
  assert(reply.includes('Kha'), 'Should include user name');
});

// ===== THANKS =====
console.log('\n▸ Thanks intent:');

test('"cảm ơn em" → THANKS', () => {
  assert.strictEqual(detectIntent('cảm ơn em').type, INTENT_TYPES.THANKS);
});

test('"tks" → THANKS', () => {
  assert.strictEqual(detectIntent('tks').type, INTENT_TYPES.THANKS);
});

test('"ok em" → THANKS', () => {
  assert.strictEqual(detectIntent('ok em').type, INTENT_TYPES.THANKS);
});

// ===== IDENTITY =====
console.log('\n▸ Identity intent:');

test('"em là ai" → IDENTITY', () => {
  assert.strictEqual(detectIntent('em là ai').type, INTENT_TYPES.IDENTITY);
});

test('"who are you" → IDENTITY', () => {
  assert.strictEqual(detectIntent('who are you').type, INTENT_TYPES.IDENTITY);
});

// ===== STATUS =====
console.log('\n▸ Status intent:');

test('"tình hình thế nào" → STATUS', () => {
  assert.strictEqual(detectIntent('tình hình thế nào').type, INTENT_TYPES.STATUS);
});

test('"trạng thái hệ thống" → STATUS', () => {
  assert.strictEqual(detectIntent('trạng thái hệ thống').type, INTENT_TYPES.STATUS);
});

test('STATUS returns null quickReply (needs bridge)', () => {
  const intent = detectIntent('trạng thái');
  assert.strictEqual(getQuickReply(intent), null, 'Should be null (route to bridge)');
});

// ===== OVERDUE =====
console.log('\n▸ Overdue intent:');

test('"có gì quá hạn không" → OVERDUE', () => {
  assert.strictEqual(detectIntent('có gì quá hạn không').type, INTENT_TYPES.OVERDUE);
});

test('"chỉ đạo nào chậm" → OVERDUE', () => {
  assert.strictEqual(detectIntent('chỉ đạo nào chậm').type, INTENT_TYPES.OVERDUE);
});

// ===== REPORT =====
console.log('\n▸ Report intent:');

test('"báo cáo tuần" → REPORT', () => {
  assert.strictEqual(detectIntent('báo cáo tuần').type, INTENT_TYPES.REPORT);
});

test('"cho tổng hợp" → REPORT', () => {
  assert.strictEqual(detectIntent('cho tổng hợp').type, INTENT_TYPES.REPORT);
});

// ===== RUN_WF =====
console.log('\n▸ Run workflow intent:');

test('"chạy wf1" → RUN_WF with params.workflow=wf1', () => {
  const r = detectIntent('chạy wf1');
  assert.strictEqual(r.type, INTENT_TYPES.RUN_WF);
  assert.strictEqual(r.params.workflow, 'wf1');
});

test('"chạy tất cả" → RUN_WF with params.workflow=all', () => {
  const r = detectIntent('chạy tất cả');
  assert.strictEqual(r.type, INTENT_TYPES.RUN_WF);
  assert.strictEqual(r.params.workflow, 'all');
});

test('"gửi email duyệt" → RUN_WF with wf1', () => {
  const r = detectIntent('gửi email duyệt');
  assert.strictEqual(r.type, INTENT_TYPES.RUN_WF);
  assert.strictEqual(r.params.workflow, 'wf1');
});

// ===== AI_ANALYZE =====
console.log('\n▸ AI Analyze intent:');

test('"phân tích rủi ro" → AI_ANALYZE', () => {
  assert.strictEqual(detectIntent('phân tích rủi ro').type, INTENT_TYPES.AI_ANALYZE);
});

test('"đánh giá xu hướng" → AI_ANALYZE', () => {
  assert.strictEqual(detectIntent('đánh giá xu hướng').type, INTENT_TYPES.AI_ANALYZE);
});

// ===== SEARCH =====
console.log('\n▸ Search intent:');

test('"tìm chỉ đạo tuyển sinh" → SEARCH', () => {
  const r = detectIntent('tìm chỉ đạo tuyển sinh');
  assert.strictEqual(r.type, INTENT_TYPES.SEARCH);
  assert.strictEqual(r.needsAI, true);
});

// ===== COST =====
console.log('\n▸ Cost intent:');

test('"tốn bao nhiêu tiền api" → COST', () => {
  assert.strictEqual(detectIntent('tốn bao nhiêu tiền api').type, INTENT_TYPES.COST);
  assert.strictEqual(detectIntent('tốn bao nhiêu tiền api').needsAI, false);
});

// ===== HELP =====
console.log('\n▸ Help intent:');

test('"em làm được gì" → HELP', () => {
  assert.strictEqual(detectIntent('em làm được gì').type, INTENT_TYPES.HELP);
});

// ===== UNKNOWN / FALLBACK =====
console.log('\n▸ Unknown / fallback:');

test('Free text "Ngày mai thời tiết thế nào" → AI_QUESTION', () => {
  const r = detectIntent('Ngày mai thời tiết thế nào');
  assert.strictEqual(r.type, INTENT_TYPES.AI_QUESTION);
  assert.strictEqual(r.needsAI, true);
});

test('Empty string → UNKNOWN', () => {
  assert.strictEqual(detectIntent('').type, INTENT_TYPES.UNKNOWN);
});

test('null → UNKNOWN', () => {
  assert.strictEqual(detectIntent(null).type, INTENT_TYPES.UNKNOWN);
});

test('Command /start → UNKNOWN with isCommand=true', () => {
  const r = detectIntent('/start');
  assert.strictEqual(r.type, INTENT_TYPES.UNKNOWN);
  assert.strictEqual(r.params.isCommand, true);
  assert.strictEqual(r.needsAI, false);
});

// ===== intentToCommand =====
console.log('\n▸ Intent → Command mapping:');

test('STATUS → /trangthai', () => {
  assert.strictEqual(intentToCommand({ type: INTENT_TYPES.STATUS }), '/trangthai');
});

test('OVERDUE → /quahan', () => {
  assert.strictEqual(intentToCommand({ type: INTENT_TYPES.OVERDUE }), '/quahan');
});

test('AI_QUESTION → null', () => {
  assert.strictEqual(intentToCommand({ type: INTENT_TYPES.AI_QUESTION }), null);
});

// ===== extractWorkflowName =====
console.log('\n▸ Workflow name extraction:');

test('"chạy wf4" → wf4', () => {
  assert.strictEqual(extractWorkflowName('chạy wf4'), 'wf4');
});

test('"nhắc nhở" → wf5', () => {
  assert.strictEqual(extractWorkflowName('nhắc nhở đầu mối'), 'wf5');
});

test('"abc xyz" → null', () => {
  assert.strictEqual(extractWorkflowName('abc xyz'), null);
});

// ===== SUMMARY =====
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`📋 Intent Detector: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
