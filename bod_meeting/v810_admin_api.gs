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
  SpreadsheetApp.getUi().showModalDialog(html, "BOD Admin Page V8.1");
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
