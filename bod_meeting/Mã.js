/**
 * ========================================================================
 * Mã.js — BOD REGISTRATION SYSTEM v8.5
 * ========================================================================
 * Version: 8.5 (Modular Edition)
 * Updated: 12/03/2026
 *
 * CHỈ GIỮ LẠI:
 * - Menu (onOpen)
 * - Triggers (onFormSubmit, onEditHandler, createTriggers)
 * - Approval workflow (sendApprovalResults — menu version)
 * - Data maintenance (updateAllRelatedNames, checkInvalidEmails, resetEmailSentStatus)
 * - Test function (testBODDashboard)
 *
 * CÁC MODULE ĐÃ TÁCH:
 * - v850_config.js    → CONFIG object, loadConfigFromSheet
 * - v851_helpers.js   → Helpers, format, date, stats, lookup
 * - v852_email_router.js → Email router, templates, log
 * - v853_schedule.js  → Schedule generation, refresh dashboard
 *
 * CẤU TRÚC CỘT FORM ĐĂNG KÝ (A-Q):
 * A: Timestamp | B: Nội dung | C: Thời lượng | D: Cần QĐ?
 * E: QĐ gì? | F: Tham gia | G: Email liên quan | H: Ngày họp
 * I: Họ Tên | J: Email | K: Bộ phận | L: Trạng thái
 * M: Thứ tự | N: Ghi chú | O: TL chỉ đạo | P: Tên liên quan
 * Q: Đã gửi email
 * ========================================================================
 */

// =============================================================================
// MENU v8.5
// =============================================================================
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("🔧 BOD Tools")
    .addItem("🌐 Mở Dashboard", "showDashboardDialog")
    .addItem("⚙️ Mở Trang Quản trị", "showAdminPageDialog")
    .addItem("🔄 Refresh dữ liệu", "refreshDashboard")
    .addSeparator()
    .addItem("🔄 Reset gửi email", "resetEmailSentStatus")
    .addItem("👥 Cập nhật Tên liên quan", "updateAllRelatedNames")
    .addItem("🔍 Kiểm tra Email", "checkInvalidEmails")
    .addSeparator()
    .addItem("🧪 Test toàn bộ CTA", "testBODDashboard")
    .addToUi();
}

function goToDashboard() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_REVIEW);
  if (sheet) {
    ss.setActiveSheet(sheet);
    highlightUpcomingWeekDashboard();
  }
}

// =============================================================================
// DATA MAINTENANCE
// =============================================================================
function updateAllRelatedNames() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_RESPONSES);
  const ui = SpreadsheetApp.getUi();
  if (!sheet) {
    ui.alert('Không tìm thấy tab "' + CONFIG.SHEET_RESPONSES + '"!');
    return;
  }
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) { ui.alert("Chưa có dữ liệu!"); return; }
  const cols = CONFIG.COLUMN_MAP;
  const emailToName = loadEmailToNameMap();
  if (Object.keys(emailToName).length === 0) { ui.alert("Không có dữ liệu HR!"); return; }
  let updated = 0;
  for (let i = 2; i <= lastRow; i++) {
    const emailList = sheet.getRange(i, cols.emailLienQuan + 1).getValue();
    if (emailList && emailList.toString().trim()) {
      const names = lookupNamesFromEmailList(emailList, emailToName);
      sheet.getRange(i, cols.tenLienQuan + 1).setValue(names || "");
      if (names) updated++;
    } else {
      sheet.getRange(i, cols.tenLienQuan + 1).setValue("");
    }
  }
  ui.alert("Đã cập nhật " + updated + " dòng!");
}

function checkInvalidEmails() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_RESPONSES);
  const ui = SpreadsheetApp.getUi();
  if (!sheet) { ui.alert("Không tìm thấy tab!"); return; }
  const cols = CONFIG.COLUMN_MAP;
  const data = sheet.getDataRange().getValues();
  const invalid = [];
  for (let i = 1; i < data.length; i++) {
    const email = (data[i][cols.email] || "").toString().trim();
    if (email && !isValidEmail(email)) {
      invalid.push(
        "Row " + (i + 1) + ": " + (data[i][cols.hoTen] || "N/A") + ' → "' + email + '"');
    }
  }
  ui.alert(
    invalid.length === 0
      ? "✔︎ Tất cả email đều hợp lệ!"
      : "⚠️ " + invalid.length + " email không hợp lệ:\n\n" + invalid.join("\n"));
}

function resetEmailSentStatus() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_RESPONSES);
  const ui = SpreadsheetApp.getUi();
  if (!sheet) { ui.alert("Không tìm thấy tab!"); return; }
  const resp = ui.prompt(
    "🔄 Reset trạng thái gửi email",
    "Nhập ngày họp (VD: 27/01):",
    ui.ButtonSet.OK_CANCEL);
  if (resp.getSelectedButton() !== ui.Button.OK) return;
  const searchDate = resp.getResponseText().trim();
  if (!searchDate) { ui.alert("Vui lòng nhập ngày họp!"); return; }
  const cols = CONFIG.COLUMN_MAP;
  const data = sheet.getDataRange().getValues();
  let count = 0;
  for (let i = 1; i < data.length; i++) {
    if (matchNgayHop(data[i][cols.ngayHop], searchDate)) {
      sheet.getRange(i + 1, cols.daGuiEmail + 1).setValue("");
      count++;
    }
  }
  ui.alert(
    count === 0
      ? "Không tìm thấy đăng ký cho ngày " + searchDate
      : "✔︎ Đã reset " + count + " dòng cho ngày " + searchDate + "!");
}

// =============================================================================
// SEND APPROVAL RESULTS (Menu version — with UI prompt)
// =============================================================================
function sendApprovalResults() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const mauBieu = ss.getSheetByName(CONFIG.SHEET_RESPONSES);
  const ui = SpreadsheetApp.getUi();
  if (!mauBieu) { ui.alert("Không tìm thấy tab!"); return; }
  const resp = ui.prompt(
    "📧 Gửi kết quả duyệt",
    "Nhập ngày họp (VD: 27/01):",
    ui.ButtonSet.OK_CANCEL);
  if (resp.getSelectedButton() !== ui.Button.OK) return;
  const searchDate = resp.getResponseText().trim();
  if (!searchDate) { ui.alert("Vui lòng nhập ngày họp!"); return; }
  const cols = CONFIG.COLUMN_MAP;
  const data = mauBieu.getDataRange().getValues();
  let sent = 0, skipped = 0, alreadySent = 0, failed = 0;
  const btcEmails = getBTCEmails();
  const details = [];
  const now = new Date();
  const timestamp = Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "dd/MM HH:mm");
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!matchNgayHop(row[cols.ngayHop], searchDate)) continue;
    const email = (row[cols.email] || "").toString().trim();
    const status = (row[cols.status] || "").toString().trim();
    const hoTen = toTitleCase(row[cols.hoTen]) || "N/A";
    const daGui = (row[cols.daGuiEmail] || "").toString().trim();
    if (daGui) {
      alreadySent++;
      details.push("Row " + (i + 1) + ": ⏭️ Đã gửi (" + hoTen + ")");
      continue;
    }
    if (!email || !isValidEmail(email)) { skipped++; continue; }
    if (!status || status === "Chờ duyệt") { skipped++; continue; }
    const emailInput = {
      hoTen,
      noiDung: row[cols.noiDung] || "",
      ngayHop: formatNgayHop(row[cols.ngayHop]),
      boPhan: row[cols.boPhan] || "",
      ghiChu: row[cols.ghiChu] || "",
    };
    let emailData;
    if (status === "Duyệt") emailData = buildEmailApproved(emailInput);
    else if (status === "Từ chối") emailData = buildEmailRejected(emailInput);
    else if (status === "Hoãn") emailData = buildEmailPostponed(emailInput);
    else { skipped++; continue; }

    let htmlBody = "";
    try {
      htmlBody = buildApprovalResultEmail(
        hoTen, emailInput.ngayHop, status, emailInput.noiDung, emailInput.ghiChu);
    } catch(te) { Logger.log("HTML template error: " + te.message); }

    const ccList = [...btcEmails.all];
    const emailLQ = row[cols.emailLienQuan];
    if (emailLQ)
      emailLQ.toString().split(/[,;\n]+/)
        .map((e) => e.trim().toLowerCase())
        .filter((e) => isValidEmail(e))
        .forEach((e) => ccList.push(e));
    if (sent > 0) Utilities.sleep(CONFIG.EMAIL_DELAY_MS);
    if (sendEmail({
      to: email,
      cc: [...new Set(ccList)].join(","),
      subject: emailData.subject,
      body: emailData.body,
      htmlBody: htmlBody
    })) {
      sent++;
      details.push("Row " + (i + 1) + ": ✔︎ → " + email);
      mauBieu.getRange(i + 1, cols.daGuiEmail + 1).setValue("✔︎ " + timestamp);
    } else {
      failed++;
      details.push("Row " + (i + 1) + ": ❌ → " + email);
    }
  }
  logEmailSend('approval_result', sent, 'Menu: ' + sent + ' sent, ' + alreadySent + ' skipped');
  if (sent === 0 && skipped === 0 && failed === 0 && alreadySent === 0) {
    ui.alert("Không tìm thấy đăng ký cho ngày " + searchDate + "!");
    return;
  }
  let summary = "📧 KẾT QUẢ GỬI EMAIL\n\n✔︎ Gửi mới: " + sent + "\n";
  if (alreadySent > 0) summary += "⏭️ Đã gửi trước: " + alreadySent + "\n";
  if (failed > 0) summary += "❌ Thất bại: " + failed + "\n";
  if (skipped > 0) summary += "⏭️ Bỏ qua: " + skipped + "\n";
  summary += "\n" + details.slice(0, 15).join("\n");
  if (alreadySent > 0) summary += '\n\n💡 Cần gửi lại? Dùng "Reset gửi email"';
  ui.alert(summary);
}

// =============================================================================
// TRIGGERS
// =============================================================================
function createTriggers() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ScriptApp.getProjectTriggers().forEach((t) => {
    if (["onFormSubmit", "onEditHandler"].includes(t.getHandlerFunction()))
      ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("onFormSubmit").forSpreadsheet(ss).onFormSubmit().create();
  ScriptApp.newTrigger("onEditHandler").forSpreadsheet(ss).onEdit().create();
  SpreadsheetApp.getUi().alert("✅ Đã tạo Triggers!");
}

function onFormSubmit(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_RESPONSES);
  if (!sheet) return;
  const cols = CONFIG.COLUMN_MAP;
  const lastRow = sheet.getLastRow();
  if (!sheet.getRange(lastRow, cols.status + 1).getValue())
    sheet.getRange(lastRow, cols.status + 1).setValue("Chờ duyệt");
  if (!sheet.getRange(lastRow, cols.thoiLuongChiDao + 1).getValue()) {
    const bp = sheet.getRange(lastRow, cols.boPhan + 1).getValue();
    sheet.getRange(lastRow, cols.thoiLuongChiDao + 1).setValue(getDefaultChiDaoTime(bp) + " phút");
  }
  const emailLQ = sheet.getRange(lastRow, cols.emailLienQuan + 1).getValue();
  if (emailLQ && emailLQ.toString().trim())
    sheet.getRange(lastRow, cols.tenLienQuan + 1).setValue(lookupNamesFromEmailList(emailLQ));
  sheet.getRange(lastRow, cols.hoTen + 1).setValue(
    toTitleCase(sheet.getRange(lastRow, cols.hoTen + 1).getValue()));
  try {
    const rowData = sheet.getRange(lastRow, 1, 1, sheet.getLastColumn()).getValues()[0];
    const emailData = buildEmailNewRegistration({
      hoTen: rowData[cols.hoTen] || "N/A",
      boPhan: rowData[cols.boPhan] || "N/A",
      noiDung: rowData[cols.noiDung] || "N/A",
      ngayHop: formatNgayHop(rowData[cols.ngayHop]) || "N/A",
      thoiLuong: rowData[cols.thoiLuong] || "N/A",
      sheetUrl: ss.getUrl(),
    });
    var ccList = [];
    try {
      var hosting = getBodHosting();
      if (hosting && hosting.email) ccList.push(hosting.email);
    } catch(he) {}
    sendEmail({
      to: getBTCEmails().all.join(","),
      cc: ccList.join(","),
      subject: emailData.subject,
      body: emailData.body,
      htmlBody: emailData.htmlBody,
    });
  } catch (e) {
    Logger.log("Notification error: " + e.message);
  }
}

function onEditHandler(e) {
  try {
    if (!e || !e.range) return;
    if (e.source.getActiveSheet().getName() === CONFIG.SHEET_RESPONSES)
      updateDashboardTimestamp();
  } catch (e) {}
}

function updateDashboardTimestamp() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_REVIEW);
    if (!sheet) return;
    sheet.getRange(CONFIG.DASHBOARD_TIMESTAMP_ROW, 5).setValue(
      "Cập nhật: " + Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "HH:mm:ss d/M/yyyy"));
  } catch (e) {}
}

// =============================================================================
// TEST FUNCTION
// =============================================================================
function testBODDashboard() {
  var log = [];
  var pass = 0, fail = 0;

  function ok(name, detail) { pass++; log.push("\u2705 " + name + (detail ? ": " + detail : "")); }
  function ng(name, detail) { fail++; log.push("\u274C " + name + ": " + detail); }

  // TEST 1: Đọc sheet Dim bộ phận
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var dimSheet = ss.getSheetByName(CONFIG.SHEET_DIM_DEPT);
    if (!dimSheet) throw new Error("Không tìm thấy sheet '" + CONFIG.SHEET_DIM_DEPT + "'");
    var dimData = dimSheet.getDataRange().getValues();
    var batBuoc = 0;
    for (var i = 0; i < dimData.length; i++) {
      if ((dimData[i][1] || "").toString().trim() === "Bắt buộc") batBuoc++;
    }
    if (batBuoc >= 8) ok("Dim bộ phận", batBuoc + " bộ phận bắt buộc");
    else ng("Dim bộ phận", "Chỉ có " + batBuoc + " bắt buộc (cần >= 8)");
  } catch (e) { ng("Dim bộ phận", e.message); }

  // TEST 2: getDeptRegistrationStatus
  try {
    var depts = getDeptRegistrationStatus("09/03");
    if (!depts || depts.length === 0) throw new Error("Trả về rỗng");
    var hasEmail = 0, hasContact = 0;
    var details = [];
    for (var i = 0; i < depts.length; i++) {
      var d = depts[i];
      if (d.email) hasEmail++;
      if (d.contact) hasContact++;
      details.push(d.name + "=" + (d.email || "(trống)") + "|" + (d.contact || "(trống)"));
    }
    if (hasEmail >= 8) ok("getDeptStatus", depts.length + " BP, " + hasEmail + " có email, " + hasContact + " có contact");
    else ng("getDeptStatus", "Chỉ " + hasEmail + "/" + depts.length + " có email. Chi tiết: " + details.join("; "));
  } catch (e) { ng("getDeptStatus", e.message); }

  // TEST 3: isJapanesePerson
  try {
    var t1 = isJapanesePerson("Satomura", "satomura@esuhai.com", "");
    var t2 = isJapanesePerson("Shimizu Hiroko", "shimizu@esuhai.com", "");
    var t3 = isJapanesePerson("Nguyễn Văn A", "nguyen@esuhai.com", "");
    if (t1 && t2 && !t3) ok("isJapanesePerson", "Satomura=true, Shimizu=true, Nguyễn=false");
    else ng("isJapanesePerson", "Satomura=" + t1 + " Shimizu=" + t2 + " Nguyễn=" + t3);
  } catch (e) { ng("isJapanesePerson", e.message); }

  // TEST 4: buildReminderEmail
  try {
    var html = buildReminderEmail("MSA", "Đặng Tiến Dũng", "10/03/2026", "", false);
    if (html && html.length > 500 && html.indexOf("BOD") >= 0 && html.indexOf("MSA") >= 0) {
      ok("buildReminderEmail", html.length + " chars, có BOD + MSA");
    } else {
      ng("buildReminderEmail", "HTML quá ngắn hoặc thiếu nội dung: " + (html ? html.length : 0) + " chars");
    }
  } catch (e) { ng("buildReminderEmail", e.message); }

  // TEST 5: Gửi email thật (tới anh Kha)
  try {
    var result = sendDeptReminderWeb("TEST-BOD", "hoangkha@esuhai.com", "10/03/2026", "Anh Kha (Test)", "");
    if (result && result.success) ok("sendDeptReminderWeb", result.msg);
    else ng("sendDeptReminderWeb", (result && result.msg) || "Không có response");
  } catch (e) { ng("sendDeptReminderWeb", e.message); }

  // TEST 6: MailApp quota check
  try {
    var remain = MailApp.getRemainingDailyQuota();
    if (remain > 0) ok("MailApp quota", remain + " email còn lại hôm nay");
    else ng("MailApp quota", "Hết quota! Không gửi được email");
  } catch (e) { ng("MailApp quota", e.message); }

  // KẾT QUẢ
  var summary = "\n" + "=".repeat(40) + "\n";
  summary += "TEST BOD DASHBOARD — " + new Date().toLocaleString("vi-VN") + "\n";
  summary += "=".repeat(40) + "\n";
  summary += log.join("\n") + "\n";
  summary += "-".repeat(40) + "\n";
  summary += "Kết quả: " + pass + " PASS / " + fail + " FAIL (tổng " + (pass + fail) + ")\n";
  if (fail === 0) summary += "\u2705 TẤT CẢ ĐỀU PASS!\n";
  else summary += "\u274C CÓ " + fail + " LỖI CẦN SỬA!\n";

  Logger.log(summary);
  SpreadsheetApp.getUi().alert(summary);
}
