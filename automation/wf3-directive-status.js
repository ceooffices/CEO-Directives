/**
 * wf3-directive-status.js (formerly wf3-status-tracker.js)
 * CEO Directive WF3: Directive Status Monitor
 *
 * Logic mới: Dùng lls_step_history từ Supabase (thay snapshot file)
 *   → Detect status changes → Gửi email thông báo
 *
 * Migrated: Notion → Supabase (2026-03-18)
 *
 * Usage:
 *   node wf3-directive-status.js              # Chạy thật
 *   node wf3-directive-status.js --dry-run    # Chỉ log
 */

const fs = require('fs');
const path = require('path');
const { getRecentStatusChanges, getDirectiveStatusSnapshot,
        logEvent, getStaffEmail, directiveUrl,
        ALWAYS_CC } = require('./lib/supabase-client');
const { sendEmail } = require('./lib/email-sender');
const { buildStatusChangeEmail } = require('./lib/email-templates');

const DRY_RUN = process.argv.includes('--dry-run');
const SNAPSHOT_FILE = path.join(__dirname, '..', 'data', 'directive_snapshot.json');

// ===== SNAPSHOT (fallback khi lls_step_history chưa đủ data) =====

function loadSnapshot() {
  try {
    if (fs.existsSync(SNAPSHOT_FILE)) {
      return JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf-8'));
    }
  } catch (e) {
    console.warn('[WF3] Could not load snapshot:', e.message);
  }
  return {};
}

function saveSnapshot(snapshot) {
  const dir = path.dirname(SNAPSHOT_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(snapshot, null, 2));
}

// ===== MAIN =====

async function run() {
  const startTime = Date.now();
  console.log('==========================================');
  console.log(`[WF3] ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`);
  console.log(`[WF3] Mode: ${DRY_RUN ? '🏜️ DRY-RUN' : '⚡ LIVE'}`);
  console.log('[WF3] Directive Status Monitor — Supabase');
  console.log('==========================================');

  // Thử approach 1: lls_step_history (ưu tiên)
  console.log('\n[1/3] Checking lls_step_history for recent changes...');
  const lastCheck = loadSnapshot().__lastCheck || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  let changes = [];
  let usedHistory = false;

  try {
    const recentChanges = await getRecentStatusChanges(lastCheck);
    if (recentChanges.length > 0) {
      console.log(`  Found ${recentChanges.length} changes từ lls_step_history`);
      usedHistory = true;

      for (const change of recentChanges) {
        const dir = change.directives;
        if (!dir) continue;

        const email = dir.t1_email || await getStaffEmail(dir.t1_dau_moi);

        changes.push({
          id: change.directive_id,
          title: dir.directive_code,
          oldStatus: `Bước ${change.step_number - 1}`,
          newStatus: change.step_name || `Bước ${change.step_number}`,
          email,
          dauMoi: dir.t1_dau_moi,
          url: directiveUrl(change.directive_id),
        });
      }
    } else {
      console.log('  Không có changes từ lls_step_history.');
    }
  } catch (e) {
    console.warn(`  ⚠️ lls_step_history query failed: ${e.message}`);
    console.log('  Falling back to snapshot approach...');
  }

  // Approach 2: Snapshot fallback
  if (!usedHistory) {
    console.log('\n[2/3] Using snapshot approach...');
    const oldSnapshot = loadSnapshot();
    console.log(`  Previous: ${Object.keys(oldSnapshot).length - 1} directives`);

    const directives = await getDirectiveStatusSnapshot();
    console.log(`  Current: ${directives.length} directives`);

    const newSnapshot = { __lastCheck: new Date().toISOString() };

    for (const row of directives) {
      const id = row.id;
      newSnapshot[id] = {
        title: row.directive_code,
        status: row.tinh_trang,
        approved: row.approved_by,
        email: row.t1_email,
        dauMoi: row.t1_dau_moi,
      };

      // Detect status change
      if (oldSnapshot[id] && oldSnapshot[id].status &&
          oldSnapshot[id].status !== row.tinh_trang) {
        const email = row.t1_email || await getStaffEmail(row.t1_dau_moi);
        changes.push({
          id,
          title: row.directive_code,
          oldStatus: oldSnapshot[id].status,
          newStatus: row.tinh_trang,
          email,
          dauMoi: row.t1_dau_moi,
          url: directiveUrl(id),
        });
      }
    }

    // Count new directives
    const newDirectives = Object.keys(newSnapshot).filter(k => k !== '__lastCheck' && !oldSnapshot[k]);
    if (newDirectives.length > 0) {
      console.log(`  🆕 New directives: ${newDirectives.length}`);
    }

    // Save snapshot
    if (!DRY_RUN) {
      saveSnapshot(newSnapshot);
      console.log(`  💾 Snapshot saved: ${directives.length} directives`);
    }
  } else {
    // Update lastCheck timestamp
    if (!DRY_RUN) {
      const snapshot = loadSnapshot();
      snapshot.__lastCheck = new Date().toISOString();
      saveSnapshot(snapshot);
    }
  }

  console.log(`\n  📊 Status changes: ${changes.length}`);

  // 3. Notify
  console.log('\n[3/3] Sending notifications...');
  let notified = 0;

  for (const change of changes) {
    console.log(`  📊 "${change.title}": ${change.oldStatus} → ${change.newStatus}`);

    const recipients = ALWAYS_CC.slice();
    if (change.email && !recipients.includes(change.email)) {
      recipients.unshift(change.email);
    }

    const sendTo = recipients[0];
    const ccList = recipients.slice(1).join(', ');

    try {
      if (!DRY_RUN && sendTo) {
        await sendEmail({
          to: sendTo,
          subject: `📊 [${change.newStatus}] ${change.title}`,
          html: buildStatusChangeEmail({
            tieuDe: change.title,
            recipientName: change.dauMoi,
            oldStatus: change.oldStatus,
            newStatus: change.newStatus,
            tenDauMoi: change.dauMoi,
            t4ThoiHan: '',
            url: change.url,
          }),
          cc: ccList,
        });
      } else {
        console.log(`    [DRY-RUN] Would email: ${sendTo}`);
      }
      notified++;
    } catch (e) {
      console.error(`    ❌ Email failed: ${e.message}`);
    }

    await logEvent(change.id, 'wf3_status_change', {
      oldStatus: change.oldStatus,
      newStatus: change.newStatus,
      emailTo: sendTo,
    }, DRY_RUN);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n==========================================');
  console.log('[WF3] SUMMARY:');
  console.log(`  📊 Changes: ${changes.length}`);
  console.log(`  📧 Notified: ${notified}`);
  console.log(`  ⏱️ Time: ${elapsed}s`);
  console.log('==========================================');

  return { changes: changes.length, notified };
}

if (require.main === module) {
  run().catch(err => {
    console.error('❌ FATAL:', err);
    process.exit(1);
  });
}

module.exports = { run };
