/**
 * ========================================================================
 * v850_config.js — CẤU HÌNH HỆ THỐNG BOD REGISTRATION
 * ========================================================================
 * Tách từ Mã.js v8.0 — Chứa CONFIG object và loadConfigFromSheet.
 * GAS global scope: tất cả file .js đều chia sẻ cùng namespace.
 * ========================================================================
 */

const CONFIG = {
  SHEET_RESPONSES: "Form Đăng ký",
  SHEET_REVIEW: "Dashboard",
  SHEET_SCHEDULE: "Lịch trình",
  SHEET_DIM_DEPT: "Dim bộ phận",
  SHEET_CONFIG: "Settings",
  SHEET_HR: "Nhân sự bắt buộc",
  HR_COL_DEPT: 4,    // Cột D = Phòng ban (1-indexed)
  HR_COL_EMAIL: 6,   // Cột F = Email (1-indexed)
  HR_COL_NAME: 3,    // Cột C = Tên (1-indexed)
  BTC_FIXED: [
    "vynnl@esuhai.com",
    "minhhieu@esuhai.com",
    "dungntt@esuhai.com",
    "hoangkha@esuhai.com",
  ],
  BOD_HOSTING_DEFAULT: "trucly@esuhai.com",
  N8N_WEBHOOK_URL: "https://esuhai.app.n8n.cloud/webhook/bod-send-email",
  EMAIL_SENDER_NAME: "BTC MEETING BOD - ESUHAIGROUP",
  EMAIL_SENDER_ADDRESS: "",
  EMAIL_METHOD: "n8n",
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
    linkBaoCao: 17,
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

/**
 * Nạp đè cấu hình từ Sheet Settings (do AdminPage quản lý) vào CONFIG.
 * Được gọi đầu mỗi hàm gửi email để đảm bảo cài đặt mới nhất.
 */
function loadConfigFromSheet() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(CONFIG.SHEET_CONFIG);
    if (!sheet) return;
    var data = sheet.getDataRange().getValues();
    var mapping = {
      'sys_webhookUrl':    function(v) { if (v) CONFIG.N8N_WEBHOOK_URL    = v; },
      'sys_emailMethod':   function(v) { if (v) CONFIG.EMAIL_METHOD       = v; },
      'sys_senderName':    function(v) { if (v) CONFIG.EMAIL_SENDER_NAME  = v; },
      'sys_senderEmail':   function(v) { CONFIG.EMAIL_SENDER_ADDRESS = v; },
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
