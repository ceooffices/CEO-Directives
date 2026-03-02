/**
 * ========================================================================
 * FIX DASHBOARD - V7.8.2 PATCH
 * ========================================================================
 * Mục tiêu: Sửa lỗi Dashboard hiển thị ngày cũ
 * Phạm vi: Tab Dashboard - dòng 8-11 (4 tuần tới) + dòng 15-33 (Theo Bộ Phận)
 * 
 * NGUYÊN NHÂN:
 * 1. Dòng 8-11: Ngày ở cột A là giá trị tĩnh cũ (01/2026)
 *    Formulas ở B-F hardcode ngày "12/01", "19/01"... 
 * 2. Dòng 15-33: Formulas tham chiếu $D$13 (đang chứa header "Từ chối")
 *    → kết quả luôn = 0
 * 
 * GIẢI PHÁP:
 * - Auto tính 4 thứ Hai tới từ TODAY()
 * - Formulas ở B-F tự động trích xuất ngày từ cột A
 * - Phần "Theo Bộ Phận" tham chiếu $A$8 (tuần gần nhất)
 * ========================================================================
 */


/**
 * FUNCTION CHÍNH: Refresh toàn bộ Dashboard
 * Thêm vào menu hoặc chạy trực tiếp
 */
function refreshDashboard() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dashboard = ss.getSheetByName('Dashboard');
  const ui = SpreadsheetApp.getUi();
  
  if (!dashboard) {
    ui.alert('❌ Không tìm thấy tab "Dashboard"!');
    return;
  }
  
  // ========== BƯỚC 1: Cập nhật 4 thứ Hai tới (Dòng 8-11) ==========
  const mondays = getNext4MondaysFromToday();
  
  for (let i = 0; i < 4; i++) {
    const rowNum = 8 + i;
    const monday = mondays[i];
    
    // Cột A: Ngày họp (format: "Thứ 2, DD/MM/YYYY")
    dashboard.getRange(rowNum, 1).setValue(monday.label);
    
    // Cột B: Tổng đăng ký cho ngày đó
    // Dùng MID để trích xuất DD/MM từ cột A (vị trí 8, dài 5 ký tự trong "Thứ 2, DD/MM/YYYY")
    const searchStr = monday.search; // DD/MM
    
    dashboard.getRange(rowNum, 2).setFormula(
      '=SUMPRODUCT((ISNUMBER(SEARCH("' + searchStr + '";TEXT(\'Form Đăng ký\'!H:H;"DD/MM"))))*1)'
    );
    
    // Cột C: Duyệt
    dashboard.getRange(rowNum, 3).setFormula(
      '=SUMPRODUCT((ISNUMBER(SEARCH("' + searchStr + '";TEXT(\'Form Đăng ký\'!H:H;"DD/MM"))))*' +
      '(\'Form Đăng ký\'!L:L="Duyệt")*1)'
    );
    
    // Cột D: Từ chối
    dashboard.getRange(rowNum, 4).setFormula(
      '=SUMPRODUCT((ISNUMBER(SEARCH("' + searchStr + '";TEXT(\'Form Đăng ký\'!H:H;"DD/MM"))))*' +
      '(\'Form Đăng ký\'!L:L="Từ chối")*1)'
    );
    
    // Cột E: Hoãn
    dashboard.getRange(rowNum, 5).setFormula(
      '=SUMPRODUCT((ISNUMBER(SEARCH("' + searchStr + '";TEXT(\'Form Đăng ký\'!H:H;"DD/MM"))))*' +
      '(\'Form Đăng ký\'!L:L="Hoãn")*1)'
    );
    
    // Cột F: Chờ (= Tổng - Duyệt - Từ chối - Hoãn)
    dashboard.getRange(rowNum, 6).setFormula(
      '=B' + rowNum + '-C' + rowNum + '-D' + rowNum + '-E' + rowNum
    );
  }
  
  // ========== BƯỚC 2: Fix headers dòng 7 và 14 ==========
  // Header "4 tuần tới"
  const headers7 = ['Ngày họp', 'Tổng', 'Duyệt', 'Từ chối', 'Hoãn', 'Chờ'];
  dashboard.getRange(7, 1, 1, 6).setValues([headers7]);
  
  // Header "Theo bộ phận" - FIX cột E bị nhầm thành "D13"
  const headers14 = ['Bộ phận', 'Tổng', 'Duyệt', 'Từ chối', 'Hoãn', 'Chờ'];
  dashboard.getRange(14, 1, 1, 6).setValues([headers14]);
  
  // ========== BƯỚC 3: Fix phần "Theo Bộ Phận" (Dòng 15-33) ==========
  // Tìm tuần tới gần nhất có dữ liệu, nếu không có thì dùng tuần đầu tiên
  const firstMonday = mondays[0];
  refreshDeptStats(dashboard, firstMonday.search);
  
  // ========== BƯỚC 4: Cập nhật timestamp ==========
  const now = new Date();
  const timestamp = Utilities.formatDate(now, 'Asia/Ho_Chi_Minh', 'HH:mm:ss d/M/yyyy');
  dashboard.getRange(36, 5).setValue('Cập nhật: ' + timestamp);
  
  // ========== BƯỚC 5: Highlight tuần tới ==========
  try {
    highlightUpcomingWeekDashboard();
  } catch (e) {
    Logger.log('Highlight failed: ' + e.message);
  }
  
  ui.alert('✅ Dashboard đã được cập nhật!\n\n' +
    '📅 4 tuần tới:\n' +
    '   • ' + mondays[0].label + '\n' +
    '   • ' + mondays[1].label + '\n' +
    '   • ' + mondays[2].label + '\n' +
    '   • ' + mondays[3].label + '\n\n' +
    '🏢 Bộ phận: Filter theo ' + firstMonday.label + '\n\n' +
    '⏰ Cập nhật lúc: ' + timestamp);
}


/**
 * Tính 4 thứ Hai SẮP TỚI từ hôm nay
 * Nếu hôm nay là thứ Hai → tính từ thứ Hai TUẦN SAU
 * (vì tuần này đã qua rồi)
 */
function getNext4MondaysFromToday() {
  const mondays = [];
  const today = new Date();
  const day = today.getDay(); // 0=CN, 1=T2, ..., 6=T7
  
  // Tính thứ Hai đầu tiên sắp tới
  let daysUntilMonday;
  if (day === 0) {
    daysUntilMonday = 1; // Chủ nhật → ngày mai là T2
  } else if (day === 1) {
    daysUntilMonday = 7; // Thứ 2 → tuần sau
  } else {
    daysUntilMonday = 8 - day; // Các ngày khác → T2 tới
  }
  
  let nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + daysUntilMonday);
  
  for (let i = 0; i < 4; i++) {
    const d = nextMonday.getDate().toString().padStart(2, '0');
    const m = (nextMonday.getMonth() + 1).toString().padStart(2, '0');
    const y = nextMonday.getFullYear();
    
    mondays.push({
      label: 'Thứ 2, ' + d + '/' + m + '/' + y,
      search: d + '/' + m,
      date: new Date(nextMonday)
    });
    
    nextMonday = new Date(nextMonday);
    nextMonday.setDate(nextMonday.getDate() + 7);
  }
  
  return mondays;
}


/**
 * Refresh phần "Theo Bộ Phận" (dòng 15-33)
 * Filter theo ngày tìm kiếm (DD/MM) của tuần gần nhất
 */
function refreshDeptStats(dashboard, searchStr) {
  // Danh sách bộ phận (dòng 15-33)
  const deptRows = {
    15: 'BOD',
    16: 'KOKA TEAM',
    17: 'IDS',
    18: 'MSA',
    19: 'JPC',
    20: 'KAIZEN',
    21: 'BAN CỐ VẤN',
    22: 'BAN ĐỐI NGOẠI',
    23: 'HR',
    24: 'TÀI CHÍNH KẾ TOÁN',
    25: 'TỔNG HỢP',
    26: 'ALESU',
    27: 'PROSKILLS',
    28: 'ESUTECH',
    29: 'ESUWORKS',
    30: 'ESUWELL',
    31: 'PHÁP CHẾ',
    32: 'BAN TRỢ LÝ',
    33: 'GATE AWARDS'
  };
  
  for (const [rowStr, deptName] of Object.entries(deptRows)) {
    const row = parseInt(rowStr);
    
    // Cột A: Tên bộ phận (giữ nguyên)
    // Cột B: Tổng
    dashboard.getRange(row, 2).setFormula(
      '=SUMPRODUCT((ISNUMBER(SEARCH("' + searchStr + '";TEXT(\'Form Đăng ký\'!H:H;"DD/MM"))))*' +
      '(UPPER(\'Form Đăng ký\'!K:K)="' + deptName.toUpperCase() + '")*1)'
    );
    
    // Cột C: Duyệt
    dashboard.getRange(row, 3).setFormula(
      '=SUMPRODUCT((ISNUMBER(SEARCH("' + searchStr + '";TEXT(\'Form Đăng ký\'!H:H;"DD/MM"))))*' +
      '(UPPER(\'Form Đăng ký\'!K:K)="' + deptName.toUpperCase() + '")*' +
      '(\'Form Đăng ký\'!L:L="Duyệt")*1)'
    );
    
    // Cột D: Từ chối
    dashboard.getRange(row, 4).setFormula(
      '=SUMPRODUCT((ISNUMBER(SEARCH("' + searchStr + '";TEXT(\'Form Đăng ký\'!H:H;"DD/MM"))))*' +
      '(UPPER(\'Form Đăng ký\'!K:K)="' + deptName.toUpperCase() + '")*' +
      '(\'Form Đăng ký\'!L:L="Từ chối")*1)'
    );
    
    // Cột E: Hoãn
    dashboard.getRange(row, 5).setFormula(
      '=SUMPRODUCT((ISNUMBER(SEARCH("' + searchStr + '";TEXT(\'Form Đăng ký\'!H:H;"DD/MM"))))*' +
      '(UPPER(\'Form Đăng ký\'!K:K)="' + deptName.toUpperCase() + '")*' +
      '(\'Form Đăng ký\'!L:L="Hoãn")*1)'
    );
    
    // Cột F: Chờ
    dashboard.getRange(row, 6).setFormula(
      '=B' + row + '-C' + row + '-D' + row + '-E' + row
    );
  }
}


/**
 * MENU ITEM MỚI: Thêm vào onOpen
 * Copy đoạn này vào function onOpen() hiện tại
 */
function addRefreshDashboardToMenu() {
  // Thêm dòng sau vào menu trong onOpen():
  // .addItem('🔄 Refresh Dashboard (Fix ngày)', 'refreshDashboard')
  
  // Hoặc thay thế toàn bộ onOpen bằng version bên dưới
  Logger.log('Xem hướng dẫn trong comment của function này');
}


// ========================================================================
// HƯỚNG DẪN SỬ DỤNG
// ========================================================================
// 
// CÁCH 1: Chạy trực tiếp
// 1. Mở Apps Script (Extensions → Apps Script)
// 2. Paste toàn bộ code này vào cuối file hiện tại
// 3. Chọn function "refreshDashboard" từ dropdown
// 4. Nhấn Run (▶)
// 5. Cấp quyền nếu được yêu cầu
//
// CÁCH 2: Thêm vào menu BOD Tools
// Trong function onOpen(), thêm dòng:
//   .addItem('🔄 Refresh Dashboard (Fix ngày)', 'refreshDashboard')
// Sau đó reload sheet, vào menu BOD Tools → Refresh Dashboard
//
// CÁCH 3: Auto refresh khi mở sheet
// Trong function onOpen(), thêm:
//   try { refreshDashboard(); } catch(e) { Logger.log(e); }
// (Thay cho highlightUpcomingWeekDashboard cũ)
//
// ========================================================================
