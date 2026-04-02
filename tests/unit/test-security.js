/**
 * tests/unit/test-security.js
 * Security Audit Tests — Kiểm tra các fix bảo mật từ audit 02/04/2026
 * 
 * Chạy: node tests/unit/test-security.js
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

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

console.log('\n🔐 SECURITY TESTS');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// ===== 1. .gitignore covers sensitive files =====
console.log('\n▸ .gitignore coverage:');

const gitignore = fs.readFileSync(path.join(__dirname, '..', '..', '.gitignore'), 'utf-8');

test('sb_token.json is in .gitignore', () => {
  assert(gitignore.includes('sb_token.json'), 'sb_token.json missing from .gitignore');
});

test('running_processes.txt is in .gitignore', () => {
  assert(gitignore.includes('running_processes.txt'), 'running_processes.txt missing');
});

test('.env is in .gitignore', () => {
  assert(gitignore.includes('.env'), '.env missing');
});

test('automation/.env is in .gitignore', () => {
  assert(gitignore.includes('automation/.env'), 'automation/.env missing');
});

test('web/.env* is in .gitignore', () => {
  assert(gitignore.includes('web/.env'), 'web/.env missing');
});

// ===== 2. Hardcoded secrets check =====
console.log('\n▸ Hardcoded secrets:');

const bridgeCode = fs.readFileSync(
  path.join(__dirname, '..', '..', 'automation', 'openclaw-bridge.js'), 'utf-8'
);
const botCode = fs.readFileSync(
  path.join(__dirname, '..', '..', 'automation', 'telegram-bot.js'), 'utf-8'
);

test('openclaw-bridge.js has NO hardcoded fallback token', () => {
  assert(!bridgeCode.includes('ceo-directives-r8d-2026-esuhai-secure-token'),
    'Hardcoded token still present in bridge!');
});

test('telegram-bot.js has NO hardcoded fallback token', () => {
  assert(!botCode.includes('ceo-directives-r8d-2026-esuhai-secure-token'),
    'Hardcoded token still present in bot!');
});

test('openclaw-bridge.js requires OPENCLAW_GATEWAY_TOKEN from env', () => {
  assert(bridgeCode.includes('process.env.OPENCLAW_GATEWAY_TOKEN'),
    'Missing env token read in bridge');
  assert(bridgeCode.includes("process.exit(1)"),
    'Missing process.exit on missing token');
});

test('telegram-bot.js requires OPENCLAW_GATEWAY_TOKEN from env', () => {
  assert(botCode.includes('process.env.OPENCLAW_GATEWAY_TOKEN'),
    'Missing env token read in bot');
});

// ===== 3. CORS restriction =====
console.log('\n▸ CORS policy:');

test('openclaw-bridge.js does NOT have CORS wildcard *', () => {
  // Check that there's no `'*'` immediately after Allow-Origin
  const wildcardPattern = /Allow-Origin.*'\*'/;
  assert(!wildcardPattern.test(bridgeCode),
    'CORS wildcard still present!');
});

test('openclaw-bridge.js uses env-based CORS origin', () => {
  assert(bridgeCode.includes("process.env.DASHBOARD_URL || 'https://ceodirectives.vercel.app'"),
    'Should use env DASHBOARD_URL for CORS origin');
});

// ===== 4. TLS configuration =====
console.log('\n▸ TLS config:');

const emailCode = fs.readFileSync(
  path.join(__dirname, '..', '..', 'automation', 'lib', 'email-sender.js'), 'utf-8'
);

test('email-sender.js does NOT use SSLv3 cipher', () => {
  assert(!emailCode.includes('SSLv3'), 'SSLv3 cipher still present!');
});

test('email-sender.js has rejectUnauthorized: true', () => {
  assert(emailCode.includes('rejectUnauthorized: true'),
    'Certificate validation must be enabled');
});

// ===== 5. Access control on callback queries =====
console.log('\n▸ Bot access control:');

test('callback_query handler checks ALLOWED_USERS', () => {
  assert(botCode.includes("ALLOWED_USERS") && 
    botCode.includes("callback_query"),
    'callback_query should check ALLOWED_USERS');
});

test('callback_query handler checks rate limit', () => {
  // Find the callback_query section and verify it has checkRateLimit
  const cbSection = botCode.slice(botCode.indexOf('callback_query'));
  assert(cbSection.includes('checkRateLimit'),
    'callback_query should check rate limit');
});

// ===== 6. auto-escalation.js uses shared client + if main =====
console.log('\n▸ Auto-escalation refactoring:');

const escalationCode = fs.readFileSync(
  path.join(__dirname, '..', '..', 'automation', 'auto-escalation.js'), 'utf-8'
);

test('auto-escalation.js uses shared supabase-client', () => {
  assert(escalationCode.includes("require('./lib/supabase-client')"),
    'Should import from shared supabase-client');
});

test('auto-escalation.js does NOT create its own Supabase client', () => {
  assert(!escalationCode.includes("createClient(SUPABASE_URL"),
    'Should not create its own Supabase client');
});

test('auto-escalation.js has require.main guard', () => {
  assert(escalationCode.includes('require.main === module'),
    'Must wrap auto-execute in require.main guard');
});

test('auto-escalation.js exports run()', () => {
  assert(escalationCode.includes('module.exports = { run }'),
    'Must export run function');
});

// ===== 7. DASHBOARD_URL consistency =====
console.log('\n▸ Dashboard URL consistency:');

const supabaseClientCode = fs.readFileSync(
  path.join(__dirname, '..', '..', 'automation', 'lib', 'supabase-client.js'), 'utf-8'
);

test('supabase-client.js uses ceodirectives.vercel.app', () => {
  assert(supabaseClientCode.includes('ceodirectives.vercel.app'),
    'DASHBOARD_URL default should be ceodirectives.vercel.app');
  assert(!supabaseClientCode.includes('ceo-directives.vercel.app'),
    'Old URL ceo-directives.vercel.app should be removed');
});

test('auto-escalation.js uses ceodirectives.vercel.app', () => {
  assert(!escalationCode.includes('localhost:3000'),
    'Should not fallback to localhost:3000');
  assert(escalationCode.includes('ceodirectives.vercel.app'),
    'Should use production URL');
});

// ===== SUMMARY =====
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`📋 Security Tests: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log('🚨 SECURITY ISSUES DETECTED — xem chi tiết ở trên');
  process.exit(1);
} else {
  console.log('☑ All security checks PASSED');
}
