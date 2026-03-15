/**
 * CEO Directive — Create Google Forms for WF4 & WF5
 * Run function: createAllForms()
 * Deploy as Web App → Access URL to trigger
 * 
 * Output: Form IDs, Entry IDs, Response Sheet IDs
 */

/** Web App entry — GET triggers form creation */
function doGet(e) {
  var result = createAllForms();
  return ContentService
    .createTextOutput(JSON.stringify(result, null, 2))
    .setMimeType(ContentService.MimeType.JSON);
}

function createAllForms() {
  const wf4 = createWF4Form();
  const wf5 = createWF5Form();
  
  Logger.log('\n========== RESULTS ==========');
  Logger.log('\n--- WF4: Phản hồi Leo thang ---');
  Logger.log('Form ID: ' + wf4.formId);
  Logger.log('Form URL: ' + wf4.formUrl);
  Logger.log('Edit URL: ' + wf4.editUrl);
  Logger.log('Response Sheet ID: ' + wf4.sheetId);
  Logger.log('Entry IDs: ' + JSON.stringify(wf4.entryIds, null, 2));
  
  Logger.log('\n--- WF5: Cập nhật Tiến độ ---');
  Logger.log('Form ID: ' + wf5.formId);
  Logger.log('Form URL: ' + wf5.formUrl);
  Logger.log('Edit URL: ' + wf5.editUrl);
  Logger.log('Response Sheet ID: ' + wf5.sheetId);
  Logger.log('Entry IDs: ' + JSON.stringify(wf5.entryIds, null, 2));
  
  Logger.log('\n========== ENV CONFIG ==========');
  Logger.log('FORM_WF4_ID=' + wf4.formId);
  Logger.log('FORM_WF4_RESPONSE_SHEET_ID=' + wf4.sheetId);
  Logger.log('FORM_WF5_ID=' + wf5.formId);
  Logger.log('FORM_WF5_RESPONSE_SHEET_ID=' + wf5.sheetId);
  
  Logger.log('\n========== NODE.JS ENTRY IDS ==========');
  Logger.log('// WF4 Entry IDs');
  Logger.log('const FORM_WF4_ENTRY_IDS = ' + JSON.stringify(wf4.entryIds, null, 2) + ';');
  Logger.log('// WF5 Entry IDs');
  Logger.log('const FORM_WF5_ENTRY_IDS = ' + JSON.stringify(wf5.entryIds, null, 2) + ';');
  
  return { wf4, wf5 };
}

/**
 * WF4: Phản hồi Leo thang — Escalation Response Form
 */
function createWF4Form() {
  const form = FormApp.create('CEO Directive — Phản hồi Leo thang');
  form.setDescription(
    'Form phản hồi khi chỉ đạo bị quá hạn.\n' +
    'Vui lòng giải trình lý do và cam kết thời gian hoàn thành mới.\n\n' +
    '⚠️ Thông tin này sẽ được báo cáo trực tiếp cho CEO.'
  );
  form.setConfirmationMessage(
    '✅ Phản hồi đã được ghi nhận!\n\n' +
    'Hệ thống sẽ tự động cập nhật trạng thái chỉ đạo.\n' +
    'Cảm ơn bạn đã phản hồi kịp thời.'
  );
  form.setAllowResponseEdits(false);
  form.setLimitOneResponsePerUser(false);
  
  // Field 1: Mã Clarification (prefill, hidden-ish)
  var q1 = form.addTextItem();
  q1.setTitle('Mã Clarification');
  q1.setHelpText('Mã tự động từ hệ thống — không cần chỉnh sửa');
  q1.setRequired(true);
  
  // Field 2: Tiêu đề chỉ đạo (prefill)
  var q2 = form.addTextItem();
  q2.setTitle('Tiêu đề chỉ đạo');
  q2.setHelpText('Nội dung chỉ đạo — đã điền sẵn');
  q2.setRequired(true);
  
  // Field 3: Đầu mối (prefill)
  var q3 = form.addTextItem();
  q3.setTitle('Đầu mối thực hiện');
  q3.setHelpText('Người chịu trách nhiệm');
  q3.setRequired(true);
  
  // Field 4: Số ngày quá hạn (prefill)
  var q4 = form.addTextItem();
  q4.setTitle('Số ngày quá hạn');
  q4.setHelpText('Số ngày đã quá hạn tính từ deadline');
  q4.setRequired(false);
  
  // Field 5: Lý do chậm trễ (dropdown)
  var q5 = form.addListItem();
  q5.setTitle('Lý do chậm trễ');
  q5.setHelpText('Chọn lý do chính khiến chỉ đạo chưa hoàn thành');
  q5.setChoiceValues([
    'Chờ phê duyệt từ cấp trên',
    'Thiếu nguồn lực (nhân sự/ngân sách)',
    'Chưa rõ yêu cầu cụ thể',
    'Phụ thuộc bên thứ 3 / đối tác',
    'Khối lượng công việc quá lớn',
    'Vấn đề kỹ thuật / hệ thống',
    'Thay đổi yêu cầu giữa chừng',
    'Lý do khác'
  ]);
  q5.setRequired(true);
  
  // Field 6: Mô tả chi tiết
  var q6 = form.addParagraphTextItem();
  q6.setTitle('Mô tả chi tiết');
  q6.setHelpText('Giải trình cụ thể về tình trạng hiện tại và khó khăn gặp phải');
  q6.setRequired(true);
  
  // Field 7: Tiến độ hiện tại (%)
  var q7 = form.addListItem();
  q7.setTitle('Tiến độ hiện tại (%)');
  q7.setHelpText('Ước lượng % công việc đã hoàn thành');
  q7.setChoiceValues(['0%', '10%', '20%', '30%', '40%', '50%', '60%', '70%', '80%', '90%']);
  q7.setRequired(true);
  
  // Field 8: Ngày dự kiến hoàn thành mới
  var q8 = form.addDateItem();
  q8.setTitle('Ngày dự kiến hoàn thành mới');
  q8.setHelpText('Cam kết thời hạn mới để hoàn thành chỉ đạo');
  q8.setRequired(true);
  
  // Field 9: Cam kết
  var q9 = form.addCheckboxItem();
  q9.setTitle('Cam kết');
  q9.setChoiceValues([
    'Tôi cam kết hoàn thành đúng thời hạn mới',
    'Tôi đã báo cáo trung thực tình trạng hiện tại'
  ]);
  q9.setRequired(true);

  // Link to Google Sheets
  form.setDestination(FormApp.DestinationType.SPREADSHEET, createResponseSheet('WF4_Escalation_Responses'));
  
  // Get entry IDs
  var items = form.getItems();
  var entryIds = {};
  var fieldNames = ['maClarification', 'tieuDe', 'dauMoi', 'soNgayQuaHan', 'lyDoTre', 'moTaChiTiet', 'tienDo', 'ngayDuKien', 'camKet'];
  
  for (var i = 0; i < items.length; i++) {
    entryIds[fieldNames[i]] = String(items[i].getId());
  }
  
  // Get response sheet ID
  var destId = form.getDestinationId();
  
  return {
    formId: form.getId(),
    formUrl: form.getPublishedUrl(),
    editUrl: form.getEditUrl(),
    sheetId: destId,
    entryIds: entryIds
  };
}

/**
 * WF5: Cập nhật Tiến độ — Progress Update Form
 */
function createWF5Form() {
  var form = FormApp.create('CEO Directive — Cập nhật Tiến độ');
  form.setDescription(
    'Form cập nhật tiến độ thực hiện chỉ đạo.\n' +
    'Báo cáo tiến độ giúp CEO nắm bắt tình hình kịp thời.\n\n' +
    '📋 Vui lòng cập nhật chính xác và đầy đủ.'
  );
  form.setConfirmationMessage(
    '✅ Tiến độ đã được cập nhật!\n\n' +
    'Hệ thống sẽ tự động đồng bộ vào bảng theo dõi.\n' +
    'Cảm ơn bạn đã cập nhật kịp thời.'
  );
  form.setAllowResponseEdits(false);
  form.setLimitOneResponsePerUser(false);
  
  // Field 1: Mã Clarification
  var q1 = form.addTextItem();
  q1.setTitle('Mã Clarification');
  q1.setHelpText('Mã tự động từ hệ thống — không cần chỉnh sửa');
  q1.setRequired(true);
  
  // Field 2: Tiêu đề chỉ đạo
  var q2 = form.addTextItem();
  q2.setTitle('Tiêu đề chỉ đạo');
  q2.setHelpText('Nội dung chỉ đạo — đã điền sẵn');
  q2.setRequired(true);
  
  // Field 3: Đầu mối
  var q3 = form.addTextItem();
  q3.setTitle('Đầu mối thực hiện');
  q3.setHelpText('Người chịu trách nhiệm');
  q3.setRequired(true);
  
  // Field 4: Tiến độ hiện tại
  var q4 = form.addListItem();
  q4.setTitle('Tiến độ hiện tại (%)');
  q4.setHelpText('Ước lượng % công việc đã hoàn thành');
  q4.setChoiceValues(['0%', '10%', '25%', '50%', '75%', '90%', '100%']);
  q4.setRequired(true);
  
  // Field 5: Nội dung đã làm
  var q5 = form.addParagraphTextItem();
  q5.setTitle('Nội dung đã thực hiện');
  q5.setHelpText('Mô tả cụ thể những gì đã làm được');
  q5.setRequired(true);
  
  // Field 6: Khó khăn
  var q6 = form.addParagraphTextItem();
  q6.setTitle('Khó khăn / Vướng mắc');
  q6.setHelpText('Mô tả khó khăn gặp phải (nếu có) — bỏ trống nếu không có');
  q6.setRequired(false);
  
  // Field 7: Cần hỗ trợ
  var q7 = form.addParagraphTextItem();
  q7.setTitle('Cần hỗ trợ gì');
  q7.setHelpText('Bạn cần hỗ trợ gì từ Ban Giám Đốc? — bỏ trống nếu không cần');
  q7.setRequired(false);
  
  // Link to Google Sheets
  form.setDestination(FormApp.DestinationType.SPREADSHEET, createResponseSheet('WF5_Progress_Responses'));
  
  // Get entry IDs
  var items = form.getItems();
  var entryIds = {};
  var fieldNames = ['maClarification', 'tieuDe', 'dauMoi', 'tienDo', 'noiDungDaLam', 'khoKhan', 'canHoTro'];
  
  for (var i = 0; i < items.length; i++) {
    entryIds[fieldNames[i]] = String(items[i].getId());
  }
  
  var destId = form.getDestinationId();
  
  return {
    formId: form.getId(),
    formUrl: form.getPublishedUrl(),
    editUrl: form.getEditUrl(),
    sheetId: destId,
    entryIds: entryIds
  };
}

/**
 * Helper: Create a response spreadsheet
 */
function createResponseSheet(name) {
  var ss = SpreadsheetApp.create('CEO Directive — ' + name);
  // Make accessible
  var file = DriveApp.getFileById(ss.getId());
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return ss.getId();
}
