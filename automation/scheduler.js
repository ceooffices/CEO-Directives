/**
 * scheduler.js
 * CEO Directive Automation — Entry Point
 * 
 * Chạy tất cả workflows theo lịch, thay n8n scheduler.
 * 
 * Usage:
 *   node scheduler.js                        # Chạy daemon (cron jobs)
 *   node scheduler.js --run-now wf1          # Chạy WF1 ngay lập tức
 *   node scheduler.js --run-now wf2          # Chạy WF2 ngay lập tức
 *   node scheduler.js --run-now wf3          # Chạy WF3 ngay lập tức
 *   node scheduler.js --run-now wf4          # Chạy WF4 ngay lập tức
 *   node scheduler.js --run-now wf5          # Chạy WF5 ngay lập tức
 *   node scheduler.js --run-now wf6          # Chạy WF6 ngay lập tức
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
const { run: runWF6 } = require('./wf6-dashboard-sync');

const DRY_RUN = process.argv.includes('--dry-run');

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

  // WF6: 4 lần/ngày (07:30, 11:30, 14:30, 17:30)
  wf6_early:     '30 7 * * 1-5',
  wf6_midday:    '30 11 * * 1-5',
  wf6_afternoon: '30 14 * * 1-5',
  wf6_evening:   '30 17 * * 1-5',
};

// ===== RUN WRAPPER =====

async function safeRun(name, fn) {
  const ts = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
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
    if (target === 'wf6' || target === 'all') await safeRun('WF6-DashboardSync', runWF6);

    console.log('\n[scheduler] Done. Exiting.');
    process.exit(0);
  })();

} else {
  // ===== DAEMON MODE: Setup cron jobs =====

  console.log('==========================================');
  console.log('🤖 CEO Directive Automation Engine v2.0');
  console.log(`   Started: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`);
  console.log(`   Mode: ${DRY_RUN ? '🏜️ DRY-RUN' : '⚡ LIVE'}`);
  console.log('==========================================');
  console.log('\nScheduled jobs:');

  const TZ = { timezone: 'Asia/Ho_Chi_Minh' };

  // WF1: Approval (3x/day)
  cron.schedule(SCHEDULES.wf1_morning,   () => safeRun('WF1-Morning',   runWF1), TZ);
  cron.schedule(SCHEDULES.wf1_afternoon, () => safeRun('WF1-Afternoon', runWF1), TZ);
  cron.schedule(SCHEDULES.wf1_evening,   () => safeRun('WF1-Evening',   runWF1), TZ);
  console.log(`  📧 WF1 Approval:     08:00 | 13:00 | 17:00`);

  // WF2: Task Creator (3x/day, 15min after WF1)
  cron.schedule(SCHEDULES.wf2_morning,   () => safeRun('WF2-Morning',   runWF2), TZ);
  cron.schedule(SCHEDULES.wf2_afternoon, () => safeRun('WF2-Afternoon', runWF2), TZ);
  cron.schedule(SCHEDULES.wf2_evening,   () => safeRun('WF2-Evening',   runWF2), TZ);
  console.log(`  📋 WF2 TaskCreator:  08:15 | 13:15 | 17:15`);

  // WF3: Status Tracker (2x/day)
  cron.schedule(SCHEDULES.wf3_morning,   () => safeRun('WF3-Morning',   runWF3), TZ);
  cron.schedule(SCHEDULES.wf3_afternoon, () => safeRun('WF3-Afternoon', runWF3), TZ);
  console.log(`  📊 WF3 StatusTrack:  10:00 | 16:00`);

  // WF4: Escalation (1x/day)
  cron.schedule(SCHEDULES.wf4_daily, () => safeRun('WF4-Escalation', runWF4), TZ);
  console.log(`  🔴 WF4 Escalation:  09:00`);

  // WF5: Reminders (1x/day)
  cron.schedule(SCHEDULES.wf5_morning, () => safeRun('WF5-Reminders', runWF5), TZ);
  console.log(`  🦉 WF5 Reminders:   08:30`);

  // WF6: Dashboard Sync (4x/day)
  cron.schedule(SCHEDULES.wf6_early,     () => safeRun('WF6-Early',     runWF6), TZ);
  cron.schedule(SCHEDULES.wf6_midday,    () => safeRun('WF6-Midday',    runWF6), TZ);
  cron.schedule(SCHEDULES.wf6_afternoon, () => safeRun('WF6-Afternoon', runWF6), TZ);
  cron.schedule(SCHEDULES.wf6_evening,   () => safeRun('WF6-Evening',   runWF6), TZ);
  console.log(`  🔄 WF6 Sync:        07:30 | 11:30 | 14:30 | 17:30`);

  console.log(`\n  Total: ${Object.keys(SCHEDULES).length} scheduled runs/day`);
  console.log('\n⏳ Waiting for scheduled time... (Ctrl+C to stop)');
}
