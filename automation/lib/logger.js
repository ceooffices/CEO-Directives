/**
 * lib/logger.js
 * Ghi log workflow execution vào Notion WF Logs DB
 * Tương đương các node "📊 Log Success/Warning" trong n8n
 */

const { createPage, DB } = require('./notion-client');

/**
 * Ghi log vào Notion WF Logs database
 * @param {Object} options
 * @param {string} options.workflow - Tên workflow (e.g. 'WF1 - Gửi email')
 * @param {string} options.step - Chi tiết step (e.g. 'STEP1', 'STEP2')
 * @param {string} options.status - '✅ Success' | '⚠️ Warning' | '❌ Error'
 * @param {string} [options.clarificationId] - Notion page ID liên kết
 * @param {string} [options.details] - Chi tiết text
 * @param {string} [options.emailTo] - Email đã gửi tới
 * @param {boolean} [options.dryRun] - Nếu true, chỉ log console
 */
async function logExecution(options) {
  const { workflow, step, status, clarificationId, details, emailTo, dryRun } = options;

  const logTitle = `${workflow} - ${step || 'Run'}`;

  if (dryRun) {
    console.log(`[log] 🏜️ DRY-RUN log: ${logTitle} | ${status}`);
    if (details) console.log(`  Details: ${details.substring(0, 100)}`);
    return;
  }

  const properties = {
    'Log': { title: [{ text: { content: logTitle } }] },
    'Workflow': { select: { name: workflow } },
    'Status': { select: { name: status } },
  };

  if (clarificationId) {
    properties['Clarification'] = { relation: [{ id: clarificationId }] };
  }

  if (details) {
    properties['Details'] = {
      rich_text: [{ text: { content: details.substring(0, 2000) } }],
    };
  }

  if (emailTo) {
    properties['Email To'] = { email: emailTo };
  }

  try {
    await createPage(DB.WF_LOGS, properties);
    console.log(`[log] ✅ Logged: ${logTitle} | ${status}`);
  } catch (error) {
    console.error(`[log] ❌ Failed to log: ${error.message}`);
    // Không throw — log failure không nên crash toàn bộ workflow
  }
}

module.exports = { logExecution };
