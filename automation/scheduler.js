/**
 * scheduler.js
 * CEO Directive Automation — Entry Point
 *
 * Chạy tất cả workflows theo lịch, thay n8n scheduler.
 * WF6 đã deprecated (dashboard đọc Supabase trực tiếp).
 *
 * Usage:
 *   node scheduler.js                        # Chạy daemon (cron jobs)
 *   node scheduler.js --run-now wf1          # Chạy WF1 ngay lập tức
 *   node scheduler.js --run-now wf2          # Chạy WF2 ngay lập tức
 *   node scheduler.js --run-now wf3          # Chạy WF3 ngay lập tức
 *   node scheduler.js --run-now wf4          # Chạy WF4 ngay lập tức
 *   node scheduler.js --run-now wf5          # Chạy WF5 ngay lập tức
 *   node scheduler.js --run-now all          # Chạy tất cả ngay
 *   node scheduler.js --dry-run              # Chạy tất cả (dry-run)
 */

require('dotenv').config();
const cron = require('node-cron');
const { run: runWF1 } = require('./wf1-approval');
// WF2 (directive-progress) — DEPRECATED: xác nhận đã nhúng trong form WF1 Step2
const { run: runWF3 } = require('./wf3-directive-status');
const { run: runWF3C } = require('./wf3-chatlong-analysis');
const { run: runWF4 } = require('./wf4-directive-escalation');
// WF5 (Duolingo reminders) — DEPRECATED: logic gom vào WF4
// WF8 (NKHĐS) — DEPRECATED: logic gom vào WF4
const { run: runWF6 } = require('./wf6-upgrade-loop');
const { run: runWF7 } = require('./wf7-preflight-check');
const DRY_RUN = process.argv.includes('--dry-run');

// ===== CRON NOTIFICATION GATE =====
// Nếu false: cron trigger nhưng không thực sự chạy WF (tránh spam khi CEO_Office_Hub cũng hoạt động)
const CRON_ENABLED = (process.env.ENABLE_CRON_NOTIFICATIONS || 'false').toLowerCase() === 'true';

// ===== CRON SCHEDULES =====

const SCHEDULES = {
  // WF1: 3 lần/ngày (08:00, 13:00, 17:00)
  wf1_morning:   '0 8 * * 1-5',
  wf1_afternoon: '0 13 * * 1-5',
  wf1_evening:   '0 17 * * 1-5',

  // WF2: DEPRECATED
  // wf2_morning: '15 8 * * 1-5',
  // wf2_afternoon: '15 13 * * 1-5',
  // wf2_evening: '15 17 * * 1-5',

  // WF3: 2 lần/ngày (10:00, 16:00)
  wf3_morning:   '0 10 * * 1-5',
  wf3_afternoon: '0 16 * * 1-5',

  // WF4: Đồng hành Engine 1 lần/ngày (09:00) — thay thế WF4+WF5+WF8
  wf4_daily:     '0 9 * * 1-5',

  // WF5: DEPRECATED — logic gom vào WF4
  // WF5_morning: '30 8 * * 1-5',

  // WF3-CHATLONG: Chạy sau WF1 30 phút (08:30, 13:30, 17:30)
  wf3c_morning:   '30 8 * * 1-5',
  wf3c_afternoon: '30 13 * * 1-5',
  wf3c_evening:   '30 17 * * 1-5',

  // WF6-UPGRADE: 2 lần/ngày (10:30, 15:30)
  wf6_morning:   '30 10 * * 1-5',
  wf6_afternoon: '30 15 * * 1-5',

  // WF7: Pre-flight check Thứ 6 (16:00)
  wf7_friday:    '0 16 * * 5',

  // WF8: DEPRECATED — logic gom vào WF4
  // wf8_friday: '0 17 * * 5',
};

// ===== RUN WRAPPER =====

async function safeRun(name, fn, { fromCron = false } = {}) {
  const ts = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

  // Cron trigger nhưng bị mute → chỉ log, không chạy WF
  if (fromCron && !CRON_ENABLED) {
    console.log(`[scheduler] ⏸ CRON triggered ${name} nhưng đã bị mute (ENABLE_CRON_NOTIFICATIONS=false)`);
    return;
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`[scheduler] 🚀 Starting ${name} at ${ts}`);
  console.log(`${'='.repeat(50)}`);
  try {
    const result = await fn();
    console.log(`[scheduler] ✅ ${name} completed:`, result);
  } catch (error) {
    console.error(`[scheduler] ❌ ${name} FAILED:`, error.message);
  }
}

// ===== HANDLE --run-now =====

const runNowIdx = process.argv.indexOf('--run-now');
if (runNowIdx > -1) {
  const target = process.argv[runNowIdx + 1] || 'all';

  (async () => {
    if (DRY_RUN) process.argv.push('--dry-run');

    if (target === 'wf1' || target === 'all') await safeRun('WF1-Approval', runWF1);
    // WF2 DEPRECATED
    if (target === 'wf3' || target === 'all') await safeRun('WF3-DirectiveStatus', runWF3);
    if (target === 'wf3c' || target === 'chatlong' || target === 'all') await safeRun('WF3C-ChatLongAnalysis', runWF3C);
    if (target === 'wf4' || target === 'all') await safeRun('WF4-ĐồngHànhEngine', runWF4);
    // WF5 DEPRECATED
    if (target === 'wf6' || target === 'upgrade' || target === 'all') await safeRun('WF6-UpgradeLoop', runWF6);
    if (target === 'wf7' || target === 'preflight' || target === 'all') await safeRun('WF7-PreflightCheck', runWF7);
    // WF8 DEPRECATED (gom vào WF4)

    console.log('\n[scheduler] Done. Exiting.');
    process.exit(0);
  })();

} else {
  // ===== DAEMON MODE: Setup cron jobs =====

  console.log('==========================================');
  console.log('🤖 CEO Directive Automation Engine v3.2');
  console.log('   Source: Supabase (single source of truth)');
  console.log(`   Started: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`);
  console.log(`   Mode: ${DRY_RUN ? '🏜️ DRY-RUN' : '⚡ LIVE'}`);
  console.log(`   Cron notifications: ${CRON_ENABLED ? '🔔 BẬT' : '🔇 TẮT (mute)'}`);
  console.log('==========================================');
  console.log('\nScheduled jobs:');

  const TZ = { timezone: 'Asia/Ho_Chi_Minh' };

  // WF1: Approval (3x/day)
  cron.schedule(SCHEDULES.wf1_morning,   () => safeRun('WF1-Morning',   runWF1, { fromCron: true }), TZ);
  cron.schedule(SCHEDULES.wf1_afternoon, () => safeRun('WF1-Afternoon', runWF1, { fromCron: true }), TZ);
  cron.schedule(SCHEDULES.wf1_evening,   () => safeRun('WF1-Evening',   runWF1, { fromCron: true }), TZ);
  console.log(`  📧 WF1 Approval:     08:00 | 13:00 | 17:00`);

  // WF2: DEPRECATED

  // WF3: Status Tracker (2x/day)
  cron.schedule(SCHEDULES.wf3_morning,   () => safeRun('WF3-Morning',   runWF3, { fromCron: true }), TZ);
  cron.schedule(SCHEDULES.wf3_afternoon, () => safeRun('WF3-Afternoon', runWF3, { fromCron: true }), TZ);
  console.log(`  📊 WF3 StatusTrack:  10:00 | 16:00`);

  // WF4: Đồng hành Engine (1x/day — thay thế WF4+WF5+WF8)
  cron.schedule(SCHEDULES.wf4_daily, () => safeRun('WF4-ĐồngHành', runWF4, { fromCron: true }), TZ);
  console.log(`  🤝 WF4 Đồng Hành:   09:00 (hợp nhất WF4+WF5+WF8)`);

  // WF5: DEPRECATED (gom vào WF4)

  // WF3C: ChatLong AI Analysis (3x/day, 30min after WF1)
  cron.schedule(SCHEDULES.wf3c_morning,   () => safeRun('WF3C-Morning',   runWF3C, { fromCron: true }), TZ);
  cron.schedule(SCHEDULES.wf3c_afternoon, () => safeRun('WF3C-Afternoon', runWF3C, { fromCron: true }), TZ);
  cron.schedule(SCHEDULES.wf3c_evening,   () => safeRun('WF3C-Evening',   runWF3C, { fromCron: true }), TZ);
  console.log(`  🧠 WF3C ChatLong:   08:30 | 13:30 | 17:30`);

  // WF6: Upgrade Loop (2x/day)
  cron.schedule(SCHEDULES.wf6_morning,   () => safeRun('WF6-Morning',   runWF6, { fromCron: true }), TZ);
  cron.schedule(SCHEDULES.wf6_afternoon, () => safeRun('WF6-Afternoon', runWF6, { fromCron: true }), TZ);
  console.log(`  🔄 WF6 Upgrade:     10:30 | 15:30`);

  // WF7: Preflight Check (Thứ 6 16:00)
  cron.schedule(SCHEDULES.wf7_friday, () => safeRun('WF7-Preflight', runWF7, { fromCron: true }), TZ);
  console.log(`  ✈️ WF7 Pre-flight:  Thứ 6 lúc 16:00`);

  // WF8: DEPRECATED (gom vào WF4)
  // cron.schedule(SCHEDULES.wf8_friday, ...);
  console.log(`  📊 WF8 NKHĐS:       DEPRECATED (gom vào WF4)`);

  console.log(`\n  Total: ${Object.keys(SCHEDULES).length} scheduled runs/week`);
  console.log('\n⏳ Waiting for scheduled time... (Ctrl+C to stop)');
}
