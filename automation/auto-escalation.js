/**
 * auto-escalation.js — Cron tự động đồng hành & phát hiện tín hiệu rủi ro
 *
 * Chạy mỗi ngày 1 lần (8h sáng VN) hoặc manual:
 *   node auto-escalation.js [--dry-run]
 *
 * Logic (dựa trên t4_thoi_han = deadline thật, KHÔNG dùng created_at):
 *   - Chưa có cập nhật ≥1 ngày + chưa xác nhận → auto_remind (đồng hành đầu mối)
 *   - Chưa có cập nhật ≥3 ngày → auto_escalate (tín hiệu rủi ro, update trạng thái)
 *   - Chưa có cập nhật ≥7 ngày → auto_escalate severity:critical (email BOD Hosting)
 *
 * Skip nếu: t4_thoi_han IS NULL, tinh_trang = hoan_thanh/tu_choi
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { createClient } = require('@supabase/supabase-js');
const { sendEmail } = require('./lib/email-sender');

// ===== CONFIG =====

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[ESCALATION] Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env');
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

const DRY_RUN = process.argv.includes('--dry-run');
const MODULE = '[ESCALATION]';

// Ngưỡng (ngày chưa có cập nhật tính từ t4_thoi_han)
const THRESHOLD_REMIND = 1;    // ≥1 ngày chưa có cập nhật → đồng hành
const THRESHOLD_ESCALATE = 3;  // ≥3 ngày chưa có cập nhật → tín hiệu rủi ro
const THRESHOLD_CRITICAL = 7;  // ≥7 ngày chưa có cập nhật → cần hỗ trợ đặc biệt

// ===== MAIN =====

async function run() {
  console.log(`${MODULE} Bắt đầu kiểm tra auto-escalation...`);
  if (DRY_RUN) console.log(`${MODULE} Chế độ DRY-RUN — không ghi DB, không gửi email`);

  const today = new Date();
  today.setHours(0, 0, 0, 0); // So sánh theo ngày, bỏ giờ

  const summary = {
    checked: 0,
    skipped_no_deadline: 0,
    skipped_not_overdue: 0,
    reminded: 0,
    escalated: 0,
    critical: 0,
    skipped_dedup: 0,
    errors: 0,
  };

  // 1. Query chỉ đạo chưa hoàn thành, chưa từ chối
  const { data: directives, error } = await db
    .from('directives')
    .select('id, directive_code, t1_dau_moi, t1_email, t2_nhiem_vu, t4_thoi_han, tinh_trang, confirmed_at, bod_hosting_email')
    .not('tinh_trang', 'in', '("hoan_thanh","tu_choi")');

  if (error) {
    console.error(`${MODULE} Lỗi query directives:`, error.message);
    process.exit(1);
  }

  if (!directives || directives.length === 0) {
    console.log(`${MODULE} Không có chỉ đạo nào cần kiểm tra.`);
    return summary;
  }

  console.log(`${MODULE} Tìm thấy ${directives.length} chỉ đạo chưa hoàn thành`);

  // Lọc: chỉ xử lý những chỉ đạo có deadline
  const withDeadline = directives.filter((d) => d.t4_thoi_han);
  summary.skipped_no_deadline = directives.length - withDeadline.length;
  summary.checked = withDeadline.length;

  if (summary.skipped_no_deadline > 0) {
    console.log(`${MODULE} Skip ${summary.skipped_no_deadline} chỉ đạo không có deadline`);
  }

  if (withDeadline.length === 0) {
    console.log(`${MODULE} Không có chỉ đạo nào có deadline để kiểm tra.`);
    return summary;
  }

  // 2. Lấy events gần nhất để check duplicate (trong 24h)
  const directiveIds = withDeadline.map((d) => d.id);
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: recentEvents } = await db
    .from('engagement_events')
    .select('directive_id, event_type')
    .in('directive_id', directiveIds)
    .in('event_type', ['auto_remind', 'auto_escalate'])
    .gte('created_at', twentyFourHoursAgo);

  // Map: directive_id → Set of event_types đã ghi trong 24h
  const recentMap = new Map();
  for (const ev of recentEvents || []) {
    if (!recentMap.has(ev.directive_id)) recentMap.set(ev.directive_id, new Set());
    recentMap.get(ev.directive_id).add(ev.event_type);
  }

  // 3. Xử lý từng directive
  for (const d of withDeadline) {
    const deadline = new Date(d.t4_thoi_han);
    deadline.setHours(0, 0, 0, 0);
    const daysOverdue = Math.floor((today.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24));

    // Chưa cần quan tâm → skip
    if (daysOverdue < THRESHOLD_REMIND) {
      summary.skipped_not_overdue++;
      continue;
    }

    const recentEvTypes = recentMap.get(d.id) || new Set();

    try {
      if (daysOverdue >= THRESHOLD_CRITICAL) {
        // === ≥7 ngày chưa có cập nhật → Cần hỗ trợ đặc biệt ===
        if (recentEvTypes.has('auto_escalate')) {
          summary.skipped_dedup++;
          continue;
        }
        await handleCritical(d, daysOverdue);
        summary.critical++;
      } else if (daysOverdue >= THRESHOLD_ESCALATE) {
        // === ≥3 ngày chưa có cập nhật → Tín hiệu rủi ro ===
        if (recentEvTypes.has('auto_escalate')) {
          summary.skipped_dedup++;
          continue;
        }
        await handleEscalate(d, daysOverdue);
        summary.escalated++;
      } else if (daysOverdue >= THRESHOLD_REMIND) {
        // === ≥1 ngày chưa có cập nhật + chưa xác nhận → Đồng hành ===
        if (d.confirmed_at) {
          // Đã xác nhận, không cần nhắc
          continue;
        }
        if (recentEvTypes.has('auto_remind')) {
          summary.skipped_dedup++;
          continue;
        }
        await handleRemind(d, daysOverdue);
        summary.reminded++;
      }
    } catch (err) {
      console.error(`${MODULE} Lỗi xử lý ${d.directive_code}:`, err.message);
      summary.errors++;
    }
  }

  // 4. Tổng kết
  console.log(`${MODULE} === KẾT QUẢ ===`);
  console.log(`  Có deadline: ${summary.checked}`);
  console.log(`  Không có deadline (skip): ${summary.skipped_no_deadline}`);
  console.log(`  Chưa cần quan tâm (skip): ${summary.skipped_not_overdue}`);
  console.log(`  Đồng hành (≥${THRESHOLD_REMIND}d): ${summary.reminded}`);
  console.log(`  Tín hiệu rủi ro (≥${THRESHOLD_ESCALATE}d): ${summary.escalated}`);
  console.log(`  Cần hỗ trợ đặc biệt (≥${THRESHOLD_CRITICAL}d): ${summary.critical}`);
  console.log(`  Đã xử lý trong 24h (skip): ${summary.skipped_dedup}`);
  console.log(`  Lỗi: ${summary.errors}`);

  return summary;
}

// ===== HANDLERS =====

/**
 * ≥1 ngày chưa có cập nhật + chưa xác nhận → Đồng hành đầu mối
 */
async function handleRemind(directive, daysOverdue) {
  const code = directive.directive_code;
  const hasEmail = !!directive.t1_email;
  console.log(`${MODULE} 📌 ${code} — chưa có cập nhật ${daysOverdue} ngày → auto_remind${hasEmail ? '' : ' (không có email)'}`);

  if (!DRY_RUN) {
    await db.from('engagement_events').insert({
      directive_id: directive.id,
      event_type: 'auto_remind',
      recipient_email: directive.t1_email || null,
      metadata: {
        days_overdue: daysOverdue,
        deadline: directive.t4_thoi_han,
        dau_moi: directive.t1_dau_moi,
        has_email: hasEmail,
        triggered_at: new Date().toISOString(),
      },
    });
  }

  // Gửi email đồng hành (CHỈ nếu có email, không crash nếu null)
  if (hasEmail) {
    await trySendEmail({
      to: directive.t1_email,
      subject: `⏳ Nhắc xác nhận chỉ đạo ${code} — chưa có cập nhật ${daysOverdue} ngày`,
      html: buildRemindHtml(directive, daysOverdue),
    });
  }
}

/**
 * ≥3 ngày chưa có cập nhật → Tín hiệu rủi ro, update trạng thái
 */
async function handleEscalate(directive, daysOverdue) {
  const code = directive.directive_code;
  console.log(`${MODULE} 📌 ${code} — chưa có cập nhật ${daysOverdue} ngày → auto_escalate`);

  if (!DRY_RUN) {
    await db.from('engagement_events').insert({
      directive_id: directive.id,
      event_type: 'auto_escalate',
      recipient_email: directive.t1_email || null,
      metadata: {
        severity: 'warning',
        days_overdue: daysOverdue,
        deadline: directive.t4_thoi_han,
        dau_moi: directive.t1_dau_moi,
        triggered_at: new Date().toISOString(),
      },
    });

    // Update trạng thái → leo_thang_ceo (nếu chưa)
    if (directive.tinh_trang !== 'leo_thang_ceo') {
      await db
        .from('directives')
        .update({ tinh_trang: 'leo_thang_ceo' })
        .eq('id', directive.id);
    }
  }
}

/**
 * ≥7 ngày chưa có cập nhật → Cần hỗ trợ đặc biệt, email BOD Hosting
 */
async function handleCritical(directive, daysOverdue) {
  const code = directive.directive_code;
  console.log(`${MODULE} 📋 ${code} — chưa có cập nhật ${daysOverdue} ngày → CRITICAL`);

  if (!DRY_RUN) {
    await db.from('engagement_events').insert({
      directive_id: directive.id,
      event_type: 'auto_escalate',
      recipient_email: directive.bod_hosting_email || null,
      metadata: {
        severity: 'critical',
        days_overdue: daysOverdue,
        deadline: directive.t4_thoi_han,
        dau_moi: directive.t1_dau_moi,
        triggered_at: new Date().toISOString(),
      },
    });

    // Update trạng thái
    if (directive.tinh_trang !== 'leo_thang_ceo') {
      await db
        .from('directives')
        .update({ tinh_trang: 'leo_thang_ceo' })
        .eq('id', directive.id);
    }
  }

  // Gửi email cho BOD Hosting (CHỈ nếu có email)
  if (directive.bod_hosting_email) {
    await trySendEmail({
      to: directive.bod_hosting_email,
      subject: `📌 [Cần hỗ trợ đặc biệt] Chỉ đạo ${code} — chưa có cập nhật ${daysOverdue} ngày`,
      html: buildCriticalHtml(directive, daysOverdue),
    });
  }
}

// ===== EMAIL TEMPLATES =====

function buildRemindHtml(directive, daysOverdue) {
  const dashboardUrl = process.env.DASHBOARD_URL || 'http://localhost:3000';
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px;">
      <h3>⏳ Nhắc xác nhận chỉ đạo</h3>
      <p>Chào anh/chị <strong>${directive.t1_dau_moi}</strong>,</p>
      <p>Chỉ đạo <strong>${directive.directive_code}</strong> đã <strong>chưa có cập nhật ${daysOverdue} ngày</strong> (deadline: ${directive.t4_thoi_han}) và chưa được xác nhận.</p>
      <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Nhiệm vụ</td><td style="padding: 8px; border: 1px solid #ddd;">${directive.t2_nhiem_vu || ''}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Thời hạn</td><td style="padding: 8px; border: 1px solid #ddd;">${directive.t4_thoi_han}</td></tr>
      </table>
      <p>► <a href="${dashboardUrl}/confirm/${directive.id}">Xác nhận ngay</a></p>
      <hr style="margin-top: 24px;" />
      <p style="color: #888; font-size: 12px;">Tin nhắn tự động từ Hệ thống Chỉ đạo CEO — EsuhaiGroup</p>
    </div>
  `;
}

function buildCriticalHtml(directive, daysOverdue) {
  const dashboardUrl = process.env.DASHBOARD_URL || 'http://localhost:3000';
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px;">
      <h3 style="color: #dc2626;">📌 Cần hỗ trợ đặc biệt — Chỉ đạo chưa có cập nhật ${daysOverdue} ngày</h3>
      <p>Kính gửi anh/chị,</p>
      <p>Chỉ đạo <strong>${directive.directive_code}</strong> đã <strong>chưa có cập nhật ${daysOverdue} ngày</strong> và đầu mối <strong>${directive.t1_dau_moi}</strong> chưa phản hồi.</p>
      <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Nhiệm vụ</td><td style="padding: 8px; border: 1px solid #ddd;">${directive.t2_nhiem_vu || ''}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Đầu mối</td><td style="padding: 8px; border: 1px solid #ddd;">${directive.t1_dau_moi}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Thời hạn</td><td style="padding: 8px; border: 1px solid #ddd;">${directive.t4_thoi_han}</td></tr>
      </table>
      <p>► <a href="${dashboardUrl}/directive/${directive.id}">Xem chi tiết</a></p>
      <hr style="margin-top: 24px;" />
      <p style="color: #888; font-size: 12px;">Tin nhắn tự động từ Hệ thống Chỉ đạo CEO — EsuhaiGroup</p>
    </div>
  `;
}

// ===== HELPERS =====

async function trySendEmail(options) {
  try {
    await sendEmail({ ...options, dryRun: DRY_RUN });
  } catch (err) {
    console.error(`${MODULE} Không gửi được email tới ${options.to}:`, err.message);
    // Không throw — email failure không nên dừng cron
  }
}

// ===== EXECUTE =====

run()
  .then((summary) => {
    console.log(`${MODULE} Hoàn tất.`, DRY_RUN ? '(DRY-RUN)' : '');
    process.exit(0);
  })
  .catch((err) => {
    console.error(`${MODULE} Lỗi nghiêm trọng:`, err);
    process.exit(1);
  });
