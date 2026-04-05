/**
 * telegram-bot.js
 * CEO Directive Automation — Telegram Bot Interface
 * 
 * Commands:
 *   /start      — Giới thiệu bot
 *   /trangthai  — Tổng quan trạng thái chỉ đạo
 *   /quahan     — Danh sách chỉ đạo cần quan tâm
 *   /tim <keyword> — Tìm chỉ đạo theo từ khóa
 *   /chay <wf>  — Chạy workflow (wf1-6, hm50, all)
 *   /baocao     — Báo cáo tổng hợp hàng ngày
 *   /hoi <câu hỏi> — Hỏi AI về chỉ đạo
 *   /phantich   — AI phân tích pattern + rủi ro
 *   /baocaotuan — Báo cáo tuần AI đầy đủ
 * 
 * Usage:
 *   node telegram-bot.js         # Start bot
 *   node telegram-bot.js --test  # Send test message and exit
 */

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const http = require('http');

// ===== INTELLIGENCE MODULES (Phase 7A) =====
const { detectIntent, getQuickReply, intentToCommand, INTENT_TYPES } = require('./intent-detector');
const session = require('./session-manager');
const bible = require('./content-bible');

// ===== CONFIG =====
// Ưu tiên CEO_DIR_BOT_TOKEN (token riêng) → fallback TELEGRAM_BOT_TOKEN / BOT_TOKEN
const BOT_TOKEN = process.env.CEO_DIR_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || process.env.ADMIN_USER_IDS;
const BRIDGE_URL = process.env.BRIDGE_URL || `http://localhost:${process.env.PORT_BRIDGE || '3101'}`;
const AUTH_TOKEN = process.env.NEMOCLAW_GATEWAY_TOKEN;
if (!AUTH_TOKEN) {
  console.error('[BOT] ❌ NEMOCLAW_GATEWAY_TOKEN chưa cấu hình trong .env');
  process.exit(1);
}
const HOOK_PORT = parseInt(process.env.PORT_TELEGRAM_HOOK || '3102');

// Allowed Telegram user IDs (security: only admin can use)
const ALLOWED_USERS = (process.env.TELEGRAM_ALLOWED_USERS || process.env.ADMIN_USER_IDS || '')
  .split(',')
  .map(id => id.trim())
  .filter(Boolean);

if (!BOT_TOKEN) {
  console.error('[BOT] ✖ TELEGRAM_BOT_TOKEN không có trong .env');
  process.exit(1);
}

// ===== RATE LIMIT PER USER (S2.3) =====
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 phút
const RATE_LIMIT_MAX = 10;           // Tối đa 10 tin nhắn/phút
const rateLimitMap = new Map();      // userId → [timestamp, ...]

function checkRateLimit(userId) {
  const now = Date.now();
  const key = String(userId);
  if (!rateLimitMap.has(key)) rateLimitMap.set(key, []);
  const timestamps = rateLimitMap.get(key).filter(t => now - t < RATE_LIMIT_WINDOW);
  rateLimitMap.set(key, timestamps);
  if (timestamps.length >= RATE_LIMIT_MAX) return false;
  timestamps.push(now);
  return true;
}

// Dọn bộ nhớ rate limit mỗi 5 phút
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of rateLimitMap) {
    const valid = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW);
    if (valid.length === 0) rateLimitMap.delete(key);
    else rateLimitMap.set(key, valid);
  }
}, 5 * 60 * 1000);

// ===== BRIDGE CLIENT =====
function bridgeRequest(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BRIDGE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve({ raw: data });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Bridge request timeout (30s)'));
    });
    req.end();
  });
}

// ===== ACCESS CONTROL =====
function isAllowed(msg) {
  if (ALLOWED_USERS.length === 0) return true; // No restriction if not configured
  const userId = String(msg.from?.id || '');
  return ALLOWED_USERS.includes(userId);
}

function denyMessage() {
  return '🔒 Bạn không có quyền sử dụng bot này.\nLiên hệ admin để được cấp quyền.';
}

function rateLimitMessage() {
  return '⏳ Thầy ơi, con cần Thầy chờ một chút ạ. Thầy đang gửi quá nhiều tin nhắn — thử lại sau 1 phút ạ.';
}

/** Kiểm tra quyền + rate limit. Trả về true nếu OK */
function canProcess(msg) {
  if (!isAllowed(msg)) {
    bot.sendMessage(msg.chat.id, denyMessage());
    return false;
  }
  const userId = msg.from?.id || 'unknown';
  if (!checkRateLimit(userId)) {
    bot.sendMessage(msg.chat.id, rateLimitMessage());
    console.log(`[BOT] ⏳ Rate limit cho user ${userId}`);
    return false;
  }
  return true;
}

// ===== ADMIN NOTIFICATION =====
function notifyAdmin(err, context) {
  if (!ADMIN_CHAT_ID) return;
  const text = `📌 [LỖI HỆ THỐNG]\nContext: ${context}\nError: ${err.message || err}`;
  bot.sendMessage(ADMIN_CHAT_ID, text).catch(() => {}); // Không throw nếu gửi thất bại
}

// ===== CONSTANTS =====
const DASHBOARD_URL = process.env.DASHBOARD_URL || 'https://ceodirectives.vercel.app';

// ===== INLINE KEYBOARD BUILDERS =====
function kbd(buttons) {
  // buttons = [[{text, url?callback_data?}], [...]]
  return { reply_markup: { inline_keyboard: buttons } };
}

function kbdMain() {
  return kbd([
    [{ text: '📊 Dashboard CEO', url: DASHBOARD_URL }],
    [{ text: '☑ Trạng thái', callback_data: 'cmd_trangthai' }, { text: '📌 Cần quan tâm', callback_data: 'cmd_quahan' }],
    [{ text: '► AI Phân tích', callback_data: 'cmd_phantich' }, { text: '📌 Báo cáo', callback_data: 'cmd_baocao' }],
    [{ text: '📊 Mở Dashboard', url: DASHBOARD_URL }],
  ]);
}

function kbdAfterStatus() {
  return kbd([
    [{ text: '📌 Xem cần quan tâm', callback_data: 'cmd_quahan' }, { text: '🧠 AI phân tích', callback_data: 'cmd_phantich' }],
    [{ text: '🚀 Chạy WF1 (email duyệt)', callback_data: 'cmd_chay_wf1' }, { text: '📋 Báo cáo tuần', callback_data: 'cmd_baocaotuan' }],
    [{ text: '📊 Mở Dashboard', url: DASHBOARD_URL }],
  ]);
}

function kbdAfterOverdue() {
  return kbd([
    [{ text: '🔶 Tín hiệu rủi ro (WF4)', callback_data: 'cmd_chay_wf4' }, { text: '📋 Đồng hành (WF5)', callback_data: 'cmd_chay_wf5' }],
    [{ text: '🧠 AI dự đoán rủi ro', callback_data: 'cmd_phantich' }, { text: '📊 Trạng thái', callback_data: 'cmd_trangthai' }],
    [{ text: '📊 Mở Dashboard', url: DASHBOARD_URL }],
  ]);
}

function kbdAfterRun() {
  return kbd([
    [{ text: '📊 Xem trạng thái', callback_data: 'cmd_trangthai' }, { text: '📌 Cần quan tâm', callback_data: 'cmd_quahan' }],
    [{ text: '📊 Mở Dashboard', url: DASHBOARD_URL }],
  ]);
}

function kbdAfterAI() {
  return kbd([
    [{ text: '💬 Hỏi thêm AI', callback_data: 'prompt_hoi' }, { text: '📋 Báo cáo tuần', callback_data: 'cmd_baocaotuan' }],
    [{ text: '📌 Xem cần quan tâm', callback_data: 'cmd_quahan' }, { text: '📊 Trạng thái', callback_data: 'cmd_trangthai' }],
    [{ text: '📊 Mở Dashboard', url: DASHBOARD_URL }],
  ]);
}

function kbdAfterSearch() {
  return kbd([
    [{ text: '📊 Trạng thái', callback_data: 'cmd_trangthai' }, { text: '🧠 AI phân tích', callback_data: 'cmd_phantich' }],
    [{ text: '📊 Mở Dashboard', url: DASHBOARD_URL }],
  ]);
}

function kbdConfirmRun(wfName) {
  return kbd([
    [
      { text: '☑ Xác nhận chạy ' + wfName, callback_data: 'cmd_confirm_wf_' + wfName },
      { text: '✖ Hủy', callback_data: 'cmd_cancel_wf' },
    ],
  ]);
}

// ===== FORMATTERS =====
function formatStatus(data) {
  const d = data.directives || {};
  const uptime = Math.floor(data.uptime || 0);
  const hours = Math.floor(uptime / 3600);
  const mins = Math.floor((uptime % 3600) / 60);

  return `📊 *TRẠNG THÁI HỆ THỐNG*
━━━━━━━━━━━━━━━━━━━━

🕐 Cập nhật: ${data.timestamp || 'N/A'}
⏱ Bridge uptime: ${hours}h${mins}m

📋 *Chỉ đạo:*
  • Chờ duyệt: *${d.pending_approval ?? '?'}*
  • Đã confirm 5T: *${d.confirmed_5t ?? '?'}*
  • Đang thực hiện: *${d.active ?? '?'}*
  • 📌 Cần quan tâm: *${d.overdue ?? '?'}*

🔧 Workflows: ${(data.workflows || []).join(', ')}`;
}

function formatOverdue(data) {
  if (!data.items || data.items.length === 0) {
    return '☑ *Không có chỉ đạo cần quan tâm!*\nMọi thứ đang đúng tiến độ.';
  }

  let msg = `📌 *CHỈ ĐẠO CẦN QUAN TÂM* (${data.count}/${data.total})\n━━━━━━━━━━━━━━━━━━━━\n\n`;

  data.items.forEach((item, i) => {
    msg += `*${i + 1}. ${escMd(item.title || 'Không tên')}*\n`;
    msg += `   👤 Đầu mối: ${escMd(item.dauMoi || 'N/A')}\n`;
    msg += `   📅 Hạn: ${item.deadline || 'N/A'}\n`;
    msg += `   🔴 Quá *${item.daysOverdue}* ngày\n`;
    if (item.url) msg += `   🔗 [Xem chi tiết](${item.url})\n`;
    msg += '\n';
  });

  return msg;
}

function formatSearch(data) {
  if (!data.results || data.results.length === 0) {
    return `🔍 Không tìm thấy kết quả cho "*${escMd(data.query)}*"`;
  }

  let msg = `🔍 *TÌM KIẾM:* "${escMd(data.query)}" — ${data.count} kết quả\n━━━━━━━━━━━━━━━━━━━━\n\n`;

  data.results.forEach((r, i) => {
    const statusEmoji = getStatusEmoji(r.status);
    msg += `*${i + 1}.* ${statusEmoji} ${escMd(r.title || 'Không tên')}\n`;
    msg += `   Trạng thái: ${escMd(r.status || 'N/A')}\n`;
    if (r.url) msg += `   🔗 [Xem chi tiết](${r.url})\n`;
    msg += '\n';
  });

  return msg;
}

function formatRunResult(wfName, data) {
  if (data.error) {
    return `✖ *Lỗi chạy ${wfName}:*\n${escMd(data.error)}`;
  }

  if (wfName === 'all') {
    let msg = `🚀 *ĐÃ CHẠY TẤT CẢ WORKFLOWS*\n━━━━━━━━━━━━━━━━━━━━\n\n`;
    const results = data.results || {};
    for (const [name, result] of Object.entries(results)) {
      const icon = result.error ? '✖' : '☑';
      const detail = result.error ? result.error : (result.sent || result.processed || result.matched || 'done');
      msg += `${icon} *${name}*: ${detail}\n`;
    }
    return msg;
  }

  const result = data.result || {};
  let msg = `☑ *Workflow ${wfName} hoàn tất*\n━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  if (result.sent !== undefined) msg += `📧 Email gửi: ${result.sent}\n`;
  if (result.processed !== undefined) msg += `📋 Đã xử lý: ${result.processed}\n`;
  if (result.matched !== undefined) msg += `🔗 Matched: ${result.matched}\n`;
  if (result.skipped !== undefined) msg += `⏭ Bỏ qua: ${result.skipped}\n`;
  if (result.errors !== undefined) msg += `✖ Lỗi: ${result.errors}\n`;

  return msg;
}

function formatReport(statusData, overdueData) {
  const d = statusData.directives || {};
  const total = (d.pending_approval || 0) + (d.confirmed_5t || 0) + (d.active || 0);

  let msg = `📋 *BÁO CÁO HÀNG NGÀY*
━━━━━━━━━━━━━━━━━━━━
🕐 ${statusData.timestamp || new Date().toLocaleString('vi-VN')}

📊 *Tổng quan:*
  Tổng chỉ đạo hoạt động: *${total}*
  • Chờ duyệt: ${d.pending_approval ?? '?'}
  • Đã confirm 5T: ${d.confirmed_5t ?? '?'}
  • Đang thực hiện: ${d.active ?? '?'}
  • 📌 Cần quan tâm: ${d.overdue ?? '?'}

`;

  if (overdueData.items && overdueData.items.length > 0) {
    msg += `📋 *Top ${overdueData.items.length} cần quan tâm nhất:*\n`;
    overdueData.items.slice(0, 3).forEach((item, i) => {
      msg += `  ${i + 1}. ${escMd(item.title || '')} — *${item.daysOverdue}d* (${escMd(item.dauMoi || '')})\n`;
    });
    msg += '\n';
  }

  // Completion rate
  const completionRate = total > 0 ? Math.round(((d.confirmed_5t || 0) / total) * 100) : 0;
  msg += `📈 *Tỷ lệ hoàn thành 5T:* ${completionRate}%\n`;
  msg += progressBar(completionRate) + '\n';

  return msg;
}

// ===== HELPERS =====
function escMd(str) {
  if (!str) return '';
  // Escape markdown v1 special chars (we use parse_mode Markdown)
  return String(str).replace(/[_*\[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

function getStatusEmoji(status) {
  const map = {
    'Đang thực hiện': '🔵',
    'Hoàn thành': '☑',
    'Quá hạn': '📌',
    'Chờ duyệt': '🟡',
    'Tạm dừng': '⏸',
  };
  return map[status] || '⚪';
}

function progressBar(pct) {
  const filled = Math.round(pct / 10);
  const empty = 10 - filled;
  return '▓'.repeat(filled) + '░'.repeat(empty) + ` ${pct}%`;
}

// ===== BOT SETUP =====
// ⚠ polling: false — NemoClaw Gateway là nơi duy nhất polling token này
// telegram-bot.js nhận updates qua HTTP webhook từ NemoClaw/Bridge
const bot = new TelegramBot(BOT_TOKEN, { polling: false });

console.log('==========================================');
console.log('[BOT] 🤖 CEO Directive Telegram Bot (WEBHOOK MODE)');
console.log(`[BOT] ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`);
console.log('[BOT] Mode: HTTP webhook (NO polling)');
console.log(`[BOT] Hook port: ${HOOK_PORT}`);
console.log(`[BOT] Bridge: ${BRIDGE_URL}`);
console.log(`[BOT] Allowed users: ${ALLOWED_USERS.length > 0 ? ALLOWED_USERS.join(', ') : 'ALL'}`);
console.log('==========================================');

// ===== COMMAND: /start =====
bot.onText(/\/start/, (msg) => {
  if (!canProcess(msg)) return;

  const userId = msg.from?.id || 'unknown';
  console.log(`[BOT] /start from user ${userId} (${msg.from?.first_name || ''})`);

  bot.sendMessage(msg.chat.id,
`Dạ, con chào Thầy${msg.from?.first_name ? ' ' + msg.from.first_name : ''} buổi ${new Date().getHours() < 12 ? 'sáng' : new Date().getHours() < 18 ? 'chiều' : 'tối'} ạ.
Con là Gravity — bot quản lý chỉ đạo CEO EsuhaiGroup.
━━━━━━━━━━━━━━━━━━━━

📌 Lệnh khả dụng:
  /trangthai — Trạng thái tổng quan
  /quahan — Chỉ đạo cần quan tâm
  /tim <từ khóa> — Tìm chỉ đạo
  /chay <wf> — Chạy workflow
  /baocao — Báo cáo nhanh
  /hoi <câu hỏi> — Hỏi AI
  /phantich — AI phân tích
  /baocaotuan — Báo cáo tuần AI

► Dashboard: ${DASHBOARD_URL}

▫️ Hoặc Thầy chat tự nhiên, con sẽ hiểu ạ.`, kbdMain());
});

// ===== COMMAND: /help (alias for /start) =====
bot.onText(/\/help/, (msg) => {
  if (!canProcess(msg)) return;
  bot.sendMessage(msg.chat.id,
`Danh sach lenh khả dụng:
━━━━━━━━━━━━━━━━━━━━
  /trangthai — Trạng thái tổng quan
  /quahan — Chỉ đạo cần quan tâm
  /tim <từ khóa> — Tìm chỉ đạo
  /chay <wf> — Chạy workflow
  /baocao — Báo cáo nhanh
  /hoi <câu hỏi> — Hỏi AI
  /phantich — AI phân tích
  /baocaotuan — Báo cáo tuần AI
  /healthcheck — Kiểm tra hệ thống

Dashboard: ${DASHBOARD_URL}`, kbdMain());
});

// ===== COMMAND: /healthcheck =====
bot.onText(/\/healthcheck/, async (msg) => {
  if (!canProcess(msg)) return;
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 'Đang kiểm tra...');

  try {
    const startTime = Date.now();
    const result = await bridgeRequest('/status');
    const latency = Date.now() - startTime;

    const checks = [
      `Bridge: OK (${latency}ms)`,
      `Dashboard: ${DASHBOARD_URL}`,
      `Uptime: ${result.uptime || 'N/A'}`,
      `Workflows: ${result.workflows?.join(', ') || 'N/A'}`,
      `Directives: ${result.stats?.total || '?'} total`,
      `Overdue: ${result.stats?.overdue || '0'}`,
    ];

    bot.sendMessage(chatId,
      `HEALTH CHECK\n━━━━━━━━━━━━━━━━━━━━\n\n${checks.join('\n')}\n\nTất cả OK.`,
      kbdMain()
    );
  } catch (err) {
    bot.sendMessage(chatId,
      `HEALTH CHECK\n━━━━━━━━━━━━━━━━━━━━\n\nBridge: OFFLINE\nLỗi: ${err.message}\n\nDashboard vẫn hoạt động: ${DASHBOARD_URL}`,
      kbdMain()
    );
  }
});

// ===== COMMAND: /trangthai =====
bot.onText(/\/trangthai/, async (msg) => {
  if (!canProcess(msg)) return;

  const chatId = msg.chat.id;
  bot.sendMessage(chatId, '⏳ Đang truy vấn bridge...');

  try {
    const data = await bridgeRequest('/status');
    bot.sendMessage(chatId, formatStatus(data), { parse_mode: 'Markdown', ...kbdAfterStatus() });
  } catch (err) {
    notifyAdmin(err, '/trangthai');
    bot.sendMessage(chatId, `✖ Lỗi kết nối bridge:\n${err.message}\n\n💡 Kiểm tra: bridge đang chạy tại ${BRIDGE_URL}?`);
  }
});

// ===== COMMAND: /quahan =====
bot.onText(/\/quahan(?:\s+(\d+))?/, async (msg, match) => {
  if (!canProcess(msg)) return;

  const chatId = msg.chat.id;
  const limit = match && match[1] ? parseInt(match[1]) : 5;
  bot.sendMessage(chatId, '⏳ Đang kiểm tra chỉ đạo cần quan tâm...');

  try {
    const data = await bridgeRequest(`/overdue?limit=${limit}`);
    bot.sendMessage(chatId, formatOverdue(data), { parse_mode: 'Markdown', disable_web_page_preview: true, ...kbdAfterOverdue() });
  } catch (err) {
    notifyAdmin(err, '/quahan');
    bot.sendMessage(chatId, `✖ Lỗi: ${err.message}`);
  }
});

// ===== COMMAND: /tim <keyword> =====
bot.onText(/\/tim\s+(.+)/, async (msg, match) => {
  if (!canProcess(msg)) return;

  const chatId = msg.chat.id;
  const keyword = match[1].trim();
  bot.sendMessage(chatId, `⏳ Đang tìm "${keyword}"...`);

  try {
    const data = await bridgeRequest(`/search?q=${encodeURIComponent(keyword)}`);
    bot.sendMessage(chatId, formatSearch(data), { parse_mode: 'Markdown', disable_web_page_preview: true, ...kbdAfterSearch() });
  } catch (err) {
    notifyAdmin(err, '/tim');
    bot.sendMessage(chatId, `✖ Lỗi: ${err.message}`);
  }
});

// ===== COMMAND: /chay (no args) =====
bot.onText(/^\/chay$/, (msg) => {
  if (!canProcess(msg)) return;
  bot.sendMessage(msg.chat.id,
`⚙️ Sử dụng: /chay <workflow>

Workflows khả dụng:
  /chay wf1 — Gửi email duyệt chỉ đạo
  /chay wf2 — Notify chỉ đạo 5T confirmed
  /chay wf3 — Detect thay đổi trạng thái
  /chay wf4 — Tín hiệu rủi ro
  /chay wf5 — Smart reminders
  /chay wf6 — Sync dashboard
  /chay hm50 — Match chỉ đạo → 50 HM
  /chay all — Chạy tất cả`);
});

// ===== COMMAND: /chay <workflow> =====
bot.onText(/\/chay\s+(\w+)/, (msg, match) => {
  if (!canProcess(msg)) return;

  const chatId = msg.chat.id;
  const wfName = match[1].toLowerCase();
  const validWFs = ['wf1', 'wf2', 'wf3', 'wf4', 'wf5', 'wf6', 'hm50', 'all'];

  if (!validWFs.includes(wfName)) {
    return bot.sendMessage(chatId, `✖ Workflow không hợp lệ: ${wfName}\n\n☑ Hợp lệ: ${validWFs.join(', ')}`);
  }

  // Yêu cầu xác nhận trước khi chạy
  bot.sendMessage(chatId,
    `▫️ Xác nhận chạy workflow *${wfName}*?\n\nThao tác này sẽ kích hoạt pipeline thật trên hệ thống.`,
    { parse_mode: 'Markdown', ...kbdConfirmRun(wfName) }
  );
});

// ===== COMMAND: /baocao =====
bot.onText(/\/baocao/, async (msg) => {
  if (!canProcess(msg)) return;

  const chatId = msg.chat.id;
  bot.sendMessage(chatId, '⏳ Đang tạo báo cáo...');

  try {
    const [statusData, overdueData] = await Promise.all([
      bridgeRequest('/status'),
      bridgeRequest('/overdue?limit=3'),
    ]);
    bot.sendMessage(chatId, formatReport(statusData, overdueData), { parse_mode: 'Markdown', ...kbdAfterStatus() });
  } catch (err) {
    notifyAdmin(err, '/baocao');
    bot.sendMessage(chatId, `✖ Lỗi: ${err.message}`);
  }
});

// ===== COMMAND: /hoi <question> =====
bot.onText(/\/hoi\s+(.+)/, async (msg, match) => {
  if (!canProcess(msg)) return;

  const chatId = msg.chat.id;
  const question = match[1].trim();
  bot.sendMessage(chatId, `🧠 Đang hỏi AI: "${question}"...`);

  try {
    const { askQuestion } = require('./ai-analyzer');
    const result = await askQuestion(question);
    if (!result.answer) result.answer = 'Thầy ơi, con chưa tìm được câu trả lời phù hợp.';
    const cost = result.tokens ? `\n\n💰 Tokens: ${result.tokens.total_tokens}` : '';
    bot.sendMessage(chatId, `🧠 AI trả lời:\n━━━━━━━━━━━━━━━━━━━━\n\n${result.answer}${cost}`, kbdAfterAI());
  } catch (err) {
    notifyAdmin(err, '/hoi');
    bot.sendMessage(chatId, `✖ Lỗi AI: ${err.message}`);
  }
});

bot.onText(/^\/hoi$/, (msg) => {
  if (!canProcess(msg)) return;
  bot.sendMessage(msg.chat.id, `💡 Sử dụng: /hoi <câu hỏi>\n\nVí dụ:\n  /hoi Ai có chỉ đạo cần quan tâm nhất?\n  /hoi Tình hình tuyển sinh MSA thế nào?\n  /hoi Chỉ đạo nào quan trọng nhất tuần này?`);
});

// ===== COMMAND: /phantich =====
bot.onText(/\/phantich/, async (msg) => {
  if (!canProcess(msg)) return;

  const chatId = msg.chat.id;
  bot.sendMessage(chatId, '🧠 Đang phân tích dữ liệu (15-30s)...');

  try {
    const { analyzePatterns } = require('./ai-analyzer');
    const result = await analyzePatterns();
    const msg_text = `🧠 AI PHÂN TÍCH\n━━━━━━━━━━━━━━━━━━━━\n\n${result.analysis}\n\n💰 Tokens: ${result.tokens?.total_tokens || '?'}`;
    
    // Split if too long
    if (msg_text.length > 4000) {
      bot.sendMessage(chatId, msg_text.slice(0, 4000));
      if (msg_text.length > 4000) bot.sendMessage(chatId, msg_text.slice(4000), kbdAfterAI());
    } else {
      bot.sendMessage(chatId, msg_text, kbdAfterAI());
    }
  } catch (err) {
    notifyAdmin(err, '/phantich');
    bot.sendMessage(chatId, `✖ Lỗi: ${err.message}`);
  }
});

// ===== COMMAND: /baocaotuan =====
bot.onText(/\/baocaotuan/, async (msg) => {
  if (!canProcess(msg)) return;

  const chatId = msg.chat.id;
  bot.sendMessage(chatId, '📊 Đang tạo báo cáo tuần AI (30-60s)...');

  try {
    const { generateWeeklyReport, formatReportTelegram } = require('./report-generator');
    const report = await generateWeeklyReport();
    const tgMsg = formatReportTelegram(report);
    
    if (tgMsg.length > 4000) {
      const parts = [];
      let remaining = tgMsg;
      while (remaining.length > 0) {
        parts.push(remaining.slice(0, 4000));
        remaining = remaining.slice(4000);
      }
      for (const part of parts) {
        await bot.sendMessage(chatId, part);
      }
    } else {
      bot.sendMessage(chatId, tgMsg);
    }
  } catch (err) {
    notifyAdmin(err, '/baocaotuan');
    const friendlyMsg = err.message.includes('404')
      ? 'Chức năng báo cáo tuần AI cần bridge đang chạy. Vui lòng kiểm tra bridge status.'
      : `Lỗi: ${err.message}`;
    bot.sendMessage(chatId, `Không thể tạo báo cáo tuần.\n${friendlyMsg}\n\nThử /baocao để xem báo cáo nhanh.`, kbdMain());
  }
});

// ===== CALLBACK QUERY HANDLER (inline buttons) =====
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;
  
  // Access control + rate limit (same as commands)
  const userId = String(query.from?.id || '');
  if (ALLOWED_USERS.length > 0 && !ALLOWED_USERS.includes(userId)) {
    bot.answerCallbackQuery(query.id, { text: '🔒 Không có quyền', show_alert: true });
    return;
  }
  if (!checkRateLimit(query.from?.id || 'unknown')) {
    bot.answerCallbackQuery(query.id, { text: '⏳ Quá nhiều thao tác', show_alert: true });
    return;
  }

  // Acknowledge button press
  bot.answerCallbackQuery(query.id);

  try {
    if (data === 'cmd_trangthai') {
      bot.sendMessage(chatId, '⏳ Đang truy vấn...');
      const result = await bridgeRequest('/status');
      bot.sendMessage(chatId, formatStatus(result), { parse_mode: 'Markdown', ...kbdAfterStatus() });
    }
    else if (data === 'cmd_quahan') {
      bot.sendMessage(chatId, '⏳ Đang kiểm tra...');
      const result = await bridgeRequest('/overdue?limit=5');
      bot.sendMessage(chatId, formatOverdue(result), { parse_mode: 'Markdown', disable_web_page_preview: true, ...kbdAfterOverdue() });
    }
    else if (data === 'cmd_baocao') {
      bot.sendMessage(chatId, '⏳ Đang tạo báo cáo...');
      const [statusData, overdueData] = await Promise.all([
        bridgeRequest('/status'),
        bridgeRequest('/overdue?limit=3'),
      ]);
      bot.sendMessage(chatId, formatReport(statusData, overdueData), { parse_mode: 'Markdown', ...kbdAfterStatus() });
    }
    else if (data === 'cmd_phantich') {
      bot.sendMessage(chatId, '🧠 Đang phân tích (15-30s)...');
      try {
        const { analyzePatterns } = require('./ai-analyzer');
        const result = await analyzePatterns();
        const msg_text = `🧠 AI PHÂN TÍCH\n━━━━━━━━━━━━━━━━━━━━\n\n${result.analysis}\n\n💰 Tokens: ${result.tokens?.total_tokens || '?'}`;
        bot.sendMessage(chatId, msg_text.slice(0, 4000), kbdAfterAI());
      } catch (aiErr) {
        notifyAdmin(aiErr, 'callback:cmd_phantich');
        const friendlyMsg = aiErr.message.includes('AI chưa cấu hình')
          ? 'Cần cấu hình ANTHROPIC_API_KEY, GEMINI_API_KEY hoặc OPENAI_API_KEY trong .env'
          : aiErr.message.includes('404')
          ? 'Không kết nối được dữ liệu. Kiểm tra SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY.'
          : `Lỗi AI: ${aiErr.message}`;
        bot.sendMessage(chatId, `Không thể phân tích.\n${friendlyMsg}\n\nThử /hoi để hỏi AI trực tiếp.`, kbdMain());
      }
    }
    else if (data === 'cmd_baocaotuan') {
      bot.sendMessage(chatId, '📊 Đang tạo báo cáo tuần AI (30-60s)...');
      try {
        const { generateWeeklyReport, formatReportTelegram } = require('./report-generator');
        const report = await generateWeeklyReport();
        const tgMsg = formatReportTelegram(report);
        if (tgMsg.length > 4000) {
          bot.sendMessage(chatId, tgMsg.slice(0, 4000));
          bot.sendMessage(chatId, tgMsg.slice(4000), kbdAfterAI());
        } else {
          bot.sendMessage(chatId, tgMsg, kbdAfterAI());
        }
      } catch (rptErr) {
        notifyAdmin(rptErr, 'callback:cmd_baocaotuan');
        const friendlyMsg = rptErr.message.includes('404')
          ? 'Chức năng báo cáo tuần AI cần bridge đang chạy. Kiểm tra bridge status.'
          : `Lỗi: ${rptErr.message}`;
        bot.sendMessage(chatId, `Không thể tạo báo cáo tuần.\n${friendlyMsg}\n\nThử /baocao để xem báo cáo nhanh.`, kbdMain());
      }
    }
    else if (data.startsWith('cmd_chay_')) {
      // Nút chạy từ keyboard → yêu cầu xác nhận trước
      const wfName = data.replace('cmd_chay_', '');
      bot.sendMessage(chatId,
        `▫️ Xác nhận chạy workflow *${wfName}*?\n\nThao tác này sẽ kích hoạt pipeline thật trên hệ thống.`,
        { parse_mode: 'Markdown', ...kbdConfirmRun(wfName) }
      );
    }
    else if (data.startsWith('cmd_confirm_wf_')) {
      // Người dùng đã xác nhận → thực sự chạy workflow
      const wfName = data.replace('cmd_confirm_wf_', '');
      bot.sendMessage(chatId, `⏳ Đang chạy *${wfName}*...`, { parse_mode: 'Markdown' });
      const result = await bridgeRequest(`/run/${wfName}`, 'POST');
      bot.sendMessage(chatId, formatRunResult(wfName, result), { parse_mode: 'Markdown', ...kbdAfterRun() });
    }
    else if (data === 'cmd_cancel_wf') {
      bot.sendMessage(chatId, '✖ Đã hủy. Không có workflow nào được chạy.');
    }
    else if (data === 'prompt_hoi') {
      bot.sendMessage(chatId, `💬 Gõ câu hỏi cho AI:\n\nVí dụ:\n  /hoi Ai cần quan tâm nhất?\n  /hoi Tuyển sinh MSA tình hình sao?\n  /hoi Tuần này cần ưu tiên gì?`);
    }
  } catch (err) {
    notifyAdmin(err, 'callback_query:' + (query.data || ''));
    bot.sendMessage(chatId, `Không thể xử lý. Vui lòng thử lại.\n\n💡 Gõ /start để quay về menu chính.`);
  }
});

// ===== FREE-TEXT HANDLER (Intent Detection + Session) =====
bot.on('message', async (msg) => {
  if (!msg.text) return;
  if (!isAllowed(msg)) return;
  const userIdRL = msg.from?.id || 'unknown';
  if (!checkRateLimit(userIdRL)) {
    return bot.sendMessage(msg.chat.id, rateLimitMessage());
  }
  const chatId = msg.chat.id;
  const text = msg.text.trim();
  const userId = String(msg.from?.id || 'unknown');

  // Bỏ qua commands đã handle ở trên
  if (text.match(/^\/(start|help|healthcheck|trangthai|quahan|tim|chay|baocao|hoi|phantich|baocaotuan|lichthongminh|forcescan)/)) return;

  // Unknown command → gợi ý
  if (text.startsWith('/')) {
    return bot.sendMessage(chatId, `📌 Lệnh không nhận diện: ${text}\n\n► Gõ /start để xem danh sách lệnh ạ.`);
  }

  // === INTENT DETECTION ===
  const intent = detectIntent(text);
  console.log(`[BOT] Intent: ${intent.type} (needsAI=${intent.needsAI}) from user ${userId}: "${text.slice(0, 50)}"`);

  // Lưu vào session memory
  session.add(userId, 'user', text);

  // Quick reply — không tốn API
  const quickReply = getQuickReply(intent, { firstName: msg.from?.first_name || 'Thầy' });
  if (quickReply) {
    session.add(userId, 'assistant', quickReply);
    return bot.sendMessage(chatId, quickReply, kbdMain());
  }

  // Map intent → command tương ứng
  const cmdMap = intentToCommand(intent);

  try {
    if (intent.type === INTENT_TYPES.STATUS) {
      bot.sendMessage(chatId, '⏳ Đang truy vấn...');
      const data = await bridgeRequest('/status');
      const reply = formatStatus(data);
      session.add(userId, 'assistant', reply);
      bot.sendMessage(chatId, reply, { parse_mode: 'Markdown', ...kbdAfterStatus() });
    }
    else if (intent.type === INTENT_TYPES.OVERDUE) {
      bot.sendMessage(chatId, '⏳ Đang kiểm tra...');
      const data = await bridgeRequest('/overdue?limit=5');
      const reply = formatOverdue(data);
      session.add(userId, 'assistant', reply);
      bot.sendMessage(chatId, reply, { parse_mode: 'Markdown', disable_web_page_preview: true, ...kbdAfterOverdue() });
    }
    else if (intent.type === INTENT_TYPES.REPORT) {
      bot.sendMessage(chatId, '⏳ Đang tạo báo cáo...');
      const [statusData, overdueData] = await Promise.all([
        bridgeRequest('/status'),
        bridgeRequest('/overdue?limit=3'),
      ]);
      const reply = formatReport(statusData, overdueData);
      session.add(userId, 'assistant', reply);
      bot.sendMessage(chatId, reply, { parse_mode: 'Markdown', ...kbdAfterStatus() });
    }
    else if (intent.type === INTENT_TYPES.AI_ANALYZE) {
      bot.sendMessage(chatId, '► Đang phân tích (15-30s)...');
      const { analyzePatterns } = require('./ai-analyzer');
      const result = await analyzePatterns();
      const enforced = bible.enforceOutput(result.analysis, {
        addCTA: true,
        ctaText: '► /phantich để phân tích lại\n📌 /quahan để xem cần quan tâm',
      });
      const reply = `📌 AI PHÂN TÍCH\n━━━━━━━━━━━━━━━━━━━━\n\n${enforced}\n\n📎 Tokens: ${result.tokens?.total_tokens || '?'}`;
      session.add(userId, 'assistant', reply);
      bot.sendMessage(chatId, reply.slice(0, 4000), kbdAfterAI());
    }
    else if (intent.type === INTENT_TYPES.SEARCH) {
      const query = intent.params.query || text;
      bot.sendMessage(chatId, `⏳ Đang tìm "${query}"...`);
      const data = await bridgeRequest(`/search?q=${encodeURIComponent(query)}`);
      const reply = formatSearch(data);
      session.add(userId, 'assistant', reply);
      bot.sendMessage(chatId, reply, { parse_mode: 'Markdown', disable_web_page_preview: true, ...kbdAfterSearch() });
    }
    else if (intent.type === INTENT_TYPES.RUN_WF && intent.params.workflow) {
      bot.sendMessage(chatId,
        `▫️ Xác nhận chạy workflow *${intent.params.workflow}*?`,
        { parse_mode: 'Markdown', ...kbdConfirmRun(intent.params.workflow) }
      );
    }
    else {
      // Default: AI question với session context
      bot.sendMessage(chatId, '► Đang hỏi AI...');
      const { askQuestion } = require('./ai-analyzer');
      const result = await askQuestion(text);
      if (!result.answer) result.answer = 'Dạ Thầy, con chưa tìm được câu trả lời phù hợp ạ.';
      const enforced = bible.enforceOutput(result.answer, {
        addCTA: true,
        ctaText: '► /hoi <câu hỏi> để hỏi thêm',
      });
      const cost = result.tokens ? `\n\n📎 Tokens: ${result.tokens.total_tokens}` : '';
      session.add(userId, 'assistant', enforced);
      bot.sendMessage(chatId, `${enforced}${cost}`, kbdAfterAI());
    }
  } catch (err) {
    notifyAdmin(err, `free-text:${intent.type}`);
    bot.sendMessage(chatId, `✖ Lỗi: ${err.message}\n\n► /start để xem lệnh khả dụng`);
  }
});

// ===== COMMAND: /lichthongminh — AI Scheduler status =====
bot.onText(/\/lichthongminh/, async (msg) => {
  if (!canProcess(msg)) return;

  const chatId = msg.chat.id;
  bot.sendMessage(chatId, '🧠 Đang lấy trạng thái AI Scheduler...');

  try {
    const data = await bridgeRequest('/scheduler/status');

    if (data.status === 'not_initialized') {
      return bot.sendMessage(chatId, '🧠 AI Scheduler chưa chạy lần nào.\n\nGõ /forcescan để kích hoạt checkpoint đầu tiên.', kbdMain());
    }

    const lastCheck = data.lastCheck
      ? new Date(data.lastCheck).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
      : 'Chưa có';

    const wfRuns = data.lastWfRuns && Object.keys(data.lastWfRuns).length > 0
      ? Object.entries(data.lastWfRuns).map(([wf, ts]) => {
          const ago = Math.round((Date.now() - new Date(ts).getTime()) / 60000);
          return `  ${wf}: ${ago} phút trước`;
        }).join('\n')
      : '  (Chưa chạy WF nào)';

    const counts = data.counts || {};

    bot.sendMessage(chatId,
`🧠 *AI SCHEDULER STATUS*
━━━━━━━━━━━━━━━━━━━━

🕐 Check gần nhất: ${lastCheck}
⏱ Check tiếp theo: ${data.nextCheckMinutes || 30} phút

📊 *Snapshot hiện tại:*
  Chờ duyệt: *${counts.pending ?? '?'}*
  Confirmed 5T: *${counts.confirmed ?? '?'}*
  Quá hạn: *${counts.overdue ?? '?'}*
  Active: *${counts.active ?? '?'}*

🔧 *WF đã chạy gần đây:*
${wfRuns}`, { parse_mode: 'Markdown', ...kbdMain() });
  } catch (err) {
    notifyAdmin(err, '/lichthongminh');
    bot.sendMessage(chatId, `✖ Lỗi: ${err.message}\n\nAI Scheduler có thể chưa được khởi động.`);
  }
});

// ===== COMMAND: /forcescan — Force AI checkpoint =====
bot.onText(/\/forcescan/, async (msg) => {
  if (!canProcess(msg)) return;

  const chatId = msg.chat.id;
  bot.sendMessage(chatId, '🧠 Đang chạy AI checkpoint... (15-30s)');

  try {
    const data = await bridgeRequest('/scheduler/force-check', 'POST');

    if (data.error) {
      return bot.sendMessage(chatId, `✖ Lỗi: ${escMd(data.error)}`, { parse_mode: 'Markdown' });
    }

    const decision = data.decision || {};
    const ran = (decision.should_run || []).length > 0
      ? decision.should_run.join(', ')
      : 'Không có WF nào cần chạy';
    const results = data.executionResults || {};
    const resultSummary = Object.entries(results)
      .map(([wf, r]) => `  ${r.error ? '✖' : '☑'} ${wf}: ${r.error || 'OK'}`)
      .join('\n') || '  (không có)';

    bot.sendMessage(chatId,
`🧠 *AI CHECKPOINT HOÀN TẤT*
━━━━━━━━━━━━━━━━━━━━

🎯 *Quyết định:* ${ran}
📝 *Lý do:* ${escMd(decision.reasoning || 'N/A')}
⚡ *Priority:* ${decision.priority || 'N/A'}
📎 *Tokens:* ${data.tokensUsed || '?'}

📋 *Kết quả:*
${resultSummary}

⏰ Check lại sau: ${decision.next_check_minutes || 30} phút`, { parse_mode: 'Markdown', ...kbdMain() });
  } catch (err) {
    notifyAdmin(err, '/forcescan');
    bot.sendMessage(chatId, `✖ Lỗi: ${err.message}\n\n💡 Kiểm tra bridge + AI Scheduler đang chạy?`);
  }
});

// ===== ERROR HANDLING =====
// Polling đã tắt — không còn polling_error.
// Nếu ai đó bật polling lại nhầm, vẫn log cảnh báo.
bot.on('polling_error', (err) => {
  console.error('[BOT] ⚠ UNEXPECTED polling_error (polling should be OFF):', err.message);
  notifyAdmin(err, 'unexpected_polling_error');
});

// ===== WEBHOOK HTTP SERVER =====
// Nhận updates từ NemoClaw Gateway qua POST /telegram-hook
const hookServer = http.createServer((req, res) => {
  // CORS — chỉ cho phép từ NemoClaw Gateway (localhost)
  const allowedOrigin = process.env.NEMOCLAW_GATEWAY_ORIGIN || 'http://localhost:3100';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  // Health check
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status: 'ok', mode: 'webhook', uptime: process.uptime() }));
  }

  // Only accept POST /telegram-hook
  if (req.url !== '/telegram-hook' || req.method !== 'POST') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Not found. Use POST /telegram-hook' }));
  }

  // Auth check
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
  if (token !== AUTH_TOKEN) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Unauthorized' }));
  }

  // Read body
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    try {
      const update = JSON.parse(body);
      console.log('[BOT] 📩 Received webhook update:', JSON.stringify(update).slice(0, 200));

      // Process the Telegram update via node-telegram-bot-api
      bot.processUpdate(update);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', processed: true }));
    } catch (err) {
      console.error('[BOT] ✖ Webhook parse error:', err.message);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid JSON', details: err.message }));
    }
  });
});

hookServer.listen(HOOK_PORT, () => {
  console.log(`[BOT] ☑ Webhook server listening on port ${HOOK_PORT}`);
  console.log(`[BOT] ☑ Endpoint: POST http://localhost:${HOOK_PORT}/telegram-hook`);
  console.log('[BOT] ☑ Waiting for updates from NemoClaw Gateway...');
});

// ===== TEST MODE =====
if (process.argv.includes('--test')) {
  console.log('[BOT] Test mode — sending test message...');
  if (ADMIN_CHAT_ID) {
    bot.sendMessage(ADMIN_CHAT_ID, '🧪 *TEST* — CEO Directive Bot (webhook mode) hoạt động!', { parse_mode: 'Markdown' })
      .then(() => {
        console.log('[BOT] ☑ Test message sent successfully');
        setTimeout(() => process.exit(0), 2000);
      })
      .catch(err => {
        console.error('[BOT] ✖ Test failed:', err.message);
        process.exit(1);
      });
  } else {
    console.log('[BOT] ⚠️ ADMIN_CHAT_ID not set, cannot send test message');
  }
}

console.log('[BOT] ☑ Bot khởi động (webhook mode — KHÔNG polling).');
