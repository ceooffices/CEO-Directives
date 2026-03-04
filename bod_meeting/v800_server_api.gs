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
      .setTitle("BOD Admin Page")
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
  SpreadsheetApp.getUi().showModalDialog(html, "BOD Meeting Dashboard V8.0");
}

// ===== HELPER: NAME → EMAIL (tra từ HR sheet + responses) =====
function loadNameToEmailMap_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var nameToEmail = {};

  // 1. Từ bảng nhân sự (HR sheet): col NAME=3, col EMAIL=6 (1-based)
  var hrSheet = ss.getSheetByName(CONFIG.SHEET_HR);
  if (hrSheet && hrSheet.getLastRow() >= 2) {
    var lastRow = hrSheet.getLastRow();
    var names  = hrSheet.getRange(2, CONFIG.HR_COL_NAME,  lastRow - 1, 1).getValues();
    var emails = hrSheet.getRange(2, CONFIG.HR_COL_EMAIL, lastRow - 1, 1).getValues();
    for (var i = 0; i < names.length; i++) {
      var n = (names[i][0]  || '').toString().trim();
      var e = (emails[i][0] || '').toString().trim().toLowerCase();
      if (n && e) nameToEmail[n] = e;
    }
  }

  // 2. Từ bảng đăng ký: hoTen (col I) → email (col J) — đầy đủ hơn
  var respSheet = ss.getSheetByName(CONFIG.SHEET_RESPONSES);
  if (respSheet && respSheet.getLastRow() >= 2) {
    var cols = CONFIG.COLUMN_MAP;
    var data = respSheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      var n = (data[i][cols.hoTen] || '').toString().trim();
      var e = (data[i][cols.email] || '').toString().trim().toLowerCase();
      if (n && e && !nameToEmail[n]) nameToEmail[n] = e;
    }
  }

  return nameToEmail;
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
      thuTu: parseInt(row[cols.thuTu]) || 0,
      ghiChu: (row[cols.ghiChu] || "").toString(),
      tlCD:
        parseInt(row[cols.thoiLuongChiDao]) ||
        getDefaultChiDaoTime(row[cols.boPhan]),
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
  var hrSheet = ss.getSheetByName("Nhân sự bắt buộc");
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

  // Load email from HR sheet
  if (hrSheet) {
    var hrData = hrSheet.getDataRange().getValues();
    for (var i = 1; i < hrData.length; i++) {
      var bp = (hrData[i][0] || "").toString().trim().toUpperCase();
      var email = (hrData[i][1] || "").toString().trim();
      var name = (hrData[i][2] || "").toString().trim();
      if (bp && email) {
        deptEmails[bp] = email;
        deptContacts[bp] = name || bp;
      }
    }
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
function sendDeptReminderWeb(deptName, deptEmail, displayDate, contactName) {
  if (!deptEmail || !isValidEmail(deptEmail))
    return { success: false, msg: "Email không hợp lệ: " + deptEmail };
  try {
    var subject = "BOD MEETING — NHẮC NHỞ ĐĂNG KÝ BÁO CÁO — " + displayDate;
    var htmlBody = buildReminderEmail(deptName, contactName || "", displayDate, "");
    GmailApp.sendEmail(deptEmail, subject, "", {
      name: CONFIG.EMAIL_SENDER_NAME,
      htmlBody: htmlBody,
      cc: "hoangkha@esuhai.com",
    });
    return {
      success: true,
      msg: "Đã gửi nhắc nhở đến " + deptName + " (" + deptEmail + ")",
    };
  } catch (e) {
    return { success: false, msg: "Lỗi gửi email: " + e.message };
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
      var r = sendDeptReminderWeb(depts[i].name, depts[i].email, displayDate, depts[i].contact);
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
  return { sent: sent, failed: failed, details: msgs.join("\n") };
}

// ===== API: GUI NHAC PHE DUYET =====
function sendApprovalReminderWeb(searchDate, displayDate) {
  var btcEmails = getBTCEmails();
  var stats = getDetailedStats(searchDate);
  if (stats.pending === 0)
    return { success: false, msg: "Không có đăng ký nào chờ duyệt!" };
  try {
    var subject = "BOD MEETING — NHẮC PHÊ DUYỆT NỘI DUNG — " + displayDate;
    var htmlBody = buildApprovalReminderEmail(displayDate, stats.pending);
    GmailApp.sendEmail(btcEmails.all.join(","), subject, "", {
      name: CONFIG.EMAIL_SENDER_NAME,
      htmlBody: htmlBody,
    });
    return {
      success: true,
      msg: "Đã gửi nhắc phê duyệt đến BTC (" + stats.pending + " chờ duyệt)",
    };
  } catch (e) {
    return { success: false, msg: "Lỗi: " + e.message };
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
            email: "",
          });
        }
      }
      // Bổ sung email bằng cách tra tên người trình bày
      var nameToEmail = loadNameToEmailMap_();
      for (var j = 0; j < result.items.length; j++) {
        result.items[j].email = nameToEmail[result.items[j].presenter] || "";
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
      email: (row[cols.email] || "").toString().trim(),
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

// ===== API: GUI KET QUA PHE DUYET TU DASHBOARD (web-compatible) =====
function sendApprovalResultEmails() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_RESPONSES);
  if (!sheet) return { success: false, msg: "Không tìm thấy sheet đăng ký!" };

  // Tìm thứ 2 gần nhất (giống logic Dashboard)
  var now = new Date();
  var day = now.getDay();
  var diff;
  if (day === 0) diff = -6;
  else if (day === 1) diff = 0;
  else diff = 1 - day;
  var monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  var searchDate = String(monday.getDate()).padStart(2, '0') + '/' + String(monday.getMonth() + 1).padStart(2, '0');

  var cols = CONFIG.COLUMN_MAP;
  var data = sheet.getDataRange().getValues();
  var sent = 0, skipped = 0, alreadySent = 0, failed = 0;
  var btcEmails = getBTCEmails();
  var timestamp = Utilities.formatDate(now, 'Asia/Ho_Chi_Minh', 'dd/MM HH:mm');

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!matchNgayHop(row[cols.ngayHop], searchDate)) continue;

    var email = (row[cols.email] || '').toString().trim();
    var status = (row[cols.status] || '').toString().trim();
    var hoTen = toTitleCase(row[cols.hoTen]) || 'N/A';
    var daGui = (row[cols.daGuiEmail] || '').toString().trim();

    // Bỏ qua nếu đã gửi
    if (daGui) { alreadySent++; continue; }
    // Bỏ qua nếu email không hợp lệ
    if (!email || !isValidEmail(email)) { skipped++; continue; }
    // Bỏ qua nếu chưa duyệt
    if (!status || status === 'Chờ duyệt') { skipped++; continue; }

    var ngayHop = formatNgayHop(row[cols.ngayHop]);
    var noiDung = (row[cols.noiDung] || '').toString();
    var ghiChu = (row[cols.ghiChu] || '').toString();

    // Build email data dùng template
    var emailData;
    if (status === 'Duyệt') emailData = buildEmailApproved({ hoTen: hoTen, noiDung: noiDung, ngayHop: ngayHop, boPhan: row[cols.boPhan] || '', ghiChu: ghiChu });
    else if (status === 'Từ chối') emailData = buildEmailRejected({ hoTen: hoTen, noiDung: noiDung, ngayHop: ngayHop, boPhan: row[cols.boPhan] || '', ghiChu: ghiChu });
    else if (status === 'Hoãn') emailData = buildEmailPostponed({ hoTen: hoTen, noiDung: noiDung, ngayHop: ngayHop, boPhan: row[cols.boPhan] || '', ghiChu: ghiChu });
    else { skipped++; continue; }

    // CC: BTC + người liên quan
    var ccList = btcEmails.all.slice();
    var emailLQ = row[cols.emailLienQuan];
    if (emailLQ) {
      var lqArr = emailLQ.toString().split(/[,;\n]+/);
      for (var j = 0; j < lqArr.length; j++) {
        var e = lqArr[j].trim().toLowerCase();
        if (isValidEmail(e)) ccList.push(e);
      }
    }
    // Unique CC
    var ccUnique = [];
    var ccSeen = {};
    for (var j = 0; j < ccList.length; j++) {
      var c = ccList[j].toLowerCase();
      if (!ccSeen[c]) { ccSeen[c] = true; ccUnique.push(ccList[j]); }
    }

    if (sent > 0) Utilities.sleep(CONFIG.EMAIL_DELAY_MS || 500);

    try {
      var opts = {
        to: email,
        cc: ccUnique.join(','),
        subject: emailData.subject,
        body: emailData.body,
        name: CONFIG.EMAIL_SENDER_NAME
      };
      if (emailData.htmlBody) opts.htmlBody = emailData.htmlBody;
      MailApp.sendEmail(opts);
      sent++;
      sheet.getRange(i + 1, cols.daGuiEmail + 1).setValue('✔︎ ' + timestamp);
    } catch (err) {
      failed++;
    }
  }

  if (sent === 0 && skipped === 0 && failed === 0 && alreadySent === 0) {
    return { success: false, msg: 'Không tìm thấy đăng ký cho ngày ' + searchDate };
  }

  var msg = 'Gửi mới: ' + sent;
  if (alreadySent > 0) msg += ' | Đã gửi trước: ' + alreadySent;
  if (failed > 0) msg += ' | Lỗi: ' + failed;
  if (skipped > 0) msg += ' | Bỏ qua: ' + skipped;

  return { success: sent > 0, msg: msg };
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
