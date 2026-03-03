// =============================================================================
// EMAIL VALIDATION & RESET
// =============================================================================
function checkInvalidEmails() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_RESPONSES);
  const ui = SpreadsheetApp.getUi();
  if (!sheet) {
    ui.alert("Không tìm thấy tab!");
    return;
  }
  const cols = CONFIG.COLUMN_MAP;
  const data = sheet.getDataRange().getValues();
  const invalid = [];
  for (let i = 1; i < data.length; i++) {
    const email = (data[i][cols.email] || "").toString().trim();
    if (email && !isValidEmail(email)) {
      invalid.push(
        "Row " +
          (i + 1) +
          ": " +
          (data[i][cols.hoTen] || "N/A") +
          ' → "' +
          email +
          '"',
      );
    }
  }
  ui.alert(
    invalid.length === 0
      ? "✔︎ Tất cả email đều hợp lệ!"
      : "⚠️ " +
          invalid.length +
          " email không hợp lệ:\n\n" +
          invalid.join("\n"),
  );
}

function resetEmailSentStatus() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_RESPONSES);
  const ui = SpreadsheetApp.getUi();
  if (!sheet) {
    ui.alert("Không tìm thấy tab!");
    return;
  }
  const resp = ui.prompt(
    "🔄 Reset trạng thái gửi email",
    "Nhập ngày họp (VD: 27/01):",
    ui.ButtonSet.OK_CANCEL,
  );
  if (resp.getSelectedButton() !== ui.Button.OK) return;
  const searchDate = resp.getResponseText().trim();
  if (!searchDate) {
    ui.alert("Vui lòng nhập ngày họp!");
    return;
  }
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
      : "✔︎ Đã reset " + count + " dòng cho ngày " + searchDate + "!",
  );
}

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
    "STT",
    "Giờ",
    "Nội dung báo cáo",
    "Người trình bày",
    "TL TB",
    "TL CĐ",
    "Thành viên liên quan",
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
          "=IF(C" +
            rowNum +
            '<>"";ROW()-' +
            (CONFIG.AGENDA_START_ROW - 1) +
            ';"")',
        );
      scheduleSheet
        .getRange(rowNum, 2, 1, 6)
        .setValues([
          [
            time,
            "[" + item.boPhan + "] " + item.noiDung,
            item.hoTen,
            item.thoiLuong + "'",
            item.thoiLuongChiDao + "'",
            item.tenLienQuan || "",
          ],
        ]);
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
          "=IF(C" +
            rowNum +
            '<>"";ROW()-' +
            (CONFIG.AGENDA_START_ROW - 1) +
            ';"")',
        );
      scheduleSheet.getRange(rowNum, 2, 1, 6).clearContent();
      scheduleSheet.getRange(rowNum, 1, 1, 7).setBackground("#FFFFFF");
    }
  }
  setupPrintFormat(scheduleSheet);
  ss.setActiveSheet(scheduleSheet);
  const totalMin = items.reduce(
    (s, it) => s + it.thoiLuong + it.thoiLuongChiDao,
    0,
  );
  const endTime = 8 * 60 + 30 + totalMin;
  ui.alert(
    "✅ Đã tạo Lịch trình!\n📊 " +
      items.length +
      " nội dung\n⏱️ " +
      Math.floor(totalMin / 60) +
      "h " +
      (totalMin % 60) +
      "p\n🕐 Kết thúc: " +
      String(Math.floor(endTime / 60)).padStart(2, "0") +
      ":" +
      String(endTime % 60).padStart(2, "0"),
  );
}

function formatScheduleForPrint() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_SCHEDULE);
  const ui = SpreadsheetApp.getUi();
  if (!sheet) {
    ui.alert("Không tìm thấy tab Lịch trình!");
    return;
  }
  [30, 45, 300, 125, 45, 45, 190].forEach((w, i) =>
    sheet.setColumnWidth(i + 1, w),
  );
  sheet
    .getRange(CONFIG.AGENDA_HEADER_ROW, 1, 1, 7)
    .setFontSize(10)
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setBackground("#4472C4")
    .setFontColor("#FFFFFF");
  const rows = CONFIG.AGENDA_END_ROW - CONFIG.AGENDA_START_ROW + 1;
  sheet
    .getRange(CONFIG.AGENDA_START_ROW, 1, rows, 7)
    .setFontSize(9)
    .setVerticalAlignment("middle")
    .setBackground("#FFFFFF")
    .setFontColor("#000000");
  sheet.getRange(CONFIG.AGENDA_START_ROW, 3, rows, 1).setWrap(true);
  sheet
    .getRange(CONFIG.AGENDA_START_ROW, 7, rows, 1)
    .setWrap(true)
    .setFontSize(8);
  sheet
    .getRange(CONFIG.AGENDA_START_ROW, 1, rows, 1)
    .setHorizontalAlignment("left");
  sheet
    .getRange(CONFIG.AGENDA_START_ROW, 2, rows, 1)
    .setHorizontalAlignment("center");
  sheet
    .getRange(CONFIG.AGENDA_START_ROW, 5, rows, 2)
    .setHorizontalAlignment("center");
  const lastCol = sheet.getMaxColumns();
  if (lastCol > 7) sheet.hideColumns(8, lastCol - 7);
  ui.alert("✔︎ Đã format cho in ấn!");
}

function setupPrintFormat(sheet) {
  if (!sheet) return;
  try {
    [30, 45, 300, 125, 45, 45, 190].forEach((w, i) =>
      sheet.setColumnWidth(i + 1, w),
    );
    const lastCol = sheet.getMaxColumns();
    if (lastCol > 7) sheet.hideColumns(8, lastCol - 7);
  } catch (e) {}
}

// =============================================================================
// EMAIL CONFIG & TEMPLATES
// =============================================================================
function getBTCEmails() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const configSheet = ss.getSheetByName(CONFIG.SHEET_CONFIG);
  if (!configSheet)
    return {
      btcFixed: CONFIG.BTC_FIXED,
      bodHosting: CONFIG.BOD_HOSTING_DEFAULT,
      all: [...CONFIG.BTC_FIXED, CONFIG.BOD_HOSTING_DEFAULT],
    };
  const data = configSheet.getDataRange().getValues();
  let btcFixed = [],
    bodHosting = "";
  for (let i = 0; i < data.length; i++) {
    const c1 = (data[i][0] || "").toString().trim().toLowerCase();
    const c2 = (data[i][1] || "").toString().trim();
    if (c1.includes("btc email"))
      btcFixed = c2.split(/[,;\s]+/).filter((e) => e.includes("@"));
    if (c1.includes("bod hosting")) {
      const m = c2.match(/[\w.-]+@[\w.-]+\.[a-z]{2,}/i);
      if (m) bodHosting = m[0];
    }
  }
  if (btcFixed.length === 0) btcFixed = [...CONFIG.BTC_FIXED];
  if (!bodHosting) bodHosting = CONFIG.BOD_HOSTING_DEFAULT;
  return { btcFixed, bodHosting, all: [...new Set([...btcFixed, bodHosting])] };
}

function getMeetingConfig() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const configSheet = ss.getSheetByName(CONFIG.SHEET_CONFIG);
  const cfg = {
    teamsLink: "",
    gioHop: "08:30",
    diaDiem: "Hội trường / MS Teams",
  };
  if (!configSheet) return cfg;
  const data = configSheet.getDataRange().getValues();
  for (let i = 0; i < data.length; i++) {
    const c1 = (data[i][0] || "").toString().trim().toLowerCase();
    const c2 = (data[i][1] || "").toString().trim();
    if (c1.includes("link teams") && c2) cfg.teamsLink = c2;
    if (c1.includes("giờ họp") || c1.includes("gio hop"))
      cfg.gioHop = c2 || cfg.gioHop;
    if (c1.includes("địa điểm") || c1.includes("dia diem"))
      cfg.diaDiem = c2 || cfg.diaDiem;
  }
  return cfg;
}

function buildEmailNewRegistration(data) {
  const tl = formatThoiLuong(data.thoiLuong);
  return {
    subject:
      "[Đăng ký BOD mới / BOD新規登録] " + data.boPhan + " - " + data.hoTen,
    body:
      "Kính gửi Ban Tổ Chức,\n各位へ、\n\nCó đăng ký báo cáo BOD mới cần được xem xét.\nBOD報告の新規登録がありますのでご確認ください。\n\n────────────────────────────────────\nTHÔNG TIN ĐĂNG KÝ / 登録情報\n────────────────────────────────────\nNgười đăng ký: " +
      data.hoTen +
      "\nBộ phận: " +
      data.boPhan +
      "\nNội dung: " +
      data.noiDung +
      "\nNgày họp: " +
      data.ngayHop +
      "\nThời lượng: " +
      tl +
      "\n────────────────────────────────────\n\nLink: " +
      data.sheetUrl +
      "\n\nTrân trọng,\nHệ thống Đăng ký BOD - ESUHAI GROUP",
  };
}

function buildEmailApproved(data) {
  return {
    subject: "[Kết quả BOD] ✅ " + data.noiDung.substring(0, 30),
    body:
      "Kính gửi " +
      data.hoTen +
      ",\n\n────────────────────────────────────\nNội dung: " +
      data.noiDung +
      "\nNgày họp: " +
      data.ngayHop +
      "\nBộ phận: " +
      data.boPhan +
      "\n────────────────────────────────────\n\nKẾT QUẢ: ✅ ĐÃ ĐƯỢC DUYỆT / 承認済み\n\nVui lòng chuẩn bị nội dung trình bày.\nLịch trình chính thức sẽ được gửi trước ngày họp.\n\nTrân trọng,\nBan Tổ Chức Meeting BOD\nESUHAI GROUP",
  };
}

function buildEmailRejected(data) {
  return {
    subject: "[Kết quả BOD] ❌ " + data.noiDung.substring(0, 30),
    body:
      "Kính gửi " +
      data.hoTen +
      ",\n\n────────────────────────────────────\nNội dung: " +
      data.noiDung +
      "\nNgày họp: " +
      data.ngayHop +
      "\nBộ phận: " +
      data.boPhan +
      "\n────────────────────────────────────\n\nKẾT QUẢ: ❌ CHƯA ĐƯỢC DUYỆT\nLý do: " +
      (data.ghiChu || "(Không có ghi chú)") +
      "\n\nTrân trọng,\nBan Tổ Chức Meeting BOD\nESUHAI GROUP",
  };
}

function buildEmailPostponed(data) {
  return {
    subject: "[Kết quả BOD] ⏸️ " + data.noiDung.substring(0, 30),
    body:
      "Kính gửi " +
      data.hoTen +
      ",\n\n────────────────────────────────────\nNội dung: " +
      data.noiDung +
      "\nNgày họp: " +
      data.ngayHop +
      "\nBộ phận: " +
      data.boPhan +
      "\n────────────────────────────────────\n\nKẾT QUẢ: ⏸️ TẠM HOÃN\nLý do: " +
      (data.ghiChu || "(Không có ghi chú)") +
      "\n\nNội dung sẽ được xem xét cho kỳ họp tiếp theo.\n\nTrân trọng,\nBan Tổ Chức Meeting BOD\nESUHAI GROUP",
  };
}

function buildEmailSchedule(data) {
  const teamsInfo = data.teamsLink
    ? "Link Teams: " + data.teamsLink + "\n"
    : "";
  return {
    subject: "[Lịch trình BOD / BODスケジュール] " + data.ngayHop,
    body:
      "Kính gửi Quý Anh/Chị,\n\nLịch trình họp Ban Quản Trị đã được xác nhận.\n\n════════════════════════════════════\nNgày họp: " +
      data.ngayHop +
      "\nGiờ họp: " +
      data.gioHop +
      "\nĐịa điểm: " +
      data.diaDiem +
      "\n" +
      teamsInfo +
      "════════════════════════════════════\n\nNỘI DUNG:\n────────────────────────────────────\n" +
      data.agendaList +
      "────────────────────────────────────\n\nChi tiết xem file đính kèm.\n\nTrân trọng,\nBan Tổ Chức Meeting BOD\nESUHAI GROUP",
  };
}

function sendEmail(emailData) {
  try {
    if (!emailData.to || !isValidEmail(emailData.to.split(",")[0]))
      return false;
    MailApp.sendEmail({
      to: emailData.to,
      cc: emailData.cc || "",
      subject: emailData.subject,
      body: emailData.body,
      name: CONFIG.EMAIL_SENDER_NAME,
    });
    return true;
  } catch (e) {
    Logger.log("Email error: " + e.message);
    return false;
  }
}

function sendEmailWithAttachment(emailData, pdfBlob) {
  try {
    MailApp.sendEmail({
      to: emailData.to,
      cc: emailData.cc || "",
      subject: emailData.subject,
      body: emailData.body,
      attachments: [pdfBlob],
      name: CONFIG.EMAIL_SENDER_NAME,
    });
    return true;
  } catch (e) {
    Logger.log("Email attachment error: " + e.message);
    return false;
  }
}
