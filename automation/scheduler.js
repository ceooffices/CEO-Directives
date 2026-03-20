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
const { run: runWF2 } = require('./wf2-directive-progress');
const { run: runWF3 } = require('./wf3-directive-status');
const { run: runWF4 } = require('./wf4-directive-escalation');
const { run: runWF5 } = require('./wf5-reminders');

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

  // WF2: Chạy sau WF1 15 phút (08:15, 13:15, 17:15)
  wf2_morning:   '15 8 * * 1-5',
  wf2_afternoon: '15 13 * * 1-5',
  wf2_evening:   '15 17 * * 1-5',

  // WF3: 2 lần/ngày (10:00, 16:00)
  wf3_morning:   '0 10 * * 1-5',
  wf3_afternoon: '0 16 * * 1-5',

  // WF4: 1 lần/ngày (09:00)
  wf4_daily:     '0 9 * * 1-5',

  // WF5: 1 lần/ngày (08:30)
  wf5_morning:   '30 8 * * 1-5',

  // WF6: DEPRECATED — dashboard đọc Supabase trực tiếp
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
    if (target === 'wf2' || target === 'all') await safeRun('WF2-DirectiveProgress', runWF2);
    if (target === 'wf3' || target === 'all') await safeRun('WF3-DirectiveStatus', runWF3);
    if (target === 'wf4' || target === 'all') await safeRun('WF4-DirectiveEscalation', runWF4);
    if (target === 'wf5' || target === 'all') await safeRun('WF5-Reminders', runWF5);

    if (target === 'wf6') {
      console.log('\n[scheduler] ⚠️ WF6 DEPRECATED — dashboard đọc Supabase trực tiếp.');
    }

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

  // WF2: Directive Progress (3x/day, 15min after WF1)
  cron.schedule(SCHEDULES.wf2_morning,   () => safeRun('WF2-Morning',   runWF2, { fromCron: true }), TZ);
  cron.schedule(SCHEDULES.wf2_afternoon, () => safeRun('WF2-Afternoon', runWF2, { fromCron: true }), TZ);
  cron.schedule(SCHEDULES.wf2_evening,   () => safeRun('WF2-Evening',   runWF2, { fromCron: true }), TZ);
  console.log(`  📋 WF2 Progress:     08:15 | 13:15 | 17:15`);

  // WF3: Status Tracker (2x/day)
  cron.schedule(SCHEDULES.wf3_morning,   () => safeRun('WF3-Morning',   runWF3, { fromCron: true }), TZ);
  cron.schedule(SCHEDULES.wf3_afternoon, () => safeRun('WF3-Afternoon', runWF3, { fromCron: true }), TZ);
  console.log(`  📊 WF3 StatusTrack:  10:00 | 16:00`);

  // WF4: Escalation (1x/day)
  cron.schedule(SCHEDULES.wf4_daily, () => safeRun('WF4-Escalation', runWF4, { fromCron: true }), TZ);
  console.log(`  🔴 WF4 Escalation:  09:00`);

  // WF5: Reminders (1x/day)
  cron.schedule(SCHEDULES.wf5_morning, () => safeRun('WF5-Reminders', runWF5, { fromCron: true }), TZ);
  console.log(`  🦉 WF5 Reminders:   08:30`);

  // WF6: DEPRECATED
  console.log(`  ⚠️  WF6 Sync:        DEPRECATED — Supabase trực tiếp`);

  console.log(`\n  Total: ${Object.keys(SCHEDULES).length} scheduled runs/day`);
  console.log('\n⏳ Waiting for scheduled time... (Ctrl+C to stop)');
}
