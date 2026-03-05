/**
 * ========================================================================
 * BOD REGISTRATION V8.0 — SERVER API CHO WEB DASHBOARD
 * ========================================================================
 * Thêm file này vào Google Apps Script project (cùng với Code_v782)
 * Thêm Dashboard.html vào project
 * Deploy as Web App để truy cập dashboard trên mobile
 * ========================================================================
 */

// ===== WEB APP ENTRY POINT =====
function doGet(e) {
  var page = (e && e.parameter && e.parameter.page) ? e.parameter.page : 'dashboard';
  if (page === 'admin') {
    return HtmlService.createHtmlOutputFromFile("AdminPage")
      .setTitle("Trang Quản Trị — BOD Meeting")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  return HtmlService.createTemplateFromFile("Dashboard")
    .evaluate()
    .setTitle("BOD Meeting Dashboard")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ===== INCLUDE HELPER (chuẩn GAS modular pattern) =====
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ===== MỞ DASHBOARD FULL SCREEN =====
function showDashboardDialog() {
  var html = HtmlService.createTemplateFromFile("Dashboard")
    .evaluate()
    .setWidth(1600)
    .setHeight(900);
  SpreadsheetApp.getUi().showModalDialog(html, "BOD Meeting Dashboard");
}

// ===== MỞ ADMIN PAGE TỪ MENU =====
function showAdminPageDialog() {
  var html = HtmlService.createHtmlOutputFromFile("AdminPage")
    .setWidth(1200)
    .setHeight(900);
  SpreadsheetApp.getUi().showModalDialog(html, "Trang Quản Trị — BOD Meeting");
}

// ===== API: LẤY DANH SÁCH NGÀY HỌP =====
function getAvailableDates() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_RESPONSES);
  if (!sheet) return [];

  var cols = CONFIG.COLUMN_MAP;
  var data = sheet.getDataRange().getValues();
  var dateMap = {};

  for (var i = 1; i < data.length; i++) {
    var ngayHop = data[i][cols.ngayHop];
    if (ngayHop) {
      var search = extractSearchDate(ngayHop);
      if (search && !dateMap[search]) {
        dateMap[search] = formatNgayHop(ngayHop);
      }
    }
  }

  return Object.keys(dateMap)
    .sort()
    .reverse()
    .map(function (s) {
      return { display: dateMap[s], search: s };
    });
}

// ===== API: LẤY DỮ LIỆU DASHBOARD =====
function getDashboardData(searchDate) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_RESPONSES);
  var result = {
    total: 0,
    approved: 0,
    rejected: 0,
    pending: 0,
    postponed: 0,
    items: [],
  };
  if (!sheet) return result;

  var cols = CONFIG.COLUMN_MAP;
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (searchDate && !matchNgayHop(row[cols.ngayHop], searchDate)) continue;

    result.total++;
    var status = (row[cols.status] || "").toString().trim();

    switch (status) {
      case "Duyệt":
        result.approved++;
        break;
      case "Từ chối":
        result.rejected++;
        break;
      case "Hoãn":
        result.postponed++;
        break;
      default:
        result.pending++;
    }

    result.items.push({
      row: i + 1,
      hoTen: row[cols.hoTen] || "N/A",
      boPhan: row[cols.boPhan] || "",
      noiDung: row[cols.noiDung] || "",
      ngayHop: formatNgayHop(row[cols.ngayHop]),
      thoiLuong: formatThoiLuong(row[cols.thoiLuong]),
      status: status || "Chờ duyệt",
      thamGia: row[cols.thamGia] || "",
      daGuiEmail: row[cols.daGuiEmail] || "",
      thuTu: parseInt(row[cols.thuTu]) || 0, // [V8.1] cho Dashboard inline
    });
  }
  return result;
}

// ===== API: TRẠNG THÁI QUY TRÌNH 4 BƯỚC =====
function getProcessStatus() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_RESPONSES);
  var scheduleSheet = ss.getSheetByName(CONFIG.SHEET_SCHEDULE);

  // Tìm thứ 2 sắp tới gần nhất
  var now = new Date();
  var day = now.getDay(); // 0=CN, 1=T2, ...
  var hour = now.getHours();
  var diff;
  if (day === 1 && hour < 12)
    diff = 0; // Thứ 2 sáng = ngày họp
  else if (day === 0) diff = 1;
  else if (day === 1)
    diff = 7; // Thứ 2 chiều → tuần sau
  else diff = 8 - day;

  var nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + diff);
  var d = nextMonday.getDate().toString().padStart(2, "0");
  var m = (nextMonday.getMonth() + 1).toString().padStart(2, "0");
  var searchDate = d + "/" + m;
  var displayDate = "Thứ 2, " + d + "/" + m + "/" + nextMonday.getFullYear();

  var result = {
    targetDate: displayDate,
    searchDate: searchDate,
    currentStep: 1,
    steps: [
      {
        id: 1,
        name: "Đăng ký",
        desc: "Nhân viên submit form (T3→T6)",
        status: "pending",
        count: 0,
      },
      {
        id: 2,
        name: "Duyệt",
        desc: "BOD duyệt nội dung (T6→T7)",
        status: "pending",
        count: 0,
      },
      {
        id: 3,
        name: "Lịch trình",
        desc: "Tạo & gửi lịch (CN 20:00)",
        status: "pending",
        count: 0,
      },
      {
        id: 4,
        name: "Họp BOD",
        desc: "Cuộc họp diễn ra (T2)",
        status: "pending",
        count: 0,
      },
    ],
  };

  if (!sheet) return result;

  var cols = CONFIG.COLUMN_MAP;
  var data = sheet.getDataRange().getValues();
  var total = 0,
    approved = 0,
    pending = 0;

  for (var i = 1; i < data.length; i++) {
    if (matchNgayHop(data[i][cols.ngayHop], searchDate)) {
      total++;
      var st = (data[i][cols.status] || "").toString().trim();
      if (st === "Duyệt") approved++;
      else if (!st || st === "Chờ duyệt") pending++;
    }
  }

  // Step 1: Đăng ký
  result.steps[0].count = total;
  if (total > 0) {
    result.steps[0].status = "done";
    result.currentStep = 2;
  } else {
    result.steps[0].status = day >= 2 && day <= 5 ? "active" : "pending";
    if (day >= 2 && day <= 5) result.currentStep = 1;
    return result;
  }

  // Step 2: Duyệt
  result.steps[1].count = approved;
  if (pending === 0 && approved > 0) {
    result.steps[1].status = "done";
    result.currentStep = 3;
  } else if (approved > 0 || day >= 5) {
    result.steps[1].status = "active";
    result.currentStep = 2;
  } else {
    result.steps[1].status = "pending";
  }

  // Step 3: Lịch trình
  var scheduleCreated = false;
  if (scheduleSheet) {
    var banner = (scheduleSheet.getRange("A3").getValue() || "").toString();
    var schedDate = (scheduleSheet.getRange("A8").getValue() || "").toString();
    if (schedDate.indexOf(searchDate) >= 0) {
      scheduleCreated = true;
      if (banner.indexOf("ĐÃ DUYỆT") >= 0) {
        result.steps[2].status = "done";
        result.steps[2].count = 1;
        result.currentStep = 4;
      } else if (banner.indexOf("BẢN NHÁP") >= 0) {
        result.steps[2].status = "active";
        result.steps[2].count = 1;
        result.currentStep = 3;
      }
    }
  }
  if (!scheduleCreated && result.steps[1].status === "done") {
    result.steps[2].status = day === 0 || day === 6 ? "active" : "pending";
    result.currentStep = 3;
  }

  // Step 4: Họp BOD
  if (day === 1 && hour >= 8 && result.steps[2].status === "done") {
    result.steps[3].status = "active";
    result.currentStep = 4;
  } else if (day === 1 && hour >= 12 && result.steps[2].status === "done") {
    result.steps[3].status = "done";
  }

  return result;
}

// ===== API: TRANG THAI DANG KY THEO BO PHAN =====
function getDeptRegistrationStatus(searchDate) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_RESPONSES);
  // Load from CONFIG.SHEET_HR (now "DANH SÁCH NHÂN VIÊN")
  var hrSheet = ss.getSheetByName(CONFIG.SHEET_HR);
  var requiredDepts = [
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
  var deptEmails = {};
  var deptContacts = {};

  // Column indices (CONFIG uses 1-indexed, getValues uses 0-indexed)
  var colDept  = (CONFIG.HR_COL_DEPT || 1) - 1;   // Default: col A
  var colName  = (CONFIG.HR_COL_NAME || 3) - 1;   // Default: col C
  var colEmail = (CONFIG.HR_COL_EMAIL || 6) - 1;  // Default: col F

  // Load email from HR sheet — take FIRST email per dept (= department head)
  if (hrSheet) {
    var hrData = hrSheet.getDataRange().getValues();
    // Log header + first data row for diagnostic
    if (hrData.length > 0) {
      var headers = [];
      for (var h = 0; h < Math.min(hrData[0].length, 10); h++) {
        headers.push("col" + h + "=" + hrData[0][h]);
      }
      Logger.log("HR HEADERS: " + headers.join(" | "));
    }
    if (hrData.length > 1) {
      var row1 = [];
      for (var r = 0; r < Math.min(hrData[1].length, 10); r++) {
        row1.push("col" + r + "=" + hrData[1][r]);
      }
      Logger.log("HR ROW 1: " + row1.join(" | "));
    }
    Logger.log("HR reading: colDept=" + colDept + " colEmail=" + colEmail + " colName=" + colName);
    for (var i = 1; i < hrData.length; i++) {
      var bp = (hrData[i][colDept] || "").toString().trim().toUpperCase();
      var email = (hrData[i][colEmail] || "").toString().trim();
      var name = (hrData[i][colName] || "").toString().trim();
      if (bp && email && !deptEmails[bp]) {
        // Only take FIRST match per dept (= dept head / representative)
        deptEmails[bp] = email;
        deptContacts[bp] = name || bp;
        Logger.log("  Mapped: " + bp + " → " + email + " (" + name + ")");
      }
    }
    // Log which required depts are still missing email
    for (var j = 0; j < requiredDepts.length; j++) {
      var key = requiredDepts[j].toUpperCase();
      if (!deptEmails[key]) {
        Logger.log("  MISSING email for: " + requiredDepts[j]);
      }
    }
  } else {
    Logger.log("WARNING: Sheet '" + CONFIG.SHEET_HR + "' not found! Email sending will fail.");
  }

  // Count registrations per dept
  var deptStats = {};
  if (sheet) {
    var cols = CONFIG.COLUMN_MAP;
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (!matchNgayHop(data[i][cols.ngayHop], searchDate)) continue;
      var bp = (data[i][cols.boPhan] || "").toString().trim().toUpperCase();
      if (!deptStats[bp])
        deptStats[bp] = { total: 0, approved: 0, pending: 0, rejected: 0 };
      deptStats[bp].total++;
      var st = (data[i][cols.status] || "").toString().trim();
      if (st === "Duyệt") deptStats[bp].approved++;
      else if (st === "Từ chối" || st === "Hoãn") deptStats[bp].rejected++;
      else deptStats[bp].pending++;
    }
  }

  var result = [];
  for (var i = 0; i < requiredDepts.length; i++) {
    var d = requiredDepts[i];
    var key = d.toUpperCase();
    var stats = deptStats[key] || {
      total: 0,
      approved: 0,
      pending: 0,
      rejected: 0,
    };
    result.push({
      name: d,
      email: deptEmails[key] || "",
      contact: deptContacts[key] || "",
      total: stats.total,
      approved: stats.approved,
      pending: stats.pending,
      status:
        stats.total === 0 ? "missing" : stats.pending > 0 ? "partial" : "ok",
    });
  }
  return result;
}

// ===== API: GUI NHAC NHO 1 BO PHAN =====
function sendDeptReminderWeb(deptName, deptEmail, displayDate) {
  if (!deptEmail || !isValidEmail(deptEmail))
    return { success: false, msg: "Email khong hop le: " + deptEmail };
  try {
    var subject = "[BOD MEETING] Nhac nho dang ky bao cao - " + displayDate;
    var plainBody = "Kinh gui " + deptName + ",\n\nBo phan " + deptName + " chua dang ky bao cao cho cuoc hop BOD ngay " + displayDate + ".\nHan dang ky: Thu Nam, 17:00\n\nTran trong,\nBTC Meeting BOD";

    // Build HTML email from templates (beautiful design)
    var htmlBody = "";
    try { htmlBody = buildReminderEmail(deptName, "", displayDate, ""); } catch(te) { Logger.log("Template error: " + te.message); }

    // Route through N8N if configured
    if (CONFIG.EMAIL_METHOD === "n8n") {
      var ok = sendViaWebhook({
        to: deptEmail,
        cc: "hoangkha@esuhai.com",
        subject: subject,
        body: plainBody,
        htmlBody: htmlBody,
        senderName: "BTC Meeting BOD",
        senderEmail: CONFIG.EMAIL_SENDER_ADDRESS || "",
        type: "dept_reminder",
        deptName: deptName,
        displayDate: displayDate,
      });
      if (ok) {
        logEmailSend('reminder', 1, deptName + ' (' + deptEmail + ')');
        return { success: true, msg: "Da gui nhac nho den " + deptName + " (" + deptEmail + ") [N8N]" };
      }
      Logger.log("N8N failed for dept reminder, falling back to Gmail");
    }

    // Gmail fallback — also uses HTML template
    var emailOpts = { name: "BTC Meeting BOD", cc: "hoangkha@esuhai.com" };
    if (htmlBody) emailOpts.htmlBody = htmlBody;
    if (CONFIG.EMAIL_SENDER_ADDRESS) emailOpts.from = CONFIG.EMAIL_SENDER_ADDRESS;
    GmailApp.sendEmail(deptEmail, subject, plainBody, emailOpts);
    logEmailSend('reminder', 1, deptName + ' (' + deptEmail + ')');
    return { success: true, msg: "Da gui nhac nho den " + deptName + " (" + deptEmail + ")" };
  } catch (e) {
    return { success: false, msg: "Loi gui email: " + e.message };
  }
}

// ===== API: GUI NHAC NHO TAT CA BO PHAN CHUA DANG KY =====
function sendBulkReminderWeb(searchDate, displayDate) {
  var depts = getDeptRegistrationStatus(searchDate);
  var sent = 0,
    failed = 0,
    msgs = [];
  for (var i = 0; i < depts.length; i++) {
    if (depts[i].status === "missing" && depts[i].email) {
      var r = sendDeptReminderWeb(depts[i].name, depts[i].email, displayDate);
      if (r.success) {
        sent++;
        msgs.push("✔ " + depts[i].name);
      } else {
        failed++;
        msgs.push("✗ " + depts[i].name);
      }
      if (i < depts.length - 1) Utilities.sleep(500);
    }
  }
  logEmailSend('bulk_reminder', sent, msgs.join(', '));
  return { sent: sent, failed: failed, details: msgs.join("\n") };
}

// ===== API: GUI NHAC PHE DUYET =====
function sendApprovalReminderWeb(searchDate, displayDate) {
  var btcEmails = getBTCEmails();
  var stats = getDetailedStats(searchDate);
  if (stats.pending === 0)
    return { success: false, msg: "Khong co dang ky nao cho duyet!" };
  try {
    var subject = "[BOD MEETING] Nhac phe duyet noi dung - " + displayDate;
    var plainBody = "Kinh gui Ban To Chuc,\n\nHien con " + stats.pending + " dang ky cho phe duyet cho cuoc hop BOD ngay " + displayDate + ".\nTong: " + stats.total + " | Duyet: " + stats.approved + " | Cho: " + stats.pending + "\n\nTran trong,\nBTC Meeting BOD";

    // Build HTML email from templates (beautiful design)
    var htmlBody = "";
    try { htmlBody = buildApprovalReminderEmail(displayDate, stats.pending); } catch(te) { Logger.log("Template error: " + te.message); }

    // Route through N8N if configured
    if (CONFIG.EMAIL_METHOD === "n8n") {
      var ok = sendViaWebhook({
        to: btcEmails.all.join(","),
        subject: subject,
        body: plainBody,
        htmlBody: htmlBody,
        senderName: "BTC Meeting BOD",
        senderEmail: CONFIG.EMAIL_SENDER_ADDRESS || "",
        type: "approval_reminder",
        stats: { total: stats.total, approved: stats.approved, pending: stats.pending },
        displayDate: displayDate,
      });
      if (ok) {
        logEmailSend('approval_reminder', 1, stats.pending + ' cho duyet');
        return { success: true, msg: "Da gui nhac phe duyet den BTC (" + stats.pending + " cho duyet) [N8N]" };
      }
      Logger.log("N8N failed for approval reminder, falling back to Gmail");
    }

    // Gmail fallback — also uses HTML template
    var emailOpts = { name: "BTC Meeting BOD" };
    if (htmlBody) emailOpts.htmlBody = htmlBody;
    if (CONFIG.EMAIL_SENDER_ADDRESS) emailOpts.from = CONFIG.EMAIL_SENDER_ADDRESS;
    GmailApp.sendEmail(btcEmails.all.join(","), subject, plainBody, emailOpts);
    logEmailSend('approval_reminder', 1, stats.pending + ' cho duyet');
    return { success: true, msg: "Da gui nhac phe duyet den BTC (" + stats.pending + " cho duyet)" };
  } catch (e) {
    return { success: false, msg: "Loi: " + e.message };
  }
}

// ===== API: XEM LICH TRINH PREVIEW =====
function getSchedulePreview(searchDate) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_RESPONSES);
  var scheduleSheet = ss.getSheetByName(CONFIG.SHEET_SCHEDULE);
  var result = {
    created: false,
    confirmed: false,
    items: [],
    totalMinutes: 0,
    ngayHop: "",
  };

  // Check if schedule already exists
  if (scheduleSheet) {
    var banner = (scheduleSheet.getRange("A3").getValue() || "").toString();
    var schedDate = (scheduleSheet.getRange("A8").getValue() || "").toString();
    if (schedDate.indexOf(searchDate) >= 0) {
      result.created = true;
      result.confirmed = banner.indexOf("ĐÃ DUYỆT") >= 0;
      result.ngayHop = schedDate;
      // Read existing schedule
      for (var i = CONFIG.AGENDA_START_ROW; i <= CONFIG.AGENDA_END_ROW; i++) {
        var content = scheduleSheet.getRange(i, 3).getValue();
        if (content && content.toString().trim()) {
          result.items.push({
            stt: scheduleSheet.getRange(i, 1).getValue(),
            time: formatTime(scheduleSheet.getRange(i, 2).getValue()),
            content: content.toString(),
            presenter: (
              scheduleSheet.getRange(i, 4).getValue() || ""
            ).toString(),
            tlTB: (scheduleSheet.getRange(i, 5).getValue() || "").toString(),
            tlCD: (scheduleSheet.getRange(i, 6).getValue() || "").toString(),
            related: (scheduleSheet.getRange(i, 7).getValue() || "").toString(),
          });
        }
      }
      return result;
    }
  }

  // Build preview from approved registrations
  if (!sheet) return result;
  var cols = CONFIG.COLUMN_MAP;
  var data = sheet.getDataRange().getValues();
  var emailToName = loadEmailToNameMap();
  var items = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!matchNgayHop(row[cols.ngayHop], searchDate)) continue;
    if ((row[cols.status] || "").toString().trim() !== "Duyệt") continue;
    var tlTB = parseThoiLuong(row[cols.thoiLuong]);
    if (tlTB === 0) tlTB = 10;
    var tlCD = parseThoiLuong(row[cols.thoiLuongChiDao]);
    if (tlCD === 0) tlCD = getDefaultChiDaoTime(row[cols.boPhan]);
    var tenLQ = row[cols.tenLienQuan] || "";
    if (!tenLQ && row[cols.emailLienQuan])
      tenLQ = lookupNamesFromEmailList(row[cols.emailLienQuan], emailToName);
    items.push({
      thuTu: parseInt(row[cols.thuTu]) || 999,
      content:
        "[" + (row[cols.boPhan] || "") + "] " + (row[cols.noiDung] || ""),
      presenter: toTitleCase(row[cols.hoTen] || ""),
      tlTB: tlTB,
      tlCD: tlCD,
      related: tenLQ || "",
    });
  }
  items.sort(function (a, b) {
    return a.thuTu - b.thuTu;
  });
  var t = 8 * 60 + 30;
  for (var i = 0; i < items.length; i++) {
    items[i].stt = i + 1;
    items[i].time =
      String(Math.floor(t / 60)).padStart(2, "0") +
      ":" +
      String(t % 60).padStart(2, "0");
    result.totalMinutes += items[i].tlTB + items[i].tlCD;
    items[i].tlTB = items[i].tlTB + "'";
    items[i].tlCD = items[i].tlCD + "'";
    t += parseInt(items[i].tlTB) + parseInt(items[i].tlCD);
  }
  result.items = items;
  return result;
}

// ===== API: TAO LICH TRINH TU DASHBOARD =====
function createScheduleFromDashboard(searchDate) {
  try {
    generateSchedule();
    return { success: true, msg: "Đã tạo lịch trình!" };
  } catch (e) {
    return { success: false, msg: "Lỗi: " + e.message };
  }
}

// ===== API: GUI LICH TRINH TU DASHBOARD =====
function sendScheduleFromDashboard() {
  try {
    var count = sendScheduleEmail();
    return { success: true, msg: "Đã gửi lịch trình đến " + count + " người!" };
  } catch (e) {
    return { success: false, msg: "Lỗi: " + e.message };
  }
}

// ===== HELPER CỦA DASHBOARD =====
function getScriptAppUrl() {
  return ScriptApp.getService().getUrl();
}
