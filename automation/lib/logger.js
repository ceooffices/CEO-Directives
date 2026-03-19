/**
 * lib/logger.js
 * Ghi log workflow execution — local file + Supabase engagement_events
 *
 * v2: Thay thế Notion WF_LOGS → ghi local JSON + Supabase
 */

const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'wf_execution.log');

// Đảm bảo thư mục logs/ tồn tại
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

/**
 * Ghi log vào local file + Supabase engagement_events
 * API giữ nguyên tương thích với code cũ
 * @param {Object|string} options - Options object hoặc logTitle string (backward compat)
 * @param {string} [options.workflow] - Tên workflow
 * @param {string} [options.step] - Chi tiết step
 * @param {string} [options.status] - Status text
 * @param {string} [options.clarificationId] - Directive ID (Supabase UUID)
 * @param {string} [options.details] - Chi tiết text
 * @param {string} [options.emailTo] - Email đã gửi tới
 * @param {boolean} [options.dryRun] - Nếu true, chỉ log console
 * @param {string} [statusArg] - Status (backward compat khi gọi logExecution(title, status))
 */
async function logExecution(options, statusArg) {
  // Backward compat: logExecution("title", "status")
  if (typeof options === 'string') {
    options = { workflow: options, step: 'Run', status: statusArg || '', details: statusArg || '' };
  }

  const { workflow, step, status, clarificationId, details, emailTo, dryRun } = options;
  const logTitle = `${workflow} - ${step || 'Run'}`;
  const ts = new Date().toISOString();

  if (dryRun) {
    console.log(`[log] 🏜️ DRY-RUN log: ${logTitle} | ${status}`);
    if (details) console.log(`  Details: ${String(details).substring(0, 100)}`);
    return;
  }

  // 1. Ghi local file (JSONL format)
  try {
    const logLine = JSON.stringify({
      timestamp: ts,
      workflow,
      step,
      status,
      details: details ? String(details).substring(0, 500) : undefined,
      emailTo,
      directiveId: clarificationId,
    }) + '\n';
    fs.appendFileSync(LOG_FILE, logLine);
  } catch (err) {
    console.error(`[log] ❌ Ghi file thất bại: ${err.message}`);
  }

  // 2. Ghi Supabase engagement_events (nếu có)
  try {
    const { logEvent } = require('./supabase-client');
    await logEvent(clarificationId || null, `wf_log:${workflow}`, {
      title: logTitle,
      status,
      details: details ? String(details).substring(0, 500) : undefined,
      emailTo,
    });
  } catch (err) {
    // Supabase log failure không crash workflow
    console.error(`[log] ❌ Supabase log failed: ${err.message}`);
  }

  console.log(`[log] ✅ Logged: ${logTitle} | ${status}`);
}

module.exports = { logExecution };
