/**
 * ========================================================================
 * v852_email_router.js — EMAIL INFRASTRUCTURE & PLAIN TEXT TEMPLATES
 * ========================================================================
 * Tách từ Mã.js v8.0 — Chứa:
 * - Email config helpers (getBTCEmails, getMeetingConfig)
 * - Plain text email builders (Approved, Rejected, Postponed, Schedule, NewReg)
 * - Email router (sendEmail, sendViaWebhook, sendViaGmail)
 * - Email with attachment support
 * - Email log function
 *
 * LƯU Ý: HTML email templates nằm trong v820_email_templates.js
 * ========================================================================
 */

// =============================================================================
// EMAIL CONFIG HELPERS
// =============================================================================
function getBTCEmails() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const configSheet = ss.getSheetByName(CONFIG.SHEET_CONFIG);
  if (!configSheet)
    return {
      btcFixed: CONFIG.BTC_FIXED,
      bodHosting: CONFIG.BOD_HOSTING_DEFAULT,
      all: [...CONFIG.BTC_FIXED, CONFIG.BOD_HOSTING_DEFAULT],
    };
  const data = configSheet.getDataRange().getValues();
  let btcFixed = [],
    bodHosting = "";
  for (let i = 0; i < data.length; i++) {
    const c1 = (data[i][0] || "").toString().trim().toLowerCase();
    const c2 = (data[i][1] || "").toString().trim();
    if (c1.includes("btc email"))
      btcFixed = c2.split(/[,;\s]+/).filter((e) => e.includes("@"));
    if (c1.includes("bod hosting")) {
      const m = c2.match(/[\w.-]+@[\w.-]+\.[a-z]{2,}/i);
      if (m) bodHosting = m[0];
    }
  }
  if (btcFixed.length === 0) btcFixed = [...CONFIG.BTC_FIXED];
  if (!bodHosting) bodHosting = CONFIG.BOD_HOSTING_DEFAULT;
  return { btcFixed, bodHosting, all: [...new Set([...btcFixed, bodHosting])] };
}

function getMeetingConfig() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const configSheet = ss.getSheetByName(CONFIG.SHEET_CONFIG);
  const cfg = {
    teamsLink: "",
    gioHop: "08:30",
    diaDiem: "Hội trường / MS Teams",
  };
  if (!configSheet) return cfg;
  const data = configSheet.getDataRange().getValues();
  for (let i = 0; i < data.length; i++) {
    const c1 = (data[i][0] || "").toString().trim().toLowerCase();
    const c2 = (data[i][1] || "").toString().trim();
    if (c1.includes("link teams") && c2) cfg.teamsLink = c2;
    if (c1.includes("giờ họp") || c1.includes("gio hop"))
      cfg.gioHop = c2 || cfg.gioHop;
    if (c1.includes("địa điểm") || c1.includes("dia diem"))
      cfg.diaDiem = c2 || cfg.diaDiem;
  }
  return cfg;
}

// =============================================================================
// PLAIN TEXT EMAIL BUILDERS (fallback khi HTML template lỗi)
// =============================================================================
function buildEmailNewRegistration(data) {
  var tl = formatThoiLuong(data.thoiLuong);
  var dashboardUrl = '';
  try { dashboardUrl = ScriptApp.getService().getUrl(); } catch(e) { dashboardUrl = data.sheetUrl; }
  
  var htmlBody = 
    '<div style="max-width:640px;margin:0 auto;background:#f8fafc;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 16px rgba(0,0,0,.08)">' +
    '<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#0f172a" style="background-color:#0f172a;padding:28px 32px">' +
    '<h1 style="margin:0;font-size:20px;font-weight:800;color:#fff;letter-spacing:-.3px;font-family:Segoe UI,Roboto,Hiragino Sans,Noto Sans JP,Arial,sans-serif">ĐĂNG KÝ BÁO CÁO BOD MỚI</h1>' +
    '<p style="margin:6px 0 0;font-size:12px;color:rgba(255,255,255,.72);font-weight:500;font-family:Segoe UI,Roboto,Hiragino Sans,Noto Sans JP,Arial,sans-serif">BOD報告の新規登録 — New Registration</p></td></tr></table>' +
    '<div style="text-align:center;padding:10px;background:#eff6ff;border-bottom:1px solid #dbeafe">' +
    '<span style="display:inline-block;padding:6px 16px;background:#2563eb;color:#fff;border-radius:20px;font-size:12px;font-weight:700;font-family:Segoe UI,Roboto,Hiragino Sans,Noto Sans JP,Arial,sans-serif">CẦN XEM XÉT / 確認が必要</span></div>' +
    '<div style="padding:28px 32px;background:#fff">' +
    '<p style="font-size:15px;font-weight:700;color:#0f172a;margin:0 0 3px;font-family:Segoe UI,Roboto,Hiragino Sans,Noto Sans JP,Arial,sans-serif">Kính gửi Ban Tổ Chức,</p>' +
    '<p style="font-size:12px;color:#94a3b8;margin:0 0 20px;font-family:Segoe UI,Roboto,Hiragino Sans,Noto Sans JP,Arial,sans-serif">各位へ、</p>' +
    '<p style="font-size:14px;line-height:1.75;color:#334155;margin:0 0 20px;font-family:Segoe UI,Roboto,Hiragino Sans,Noto Sans JP,Arial,sans-serif">' +
    'Có đăng ký báo cáo BOD mới cần được xem xét.<br>' +
    '<span style="color:#94a3b8;font-size:12px">BOD報告の新規登録がありますのでご確認ください。</span></p>' +
    '<div style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;margin:0 0 20px">' +
    '<div style="padding:10px 16px;background:#f1f5f9;border-bottom:1px solid #e2e8f0">' +
    '<span style="font-size:11px;font-weight:700;color:#475569;letter-spacing:1px;font-family:Segoe UI,Roboto,Hiragino Sans,Noto Sans JP,Arial,sans-serif">THÔNG TIN ĐĂNG KÝ / 登録情報</span></div>' +
    '<table style="border-collapse:collapse;width:100%">' +
    '<tr><td style="padding:10px 16px;color:#64748b;font-size:13px;width:130px;border-bottom:1px solid #f1f5f9;font-family:Segoe UI,Roboto,Hiragino Sans,Noto Sans JP,Arial,sans-serif">Người đăng ký / 登録者</td>' +
    '<td style="padding:10px 16px;color:#0f172a;font-weight:600;font-size:13px;border-bottom:1px solid #f1f5f9;font-family:Segoe UI,Roboto,Hiragino Sans,Noto Sans JP,Arial,sans-serif">' + (data.hoTen || 'N/A') + '</td></tr>' +
    '<tr><td style="padding:10px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;font-family:Segoe UI,Roboto,Hiragino Sans,Noto Sans JP,Arial,sans-serif">Bộ phận / 部署</td>' +
    '<td style="padding:10px 16px;color:#0f172a;font-weight:600;font-size:13px;border-bottom:1px solid #f1f5f9;font-family:Segoe UI,Roboto,Hiragino Sans,Noto Sans JP,Arial,sans-serif">' + (data.boPhan || 'N/A') + '</td></tr>' +
    '<tr><td style="padding:10px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;font-family:Segoe UI,Roboto,Hiragino Sans,Noto Sans JP,Arial,sans-serif">Nội dung / 内容</td>' +
    '<td style="padding:10px 16px;color:#0f172a;font-weight:600;font-size:13px;border-bottom:1px solid #f1f5f9;font-family:Segoe UI,Roboto,Hiragino Sans,Noto Sans JP,Arial,sans-serif">' + (data.noiDung || 'N/A') + '</td></tr>' +
    '<tr><td style="padding:10px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;font-family:Segoe UI,Roboto,Hiragino Sans,Noto Sans JP,Arial,sans-serif">Ngày họp / 会議日</td>' +
    '<td style="padding:10px 16px;color:#1e40af;font-weight:700;font-size:13px;border-bottom:1px solid #f1f5f9;font-family:Segoe UI,Roboto,Hiragino Sans,Noto Sans JP,Arial,sans-serif">' + (data.ngayHop || 'N/A') + '</td></tr>' +
    '<tr><td style="padding:10px 16px;color:#64748b;font-size:13px;font-family:Segoe UI,Roboto,Hiragino Sans,Noto Sans JP,Arial,sans-serif">Thời lượng / 所要時間</td>' +
    '<td style="padding:10px 16px;color:#0f172a;font-weight:600;font-size:13px;font-family:Segoe UI,Roboto,Hiragino Sans,Noto Sans JP,Arial,sans-serif">' + tl + '</td></tr>' +
    '</table></div>' +
    '<div style="text-align:center;margin:24px 0">' +
    '<a href="' + dashboardUrl + '" style="display:inline-block;padding:14px 32px;background-color:#2563eb;color:#fff;font-size:14px;font-weight:700;border-radius:10px;text-decoration:none;font-family:Segoe UI,Roboto,Hiragino Sans,Noto Sans JP,Arial,sans-serif;letter-spacing:.3px">MỞ DASHBOARD XEM XÉT / ダッシュボードを開く</a>' +
    '</div>' +
    '<p style="font-size:11px;color:#94a3b8;text-align:center;margin:0 0 4px;font-family:Segoe UI,Roboto,Hiragino Sans,Noto Sans JP,Arial,sans-serif">⚠ Link dành riêng cho BTC có quyền truy cập</p>' +
    '</div>' +
    '<div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center">' +
    '<p style="margin:0;font-size:11px;color:#94a3b8;font-family:Segoe UI,Roboto,Hiragino Sans,Noto Sans JP,Arial,sans-serif">Trân trọng / よろしくお願いいたします</p>' +
    '<p style="margin:4px 0 0;font-size:12px;font-weight:700;color:#64748b;font-family:Segoe UI,Roboto,Hiragino Sans,Noto Sans JP,Arial,sans-serif">BTC MEETING BOD — ESUHAI GROUP</p></div>' +
    '</div>';
  
  return {
    subject: "[Đăng ký BOD mới / BOD新規登録] " + data.boPhan + " - " + data.hoTen,
    body: "Có đăng ký báo cáo BOD mới: " + data.hoTen + " (" + data.boPhan + ") — " + data.noiDung + ". Xem tại: " + dashboardUrl,
    htmlBody: htmlBody
  };
}

function buildEmailApproved(data) {
  return {
    subject: "[Kết quả BOD] ✅ " + data.noiDung.substring(0, 30),
    body:
      "Kính gửi " + data.hoTen +
      ",\n\n────────────────────────────────────\nNội dung: " + data.noiDung +
      "\nNgày họp: " + data.ngayHop +
      "\nBộ phận: " + data.boPhan +
      "\n────────────────────────────────────\n\nKẾT QUẢ: ✅ ĐÃ ĐƯỢC DUYỆT / 承認済み\n\nVui lòng chuẩn bị nội dung trình bày.\nLịch trình chính thức sẽ được gửi trước ngày họp.\n\nTrân trọng,\nBan Tổ Chức Meeting BOD\nESUHAI GROUP",
  };
}

function buildEmailRejected(data) {
  return {
    subject: "[Kết quả BOD] ❌ " + data.noiDung.substring(0, 30),
    body:
      "Kính gửi " + data.hoTen +
      ",\n\n────────────────────────────────────\nNội dung: " + data.noiDung +
      "\nNgày họp: " + data.ngayHop +
      "\nBộ phận: " + data.boPhan +
      "\n────────────────────────────────────\n\nKẾT QUẢ: ❌ CHƯA ĐƯỢC DUYỆT\nLý do: " +
      (data.ghiChu || "(Không có ghi chú)") +
      "\n\nTrân trọng,\nBan Tổ Chức Meeting BOD\nESUHAI GROUP",
  };
}

function buildEmailPostponed(data) {
  return {
    subject: "[Kết quả BOD] ⏸️ " + data.noiDung.substring(0, 30),
    body:
      "Kính gửi " + data.hoTen +
      ",\n\n────────────────────────────────────\nNội dung: " + data.noiDung +
      "\nNgày họp: " + data.ngayHop +
      "\nBộ phận: " + data.boPhan +
      "\n────────────────────────────────────\n\nKẾT QUẢ: ⏸️ TẠM HOÃN\nLý do: " +
      (data.ghiChu || "(Không có ghi chú)") +
      "\n\nNội dung sẽ được xem xét cho kỳ họp tiếp theo.\n\nTrân trọng,\nBan Tổ Chức Meeting BOD\nESUHAI GROUP",
  };
}

function buildEmailSchedule(data) {
  const teamsInfo = data.teamsLink
    ? "Link Teams: " + data.teamsLink + "\n"
    : "";
  return {
    subject: "[Lịch trình BOD / BODスケジュール] " + data.ngayHop,
    body:
      "Kính gửi Quý Anh/Chị,\n\nLịch trình họp Ban Quản Trị đã được xác nhận.\n\n════════════════════════════════════\nNgày họp: " +
      data.ngayHop + "\nGiờ họp: " + data.gioHop + "\nĐịa điểm: " + data.diaDiem + "\n" + teamsInfo +
      "════════════════════════════════════\n\nNỘI DUNG:\n────────────────────────────────────\n" +
      data.agendaList +
      "────────────────────────────────────\n\nChi tiết xem file đính kèm.\n\nTrân trọng,\nBan Tổ Chức Meeting BOD\nESUHAI GROUP",
  };
}

// =============================================================================
// EMAIL ROUTER — TỰ ĐỘNG CHỌN METHOD (N8N hoặc Gmail)
// =============================================================================

/**
 * Gửi email qua N8N Webhook
 */
function sendViaWebhook(payload) {
  try {
    var webhookUrl = CONFIG.N8N_WEBHOOK_URL;
    if (!webhookUrl) {
      Logger.log("N8N webhook URL not configured, falling back to Gmail");
      return false;
    }
    var response = UrlFetchApp.fetch(webhookUrl, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });
    var code = response.getResponseCode();
    if (code >= 200 && code < 300) {
      Logger.log("N8N webhook OK: " + code + " - " + payload.to);
      return true;
    } else {
      Logger.log("N8N webhook error " + code + ": " + response.getContentText());
      return false;
    }
  } catch (e) {
    Logger.log("N8N webhook exception: " + e.message);
    return false;
  }
}

/**
 * Gửi email qua Gmail trực tiếp (fallback)
 */
function sendViaGmail(emailData) {
  try {
    var opts = {
      to: emailData.to,
      cc: emailData.cc || "",
      subject: emailData.subject,
      body: emailData.body,
      name: CONFIG.EMAIL_SENDER_NAME,
    };
    if (emailData.htmlBody) opts.htmlBody = emailData.htmlBody;
    if (CONFIG.EMAIL_SENDER_ADDRESS) opts.from = CONFIG.EMAIL_SENDER_ADDRESS;
    MailApp.sendEmail(opts);
    return true;
  } catch (e) {
    try {
      var retryOpts = {
        to: emailData.to,
        cc: emailData.cc || "",
        subject: emailData.subject,
        body: emailData.body,
        name: CONFIG.EMAIL_SENDER_NAME,
      };
      if (emailData.htmlBody) retryOpts.htmlBody = emailData.htmlBody;
      MailApp.sendEmail(retryOpts);
      return true;
    } catch (e2) {
      Logger.log("Gmail send error: " + e2.message);
      return false;
    }
  }
}

/**
 * Email router chính — N8N → Gmail fallback
 */
function sendEmail(emailData) {
  if (!emailData.to || !isValidEmail(emailData.to.split(",")[0])) return false;
  loadConfigFromSheet();
  if (CONFIG.EMAIL_METHOD === "n8n") {
    var payload = {
      to: emailData.to,
      cc: emailData.cc || "",
      subject: emailData.subject,
      body: emailData.body,
      htmlBody: emailData.htmlBody || "",
      senderName: CONFIG.EMAIL_SENDER_NAME,
      senderEmail: CONFIG.EMAIL_SENDER_ADDRESS || "",
      type: "bod_notification",
    };
    var ok = sendViaWebhook(payload);
    if (ok) return true;
    Logger.log("N8N failed, falling back to Gmail for: " + emailData.to);
  }
  return sendViaGmail(emailData);
}

function sendEmailWithAttachment(emailData, pdfBlob) {
  loadConfigFromSheet();
  try {
    var opts = {
      to: emailData.to,
      cc: emailData.cc || '',
      subject: emailData.subject,
      body: emailData.body,
      attachments: [pdfBlob],
      name: CONFIG.EMAIL_SENDER_NAME,
    };
    if (CONFIG.EMAIL_SENDER_ADDRESS && CONFIG.EMAIL_SENDER_ADDRESS.length > 0) {
      opts.from = CONFIG.EMAIL_SENDER_ADDRESS;
    }
    MailApp.sendEmail(opts);
    return true;
  } catch (e) {
    Logger.log('Email with attachment (attempt 1) failed: ' + e.message);
    try {
      MailApp.sendEmail({
        to: emailData.to,
        cc: emailData.cc || '',
        subject: emailData.subject,
        body: emailData.body,
        attachments: [pdfBlob],
        name: CONFIG.EMAIL_SENDER_NAME,
      });
      return true;
    } catch (e2) {
      Logger.log('Email with attachment (fallback) also failed: ' + e2.message);
      return false;
    }
  }
}

// =============================================================================
// EMAIL LOG — Ghi nhận vào sheet "Email Log"
// =============================================================================
function logEmailSend(type, count, detail) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var logSheet = ss.getSheetByName("Email Log");
    if (!logSheet) {
      logSheet = ss.insertSheet("Email Log");
      logSheet.getRange(1, 1, 1, 5).setValues([["Timestamp", "Type", "Count", "Method", "Detail"]]);
    }
    var now = new Date();
    var ts = Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss");
    logSheet.appendRow([ts, type, count, CONFIG.EMAIL_METHOD, detail || ""]);
  } catch(e) {
    Logger.log("logEmailSend error: " + e.message);
  }
}
