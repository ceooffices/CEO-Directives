/**
 * report-generator.js
 * CEO Directive Automation — Weekly/Monthly Report Generator
 * 
 * Generates:
 *   1. Weekly digest — tổng hợp tuần
 *   2. Monthly summary — báo cáo tháng  
 *   3. Sends via email + Telegram
 * 
 * Usage:
 *   node report-generator.js weekly          # Generate weekly report
 *   node report-generator.js weekly --send   # Generate + send email + Telegram
 *   node report-generator.js monthly         # Monthly report
 */

require('dotenv').config();
const { analyzePatterns, predictRisks } = require('./ai-analyzer');

// ===== SINGLETON TELEGRAM BOT (S2.5 — tránh leak khi gọi sendReport nhiều lần) =====
let _singletonBot = null;
function getSingletonBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
  if (!_singletonBot && token) {
    const TelegramBot = require('node-telegram-bot-api');
    _singletonBot = new TelegramBot(token);
    console.log('[REPORT] ☑ Singleton TelegramBot created (no polling)');
  }
  return _singletonBot;
}

// ===== REPORT BUILDER =====
async function generateWeeklyReport() {
  console.log('[REPORT] 📊 Generating weekly report...');

  const [patternResult, riskResult] = await Promise.all([
    analyzePatterns(),
    predictRisks(),
  ]);

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);

  const report = {
    type: 'weekly',
    period: `${weekStart.toLocaleDateString('vi-VN')} → ${now.toLocaleDateString('vi-VN')}`,
    generatedAt: now.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
    stats: patternResult.stats,
    byDauMoi: patternResult.byDauMoi,
    overdueTop5: patternResult.overdueTop5,
    aiAnalysis: patternResult.analysis,
    riskPrediction: riskResult.prediction,
    riskCounts: { atRisk: riskResult.atRiskCount, noDeadline: riskResult.noDeadlineCount },
    totalTokens: (patternResult.tokens?.total_tokens || 0) + (riskResult.tokens?.total_tokens || 0),
  };

  return report;
}

async function generateMonthlyReport() {
  console.log('[REPORT] 📊 Generating monthly report...');
  // Monthly = weekly + deeper analysis
  const weeklyReport = await generateWeeklyReport();
  weeklyReport.type = 'monthly';

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  weeklyReport.period = `${monthStart.toLocaleDateString('vi-VN')} → ${now.toLocaleDateString('vi-VN')}`;

  return weeklyReport;
}

// ===== FORMAT FOR TELEGRAM =====
function formatReportTelegram(report) {
  const s = report.stats || {};
  const isMonthly = report.type === 'monthly';
  const icon = isMonthly ? '📅' : '📊';
  const label = isMonthly ? 'BÁO CÁO THÁNG' : 'BÁO CÁO TUẦN';

  let msg = `${icon} ${label}
━━━━━━━━━━━━━━━━━━━━
📆 ${report.period}
🕐 ${report.generatedAt}

📋 TỔNG QUAN:
  Tổng: ${s.total || 0}
  Chờ duyệt: ${s.pending || 0}
  Đang thực hiện: ${s.active || 0}
  Quá hạn: ${s.overdue || 0}

`;

  // Top đầu mối
  if (report.byDauMoi && report.byDauMoi.length > 0) {
    msg += `👥 TOP ĐẦU MỐI:\n`;
    report.byDauMoi.slice(0, 5).forEach(dm => {
      const bar = dm.overdue > 0 ? ` ⚠️${dm.overdue} quá hạn` : '';
      msg += `  ${dm.name}: ${dm.total} nhiệm vụ${bar}\n`;
    });
    msg += '\n';
  }

  // Risk
  if (report.riskCounts) {
    msg += `⚠️ RỦI RO:\n`;
    msg += `  Sắp quá hạn (≤3 ngày): ${report.riskCounts.atRisk}\n`;
    msg += `  Không có deadline: ${report.riskCounts.noDeadline}\n\n`;
  }

  // AI Analysis (truncated for Telegram)
  if (report.aiAnalysis) {
    const truncated = report.aiAnalysis.length > 1500
      ? report.aiAnalysis.slice(0, 1500) + '...'
      : report.aiAnalysis;
    msg += `🧠 AI PHÂN TÍCH:\n${truncated}\n\n`;
  }

  msg += `💰 AI tokens used: ${report.totalTokens || 0}`;
  return msg;
}

// ===== FORMAT FOR EMAIL =====
function formatReportEmail(report) {
  const s = report.stats || {};
  const isMonthly = report.type === 'monthly';
  const label = isMonthly ? 'Báo Cáo Tháng' : 'Báo Cáo Tuần';

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px; color: #333; }
  .header { background: linear-gradient(135deg, #0F172A, #1E40AF); color: white; padding: 24px; border-radius: 12px; margin-bottom: 20px; }
  .header h1 { margin: 0; font-size: 22px; }
  .header .sub { opacity: 0.8; font-size: 13px; margin-top: 4px; }
  .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
  .card h3 { margin: 0 0 8px; color: #1e40af; font-size: 15px; }
  .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .stat { text-align: center; padding: 12px; background: white; border-radius: 8px; border: 1px solid #e2e8f0; }
  .stat .num { font-size: 28px; font-weight: 700; color: #1e40af; }
  .stat .lbl { font-size: 11px; color: #64748b; }
  .overdue .num { color: #dc2626; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #1e40af; color: white; padding: 8px; text-align: left; }
  td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
  .ai-box { background: #fffbeb; border: 1px solid #fbbf24; border-radius: 8px; padding: 16px; white-space: pre-wrap; font-size: 13px; line-height: 1.6; }
  .footer { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 20px; padding: 12px; }
</style></head>
<body>
  <div class="header">
    <h1>📊 ${label} — Chỉ Đạo CEO</h1>
    <div class="sub">📆 ${report.period} | 🕐 ${report.generatedAt}</div>
  </div>

  <div class="stat-grid">
    <div class="stat"><div class="num">${s.total || 0}</div><div class="lbl">Tổng</div></div>
    <div class="stat"><div class="num">${s.pending || 0}</div><div class="lbl">Chờ duyệt</div></div>
    <div class="stat"><div class="num">${s.active || 0}</div><div class="lbl">Đang thực hiện</div></div>
    <div class="stat overdue"><div class="num">${s.overdue || 0}</div><div class="lbl">⚠️ Quá hạn</div></div>
  </div>

  ${report.byDauMoi && report.byDauMoi.length > 0 ? `
  <div class="card">
    <h3>👥 Phân Bố Theo Đầu Mối</h3>
    <table>
      <tr><th>Đầu mối</th><th>Tổng</th><th>Quá hạn</th></tr>
      ${report.byDauMoi.slice(0, 8).map(dm => 
        `<tr><td>${dm.name}</td><td>${dm.total}</td><td style="color:${dm.overdue > 0 ? '#dc2626' : '#16a34a'}">${dm.overdue}</td></tr>`
      ).join('')}
    </table>
  </div>` : ''}

  ${report.overdueTop5 && report.overdueTop5.length > 0 ? `
  <div class="card">
    <h3>🔴 Top Quá Hạn Nặng Nhất</h3>
    <table>
      <tr><th>Chỉ đạo</th><th>Đầu mối</th><th>Ngày quá</th></tr>
      ${report.overdueTop5.map(d =>
        `<tr><td>${d.title?.slice(0, 60) || ''}</td><td>${d.dauMoi || ''}</td><td style="color:#dc2626;font-weight:700">${d.daysOverdue}d</td></tr>`
      ).join('')}
    </table>
  </div>` : ''}

  <div class="card">
    <h3>🧠 AI Phân Tích & Khuyến Nghị</h3>
    <div class="ai-box">${(report.aiAnalysis || '').replace(/\n/g, '<br>')}</div>
  </div>

  ${report.riskPrediction ? `
  <div class="card">
    <h3>⚠️ Dự Đoán Rủi Ro</h3>
    <div class="ai-box">${report.riskPrediction.replace(/\n/g, '<br>')}</div>
  </div>` : ''}

  <div class="footer">
    CEO Directive Automation — OpenClaw R&D<br>
    AI tokens: ${report.totalTokens || 0} | Model: gpt-4o-mini
  </div>
</body>
</html>`;

  return html;
}

// ===== SEND REPORT =====
// options.bot — truyền bot instance từ ngoài (tránh tạo TelegramBot mới gây leak)
async function sendReport(report, options = {}) {
  const results = { email: null, telegram: null };

  // Send email
  if (options.email !== false) {
    try {
      const { sendEmail } = require('./lib/email-sender');
      const isMonthly = report.type === 'monthly';
      const subject = `${isMonthly ? '📅 Báo Cáo Tháng' : '📊 Báo Cáo Tuần'} — Chỉ Đạo CEO | ${report.period}`;

      await sendEmail({
        to: process.env.CEO_EMAIL || 'hoangkha@esuhai.com',
        cc: process.env.ALWAYS_CC || '',
        subject,
        html: formatReportEmail(report),
      });
      results.email = 'sent';
      console.log('[REPORT] ✅ Email sent');
    } catch (err) {
      results.email = `error: ${err.message}`;
      console.error('[REPORT] ❌ Email failed:', err.message);
    }
  }

  // Send Telegram — singleton pattern: tránh tạo nhiều TelegramBot instance (S2.5)
  if (options.telegram !== false && (process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN)) {
    try {
      const tgBot = options.bot || getSingletonBot();
      const chatId = options.chatId || process.env.ADMIN_CHAT_ID || process.env.ADMIN_USER_IDS;
      
      if (chatId) {
        const tgMsg = formatReportTelegram(report);
        // Split if too long (Telegram limit 4096 chars)
        if (tgMsg.length > 4000) {
          const parts = [];
          let remaining = tgMsg;
          while (remaining.length > 0) {
            parts.push(remaining.slice(0, 4000));
            remaining = remaining.slice(4000);
          }
          for (const part of parts) {
            await tgBot.sendMessage(chatId, part);
          }
        } else {
          await tgBot.sendMessage(chatId, tgMsg);
        }
        results.telegram = 'sent';
        console.log('[REPORT] ✅ Telegram sent');
      } else {
        results.telegram = 'skipped (no ADMIN_CHAT_ID)';
      }
    } catch (err) {
      results.telegram = `error: ${err.message}`;
      console.error('[REPORT] ❌ Telegram failed:', err.message);
    }
  }

  return results;
}

// ===== EXPORTS =====
module.exports = { generateWeeklyReport, generateMonthlyReport, formatReportTelegram, formatReportEmail, sendReport };

// ===== CLI =====
if (require.main === module) {
  const type = process.argv[2] || 'weekly';
  const shouldSend = process.argv.includes('--send');

  (async () => {
    try {
      const report = type === 'monthly' 
        ? await generateMonthlyReport()
        : await generateWeeklyReport();

      console.log('\n' + formatReportTelegram(report));
      console.log(`\n💰 Total AI tokens: ${report.totalTokens}`);

      if (shouldSend) {
        console.log('\n📤 Sending report...');
        const results = await sendReport(report);
        console.log('📤 Results:', results);
      }
    } catch (err) {
      console.error('❌ Error:', err.message);
      process.exit(1);
    }
  })();
}
