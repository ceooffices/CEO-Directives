/**
 * ========================================================================
 * BOD MEETING V8.1 — ADMIN API
 * ========================================================================
 * File mới, bổ sung cho v800_server_api.gs
 * Phục vụ: AdminPage.html (7 hàm) + Dashboard.html (saveApprovalFromDashboard)
 *
 * LƯU Ý: showDashboardDialog() đã có trong v800_server_api.gs, không tạo lại.
 * LƯU Ý: getDashboardData() đã được bổ sung field "thuTu" trong v800_server_api.gs
 * ========================================================================
 */

// ===== HELPER: MỞ HOẶC TẠO SHEET =====
function getOrCreateSheet_(sheetName, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    // Tạo header row nếu được cung cấp
    if (headers && headers.length > 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
    }
  }
  return sheet;
}

// ========================================================================
// HÀM 1: LƯU PHÊ DUYỆT + THỨ TỰ TỪ DASHBOARD
// ========================================================================
/**
 * Lưu trạng thái phê duyệt và thứ tự trình bày từ Dashboard inline
 * @param {string} jsonUpdates - JSON array: [{row, hoTen, status, thuTu}, ...]
 * @returns {object} {success, msg}
 */
function saveApprovalFromDashboard(jsonUpdates) {
  try {
    var updates = JSON.parse(jsonUpdates);
    if (!Array.isArray(updates) || updates.length === 0) {
      return { success: false, msg: "Không có dữ liệu để lưu" };
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(CONFIG.SHEET_RESPONSES);
    if (!sheet) return { success: false, msg: "Không tìm thấy sheet đăng ký: " + CONFIG.SHEET_RESPONSES };

    var cols = CONFIG.COLUMN_MAP;
    // Chuyển sang 1-based cho getRange
    var statusColIdx = cols.status + 1;
    var thuTuColIdx = cols.thuTu + 1;
    var ghiChuColIdx = cols.ghiChu + 1;
    var tlCDColIdx = cols.thoiLuongChiDao + 1;

    var count = 0;
    for (var i = 0; i < updates.length; i++) {
      var item = updates[i];
      var rowNum = parseInt(item.row);
      if (!rowNum || rowNum < 2) continue; // Bỏ qua dòng không hợp lệ

      // Cập nhật Trạng thái
      if (item.status) {
        sheet.getRange(rowNum, statusColIdx).setValue(item.status);
      }

      // Cập nhật Thứ tự (chỉ khi > 0, bỏ qua khi = 0 để giữ nguyên)
      if (item.thuTu !== undefined && parseInt(item.thuTu) > 0) {
        sheet.getRange(rowNum, thuTuColIdx).setValue(parseInt(item.thuTu));
      }

      // Cập nhật Ghi chú (nếu có)
      if (item.ghiChu !== undefined && item.ghiChu !== null) {
        sheet.getRange(rowNum, ghiChuColIdx).setValue(item.ghiChu);
      }

      // Cập nhật Thời lượng chỉ đạo (nếu có)
      if (item.tlCD !== undefined && item.tlCD !== null && String(item.tlCD).trim()) {
        sheet.getRange(rowNum, tlCDColIdx).setValue(item.tlCD);
      }

      count++;
    }

    return { success: true, msg: "Đã lưu " + count + " phê duyệt thành công" };
  } catch (e) {
    return { success: false, msg: "Lỗi saveApprovalFromDashboard: " + e.message };
  }
}

// ========================================================================
// HÀM 2: LƯU EMAIL TEMPLATE VÀO SHEET SETTINGS
// ========================================================================
/**
 * Lưu email template vào sheet Settings
 * @param {string} key - Một trong: reminder, bulk_reminder, approval_reminder, approval_result, schedule
 * @param {string} jsonTemplate - JSON string {"subject":"...", "body":"..."}
 * @returns {object} {success, msg}
 */
function saveEmailTemplate(key, jsonTemplate) {
  try {
    var validKeys = ["reminder", "bulk_reminder", "approval_reminder", "approval_result", "schedule"];
    if (validKeys.indexOf(key) === -1) {
      return { success: false, msg: "Key không hợp lệ: " + key + ". Chỉ chấp nhận: " + validKeys.join(", ") };
    }

    // Validate JSON
    JSON.parse(jsonTemplate); // Ném lỗi nếu không hợp lệ

    var sheet = getOrCreateSheet_("Settings", ["Key", "Value"]);
    var settingKey = "tpl_" + key;
    var data = sheet.getDataRange().getValues();

    // Tìm dòng có cột A = settingKey
    var found = false;
    for (var i = 1; i < data.length; i++) {
      if (data[i][0].toString().trim() === settingKey) {
        sheet.getRange(i + 1, 2).setValue(jsonTemplate);
        found = true;
        break;
      }
    }

    // Nếu chưa có → thêm dòng mới
    if (!found) {
      sheet.appendRow([settingKey, jsonTemplate]);
    }

    return { success: true, msg: "Đã lưu template " + key };
  } catch (e) {
    return { success: false, msg: "Lỗi saveEmailTemplate: " + e.message };
  }
}

// ========================================================================
// HÀM 3: LẤY DANH SÁCH NGƯỜI DÙNG CÓ QUYỀN TRUY CẬP
// ========================================================================
/**
 * Lấy danh sách người dùng từ sheet Users
 * Nếu sheet trống → tự tạo admin mặc định cho user đang chạy script
 * @returns {Array} [{email, name, role, status}, ...]
 */
function getAccessUsers() {
  try {
    var sheet = getOrCreateSheet_("Users", ["Email", "Ho ten", "Vai tro", "Trang thai"]);
    var data = sheet.getDataRange().getValues();

    // Nếu chỉ có header hoặc trống → tạo admin mặc định
    if (data.length <= 1) {
      var currentUser = Session.getActiveUser().getEmail();
      sheet.appendRow([currentUser, "Admin", "admin", "approved"]);
      data = sheet.getDataRange().getValues();
    }

    var result = [];
    for (var i = 1; i < data.length; i++) {
      var email = (data[i][0] || "").toString().trim();
      if (!email) continue; // Bỏ qua dòng trống
      result.push({
        email: email,
        name: (data[i][1] || "").toString().trim(),
        role: (data[i][2] || "viewer").toString().trim(),
        status: (data[i][3] || "pending").toString().trim()
      });
    }
    return result;
  } catch (e) {
    return []; // Trả về mảng rỗng nếu lỗi
  }
}

// ========================================================================
// HÀM 4: CẬP NHẬT TRẠNG THÁI TRUY CẬP USER
// ========================================================================
/**
 * Cập nhật trạng thái truy cập của một user
 * @param {string} email - Email của user cần cập nhật
 * @param {string} newStatus - "approved" | "pending" | "blocked"
 * @returns {object} {success, msg}
 */
function updateUserAccess(email, newStatus) {
  try {
    var validStatus = ["approved", "pending", "blocked"];
    if (validStatus.indexOf(newStatus) === -1) {
      return { success: false, msg: "Trạng thái không hợp lệ: " + newStatus + ". Chỉ chấp nhận: " + validStatus.join(", ") };
    }
    if (!email) return { success: false, msg: "Thiếu email" };

    var sheet = getOrCreateSheet_("Users", ["Email", "Ho ten", "Vai tro", "Trang thai"]);
    var data = sheet.getDataRange().getValues();

    for (var i = 1; i < data.length; i++) {
      if (data[i][0].toString().trim().toLowerCase() === email.toLowerCase()) {
        sheet.getRange(i + 1, 4).setValue(newStatus);
        return { success: true, msg: "Đã cập nhật " + email + " → " + newStatus };
      }
    }

    return { success: false, msg: "Không tìm thấy user: " + email };
  } catch (e) {
    return { success: false, msg: "Lỗi updateUserAccess: " + e.message };
  }
}

// ========================================================================
// HÀM 5: THÊM NGƯỜI DÙNG MỚI
// ========================================================================
/**
 * Thêm người dùng mới vào sheet Users
 * @param {string} jsonUser - JSON string {"email":"...", "name":"...", "role":"...", "status":"..."}
 * @returns {object} {success, msg}
 */
function addUserAccess(jsonUser) {
  try {
    var user = JSON.parse(jsonUser);
    if (!user.email) return { success: false, msg: "Thiếu email trong dữ liệu user" };

    var sheet = getOrCreateSheet_("Users", ["Email", "Ho ten", "Vai tro", "Trang thai"]);
    var data = sheet.getDataRange().getValues();

    // Kiểm tra email đã tồn tại chưa
    for (var i = 1; i < data.length; i++) {
      if (data[i][0].toString().trim().toLowerCase() === user.email.toLowerCase()) {
        return { success: false, msg: "Email đã tồn tại: " + user.email };
      }
    }

    // Thêm dòng mới với giá trị mặc định nếu thiếu
    sheet.appendRow([
      user.email,
      user.name || "",
      user.role || "viewer",
      user.status || "pending"
    ]);

    return { success: true, msg: "Đã thêm " + user.email };
  } catch (e) {
    return { success: false, msg: "Lỗi addUserAccess: " + e.message };
  }
}

// ========================================================================
// HÀM 6: LẤY TOÀN BỘ THIẾT LẬP HỆ THỐNG
// ========================================================================
/**
 * Lấy tất cả thiết lập từ sheet Settings (các dòng có key bắt đầu bằng cfg_)
 * @returns {object} Object chứa tất cả settings với giá trị mặc định nếu chưa có
 */
function getAdminSettings() {
  try {
    var sheet = getOrCreateSheet_("Settings", ["Key", "Value"]);
    var data = sheet.getDataRange().getValues();

    // Giá trị mặc định
    var defaults = {
      startTime: "08:30",
      regDeadline: "5",
      apprDeadline: "6",
      scheduleSend: "Chu nhat 20:00",
      maxPresentation: "20",
      defaultCD: "10",
      ccEmail: Session.getActiveUser().getEmail(),
      btcEmails: "",
      dashboardLink: "",
      formLink: "",
      sheetLink: ""
    };

    // Ánh xạ key trong sheet → field trong result
    var keyMap = {
      "cfg_startTime": "startTime",
      "cfg_regDeadline": "regDeadline",
      "cfg_apprDeadline": "apprDeadline",
      "cfg_scheduleSend": "scheduleSend",
      "cfg_maxPresentation": "maxPresentation",
      "cfg_defaultCD": "defaultCD",
      "cfg_ccEmail": "ccEmail",
      "cfg_btcEmails": "btcEmails",
      "cfg_dashboardUrl": "dashboardLink",
      "cfg_formLink": "formLink",
      "cfg_sheetLink": "sheetLink"
    };

    // Bắt đầu từ defaults
    var result = {};
    for (var k in defaults) result[k] = defaults[k];

    // Ghi đè từ sheet Settings
    for (var i = 1; i < data.length; i++) {
      var rowKey = (data[i][0] || "").toString().trim();
      if (rowKey.indexOf("cfg_") === 0 && keyMap[rowKey] !== undefined) {
        result[keyMap[rowKey]] = (data[i][1] || "").toString();
      }
    }

    // Bổ sung email admin hiện tại
    result.admin = Session.getActiveUser().getEmail();

    return result;
  } catch (e) {
    return { error: "Lỗi getAdminSettings: " + e.message };
  }
}

// ========================================================================
// HÀM 7: LƯU THIẾT LẬP HỆ THỐNG
// ========================================================================
/**
 * Lưu thiết lập hệ thống vào sheet Settings
 * @param {string} jsonSettings - JSON string chứa object settings (keys giống output getAdminSettings)
 * @returns {object} {success, msg}
 */
function saveAdminSettings(jsonSettings) {
  try {
    var settings = JSON.parse(jsonSettings);
    var sheet = getOrCreateSheet_("Settings", ["Key", "Value"]);

    // Ánh xạ field → key cfg_ trong sheet
    var fieldToKey = {
      startTime: "cfg_startTime",
      regDeadline: "cfg_regDeadline",
      apprDeadline: "cfg_apprDeadline",
      scheduleSend: "cfg_scheduleSend",
      maxPresentation: "cfg_maxPresentation",
      defaultCD: "cfg_defaultCD",
      ccEmail: "cfg_ccEmail",
      btcEmails: "cfg_btcEmails",
      dashboardLink: "cfg_dashboardUrl",
      formLink: "cfg_formLink",
      sheetLink: "cfg_sheetLink"
    };

    for (var field in settings) {
      // Bỏ qua field "admin" (chỉ đọc) và field không hỗ trợ
      if (!fieldToKey[field]) continue;

      var cfgKey = fieldToKey[field];
      var value = (settings[field] || "").toString();

      // Reload data mỗi lần để tránh index lệch khi appendRow
      var data = sheet.getDataRange().getValues();
      var found = false;
      for (var i = 1; i < data.length; i++) {
        if (data[i][0].toString().trim() === cfgKey) {
          sheet.getRange(i + 1, 2).setValue(value);
          found = true;
          break;
        }
      }

      // Nếu chưa có key → thêm dòng mới
      if (!found) {
        sheet.appendRow([cfgKey, value]);
      }
    }

    return { success: true, msg: "Đã lưu thiết lập" };
  } catch (e) {
    return { success: false, msg: "Lỗi saveAdminSettings: " + e.message };
  }
}

// ========================================================================
// HÀM 8: showDashboardDialog() — ĐÃ CÓ TRONG v800_server_api.gs
// ========================================================================
// Không tạo lại để tránh lỗi "Function already defined".
// Hàm showDashboardDialog() ở v800_server_api.gs đã được AdminPage.html gọi trực tiếp.
//
// function showDashboardDialog() {
//   var html = HtmlService.createHtmlOutputFromFile('Dashboard')
//     .setWidth(1400).setHeight(900).setTitle('BOD Meeting Dashboard');
//   SpreadsheetApp.getUi().showModalDialog(html, 'BOD Meeting Dashboard');
// }

// ===== MỞ ADMIN PAGE TỪ MENU (hỗ trợ điều hướng) =====
function showAdminPageDialog() {
  var html = HtmlService.createHtmlOutputFromFile("AdminPage")
    .setWidth(1200)
    .setHeight(900);
  SpreadsheetApp.getUi().showModalDialog(html, "Trang Quản Trị — BOD Meeting");
}

// ========================================================================
// WRAPPERS: Khớp tên hàm Dashboard.html frontend gọi
// ========================================================================

/**
 * Wrapper: Dashboard gọi saveApprovalChanges(updates) với JS Array
 * Chuyển sang JSON string rồi gọi saveApprovalFromDashboard()
 */
function saveApprovalChanges(updates) {
  var jsonStr = JSON.stringify(updates);
  return saveApprovalFromDashboard(jsonStr);
}

/**
 * Wrapper: Dashboard gọi showAdminPage()
 * Gọi showAdminPageDialog() đã có
 */
function showAdminPage() {
  return showAdminPageDialog();
}

// ========================================================================
// BOD HOSTING MANAGEMENT
// ========================================================================
var BOD_HOSTING_SHEET = "BOD Hosting";
var BOD_HOSTING_HEADERS = ["Họ tên", "Email", "Từ ngày", "Đến ngày", "Trạng thái", "Ngày cập nhật"];

/**
 * Lấy thông tin BOD Hosting hiện tại + lịch sử
 * @returns {object} {name, email, from, to, history: [{name, email, from, to, status}]}
 */
function getBodHosting() {
  try {
    var sheet = getOrCreateSheet_(BOD_HOSTING_SHEET, BOD_HOSTING_HEADERS);
    var data = sheet.getDataRange().getValues();
    
    var current = null;
    var history = [];
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Skip header row
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var name = (row[0] || "").toString().trim();
      var email = (row[1] || "").toString().trim();
      var fromDate = row[2] ? formatDateToISO_(row[2]) : "";
      var toDate = row[3] ? formatDateToISO_(row[3]) : "";
      var status = (row[4] || "").toString().trim().toLowerCase();
      
      if (!name && !email) continue;
      
      // Determine actual status based on date
      var endDate = toDate ? new Date(toDate) : null;
      var isActive = status === "active" || (endDate && endDate >= today);
      
      if (isActive && !current) {
        current = {name: name, email: email, from: fromDate, to: toDate};
      }
      
      history.push({
        name: name,
        email: email,
        from: fromDate,
        to: toDate,
        status: isActive ? "active" : "expired"
      });
    }
    
    // If no current host found, return config default
    if (!current) {
      var defaultEmail = (typeof CONFIG !== 'undefined' && CONFIG.BOD_HOSTING_DEFAULT) 
        ? CONFIG.BOD_HOSTING_DEFAULT : "letuan@esuhai.com";
      var defaultName = (typeof CONFIG !== 'undefined' && CONFIG.BOD_HOSTING_DEFAULT_NAME)
        ? CONFIG.BOD_HOSTING_DEFAULT_NAME : "Lê Tuấn";
      current = {
        name: defaultName,
        email: defaultEmail,
        from: "",
        to: ""
      };
    }
    
    current.history = history;
    return current;
  } catch (e) {
    Logger.log("getBodHosting error: " + e.message);
    // Luôn trả dữ liệu fallback để Dashboard không bị stuck "Đang tải..."
    var fallbackName = (typeof CONFIG !== 'undefined' && CONFIG.BOD_HOSTING_DEFAULT_NAME)
      ? CONFIG.BOD_HOSTING_DEFAULT_NAME : "Lê Tuấn";
    return {
      name: fallbackName,
      email: "letuan@esuhai.com",
      from: "",
      to: "",
      history: []
    };
  }
}

/**
 * Lưu thông tin BOD Hosting mới
 * Auto-archive host cũ (set expired) khi thêm host mới
 * @param {string} jsonData - JSON: {name, email, from, to}
 * @returns {object} {success, msg}
 */
function saveBodHosting(jsonData) {
  try {
    var data = JSON.parse(jsonData);
    if (!data.name || !data.email) {
      return {success: false, msg: "Thiếu họ tên hoặc email"};
    }
    
    var sheet = getOrCreateSheet_(BOD_HOSTING_SHEET, BOD_HOSTING_HEADERS);
    var allData = sheet.getDataRange().getValues();
    
    // Mark all existing entries as "expired"
    for (var i = 1; i < allData.length; i++) {
      sheet.getRange(i + 1, 5).setValue("expired"); // Column E = status
    }
    
    // Append new hosting entry
    var now = new Date();
    sheet.appendRow([
      data.name,
      data.email,
      data.from || Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd"),
      data.to || "",
      "active",
      Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm")
    ]);
    
    // Also update the config sheet BOD Hosting row
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var configSheet = ss.getSheetByName(CONFIG.SHEET_CONFIG);
    if (configSheet) {
      var configData = configSheet.getDataRange().getValues();
      var found = false;
      for (var j = 0; j < configData.length; j++) {
        var c1 = (configData[j][0] || "").toString().trim().toLowerCase();
        if (c1.includes("bod hosting")) {
          configSheet.getRange(j + 1, 2).setValue(data.email);
          found = true;
          break;
        }
      }
      if (!found) {
        // Add BOD Hosting row to config
        configSheet.appendRow(["BOD Hosting", data.email]);
      }
    }
    
    return {success: true, msg: "Đã lưu BOD Hosting: " + data.name + " (" + data.email + ")"};
  } catch (e) {
    return {success: false, msg: "Lỗi: " + e.message};
  }
}

/**
 * Helper: Convert date value to ISO string (yyyy-MM-dd)
 */
function formatDateToISO_(dateVal) {
  if (!dateVal) return "";
  if (dateVal instanceof Date) {
    var y = dateVal.getFullYear();
    var m = ("0" + (dateVal.getMonth() + 1)).slice(-2);
    var d = ("0" + dateVal.getDate()).slice(-2);
    return y + "-" + m + "-" + d;
  }
  // Already a string
  return dateVal.toString().trim();
}

// ========================================================================
// EMAIL SEND TRACKING — CHỐNG GỬI TRÙNG
// ========================================================================
var EMAIL_LOG_SHEET = "Email Log";
var EMAIL_LOG_HEADERS = ["Thời gian", "Loại email", "Người gửi", "Số lượng", "Chi tiết"];

/**
 * Ghi log khi gửi email thành công
 * @param {string} type - Loại email: reminder, approval_reminder, approval_result, schedule
 * @param {number} count - Số email đã gửi
 * @param {string} detail - Chi tiết (danh sách bộ phận, etc.)
 */
function logEmailSend(type, count, detail) {
  try {
    var sheet = getOrCreateSheet_(EMAIL_LOG_SHEET, EMAIL_LOG_HEADERS);
    var now = new Date();
    var sender = Session.getActiveUser().getEmail() || "system";
    var timeStr = Utilities.formatDate(now, Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");
    
    var typeLabels = {
      'reminder': 'Nhắc đăng ký',
      'bulk_reminder': 'Nhắc hàng loạt',
      'approval_reminder': 'Nhắc phê duyệt',
      'approval_result': 'Kết quả phê duyệt',
      'schedule': 'Gửi lịch trình'
    };
    
    sheet.appendRow([
      timeStr,
      typeLabels[type] || type,
      sender,
      count || 0,
      detail || ""
    ]);
    
    return true;
  } catch(e) {
    Logger.log("Log email send error: " + e.message);
    return false;
  }
}

/**
 * Lấy log gửi email gần đây (để Dashboard hiển thị)
 * @param {string} searchDate - Ngày cần kiểm tra (dd/mm format)
 * @returns {Array} [{time, type, sender, count, detail}]
 */
function getEmailSendLog(searchDate) {
  try {
    var sheet = getOrCreateSheet_(EMAIL_LOG_SHEET, EMAIL_LOG_HEADERS);
    var data = sheet.getDataRange().getValues();
    var logs = [];
    
    // Get logs from last 7 days
    var cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    
    for (var i = data.length - 1; i >= 1; i--) {
      var row = data[i];
      var timeStr = (row[0] || "").toString();
      
      // Parse dd/MM/yyyy HH:mm:ss
      var parts = timeStr.split(" ");
      if (parts.length < 1) continue;
      var dateParts = parts[0].split("/");
      if (dateParts.length !== 3) continue;
      
      var logDate = new Date(dateParts[2], dateParts[1]-1, dateParts[0]);
      if (logDate < cutoff) break; // Stop at old entries
      
      logs.push({
        time: timeStr,
        type: (row[1] || "").toString(),
        sender: (row[2] || "").toString(),
        count: row[3] || 0,
        detail: (row[4] || "").toString()
      });
      
      if (logs.length >= 20) break; // Max 20 recent logs
    }
    
    return logs;
  } catch(e) {
    return [];
  }
}

// ========================================================================
// HÀM 9: LẤY CẤU HÌNH HỆ THỐNG EMAIL (Phương thức gửi, Webhook, Tên gửi)
// ========================================================================
/**
 * Lấy cấu hình hệ thống email từ sheet Settings (key sys_*)
 * @returns {object} {emailMethod, webhookUrl, senderName, senderEmail}
 */
function getSystemConfig() {
  try {
    var sheet = getOrCreateSheet_("Settings", ["Key", "Value"]);
    var data = sheet.getDataRange().getValues();

    // Giá trị mặc định (lấy từ CONFIG trong Mã.js)
    var defaults = {
      emailMethod: "n8n",
      webhookUrl: "https://esuhai.app.n8n.cloud/webhook/bod-send-email",
      senderName: "BTC MEETING BOD - ESUHAIGROUP",
      senderEmail: "ceo.offices@esuhai.com"
    };

    var keyMap = {
      "sys_emailMethod": "emailMethod",
      "sys_webhookUrl": "webhookUrl",
      "sys_senderName": "senderName",
      "sys_senderEmail": "senderEmail"
    };

    var result = {};
    for (var k in defaults) result[k] = defaults[k];

    for (var i = 1; i < data.length; i++) {
      var rowKey = (data[i][0] || "").toString().trim();
      if (rowKey.indexOf("sys_") === 0 && keyMap[rowKey] !== undefined) {
        var val = (data[i][1] || "").toString().trim();
        if (val) result[keyMap[rowKey]] = val;
      }
    }

    return result;
  } catch (e) {
    return { error: "Lỗi getSystemConfig: " + e.message };
  }
}

// ========================================================================
// HÀM 10: LƯU CẤU HÌNH HỆ THỐNG EMAIL
// ========================================================================
/**
 * Lưu cấu hình hệ thống email vào sheet Settings (key sys_*)
 * @param {string} jsonConfig - JSON: {emailMethod, webhookUrl, senderName, senderEmail}
 * @returns {object} {success, msg}
 */
function saveSystemConfig(jsonConfig) {
  try {
    var config = JSON.parse(jsonConfig);
    var sheet = getOrCreateSheet_("Settings", ["Key", "Value"]);

    var fieldToKey = {
      emailMethod: "sys_emailMethod",
      webhookUrl: "sys_webhookUrl",
      senderName: "sys_senderName",
      senderEmail: "sys_senderEmail"
    };

    for (var field in config) {
      if (!fieldToKey[field]) continue;

      var sysKey = fieldToKey[field];
      var value = (config[field] || "").toString();

      var data = sheet.getDataRange().getValues();
      var found = false;
      for (var i = 1; i < data.length; i++) {
        if (data[i][0].toString().trim() === sysKey) {
          sheet.getRange(i + 1, 2).setValue(value);
          found = true;
          break;
        }
      }

      if (!found) {
        sheet.appendRow([sysKey, value]);
      }
    }

    return { success: true, msg: "Đã lưu cấu hình hệ thống" };
  } catch (e) {
    return { success: false, msg: "Lỗi saveSystemConfig: " + e.message };
  }
}

// ========================================================================
// HÀM 1 LẦN: ĐIỀN SẴN CẤU HÌNH VÀO SHEET SETTINGS
// Chạy xong có thể xóa.
// ========================================================================
function prefillSettings() {
  var sheet = getOrCreateSheet_("Settings", ["Key", "Value"]);
  var defaults = [
    ["sys_emailMethod",   "gmail"],
    ["sys_webhookUrl",    "https://esuhai.app.n8n.cloud/webhook/bod-send-email"],
    ["sys_senderName",    "BTC MEETING BOD - ESUHAIGROUP"],
    ["sys_senderEmail",   ""],
    ["sys_sheetUrl",      "https://docs.google.com/spreadsheets/d/1yPDED_EHdaOBjF_lj8vF-DHeRsdXciouJk0uxW_OJxg/edit"],
    ["sys_formUrl",       "https://forms.gle/6Te8MWGqB54drPUp6"],
    ["sys_smtpServer",    "smtp.office365.com"],
    ["sys_smtpPort",      "587"],
    ["sys_smtpEncrypt",   "STARTTLS"],
    ["sys_smtpAccount",   "ceo.offices@esuhai.com"],
  ];

  var data = sheet.getDataRange().getValues();
  var existingKeys = {};
  for (var i = 1; i < data.length; i++) {
    existingKeys[(data[i][0] || "").toString().trim()] = true;
  }

  var count = 0;
  for (var j = 0; j < defaults.length; j++) {
    if (!existingKeys[defaults[j][0]]) {
      sheet.appendRow(defaults[j]);
      count++;
    }
  }

  SpreadsheetApp.getUi().alert("Đã điền " + count + " cấu hình mặc định vào Sheet Settings.");
}
