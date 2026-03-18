/**
 * ========================================================================
 * v853_schedule.js — LỊCH TRÌNH & REFRESH DASHBOARD
 * ========================================================================
 * Tách từ Mã.js v8.0 — Chứa:
 * - generateSchedule: Tạo lịch trình từ đăng ký đã duyệt
 * - formatScheduleForPrint: Format cho in ấn
 * - secretaryApproveV78: Xác nhận & gửi lịch trình
 * - sendScheduleEmail: Gửi email lịch trình
 * - sendReminderToMissingDepts: Nhắc nhở bộ phận chưa đăng ký
 * - refreshDashboard: Cập nhật formulas Dashboard Sheet
 * ========================================================================
 */

// =============================================================================
// GENERATE SCHEDULE
// =============================================================================
function generateSchedule() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const mauBieu = ss.getSheetByName(CONFIG.SHEET_RESPONSES);
  const scheduleSheet = ss.getSheetByName(CONFIG.SHEET_SCHEDULE);
  const ui = SpreadsheetApp.getUi();
  if (!mauBieu || !scheduleSheet) {
    ui.alert("Không tìm thấy tab cần thiết!");
    return;
  }
  const cols = CONFIG.COLUMN_MAP;
  const mondays = getNext4Mondays();
  let selectedMonday = null;
  for (const m of mondays) {
    if (getDetailedStats(m.search).total > 0) {
      selectedMonday = m;
      break;
    }
  }
  if (!selectedMonday) {
    const resp = ui.prompt(
      "📅 Chọn ngày họp",
      "Không tìm thấy đăng ký cho 4 tuần tới.\nNhập ngày (VD: 19/01):",
      ui.ButtonSet.OK_CANCEL,
    );
    if (resp.getSelectedButton() !== ui.Button.OK) return;
    const input = resp.getResponseText().trim();
    if (!input) return;
    selectedMonday = { label: "Thứ 2, " + input, search: input };
  }
  const stats = getDetailedStats(selectedMonday.search);
  if (stats.total === 0) {
    ui.alert("Không có đăng ký nào cho ngày " + selectedMonday.label + "!");
    return;
  }
  if (stats.pending > 0) {
    if (
      ui.alert(
        "⚠️ Còn " + stats.pending + " đăng ký CHƯA DUYỆT",
        "Đã duyệt: " + stats.approved + "/" + stats.total + "\nTiếp tục?",
        ui.ButtonSet.YES_NO,
      ) !== ui.Button.YES
    )
      return;
  }
  if (stats.approved === 0) {
    ui.alert("Chưa có đăng ký nào được DUYỆT!");
    return;
  }
  const emailToName = loadEmailToNameMap();
  const data = mauBieu.getDataRange().getValues();
  const items = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const status = (row[cols.status] || "").toString().trim();
    if (
      matchNgayHop(row[cols.ngayHop], selectedMonday.search) &&
      status === "Duyệt"
    ) {
      const boPhan = row[cols.boPhan] || "";
      let tenLQ = row[cols.tenLienQuan] || "";
      if (!tenLQ && row[cols.emailLienQuan])
        tenLQ = lookupNamesFromEmailList(row[cols.emailLienQuan], emailToName);
      let tlTB = parseThoiLuong(row[cols.thoiLuong]);
      if (tlTB === 0) tlTB = 10;
      let tlCD = parseThoiLuong(row[cols.thoiLuongChiDao]);
      if (tlCD === 0) tlCD = getDefaultChiDaoTime(boPhan);
      items.push({
        thuTu: parseInt(row[cols.thuTu]) || 999,
        hoTen: toTitleCase(row[cols.hoTen] || ""),
        boPhan: boPhan,
        noiDung: row[cols.noiDung] || "",
        thoiLuong: tlTB,
        thoiLuongChiDao: tlCD,
        tenLienQuan: tenLQ,
      });
    }
  }
  items.sort((a, b) => a.thuTu - b.thuTu);
  scheduleSheet.getRange("A3").setValue(CONFIG.STATUS_DRAFT);
  scheduleSheet.getRange("A8").setValue(selectedMonday.label);
  scheduleSheet
    .getRange("A9")
    .setValue("📊 Đã duyệt: " + stats.approved + " / Tổng: " + stats.total);
  const colWidths = [30, 45, 300, 125, 45, 45, 190];
  colWidths.forEach((w, i) => scheduleSheet.setColumnWidth(i + 1, w));
  const headers = [
    "STT", "Giờ", "Nội dung báo cáo", "Người trình bày",
    "TL TB", "TL CĐ", "Thành viên liên quan",
  ];
  scheduleSheet
    .getRange(CONFIG.AGENDA_HEADER_ROW, 1, 1, 7)
    .setValues([headers])
    .setFontWeight("bold")
    .setFontSize(9)
    .setBackground("#4472C4")
    .setFontColor("#FFFFFF")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
  scheduleSheet.setRowHeight(CONFIG.AGENDA_HEADER_ROW, 22);
  let currentTime = 8 * 60 + 30;
  const maxItems = CONFIG.AGENDA_END_ROW - CONFIG.AGENDA_START_ROW + 1;
  for (let i = 0; i < maxItems; i++) {
    const rowNum = CONFIG.AGENDA_START_ROW + i;
    if (i < items.length) {
      const item = items[i];
      const time =
        String(Math.floor(currentTime / 60)).padStart(2, "0") +
        ":" +
        String(currentTime % 60).padStart(2, "0");
      scheduleSheet
        .getRange(rowNum, 1)
        .setFormula(
          "=IF(C" + rowNum + '<>"";ROW()-' + (CONFIG.AGENDA_START_ROW - 1) + ';"")');
      scheduleSheet
        .getRange(rowNum, 2, 1, 6)
        .setValues([[
          time,
          "[" + item.boPhan + "] " + item.noiDung,
          item.hoTen,
          item.thoiLuong + "'",
          item.thoiLuongChiDao + "'",
          item.tenLienQuan || "",
        ]]);
      scheduleSheet
        .getRange(rowNum, 1, 1, 7)
        .setFontSize(10)
        .setVerticalAlignment("middle")
        .setBackground("#FFFFFF")
        .setFontColor("#000000");
      scheduleSheet.getRange(rowNum, 2).setHorizontalAlignment("center");
      scheduleSheet.getRange(rowNum, 3).setWrap(true);
      scheduleSheet.getRange(rowNum, 5, 1, 2).setHorizontalAlignment("center");
      scheduleSheet.getRange(rowNum, 7).setWrap(true).setFontSize(8);
      scheduleSheet.setRowHeight(rowNum, 26);
      currentTime += item.thoiLuong + item.thoiLuongChiDao;
    } else {
      scheduleSheet
        .getRange(rowNum, 1)
        .setFormula(
          "=IF(C" + rowNum + '<>"";ROW()-' + (CONFIG.AGENDA_START_ROW - 1) + ';"")');
      scheduleSheet.getRange(rowNum, 2, 1, 6).clearContent();
      scheduleSheet.getRange(rowNum, 1, 1, 7).setBackground("#FFFFFF");
    }
  }
  setupPrintFormat(scheduleSheet);
  ss.setActiveSheet(scheduleSheet);
  const totalMin = items.reduce(
    (s, it) => s + it.thoiLuong + it.thoiLuongChiDao, 0);
  const endTime = 8 * 60 + 30 + totalMin;
  ui.alert(
    "✅ Đã tạo Lịch trình!\n📊 " + items.length + " nội dung\n⏱️ " +
      Math.floor(totalMin / 60) + "h " + (totalMin % 60) + "p\n🕐 Kết thúc: " +
      String(Math.floor(endTime / 60)).padStart(2, "0") + ":" +
      String(endTime % 60).padStart(2, "0"));
}

function formatScheduleForPrint() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_SCHEDULE);
  const ui = SpreadsheetApp.getUi();
  if (!sheet) { ui.alert("Không tìm thấy tab Lịch trình!"); return; }
  [30, 45, 300, 125, 45, 45, 190].forEach((w, i) => sheet.setColumnWidth(i + 1, w));
  sheet.getRange(CONFIG.AGENDA_HEADER_ROW, 1, 1, 7)
    .setFontSize(10).setFontWeight("bold").setHorizontalAlignment("center")
    .setVerticalAlignment("middle").setBackground("#4472C4").setFontColor("#FFFFFF");
  const rows = CONFIG.AGENDA_END_ROW - CONFIG.AGENDA_START_ROW + 1;
  sheet.getRange(CONFIG.AGENDA_START_ROW, 1, rows, 7)
    .setFontSize(9).setVerticalAlignment("middle").setBackground("#FFFFFF").setFontColor("#000000");
  sheet.getRange(CONFIG.AGENDA_START_ROW, 3, rows, 1).setWrap(true);
  sheet.getRange(CONFIG.AGENDA_START_ROW, 7, rows, 1).setWrap(true).setFontSize(8);
  sheet.getRange(CONFIG.AGENDA_START_ROW, 1, rows, 1).setHorizontalAlignment("left");
  sheet.getRange(CONFIG.AGENDA_START_ROW, 2, rows, 1).setHorizontalAlignment("center");
  sheet.getRange(CONFIG.AGENDA_START_ROW, 5, rows, 2).setHorizontalAlignment("center");
  const lastCol = sheet.getMaxColumns();
  if (lastCol > 7) sheet.hideColumns(8, lastCol - 7);
  ui.alert("✔︎ Đã format cho in ấn!");
}

function setupPrintFormat(sheet) {
  if (!sheet) return;
  try {
    [30, 45, 300, 125, 45, 45, 190].forEach((w, i) => sheet.setColumnWidth(i + 1, w));
    const lastCol = sheet.getMaxColumns();
    if (lastCol > 7) sheet.hideColumns(8, lastCol - 7);
  } catch (e) {}
}

// =============================================================================
// SECRETARY APPROVE & SEND SCHEDULE
// =============================================================================
function secretaryApproveV78() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const scheduleSheet = ss.getSheetByName(CONFIG.SHEET_SCHEDULE);
  const ui = SpreadsheetApp.getUi();
  if (!scheduleSheet) { ui.alert("Không tìm thấy tab Lịch trình!"); return; }
  const banner = scheduleSheet.getRange("A3").getValue();
  if (banner && banner.toString().includes("ĐÃ DUYỆT")) {
    ui.alert("Lịch trình đã được duyệt!\n" + banner);
    return;
  }
  const ngayHopRaw = scheduleSheet.getRange("A8").getValue();
  const ngayHopDisplay = formatNgayHop(ngayHopRaw);
  const searchDate = extractSearchDate(ngayHopRaw);
  const stats = getDetailedStatsWithDepts(searchDate);
  let msg =
    "📅 " + ngayHopDisplay +
    "\n\n📊 Tổng: " + stats.total + " | Duyệt: " + stats.approved +
    " | Chờ: " + stats.pending + " | Từ chối/Hoãn: " + (stats.rejected + stats.postponed) + "\n\n";
  msg += "🏢 Phòng ban bắt buộc: " + stats.requiredRegistered.length + "/" + stats.requiredDepts.length + "\n";
  if (stats.requiredMissing.length > 0)
    msg += "⚠️ Chưa đăng ký: " + stats.requiredMissing.join(", ") + "\n";
  msg += "\n[CÓ] → GỬI LỊCH TRÌNH\n[KHÔNG] → GỬI NHẮC NHỞ";
  const choice = ui.alert("✔︎ XÁC NHẬN GỬI LỊCH TRÌNH", msg, ui.ButtonSet.YES_NO_CANCEL);
  if (choice === ui.Button.YES) sendScheduleNow(scheduleSheet, stats);
  else if (choice === ui.Button.NO) {
    if (stats.requiredMissing.length === 0) { ui.alert("Đã đầy đủ!"); return; }
    sendReminderToMissingDepts(stats.requiredMissing, ngayHopDisplay);
  }
}

function sendScheduleNow(scheduleSheet, stats) {
  const ui = SpreadsheetApp.getUi();
  try {
    const ts = Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm");
    scheduleSheet.getRange("A3").setValue(
      CONFIG.STATUS_APPROVED + " bởi " + CONFIG.SECRETARY_NAME + " lúc " + ts);
    const count = sendScheduleEmail();
    ui.alert("✔︎ Đã xác nhận & gửi đến " + count + " người!");
  } catch (e) {
    ui.alert("❌ Lỗi: " + e.message);
  }
}

function sendReminderToMissingDepts(missingDepts, ngayHopDisplay) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  const nhanSuSheet = ss.getSheetByName("Nhân sự bắt buộc");
  if (!nhanSuSheet) { ui.alert('Không tìm thấy tab "Nhân sự bắt buộc"!'); return; }
  const data = nhanSuSheet.getDataRange().getValues();
  const emailMap = {};
  for (let i = 1; i < data.length; i++) {
    const bp = (data[i][0] || "").toString().trim().toUpperCase();
    const email = (data[i][1] || "").toString().trim();
    if (bp && email && isValidEmail(email)) emailMap[bp] = email;
  }
  const toSend = [], withEmail = [], withoutEmail = [];
  missingDepts.forEach((d) => {
    if (emailMap[d.toUpperCase()]) {
      toSend.push(emailMap[d.toUpperCase()]);
      withEmail.push(d);
    } else withoutEmail.push(d);
  });
  if (toSend.length === 0) { ui.alert("Không tìm thấy email!"); return; }
  let cfm = "Gửi nhắc nhở đến:\n";
  withEmail.forEach((d, i) => { cfm += "• " + d + ": " + toSend[i] + "\n"; });
  if (ui.alert("📬 XÁC NHẬN", cfm, ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  try {
    const btcEmails = getBTCEmails();
    const ccList = btcEmails.all.join(",");
    let sentCount = 0;
    toSend.forEach((email, i) => {
      try {
        if (i > 0) Utilities.sleep(CONFIG.EMAIL_DELAY_MS);
        const subject = "[NHẮC NHỞ] Đăng ký BOD - " + ngayHopDisplay;
        const plainBody =
          "Kính gửi Anh/Chị,\n\nBộ phận của Anh/Chị CHƯA ĐĂNG KÝ báo cáo cho cuộc họp BOD.\n📅 Ngày họp: " +
          ngayHopDisplay + "\n⏰ 08:30\n\nVui lòng đăng ký sớm.\n\nTrân trọng,\nBan Tổ Chức Meeting BOD";
        let htmlBody = "";
        try { htmlBody = buildReminderEmail(withEmail[i], "", ngayHopDisplay, "", false, 1); } catch(te) {}
        const sent = sendEmail({ to: email, cc: ccList, subject: subject, body: plainBody, htmlBody: htmlBody });
        if (sent) sentCount++;
      } catch (e) {}
    });
    logEmailSend('reminder', sentCount, withEmail.join(', '));
    ui.alert("✔︎ Đã gửi " + sentCount + "/" + toSend.length + " email!");
  } catch (e) {
    ui.alert("❌ Lỗi: " + e.message);
  }
}

function sendScheduleEmail() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const scheduleSheet = ss.getSheetByName(CONFIG.SHEET_SCHEDULE);
  const mauBieu = ss.getSheetByName(CONFIG.SHEET_RESPONSES);
  const ngayHopRaw = scheduleSheet.getRange("A8").getValue();
  const searchDate = extractSearchDate(ngayHopRaw);
  const displayDate = formatNgayHop(ngayHopRaw);

  const items = [];
  for (let i = CONFIG.AGENDA_START_ROW; i <= CONFIG.AGENDA_END_ROW; i++) {
    const content = scheduleSheet.getRange(i, 3).getValue();
    if (content && content.toString().trim()) {
      const presenter = (scheduleSheet.getRange(i, 4).getValue() || "").toString();
      const tlTB = parseInt(scheduleSheet.getRange(i, 5).getValue()) || 10;
      const tlCD = parseInt(scheduleSheet.getRange(i, 6).getValue()) || 10;
      const contentStr = content.toString();
      const deptMatch = contentStr.match(/^\[([^\]]+)\]/);
      const dept = deptMatch ? deptMatch[1] : "";
      items.push({
        stt: scheduleSheet.getRange(i, 1).getValue(),
        time: formatTime(scheduleSheet.getRange(i, 2).getValue()),
        content: contentStr,
        presenter: presenter,
        dept: dept,
        tlTB: tlTB,
        tlCD: tlCD
      });
    }
  }

  const cols = CONFIG.COLUMN_MAP;
  const data = mauBieu.getDataRange().getValues();
  const btcEmails = getBTCEmails();
  const emails = new Set(btcEmails.all.map((e) => e.toLowerCase()));
  emails.add("leson@esuhai.com");
  try {
    var hosting = getBodHosting();
    if (hosting && hosting.email) emails.add(hosting.email.toLowerCase());
  } catch(he) {}
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (matchNgayHop(row[cols.ngayHop], searchDate) && row[cols.status] === "Duyệt") {
      const e = (row[cols.email] || "").toString().trim().toLowerCase();
      if (isValidEmail(e)) emails.add(e);
      if (row[cols.emailLienQuan])
        row[cols.emailLienQuan].toString().split(/[,;\n]+/)
          .map((x) => x.trim().toLowerCase())
          .filter((x) => isValidEmail(x))
          .forEach((x) => emails.add(x));
    }
  }

  const htmlBody = buildScheduleEmail(displayDate, items);

  let plainBody = "LỊCH TRÌNH CUỘC HỌP BOD — " + displayDate + "\n\n";
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    plainBody += it.stt + ". " + it.time + " — " + it.content + " (" + it.presenter + ")\n";
  }
  plainBody += "\n---\nBTC Meeting BOD — ESUHAI GROUP";

  const subject = "[BOD Meeting] Lịch trình cuộc họp — " + displayDate + " / 議事スケジュール";

  sendEmail({
    to: Array.from(emails).join(","),
    subject: subject,
    body: plainBody,
    htmlBody: htmlBody
  });

  logEmailSend('schedule', 1, displayDate + ' → ' + emails.size + ' recipients');
  return emails.size;
}

// =============================================================================
// REFRESH DASHBOARD (Sheet formulas)
// =============================================================================
function refreshDashboard() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dashboard = ss.getSheetByName("Dashboard");
  const ui = SpreadsheetApp.getUi();
  if (!dashboard) { ui.alert("Không tìm thấy tab Dashboard!"); return; }
  const mondays = getNext4MondaysFromToday();
  for (let i = 0; i < 4; i++) {
    const r = 8 + i, s = mondays[i].search;
    dashboard.getRange(r, 1).setValue(mondays[i].label);
    dashboard.getRange(r, 2).setFormula(
      '=SUMPRODUCT((ISNUMBER(SEARCH("' + s + '";TEXT(\'Form Đăng ký\'!H:H;"DD/MM"))))*1)');
    dashboard.getRange(r, 3).setFormula(
      '=SUMPRODUCT((ISNUMBER(SEARCH("' + s + '";TEXT(\'Form Đăng ký\'!H:H;"DD/MM"))))*(' + "'Form Đăng ký'!L:L=\"Duyệt\")*1)");
    dashboard.getRange(r, 4).setFormula(
      '=SUMPRODUCT((ISNUMBER(SEARCH("' + s + '";TEXT(\'Form Đăng ký\'!H:H;"DD/MM"))))*(' + "'Form Đăng ký'!L:L=\"Từ chối\")*1)");
    dashboard.getRange(r, 5).setFormula(
      '=SUMPRODUCT((ISNUMBER(SEARCH("' + s + '";TEXT(\'Form Đăng ký\'!H:H;"DD/MM"))))*(' + "'Form Đăng ký'!L:L=\"Hoãn\")*1)");
    dashboard.getRange(r, 6).setFormula("=B" + r + "-C" + r + "-D" + r + "-E" + r);
  }
  dashboard.getRange(7, 1, 1, 6).setValues([["Ngày họp", "Tổng", "Duyệt", "Từ chối", "Hoãn", "Chờ"]]);
  dashboard.getRange(14, 1, 1, 6).setValues([["Bộ phận", "Tổng", "Duyệt", "Từ chối", "Hoãn", "Chờ"]]);
  refreshDeptStats(dashboard, mondays[0].search);
  dashboard.getRange(36, 5).setValue(
    "Cập nhật: " + Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "HH:mm:ss d/M/yyyy"));
  try { highlightUpcomingWeekDashboard(); } catch (e) {}
  ui.alert("✅ Dashboard đã cập nhật!\n\n" + mondays.map((m) => "• " + m.label).join("\n"));
}

function refreshDeptStats(dashboard, searchStr) {
  const depts = {
    15: "BOD", 16: "KOKA TEAM", 17: "IDS", 18: "MSA",
    19: "JPC", 20: "KAIZEN", 21: "BAN CỐ VẤN", 22: "BAN ĐỐI NGOẠI",
    23: "HR", 24: "TÀI CHÍNH KẾ TOÁN", 25: "TỔNG HỢP", 26: "ALESU",
    27: "PROSKILLS", 28: "ESUTECH", 29: "ESUWORKS", 30: "ESUWELL",
    31: "PHÁP CHẾ", 32: "BAN TRỢ LÝ", 33: "GATE AWARDS",
  };
  for (const [rowStr, name] of Object.entries(depts)) {
    const r = parseInt(rowStr), u = name.toUpperCase();
    dashboard.getRange(r, 2).setFormula(
      '=SUMPRODUCT((ISNUMBER(SEARCH("' + searchStr +
      '";TEXT(\'Form Đăng ký\'!H:H;"DD/MM"))))*(UPPER(\'Form Đăng ký\'!K:K)="' + u + '")*1)');
    dashboard.getRange(r, 3).setFormula(
      '=SUMPRODUCT((ISNUMBER(SEARCH("' + searchStr +
      '";TEXT(\'Form Đăng ký\'!H:H;"DD/MM"))))*(UPPER(\'Form Đăng ký\'!K:K)="' + u +
      '")*(' + "'Form Đăng ký'!L:L=\"Duyệt\")*1)");
    dashboard.getRange(r, 4).setFormula(
      '=SUMPRODUCT((ISNUMBER(SEARCH("' + searchStr +
      '";TEXT(\'Form Đăng ký\'!H:H;"DD/MM"))))*(UPPER(\'Form Đăng ký\'!K:K)="' + u +
      '")*(' + "'Form Đăng ký'!L:L=\"Từ chối\")*1)");
    dashboard.getRange(r, 5).setFormula(
      '=SUMPRODUCT((ISNUMBER(SEARCH("' + searchStr +
      '";TEXT(\'Form Đăng ký\'!H:H;"DD/MM"))))*(UPPER(\'Form Đăng ký\'!K:K)="' + u +
      '")*(' + "'Form Đăng ký'!L:L=\"Hoãn\")*1)");
    dashboard.getRange(r, 6).setFormula("=B" + r + "-C" + r + "-D" + r + "-E" + r);
  }
}
