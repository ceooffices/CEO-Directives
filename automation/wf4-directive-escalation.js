/**
 * wf4-directive-escalation.js (formerly wf4-escalation.js)
 * CEO Directive WF4: Directive Escalation Engine
 *
 * Logic:
 *   Query directives quá hạn → Phân loại → Email
 *   - 3-7 ngày: 📋 Cần quan tâm → hỏi đầu mối có cần hỗ trợ
 *   - 7-14 ngày: 🔶 Tín hiệu rủi ro → tìm hiểu khó khăn
 *   - >14 ngày: 📋 Cần hỗ trợ đặc biệt → Ban Cố Vấn can thiệp
 *
 * Migrated: Notion → Supabase (2026-03-18)
 *
 * Usage:
 *   node wf4-directive-escalation.js              # Chạy thật
 *   node wf4-directive-escalation.js --dry-run    # Chỉ log
 */

const { queryOverdueDirectives, getStaffEmail, logEvent, directiveUrl,
        BOD_HOSTING_EMAIL, ALWAYS_CC, CEO_EMAIL } = require('./lib/supabase-client');
const { sendEmail } = require('./lib/email-sender');
const { buildEscalationEmail: buildEscalationHtml } = require('./lib/email-templates');

const DRY_RUN = process.argv.includes('--dry-run');

// ===== ESCALATION LEVELS =====

const LEVELS = {
  WARNING:  { min: 3,  max: 7,  label: '📋 Cần quan tâm',         color: '#f59e0b' },
  ESCALATE: { min: 7,  max: 14, label: '🔶 Tín hiệu rủi ro',     color: '#dc2626' },
  ALERT:    { min: 14, max: Infinity, label: '📋 Cần hỗ trợ đặc biệt', color: '#7f1d1d' },
};

// ===== MAIN =====

async function run() {
  const startTime = Date.now();
  const now = new Date();

  console.log('==========================================');
  console.log(`[WF4] ${now.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`);
  console.log(`[WF4] Mode: ${DRY_RUN ? '🏜️ DRY-RUN' : '⚡ LIVE'}`);
  console.log('[WF4] Directive Escalation Engine — Supabase');
  console.log('==========================================');

  // 1. Query overdue directives (đã filter >= 3 ngày trong supabase-client)
  console.log('\n[1/3] Querying overdue directives...');
  const directives = await queryOverdueDirectives();
  console.log(`  Found: ${directives.length} overdue directives`);

  // 2. Classify
  console.log('\n[2/3] Classifying overdue directives...');
  const escalations = [];

  for (const row of directives) {
    const title = row.directive_code;
    const tinhTrang = row.tinh_trang;
    const dauMoi = row.t1_dau_moi;
    const nhiemVu = row.t2_nhiem_vu;
    const deadlineStr = row.t4_thoi_han;

    if (!deadlineStr) continue;

    const deadline = new Date(deadlineStr);
    const daysOverdue = Math.ceil((now - deadline) / (1000 * 60 * 60 * 24));
    if (daysOverdue < 3) continue;

    // Resolve email — lấy đúng email đầu mối, fallback BOD_HOSTING_EMAIL
    const resolvedEmailDauMoi = row.t1_email || await getStaffEmail(row.t1_dau_moi);
    const emailDauMoi = resolvedEmailDauMoi || BOD_HOSTING_EMAIL;
    const emailNguoiChiDao = row.t1_email || await getStaffEmail(row.t1_dau_moi);

    // Classify level
    let level;
    if (daysOverdue >= LEVELS.ALERT.min) level = 'ALERT';
    else if (daysOverdue >= LEVELS.ESCALATE.min) level = 'ESCALATE';
    else level = 'WARNING';

    escalations.push({
      id: row.id, title, daysOverdue, deadline: deadlineStr,
      tinhTrang, dauMoi, nhiemVu, level,
      tenDauMoi: dauMoi,
      resolvedEmailDauMoi, emailNguoiChiDao,
      emailDauMoi,
      url: directiveUrl(row.id),
    });
  }

  escalations.sort((a, b) => b.daysOverdue - a.daysOverdue);

  const warningCount = escalations.filter(e => e.level === 'WARNING').length;
  const escalateCount = escalations.filter(e => e.level === 'ESCALATE').length;
  const alertCount = escalations.filter(e => e.level === 'ALERT').length;

  console.log(`  📋 Cần quan tâm (3-7 ngày): ${warningCount}`);
  console.log(`  🔶 Tín hiệu rủi ro (7-14 ngày): ${escalateCount}`);
  console.log(`  📋 Cần hỗ trợ đặc biệt (>14 ngày): ${alertCount}`);

  if (escalations.length === 0) {
    console.log('  → Không có chỉ đạo nào cần quan tâm.');
    return { total: 0, sent: 0 };
  }

  // 3. Send escalation emails
  console.log('\n[3/3] Sending escalation emails...');
  let sentCount = 0;

  for (const esc of escalations) {
    let sendTo, ccList;

    if (esc.level === 'WARNING') {
      sendTo = esc.emailDauMoi || CEO_EMAIL;
      ccList = [...ALWAYS_CC, esc.resolvedEmailDauMoi];
    } else if (esc.level === 'ESCALATE') {
      sendTo = esc.emailNguoiChiDao || CEO_EMAIL;
      ccList = [...ALWAYS_CC, esc.emailDauMoi, esc.resolvedEmailDauMoi];
    } else {
      sendTo = CEO_EMAIL;
      ccList = [...ALWAYS_CC, esc.emailNguoiChiDao, esc.emailDauMoi, esc.resolvedEmailDauMoi];
    }

    ccList = [...new Set(ccList)].filter(e => e && e !== sendTo);

    try {
      if (!DRY_RUN) {
        await sendEmail({
          to: sendTo,
          subject: `${LEVELS[esc.level].label} "${esc.title}" — chưa cập nhật ${esc.daysOverdue} ngày`,
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

      await logEvent(esc.id, 'wf4_escalation', {
        level: esc.level,
        daysOverdue: esc.daysOverdue,
        title: esc.title,
        emailTo: sendTo,
      }, DRY_RUN);

      sentCount++;
    } catch (error) {
      console.error(`  ❌ FAILED "${esc.title}":`, error.message);
      await logEvent(esc.id, 'wf4_error', {
        level: esc.level,
        error: error.message,
      }, DRY_RUN);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n==========================================');
  console.log('[WF4] SUMMARY:');
  console.log(`  📋 Cần quan tâm: ${warningCount}`);
  console.log(`  🔶 Tín hiệu rủi ro: ${escalateCount}`);
  console.log(`  📋 Cần hỗ trợ đặc biệt: ${alertCount}`);
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
