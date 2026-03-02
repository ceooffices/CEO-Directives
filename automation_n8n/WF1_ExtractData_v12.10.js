// ============================================================
// WF1 v12.10 - LỆNH GỬI LỜI NHẮC (Select thay Checkbox)
// Property: "LỆNH GỬI LỜI NHẮC" - Select: Gửi lời nhắc, Đã nhắc
// Property: "Email đầu mối" - Rollup từ T1-ĐẦU MỐI → Email
// ============================================================

const inputs = $input.all();

let clarifications = [];
let logs = [];
let messages = [];
let triggerSource = 'auto';

for (const inp of inputs) {
  if (inp.json?.triggerSource) {
    triggerSource = inp.json.triggerSource;
    continue;
  }
  
  const results = inp.json?.results || [];
  if (results.length === 0) continue;
  
  const firstProps = results[0]?.properties || {};
  
  if (firstProps['Tiêu đề']) {
    clarifications = results;
  } else if (firstProps['Workflow']) {
    logs = results;
  } else if (firstProps['Category']) {
    messages = results;
  }
}

console.log('==========================================');
console.log('[WF1 v12.10] Trigger:', triggerSource);
console.log('[WF1 v12.10] Clarifications:', clarifications.length);
console.log('[WF1 v12.10] WF Logs:', logs.length);
console.log('[WF1 v12.10] Messages:', messages.length);

const now = new Date();
const today = now.toISOString().split('T')[0];
const isFriday = now.getDay() === 5;

// Build Log Count Map - đếm số lần gửi từ WF Logs
const logCountMap = {};
for (const log of logs) {
  const props = log.properties || {};
  const clarRel = props['Clarification']?.relation || [];
  const timestamp = props['Timestamp']?.created_time || log.created_time || '';
  const logDate = timestamp.split('T')[0];
  
  for (const rel of clarRel) {
    const clarId = rel.id;
    if (!logCountMap[clarId]) logCountMap[clarId] = { total: 0, today: 0 };
    logCountMap[clarId].total++;
    if (logDate === today) logCountMap[clarId].today++;
  }
}

// Build Message Library
const msgLib = { greeting: [], intro_progress: [], intro_deadline: [], offer_help: [], closing: [], closing_friday: [] };
messages.forEach(msg => {
  const props = msg.properties || {};
  const cat = props['Category']?.select?.name || '';
  const content = props['Nội dung']?.title?.[0]?.plain_text || '';
  if (cat && content && msgLib[cat]) msgLib[cat].push(content);
});

function pick(arr) { return arr?.length ? arr[Math.floor(Math.random() * arr.length)] : ''; }

if (!clarifications.length) {
  console.log('[WF1 v12.10] NO clarifications to process');
  return [];
}

const outputItems = [];
let skippedHasTask = 0, skippedRateLimit = 0, skippedWrongStatus = 0;

for (const page of clarifications) {
  const props = page.properties;
  const id = page.id;
  
  // ========== VALIDATION: Đảm bảo đây là Clarification page ==========
  if (!props['Tiêu đề']) {
    console.log('  → SKIP: Not a valid Clarification page (no Tiêu đề)');
    continue;
  }
  
  const title = props['Tiêu đề']?.title?.[0]?.plain_text || 'Untitled';
  const status = props['Tình trạng']?.select?.name || '';
  const nguon = props['Nguồn']?.select?.name || 'CEO';
  const noiDungGoc = props['Nội dung gốc']?.rich_text?.[0]?.plain_text || '';
  const ngayNhan = props['Ngày nhận']?.date?.start || '';
  const t2NhiemVu = props['T2 - NHIỆM VỤ']?.rich_text?.[0]?.plain_text || '';
  const t3ChiTieu = props['T3 - CHỈ TIÊU']?.rich_text?.[0]?.plain_text || '';
  
  // ========== ĐỌC LỆNH GỬI LỜI NHẮC (Select thay Checkbox) ==========
  const lenhGuiLoiNhac = props['LỆNH GỬI LỜI NHẮC']?.select?.name || '';
  
  // Chỉ xử lý nếu = "Gửi lời nhắc"
  if (lenhGuiLoiNhac !== 'Gửi lời nhắc') {
    console.log('-----');
    console.log('ID:', id.substring(0,8), '| Title:', title.substring(0, 25));
    console.log('  LỆNH GỬI LỜI NHẮC:', lenhGuiLoiNhac || '(trống)');
    console.log('  → SKIP: Không phải "Gửi lời nhắc"');
    skippedWrongStatus++;
    continue;
  }
  
  // ========== ĐỌC EMAIL TỪ ROLLUP "Email đầu mối" ==========
  let emailResolved = '';
  let emailSource = 'fallback';
  
  const emailProp = props['Email đầu mối'];
  
  if (emailProp) {
    // Case 1: Rollup type - array of emails
    if (emailProp.type === 'rollup' && emailProp.rollup?.array?.length > 0) {
      const firstItem = emailProp.rollup.array[0];
      if (firstItem?.email) {
        emailResolved = firstItem.email;
        emailSource = 'rollup';
      }
    }
    // Case 2: Direct email type
    else if (emailProp.type === 'email' && emailProp.email) {
      emailResolved = emailProp.email;
      emailSource = 'direct';
    }
  }
  
  // Fallback
  if (!emailResolved) {
    emailResolved = 'vynnl@esuhai.com';
    emailSource = 'fallback';
  }
  
  const t1Relation = props['T1 - ĐẦU MỐI']?.relation || [];
  
  // Check đã có Task chưa
  const taskRelation = props['Công việc (sau khi rõ)']?.relation || [];
  const hasTask = taskRelation.length > 0 || status === '✅ Đã tạo task';
  
  // Đếm số lần gửi từ WF Logs
  const logCount = logCountMap[id] || { total: 0, today: 0 };
  
  console.log('-----');
  console.log('ID:', id.substring(0,8));
  console.log('Title:', title.substring(0, 30));
  console.log('  LỆNH GỬI LỜI NHẮC:', lenhGuiLoiNhac);
  console.log('  📧 Resolved:', emailResolved, '(' + emailSource + ')');
  console.log('  T1-ĐẦU MỐI:', t1Relation.length > 0 ? t1Relation[0].id.substring(0,8) : '(none)');
  console.log('  hasTask:', hasTask);
  console.log('  Số lần gửi - total:', logCount.total, '| today:', logCount.today);
  
  if (hasTask) {
    console.log('  → SKIP: Đã có task');
    skippedHasTask++;
    continue;
  }
  
  // Rate limit: max 2 lần/ngày (trừ khi có LỆNH GỬI LỜI NHẮC)
  // Vì đã filter "Gửi lời nhắc", user chủ động chọn → cho gửi
  // Nhưng vẫn log để tracking
  if (logCount.today >= 2) {
    console.log('  ⚠️ WARNING: Đã gửi', logCount.today, 'lần hôm nay, nhưng user chọn gửi tiếp');
  }
  
  // Build email content
  const soLanGuiMoi = logCount.total + 1; // Tổng số lần gửi mới
  const soLanGuiTodayMoi = logCount.today + 1; // Số lần trong ngày mới
  const alertLevel = soLanGuiMoi === 1 ? 'gentle' : 'serious';
  
  const greeting = pick(msgLib.greeting) || 'Chào anh/chị,';
  const intro = soLanGuiMoi === 1 
    ? (pick(msgLib.intro_progress) || 'Em đang tổng hợp tiến độ, nhờ anh/chị xác nhận giúp ạ.')
    : (pick(msgLib.intro_deadline) || 'Sếp có hỏi tiến độ, em cần anh/chị xác nhận sớm ạ.');
  const offerHelp = pick(msgLib.offer_help) || 'Nếu cần hỗ trợ, anh/chị cứ nói em nhé.';
  const closing = isFriday ? (pick(msgLib.closing_friday) || 'Cuối tuần vui!') : (pick(msgLib.closing) || 'Trân trọng!');
  const subject = soLanGuiMoi === 1 
    ? '📋 [Cần xác nhận] ' + title.substring(0, 50) 
    : '⚠️ [Nhắc lần ' + soLanGuiMoi + '] ' + title.substring(0, 50);
  
  // Build prefill URL
  const formId = '1FAIpQLSdzRTOucM4qWwlxyx3yEelDorBv2ADnL8jFUUW7-xpqdidvBw';
  const encode = (str) => encodeURIComponent(str || '');
  const params = [];
  params.push('entry.1684171280=' + encode(id));
  params.push('entry.1878008034=' + encode(nguon));
  params.push('entry.1953342780=' + encode(ngayNhan));
  params.push('entry.1839616630=' + encode(noiDungGoc || title));
  if (t2NhiemVu) params.push('entry.1319518938=' + encode(t2NhiemVu));
  if (t3ChiTieu) params.push('entry.1910876946=' + encode(t3ChiTieu));
  const prefillUrl = 'https://docs.google.com/forms/d/e/' + formId + '/viewform?' + params.join('&');
  
  outputItems.push({
    json: {
      clarificationId: id,
      title, status, nguon, noiDungGoc, ngayNhan, t2NhiemVu, t3ChiTieu,
      emailResolved, emailSource,
      lenhGuiLoiNhac,
      soLanGuiTotal: logCount.total,
      soLanGuiToday: logCount.today,
      soLanGuiMoi,
      soLanGuiTodayMoi,
      alertLevel,
      emailSubject: subject,
      emailGreeting: greeting,
      emailIntro: intro,
      emailOfferHelp: offerHelp,
      emailClosing: closing,
      prefillUrl,
      today, isFriday,
      pageUrl: page.url,
      triggerSource,
      ccEmails: 'hoangkha@esuhai.com, vynnl@esuhai.com'
    }
  });
  
  console.log('  → QUEUED (' + alertLevel + ') to:', emailResolved);
}

console.log('==========================================');
console.log('[WF1 v12.10] SUMMARY:');
console.log('  To process:', outputItems.length);
console.log('  Skipped (wrong status):', skippedWrongStatus);
console.log('  Skipped (has task):', skippedHasTask);
console.log('  Skipped (rate limit):', skippedRateLimit);

return outputItems;
