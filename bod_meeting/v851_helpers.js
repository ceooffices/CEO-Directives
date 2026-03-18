/**
 * ========================================================================
 * v851_helpers.js — HÀM TIỆN ÍCH / UTILITIES
 * ========================================================================
 * Tách từ Mã.js v8.0 — Chứa các hàm helper dùng chung:
 * - Validation (email, date)
 * - Format (ngày họp, thời lượng, thời gian)
 * - Lookup (email → tên từ HR sheet)
 * - Date utilities (getNext4Mondays, matchNgayHop)
 * - Stats (getDetailedStats)
 * ========================================================================
 */

// =============================================================================
// VALIDATION & FORMAT
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

// =============================================================================
// DATE UTILITIES
// =============================================================================
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

// =============================================================================
// STATS & LOOKUP
// =============================================================================
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

function getDetailedStatsWithDepts(searchDate) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_RESPONSES);
  const requiredDepts = [
    "ONETEAM",
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

// =============================================================================
// HR LOOKUP (Email → Tên)
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
        true, true, true, true, true, true,
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
            true, true, true, true, true, true,
            "#FF0000",
            SpreadsheetApp.BorderStyle.SOLID_THICK,
          )
          .setBackground("#FFF8E1");
        return;
      }
    }
  }
}
