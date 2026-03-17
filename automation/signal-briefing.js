/**
 * signal-briefing.js — Báo cáo tuần qua Signal
 *
 * Gọi Supabase trực tiếp → format message → gửi qua Signal CLI.
 *
 * Usage:
 *   node signal-briefing.js              # Gửi Signal
 *   node signal-briefing.js --dry-run    # Preview message, không gửi
 *   node signal-briefing.js --stdout     # Chỉ in ra stdout
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { createClient } = require('@supabase/supabase-js');
const http = require('http');

// ===== CONFIG =====

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[SIGNAL] Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env');
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

const DRY_RUN = process.argv.includes('--dry-run');
const STDOUT_ONLY = process.argv.includes('--stdout');
const MODULE = '[SIGNAL]';

const SIGNAL_API_URL = process.env.SIGNAL_API_URL || 'http://localhost:8080';
const SIGNAL_BOT_NUMBER = process.env.SIGNAL_BOT_NUMBER;
const SIGNAL_ADMIN_NUMBERS = (process.env.SIGNAL_ADMIN_NUMBERS || '').split(',').filter(Boolean);

// ===== MAIN =====

async function run() {
  if (!DRY_RUN && !STDOUT_ONLY) {
    console.log(`${MODULE} Đang tạo báo cáo tuần...`);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1. Query directives
  const { data: directives, error } = await db
    .from('directives')
    .select('id, directive_code, t1_dau_moi, t4_thoi_han, tinh_trang, confirmed_at, lls_step');

  if (error) {
    console.error(`${MODULE} Lỗi query:`, error.message);
    process.exit(1);
  }

  const all = directives || [];
  const total = all.length;

  // Phân loại trạng thái
  const completed = all.filter((d) => d.tinh_trang === 'hoan_thanh').length;
  const rejected = all.filter((d) => d.tinh_trang === 'tu_choi').length;
  const active = all.filter((d) => d.tinh_trang !== 'hoan_thanh' && d.tinh_trang !== 'tu_choi');

  // Tính overdue
  let overdueCount = 0;
  let lostControlCount = 0;

  for (const d of active) {
    if (!d.t4_thoi_han) continue;
    const deadline = new Date(d.t4_thoi_han);
    deadline.setHours(0, 0, 0, 0);
    const daysOverdue = Math.floor((today.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24));
    if (daysOverdue >= 14) lostControlCount++;
    if (daysOverdue >= 1) overdueCount++;
  }

  const confirmed = all.filter((d) => d.confirmed_at).length;

  // 2. Top 5 HM nóng nhất
  const { data: hm50Hot } = await db
    .from('hm50')
    .select('hm_number, ten, directive_count')
    .gt('directive_count', 0)
    .order('directive_count', { ascending: false })
    .limit(5);

  // 3. Engagement events tuần này
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count: eventsThisWeek } = await db
    .from('engagement_events')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', weekAgo);

  // 4. Format message
  const dateStr = today.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  const lines = [];

  lines.push(`📊 BÁO CÁO TUẦN — CEO Directives`);
  lines.push(`📅 ${dateStr}`);
  lines.push(`───────────────────────`);
  lines.push(`Tổng chỉ đạo: ${total}`);
  lines.push(`✅ Hoàn thành: ${completed} | ⏳ Đang xử lý: ${active.length}`);
  lines.push(`🔥 Quá hạn: ${overdueCount} | 💀 Mất kiểm soát: ${lostControlCount}`);
  lines.push(`📝 Đã xác nhận: ${confirmed}/${total}`);
  lines.push(`📨 Events tuần này: ${eventsThisWeek || 0}`);
  lines.push(`───────────────────────`);

  if (hm50Hot && hm50Hot.length > 0) {
    lines.push(`TOP 5 HM nóng nhất:`);
    for (let i = 0; i < hm50Hot.length; i++) {
      const h = hm50Hot[i];
      lines.push(`  ${i + 1}. HM${h.hm_number} — ${h.ten} (${h.directive_count} chỉ đạo)`);
    }
  }

  const message = lines.join('\n');

  // Output
  console.log(message);

  if (STDOUT_ONLY || DRY_RUN) {
    if (DRY_RUN) console.log(`\n${MODULE} DRY-RUN — không gửi Signal`);
    return;
  }

  // 5. Gửi qua Signal
  if (!SIGNAL_BOT_NUMBER || SIGNAL_ADMIN_NUMBERS.length === 0) {
    console.log(`${MODULE} Thiếu SIGNAL_BOT_NUMBER hoặc SIGNAL_ADMIN_NUMBERS — skip gửi`);
    return;
  }

  for (const recipient of SIGNAL_ADMIN_NUMBERS) {
    await sendSignalMessage(recipient, message);
  }
}

/**
 * Gửi message qua Signal REST API
 */
function sendSignalMessage(recipient, message) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      message,
      number: SIGNAL_BOT_NUMBER,
      recipients: [recipient],
    });

    const url = new URL(`${SIGNAL_API_URL}/v2/send`);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`${MODULE} ✅ Đã gửi Signal tới ${recipient}`);
          resolve(data);
        } else {
          console.error(`${MODULE} ❌ Signal API lỗi ${res.statusCode}: ${data}`);
          resolve(null); // Không throw — tiếp tục gửi cho người khác
        }
      });
    });

    req.on('error', (err) => {
      console.error(`${MODULE} ❌ Không kết nối được Signal API: ${err.message}`);
      resolve(null);
    });

    req.write(payload);
    req.end();
  });
}

// ===== EXECUTE =====

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(`${MODULE} Lỗi:`, err);
    process.exit(1);
  });
