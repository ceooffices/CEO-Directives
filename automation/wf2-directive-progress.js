/**
 * wf2-directive-progress.js (formerly wf2-task-creator.js)
 * CEO Directive WF2: Directive Progress Tracker
 * 
 * Logic mới (bỏ DB_TASK):
 *   Query CLARIFICATION (Đã xác nhận 5T) → Gửi email xác nhận cho đầu mối
 *   → Nhắc đầu mối cập nhật tiến độ qua form
 *   → Log kết quả
 * 
 * Anh chỉ cần biết: chỉ đạo nào xong/chưa xong, tới đâu, khó khăn gì.
 * Việc tạo task cụ thể là của đầu mối.
 * 
 * Usage:
 *   node wf2-directive-progress.js              # Chạy thật
 *   node wf2-directive-progress.js --dry-run    # Chỉ log
 */

const { queryConfirmed5T, safeText, safeSelect, safeDate,
        safeRollupEmail, safeRollupTitle,
        updatePage, DB } = require('./lib/notion-client');
const { sendEmail } = require('./lib/email-sender');
const { logExecution } = require('./lib/logger');
const { buildProgressNotifyEmail } = require('./lib/email-templates');

const DRY_RUN = process.argv.includes('--dry-run');
const ALWAYS_CC = (process.env.ALWAYS_CC || 'hoangkha@esuhai.com,vynnl@esuhai.com').split(',').map(e => e.trim());

// ===== MAIN LOGIC =====

async function run() {
  const startTime = Date.now();
  console.log('==========================================');
  console.log(`[WF2] ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`);
  console.log(`[WF2] Mode: ${DRY_RUN ? '🏜️ DRY-RUN' : '⚡ LIVE'}`);
  console.log('[WF2] Directive Progress Tracker');
  console.log('==========================================');

  // 1. Query confirmed directives
  console.log('\n[1/2] Querying confirmed 5T directives...');
  const pages = await queryConfirmed5T();
  console.log(`  Found: ${pages.length} directives confirmed 5T`);

  if (pages.length === 0) {
    console.log('  → Không có chỉ đạo nào cần thông báo.');
    return { notified: 0, failed: 0 };
  }

  // 2. Notify đầu mối
  console.log('\n[2/2] Notifying assignees...');
  let notifiedCount = 0, failCount = 0;

  for (const page of pages) {
    const props = page.properties || {};

    const tieuDe = safeText(props['Tiêu đề']?.title);
    const t1DauMoi = safeText(props['T1 - Đầu mối']?.rich_text);
    const t2NhiemVu = safeText(props['T2 - Nhiệm vụ']?.rich_text);
    const t3ChiTieu = safeText(props['T3 - Chỉ tiêu']?.rich_text);
    const t4ThoiHan = safeDate(props['T4 - Thời hạn']?.date);
    const t5ThanhVien = safeText(props['T5 - Thành viên liên quan']?.rich_text);
    const tenNguoiChiDao = safeText(props['Người chỉ đạo']?.rich_text);

    // Try to get email from various sources
    let emailDauMoi = '';
    for (const [key, value] of Object.entries(props)) {
      const kl = key.toLowerCase();
      if (kl.includes('email') && kl.includes('đầu mối')) {
        emailDauMoi = safeRollupEmail(value.rollup) || '';
        if (emailDauMoi) break;
      }
    }
    if (!emailDauMoi) {
      emailDauMoi = safeRollupEmail(props['Email đầu mối']?.rollup) || '';
    }

    const tenDauMoi = safeRollupTitle(props['Tên đầu mối']?.rollup) || t1DauMoi;

    const item = {
      tieuDe, t1DauMoi, t2NhiemVu, t3ChiTieu, t4ThoiHan, t5ThanhVien,
      tenDauMoi, tenNguoiChiDao, emailDauMoi,
      url: page.url,
    };

    try {
      if (!emailDauMoi) {
        console.log(`  ⚠️ "${tieuDe}": Thiếu email đầu mối`);
        await logExecution({
          workflow: 'WF2 - Directive Progress',
          step: 'Notify',
          status: '⚠️ Warning',
          clarificationId: page.id,
          details: `Thiếu email đầu mối: ${tieuDe}`,
          dryRun: DRY_RUN,
        });
        failCount++;
        continue;
      }

      if (!DRY_RUN) {
        await sendEmail({
          to: emailDauMoi,
          subject: `✅ [Chỉ đạo 5T] ${tieuDe || 'Chỉ đạo mới'}`,
          html: buildProgressNotifyEmail(item),
          cc: ALWAYS_CC.filter(e => e !== emailDauMoi).join(', '),
        });
      } else {
        console.log(`  [DRY-RUN] Would email ${emailDauMoi}: ${tieuDe}`);
      }

      await logExecution({
        workflow: 'WF2 - Directive Progress',
        step: 'Notify',
        status: '✅ Success',
        clarificationId: page.id,
        details: `"${tieuDe}" → ${emailDauMoi}`,
        emailTo: emailDauMoi,
        dryRun: DRY_RUN,
      });

      notifiedCount++;
    } catch (error) {
      failCount++;
      console.error(`  ❌ FAILED "${tieuDe}":`, error.message);
      await logExecution({
        workflow: 'WF2 - Directive Progress',
        step: 'Notify',
        status: '❌ Error',
        clarificationId: page.id,
        details: `Error: ${error.message}`,
        dryRun: DRY_RUN,
      });
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n==========================================');
  console.log('[WF2] SUMMARY:');
  console.log(`  📧 Notified: ${notifiedCount}`);
  console.log(`  ⚠️ Skipped/Failed: ${failCount}`);
  console.log(`  ⏱️ Time: ${elapsed}s`);
  console.log('==========================================');

  return { notified: notifiedCount, failed: failCount };
}

if (require.main === module) {
  run().catch(err => {
    console.error('❌ FATAL:', err);
    process.exit(1);
  });
}

module.exports = { run };
