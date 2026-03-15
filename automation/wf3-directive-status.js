/**
 * wf3-directive-status.js (formerly wf3-status-tracker.js)
 * CEO Directive WF3: Directive Status Monitor
 * 
 * Logic mới (bỏ DB_TASK):
 *   Snapshot CLARIFICATION statuses → So sánh → Phát hiện thay đổi
 *   → Gửi email thông báo → Cập nhật snapshot
 * 
 * Track trực tiếp TINH_TRANG chỉ đạo: Chờ làm rõ → Đã xác nhận 5T → Hoàn thành
 * Anh sẽ biết: chỉ đạo nào thay đổi trạng thái, từ trạng thái nào sang trạng thái nào.
 * 
 * Usage:
 *   node wf3-directive-status.js              # Chạy thật
 *   node wf3-directive-status.js --dry-run    # Chỉ log
 */

const fs = require('fs');
const path = require('path');
const { queryClarificationsForSnapshot, safeText, safeSelect, safeDate,
        safeRollupEmail, safeRollupTitle } = require('./lib/notion-client');
const { sendEmail } = require('./lib/email-sender');
const { logExecution } = require('./lib/logger');
const { buildStatusChangeEmail } = require('./lib/email-templates');

const DRY_RUN = process.argv.includes('--dry-run');
const SNAPSHOT_FILE = path.join(__dirname, '..', 'data', 'directive_snapshot.json');
const ALWAYS_CC = (process.env.ALWAYS_CC || 'hoangkha@esuhai.com,vynnl@esuhai.com').split(',').map(e => e.trim());

// ===== SNAPSHOT =====

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
  console.log('[WF3] Directive Status Monitor');
  console.log('==========================================');

  // 1. Load old snapshot
  console.log('\n[1/4] Loading previous snapshot...');
  const oldSnapshot = loadSnapshot();
  console.log(`  Previous: ${Object.keys(oldSnapshot).length} directives`);

  // 2. Query current directives
  console.log('\n[2/4] Querying current directives...');
  const directives = await queryClarificationsForSnapshot();
  console.log(`  Current: ${directives.length} directives`);

  // 3. Compare
  console.log('\n[3/4] Detecting changes...');
  const newSnapshot = {};
  const changes = [];

  for (const page of directives) {
    const props = page.properties || {};
    const id = page.id;

    const title = safeText(props['Tiêu đề']?.title);
    const tinhTrang = safeSelect(props['TINH_TRANG']?.select);
    const duyet = safeSelect(props['✅ Đã duyệt bởi người chỉ đạo']?.select);
    const dauMoi = safeText(props['T1 - Đầu mối']?.rich_text);
    const nguoiChiDao = safeText(props['Người chỉ đạo']?.rich_text);
    const thoiHan = safeDate(props['T4 - Thời hạn']?.date);

    // Try to get email
    let email = '';
    for (const [key, value] of Object.entries(props)) {
      if (key.toLowerCase().includes('email') && value.type === 'rollup') {
        email = safeRollupEmail(value.rollup);
        if (email) break;
      }
    }

    newSnapshot[id] = { title, status: tinhTrang, duyet, email, dauMoi };

    // Detect TINH_TRANG change
    if (oldSnapshot[id] && oldSnapshot[id].status && tinhTrang &&
        oldSnapshot[id].status !== tinhTrang) {
      changes.push({
        id, title,
        oldStatus: oldSnapshot[id].status,
        newStatus: tinhTrang,
        email: email || oldSnapshot[id].email,
        dauMoi, nguoiChiDao, thoiHan,
        url: page.url || `https://www.notion.so/${id.replace(/-/g, '')}`,
      });
    }

    // Detect Duyệt change
    if (oldSnapshot[id] && oldSnapshot[id].duyet && duyet &&
        oldSnapshot[id].duyet !== duyet) {
      changes.push({
        id, title,
        oldStatus: `Duyệt: ${oldSnapshot[id].duyet}`,
        newStatus: `Duyệt: ${duyet}`,
        email: email || oldSnapshot[id].email,
        dauMoi, nguoiChiDao, thoiHan,
        url: page.url || `https://www.notion.so/${id.replace(/-/g, '')}`,
      });
    }
  }

  // Count new directives (not in old snapshot)
  const newDirectives = Object.keys(newSnapshot).filter(id => !oldSnapshot[id]);
  if (newDirectives.length > 0) {
    console.log(`  🆕 New directives: ${newDirectives.length}`);
  }

  console.log(`  📊 Status changes: ${changes.length}`);

  // 4. Notify
  console.log('\n[4/4] Sending notifications...');
  let notified = 0;

  for (const change of changes) {
    console.log(`  📊 "${change.title}": ${change.oldStatus} → ${change.newStatus}`);

    const recipients = ALWAYS_CC.slice(); // Always CC leadership
    if (change.email && !recipients.includes(change.email)) {
      recipients.unshift(change.email); // Email to đầu mối first
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
            t4ThoiHan: change.thoiHan,
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

    await logExecution({
      workflow: 'WF3 - Directive Status',
      step: `${change.oldStatus} → ${change.newStatus}`,
      status: '✅ Success',
      clarificationId: change.id,
      details: `"${change.title}": ${change.oldStatus} → ${change.newStatus}`,
      emailTo: sendTo,
      dryRun: DRY_RUN,
    });
  }

  // Save snapshot
  if (!DRY_RUN) {
    saveSnapshot(newSnapshot);
    console.log(`  💾 Snapshot saved: ${Object.keys(newSnapshot).length} directives`);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n==========================================');
  console.log('[WF3] SUMMARY:');
  console.log(`  📊 Changes: ${changes.length}`);
  console.log(`  🆕 New: ${newDirectives.length}`);
  console.log(`  📧 Notified: ${notified}`);
  console.log(`  ⏱️ Time: ${elapsed}s`);
  console.log('==========================================');

  return { changes: changes.length, newDirectives: newDirectives.length, notified };
}

if (require.main === module) {
  run().catch(err => {
    console.error('❌ FATAL:', err);
    process.exit(1);
  });
}

module.exports = { run };
