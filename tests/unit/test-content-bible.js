/**
 * tests/unit/test-content-bible.js
 * Content Bible Enforcement Tests
 * 
 * Kiểm tra: emoji filtering, forbidden words, CTA enforcement, xưng hô
 * Chạy: node tests/unit/test-content-bible.js
 */

const assert = require('assert');
const { enforceOutput, validateMessage, getSystemPrompt, ALLOWED_EMOJIS, FORBIDDEN_WORDS }
  = require('../../automation/content-bible');

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

console.log('\n📖 CONTENT BIBLE TESTS');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// ===== EMOJI ENFORCEMENT =====
console.log('\n▸ Emoji enforcement:');

test('✅ replaced by ☑', () => {
  assert.strictEqual(enforceOutput('Hoàn thành ✅'), 'Hoàn thành ☑');
});

test('❌ replaced by ✖', () => {
  const output = enforceOutput('Thất bại ❌');
  assert(output.includes('✖'), 'Should contain ✖');
  assert(output.includes('chưa đạt kỳ vọng'), 'Should replace forbidden word');
});

test('🚀 replaced by ►', () => {
  assert.strictEqual(enforceOutput('Bắt đầu 🚀'), 'Bắt đầu ►');
});

test('Multiple emoji replacements in one string', () => {
  const input = '✅ Xong, 🔧 Sửa, 📈 Tăng';
  const output = enforceOutput(input);
  assert(!output.includes('✅'), '✅ should be replaced');
  assert(!output.includes('🔧'), '🔧 should be replaced');
  assert(!output.includes('📈'), '📈 should be replaced');
  assert(output.includes('☑'), 'Should have ☑');
  assert(output.includes('▫️'), 'Should have ▫️');
  assert(output.includes('►'), 'Should have ►');
});

test('Allowed emojis are NOT replaced', () => {
  const input = '☑ Xong, 📌 Quan trọng, ⏳ Đợi, ► Tiếp';
  const output = enforceOutput(input);
  assert.strictEqual(input, output, 'Allowed emojis should stay unchanged');
});

// ===== FORBIDDEN WORDS =====
console.log('\n▸ Forbidden words:');

test('"hậu quả" → "tác động"', () => {
  assert.strictEqual(enforceOutput('Hậu quả nghiêm trọng'), 'tác động nghiêm trọng');
});

test('"lỗi của" → "cần cải thiện ở"', () => {
  const output = enforceOutput('Đây là lỗi của bộ phận A');
  assert(output.includes('cần cải thiện ở'), 'Should replace "lỗi của"');
  assert(!output.includes('lỗi của'), 'Original should be gone');
});

test('"thất bại" → "chưa đạt kỳ vọng"', () => {
  const output = enforceOutput('Dự án thất bại');
  assert(output.includes('chưa đạt kỳ vọng'));
});

test('"không thể" → "cần điều kiện bổ sung để"', () => {
  const output = enforceOutput('Không thể hoàn thành');
  assert(output.includes('cần điều kiện bổ sung để'));
});

// ===== CTA ENFORCEMENT =====
console.log('\n▸ CTA enforcement:');

test('Adds CTA when missing', () => {
  const output = enforceOutput('Phân tích hoàn tất. Dữ liệu cho thấy tiến độ tốt.', {
    addCTA: true,
    ctaText: '► /phantich để phân tích lại',
  });
  assert(output.includes('► /phantich'), 'CTA should be appended');
});

test('Does NOT add CTA when ► already present', () => {
  const input = 'Phân tích xong ► /quahan để xem tiếp';
  const output = enforceOutput(input, {
    addCTA: true,
    ctaText: '► /phantich thêm',
  });
  assert(!output.includes('/phantich'), 'Should not duplicate CTA');
});

test('Does NOT add CTA when addCTA=false', () => {
  const output = enforceOutput('Phân tích xong.', { addCTA: false });
  assert(!output.includes('►'), 'No CTA when addCTA=false');
});

// ===== VALIDATE MESSAGE =====
console.log('\n▸ Message validation:');

test('Clean message → no violations', () => {
  const v = validateMessage('Dạ thưa Thầy, con đã hoàn thành. ► /trangthai');
  assert.strictEqual(v.length, 0, 'Should have no violations');
});

test('Forbidden word → FORBIDDEN_WORD violation', () => {
  const v = validateMessage('Đây là hậu quả của việc chậm trễ');
  assert(v.some(vi => vi.rule === 'FORBIDDEN_WORD'));
});

test('Wrong pronoun "Bạn" → WRONG_ADDRESS violation', () => {
  const v = validateMessage('Bạn cần hoàn thành nhanh hơn');
  assert(v.some(vi => vi.rule === 'WRONG_ADDRESS'));
});

test('Wrong self-ref "Tôi" → WRONG_SELF_REF violation', () => {
  const v = validateMessage('Tôi đã kiểm tra dữ liệu xong');
  assert(v.some(vi => vi.rule === 'WRONG_SELF_REF'));
});

test('Long message without CTA → MISSING_CTA violation', () => {
  const longText = 'A'.repeat(200);
  const v = validateMessage(longText);
  assert(v.some(vi => vi.rule === 'MISSING_CTA'));
});

test('Short message without CTA → no MISSING_CTA', () => {
  const v = validateMessage('OK');
  assert(!v.some(vi => vi.rule === 'MISSING_CTA'), 'Short messages exempt from CTA');
});

test('Null/empty → no violations', () => {
  assert.strictEqual(validateMessage(null).length, 0);
  assert.strictEqual(validateMessage('').length, 0);
});

// ===== SYSTEM PROMPTS =====
console.log('\n▸ System prompts:');

test('Analysis prompt contains Gravity identity', () => {
  const p = getSystemPrompt('analysis');
  assert(p.includes('Gravity'), 'Should identify as Gravity');
  assert(p.includes('Con'), 'Should use "con" self-reference');
});

test('Report prompt contains 5T format', () => {
  const p = getSystemPrompt('report');
  assert(p.includes('5T'), 'Report prompt should mention 5T');
  assert(p.includes('T1'), 'Should list T1');
  assert(p.includes('T4'), 'Should list T4');
});

test('Invalid type → defaults to question prompt', () => {
  const p = getSystemPrompt('nonexistent_type');
  assert(p.includes('Trả lời câu hỏi CEO'));
});

// ===== EDGE CASES =====
console.log('\n▸ Edge cases:');

test('enforceOutput with null → returns null', () => {
  assert.strictEqual(enforceOutput(null), null);
});

test('enforceOutput with empty string → returns empty string', () => {
  assert.strictEqual(enforceOutput(''), '');
});

// ===== SUMMARY =====
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`📋 Content Bible: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
