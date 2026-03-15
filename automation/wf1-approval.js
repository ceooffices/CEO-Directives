/**
 * wf1-approval.js
 * CEO Directive WF1: 2-Step Approval Email Workflow
 * 
 * Port từ: WF1_v14_NEW_DB_IDS.json (n8n workflow v13.4)
 * 
 * Flow:
 *   STEP1: Chỉ đạo mới → Email người chỉ đạo → "Xin duyệt"
 *   STEP2: Đã duyệt → Email đầu mối → "Xác nhận 4T"
 * 
 * Usage:
 *   node wf1-approval.js              # Chạy thật
 *   node wf1-approval.js --dry-run    # Chỉ log, không gửi/update
 */

const { queryClarificationsStep1, queryClarificationsStep2,
        safeText, safeSelect, safeDate, safeRelation, safeRollupEmail, safeRollupTitle,
        updatePage } = require('./lib/notion-client');
const { sendEmail } = require('./lib/email-sender');
const { logExecution } = require('./lib/logger');
const { buildStep1Email, buildStep2Email } = require('./lib/email-templates');

const DRY_RUN = process.argv.includes('--dry-run');
const ALWAYS_CC = (process.env.ALWAYS_CC || 'hoangkha@esuhai.com,vynnl@esuhai.com').split(',').map(e => e.trim());

// ===== MAIN LOGIC =====

async function extractAndProcess(pages) {
  const results = [];

  for (const page of pages) {
    const props = page.properties || {};
    const id = page.id;

    const tieuDe = safeText(props['Tiêu đề']?.title);
    const nguon = safeSelect(props['Nguồn']?.select);
    const ngayNhan = safeDate(props['Ngày nhận']?.date);
    const noiDung = safeText(props['Nội dung gốc']?.rich_text);
    const tinhTrang = safeSelect(props['TÌNH TRẠNG']?.select) || safeSelect(props['TINH_TRANG']?.select);
    const daDuyet = safeSelect(props['✅ Đã duyệt bởi người chỉ đạo']?.select);
    const lenhGuiLoiNhac = safeSelect(props['LỆNH GỬI LỜI NHẮC']?.select) || safeSelect(props['LENH_GUI_LOI_NHAC']?.select);

    // Người chỉ đạo
    const emailNguoiChiDao = safeRollupEmail(props['Email người chỉ đạo']?.rollup);
    const tenNguoiChiDao = safeRollupTitle(props['Tên người chỉ đạo']?.rollup);

    // Đầu mối
    const emailDauMoi = safeRollupEmail(props['Email đầu mối']?.rollup);
    const tenDauMoi = safeRollupTitle(props['Tên đầu mối']?.rollup);

    const t2NhiemVu = safeText(props['T2 - NHIỆM VỤ']?.rich_text);
    const t3ChiTieu = safeText(props['T3 - CHỈ TIÊU']?.rich_text);
    const t4ThoiHan = safeDate(props['T4 - THỜI HẠN']?.date);

    // Determine step
    let step, sendTo, emailSubject, ccTo;

    if (!daDuyet || daDuyet === '' || daDuyet === 'Chưa duyệt') {
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

    } else if (daDuyet === 'Đã duyệt') {
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
      ccSet.delete(sendTo);
      ccTo = Array.from(ccSet).join(', ');

    } else {
      continue;
    }

    results.push({
      id, step, tieuDe, nguon, ngayNhan, noiDung,
      emailNguoiChiDao, tenNguoiChiDao,
      emailDauMoi, tenDauMoi,
      sendTo, emailSubject, ccTo,
      tinhTrang, daDuyet, lenhGuiLoiNhac,
      t2NhiemVu, t3ChiTieu, t4ThoiHan,
      url: page.url,
    });
  }

  return results;
}

async function run() {
  const startTime = Date.now();
  console.log('==========================================');
  console.log(`[WF1 v14] ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`);
  console.log(`[WF1 v14] Mode: ${DRY_RUN ? '🏜️ DRY-RUN' : '⚡ LIVE'}`);
  console.log('==========================================');

  // 1. Query both steps
  console.log('\n[1/4] Querying Notion...');
  const [step1Pages, step2Pages] = await Promise.all([
    queryClarificationsStep1(),
    queryClarificationsStep2(),
  ]);
  console.log(`  STEP1 (Chờ duyệt): ${step1Pages.length} items`);
  console.log(`  STEP2 (Đã duyệt): ${step2Pages.length} items`);

  // 2. Extract data
  console.log('\n[2/4] Extracting data...');
  const allPages = [...step1Pages, ...step2Pages];
  const items = await extractAndProcess(allPages);

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

      // Update Notion status
      if (!DRY_RUN) {
        const updateProps = {};
        if (item.step === 'STEP1') {
          updateProps['TINH_TRANG'] = { select: { name: 'Đã gửi email' } };
        } else {
          updateProps['LENH_GUI_LOI_NHAC'] = { select: { name: 'Đã nhắc' } };
          updateProps['TINH_TRANG'] = { select: { name: 'Đã gửi email' } };
        }
        await updatePage(item.id, updateProps);
      }

      // Log to Notion
      await logExecution({
        workflow: 'WF1 - Gửi email',
        step: item.step,
        status: '✅ Success',
        clarificationId: item.id,
        details: `Title: ${item.tieuDe}\nTo: ${item.sendTo}`,
        emailTo: item.sendTo,
        dryRun: DRY_RUN,
      });

      sentCount++;
    } catch (error) {
      failCount++;
      console.error(`  ❌ FAILED ${item.tieuDe}:`, error.message);

      await logExecution({
        workflow: 'WF1 - Gửi email',
        step: item.step,
        status: '❌ Error',
        clarificationId: item.id,
        details: `Error: ${error.message}\nTo: ${item.sendTo}`,
        dryRun: DRY_RUN,
      });
    }
  }

  // 4. Handle warnings
  console.log('\n[4/4] Processing warnings...');
  for (const w of warnings) {
    console.log(`  ⚠️ ${w.message}`);
    await logExecution({
      workflow: 'WF1 - Gửi email',
      step: 'Warning',
      status: '⚠️ Warning',
      clarificationId: w.id,
      details: w.message,
      dryRun: DRY_RUN,
    });
  }

  // Summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n==========================================');
  console.log('[WF1 v14] SUMMARY:');
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
