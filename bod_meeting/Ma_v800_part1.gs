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
  HR_COL_EMAIL: 6,
  HR_COL_NAME: 3,
  BTC_FIXED: [
    "vynnl@esuhai.com",
    "minhhieu@esuhai.com",
    "dungntt@esuhai.com",
    "hoangkha@esuhai.com",
  ],
  BOD_HOSTING_DEFAULT: "trucly@esuhai.com",
  N8N_WEBHOOK_URL: "https://esuhai.app.n8n.cloud/webhook/bod-send-email",
  EMAIL_SENDER_NAME: "BTC MEETING BOD - ESUHAIGROUP",
  EMAIL_SENDER_ADDRESS: "ceo.offices@esuhai.com",
  EMAIL_METHOD: "gmail",
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
};

// =============================================================================
// MENU V8.0 - CLEAN
// =============================================================================
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("🔧 BOD Tools")
    .addItem("📊 Dashboard (Sheets)", "goToDashboard")
    .addItem("🌐 Dashboard (Web)", "showDashboardDialog")
    .addItem("🔄 Refresh Dashboard", "refreshDashboard")
    .addSeparator()
    .addItem("📋 Tạo Lịch trình", "generateSchedule")
    .addItem("🖨️ Format in ấn", "formatScheduleForPrint")
    .addSeparator()
    .addItem("📬 Gửi kết quả duyệt", "sendApprovalResults")
    .addItem("✔︎ XÁC NHẬN & GỬI LỊCH TRÌNH", "secretaryApproveV78")
    .addSeparator()
    .addItem("🔄 Reset gửi email", "resetEmailSentStatus")
    .addItem("👥 Cập nhật Tên liên quan", "updateAllRelatedNames")
    .addItem("🔍 Kiểm tra Email", "checkInvalidEmails")
    .addToUi();
  try {
    highlightUpcomingWeekDashboard();
  } catch (e) {}
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
