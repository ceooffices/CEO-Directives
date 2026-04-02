/**
 * lib/email-sender.js
 * Multi-transport email sender
 * 
 * Hỗ trợ 2 transport:
 * 1. SMTP Office365 (primary) — tránh spam, domain uy tín
 * 2. Gmail App Password (fallback)
 * 
 * Dùng Nodemailer cho cả hai.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const nodemailer = require('nodemailer');

// ===== TRANSPORT FACTORY =====

function createTransport() {
  // Priority 1: SMTP Office365 (domain mail, tránh spam & quota)
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
    console.log('[email] 📧 Using SMTP transport:', process.env.SMTP_HOST);
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,           // smtp.office365.com
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,                          // STARTTLS
      auth: {
        user: process.env.SMTP_USER,          // ceo.offices@esuhai.com
        pass: process.env.SMTP_PASSWORD,
      },
      tls: {
        rejectUnauthorized: true,
      },
    });
  }

  // Priority 2: Gmail App Password
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    console.log('[email] 📧 Using Gmail App Password transport');
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }

  // Priority 3: N8N Cloud relay (POST webhook vào n8n)
  if (process.env.N8N_BASE_URL && process.env.N8N_EMAIL_WEBHOOK) {
    console.log('[email] 📧 Using N8N webhook relay');
    return null; // handled separately in sendEmail()
  }

  throw new Error('[email] ❌ Không có transport nào được cấu hình! Cần SMTP_HOST hoặc GMAIL_USER');
}

let transporter = null;

function getTransporter() {
  if (!transporter) transporter = createTransport();
  return transporter;
}

// ===== SEND EMAIL =====

/**
 * Gửi email
 * @param {Object} options
 * @param {string} options.to - Email người nhận
 * @param {string} options.subject - Tiêu đề
 * @param {string} options.html - Nội dung HTML
 * @param {string} [options.cc] - CC emails (comma-separated)
 * @param {string} [options.bcc] - BCC emails (comma-separated)
 * @param {string} [options.from] - From email (default: SMTP_USER hoặc GMAIL_USER)
 * @param {string} [options.fromName] - From name (default: env FROM_NAME)
 * @param {boolean} [options.dryRun] - Nếu true, chỉ log không gửi thật
 */
async function sendEmail(options) {
  let { to, subject, html, cc, bcc, from, fromName, dryRun } = options;

  const fromAddr = from || process.env.SMTP_USER || process.env.GMAIL_USER || 'ceo.offices@esuhai.com';
  const senderName = fromName || process.env.FROM_NAME || 'Hệ thống Chỉ đạo CEO - EsuhaiGroup';

  // DEBUG_EMAIL_CATCH_ALL: ghi đè mọi email đích về 1 địa chỉ test
  // Tránh gửi email thật khi test/dev
  const catchAll = process.env.DEBUG_EMAIL_CATCH_ALL;
  if (catchAll) {
    const originalTo = to;
    const originalCc = cc;
    const originalBcc = bcc;
    to = catchAll;
    cc = undefined;
    bcc = undefined;
    subject = `[T-REDIRECT from ${originalTo}] ${subject}`;
    console.log(`[email] 🔀 DEBUG_EMAIL_CATCH_ALL → chuyển hướng tất cả email về ${catchAll}`);
    console.log(`  Original To: ${originalTo} | CC: ${originalCc || '(none)'} | BCC: ${originalBcc || '(none)'}`);
  }

  // Dry-run: chỉ log, không gửi
  if (dryRun) {
    console.log('[email] 🏜️ DRY-RUN — không gửi thật');
    console.log(`  To: ${to}`);
    console.log(`  CC: ${cc || '(none)'}`);
    console.log(`  BCC: ${bcc || '(none)'}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  From: ${senderName} <${fromAddr}>`);
    console.log(`  HTML length: ${(html || '').length} chars`);
    return { messageId: 'dry-run', accepted: [to] };
  }

  // N8N webhook relay mode
  if (!getTransporter() && process.env.N8N_EMAIL_WEBHOOK) {
    const webhookUrl = `${process.env.N8N_BASE_URL}${process.env.N8N_EMAIL_WEBHOOK}`;
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to, subject, htmlBody: html, cc, bcc,
        from_email: fromAddr,
        from_name: senderName,
        senderName,
      }),
    });
    const result = await response.json();
    console.log(`[email] ✅ Sent via N8N relay → ${to}`);
    return result;
  }

  // Nodemailer send
  const mailOptions = {
    from: `"${senderName}" <${fromAddr}>`,
    to,
    subject,
    html,
  };
  if (cc) mailOptions.cc = cc;
  if (bcc) mailOptions.bcc = bcc;

  try {
    const info = await getTransporter().sendMail(mailOptions);
    console.log(`[email] ✅ Sent → ${to} | MessageID: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`[email] ❌ FAILED → ${to}:`, error.message);
    throw error;
  }
}

// ===== TEST MODE =====

if (require.main === module && process.argv.includes('--test')) {
  (async () => {
    console.log('=== EMAIL SENDER TEST ===');
    console.log('SMTP_HOST:', process.env.SMTP_HOST || '(not set)');
    console.log('SMTP_USER:', process.env.SMTP_USER || '(not set)');
    console.log('GMAIL_USER:', process.env.GMAIL_USER || '(not set)');
    console.log('N8N_BASE_URL:', process.env.N8N_BASE_URL || '(not set)');

    try {
      await sendEmail({
        to: process.env.SMTP_USER || process.env.GMAIL_USER || 'hoangkha@esuhai.com',
        subject: '✅ [TEST] CEO Directive Automation - Email hoạt động!',
        html: '<h2>🎉 Email test thành công!</h2><p>Automation engine đã kết nối được SMTP/Gmail.</p><p><em>Sent at: ' + new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) + '</em></p>',
        dryRun: process.argv.includes('--dry-run'),
      });
      console.log('=== TEST PASSED ===');
    } catch (e) {
      console.error('=== TEST FAILED ===', e.message);
    }
  })();
}

module.exports = { sendEmail };
