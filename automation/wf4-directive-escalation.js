/**
 * wf4-directive-escalation.js (formerly wf4-escalation.js)
 * CEO Directive WF4: Directive Escalation Engine
 * 
 * Logic mới (bỏ DB_TASK):
 *   Query CLARIFICATION có T4-Thời hạn → Check quá hạn → Phân loại → Email
 *   - 3-7 ngày: ⚠️ Nhắc đầu mối
 *   - 7-14 ngày: 🔴 Leo thang → người chỉ đạo
 *   - >14 ngày: 🚨 Báo động → CEO
 * 
 * Track trực tiếp từ chỉ đạo, không cần task riêng.
 * 
 * Usage:
 *   node wf4-directive-escalation.js              # Chạy thật
 *   node wf4-directive-escalation.js --dry-run    # Chỉ log
 */

const { queryOverdueClarifications, safeText, safeSelect, safeDate,
        safeRollupEmail, safeRollupTitle, resolveEmailFromRelation } = require('./lib/notion-client');
const { sendEmail } = require('./lib/email-sender');
const { logExecution } = require('./lib/logger');
const { buildEscalationEmail: buildEscalationHtml } = require('./lib/email-templates');

const DRY_RUN = process.argv.includes('--dry-run');
const ALWAYS_CC = (process.env.ALWAYS_CC || 'hoangkha@esuhai.com,vynnl@esuhai.com').split(',').map(e => e.trim());
const CEO_EMAIL = process.env.CEO_EMAIL || 'hoangkha@esuhai.com';
const BOD_HOSTING_EMAIL = process.env.BOD_HOSTING_EMAIL || 'letuan@esuhai.com';

// ===== ESCALATION LEVELS =====

const LEVELS = {
  WARNING:  { min: 3,  max: 7,  label: '⚠️ Nhắc nhở',       color: '#f59e0b' },
  ESCALATE: { min: 7,  max: 14, label: '🔴 Leo thang',       color: '#dc2626' },
  ALERT:    { min: 14, max: Infinity, label: '🚨 Báo động CEO', color: '#7f1d1d' },
};

// ===== MAIN =====

async function run() {
  const startTime = Date.now();
  const now = new Date();

  console.log('==========================================');
  console.log(`[WF4] ${now.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`);
  console.log(`[WF4] Mode: ${DRY_RUN ? '🏜️ DRY-RUN' : '⚡ LIVE'}`);
  console.log('[WF4] Directive Escalation Engine');
  console.log('==========================================');

  // 1. Query directives with deadlines
  console.log('\n[1/3] Querying directives with deadlines...');
  const directives = await queryOverdueClarifications();
  console.log(`  Found: ${directives.length} active directives with deadlines`);

  // 2. Classify overdue items
  console.log('\n[2/3] Classifying overdue directives...');
  const escalations = [];

  for (const page of directives) {
    const props = page.properties || {};

    const title = safeText(props['Tiêu đề']?.title);
    const tinhTrang = safeSelect(props['TINH_TRANG']?.select);
    const dauMoi = safeText(props['T1 - Đầu mối']?.rich_text);
    const nhiemVu = safeText(props['T2 - Nhiệm vụ']?.rich_text);
    const nguoiChiDao = safeText(props['Người chỉ đạo']?.rich_text);
    const deadlineStr = safeDate(props['T4 - Thời hạn']?.date);

    if (!deadlineStr) continue;

    const deadline = new Date(deadlineStr);
    const daysOverdue = Math.ceil((now - deadline) / (1000 * 60 * 60 * 24));
    if (daysOverdue < 3) continue;

    // Resolve email
    let emailDauMoiThucTe = await resolveEmailFromRelation(props['Email đầu mối']) || safeRollupEmail(props['Email đầu mối']?.rollup) || '';
    let emailDauMoi = BOD_HOSTING_EMAIL;

    let emailNguoiChiDaoThucTe = await resolveEmailFromRelation(props['Email người chỉ đạo']) || safeRollupEmail(props['Email người chỉ đạo']?.rollup) || '';
    let emailNguoiChiDao = emailNguoiChiDaoThucTe;

    // Classify
    let level;
    if (daysOverdue >= LEVELS.ALERT.min) level = 'ALERT';
    else if (daysOverdue >= LEVELS.ESCALATE.min) level = 'ESCALATE';
    else level = 'WARNING';

    escalations.push({
      id: page.id, title, daysOverdue, deadline: deadlineStr,
      tinhTrang, dauMoi, nhiemVu, nguoiChiDao, level,
      emailDauMoiThucTe, emailNguoiChiDaoThucTe,
      emailDauMoi, emailNguoiChiDao,
      url: page.url || `https://www.notion.so/${page.id.replace(/-/g, '')}`,
    });
  }

  escalations.sort((a, b) => b.daysOverdue - a.daysOverdue);

  const warningCount = escalations.filter(e => e.level === 'WARNING').length;
  const escalateCount = escalations.filter(e => e.level === 'ESCALATE').length;
  const alertCount = escalations.filter(e => e.level === 'ALERT').length;

  console.log(`  ⚠️ Warning (3-7 ngày): ${warningCount}`);
  console.log(`  🔴 Escalate (7-14 ngày): ${escalateCount}`);
  console.log(`  🚨 Alert (>14 ngày): ${alertCount}`);

  if (escalations.length === 0) {
    console.log('  → Không có chỉ đạo nào quá hạn.');
    return { total: 0, sent: 0 };
  }

  // 3. Send escalation emails
  console.log('\n[3/3] Sending escalation emails...');
  let sentCount = 0;

  for (const esc of escalations) {
    let sendTo, ccList;

    if (esc.level === 'WARNING') {
      sendTo = esc.emailDauMoi || CEO_EMAIL;
      ccList = [...ALWAYS_CC, esc.emailDauMoiThucTe];
    } else if (esc.level === 'ESCALATE') {
      sendTo = esc.emailNguoiChiDao || CEO_EMAIL;
      ccList = [...ALWAYS_CC, esc.emailDauMoi, esc.emailDauMoiThucTe, esc.emailNguoiChiDaoThucTe];
    } else {
      sendTo = CEO_EMAIL;
      ccList = [...ALWAYS_CC, esc.emailNguoiChiDao, esc.emailDauMoi, esc.emailDauMoiThucTe, esc.emailNguoiChiDaoThucTe];
    }

    ccList = [...new Set(ccList)].filter(e => e && e !== sendTo);

    try {
      if (!DRY_RUN) {
        await sendEmail({
          to: sendTo,
          subject: `${LEVELS[esc.level].label} "${esc.title}" quá hạn ${esc.daysOverdue} ngày`,
          html: buildEscalationHtml({
            tieuDe: esc.title,
            tenDauMoi: esc.dauMoi,
            t4ThoiHan: esc.deadline,
            overdueDays: esc.daysOverdue,
            tinhTrang: esc.tinhTrang,
            nguon: '',
            recipientName: esc.level === 'ALERT' ? 'CEO' : esc.dauMoi,
            url: esc.url,
          }, esc.level),
          cc: ccList.join(', '),
        });
      } else {
        console.log(`  [DRY-RUN] ${esc.level}: "${esc.title}" (${esc.daysOverdue}d) → ${sendTo}`);
      }

      await logExecution({
        workflow: 'WF4 - Directive Escalation',
        step: esc.level,
        status: '✅ Success',
        clarificationId: esc.id,
        details: `${esc.level}: "${esc.title}" quá hạn ${esc.daysOverdue} ngày`,
        emailTo: sendTo,
        dryRun: DRY_RUN,
      });

      sentCount++;
    } catch (error) {
      console.error(`  ❌ FAILED "${esc.title}":`, error.message);
      await logExecution({
        workflow: 'WF4 - Directive Escalation',
        step: esc.level,
        status: '❌ Error',
        clarificationId: esc.id,
        details: `Error: ${error.message}`,
        dryRun: DRY_RUN,
      });
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n==========================================');
  console.log('[WF4] SUMMARY:');
  console.log(`  ⚠️ Warning: ${warningCount}`);
  console.log(`  🔴 Escalate: ${escalateCount}`);
  console.log(`  🚨 Alert: ${alertCount}`);
  console.log(`  📧 Sent: ${sentCount}`);
  console.log(`  ⏱️ Time: ${elapsed}s`);
  console.log('==========================================');

  return { total: escalations.length, sent: sentCount, warningCount, escalateCount, alertCount };
}

if (require.main === module) {
  run().catch(err => {
    console.error('❌ FATAL:', err);
    process.exit(1);
  });
}

module.exports = { run };
