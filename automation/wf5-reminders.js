/**
 * wf5-reminders.js
 * CEO Directive WF5: Duolingo-style Smart Reminders
 * 
 * Port từ: WF5_v2_FIXED.json (n8n workflow)
 * 
 * Flow:
 *   Query Active Tasks → Group by recipient → Build personalized email → Send
 * 
 * Usage:
 *   node wf5-reminders.js              # Chạy thật
 *   node wf5-reminders.js --dry-run    # Chỉ log, không gửi
 */

const { queryActiveClarifications, safeText, safeDate, resolveEmailFromRelation, safeRollupEmail } = require('./lib/notion-client');
const { sendEmail } = require('./lib/email-sender');

const DRY_RUN = process.argv.includes('--dry-run');
const BOD_HOSTING_EMAIL = process.env.BOD_HOSTING_EMAIL || 'letuan@esuhai.com';
const ALWAYS_CC = (process.env.ALWAYS_CC || 'hoangkha@esuhai.com,vynnl@esuhai.com').split(',').map(e => e.trim());

// ===== THƯ VIỆN TIN NHẮN (from n8n code node) =====

const MSG = {
  deadline_tomorrow: [
    'Anh/chị ơi, có task sắp đến thời hạn ngày mai. Xem qua nhé ạ',
    'Ngày mai có thời hạn dự kiến đó ạ. Anh/chị cần hỗ trợ gì không?',
    'Mai là thời hạn dự kiến nè, anh/chị check qua nhé',
    '24h nữa là thời hạn. Cần hỗ trợ gì không ạ?'
  ],
  deadline_today: [
    'Hôm nay là thời hạn dự kiến rồi ạ! Tình hình thế nào?',
    'Thời hạn dự kiến là HÔM NAY. Anh/chị cập nhật giúp em nhé',
    'Task đến thời hạn hôm nay ạ. Tình hình thế nào rồi?',
    'Hôm nay là thời hạn nè! Có cần hỗ trợ gì không ạ?'
  ],
  deadline_overdue: [
    'Có task cần quan tâm thêm rồi ạ. Có khó khăn gì không?',
    'Task này cần cập nhật tiến độ. Anh/chị cần thêm thời gian không ạ?',
    'Task cần quan tâm, nhưng không sao, em ở đây hỗ trợ',
    'Task chưa có cập nhật gần đây. Mình cập nhật lại kế hoạch nhé?'
  ],
  monday_start: [
    'Thứ Hai rồi! Tuần mới, năng lượng mới nha',
    'Đầu tuần rồi! Mình bắt đầu tuần mới thật hiệu quả nhé?',
    'Chào thứ Hai! Tuần này mình cùng tiến bước nhé'
  ],
  friday_wrapup: [
    'Thứ 6 rồi! Tuần này vất vả quá, nghỉ ngơi nhé ạ',
    'Cuối tuần rồi! Cuối tuần vui vẻ nhé',
    'Hết tuần rồi! Cuối tuần thư giãn nhé'
  ],
  new_month: [
    'Tháng mới rồi! Khởi đầu mới, mục tiêu mới nha',
    'Chào tháng mới! Tháng này mình cùng chinh phục mục tiêu mới nào'
  ],
  normal_day: [
    'Chào! Hôm nay có task nào cần xem xét không ạ?',
    'Ngày mới tốt lành! Em ở đây sẵn sàng hỗ trợ',
    'Hôm nay mình cùng làm việc hiệu quả nhé!',
    'Chúc một ngày làm việc thuận lợi ạ!'
  ]
};

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ===== BUILD EMAIL HTML =====

function buildReminderEmail(recipient) {
  const priorityGradient = recipient.priority >= 90
    ? 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)'
    : recipient.priority >= 80
      ? 'linear-gradient(135deg, #f39c12 0%, #d68910 100%)'
      : 'linear-gradient(135deg, #58D68D 0%, #28B463 100%)';

  let taskHtml = '';
  if (recipient.urgentTasks.length > 0) {
    taskHtml = '<div style="background: #fff5f5; border-left: 4px solid '
      + (recipient.priority >= 90 ? '#e74c3c' : '#f39c12')
      + '; padding: 15px 20px; margin-bottom: 20px; border-radius: 0 8px 8px 0;">'
      + '<strong>📋 Tasks cần chú ý:</strong><br>';
    for (const t of recipient.urgentTasks.slice(0, 5)) {
      const icon = t.status === 'overdue' ? '🔴' : t.status === 'today' ? '🟠' : '🟡';
      const label = t.status === 'overdue'
        ? `(cần quan tâm — ${Math.abs(t.daysLeft)} ngày)`
        : t.status === 'today' ? '(hôm nay)' : '(ngày mai)';
      taskHtml += `• ${icon} ${t.title} ${label}<br>`;
    }
    taskHtml += '</div>';
  }

  return `<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
  <div style="background: ${priorityGradient}; padding: 25px; text-align: center; border-radius: 12px 12px 0 0;">
    <div style="font-size: 50px; margin-bottom: 10px;">🦉</div>
    <h1 style="color: #ffffff; margin: 0; font-size: 20px;">ClaudeK gửi lời chào!</h1>
  </div>
  <div style="padding: 30px; background: #f8f9fa; border: 1px solid #e9ecef;">
    <div style="background: #ffffff; border-radius: 15px; padding: 25px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
      <p style="font-size: 17px; color: #2c3e50; line-height: 1.7; margin: 0;">${recipient.message}</p>
    </div>
    ${taskHtml}
    <div style="display: flex; justify-content: space-around; text-align: center; margin: 20px 0;">
      <div style="flex: 1;">
        <div style="font-size: 28px; font-weight: bold; color: ${recipient.stats.overdue > 0 ? '#e74c3c' : '#27ae60'};">${recipient.stats.totalActive}</div>
        <div style="font-size: 12px; color: #7f8c8d;">Tasks đang làm</div>
      </div>
      ${recipient.stats.overdue > 0 ? `<div style="flex: 1;"><div style="font-size: 28px; font-weight: bold; color: #e74c3c;">${recipient.stats.overdue}</div><div style="font-size: 12px; color: #7f8c8d;">Cần quan tâm</div></div>` : ''}
      ${recipient.stats.dueToday > 0 ? `<div style="flex: 1;"><div style="font-size: 28px; font-weight: bold; color: #f39c12;">${recipient.stats.dueToday}</div><div style="font-size: 12px; color: #7f8c8d;">Hôm nay</div></div>` : ''}
    </div>
    <div style="text-align: center; margin: 25px 0 10px 0;">
      <a href="https://www.notion.so/${(process.env.NOTION_DB_TASK || '').replace(/-/g, '')}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 14px 35px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 15px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
        📋 Xem Tasks trong Notion
      </a>
    </div>
  </div>
  <div style="background: #2c3e50; padding: 20px; text-align: center; border-radius: 0 0 12px 12px;">
    <p style="color: #bdc3c7; margin: 0; font-size: 12px;">🦉 ClaudeK - Trợ lý thông minh</p>
    <p style="color: #7f8c8d; margin: 8px 0 0 0; font-size: 11px;">${recipient.category} | ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</p>
  </div>
</div>`;
}

// ===== MAIN LOGIC =====

async function run() {
  const startTime = Date.now();
  const now = new Date();
  const dayOfWeek = now.getDay();
  const dayOfMonth = now.getDate();

  console.log('==========================================');
  console.log(`[WF5] ${now.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`);
  console.log(`[WF5] Mode: ${DRY_RUN ? '🏜️ DRY-RUN' : '⚡ LIVE'}`);
  console.log('==========================================');

  // 1. Query active tasks
  console.log('\n[1/3] Querying active commands...');
  const tasks = await queryActiveClarifications();
  console.log(`  Found: ${tasks.length} active directives`);

  // 2. Group by recipient
  console.log('\n[2/3] Grouping by recipient...');
  const tasksByRecipient = {};

  for (const task of tasks) {
    const props = task.properties || {};

    // Extract title
    let title = '';
    for (const [key, value] of Object.entries(props)) {
      if (value.type === 'title' && value.title?.[0]) {
        title = value.title[0].plain_text || '';
        break;
      }
    }

    // Extract deadline
    let deadline = null, deadlineStr = '';
    for (const [key, value] of Object.entries(props)) {
      const kl = key.toLowerCase();
      if (kl.includes('thời hạn') || kl.includes('t4')) {
        if (value.date?.start) {
          deadline = new Date(value.date.start);
          deadlineStr = value.date.start;
        }
        break;
      }
    }

    // Extract recipient email (Actual assignee) and override to BOD_HOSTING
    let emailDauMoiThucTe = await resolveEmailFromRelation(props['Email đầu mối']) || safeRollupEmail(props['Email đầu mối']?.rollup) || '';
    
    let recipientEmail = BOD_HOSTING_EMAIL;
    let recipientName = safeText(props['T1 - Đầu mối']?.rich_text) || 'BOD Hosting';

    if (!recipientEmail) continue;

    // Calculate days left
    let daysLeft = null, status = 'normal';
    if (deadline) {
      daysLeft = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
      if (daysLeft < 0) status = 'overdue';
      else if (daysLeft === 0) status = 'today';
      else if (daysLeft === 1) status = 'tomorrow';
      else if (daysLeft <= 3) status = 'soon';
    }

    if (!tasksByRecipient[recipientEmail]) {
      tasksByRecipient[recipientEmail] = {
        email: recipientEmail, name: recipientName,
        tasks: [], hasOverdue: false, hasDueToday: false, hasDueTomorrow: false,
        ccSet: new Set(ALWAYS_CC),
      };
    }

    if (emailDauMoiThucTe && emailDauMoiThucTe !== BOD_HOSTING_EMAIL) {
      tasksByRecipient[recipientEmail].ccSet.add(emailDauMoiThucTe);
    }

    tasksByRecipient[recipientEmail].tasks.push({
      title, deadline: deadlineStr, daysLeft, status, actualAssignee: emailDauMoiThucTe,
      url: task.url || 'https://www.notion.so/' + task.id.replace(/-/g, ''),
    });

    if (status === 'overdue') tasksByRecipient[recipientEmail].hasOverdue = true;
    if (status === 'today') tasksByRecipient[recipientEmail].hasDueToday = true;
    if (status === 'tomorrow') tasksByRecipient[recipientEmail].hasDueTomorrow = true;
  }

  // 3. Build & send emails
  console.log('\n[3/3] Sending reminders...');
  let sentCount = 0;

  for (const [email, r] of Object.entries(tasksByRecipient)) {
    // Select category
    let category = 'normal_day', priority = 0;
    if (r.hasOverdue) { category = 'deadline_overdue'; priority = 100; }
    else if (r.hasDueToday) { category = 'deadline_today'; priority = 90; }
    else if (r.hasDueTomorrow) { category = 'deadline_tomorrow'; priority = 80; }
    else if (dayOfMonth === 1) { category = 'new_month'; priority = 50; }
    else if (dayOfWeek === 1) { category = 'monday_start'; priority = 40; }
    else if (dayOfWeek === 5) { category = 'friday_wrapup'; priority = 40; }

    // Weekend filter
    if ((dayOfWeek === 0 || dayOfWeek === 6) && priority < 80) continue;
    if (r.tasks.length === 0) continue;

    const message = pick(MSG[category] || MSG['normal_day']);
    const urgentTasks = r.tasks.filter(t => ['overdue', 'today', 'tomorrow'].includes(t.status));

    const stats = {
      totalActive: r.tasks.length,
      overdue: r.tasks.filter(t => t.status === 'overdue').length,
      dueToday: r.tasks.filter(t => t.status === 'today').length,
      dueTomorrow: r.tasks.filter(t => t.status === 'tomorrow').length,
    };

    const urgentPrefix = category === 'deadline_overdue' ? '📋 Cần quan tâm: '
      : category === 'deadline_today' ? '📌 Hôm nay: ' : '';

    const recipientData = {
      email, name: r.name || email.split('@')[0],
      message, category, priority, urgentTasks, stats,
    };

    try {
      await sendEmail({
        to: email,
        subject: `🦉 ${urgentPrefix}ClaudeK đồng hành cùng ${recipientData.name}!`,
        html: buildReminderEmail(recipientData),
        cc: Array.from(r.ccSet).filter(e => e !== email).join(', '),
        dryRun: DRY_RUN,
      });
      sentCount++;
    } catch (error) {
      console.error(`  ❌ FAILED → ${email}:`, error.message);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n==========================================');
  console.log(`[WF5] DONE: ${sentCount} reminders sent | ${elapsed}s`);
  console.log('==========================================');

  return { sentCount };
}

if (require.main === module) {
  run().catch(err => {
    console.error('❌ FATAL:', err);
    process.exit(1);
  });
}

module.exports = { run };
