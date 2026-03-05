/**
 * ========================================================================
 * BOD MEETING V8.2 — EMAIL HTML TEMPLATES
 * ========================================================================
 * Song ngữ Việt–Nhật · Inline CSS only · Max 640px · Gmail/Outlook safe
 *
 * Exports (gọi từ v800_server_api.gs & Ma_v800_complete.gs):
 *   buildReminderEmail(deptName, contactName, reportDate, formUrl)
 *   buildApprovalReminderEmail(reportDate, pendingCount)
 *   buildApprovalResultEmail(recipientName, reportDate, status, content, ghiChu)
 *   buildScheduleEmail(reportDate, scheduleItems)
 * ========================================================================
 */

// =====================================================================
// PRIVATE HELPERS — không gọi trực tiếp từ bên ngoài
// =====================================================================

function _eHdr_(titleVN, titleJP) {
  return '<div style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 60%,#2563eb 100%);padding:28px 32px;">'
    + '<h1 style="margin:0;font-size:20px;font-weight:800;color:#fff;letter-spacing:-.3px;font-family:Arial,sans-serif;">' + titleVN + '</h1>'
    + '<p style="margin:6px 0 0;font-size:12px;color:rgba(255,255,255,.72);font-weight:500;font-family:Arial,sans-serif;">' + titleJP + '</p>'
    + '</div>';
}

function _eFtr_() {
  return '<div style="padding:18px 32px;background:#f1f5f9;border-top:1px solid #e2e8f0;">'
    + '<p style="font-size:11px;color:#94a3b8;margin:0;line-height:1.7;font-family:Arial,sans-serif;">'
    + 'Email tự động từ <strong>BTC Meeting BOD — ESUHAI GROUP</strong><br>'
    + '自動送信メール — BOD会議運営委員会<br>'
    + 'Vui lòng không trả lời email này / このメールに返信しないでください'
    + '</p></div>';
}

function _eWrap_(inner) {
  return '<!DOCTYPE html><html><head><meta charset="UTF-8"></head>'
    + '<body style="margin:0;padding:20px;background:#e8edf2;">'
    + '<div style="max-width:640px;width:100%;margin:0 auto;background:#f8fafc;'
    + 'border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;'
    + 'box-shadow:0 4px 16px rgba(0,0,0,.08);">'
    + inner
    + '</div></body></html>';
}

function _eRow_(label, value, valueColor) {
  return '<tr>'
    + '<td style="color:#64748b;padding:4px 0;width:130px;font-size:13px;vertical-align:top;font-family:Arial,sans-serif;">' + label + '</td>'
    + '<td style="color:' + (valueColor || '#0f172a') + ';font-weight:600;font-size:13px;vertical-align:top;font-family:Arial,sans-serif;">' + value + '</td>'
    + '</tr>';
}

// ========================================================================
// 1. NHẮC NHỞ ĐĂNG KÝ BÁO CÁO
// ========================================================================
/**
 * @param {string} deptName     - Tên bộ phận (VD: "KOKA TEAM")
 * @param {string} contactName  - Tên người nhận (VD: "Nguyễn Văn A")
 * @param {string} reportDate   - Ngày họp hiển thị (VD: "Thứ 2, 10/03/2026")
 * @param {string} formUrl      - URL form đăng ký (bỏ trống nếu không có)
 * @returns {string} HTML string
 */
function buildReminderEmail(deptName, contactName, reportDate, formUrl) {
  var header = _eHdr_('BOD MEETING — NHẮC NHỞ ĐĂNG KÝ BÁO CÁO', 'BOD会議 — 報告登録リマインダー');
  var name = contactName || 'Anh/Chị';

  var body = '<div style="padding:28px 32px;background:#fff;">'
    + '<p style="font-size:15px;font-weight:700;color:#0f172a;margin:0 0 3px;font-family:Arial,sans-serif;">Kính gửi ' + name + ' — ' + deptName + ',</p>'
    + '<p style="font-size:12px;color:#94a3b8;margin:0 0 20px;font-family:Arial,sans-serif;">' + (contactName || deptName) + ' 様</p>'

    + '<div style="font-size:14px;line-height:1.75;color:#334155;margin-bottom:14px;font-family:Arial,sans-serif;">'
    + '<p style="margin:0 0 10px;">Bộ phận <strong>' + deptName + '</strong> chưa gửi đăng ký báo cáo cho cuộc họp BOD ngày <strong>' + reportDate + '</strong>.</p>'
    + '<p style="margin:0 0 10px;">Kính mời Anh/Chị hoàn tất đăng ký trước <strong>17:00 Thứ Năm</strong> để BTC kịp tổng hợp lịch trình.</p>'
    + '</div>'

    + '<div style="font-size:12px;line-height:1.65;color:#64748b;margin-bottom:20px;padding:10px 14px;background:#f8fafc;border-radius:8px;border-left:3px solid #3b82f6;font-family:Arial,sans-serif;">'
    + deptName + 'より、次回BOD会議への発表登録がまだ送信されていません。木曜日17:00までにご登録ください。'
    + '</div>'

    + '<div style="background:#eff6ff;border-radius:10px;padding:14px 18px;margin:0 0 22px;">'
    + '<p style="font-size:11px;font-weight:700;color:#1e40af;margin:0 0 8px;font-family:Arial,sans-serif;">THÔNG TIN CUỘC HỌP</p>'
    + '<table style="border-collapse:collapse;width:100%;">'
    + _eRow_('Ngày họp:', reportDate)
    + _eRow_('Giờ bắt đầu:', '08:30')
    + _eRow_('Hạn đăng ký:', 'Thứ Năm, 17:00', '#dc2626')
    + '</table></div>'

    + (formUrl ? '<div style="text-align:center;margin-bottom:4px;">'
      + '<a href="' + formUrl + '" style="display:inline-block;padding:12px 30px;background:#2563eb;color:#fff;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;font-family:Arial,sans-serif;">Đăng ký ngay</a>'
      + '</div>' : '')
    + '</div>';

  return _eWrap_(header + body + _eFtr_());
}

// ========================================================================
// 2. NHẮC PHÊ DUYỆT NỘI DUNG
// ========================================================================
/**
 * @param {string} reportDate   - Ngày họp
 * @param {number} pendingCount - Số đăng ký chờ duyệt
 * @returns {string} HTML string
 */
function buildApprovalReminderEmail(reportDate, pendingCount) {
  var header = _eHdr_('BOD MEETING — NHẮC PHÊ DUYỆT NỘI DUNG', 'BOD会議 — 承認リマインダー');

  var body = '<div style="padding:28px 32px;background:#fff;">'
    + '<p style="font-size:15px;font-weight:700;color:#0f172a;margin:0 0 3px;font-family:Arial,sans-serif;">Kính gửi Ban Tổ Chức,</p>'
    + '<p style="font-size:12px;color:#94a3b8;margin:0 0 20px;font-family:Arial,sans-serif;">運営委員会 御中</p>'

    + '<div style="font-size:14px;line-height:1.75;color:#334155;margin-bottom:14px;font-family:Arial,sans-serif;">'
    + '<p style="margin:0 0 10px;">Hiện có <strong style="color:#dc2626;font-size:16px;">' + pendingCount + ' đăng ký</strong> báo cáo đang chờ phê duyệt.</p>'
    + '<p style="margin:0 0 10px;">Kính mời Anh/Chị xem xét và hoàn tất phê duyệt trước <strong>17:00 Thứ Sáu</strong>.</p>'
    + '</div>'

    + '<div style="font-size:12px;line-height:1.65;color:#64748b;margin-bottom:20px;padding:10px 14px;background:#f8fafc;border-radius:8px;border-left:3px solid #f59e0b;font-family:Arial,sans-serif;">'
    + '次のBOD会議に向けて' + pendingCount + '件の発表登録が承認待ちです。金曜日17:00までに承認をお願いします。'
    + '</div>'

    + '<div style="background:#fefce8;border-radius:10px;padding:14px 18px;border:1px solid #fde68a;">'
    + '<p style="font-size:11px;font-weight:700;color:#92400e;margin:0 0 8px;font-family:Arial,sans-serif;">TÌNH TRẠNG PHÊ DUYỆT</p>'
    + '<table style="border-collapse:collapse;width:100%;">'
    + _eRow_('Ngày họp:', reportDate)
    + _eRow_('Chờ phê duyệt:', pendingCount + ' mục', '#dc2626')
    + _eRow_('Hạn phê duyệt:', 'Thứ Sáu, 17:00', '#dc2626')
    + '</table></div>'
    + '</div>';

  return _eWrap_(header + body + _eFtr_());
}

// ========================================================================
// 3. KẾT QUẢ PHÊ DUYỆT
// ========================================================================
/**
 * @param {string} recipientName - Tên người nhận
 * @param {string} reportDate    - Ngày họp
 * @param {string} status        - "Duyệt" | "Từ chối" | "Hoãn"
 * @param {string} content       - Nội dung đăng ký
 * @param {string} ghiChu        - Ghi chú từ BOD (có thể rỗng)
 * @returns {string} HTML string
 */
function buildApprovalResultEmail(recipientName, reportDate, status, content, ghiChu) {
  var statusMap = {
    'Duyệt':   { color: '#10b981', bg: '#ecfdf5', border: '#6ee7b7', labelVN: 'ĐÃ DUYỆT',  labelJP: '承認済み', icon: '&#10003;' },
    'Từ chối': { color: '#ef4444', bg: '#fef2f2', border: '#fca5a5', labelVN: 'TỪ CHỐI',   labelJP: '不承認',   icon: '&#10007;' },
    'Hoãn':    { color: '#8b5cf6', bg: '#f5f3ff', border: '#c4b5fd', labelVN: 'HOÃN LẠI',  labelJP: '保留',     icon: '&#8759;'  }
  };
  var s = statusMap[status] || {
    color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1',
    labelVN: status, labelJP: status, icon: '&#8212;'
  };

  var header = _eHdr_('BOD MEETING — KẾT QUẢ PHÊ DUYỆT', 'BOD会議 — 承認結果通知');

  var body = '<div style="padding:28px 32px;background:#fff;">'
    + '<p style="font-size:15px;font-weight:700;color:#0f172a;margin:0 0 3px;font-family:Arial,sans-serif;">Kính gửi ' + (recipientName || 'Anh/Chị') + ',</p>'
    + '<p style="font-size:12px;color:#94a3b8;margin:0 0 20px;font-family:Arial,sans-serif;">' + (recipientName || '') + ' 様</p>'

    // Status badge
    + '<div style="text-align:center;margin:0 0 22px;">'
    + '<div style="display:inline-block;padding:16px 28px;background:' + s.bg + ';border-radius:12px;border:2px solid ' + s.border + ';">'
    + '<div style="font-size:30px;color:' + s.color + ';font-weight:900;line-height:1;">' + s.icon + '</div>'
    + '<div style="font-size:17px;font-weight:800;color:' + s.color + ';margin-top:4px;font-family:Arial,sans-serif;">' + s.labelVN + '</div>'
    + '<div style="font-size:11px;color:' + s.color + ';opacity:.75;margin-top:2px;font-family:Arial,sans-serif;">' + s.labelJP + '</div>'
    + '</div></div>'

    + '<div style="font-size:14px;line-height:1.75;color:#334155;margin-bottom:14px;font-family:Arial,sans-serif;">'
    + '<p style="margin:0 0 10px;">BTC Meeting BOD xin thông báo kết quả phê duyệt nội dung đăng ký báo cáo của Anh/Chị cho cuộc họp BOD ngày <strong>' + reportDate + '</strong>.</p>'
    + '</div>'

    + '<div style="font-size:12px;line-height:1.65;color:#64748b;margin-bottom:20px;padding:10px 14px;background:#f8fafc;border-radius:8px;border-left:3px solid ' + s.color + ';font-family:Arial,sans-serif;">'
    + 'BOD会議運営委員会より、ご登録いただいた発表申請の審査結果をお知らせします。'
    + '</div>'

    + '<div style="background:' + s.bg + ';border-radius:10px;padding:14px 18px;border:1px solid ' + s.border + ';">'
    + '<p style="font-size:11px;font-weight:700;color:' + s.color + ';margin:0 0 8px;font-family:Arial,sans-serif;">CHI TIẾT ĐĂNG KÝ</p>'
    + '<table style="border-collapse:collapse;width:100%;">'
    + _eRow_('Ngày họp:', reportDate)
    + _eRow_('Nội dung:', (content || ''))
    + _eRow_('Kết quả:', s.labelVN, s.color)
    + (ghiChu ? _eRow_('Ghi chú BOD:', ghiChu) : '')
    + '</table></div>'
    + '</div>';

  return _eWrap_(header + body + _eFtr_());
}

// ========================================================================
// 4. LỊCH TRÌNH CUỘC HỌP
// ========================================================================
/**
 * @param {string} reportDate    - Ngày họp hiển thị
 * @param {Array}  scheduleItems - [{stt, time, content, presenter, tlTB, tlCD}, ...]
 * @returns {string} HTML string
 */
function buildScheduleEmail(reportDate, scheduleItems) {
  var header = _eHdr_('BOD MEETING — LỊCH TRÌNH CUỘC HỌP', 'BOD会議 — 議事スケジュール');
  var items = scheduleItems || [];

  var rows = '';
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    var bg = i % 2 === 0 ? '#fff' : '#f8fafc';
    rows += '<tr style="background:' + bg + ';">'
      + '<td style="padding:8px 10px;text-align:center;color:#64748b;font-size:12px;border-bottom:1px solid #f1f5f9;">' + (it.stt || i + 1) + '</td>'
      + '<td style="padding:8px 10px;text-align:center;color:#1e40af;font-weight:700;font-size:13px;border-bottom:1px solid #f1f5f9;white-space:nowrap;">' + (it.time || '') + '</td>'
      + '<td style="padding:8px 10px;color:#0f172a;font-size:13px;border-bottom:1px solid #f1f5f9;">' + (it.content || '') + '</td>'
      + '<td style="padding:8px 10px;color:#334155;font-size:12px;border-bottom:1px solid #f1f5f9;">' + (it.presenter || '') + '</td>'
      + '<td style="padding:8px 10px;text-align:center;color:#64748b;font-size:12px;border-bottom:1px solid #f1f5f9;">' + (it.tlTB || '') + '</td>'
      + '<td style="padding:8px 10px;text-align:center;color:#64748b;font-size:12px;border-bottom:1px solid #f1f5f9;">' + (it.tlCD || '') + '</td>'
      + '</tr>';
  }
  if (!rows) {
    rows = '<tr><td colspan="6" style="padding:16px;text-align:center;color:#94a3b8;font-size:13px;font-family:Arial,sans-serif;">Chưa có nội dung lịch trình</td></tr>';
  }

  var body = '<div style="padding:28px 32px;background:#fff;">'
    + '<p style="font-size:15px;font-weight:700;color:#0f172a;margin:0 0 3px;font-family:Arial,sans-serif;">Kính gửi toàn thể thành viên BOD,</p>'
    + '<p style="font-size:12px;color:#94a3b8;margin:0 0 20px;font-family:Arial,sans-serif;">BODメンバー各位</p>'

    + '<div style="font-size:14px;line-height:1.75;color:#334155;margin-bottom:14px;font-family:Arial,sans-serif;">'
    + '<p style="margin:0 0 10px;">BTC Meeting BOD trân trọng gửi lịch trình cuộc họp chính thức. Kính mời Anh/Chị chuẩn bị nội dung theo đúng thứ tự và thời lượng đã phân bổ.</p>'
    + '</div>'

    + '<div style="font-size:12px;line-height:1.65;color:#64748b;margin-bottom:20px;padding:10px 14px;background:#f8fafc;border-radius:8px;border-left:3px solid #3b82f6;font-family:Arial,sans-serif;">'
    + '次回BOD会議の公式スケジュールです。担当者は割り当て時間内での発表をお願いします。'
    + '</div>'

    + '<div style="background:#eff6ff;border-radius:10px;padding:14px 18px;margin:0 0 20px;">'
    + '<table style="border-collapse:collapse;width:100%;">'
    + _eRow_('Ngày họp:', reportDate)
    + _eRow_('Giờ bắt đầu:', '08:30')
    + _eRow_('Số mục:', items.length + ' nội dung')
    + '</table></div>'

    + '<div style="overflow-x:auto;border-radius:8px;border:1px solid #e2e8f0;">'
    + '<table style="width:100%;border-collapse:collapse;min-width:500px;">'
    + '<thead><tr style="background:#4472c4;">'
    + '<th style="padding:9px 10px;color:#fff;font-size:11px;font-weight:700;text-align:center;width:32px;font-family:Arial,sans-serif;">STT</th>'
    + '<th style="padding:9px 10px;color:#fff;font-size:11px;font-weight:700;text-align:center;width:50px;font-family:Arial,sans-serif;">GIỜ</th>'
    + '<th style="padding:9px 10px;color:#fff;font-size:11px;font-weight:700;text-align:left;font-family:Arial,sans-serif;">NỘI DUNG</th>'
    + '<th style="padding:9px 10px;color:#fff;font-size:11px;font-weight:700;text-align:left;font-family:Arial,sans-serif;">TRÌNH BÀY</th>'
    + '<th style="padding:9px 10px;color:#fff;font-size:11px;font-weight:700;text-align:center;width:36px;font-family:Arial,sans-serif;">TB</th>'
    + '<th style="padding:9px 10px;color:#fff;font-size:11px;font-weight:700;text-align:center;width:36px;font-family:Arial,sans-serif;">CĐ</th>'
    + '</tr></thead>'
    + '<tbody>' + rows + '</tbody>'
    + '</table></div>'
    + '</div>';

  return _eWrap_(header + body + _eFtr_());
}
