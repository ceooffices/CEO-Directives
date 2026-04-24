/**
 * lib/manager-map.js
 * Mapping đầu mối → trưởng phòng (email CC tự động)
 * 
 * ⚠️ CẬP NHẬT KHI NHÂN SỰ THAY ĐỔI
 * Dùng chung cho: wf1-approval.js, preview-emails.js
 * 
 * Format: key (lowercase tên hoặc email) → value (email trưởng phòng)
 * 
 * Cập nhật: 2026-04-24 — theo xác nhận anh Kha
 */

const MANAGER_MAP = {
  // MSA — Trưởng phòng: Satomura
  'masuda': 'satomura@esuhai.com',
  'masuda@esuhai.com': 'satomura@esuhai.com',

  // Esutech — Dương Anh Thư → Masuda (→ Satomura)
  'dương anh thư': 'masuda@esuhai.com',

  // MS — Trưởng phòng: Tiến Dũng (dungdt)
  'thanh hiếu': 'dungdt@esuhai.com',
  'huy': 'dungdt@esuhai.com',
  'huy.phamdang@esutech.vn': 'dungdt@esuhai.com',
  'thiện tín': 'dungdt@esuhai.com',

  // MS — Thanh Hà → Thiện Tín (cấp trực tiếp)
  'thanh hà': 'thientin@esuhai.com',
  'thanhha@esuhai.com': 'thientin@esuhai.com',

  // JPC / Prosskils — Trưởng phòng: Xuân Lanh
  'anh thư': 'xuanlanh@esuhai.com',
  'huỳnh thị anh thư': 'xuanlanh@esuhai.com',
  'ngọc hân': 'xuanlanh@esuhai.com',
  'phạm thị ngọc hân': 'xuanlanh@esuhai.com',
  'đăng khoa': 'xuanlanh@esuhai.com',

  // Khác
  'việt': 'vinh@esuhai.com',
};

module.exports = { MANAGER_MAP };
