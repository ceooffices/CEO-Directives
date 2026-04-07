/**
 * wf4-directive-escalation.js
 * CEO Directive WF4: Đồng Hành Engine (Bước 6)
 *
 * Hợp nhất WF4 (Escalation) + WF8 (NKHĐS) + phần overdue của WF5 (đã bỏ).
 * Engine DUY NHẤT cho "Bước 6: Đồng hành" trong quy trình 7 bước.
 *
 * Logic mới:
 *   1. Query directives quá hạn ≥3 ngày
 *   2. Split multi-name t1_dau_moi → resolve email từng người
 *   3. Group directives theo email đầu mối → MỖI NGƯỜI 1 EMAIL/NGÀY
 *   4. Phân loại theo max daysOverdue của mỗi đầu mối:
 *      - WARNING  (3-7 ngày): Email đầu mối (Content Bible: positive, 3 lựa chọn)
 *      - ESCALATE (7-14 ngày): Email BOD + CC đầu mối
 *      - ALERT    (>14 ngày): Email CEO + CC BOD + đầu mối
 *
 * Content Bible compliance (từ WF8):
 *   - Positive framing: "cần quan tâm" thay vì "quá hạn"
 *   - 3 lựa chọn trao quyền: "Đang tốt" / "Cần thêm thời gian" / "Cần hỗ trợ"
 *   - Tracking pixel cho mỗi email
 *
 * Migrated: Notion → Supabase (2026-03-18)
 * Consolidated: WF4 + WF8 + WF5(overdue) → WF4 (2026-04-07)
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

// ===== HELPERS (from WF8) =====

/**
 * Split multi-name t1_dau_moi thành danh sách tên riêng.
 * Ví dụ: "Đặng Tiến Dũng, Bùi Thị Thanh Hiếu" → ["Đặng Tiến Dũng", "Bùi Thị Thanh Hiếu"]
 */
function splitDauMoi(dauMoiRaw) {
  if (!dauMoiRaw) return [];
  return dauMoiRaw
    .split(/[,;]/)
    .map(n => n.trim())
    .filter(Boolean);
}

/**
 * Resolve email cho 1 tên đầu mối.
 * Ưu tiên: t1_email (nếu chỉ 1 người) → getStaffEmail → fallback ''
 */
async function resolveEmail(name, t1EmailField) {
  if (t1EmailField && !t1EmailField.includes(',')) {
    return t1EmailField;
  }
  const email = await getStaffEmail(name);
  return email || '';
}

// ===== MAIN =====

async function run() {
  const startTime = Date.now();
  const now = new Date();

  console.log('==========================================');
  console.log(`[WF4] ${now.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`);
  console.log(`[WF4] Mode: ${DRY_RUN ? '🏜️ DRY-RUN' : '⚡ LIVE'}`);
  console.log('[WF4] Đồng Hành Engine (Bước 6) — Hợp nhất WF4+WF8');
  console.log('==========================================');

  // 1. Query overdue directives (đã filter >= 3 ngày trong supabase-client)
  console.log('\n[1/4] Querying overdue directives...');
  const directives = await queryOverdueDirectives();
  console.log(`  Found: ${directives.length} overdue directives`);

  if (directives.length === 0) {
    console.log('  → Không có chỉ đạo nào cần quan tâm.');
    return { total: 0, sent: 0, recipients: 0 };
  }

  // 2. Split multi-name + resolve emails + classify + group by email
  console.log('\n[2/4] Resolving emails, classifying, grouping by đầu mối...');
  const byEmail = {}; // { email: { name, email, maxLevel, directives: [...] } }
  let warningCount = 0, escalateCount = 0, alertCount = 0, skipCount = 0;

  for (const row of directives) {
    const dauMoiRaw = row.t1_dau_moi || '';
    const names = splitDauMoi(dauMoiRaw);
    const deadlineStr = row.t4_thoi_han;

    if (!deadlineStr) continue;

    const deadline = new Date(deadlineStr);
    const daysOverdue = Math.ceil((now - deadline) / (1000 * 60 * 60 * 24));
    if (daysOverdue < 3) continue;

    // Classify level
    let level;
    if (daysOverdue >= LEVELS.ALERT.min) { level = 'ALERT'; alertCount++; }
    else if (daysOverdue >= LEVELS.ESCALATE.min) { level = 'ESCALATE'; escalateCount++; }
    else { level = 'WARNING'; warningCount++; }

    const taskInfo = {
      id: row.id,
      title: row.directive_code || row.t2_nhiem_vu || 'Không tên',
      nhiemVu: row.t2_nhiem_vu || '',
      deadline: deadlineStr,
      daysOverdue,
      level,
      tinhTrang: row.tinh_trang || '',
      url: directiveUrl(row.id),
    };

    if (names.length === 0) {
      console.log(`  ⚠️ [${taskInfo.title}] Thiếu t1_dau_moi — fallback BOD`);
      skipCount++;
      const fallbackEmail = BOD_HOSTING_EMAIL;
      if (!byEmail[fallbackEmail]) {
        byEmail[fallbackEmail] = { name: 'BOD Hosting', email: fallbackEmail, directives: [] };
      }
      byEmail[fallbackEmail].directives.push(taskInfo);
      continue;
    }

    // Resolve cho TỪNG tên trong multi-name field
    for (const name of names) {
      const email = await resolveEmail(name, row.t1_email);

      if (!email) {
        console.log(`  ⚠️ [${taskInfo.title}] Không tìm thấy email cho "${name}" — fallback BOD`);
        skipCount++;
        const fallbackEmail = BOD_HOSTING_EMAIL;
        if (!byEmail[fallbackEmail]) {
          byEmail[fallbackEmail] = { name, email: fallbackEmail, directives: [] };
        }
        byEmail[fallbackEmail].directives.push(taskInfo);
        continue;
      }

      if (!byEmail[email]) {
        byEmail[email] = { name, email, directives: [] };
      }
      byEmail[email].directives.push(taskInfo);
    }
  }

  const recipientCount = Object.keys(byEmail).length;
  console.log(`  📋 Cần quan tâm (3-7 ngày): ${warningCount}`);
  console.log(`  🔶 Tín hiệu rủi ro (7-14 ngày): ${escalateCount}`);
  console.log(`  📋 Cần hỗ trợ đặc biệt (>14 ngày): ${alertCount}`);
  console.log(`  👥 Đầu mối riêng biệt: ${recipientCount}`);
  if (skipCount > 0) console.log(`  ⚠️ Fallback BOD: ${skipCount}`);

  // 3. Determine max level per recipient and send grouped email
  console.log('\n[3/4] Sending grouped emails (1 email / đầu mối)...');
  let sentCount = 0, failCount = 0;

  for (const [email, recipient] of Object.entries(byEmail)) {
    // Determine highest level for this recipient
    const hasAlert = recipient.directives.some(d => d.level === 'ALERT');
    const hasEscalate = recipient.directives.some(d => d.level === 'ESCALATE');
    const maxLevel = hasAlert ? 'ALERT' : (hasEscalate ? 'ESCALATE' : 'WARNING');
    const maxDaysOverdue = Math.max(...recipient.directives.map(d => d.daysOverdue));

    // Determine recipients based on max level
    let sendTo, ccList;

    if (maxLevel === 'WARNING') {
      // WARNING: Chỉ gửi cho đầu mối (Content Bible tone)
      sendTo = email;
      ccList = [...ALWAYS_CC];
    } else if (maxLevel === 'ESCALATE') {
      // ESCALATE: Gửi cho đầu mối + CC BOD
      sendTo = email;
      ccList = [...ALWAYS_CC, BOD_HOSTING_EMAIL];
    } else {
      // ALERT: Gửi cho CEO + CC đầu mối + BOD
      sendTo = CEO_EMAIL;
      ccList = [...ALWAYS_CC, email, BOD_HOSTING_EMAIL];
    }

    ccList = [...new Set(ccList)].filter(e => e && e !== sendTo);

    // Sort directives by daysOverdue (cao nhất trước)
    recipient.directives.sort((a, b) => b.daysOverdue - a.daysOverdue);

    // Subject line: grouped
    const directiveCount = recipient.directives.length;
    const subject = maxLevel === 'ALERT'
      ? `${LEVELS.ALERT.label} ${recipient.name} — ${directiveCount} chỉ đạo cần hỗ trợ đặc biệt`
      : maxLevel === 'ESCALATE'
        ? `${LEVELS.ESCALATE.label} ${recipient.name} — ${directiveCount} chỉ đạo cần xem xét`
        : `Đồng hành — ${recipient.name}: ${directiveCount} chỉ đạo cần quan tâm`;

    try {
      // Build email for the most critical directive (template uses single directive data)
      // But we pass ALL directives as tasks list for grouping
      const primaryDirective = recipient.directives[0];

      if (!DRY_RUN) {
        await sendEmail({
          to: sendTo,
          subject,
          html: buildEscalationHtml({
            tieuDe: primaryDirective.title,
            tenDauMoi: recipient.name,
            t4ThoiHan: primaryDirective.deadline,
            overdueDays: maxDaysOverdue,
            tinhTrang: primaryDirective.tinhTrang,
            nhiemVu: primaryDirective.nhiemVu,
            nguon: '',
            recipientName: maxLevel === 'ALERT' ? 'CEO' : recipient.name,
            url: primaryDirective.url,
            id: primaryDirective.id,
            emailDauMoi: email,
            // Grouped directives for multi-task display
            tasks: recipient.directives,
            taskCount: directiveCount,
          }, maxLevel),
          cc: ccList.join(', '),
        });
      } else {
        console.log(`  [DRY-RUN] ${maxLevel}: ${recipient.name} (${email}) — ${directiveCount} directives, max ${maxDaysOverdue}d`);
        for (const d of recipient.directives) {
          console.log(`    └─ ${d.level}: "${d.title}" (${d.daysOverdue}d)`);
        }
      }

      // Log event for each directive
      for (const d of recipient.directives) {
        await logEvent(d.id, 'wf4_escalation', {
          level: d.level,
          groupLevel: maxLevel,
          daysOverdue: d.daysOverdue,
          title: d.title,
          emailTo: sendTo,
          grouped: true,
          taskCount: directiveCount,
        }, DRY_RUN);
      }

      sentCount++;
    } catch (error) {
      failCount++;
      console.error(`  ❌ FAILED ${recipient.name} (${email}):`, error.message);
      for (const d of recipient.directives) {
        await logEvent(d.id, 'wf4_error', {
          level: d.level,
          error: error.message,
        }, DRY_RUN);
      }
    }
  }

  // 4. Summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n[4/4] Summary');
  console.log('==========================================');
  console.log('[WF4] ĐỒNG HÀNH ENGINE — SUMMARY:');
  console.log(`  📋 Directives cần quan tâm: ${warningCount + escalateCount + alertCount}`);
  console.log(`    └─ WARNING (3-7d): ${warningCount}`);
  console.log(`    └─ ESCALATE (7-14d): ${escalateCount}`);
  console.log(`    └─ ALERT (>14d): ${alertCount}`);
  console.log(`  👥 Đầu mối: ${recipientCount}`);
  console.log(`  📧 Emails sent: ${sentCount}`);
  console.log(`  ❌ Failed: ${failCount}`);
  console.log(`  ⏱️ Time: ${elapsed}s`);
  console.log('==========================================');

  return {
    total: warningCount + escalateCount + alertCount,
    sent: sentCount,
    failed: failCount,
    recipients: recipientCount,
    warningCount, escalateCount, alertCount,
  };
}

if (require.main === module) {
  run().catch(err => {
    console.error('❌ FATAL:', err);
    process.exit(1);
  });
}

module.exports = { run };
