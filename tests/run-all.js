/**
 * tests/run-all.js
 * CEO Directive Automation — Test Runner
 * 
 * Chạy TẤT CẢ unit tests trong tests/unit/
 * 
 * Usage:
 *   node tests/run-all.js           # Chạy tất cả
 *   node tests/run-all.js security  # Chạy chỉ security
 * 
 * Quy ước:
 *   - Mỗi test file trong tests/unit/test-*.js
 *   - Exit code 0 = pass, 1 = fail
 *   - Output: console summary
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const TESTS_DIR = path.join(__dirname, 'unit');

// List all test-*.js files
const allTests = fs.readdirSync(TESTS_DIR)
  .filter(f => f.startsWith('test-') && f.endsWith('.js'))
  .sort();

// Filter by argument if provided
const filter = process.argv[2];
const testsToRun = filter
  ? allTests.filter(f => f.includes(filter))
  : allTests;

if (testsToRun.length === 0) {
  console.log(`❌ Không tìm thấy test nào${filter ? ` khớp "${filter}"` : ''}`);
  process.exit(1);
}

console.log('╔══════════════════════════════════════════════╗');
console.log('║  CEO DIRECTIVE AUTOMATION — TEST SUITE       ║');
console.log('║  ' + new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }).padEnd(43) + '║');
console.log('╚══════════════════════════════════════════════╝');
console.log(`\n  📋 Tests to run: ${testsToRun.length}`);
console.log(`  📂 Directory: ${TESTS_DIR}\n`);

let totalPassed = 0;
let totalFailed = 0;
const results = [];

for (const testFile of testsToRun) {
  const filePath = path.join(TESTS_DIR, testFile);
  const testName = testFile.replace('test-', '').replace('.js', '');

  try {
    console.log(`\n${'═'.repeat(50)}`);
    const output = execSync(`node "${filePath}"`, {
      cwd: __dirname,
      encoding: 'utf-8',
      timeout: 30000,
      env: { ...process.env, NODE_ENV: 'test' },
    });
    console.log(output);
    results.push({ name: testName, status: '☑ PASS' });
    totalPassed++;
  } catch (err) {
    console.log(err.stdout || '');
    console.error(err.stderr || '');
    results.push({ name: testName, status: '✖ FAIL' });
    totalFailed++;
  }
}

// ===== FINAL SUMMARY =====
console.log('\n╔══════════════════════════════════════════════╗');
console.log('║               FINAL RESULTS                  ║');
console.log('╠══════════════════════════════════════════════╣');

for (const r of results) {
  const line = `  ${r.status}  ${r.name}`;
  console.log(`║${line.padEnd(45)}║`);
}

console.log('╠══════════════════════════════════════════════╣');

const summaryLine = `  Total: ${totalPassed} passed, ${totalFailed} failed`;
console.log(`║${summaryLine.padEnd(45)}║`);
console.log('╚══════════════════════════════════════════════╝');

if (totalFailed > 0) {
  console.log('\n🚨 CÓ TEST THẤT BẠI — kiểm tra chi tiết ở trên');
  process.exit(1);
} else {
  console.log('\n☑ TẤT CẢ TESTS ĐẠT');
  process.exit(0);
}
