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
  return (
    '<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#0f172a" style="background-color:#0f172a;padding:20px 16px;">' +
    '<h1 style="margin:0;font-size:18px;font-weight:800;color:#fff;letter-spacing:-.3px;font-family:Segoe UI,Roboto,Hiragino Sans,Noto Sans JP,Arial,sans-serif;">' +
    titleVN +
    "</h1>" +
    '<p style="margin:6px 0 0;font-size:12px;color:rgba(255,255,255,.72);font-weight:500;font-family:Segoe UI,Roboto,Hiragino Sans,Noto Sans JP,Arial,sans-serif;">' +
    titleJP +
    "</p>" +
    "</td></tr></table>"
  );
}

function _eFtr_(isJp) {
  return (
    '<div style="padding:14px 16px;background:#f1f5f9;border-top:1px solid #e2e8f0;">' +
    '<p style="font-size:12px;color:#94a3b8;margin:0;line-height:1.7;font-family:Segoe UI,Roboto,Hiragino Sans,Noto Sans JP,Arial,sans-serif;">' +
    "Email tự động từ <strong>BTC Meeting BOD — ESUHAI GROUP</strong><br>" +
    (isJp ? "自動送信メール — BOD会議運営委員会<br>" : "") +
    "Vui lòng không trả lời email này" +
    (isJp ? " / このメールに返信しないでください" : "") +
    "</p></div>"
  );
}

function _eWrap_(inner) {
  return (
    '<!DOCTYPE html><html><head><meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1.0">' +
    '</head>' +
    '<body style="margin:0;padding:12px;background:#e8edf2;">' +
    '<div style="max-width:640px;width:100%;margin:0 auto;background:#f8fafc;' +
    "border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;" +
    'box-shadow:0 4px 16px rgba(0,0,0,.08);">' +
    inner +
    "</div></body></html>"
  );
}

function _eRow_(label, value, valueColor) {
  return (
    "<tr>" +
    '<td style="color:#64748b;padding:4px 0;width:40%;max-width:130px;font-size:13px;vertical-align:top;font-family:Segoe UI,Roboto,Hiragino Sans,Noto Sans JP,Arial,sans-serif;">' +
    label +
    "</td>" +
    '<td style="color:' +
    (valueColor || "#0f172a") +
    ';font-weight:600;font-size:13px;vertical-align:top;font-family:Segoe UI,Roboto,Hiragino Sans,Noto Sans JP,Arial,sans-serif;">' +
    value +
    "</td>" +
    "</tr>"
  );
}

// =====================================================================
// PRIVATE: Lịch sử đăng ký 4 tuần gần nhất của 1 bộ phận
// Content Bible v9.0 — Section 11.3
// =====================================================================
/**
 * @param {string} deptName - Tên bộ phận (VD: "KOKA TEAM")
 * @returns {Object} { weeks: [{date,label,status}], missedWeeks, registered, total, month }
 */
function _getDeptHistory_(deptName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_RESPONSES);
  var result = {
    weeks: [],
    missedWeeks: 0,
    registered: 0,
    total: 0,
    month: "",
  };
  if (!sheet) return result;

  // Tính 4 thứ Hai gần nhất (tính ngược từ hôm nay)
  var today = new Date();
  var mondays = [];
  // Tìm thứ Hai tuần này
  var d = new Date(today);
  d.setHours(0, 0, 0, 0);
  var dayOfWeek = d.getDay();
  var diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Nếu CN thì lùi 6, còn lại lùi (day-1)
  d.setDate(d.getDate() - diff);
  for (var i = 0; i < 4; i++) {
    var mon = new Date(d);
    mon.setDate(mon.getDate() - i * 7);
    mondays.push(mon);
  }
  mondays.reverse(); // tuần xa nhất trước

  // Lấy tháng hiện tại
  var m = today.getMonth() + 1;
  var y = today.getFullYear();
  result.month = (m < 10 ? "0" : "") + m + "/" + y;

  // Đọc data từ sheet
  var data = sheet.getDataRange().getValues();
  var colBP = CONFIG.COLUMN_MAP.boPhan; // 10 = cột K
  var colDate = CONFIG.COLUMN_MAP.ngayHop; // 7 = cột H

  // Tạo set ngày đã đăng ký cho bộ phận này
  var registeredDates = {};
  for (var r = 1; r < data.length; r++) {
    var rowDept = (data[r][colBP] || "").toString().trim().toUpperCase();
    if (rowDept !== deptName.toUpperCase()) continue;
    var rowDate = data[r][colDate];
    if (rowDate instanceof Date) {
      var key =
        rowDate.getFullYear() +
        "-" +
        (rowDate.getMonth() + 1) +
        "-" +
        rowDate.getDate();
      registeredDates[key] = true;
    } else if (typeof rowDate === "string" && rowDate) {
      // Thử parse string date
      var parts = rowDate.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (parts) {
        var key2 =
          parseInt(parts[3]) +
          "-" +
          parseInt(parts[2]) +
          "-" +
          parseInt(parts[1]);
        registeredDates[key2] = true;
      }
    }
  }

  // Check từng tuần
  var missed = 0;
  var reg = 0;
  for (var w = 0; w < mondays.length; w++) {
    var mon = mondays[w];
    var key =
      mon.getFullYear() + "-" + (mon.getMonth() + 1) + "-" + mon.getDate();
    var dd = (mon.getDate() < 10 ? "0" : "") + mon.getDate();
    var mm = (mon.getMonth() + 1 < 10 ? "0" : "") + (mon.getMonth() + 1);
    var label = dd + "/" + mm;
    var isCurrentWeek = w === mondays.length - 1;

    if (registeredDates[key]) {
      result.weeks.push({
        date: mon,
        label: label,
        status: "registered",
        isCurrentWeek: isCurrentWeek,
      });
      reg++;
    } else {
      result.weeks.push({
        date: mon,
        label: label,
        status: "missed",
        isCurrentWeek: isCurrentWeek,
      });
      missed++;
    }
  }

  result.missedWeeks = missed;
  result.registered = reg;
  result.total = mondays.length;
  return result;
}

/**
 * Render HTML bảng thống kê 4 tuần — inline CSS, email-safe
 * @param {string} deptName
 * @param {Object} history - output từ _getDeptHistory_
 * @returns {string} HTML string (rỗng nếu không cần hiện)
 */
function _buildHistoryTable_(deptName, history) {
  if (!history || history.missedWeeks < 1) return "";

  var rows = "";
  for (var i = 0; i < history.weeks.length; i++) {
    var w = history.weeks[i];
    var arrow = w.isCurrentWeek ? "► " : "";
    var weekLabel = w.isCurrentWeek ? "Tuần này" : "Tuần";
    var weekLabelJP = w.isCurrentWeek ? "今週" : "";

    var statusVN, statusJP, statusColor;
    if (w.status === "registered") {
      statusVN = "✓ Đã đăng ký";
      statusJP = "登録済み";
      statusColor = "#10b981";
    } else {
      statusVN = "✗ Chưa đăng ký";
      statusJP = "未登録";
      statusColor = "#ef4444";
    }

    rows +=
      "<tr>" +
      '<td style="padding:6px 10px;font-size:14px;color:#334155;border-bottom:1px solid #e2e8f0;font-family:Segoe UI,Roboto,Hiragino Sans,Noto Sans JP,Arial,sans-serif;">' +
      arrow +
      weekLabel +
      " " +
      w.label +
      (weekLabelJP ? " (" + weekLabelJP + ")" : "") +
      "</td>" +
      '<td style="padding:6px 10px;font-size:14px;color:' +
      statusColor +
      ';font-weight:600;border-bottom:1px solid #e2e8f0;font-family:Segoe UI,Roboto,Hiragino Sans,Noto Sans JP,Arial,sans-serif;">' +
      statusVN +
      "</td></tr>";
  }

  // Dòng tổng kết — màu theo tỷ lệ
  var pct = history.total > 0 ? (history.registered / history.total) * 100 : 0;
  var summaryColor = pct >= 75 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444";

  return (
    '<div style="margin:16px 0;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0;">' +
    '<div style="padding:8px 14px;background:#f8fafc;border-bottom:1px solid #e2e8f0;">' +
    '<span style="font-size:12px;font-weight:700;color:#334155;font-family:Segoe UI,Roboto,Hiragino Sans,Noto Sans JP,Arial,sans-serif;">TÌNH HÌNH ĐĂNG KÝ — ' +
    deptName +
    "</span>" +
    '<span style="font-size:10px;color:#94a3b8;margin-left:8px;font-family:Segoe UI,Roboto,Hiragino Sans,Noto Sans JP,Arial,sans-serif;">登録状況</span></div>' +
    '<table style="border-collapse:collapse;width:100%;">' +
    rows +
    '<tr><td colspan="2" style="padding:8px 10px;font-size:14px;font-weight:700;color:' +
    summaryColor +
    ';background:#f8fafc;font-family:Segoe UI,Roboto,Hiragino Sans,Noto Sans JP,Arial,sans-serif;">' +
    "Kết quả: " +
    history.registered +
    "/" +
    history.total +
    " tuần đã đăng ký trong tháng " +
    history.month +
    ' <span style="font-size:12px;color:#94a3b8;font-weight:400;">(' +
    history.month +
    " " +
    history.registered +
    "/" +
    history.total +
    "週 登録済み)</span>" +
    "</td></tr>" +
    "</table></div>"
  );
}

// ========================================================================
// 1. NHẮC NHỞ ĐĂNG KÝ BÁO CÁO
// ========================================================================
/**
 * @param {string} deptName     - Tên bộ phận (VD: "KOKA TEAM")
 * @param {string} contactName  - Tên người nhận (VD: "Nguyễn Văn A")
 * @param {string} reportDate   - Ngày họp hiển thị (VD: "Thứ 2, 10/03/2026")
 * @param {string} formUrl      - URL form đăng ký (bỏ trống nếu không có)
 * @param {boolean} isJp        - Cờ xác định có phải người Nhật không (để hiện song ngữ)
 * @returns {string} HTML string
 */
function buildReminderEmail(
  deptName,
  contactName,
  reportDate,
  formUrl,
  isJp,
  reminderCount,
) {
  var count = parseInt(reminderCount) || 1;
  var name = contactName || "Anh/Chị";

  // Header leo thang
  var headerVN, headerJP;
  if (count <= 1) {
    headerVN = "BOD MEETING — NHẮC NHỞ ĐĂNG KÝ BÁO CÁO";
    headerJP = "BOD会議 — 報告登録リマインダー";
  } else if (count === 2) {
    headerVN = "BOD MEETING — NHẮC NHỞ LẦN 2 ⚠️";
    headerJP = "BOD会議 — 第2回リマインダー ⚠️";
  } else {
    headerVN = "BOD MEETING — NHẮC NHỞ KHẨN LẦN " + count + " 🔴";
    headerJP = "BOD会議 — 緊急リマインダー第" + count + "回 🔴";
  }
  var header = _eHdr_(headerVN, headerJP);

  // Lấy form URL từ Settings sheet
  var fUrl = formUrl;
  if (!fUrl) {
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var settingsSheet = ss.getSheetByName("Settings");
      if (settingsSheet) {
        var sData = settingsSheet.getDataRange().getValues();
        for (var i = 0; i < sData.length; i++) {
          var k = (sData[i][0] || "").toString().trim();
          if (k === "cfg_formLink" || k === "sys_formUrl") {
            var v = (sData[i][1] || "").toString().trim();
            if (v) {
              fUrl = v;
              break;
            }
          }
        }
      }
    } catch (e) {}
  }

  // Badge lần nhắc
  var badgeColor = count <= 1 ? "#3b82f6" : count === 2 ? "#f59e0b" : "#dc2626";
  var badgeBg = count <= 1 ? "#eff6ff" : count === 2 ? "#fef9c3" : "#fef2f2";
  var badgeHtml =
    count > 1
      ? '<div style="text-align:center;padding:10px;background-color:' +
        badgeBg +
        ";border-bottom:2px solid " +
        badgeColor +
        ';">' +
        '<span style="display:inline-block;padding:6px 16px;background-color:' +
        badgeColor +
        ';color:#fff;border-radius:20px;font-size:12px;font-weight:700;font-family:Segoe UI,Roboto,Hiragino Sans,Noto Sans JP,Arial,sans-serif;">' +
        "NHẮC NHỞ LẦN " +
        count +
        " / 第" +
        count +
        "回リマインダー</span></div>"
      : "";

  // Nội dung leo thang
  var bodyVN, bodyJP;
  if (count <= 1) {
    bodyVN =
      '<p style="margin:0 0 10px;">Bộ phận <strong>' +
      deptName +
      "</strong> chưa gửi đăng ký báo cáo cho cuộc họp BOD ngày <strong>" +
      reportDate +
      "</strong>.</p>" +
      '<p style="margin:0 0 10px;">Nội dung đăng ký bao gồm: <strong>Chủ đề báo cáo, Thời lượng trình bày, Quyết định cần CEO phê duyệt</strong> (nếu có).</p>' +
      '<p style="margin:0 0 10px;">Kính mời Anh/Chị hoàn tất đăng ký trước <strong style="color:#dc2626;">17:00 Thứ Sáu</strong> để BTC kịp tổng hợp lịch trình và gửi tài liệu cho CEO.</p>';
    bodyJP =
      deptName +
      "より、次回BOD会議 (" +
      reportDate +
      ") への報告登録がまだ送信されていません。<br>金曜日17:00までに登録をお願いいたします。";
  } else if (count === 2) {
    bodyVN =
      '<p style="margin:0 0 10px;">Đây là <strong style="color:#f59e0b;">lần nhắc nhở thứ 2</strong> gửi đến bộ phận <strong>' +
      deptName +
      "</strong>.</p>" +
      '<p style="margin:0 0 10px;">Bộ phận hiện vẫn chưa đăng ký nội dung báo cáo cho cuộc họp BOD ngày <strong>' +
      reportDate +
      "</strong>.</p>" +
      '<p style="margin:0 0 10px;">BTC rất mong nhận được phản hồi của Anh/Chị <strong style="color:#dc2626;">trong hôm nay</strong> để kịp hoàn thiện lịch trình họp.  Việc đăng ký đúng hạn giúp cuộc họp diễn ra hiệu quả và tiết kiệm thời gian cho toàn bộ Ban Giám Đốc.</p>';
    bodyJP =
      deptName +
      "部門への<strong>2回目のリマインダー</strong>です。<br>BOD会議 (" +
      reportDate +
      ") への報告登録がまだ確認できておりません。<br><strong>本日中</strong>にご登録いただけますよう、お願いいたします。";
  } else {
    bodyVN =
      '<p style="margin:0 0 10px;">Đây là <strong style="color:#dc2626;">lần nhắc nhở thứ ' +
      count +
      "</strong> gửi đến bộ phận <strong>" +
      deptName +
      "</strong>.</p>" +
      '<p style="margin:0 0 10px;">BTC hiểu rằng Anh/Chị có thể đang rất bận rộn với công việc hàng ngày. Tuy nhiên, cuộc họp BOD ngày <strong>' +
      reportDate +
      "</strong> cần sự đóng góp của <strong>tất cả bộ phận</strong> để Ban Giám Đốc nắm bắt tình hình và đưa ra quyết định kịp thời.</p>" +
      '<p style="margin:0 0 10px;">Nếu bộ phận không có nội dung báo cáo tuần này, xin vui lòng <strong>phản hồi email này</strong> để BTC ghi nhận. Sự phối hợp của Anh/Chị giúp cuộc họp diễn ra trọn vẹn và tôn trọng thời gian của mọi người.</p>' +
      '<p style="margin:0 0 10px;color:#dc2626;font-weight:700;">⚠ Email này đã được CC cho Ban Tổ Chức và Ban Giám Đốc.</p>';
    bodyJP =
      deptName +
      '部門への<strong style="color:#dc2626;">第' +
      count +
      "回リマインダー</strong>です。<br>" +
      "BOD会議 (" +
      reportDate +
      ") への報告登録につきまして、ご多忙中恐れ入りますが、至急ご対応をお願いいたします。<br>" +
      "報告内容がない場合は、このメールにご返信ください。<br>" +
      "<strong>このメールはBTC及び経営陣にCCされています。</strong>";
  }

  var body =
    badgeHtml +
    '<div style="padding:20px 16px;background:#fff;">' +
    '<p style="font-size:16px;font-weight:700;color:#0f172a;margin:0 0 3px;font-family:Segoe UI,Roboto,Hiragino Sans,Noto Sans JP,Arial,sans-serif;">Kính gửi ' +
    name +
    " — " +
    deptName +
    ",</p>" +
    '<p style="font-size:12px;color:#94a3b8;margin:0 0 20px;font-family:Segoe UI,Roboto,Hiragino Sans,Noto Sans JP,Arial,sans-serif;">' +
    (contactName || deptName) +
    " 様</p>" +
    '<div style="font-size:13px;line-height:1.7;color:#334155;margin-bottom:14px;font-family:Segoe UI,Roboto,Hiragino Sans,Noto Sans JP,Arial,sans-serif;">' +
    bodyVN +
    "</div>";

  // Bảng thống kê đăng ký theo tháng (Content Bible 11.3)
  // Điều kiện: missedWeeks >= 1 (bất kể lần nhắc nào)
  try {
    var history = _getDeptHistory_(deptName);
    body += _buildHistoryTable_(deptName, history);
  } catch (e) {
    // Nếu không lấy được data (sheet lỗi), bỏ qua — email vẫn gửi được
  }

  body +=
    '<div style="font-size:13px;line-height:1.7;color:#64748b;margin-bottom:20px;padding:10px 14px;background:#f8fafc;border-radius:8px;border-left:3px solid ' +
    badgeColor +
    ';font-family:Segoe UI,Roboto,Hiragino Sans,Noto Sans JP,Arial,sans-serif;">' +
    bodyJP +
    "</div>" +
    '<div style="background:#eff6ff;border-radius:10px;padding:14px 18px;margin:0 0 22px;">' +
    '<p style="font-size:12px;font-weight:700;color:#1e40af;margin:0 0 8px;font-family:Segoe UI,Roboto,Hiragino Sans,Noto Sans JP,Arial,sans-serif;">THÔNG TIN CUỘC HỌP / 会議情報</p>' +
    '<table style="border-collapse:collapse;width:100%;">' +
    _eRow_("Ngày họp / 会議日:", reportDate) +
    _eRow_("Giờ bắt đầu / 開始時間:", "08:30") +
    _eRow_(
      "Hạn đăng ký / 登録期限:",
      "Thứ Sáu, 17:00 / 金曜日 17:00",
      "#dc2626",
    ) +
    (count > 1
      ? _eRow_(
          "Lần nhắc / リマインダー:",
          "Lần " + count + " / 第" + count + "回",
          badgeColor,
        )
      : "") +
    "</table></div>" +
    (fUrl
      ? '<div style="text-align:center;margin-bottom:20px;">' +
        '<a href="' +
        fUrl +
        '" style="display:inline-block;padding:14px 36px;background-color:' +
        badgeColor +
        ';color:#fff;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;font-family:Segoe UI,Roboto,Hiragino Sans,Noto Sans JP,Arial,sans-serif;">📝 ĐĂNG KÝ NGAY / 今すぐ登録</a>' +
        '<p style="font-size:12px;color:#94a3b8;margin:8px 0 0;font-family:Segoe UI,Roboto,Hiragino Sans,Noto Sans JP,Arial,sans-serif;">Nhấn nút trên hoặc copy link / 上のボタンをクリック:</p>' +
        '<p style="font-size:12px;color:#3b82f6;margin:2px 0 0;font-family:Segoe UI,Roboto,Hiragino Sans,Noto Sans JP,Arial,sans-serif;word-break:break-all;">' +
        fUrl +
        "</p>" +
        "</div>"
      : "") +
    '<div style="background:#f1f5f9;border-radius:8px;padding:12px 18px;margin-bottom:4px;">' +
    '<p style="font-size:12px;color:#475569;margin:0;font-family:Segoe UI,Roboto,Hiragino Sans,Noto Sans JP,Arial,sans-serif;">📞 Liên hệ / お問い合わせ: <strong>BTC Meeting BOD</strong> — Ms. Vy (vynnl@esuhai.com)</p>' +
    "</div>" +
    "</div>";

  return _eWrap_(header + body + _eFtr_(true));
}

// ========================================================================
// 2. NHẮC PHÊ DUYỆT NỘI DUNG
// ========================================================================
/**
 * @param {string} reportDate   - Ngày họp
 * @param {number} pendingCount - Số đăng ký chờ duyệt
 * @returns {string} HTML string
 */
function buildApprovalReminderEmail(reportDate, pendingCount, dashboardUrl) {
  var header = _eHdr_(
    "BOD MEETING — NHẮC PHÊ DUYỆT NỘI DUNG",
    "BOD会議 — 承認リマインダー",
  );

  var dUrl = dashboardUrl || "";
  if (!dUrl) { try { dUrl = ScriptApp.getService().getUrl(); } catch(e) {} }

  var body =
    '<div style="padding:20px 16px;background:#fff;">' +
    '<p style="font-size:16px;font-weight:700;color:#0f172a;margin:0 0 3px;font-family:Segoe UI,Roboto,Hiragino Sans,Noto Sans JP,Arial,sans-serif;">Kính gửi Ban Tổ Chức,</p>' +
    '<p style="font-size:12px;color:#94a3b8;margin:0 0 20px;font-family:Segoe UI,Roboto,Hiragino Sans,Noto Sans JP,Arial,sans-serif;">運営委員会 御中</p>' +
    '<div style="font-size:13px;line-height:1.7;color:#334155;margin-bottom:14px;font-family:Segoe UI,Roboto,Hiragino Sans,Noto Sans JP,Arial,sans-serif;">' +
    '<p style="margin:0 0 10px;">Hiện có <strong style="color:#dc2626;font-size:16px;">' +
    pendingCount +
    " đăng ký</strong> báo cáo đang chờ phê duyệt.</p>" +
    '<p style="margin:0 0 10px;">Kính mời Anh/Chị xem xét và hoàn tất phê duyệt trước <strong>17:00 Thứ Bảy</strong>.</p>' +
    "</div>" +
    '<div style="font-size:13px;line-height:1.7;color:#64748b;margin-bottom:20px;padding:10px 14px;background:#f8fafc;border-radius:8px;border-left:3px solid #f59e0b;font-family:Segoe UI,Roboto,Hiragino Sans,Noto Sans JP,Arial,sans-serif;">' +
    "次のBOD会議に向けて" +
    pendingCount +
    "件の発表登録が承認待ちです。土曜日17:00までに承認をお願いします。" +
    "</div>" +
    '<div style="background:#fefce8;border-radius:10px;padding:14px 18px;border:1px solid #fde68a;">' +
    '<p style="font-size:12px;font-weight:700;color:#92400e;margin:0 0 8px;font-family:Segoe UI,Roboto,Hiragino Sans,Noto Sans JP,Arial,sans-serif;">TÌNH TRẠNG PHÊ DUYỆT</p>' +
    '<table style="border-collapse:collapse;width:100%;">' +
    _eRow_("Ngày họp:", reportDate) +
    _eRow_("Chờ phê duyệt:", pendingCount + " mục", "#dc2626") +
    _eRow_("Hạn phê duyệt:", "Thứ Bảy, 17:00", "#dc2626") +
    "</table></div>" +
    (dUrl ? '<div style="text-align:center;margin:24px 0 8px;">' +
      '<table cellpadding="0" cellspacing="0" border="0" align="center"><tr><td bgcolor="#f59e0b" style="background-color:#f59e0b;border-radius:10px;padding:14px 32px;">' +
      '<a href="' + dUrl + '" style="color:#fff;font-size:16px;font-weight:700;text-decoration:none;font-family:Segoe UI,Roboto,Arial,sans-serif;">📋 MỞ DASHBOARD PHÊ DUYỆT</a>' +
      '</td></tr></table></div>' : '') +
    "</div>";

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
function buildApprovalResultEmail(
  recipientName,
  reportDate,
  status,
  content,
  ghiChu,
) {
  var statusMap = {
    Duyệt: {
      color: "#10b981",
      bg: "#ecfdf5",
      border: "#6ee7b7",
      labelVN: "ĐÃ DUYỆT",
      labelJP: "承認済み",
      icon: "&#10003;",
    },
    "Từ chối": {
      color: "#ef4444",
      bg: "#fef2f2",
      border: "#fca5a5",
      labelVN: "TỪ CHỐI",
      labelJP: "不承認",
      icon: "&#10007;",
    },
    Hoãn: {
      color: "#8b5cf6",
      bg: "#f5f3ff",
      border: "#c4b5fd",
      labelVN: "HOÃN LẠI",
      labelJP: "保留",
      icon: "&#8759;",
    },
  };
  var s = statusMap[status] || {
    color: "#64748b",
    bg: "#f1f5f9",
    border: "#cbd5e1",
    labelVN: status,
    labelJP: status,
    icon: "&#8212;",
  };

  var header = _eHdr_(
    "BOD MEETING — KẾT QUẢ PHÊ DUYỆT",
    "BOD会議 — 承認結果通知",
  );

  var body =
    '<div style="padding:20px 16px;background:#fff;">' +
    '<p style="font-size:16px;font-weight:700;color:#0f172a;margin:0 0 3px;font-family:Segoe UI,Roboto,Hiragino Sans,Noto Sans JP,Arial,sans-serif;">Kính gửi ' +
    (recipientName || "Anh/Chị") +
    ",</p>" +
    '<p style="font-size:12px;color:#94a3b8;margin:0 0 20px;font-family:Segoe UI,Roboto,Hiragino Sans,Noto Sans JP,Arial,sans-serif;">' +
    (recipientName || "") +
    " 様</p>" +
    // Status badge
    '<div style="text-align:center;margin:0 0 22px;">' +
    '<div style="display:inline-block;padding:16px 28px;background:' +
    s.bg +
    ";border-radius:12px;border:2px solid " +
    s.border +
    ';">' +
    '<div style="font-size:30px;color:' +
    s.color +
    ';font-weight:900;line-height:1;">' +
    s.icon +
    "</div>" +
    '<div style="font-size:17px;font-weight:800;color:' +
    s.color +
    ';margin-top:4px;font-family:Segoe UI,Roboto,Hiragino Sans,Noto Sans JP,Arial,sans-serif;">' +
    s.labelVN +
    "</div>" +
    '<div style="font-size:12px;color:' +
    s.color +
    ';opacity:.75;margin-top:2px;font-family:Segoe UI,Roboto,Hiragino Sans,Noto Sans JP,Arial,sans-serif;">' +
    s.labelJP +
    "</div>" +
    "</div></div>" +
    '<div style="font-size:13px;line-height:1.7;color:#334155;margin-bottom:14px;font-family:Segoe UI,Roboto,Hiragino Sans,Noto Sans JP,Arial,sans-serif;">' +
    '<p style="margin:0 0 10px;">BTC Meeting BOD xin thông báo kết quả phê duyệt nội dung đăng ký báo cáo của Anh/Chị cho cuộc họp BOD ngày <strong>' +
    reportDate +
    "</strong>.</p>" +
    "</div>" +
    '<div style="font-size:13px;line-height:1.7;color:#64748b;margin-bottom:20px;padding:10px 14px;background:#f8fafc;border-radius:8px;border-left:3px solid ' +
    s.color +
    ';font-family:Segoe UI,Roboto,Hiragino Sans,Noto Sans JP,Arial,sans-serif;">' +
    "BOD会議運営委員会より、ご登録いただいた発表申請の審査結果をお知らせします。" +
    "</div>" +
    '<div style="background:' +
    s.bg +
    ";border-radius:10px;padding:14px 18px;border:1px solid " +
    s.border +
    ';">' +
    '<p style="font-size:12px;font-weight:700;color:' +
    s.color +
    ';margin:0 0 8px;font-family:Segoe UI,Roboto,Hiragino Sans,Noto Sans JP,Arial,sans-serif;">CHI TIẾT ĐĂNG KÝ</p>' +
    '<table style="border-collapse:collapse;width:100%;">' +
    _eRow_("Ngày họp:", reportDate) +
    _eRow_("Nội dung:", content || "") +
    _eRow_("Kết quả:", s.labelVN, s.color) +
    (ghiChu ? _eRow_("Ghi chú BOD:", ghiChu) : "") +
    "</table></div>";

  // BƯỚC TIẾP THEO — chỉ hiện khi Duyệt
  if (status === "Duyệt") {
    body +=
      '<div style="margin-top:20px;font-size:13px;line-height:1.7;color:#334155;font-family:Segoe UI,Roboto,Hiragino Sans,Noto Sans JP,Arial,sans-serif;">' +
      '<p style="margin:0 0 10px;font-weight:700;color:#0f172a;">BƯỚC TIẾP THEO — để phần trình bày đạt hiệu quả cao nhất:</p>' +
      '<p style="margin:0 0 8px;">&#9312; Chuẩn bị slide hoặc tài liệu trình bày</p>' +
      '<p style="margin:0 0 4px;">&#9313; <strong>GỬI TÀI LIỆU TRƯỚC CHO BTC</strong> (quan trọng)</p>' +
      '<div style="margin:0 0 12px;padding:12px 16px;background:#eff6ff;border-radius:8px;border-left:3px solid #2563eb;font-size:13px;line-height:1.7;">' +
      "Cuộc họp BOD có hệ thống <strong>A.I phiên dịch trực tuyến Việt–Nhật</strong> hoạt động xuyên suốt. " +
      "Để hệ thống hoạt động chính xác nhất, BTC đề nghị:<br>" +
      "✦ Gửi file slide (.pptx/.pdf) hoặc tài liệu trình bày <strong>trước Thứ Hai</strong> qua:<br>" +
      '&nbsp;&nbsp;&nbsp;→ <a href="mailto:minhhieu@esuhai.com" style="color:#2563eb;">minhhieu@esuhai.com</a> và ' +
      '<a href="mailto:dungntt@esuhai.com" style="color:#2563eb;">dungntt@esuhai.com</a><br>' +
      "✦ Việc gửi trước giúp A.I phiên dịch nhận diện thuật ngữ chuyên ngành, tên riêng — phiên dịch chính xác hơn cho người Nhật tham dự." +
      "</div>" +
      '<p style="margin:0 0 8px;">&#9314; Lịch trình chính thức sẽ được gửi trước 20:00 Chủ Nhật</p>' +
      '<p style="margin:0 0 12px;">&#9315; Trình bày trong thời lượng đã đăng ký để đảm bảo tiến độ</p>' +
      '<p style="margin:0 0 10px;color:#64748b;font-style:italic;">Nếu cần điều chỉnh nội dung hoặc thời lượng, vui lòng liên hệ BTC trước Thứ Bảy.</p>' +
      "</div>";

    // JP block
    body +=
      '<div style="margin-top:16px;font-size:13px;line-height:1.7;color:#64748b;padding:12px 14px;background:#f8fafc;border-radius:8px;border-left:3px solid ' +
      s.color +
      ';font-family:Segoe UI,Roboto,Hiragino Sans,Noto Sans JP,Arial,sans-serif;">' +
      '<p style="margin:0 0 6px;font-weight:700;">次のステップ：</p>' +
      "① 発表資料のご準備をお願いいたします<br>" +
      "② 【重要】発表資料の事前送付のお願い<br>" +
      "&nbsp;&nbsp;BOD会議ではAI通訳システム（ベトナム語⇔日本語）が稼働しています。<br>" +
      "&nbsp;&nbsp;スライド等の資料がある方は、月曜日の会議前までに下記へお送りください：<br>" +
      "&nbsp;&nbsp;→ minhhieu@esuhai.com / dungntt@esuhai.com<br>" +
      "③ 公式スケジュールは日曜日20:00までに配信いたします<br>" +
      "④ 登録された時間内での発表をお願いいたします" +
      "</div>";
  }

  body += "</div>";

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
  var header = _eHdr_(
    "BOD MEETING — LỊCH TRÌNH CUỘC HỌP",
    "BOD会議 — 議事スケジュール",
  );
  var items = scheduleItems || [];

  // Calculate total duration
  var totalMin = 0;
  for (var i = 0; i < items.length; i++) {
    totalMin += (parseInt(items[i].tlTB) || 10) + (parseInt(items[i].tlCD) || 10);
  }
  var endH = Math.floor((8 * 60 + 30 + totalMin) / 60);
  var endM = (8 * 60 + 30 + totalMin) % 60;
  var endTime = (endH < 10 ? '0' : '') + endH + ':' + (endM < 10 ? '0' : '') + endM;

  // Color palette for timeline cards
  var colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#64748b'];

  // Build timeline cards
  var cards = '';
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    var color = colors[i % colors.length];
    var initial = (it.presenter || '?').charAt(0).toUpperCase();
    var tbMin = parseInt(it.tlTB) || 10;
    var cdMin = parseInt(it.tlCD) || 10;
    var dept = it.dept ? ' <span style="color:#94a3b8;font-size:12px;">(' + it.dept + ')</span>' : '';

    cards +=
      '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:12px;">' +
      '<tr>' +
      '<td style="width:56px;min-width:48px;text-align:center;padding-top:2px;" valign="top">' +
      '<table cellpadding="0" cellspacing="0" border="0" align="center"><tr><td bgcolor="' + color + '" style="background-color:' + color + ';border-radius:6px;padding:6px 10px;">' +
      '<span style="color:#fff;font-size:13px;font-weight:800;font-family:Segoe UI,Roboto,Arial,sans-serif;">' + (it.time || '') + '</span>' +
      '</td></tr></table>' +
      (i < items.length - 1 ? '<div style="width:2px;height:16px;background:#e2e8f0;margin:4px auto 0;"></div>' : '') +
      '</td>' +
      '<td style="padding:0 0 0 12px;">' +
      '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-left:3px solid ' + color + ';border-radius:0 10px 10px 0;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,0.06);">' +
      '<tr><td style="padding:14px 16px;">' +
      '<div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:6px;line-height:1.4;font-family:Segoe UI,Roboto,Hiragino Sans,Noto Sans JP,Arial,sans-serif;">' +
      (it.content || '') + '</div>' +
      '<table cellpadding="0" cellspacing="0" border="0"><tr>' +
      '<td width="28" valign="middle">' +
      '<table cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="' + color + '" style="background-color:' + color + ';width:26px;height:26px;border-radius:50%;text-align:center;line-height:26px;">' +
      '<span style="color:#fff;font-size:12px;font-weight:700;font-family:Segoe UI,Arial,sans-serif;">' + initial + '</span>' +
      '</td></tr></table></td>' +
      '<td style="padding-left:8px;">' +
      '<span style="font-size:13px;font-weight:600;color:#334155;font-family:Segoe UI,Roboto,Hiragino Sans,Noto Sans JP,Arial,sans-serif;">' +
      (it.presenter || '') + '</span>' + dept +
      '</td></tr></table>' +
      '<div style="margin-top:8px;">' +
      '<span style="display:inline-block;padding:3px 10px;background:#eff6ff;color:#2563eb;border-radius:12px;font-size:12px;font-weight:700;font-family:Segoe UI,Arial,sans-serif;white-space:nowrap;margin-right:6px;">TB ' + tbMin + " ph</span>" +
      '<span style="display:inline-block;padding:3px 10px;background:#fef3c7;color:#92400e;border-radius:12px;font-size:12px;font-weight:700;font-family:Segoe UI,Arial,sans-serif;white-space:nowrap;">CD ' + cdMin + " ph</span>" +
      '</div>' +
      '</td></tr></table>' +
      '</td></tr></table>';
  }

  if (!cards) {
    cards = '<div style="padding:16px;text-align:center;color:#94a3b8;font-size:14px;font-family:Segoe UI,Roboto,Hiragino Sans,Noto Sans JP,Arial,sans-serif;">No schedule content</div>';
  }

  var body =
    '<div style="padding:20px 16px;background:#fff;">' +
    '<p style="font-size:16px;font-weight:700;color:#0f172a;margin:0 0 3px;font-family:Segoe UI,Roboto,Hiragino Sans,Noto Sans JP,Arial,sans-serif;">Kính gửi toàn thể thành viên BOD,</p>' +
    '<p style="font-size:12px;color:#94a3b8;margin:0 0 20px;font-family:Segoe UI,Roboto,Hiragino Sans,Noto Sans JP,Arial,sans-serif;">BODメンバー各位</p>' +
    '<div style="font-size:13px;line-height:1.7;color:#334155;margin-bottom:14px;font-family:Segoe UI,Roboto,Hiragino Sans,Noto Sans JP,Arial,sans-serif;">' +
    '<p style="margin:0 0 10px;">BTC Meeting BOD trân trọng gửi <strong>lịch trình chính thức</strong> cuộc họp BOD. Kính mời Anh/Chị chuẩn bị nội dung theo đúng thứ tự và thời lượng đã phân bổ.</p>' +
    '</div>' +
    '<div style="font-size:13px;line-height:1.7;color:#64748b;margin-bottom:20px;padding:10px 14px;background:#f8fafc;border-radius:8px;border-left:3px solid #3b82f6;font-family:Segoe UI,Roboto,Hiragino Sans,Noto Sans JP,Arial,sans-serif;">' +
    "次回BOD会議の公式スケジュールです。担当者は割り当て時間内での発表をお願いします。" +
    '</div>' +
    '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;"><tr><td bgcolor="#eff6ff" style="background-color:#eff6ff;border-radius:10px;padding:14px 18px;">' +
    '<table style="border-collapse:collapse;width:100%;">' +
    _eRow_("Ngày họp:", reportDate) +
    _eRow_("Giờ bắt đầu:", "08:30") +
    _eRow_("Kết thúc dự kiến:", endTime + " (≈" + totalMin + " phút)") +
    _eRow_("Số nội dung:", items.length + " mục") +
    '</table></td></tr></table>' +
    '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;"><tr><td bgcolor="#0f172a" style="background-color:#0f172a;border-radius:8px;padding:10px 16px;">' +
    '<span style="color:#fff;font-size:13px;font-weight:700;letter-spacing:1px;font-family:Segoe UI,Roboto,Arial,sans-serif;">CHI TIẾT LỊCH TRÌNH</span>' +
    '</td></tr></table>' +
    cards +
    '<div style="margin-top:16px;padding:12px 16px;background:#fefce8;border-radius:8px;border:1px solid #fde68a;">' +
    '<p style="font-size:13px;color:#92400e;margin:0;font-family:Segoe UI,Roboto,Hiragino Sans,Noto Sans JP,Arial,sans-serif;">' +
    'Nếu có thay đổi, vui lòng liên hệ BTC trước <strong>07:00 sáng ngày họp</strong>.<br>' +
    '変更がある場合は会議当日の07:00までにBTCにご連絡ください。</p>' +
    '</div>' +
    '</div>';

  return _eWrap_(header + body + _eFtr_(true));
}
