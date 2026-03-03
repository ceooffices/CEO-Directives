/**
 * ========================================================================
 * BOD REGISTRATION SYSTEM - VERSION 7.8.2
 * ========================================================================
 * Version: 7.8.2
 * Updated: 24/01/2026
 * Author: ClaudeK for Anh Kha
 *
 * CHANGES từ V7.8.1:
 * ✅ ANTI-SPAM: Thêm cột Q "Đã gửi email" để track
 * ✅ Chỉ gửi email cho người CHƯA NHẬN (cột Q trống)
 * ✅ Tự động đánh dấu timestamp khi gửi thành công
 * ✅ Menu mới: "🔄 Reset trạng thái gửi email" (nếu cần gửi lại)
 *
 * CHANGES từ V7.8:
 * ✅ FIX: Validate email trước khi gửi
 * ✅ FIX: Delay 500ms giữa các email để tránh Gmail rate limit
 * ✅ FIX: Validate email liên quan (cột G) trước khi CC
 *
 * CẤU TRÚC CỘT FORM ĐĂNG KÝ (A-Q):
 * A: Dấu thời gian (Timestamp)
 * B: Nội dung báo cáo
 * C: Thời lượng trình bày
 * D: Cần QĐ từ BOD?
 * E: QĐ gì?
 * F: Tham gia (Online/Offline)
 * G: Email người liên quan (multiselect)
 * H: Ngày họp
 * I: Họ và Tên
 * J: Email Công ty
 * K: Bộ phận
 * L: Trạng thái
 * M: Thứ tự
 * N: Ghi chú BOD
 * O: Thời lượng chỉ đạo (auto fill)
 * P: Tên cá nhân liên quan (auto lookup từ G)
 * Q: Đã gửi email (MỚI - anti-spam tracking)
 *
 * ========================================================================
 * BACKUP - KHÔNG CHỈNH SỬA FILE NÀY
 * ========================================================================
 */

// [V7.8.2 ORIGINAL CODE - SAVED AS BACKUP]
// Full source code đã được lưu nguyên bản từ user.
// Xem Code_v800.gs để sử dụng version mới nhất.
