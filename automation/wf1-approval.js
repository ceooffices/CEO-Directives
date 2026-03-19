/**
 * wf1-approval.js
 * CEO Directive WF1: 2-Step Approval Email Workflow
 *
 * Port từ: WF1_v14_NEW_DB_IDS.json (n8n workflow v13.4)
 * Migrated: Notion → Supabase (2026-03-18)
 *
 * Flow:
 *   STEP1: Chỉ đạo mới → Email người chỉ đạo → "Xin duyệt"
 *   STEP2: Đã duyệt → Email đầu mối → "Xác nhận 4T"
 *
 * Usage:
 *   node wf1-approval.js              # Chạy thật
 *   node wf1-approval.js --dry-run    # Chỉ log, không gửi/update
 */

const { queryPendingApproval, queryApprovedPendingConfirm,
        updateDirective, logEvent, getStaffEmail,
        BOD_HOSTING_EMAIL, ALWAYS_CC, directiveUrl } = require('./lib/supabase-client');
const { sendEmail } = require('./lib/email-sender');
const { buildStep1Email, buildStep2Email } = require('./lib/email-templates');

const DRY_RUN = process.argv.includes('--dry-run');

// ===== MAIN LOGIC =====

async function extractAndProcess(rows) {
  const results = [];

  for (const row of rows) {
    const id = row.id;
    const tieuDe = row.directive_code;
    const nguon = row.meeting_source || '';
    const ngayNhan = row.created_at ? row.created_at.split('T')[0] : '';
    const noiDung = row.t2_nhiem_vu;
    const tinhTrang = row.tinh_trang;
    const daDuyet = row.approved_by;

    // Người chỉ đạo — resolve email từ staff table
    const emailNguoiChiDao = row.t1_email || await getStaffEmail(row.t1_dau_moi);
    const tenNguoiChiDao = row.t1_dau_moi;

    // Đầu mối — resolve email từ t1_email hoặc staff table, fallback BOD_HOSTING_EMAIL
    const resolvedEmailDauMoi = row.t1_email || await getStaffEmail(row.t1_dau_moi);
    const emailDauMoi = resolvedEmailDauMoi || BOD_HOSTING_EMAIL;
    const tenDauMoi = row.t1_dau_moi;

    const t2NhiemVu = row.t2_nhiem_vu;
    const t3ChiTieu = row.t3_chi_tieu || '';
    const t4ThoiHan = row.t4_thoi_han || '';

    // Determine step
    let step, sendTo, emailSubject, ccTo;

    if (!daDuyet) {
      // STEP 1: Gửi cho người chỉ đạo duyệt
      if (!emailNguoiChiDao) {
        results.push({
          warning: true, id, tieuDe,
          error: 'MISSING_NGUOI_CHI_DAO',
          message: `[${tieuDe}] Thiếu Email người chỉ đạo`,
        });
        continue;
      }
      step = 'STEP1';
      sendTo = emailNguoiChiDao;
      emailSubject = `[Cần Duyệt] ${tieuDe || 'Chỉ đạo mới'}`;
      ccTo = ALWAYS_CC.filter(e => e !== sendTo).join(', ');

    } else {
      // STEP 2: Gửi cho đầu mối xác nhận 4T
      if (!emailDauMoi) {
        results.push({
          warning: true, id, tieuDe,
          error: 'MISSING_DAU_MOI',
          message: `[${tieuDe}] Thiếu Email đầu mối`,
        });
        continue;
      }
      step = 'STEP2';
      sendTo = emailDauMoi;
      emailSubject = `[Cần Làm Rõ] ${tieuDe || 'Chỉ đạo'} - Hạn: ${t4ThoiHan || 'Chưa xác định'}`;
      const ccSet = new Set(ALWAYS_CC);
      if (emailNguoiChiDao) ccSet.add(emailNguoiChiDao);
      // CC BOD Hosting nếu đầu mối là người khác
      if (emailDauMoi !== BOD_HOSTING_EMAIL) ccSet.add(BOD_HOSTING_EMAIL);
      ccSet.delete(sendTo);
      ccTo = Array.from(ccSet).join(', ');
    }

    results.push({
      id, step, tieuDe, nguon, ngayNhan, noiDung,
      emailNguoiChiDao, tenNguoiChiDao,
      emailDauMoi, tenDauMoi,
      sendTo, emailSubject, ccTo,
      tinhTrang, daDuyet,
      t2NhiemVu, t3ChiTieu, t4ThoiHan,
      url: directiveUrl(id),
    });
  }

  return results;
}

async function run() {
  const startTime = Date.now();
  console.log('==========================================');
  console.log(`[WF1 v15] ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`);
  console.log(`[WF1 v15] Mode: ${DRY_RUN ? '🏜️ DRY-RUN' : '⚡ LIVE'}`);
  console.log('[WF1 v15] Source: Supabase');
  console.log('==========================================');

  // 1. Query both steps
  console.log('\n[1/4] Querying Supabase...');
  const [step1Rows, step2Rows] = await Promise.all([
    queryPendingApproval(),
    queryApprovedPendingConfirm(),
  ]);
  console.log(`  STEP1 (Chờ duyệt): ${step1Rows.length} items`);
  console.log(`  STEP2 (Đã duyệt): ${step2Rows.length} items`);

  // 2. Extract data
  console.log('\n[2/4] Extracting data...');
  const allRows = [...step1Rows, ...step2Rows];
  const items = await extractAndProcess(allRows);

  const emails = items.filter(i => !i.warning);
  const warnings = items.filter(i => i.warning);
  console.log(`  To send: ${emails.length}`);
  console.log(`  Warnings: ${warnings.length}`);

  // 3. Send emails
  console.log('\n[3/4] Sending emails...');
  let sentCount = 0, failCount = 0;

  for (const item of emails) {
    try {
      const html = item.step === 'STEP1'
        ? buildStep1Email(item)
        : buildStep2Email(item);

      await sendEmail({
        to: item.sendTo,
        subject: item.emailSubject,
        html,
        cc: item.ccTo,
        dryRun: DRY_RUN,
      });

      // Update Supabase status
      if (!DRY_RUN) {
        if (item.step === 'STEP1') {
          await updateDirective(item.id, { tinh_trang: 'da_gui_email' });
        } else {
          await updateDirective(item.id, {
            tinh_trang: 'da_gui_email',
            reminder_status: 'da_nhac',
          });
        }
      }

      // Log event
      await logEvent(item.id, item.step === 'STEP1' ? 'wf1_step1_sent' : 'wf1_step2_sent', {
        title: item.tieuDe,
        emailTo: item.sendTo,
      }, DRY_RUN);

      sentCount++;
    } catch (error) {
      failCount++;
      console.error(`  ❌ FAILED ${item.tieuDe}:`, error.message);

      await logEvent(item.id, 'wf1_error', {
        step: item.step,
        error: error.message,
        emailTo: item.sendTo,
      }, DRY_RUN);
    }
  }

  // 4. Handle warnings
  console.log('\n[4/4] Processing warnings...');
  for (const w of warnings) {
    console.log(`  ⚠️ ${w.message}`);
    await logEvent(w.id, 'wf1_warning', {
      details: w.message,
    }, DRY_RUN);
  }

  // Summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n==========================================');
  console.log('[WF1 v15] SUMMARY:');
  console.log(`  ✅ Sent: ${sentCount}`);
  console.log(`  ❌ Failed: ${failCount}`);
  console.log(`  ⚠️ Warnings: ${warnings.length}`);
  console.log(`  ⏱️ Time: ${elapsed}s`);
  console.log('==========================================');

  return { sentCount, failCount, warnings: warnings.length };
}

// Run if called directly
if (require.main === module) {
  run().catch(err => {
    console.error('❌ FATAL:', err);
    process.exit(1);
  });
}

module.exports = { run };
