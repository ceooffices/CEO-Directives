/**
 * ========================================================================
 * BOD REGISTRATION SYSTEM - VERSION 8.0
 * ========================================================================
 * Version: 8.0 (Clean Edition)
 * Updated: 02/03/2026
 * Based on: V7.8.2 by ClaudeK
 *
 * V8.0 CHANGES:
 * - Menu gon gang: 10 items (bo 7 function loi thoi/chay 1 lan)
 * - Them Dashboard Web (mobile-friendly)
 * - Them Refresh Dashboard (auto fix ngay + formulas)
 * - Xoa: setupColumnQ, setupNewColumns, fillDefaultChiDaoTime,
 *        repairDashboardFormulas, debugFormColumns, updateScheduleSummary
 *
 * CAU TRUC COT FORM DANG KY (A-Q):
 * A: Timestamp | B: Noi dung | C: Thoi luong | D: Can QD?
 * E: QD gi? | F: Tham gia | G: Email lien quan | H: Ngay hop
 * I: Ho Ten | J: Email | K: Bo phan | L: Trang thai
 * M: Thu tu | N: Ghi chu | O: TL chi dao | P: Ten lien quan
 * Q: Da gui email
 * ========================================================================
 */

const CONFIG = {
  SHEET_RESPONSES: "Form Đăng ký",
  SHEET_REVIEW: "Dashboard",
  SHEET_SCHEDULE: "Lịch trình",
  SHEET_DIM_DEPT: "Dim bộ phận",
  SHEET_CONFIG: "Cấu hình",
  SHEET_HR: "Nhân sự bắt buộc",
  HR_COL_DEPT: 4,    // Cột D = Phòng ban (1-indexed) — Sheet thực tế: A=STT, B=Mã NV, C=Tên, D=Phòng ban
  HR_COL_EMAIL: 6,   // Cột F = Email (1-indexed)
  HR_COL_NAME: 3,    // Cột C = Tên (1-indexed)
  BTC_FIXED: [
    "vynnl@esuhai.com",
    "minhhieu@esuhai.com",
    "dungntt@esuhai.com",
    "hoangkha@esuhai.com",
  ],
  BOD_HOSTING_DEFAULT: "letuan@esuhai.com",
  N8N_WEBHOOK_URL: "https://esuhai.app.n8n.cloud/webhook/bod-send-email",
  EMAIL_SENDER_NAME: "BTC MEETING BOD - ESUHAIGROUP",
  EMAIL_SENDER_ADDRESS: "",  // Để trống = gửi từ tài khoản chủ Script. Khi N8N sẵn sàng sẽ dùng ceo.offices@esuhai.com
  EMAIL_METHOD: "n8n",  // Gửi email qua N8N webhook. Fallback MailApp nếu N8N fail
  COLUMN_MAP: {
    timestamp: 0,
    noiDung: 1,
    thoiLuong: 2,
    canQuyetDinh: 3,
    quyetDinhGi: 4,
    thamGia: 5,
    emailLienQuan: 6,
    ngayHop: 7,
    hoTen: 8,
    email: 9,
    boPhan: 10,
    status: 11,
    thuTu: 12,
    ghiChu: 13,
    thoiLuongChiDao: 14,
    tenLienQuan: 15,
    daGuiEmail: 16,
  },
  DEFAULT_CHI_DAO_TIME: { MSA: 20, DEFAULT: 10 },
  SECRETARY_NAME: "BTC Meeting BOD",
  STATUS_DRAFT: "📝 BẢN NHÁP - Chờ xác nhận",
  STATUS_APPROVED: "✔︎ ĐÃ DUYỆT",
  AGENDA_START_ROW: 17,
  AGENDA_END_ROW: 28,
  AGENDA_HEADER_ROW: 16,
  AGENDA_SUMMARY_ROW: 19,
  AGENDA_DATE_CELL: "A8",
  DASHBOARD_TIMESTAMP_ROW: 36,
  EMAIL_DELAY_MS: 500,

  // ===== DANH SÁCH ĐẠI DIỆN BỘ PHẬN (SSOT — nguồn duy nhất) =====
  // Cập nhật bởi anh Kha 06/03/2026
  DEPT_CONTACTS: {
    "KOKA TEAM":  { email: "utsumi@esuhai.com",           contact: "Utsumi" },
    "IDS":        { email: "letuan@esuhai.com",            contact: "Lê Tuấn" },
    "MSA":        { email: "dungdt@esuhai.com",            contact: "Đặng Tiến Dũng" },
    "JPC":        { email: "xuanlanh@esuhai.com",          contact: "Xuân Lành" },
    "KAIZEN":     { email: "ngochan@kaizen.edu.vn",        contact: "Ngọc Hân",
                    cc: "anhthu@kaizen.edu.vn,thinhien@kaizen.edu.vn" },
    "ESUTECH":    { email: "satomura@esuhai.com",          contact: "Satomura",
                    cc: "masuda@esutech.vn" },
    "ESUWORKS":   { email: "viethm@esuhai.com",            contact: "Hoàng Minh Việt" },
    "PROSKILLS":  { email: "dangkhoa@proskills.ac.vn",      contact: "Đăng Khoa" },
    "ALESU":      { email: "thientin@esuhai.com",           contact: "Thiện Tín" },
  },
};

/**
 * Nạp đè cấu hình từ Sheet 'Settings' (do AdminPage quản lý) vào CONFIG.
 * Được gọi đầu mỗi hàm gửi email để đảm bảo cài đặt mới nhất từ AdminPage được áp dụng.
 * Format Sheet 'Settings': Cột A = Key (sys_*), Cột B = Value.
 */
function loadConfigFromSheet() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Settings");
    if (!sheet) return; // Nếu chưa có Sheet Settings, giữ nguyên giá trị mặc định
    var data = sheet.getDataRange().getValues();
    var mapping = {
      'sys_webhookUrl':    function(v) { if (v) CONFIG.N8N_WEBHOOK_URL    = v; },
      'sys_emailMethod':   function(v) { if (v) CONFIG.EMAIL_METHOD       = v; },
      'sys_senderName':    function(v) { if (v) CONFIG.EMAIL_SENDER_NAME  = v; },
      'sys_senderEmail':   function(v) { CONFIG.EMAIL_SENDER_ADDRESS = v; }, // Cho phép xóa trắng để bỏ alias
    };
    for (var i = 1; i < data.length; i++) {
      var key = (data[i][0] || '').toString().trim();
      var val = (data[i][1] !== undefined && data[i][1] !== null) ? data[i][1].toString().trim() : '';
      if (mapping[key]) mapping[key](val);
    }
  } catch(e) {
    Logger.log('loadConfigFromSheet error: ' + e.message);
  }
}



// =============================================================================
// MENU V8.5 - MINIMAL (Web Dashboard handles operations)
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
// HELPER FUNCTIONS
// =============================================================================
function isValidEmail(email) {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.toString().trim());
}

function getFormulaDelimiter() {
  const locale = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetLocale();
  return ["vi", "de", "fr", "es", "it", "pt", "nl", "pl", "ru"].some((l) =>
    locale.startsWith(l),
  )
    ? ";"
    : ",";
}

function columnToLetter(col) {
  let letter = "";
  while (col > 0) {
    const mod = (col - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    col = Math.floor((col - 1) / 26);
  }
  return letter;
}

function toTitleCase(str) {
  if (!str) return "";
  return str
    .toString()
    .toLowerCase()
    .replace(/(?:^|\s)\S/g, (c) => c.toUpperCase());
}

function formatNgayHop(value) {
  if (!value) return "";
  const str = value.toString();
  if (str.includes("Thứ") || str.includes("tuần")) return str;
  let date;
  if (value instanceof Date) {
    date = value;
  } else if (typeof value === "string") {
    const ddmmyyyy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (ddmmyyyy)
      date = new Date(
        parseInt(ddmmyyyy[3]),
        parseInt(ddmmyyyy[2]) - 1,
        parseInt(ddmmyyyy[1]),
      );
    else {
      const ddmm = str.match(/^(\d{1,2})\/(\d{1,2})$/);
      if (ddmm)
        date = new Date(
          new Date().getFullYear(),
          parseInt(ddmm[2]) - 1,
          parseInt(ddmm[1]),
        );
      else {
        date = new Date(value);
        if (isNaN(date.getTime())) return str;
      }
    }
  } else {
    date = new Date(value);
    if (isNaN(date.getTime())) return str;
  }
  const days = [
    "Chủ nhật",
    "Thứ 2",
    "Thứ 3",
    "Thứ 4",
    "Thứ 5",
    "Thứ 6",
    "Thứ 7",
  ];
  return (
    days[date.getDay()] +
    ", " +
    date.getDate().toString().padStart(2, "0") +
    "/" +
    (date.getMonth() + 1).toString().padStart(2, "0") +
    "/" +
    date.getFullYear()
  );
}

function extractSearchDate(value) {
  if (!value) return "";
  if (value instanceof Date)
    return (
      value.getDate().toString().padStart(2, "0") +
      "/" +
      (value.getMonth() + 1).toString().padStart(2, "0")
    );
  const match = value.toString().match(/(\d{1,2})\/(\d{1,2})/);
  return match
    ? match[1].padStart(2, "0") + "/" + match[2].padStart(2, "0")
    : "";
}

function matchNgayHop(ngayHopValue, searchStr) {
  if (!ngayHopValue || !searchStr) return false;
  const s = searchStr.trim();
  if (ngayHopValue instanceof Date) {
    const d =
      ngayHopValue.getDate().toString().padStart(2, "0") +
      "/" +
      (ngayHopValue.getMonth() + 1).toString().padStart(2, "0");
    return d === s || s.includes(d);
  }
  if (ngayHopValue.toString().includes(s)) return true;
  const ex = extractSearchDate(ngayHopValue);
  return ex && ex === s;
}

function formatTime(value) {
  if (!value) return "";
  if (value instanceof Date)
    return (
      value.getHours().toString().padStart(2, "0") +
      ":" +
      value.getMinutes().toString().padStart(2, "0")
    );
  const str = value.toString();
  if (/^\d{1,2}:\d{2}$/.test(str)) return str;
  const match = str.match(/(\d{1,2}):(\d{2})/);
  return match ? match[1].padStart(2, "0") + ":" + match[2] : str;
}

function formatThoiLuong(value) {
  if (!value) return "N/A";
  const str = value.toString().trim();
  if (str.toLowerCase().includes("phút")) return str;
  const num = parseInt(str);
  return !isNaN(num) ? num + " phút" : str;
}

function parseThoiLuong(value) {
  if (!value) return 0;
  const num = parseInt(value.toString().replace(/[^\d]/g, ""));
  return isNaN(num) ? 0 : num;
}

function getDefaultChiDaoTime(boPhan) {
  if (!boPhan) return CONFIG.DEFAULT_CHI_DAO_TIME["DEFAULT"];
  return (
    CONFIG.DEFAULT_CHI_DAO_TIME[boPhan.toString().toUpperCase().trim()] ||
    CONFIG.DEFAULT_CHI_DAO_TIME["DEFAULT"]
  );
}

function getNext4Mondays() {
  const mondays = [];
  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? 1 : day === 1 ? 7 : 8 - day;
  let date = new Date(today);
  date.setDate(today.getDate() + diff);
  for (let i = 0; i < 4; i++) {
    const d = date.getDate().toString().padStart(2, "0");
    const m = (date.getMonth() + 1).toString().padStart(2, "0");
    mondays.push({
      label: "Thứ 2, " + d + "/" + m + "/" + date.getFullYear(),
      search: d + "/" + m,
      date: new Date(date),
    });
    date.setDate(date.getDate() + 7);
  }
  return mondays;
}

function getDetailedStats(searchDate) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_RESPONSES);
  const result = {
    total: 0,
    approved: 0,
    rejected: 0,
    pending: 0,
    postponed: 0,
    items: [],
  };
  if (!sheet) return result;
  const cols = CONFIG.COLUMN_MAP;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!matchNgayHop(row[cols.ngayHop], searchDate)) continue;
    result.total++;
    const status = (row[cols.status] || "").toString().trim();
    if (status === "Duyệt") result.approved++;
    else if (status === "Từ chối") result.rejected++;
    else if (status === "Hoãn") result.postponed++;
    else result.pending++;
    result.items.push({
      rowIndex: i + 1,
      hoTen: row[cols.hoTen] || "N/A",
      boPhan: row[cols.boPhan] || "",
      noiDung: row[cols.noiDung] || "N/A",
      status: status || "Chờ duyệt",
    });
  }
  return result;
}

// =============================================================================
// HIGHLIGHT DASHBOARD
// =============================================================================
function highlightUpcomingWeekDashboard() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dashboard = ss.getSheetByName(CONFIG.SHEET_REVIEW);
  if (!dashboard) return;
  const today = new Date();
  const dayOfWeek = today.getDay();
  let targetMonday = new Date(today);
  if (dayOfWeek === 0) targetMonday.setDate(today.getDate() + 1);
  else if (dayOfWeek !== 1)
    targetMonday.setDate(today.getDate() + (8 - dayOfWeek));
  const td = targetMonday.getDate().toString().padStart(2, "0");
  const tm = (targetMonday.getMonth() + 1).toString().padStart(2, "0");
  const ty = targetMonday.getFullYear();
  const formats = [
    td + "/" + tm + "/" + ty,
    targetMonday.getDate() + "/" + tm + "/" + ty,
    td + "/" + tm,
    targetMonday.getDate() + "/" + (targetMonday.getMonth() + 1),
  ];
  for (let row = 8; row <= 11; row++) {
    dashboard
      .getRange(row, 1, 1, 6)
      .setBorder(
        true,
        true,
        true,
        true,
        true,
        true,
        "#D0D0D0",
        SpreadsheetApp.BorderStyle.SOLID,
      )
      .setBackground(null);
  }
  for (let row = 8; row <= 11; row++) {
    const val = dashboard.getRange(row, 1).getValue();
    if (!val) continue;
    const s = val.toString();
    for (const fmt of formats) {
      if (s.includes(fmt)) {
        dashboard
          .getRange(row, 1, 1, 6)
          .setBorder(
            true,
            true,
            true,
            true,
            true,
            true,
            "#FF0000",
            SpreadsheetApp.BorderStyle.SOLID_THICK,
          )
          .setBackground("#FFF8E1");
        return;
      }
    }
  }
}

// =============================================================================
// LOOKUP TEN TU EMAIL
// =============================================================================
function loadEmailToNameMap() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hrSheet = ss.getSheetByName(CONFIG.SHEET_HR);
  if (!hrSheet) return {};
  const lastRow = hrSheet.getLastRow();
  if (lastRow < 2) return {};
  const emailData = hrSheet
    .getRange(2, CONFIG.HR_COL_EMAIL, lastRow - 1, 1)
    .getValues();
  const nameData = hrSheet
    .getRange(2, CONFIG.HR_COL_NAME, lastRow - 1, 1)
    .getValues();
  const map = {};
  for (let i = 0; i < emailData.length; i++) {
    const e = (emailData[i][0] || "").toString().toLowerCase().trim();
    const n = (nameData[i][0] || "").toString().trim();
    if (e && n) map[e] = n;
  }
  return map;
}

function lookupNamesFromEmailList(emailList, emailToName) {
  if (!emailList) return "";
  if (!emailToName) emailToName = loadEmailToNameMap();
  const emails = emailList
    .toString()
    .split(/[,;\n]+/)
    .map((e) => e.trim())
    .filter((e) => e && e.includes("@"));
  if (emails.length === 0) return "";
  return emails.map((e) => emailToName[e.toLowerCase().trim()] || e).join(", ");
}

function updateAllRelatedNames() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_RESPONSES);
  const ui = SpreadsheetApp.getUi();
  if (!sheet) {
    ui.alert('Không tìm thấy tab "' + CONFIG.SHEET_RESPONSES + '"!');
    return;
  }
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    ui.alert("Chưa có dữ liệu!");
    return;
  }
  const cols = CONFIG.COLUMN_MAP;
  const emailToName = loadEmailToNameMap();
  if (Object.keys(emailToName).length === 0) {
    ui.alert("Không có dữ liệu HR!");
    return;
  }
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

// =============================================================================
// EMAIL ROUTER — TỰ ĐỘNG CHỌN METHOD (N8N hoặc Gmail)
// Pattern từ script Cam Kết 2026: gửi qua webhook → N8N xử lý
// =============================================================================

/**
 * Gửi email qua N8N Webhook (anti-spam, không giới hạn quota)
 * N8N workflow sẽ nhận payload và gửi email qua Microsoft Graph / SMTP
 * @param {object} payload - {to, cc, subject, body, htmlBody, senderName, type}
 * @returns {boolean}
 */
function sendViaWebhook(payload) {
  try {
    var webhookUrl = CONFIG.N8N_WEBHOOK_URL;
    if (!webhookUrl) {
      Logger.log("N8N webhook URL not configured, falling back to Gmail");
      return false;
    }
    var response = UrlFetchApp.fetch(webhookUrl, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });
    var code = response.getResponseCode();
    if (code >= 200 && code < 300) {
      Logger.log("N8N webhook OK: " + code + " - " + payload.to);
      return true;
    } else {
      Logger.log("N8N webhook error " + code + ": " + response.getContentText());
      return false;
    }
  } catch (e) {
    Logger.log("N8N webhook exception: " + e.message);
    return false;
  }
}

/**
 * Gửi email qua Gmail trực tiếp (fallback)
 */
function sendViaGmail(emailData) {
  try {
    var opts = {
      to: emailData.to,
      cc: emailData.cc || "",
      subject: emailData.subject,
      body: emailData.body,
      name: CONFIG.EMAIL_SENDER_NAME,
    };
    if (emailData.htmlBody) opts.htmlBody = emailData.htmlBody;
    if (CONFIG.EMAIL_SENDER_ADDRESS) opts.from = CONFIG.EMAIL_SENDER_ADDRESS;
    MailApp.sendEmail(opts);
    return true;
  } catch (e) {
    // Retry without 'from'
    try {
      MailApp.sendEmail({
        to: emailData.to,
        cc: emailData.cc || "",
        subject: emailData.subject,
        body: emailData.body,
        name: CONFIG.EMAIL_SENDER_NAME,
      });
      return true;
    } catch (e2) {
      Logger.log("Gmail send error: " + e2.message);
      return false;
    }
  }
}

function sendEmail(emailData) {
  if (!emailData.to || !isValidEmail(emailData.to.split(",")[0])) return false;

  // Route based on EMAIL_METHOD config
  if (CONFIG.EMAIL_METHOD === "n8n") {
    var payload = {
      to: emailData.to,
      cc: emailData.cc || "",
      subject: emailData.subject,
      body: emailData.body,
      htmlBody: emailData.htmlBody || "",
      senderName: CONFIG.EMAIL_SENDER_NAME,
      senderEmail: CONFIG.EMAIL_SENDER_ADDRESS || "",
      type: "bod_notification",
    };
    var ok = sendViaWebhook(payload);
    if (ok) return true;
    // Fallback to Gmail if N8N fails
    Logger.log("N8N failed, falling back to Gmail for: " + emailData.to);
  }
  return sendViaGmail(emailData);
}

function sendEmailWithAttachment(emailData, pdfBlob) {
  // Attachments always go via Gmail (N8N doesn't handle blob attachments easily)
  // Cần load config mới nhất từ AdminPage trước khi gửi
  loadConfigFromSheet();
  try {
    var opts = {
      to: emailData.to,
      cc: emailData.cc || '',
      subject: emailData.subject,
      body: emailData.body,
      attachments: [pdfBlob],
      name: CONFIG.EMAIL_SENDER_NAME,
    };
    // Chỉ thêm 'from' nếu EMAIL_SENDER_ADDRESS được cấu hình (không trống)
    if (CONFIG.EMAIL_SENDER_ADDRESS && CONFIG.EMAIL_SENDER_ADDRESS.length > 0) {
      opts.from = CONFIG.EMAIL_SENDER_ADDRESS;
    }
    MailApp.sendEmail(opts);
    return true;
  } catch (e) {
    Logger.log('Email with attachment (attempt 1 with alias) failed: ' + e.message);
    // Fallback: thử lại không có alias — luôn có quyền gửi bằng tài khoản chủ
    try {
      MailApp.sendEmail({
        to: emailData.to,
        cc: emailData.cc || '',
        subject: emailData.subject,
        body: emailData.body,
        attachments: [pdfBlob],
        name: CONFIG.EMAIL_SENDER_NAME,
      });
      Logger.log('Email with attachment sent successfully (fallback, no alias).');
      return true;
    } catch (e2) {
      Logger.log('Email with attachment (fallback) also failed: ' + e2.message);
      return false;
    }
  }
}
// =============================================================================
// SEND APPROVAL RESULTS (ANTI-SPAM)
// =============================================================================
function sendApprovalResults() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const mauBieu = ss.getSheetByName(CONFIG.SHEET_RESPONSES);
  const ui = SpreadsheetApp.getUi();
  if (!mauBieu) {
    ui.alert("Không tìm thấy tab!");
    return;
  }
  const resp = ui.prompt(
    "📧 Gửi kết quả duyệt",
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
  const data = mauBieu.getDataRange().getValues();
  let sent = 0,
    skipped = 0,
    alreadySent = 0,
    failed = 0;
  const btcEmails = getBTCEmails();
  const details = [];
  const now = new Date();
  const timestamp = Utilities.formatDate(
    now,
    "Asia/Ho_Chi_Minh",
    "dd/MM HH:mm",
  );
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
    if (!email || !isValidEmail(email)) {
      skipped++;
      continue;
    }
    if (!status || status === "Chờ duyệt") {
      skipped++;
      continue;
    }
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
    else {
      skipped++;
      continue;
    }
    const ccList = [...btcEmails.all];
    const emailLQ = row[cols.emailLienQuan];
    if (emailLQ)
      emailLQ
        .toString()
        .split(/[,;\n]+/)
        .map((e) => e.trim().toLowerCase())
        .filter((e) => isValidEmail(e))
        .forEach((e) => ccList.push(e));
    if (sent > 0) Utilities.sleep(CONFIG.EMAIL_DELAY_MS);
    if (
      sendEmail({
        to: email,
        cc: [...new Set(ccList)].join(","),
        subject: emailData.subject,
        body: emailData.body,
      })
    ) {
      sent++;
      details.push("Row " + (i + 1) + ": ✔︎ → " + email);
      mauBieu.getRange(i + 1, cols.daGuiEmail + 1).setValue("✔︎ " + timestamp);
    } else {
      failed++;
      details.push("Row " + (i + 1) + ": ❌ → " + email);
    }
  }
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
  ScriptApp.newTrigger("onFormSubmit")
    .forSpreadsheet(ss)
    .onFormSubmit()
    .create();
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
    sheet
      .getRange(lastRow, cols.thoiLuongChiDao + 1)
      .setValue(getDefaultChiDaoTime(bp) + " phút");
  }
  const emailLQ = sheet.getRange(lastRow, cols.emailLienQuan + 1).getValue();
  if (emailLQ && emailLQ.toString().trim())
    sheet
      .getRange(lastRow, cols.tenLienQuan + 1)
      .setValue(lookupNamesFromEmailList(emailLQ));
  sheet
    .getRange(lastRow, cols.hoTen + 1)
    .setValue(toTitleCase(sheet.getRange(lastRow, cols.hoTen + 1).getValue()));
  try {
    const rowData = sheet
      .getRange(lastRow, 1, 1, sheet.getLastColumn())
      .getValues()[0];
    const emailData = buildEmailNewRegistration({
      hoTen: rowData[cols.hoTen] || "N/A",
      boPhan: rowData[cols.boPhan] || "N/A",
      noiDung: rowData[cols.noiDung] || "N/A",
      ngayHop: formatNgayHop(rowData[cols.ngayHop]) || "N/A",
      thoiLuong: rowData[cols.thoiLuong] || "N/A",
      sheetUrl: ss.getUrl(),
    });
    sendEmail({
      to: getBTCEmails().all.join(","),
      subject: emailData.subject,
      body: emailData.body,
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
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(
      CONFIG.SHEET_REVIEW,
    );
    if (!sheet) return;
    sheet
      .getRange(CONFIG.DASHBOARD_TIMESTAMP_ROW, 5)
      .setValue(
        "Cập nhật: " +
          Utilities.formatDate(
            new Date(),
            "Asia/Ho_Chi_Minh",
            "HH:mm:ss d/M/yyyy",
          ),
      );
  } catch (e) {}
}

// =============================================================================
// SECRETARY APPROVE & SEND SCHEDULE
// =============================================================================
function getDetailedStatsWithDepts(searchDate) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_RESPONSES);
  const requiredDepts = [
    "KOKA TEAM",
    "IDS",
    "MSA",
    "JPC",
    "KAIZEN",
    "ALESU",
    "PROSKILLS",
    "ESUTECH",
    "ESUWORKS",
  ];
  const result = {
    total: 0,
    approved: 0,
    rejected: 0,
    pending: 0,
    postponed: 0,
    requiredDepts,
    requiredRegistered: [],
    requiredMissing: [],
    deptStats: {},
  };
  if (!sheet) return result;
  const cols = CONFIG.COLUMN_MAP;
  const data = sheet.getDataRange().getValues();
  const registered = new Set();
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!matchNgayHop(row[cols.ngayHop], searchDate)) continue;
    result.total++;
    const status = (row[cols.status] || "").toString().trim();
    const bp = (row[cols.boPhan] || "").toString().trim().toUpperCase();
    registered.add(bp);
    if (status === "Duyệt") result.approved++;
    else if (status === "Từ chối") result.rejected++;
    else if (status === "Hoãn") result.postponed++;
    else result.pending++;
    if (!result.deptStats[bp]) result.deptStats[bp] = { total: 0, approved: 0 };
    result.deptStats[bp].total++;
    if (status === "Duyệt") result.deptStats[bp].approved++;
  }
  requiredDepts.forEach((d) => {
    if (registered.has(d.toUpperCase()) || registered.has(d))
      result.requiredRegistered.push(d);
    else result.requiredMissing.push(d);
  });
  return result;
}

function secretaryApproveV78() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const scheduleSheet = ss.getSheetByName(CONFIG.SHEET_SCHEDULE);
  const ui = SpreadsheetApp.getUi();
  if (!scheduleSheet) {
    ui.alert("Không tìm thấy tab Lịch trình!");
    return;
  }
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
    "📅 " +
    ngayHopDisplay +
    "\n\n📊 Tổng: " +
    stats.total +
    " | Duyệt: " +
    stats.approved +
    " | Chờ: " +
    stats.pending +
    " | Từ chối/Hoãn: " +
    (stats.rejected + stats.postponed) +
    "\n\n";
  msg +=
    "🏢 Phòng ban bắt buộc: " +
    stats.requiredRegistered.length +
    "/" +
    stats.requiredDepts.length +
    "\n";
  if (stats.requiredMissing.length > 0)
    msg += "⚠️ Chưa đăng ký: " + stats.requiredMissing.join(", ") + "\n";
  msg += "\n[CÓ] → GỬI LỊCH TRÌNH\n[KHÔNG] → GỬI NHẮC NHỞ";
  const choice = ui.alert(
    "✔︎ XÁC NHẬN GỬI LỊCH TRÌNH",
    msg,
    ui.ButtonSet.YES_NO_CANCEL,
  );
  if (choice === ui.Button.YES) sendScheduleNow(scheduleSheet, stats);
  else if (choice === ui.Button.NO) {
    if (stats.requiredMissing.length === 0) {
      ui.alert("Đã đầy đủ!");
      return;
    }
    sendReminderToMissingDepts(stats.requiredMissing, ngayHopDisplay);
  }
}

function sendScheduleNow(scheduleSheet, stats) {
  const ui = SpreadsheetApp.getUi();
  try {
    const ts = Utilities.formatDate(
      new Date(),
      "Asia/Ho_Chi_Minh",
      "dd/MM/yyyy HH:mm",
    );
    scheduleSheet
      .getRange("A3")
      .setValue(
        CONFIG.STATUS_APPROVED + " bởi " + CONFIG.SECRETARY_NAME + " lúc " + ts,
      );
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
  if (!nhanSuSheet) {
    ui.alert('Không tìm thấy tab "Nhân sự bắt buộc"!');
    return;
  }
  const data = nhanSuSheet.getDataRange().getValues();
  const emailMap = {};
  for (let i = 1; i < data.length; i++) {
    const bp = (data[i][0] || "").toString().trim().toUpperCase();
    const email = (data[i][1] || "").toString().trim();
    if (bp && email && isValidEmail(email)) emailMap[bp] = email;
  }
  const toSend = [],
    withEmail = [],
    withoutEmail = [];
  missingDepts.forEach((d) => {
    if (emailMap[d.toUpperCase()]) {
      toSend.push(emailMap[d.toUpperCase()]);
      withEmail.push(d);
    } else withoutEmail.push(d);
  });
  if (toSend.length === 0) {
    ui.alert("Không tìm thấy email!");
    return;
  }
  let cfm = "Gửi nhắc nhở đến:\n";
  withEmail.forEach((d, i) => {
    cfm += "• " + d + ": " + toSend[i] + "\n";
  });
  if (ui.alert("📬 XÁC NHẬN", cfm, ui.ButtonSet.YES_NO) !== ui.Button.YES)
    return;
  try {
    const subject = "[NHẮC NHỞ] Đăng ký BOD - " + ngayHopDisplay;
    const body =
      "Kính gửi Anh/Chị,\n\nBộ phận của Anh/Chị CHƯA ĐĂNG KÝ báo cáo cho cuộc họp BOD.\n📅 Ngày họp: " +
      ngayHopDisplay +
      "\n⏰ 08:30\n\nVui lòng đăng ký sớm.\n\nTrân trọng,\nBan Thư ký Meeting BOD";
    let sentCount = 0;
    toSend.forEach((email, i) => {
      try {
        if (i > 0) Utilities.sleep(CONFIG.EMAIL_DELAY_MS);
        GmailApp.sendEmail(email, subject, body, {
          name: "BTC Meeting BOD",
          cc: "hoangkha@esuhai.com",
          from: CONFIG.EMAIL_SENDER_ADDRESS || undefined,
        });
        sentCount++;
      } catch (e) {}
    });
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
  const meetingCfg = getMeetingConfig();
  let agendaList = "";
  for (let i = CONFIG.AGENDA_START_ROW; i <= CONFIG.AGENDA_END_ROW; i++) {
    const content = scheduleSheet.getRange(i, 3).getValue();
    if (content && content.toString().trim()) {
      agendaList +=
        scheduleSheet.getRange(i, 1).getValue() +
        ". " +
        formatTime(scheduleSheet.getRange(i, 2).getValue()) +
        "  " +
        content +
        "\n   Trình bày: " +
        scheduleSheet.getRange(i, 4).getValue() +
        "\n\n";
    }
  }
  const cols = CONFIG.COLUMN_MAP;
  const data = mauBieu.getDataRange().getValues();
  const btcEmails = getBTCEmails();
  const emails = new Set(btcEmails.all.map((e) => e.toLowerCase()));
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (
      matchNgayHop(row[cols.ngayHop], searchDate) &&
      row[cols.status] === "Duyệt"
    ) {
      const e = (row[cols.email] || "").toString().trim().toLowerCase();
      if (isValidEmail(e)) emails.add(e);
      if (row[cols.emailLienQuan])
        row[cols.emailLienQuan]
          .toString()
          .split(/[,;\n]+/)
          .map((x) => x.trim().toLowerCase())
          .filter((x) => isValidEmail(x))
          .forEach((x) => emails.add(x));
    }
  }
  const exportUrl =
    "https://docs.google.com/spreadsheets/d/" +
    ss.getId() +
    "/export?format=pdf&size=A4&portrait=false&fitw=true&gridlines=false&printtitle=false&sheetnames=false&pagenumbers=false&fzr=false&gid=" +
    scheduleSheet.getSheetId();
  const pdfBlob = UrlFetchApp.fetch(exportUrl, {
    headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
  }).getBlob();
  pdfBlob.setName("Lich_trinh_BOD_" + searchDate.replace("/", "_") + ".pdf");
  const emailData = buildEmailSchedule({
    ngayHop: formatNgayHop(ngayHopRaw),
    gioHop: formatTime(meetingCfg.gioHop),
    diaDiem: meetingCfg.diaDiem,
    teamsLink: meetingCfg.teamsLink,
    agendaList: agendaList || "(Chưa có nội dung)\n",
  });
  sendEmailWithAttachment(
    {
      to: Array.from(emails).join(","),
      subject: emailData.subject,
      body: emailData.body,
    },
    pdfBlob,
  );
  return emails.size;
}

// =============================================================================
// REFRESH DASHBOARD V8.0
// =============================================================================
function refreshDashboard() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dashboard = ss.getSheetByName("Dashboard");
  const ui = SpreadsheetApp.getUi();
  if (!dashboard) {
    ui.alert("Không tìm thấy tab Dashboard!");
    return;
  }
  const mondays = getNext4MondaysFromToday();
  for (let i = 0; i < 4; i++) {
    const r = 8 + i,
      s = mondays[i].search;
    dashboard.getRange(r, 1).setValue(mondays[i].label);
    dashboard
      .getRange(r, 2)
      .setFormula(
        '=SUMPRODUCT((ISNUMBER(SEARCH("' +
          s +
          '";TEXT(\'Form Đăng ký\'!H:H;"DD/MM"))))*1)',
      );
    dashboard
      .getRange(r, 3)
      .setFormula(
        '=SUMPRODUCT((ISNUMBER(SEARCH("' +
          s +
          '";TEXT(\'Form Đăng ký\'!H:H;"DD/MM"))))*(\'Form Đăng ký\'!L:L="Duyệt")*1)',
      );
    dashboard
      .getRange(r, 4)
      .setFormula(
        '=SUMPRODUCT((ISNUMBER(SEARCH("' +
          s +
          '";TEXT(\'Form Đăng ký\'!H:H;"DD/MM"))))*(\'Form Đăng ký\'!L:L="Từ chối")*1)',
      );
    dashboard
      .getRange(r, 5)
      .setFormula(
        '=SUMPRODUCT((ISNUMBER(SEARCH("' +
          s +
          '";TEXT(\'Form Đăng ký\'!H:H;"DD/MM"))))*(\'Form Đăng ký\'!L:L="Hoãn")*1)',
      );
    dashboard
      .getRange(r, 6)
      .setFormula("=B" + r + "-C" + r + "-D" + r + "-E" + r);
  }
  dashboard
    .getRange(7, 1, 1, 6)
    .setValues([["Ngày họp", "Tổng", "Duyệt", "Từ chối", "Hoãn", "Chờ"]]);
  dashboard
    .getRange(14, 1, 1, 6)
    .setValues([["Bộ phận", "Tổng", "Duyệt", "Từ chối", "Hoãn", "Chờ"]]);
  refreshDeptStats(dashboard, mondays[0].search);
  dashboard
    .getRange(36, 5)
    .setValue(
      "Cập nhật: " +
        Utilities.formatDate(
          new Date(),
          "Asia/Ho_Chi_Minh",
          "HH:mm:ss d/M/yyyy",
        ),
    );
  try {
    highlightUpcomingWeekDashboard();
  } catch (e) {}
  ui.alert(
    "✅ Dashboard đã cập nhật!\n\n" +
      mondays.map((m) => "• " + m.label).join("\n"),
  );
}

function getNext4MondaysFromToday() {
  const mondays = [];
  const today = new Date();
  const day = today.getDay();
  let diff = day === 0 ? 1 : day === 1 ? 7 : 8 - day;
  let next = new Date(today);
  next.setDate(today.getDate() + diff);
  for (let i = 0; i < 4; i++) {
    const d = next.getDate().toString().padStart(2, "0");
    const m = (next.getMonth() + 1).toString().padStart(2, "0");
    mondays.push({
      label: "Thứ 2, " + d + "/" + m + "/" + next.getFullYear(),
      search: d + "/" + m,
      date: new Date(next),
    });
    next = new Date(next);
    next.setDate(next.getDate() + 7);
  }
  return mondays;
}

function refreshDeptStats(dashboard, searchStr) {
  const depts = {
    15: "BOD",
    16: "KOKA TEAM",
    17: "IDS",
    18: "MSA",
    19: "JPC",
    20: "KAIZEN",
    21: "BAN CỐ VẤN",
    22: "BAN ĐỐI NGOẠI",
    23: "HR",
    24: "TÀI CHÍNH KẾ TOÁN",
    25: "TỔNG HỢP",
    26: "ALESU",
    27: "PROSKILLS",
    28: "ESUTECH",
    29: "ESUWORKS",
    30: "ESUWELL",
    31: "PHÁP CHẾ",
    32: "BAN TRỢ LÝ",
    33: "GATE AWARDS",
  };
  for (const [rowStr, name] of Object.entries(depts)) {
    const r = parseInt(rowStr),
      u = name.toUpperCase();
    dashboard
      .getRange(r, 2)
      .setFormula(
        '=SUMPRODUCT((ISNUMBER(SEARCH("' +
          searchStr +
          "\";TEXT('Form Đăng ký'!H:H;\"DD/MM\"))))*(UPPER('Form Đăng ký'!K:K)=\"" +
          u +
          '")*1)',
      );
    dashboard
      .getRange(r, 3)
      .setFormula(
        '=SUMPRODUCT((ISNUMBER(SEARCH("' +
          searchStr +
          "\";TEXT('Form Đăng ký'!H:H;\"DD/MM\"))))*(UPPER('Form Đăng ký'!K:K)=\"" +
          u +
          '")*(\'Form Đăng ký\'!L:L="Duyệt")*1)',
      );
    dashboard
      .getRange(r, 4)
      .setFormula(
        '=SUMPRODUCT((ISNUMBER(SEARCH("' +
          searchStr +
          "\";TEXT('Form Đăng ký'!H:H;\"DD/MM\"))))*(UPPER('Form Đăng ký'!K:K)=\"" +
          u +
          '")*(\'Form Đăng ký\'!L:L="Từ chối")*1)',
      );
    dashboard
      .getRange(r, 5)
      .setFormula(
        '=SUMPRODUCT((ISNUMBER(SEARCH("' +
          searchStr +
          "\";TEXT('Form Đăng ký'!H:H;\"DD/MM\"))))*(UPPER('Form Đăng ký'!K:K)=\"" +
          u +
          '")*(\'Form Đăng ký\'!L:L="Hoãn")*1)',
      );
    dashboard
      .getRange(r, 6)
      .setFormula("=B" + r + "-C" + r + "-D" + r + "-E" + r);
  }
}

// =============================================================================
// TEST FUNCTION — Chạy từ menu "BOD Tools > Test toàn bộ CTA"
// Hoặc chạy trực tiếp: chọn hàm testBODDashboard() > Run
// =============================================================================
function testBODDashboard() {
  var log = [];
  var pass = 0, fail = 0;

  function ok(name, detail) { pass++; log.push("\u2705 " + name + (detail ? ": " + detail : "")); }
  function ng(name, detail) { fail++; log.push("\u274C " + name + ": " + detail); }

  // === TEST 1: Đọc sheet Dim bộ phận ===
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var dimSheet = ss.getSheetByName(CONFIG.SHEET_DIM_DEPT);
    if (!dimSheet) throw new Error("Không tìm thấy sheet '" + CONFIG.SHEET_DIM_DEPT + "'");
    var dimData = dimSheet.getDataRange().getValues();
    var batBuoc = 0;
    for (var i = 0; i < dimData.length; i++) {
      if ((dimData[i][1] || "").toString().trim() === "Bắt buộc") batBuoc++;
    }
    if (batBuoc >= 9) ok("Dim bộ phận", batBuoc + " bộ phận bắt buộc");
    else ng("Dim bộ phận", "Chỉ có " + batBuoc + " bắt buộc (cần >= 9)");
  } catch (e) { ng("Dim bộ phận", e.message); }

  // === TEST 2: getDeptRegistrationStatus ===
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
    if (hasEmail >= 9) ok("getDeptStatus", depts.length + " BP, " + hasEmail + " có email, " + hasContact + " có contact");
    else ng("getDeptStatus", "Chỉ " + hasEmail + "/" + depts.length + " có email. Chi tiết: " + details.join("; "));
  } catch (e) { ng("getDeptStatus", e.message); }

  // === TEST 3: isJapanesePerson ===
  try {
    var t1 = isJapanesePerson("Satomura", "satomura@esuhai.com", "");
    var t2 = isJapanesePerson("Shimizu Hiroko", "shimizu@esuhai.com", "");
    var t3 = isJapanesePerson("Nguyễn Văn A", "nguyen@esuhai.com", "");
    if (t1 && t2 && !t3) ok("isJapanesePerson", "Satomura=true, Shimizu=true, Nguyễn=false");
    else ng("isJapanesePerson", "Satomura=" + t1 + " Shimizu=" + t2 + " Nguyễn=" + t3);
  } catch (e) { ng("isJapanesePerson", e.message); }

  // === TEST 4: buildReminderEmail ===
  try {
    var html = buildReminderEmail("MSA", "Đặng Tiến Dũng", "10/03/2026", "", false);
    if (html && html.length > 500 && html.indexOf("BOD") >= 0 && html.indexOf("MSA") >= 0) {
      ok("buildReminderEmail", html.length + " chars, có BOD + MSA");
    } else {
      ng("buildReminderEmail", "HTML quá ngắn hoặc thiếu nội dung: " + (html ? html.length : 0) + " chars");
    }
  } catch (e) { ng("buildReminderEmail", e.message); }

  // === TEST 5: Gửi email thật (tới anh Kha) ===
  try {
    var result = sendDeptReminderWeb("TEST-BOD", "hoangkha@esuhai.com", "10/03/2026", "Anh Kha (Test)", "");
    if (result && result.success) ok("sendDeptReminderWeb", result.msg);
    else ng("sendDeptReminderWeb", (result && result.msg) || "Không có response");
  } catch (e) { ng("sendDeptReminderWeb", e.message); }

  // === TEST 6: MailApp quota check ===
  try {
    var remain = MailApp.getRemainingDailyQuota();
    if (remain > 0) ok("MailApp quota", remain + " email còn lại hôm nay");
    else ng("MailApp quota", "Hết quota! Không gửi được email");
  } catch (e) { ng("MailApp quota", e.message); }

  // === KẾT QUẢ ===
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
