/**
 * test-email-catchall.js
 * Kiểm tra tính năng DEBUG_EMAIL_CATCH_ALL hoạt động đúng
 *
 * Usage:
 *   node test-email-catchall.js
 */

// Tạm set biến môi trường trước khi load module
process.env.DEBUG_EMAIL_CATCH_ALL = 'hoangkha@esuhai.com';
// Đảm bảo không gửi email thật — dùng dry-run
const { sendEmail } = require('./lib/email-sender');

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ☑ PASS: ${testName}`);
    passed++;
  } else {
    console.log(`  ✖ FAIL: ${testName}`);
    failed++;
  }
}

async function runTests() {
  console.log('==========================================');
  console.log('[TEST] Kiểm tra DEBUG_EMAIL_CATCH_ALL');
  console.log('==========================================\n');

  // Test 1: Email bị chuyển hướng về catch-all
  console.log('Test 1: Email chuyển hướng');
  const result1 = await sendEmail({
    to: 'nhanvien@esuhai.com',
    cc: 'manager@esuhai.com',
    bcc: 'ceo@esuhai.com',
    subject: 'Chỉ đạo mới cần duyệt',
    html: '<p>Test</p>',
    dryRun: true,
  });
  assert(result1.accepted[0] === 'hoangkha@esuhai.com', 'To bị ghi đè thành catch-all');
  assert(result1.messageId === 'dry-run', 'Dry-run hoạt động');

  // Test 2: Subject có prefix T-REDIRECT
  console.log('\nTest 2: Subject prefix');
  // Capture console output
  const logs = [];
  const origLog = console.log;
  console.log = (...args) => { logs.push(args.join(' ')); origLog.apply(console, args); };

  await sendEmail({
    to: 'abc@esuhai.com',
    subject: 'Test subject gốc',
    html: '<p>Test</p>',
    dryRun: true,
  });

  console.log = origLog;

  const subjectLog = logs.find(l => l.includes('Subject:'));
  assert(
    subjectLog && subjectLog.includes('[T-REDIRECT from abc@esuhai.com]'),
    'Subject chứa [T-REDIRECT from <original_to>]'
  );
  assert(
    subjectLog && subjectLog.includes('Test subject gốc'),
    'Subject giữ nguyên nội dung gốc'
  );

  // Test 3: CC và BCC bị xóa
  const ccLog = logs.find(l => l.includes('CC:') && l.includes('(none)'));
  assert(!!ccLog, 'CC bị xóa (none)');

  // Test 4: Không có catch-all → gửi bình thường
  console.log('\nTest 3: Không có catch-all');
  delete process.env.DEBUG_EMAIL_CATCH_ALL;
  const logs2 = [];
  console.log = (...args) => { logs2.push(args.join(' ')); origLog.apply(console, args); };

  await sendEmail({
    to: 'real@esuhai.com',
    subject: 'Subject thật',
    html: '<p>Test</p>',
    dryRun: true,
  });

  console.log = origLog;

  const toLog2 = logs2.find(l => l.includes('To:'));
  assert(
    toLog2 && toLog2.includes('real@esuhai.com'),
    'Không có catch-all → gửi đúng người nhận gốc'
  );
  const redirectLog2 = logs2.find(l => l.includes('T-REDIRECT'));
  assert(!redirectLog2, 'Không có catch-all → không có T-REDIRECT');

  // Summary
  console.log('\n==========================================');
  console.log(`[TEST] KẾT QUẢ: ${passed} passed, ${failed} failed`);
  console.log('==========================================');

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
