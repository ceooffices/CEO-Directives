/**
 * wf2-directive-progress.js (formerly wf2-task-creator.js)
 * CEO Directive WF2: Directive Progress Tracker
 *
 * Logic mới (bỏ DB_TASK):
 *   Query directives đã xác nhận 5T → Gửi email xác nhận cho đầu mối
 *   → Nhắc đầu mối cập nhật tiến độ qua form
 *   → Log kết quả
 *
 * Migrated: Notion → Supabase (2026-03-18)
 *
 * Usage:
 *   node wf2-directive-progress.js              # Chạy thật
 *   node wf2-directive-progress.js --dry-run    # Chỉ log
 */

const { queryConfirmed5T, logEvent, getStaffEmail,
        BOD_HOSTING_EMAIL, ALWAYS_CC, directiveUrl } = require('./lib/supabase-client');
const { sendEmail } = require('./lib/email-sender');
const { buildProgressNotifyEmail } = require('./lib/email-templates');

const DRY_RUN = process.argv.includes('--dry-run');

// ===== MAIN LOGIC =====

async function run() {
  const startTime = Date.now();
  console.log('==========================================');
  console.log(`[WF2] ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`);
  console.log(`[WF2] Mode: ${DRY_RUN ? '🏜️ DRY-RUN' : '⚡ LIVE'}`);
  console.log('[WF2] Directive Progress Tracker — Supabase');
  console.log('==========================================');

  // 1. Query confirmed directives
  console.log('\n[1/2] Querying confirmed 5T directives...');
  const rows = await queryConfirmed5T();
  console.log(`  Found: ${rows.length} directives confirmed 5T`);

  if (rows.length === 0) {
    console.log('  → Không có chỉ đạo nào cần thông báo.');
    return { notified: 0, failed: 0 };
  }

  // 2. Notify đầu mối
  console.log('\n[2/2] Notifying assignees...');
  let notifiedCount = 0, failCount = 0;

  for (const row of rows) {
    const tieuDe = row.directive_code;
    const t1DauMoi = row.t1_dau_moi;
    const t2NhiemVu = row.t2_nhiem_vu;
    const t3ChiTieu = row.t3_chi_tieu || '';
    const t4ThoiHan = row.t4_thoi_han || '';
    const t5ThanhVien = Array.isArray(row.t5_thanh_vien) ? row.t5_thanh_vien.join(', ') : '';
    const tenNguoiChiDao = row.t1_dau_moi;

    // Resolve email — lấy đúng email đầu mối, fallback BOD_HOSTING_EMAIL
    const resolvedEmailDauMoi = row.t1_email || await getStaffEmail(row.t1_dau_moi);
    const emailDauMoi = resolvedEmailDauMoi || BOD_HOSTING_EMAIL;
    const tenDauMoi = row.t1_dau_moi;

    const item = {
      tieuDe, t1DauMoi, t2NhiemVu, t3ChiTieu, t4ThoiHan, t5ThanhVien,
      tenDauMoi, tenNguoiChiDao, emailDauMoi,
      url: directiveUrl(row.id),
    };

    try {
      if (!emailDauMoi) {
        console.log(`  ⚠️ "${tieuDe}": Thiếu email đầu mối`);
        await logEvent(row.id, 'wf2_warning', {
          details: `Thiếu email đầu mối: ${tieuDe}`,
        }, DRY_RUN);
        failCount++;
        continue;
      }

      if (!DRY_RUN) {
        const ccSet = new Set(ALWAYS_CC);
        // CC BOD Hosting nếu đầu mối không phải BOD
        if (emailDauMoi !== BOD_HOSTING_EMAIL) ccSet.add(BOD_HOSTING_EMAIL);

        await sendEmail({
          to: emailDauMoi,
          subject: `✅ [Chỉ đạo 5T] ${tieuDe || 'Chỉ đạo mới'}`,
          html: buildProgressNotifyEmail(item),
          cc: Array.from(ccSet).filter(e => e !== emailDauMoi).join(', '),
        });
      } else {
        console.log(`  [DRY-RUN] Would email ${emailDauMoi}: ${tieuDe}`);
      }

      await logEvent(row.id, 'wf2_progress_sent', {
        title: tieuDe,
        emailTo: emailDauMoi,
      }, DRY_RUN);

      notifiedCount++;
    } catch (error) {
      failCount++;
      console.error(`  ❌ FAILED "${tieuDe}":`, error.message);
      await logEvent(row.id, 'wf2_error', {
        error: error.message,
      }, DRY_RUN);
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
