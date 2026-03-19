/**
 * lib/email-templates.js
 * ========================================================================
 * CEO DIRECTIVE — PROFESSIONAL EMAIL HTML TEMPLATES
 * ========================================================================
 * Adapted from: bod_meeting/v820_email_templates.js
 * Design: Inline CSS only · Max 640px · Gmail/Outlook safe
 * Brand: "Hệ thống Chỉ đạo CEO — ESUHAI GROUP"
 * ========================================================================
 */

// =====================================================================
// PRIVATE HELPERS — Base design system
// =====================================================================

const FONT = 'Segoe UI,Roboto,Hiragino Sans,Noto Sans JP,Arial,sans-serif';
const BRAND_DARK = '#0f172a';
const BRAND_BLUE = '#2563eb';
const BRAND_GREEN = '#10b981';
const BRAND_AMBER = '#f59e0b';
const BRAND_RED = '#dc2626';
const BRAND_PURPLE = '#7c3aed';

// Tracking pixel — URL base cho Next.js dashboard
// Dev: http://localhost:3000 · Prod: https://ceo.tikme.vn
const TRACKING_BASE_URL = process.env.TRACKING_BASE_URL || 'http://localhost:3000';

/**
 * Build tracking pixel IMG tag cho email
 * Token format: base64url(directiveId:recipientEmail:timestamp)
 * @param {string} directiveId - Notion page ID
 * @param {string} recipientEmail - Email người nhận
 * @returns {string} HTML img tag 1x1 invisible
 */
function buildTrackingPixel(directiveId, recipientEmail) {
  if (!directiveId || !recipientEmail) return '';
  const payload = `${directiveId}:${recipientEmail}:${Date.now()}`;
  const token = Buffer.from(payload).toString('base64url');
  return `<img src="${TRACKING_BASE_URL}/track/${token}" width="1" height="1" style="display:block;width:1px;height:1px;border:0;" alt="" />`;
}

/** Outer HTML wrapper — max 640px, rounded, shadow */
function eWrap(inner) {
  return (
    '<!DOCTYPE html><html><head><meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1.0">' +
    '</head>' +
    '<body style="margin:0;padding:12px;background:#e8edf2;">' +
    '<div style="max-width:640px;width:100%;margin:0 auto;background:#f8fafc;' +
    'border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;' +
    'box-shadow:0 4px 16px rgba(0,0,0,.08);">' +
    inner +
    '</div></body></html>'
  );
}

/** Dark header bar */
function eHdr(titleVN, subtitleVN) {
  return (
    '<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="' + BRAND_DARK + '" ' +
    'style="background-color:' + BRAND_DARK + ';padding:20px 16px;">' +
    '<h1 style="margin:0;font-size:18px;font-weight:800;color:#fff;letter-spacing:-.3px;font-family:' + FONT + ';">' +
    titleVN + '</h1>' +
    (subtitleVN
      ? '<p style="margin:6px 0 0;font-size:12px;color:rgba(255,255,255,.72);font-weight:500;font-family:' + FONT + ';">' +
        subtitleVN + '</p>'
      : '') +
    '</td></tr></table>'
  );
}

/** Footer — có thể kèm tracking pixel */
function eFtr(trackingPixelHtml) {
  return (
    '<div style="padding:14px 16px;background:#f1f5f9;border-top:1px solid #e2e8f0;">' +
    '<p style="font-size:12px;color:#94a3b8;margin:0;line-height:1.7;font-family:' + FONT + ';">' +
    'Email từ <strong>Hệ thống Quản trị Chỉ đạo — ESUHAI GROUP</strong><br>' +
    'Cần hỗ trợ? Liên hệ: hoangkha@esuhai.com' +
    '</p>' +
    (trackingPixelHtml || '') +
    '</div>'
  );
}

/** Info row: label | value */
function eRow(label, value, valueColor) {
  return (
    '<tr>' +
    '<td style="color:#64748b;padding:6px 0;width:40%;max-width:140px;font-size:13px;vertical-align:top;font-family:' + FONT + ';">' +
    label + '</td>' +
    '<td style="color:' + (valueColor || '#0f172a') + ';font-weight:600;font-size:13px;vertical-align:top;font-family:' + FONT + ';">' +
    value + '</td></tr>'
  );
}

/** Status badge (pill) */
function eBadge(text, bgColor, textColor) {
  return (
    '<span style="display:inline-block;padding:6px 16px;background-color:' + (bgColor || BRAND_BLUE) +
    ';color:' + (textColor || '#fff') + ';border-radius:20px;font-size:12px;font-weight:700;font-family:' + FONT + ';">' +
    text + '</span>'
  );
}

/** CTA button */
function eBtn(text, url, bgColor) {
  return (
    '<div style="text-align:center;margin:24px 0 8px;">' +
    '<table cellpadding="0" cellspacing="0" border="0" align="center"><tr><td bgcolor="' + (bgColor || BRAND_BLUE) +
    '" style="background-color:' + (bgColor || BRAND_BLUE) + ';border-radius:10px;padding:14px 32px;">' +
    '<a href="' + url + '" style="color:#fff;font-size:15px;font-weight:700;text-decoration:none;font-family:' + FONT + ';">' +
    text + '</a></td></tr></table></div>'
  );
}

/** Bordered info section */
function eSection(title, contentHtml, accentColor) {
  const color = accentColor || BRAND_BLUE;
  return (
    '<div style="background:#fff;border-radius:10px;padding:14px 18px;margin:16px 0;border:1px solid #e2e8f0;border-left:4px solid ' + color + ';">' +
    (title
      ? '<p style="font-size:12px;font-weight:700;color:' + color + ';margin:0 0 8px;font-family:' + FONT + ';">' + title + '</p>'
      : '') +
    '<div style="font-size:13px;line-height:1.7;color:#334155;font-family:' + FONT + ';">' +
    contentHtml +
    '</div></div>'
  );
}

/** Info box with background */
function eInfoBox(contentHtml, bgColor, borderColor) {
  return (
    '<div style="background:' + (bgColor || '#eff6ff') + ';border-radius:10px;padding:14px 18px;margin:16px 0;' +
    (borderColor ? 'border:1px solid ' + borderColor + ';' : '') + '">' +
    '<table style="border-collapse:collapse;width:100%;">' +
    contentHtml +
    '</table></div>'
  );
}

/** Greeting line */
function eGreeting(name) {
  return (
    '<div style="padding:20px 16px 0;background:#fff;">' +
    '<p style="font-size:16px;font-weight:700;color:' + BRAND_DARK + ';margin:0 0 16px;font-family:' + FONT + ';">' +
    'Kính gửi ' + (name || 'Anh/Chị') + ',</p></div>'
  );
}

/** Body text paragraph */
function eText(html) {
  return '<div style="padding:0 16px;background:#fff;font-size:13px;line-height:1.7;color:#334155;font-family:' + FONT + ';">' + html + '</div>';
}

/** Divider */
function eDivider() {
  return '<div style="padding:0 16px;background:#fff;"><hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0;"></div>';
}

// =====================================================================
// PUBLIC BUILDERS — WF-specific templates
// =====================================================================

/**
 * WF1 STEP1: Yêu cầu người chỉ đạo duyệt
 */
function buildStep1Email(data) {
  const header = eHdr(
    'CHỈ ĐẠO MỚI — XIN MỜI XEM XÉT',
    'Chỉ đạo mới cần Anh/Chị xác nhận trước khi giao cho đầu mối'
  );

  const body =
    eGreeting(data.tenNguoiChiDao) +
    eText(
      '<p style="margin:0 0 12px;">Trong cuộc họp <strong>' + (data.nguon || 'BOD') + '</strong> ngày <strong>' + (data.ngayNhan || '') +
      '</strong>, Anh/Chị đã đưa ra chỉ đạo sau:</p>'
    ) +
    eSection('▸ NỘI DUNG CHỈ ĐẠO', data.noiDung || data.tieuDe || '', BRAND_BLUE) +
    eText('<p style="margin:12px 0;font-weight:700;color:' + BRAND_GREEN + ';">▸ PHÂN TÍCH SƠ BỘ (Cần Anh/Chị xác nhận):</p>') +
    '<div style="padding:0 16px;background:#fff;">' +
    eInfoBox(
      eRow('T1 — Đầu mối:', data.tenDauMoi || 'Chưa xác định') +
      eRow('T2 — Nhiệm vụ:', data.t2NhiemVu || data.tieuDe || '') +
      eRow('T3 — Chỉ tiêu:', data.t3ChiTieu || '<span style="color:' + BRAND_AMBER + ';">Cần xác nhận</span>', data.t3ChiTieu ? null : BRAND_AMBER) +
      eRow('T4 — Thời hạn:', data.t4ThoiHan || '<span style="color:' + BRAND_AMBER + ';">Cần xác nhận</span>', data.t4ThoiHan ? null : BRAND_AMBER),
      '#f0fdf4', '#bbf7d0'
    ) + '</div>' +
    eDivider() +
    eText(
      '<p style="margin:0 0 6px;font-weight:700;color:' + BRAND_PURPLE + ';">📌 TẠI SAO CẦN DUYỆT:</p>' +
      '<ul style="margin:0;padding-left:18px;">' +
      '<li style="margin:4px 0;"><strong>Đảm bảo chính xác:</strong> Xác nhận thông tin trước khi giao cho đầu mối</li>' +
      '<li style="margin:4px 0;"><strong>Tiết kiệm thời gian:</strong> ' + (data.tenDauMoi || 'Đầu mối') + ' nhận hướng dẫn rõ ràng</li>' +
      '<li style="margin:4px 0;"><strong>Theo dõi tiến độ:</strong> CEO nhìn thấy tiến độ xử lý chỉ đạo</li></ul>'
    ) +
    '<div style="padding:0 16px;background:#fff;">' +
    eBtn('▸ XEM VÀ DUYỆT CHỈ ĐẠO', data.url || '#', BRAND_BLUE) +
    '</div>' +
    eText(
      '<div style="background:#fefce8;border-radius:8px;padding:12px 16px;margin:16px 0;border:1px solid #fde68a;">' +
      '<p style="margin:0;font-size:13px;color:#92400e;">📋 Sau khi Anh/Chị duyệt, hệ thống sẽ gửi thông tin cho ' + (data.tenDauMoi || 'đầu mối') + ' để phối hợp triển khai.</p></div>'
    );

  return eWrap(header + body + '<div style="background:#fff;padding-bottom:4px;"></div>' + eFtr(buildTrackingPixel(data.id, data.recipientEmail || data.emailDauMoi)));
}

// =====================================================================
// GOOGLE FORM PREFILL — WF1 Step2 → đầu mối xác nhận 5T
// =====================================================================

const FORM_ID = '1FAIpQLSdzRTOucM4qWwlxyx3yEelDorBv2ADnL8jFUUW7-xpqdidvBw';
const FORM_ENTRY_IDS = {
  maClarification: '1684171280',
  nguonChiDao:     '1878008034',
  ngayNhanChiDao:  '1953342780',
  noiDungGoc:      '1839616630',
  dauMoiT1:        '649583359',
  t2NhiemVu:       '1319518938',
  t3ChiTieu:       '1910876946',
  t4ThoiHan:       '1661283634',
  ghiChu:          '1985703119',
};

/**
 * Build Google Form prefill URL with directive data
 * @returns {string} Prefilled Google Form URL
 */
function buildPrefillUrl(data) {
  const E = FORM_ENTRY_IDS;
  const enc = (v) => encodeURIComponent(v || '');
  const base = `https://docs.google.com/forms/d/e/${FORM_ID}/viewform?usp=pp_url`;
  const params = [
    `entry.${E.maClarification}=${enc(data.id)}`,
    `entry.${E.nguonChiDao}=${enc(data.nguon)}`,
    `entry.${E.ngayNhanChiDao}=${enc(data.ngayNhan)}`,
    `entry.${E.noiDungGoc}=${enc(data.noiDung || data.tieuDe)}`,
    `entry.${E.dauMoiT1}=${enc(data.tenDauMoi)}`,
    `entry.${E.t2NhiemVu}=${enc(data.t2NhiemVu)}`,
    `entry.${E.t3ChiTieu}=${enc(data.t3ChiTieu)}`,
    `entry.${E.t4ThoiHan}=${enc(data.t4ThoiHan)}`,
    `entry.${E.ghiChu}=${enc(data.ghiChu || '')}`,
  ].join('&');
  return `${base}&${params}`;
}

// =====================================================================
// GOOGLE FORM PREFILL — WF4 Escalation Response
// =====================================================================

const FORM_WF4_ID = '1FAIpQLSf4l-lbL-eZm9ZDtkKrz9aP9wEdgzP_X4-IlJWQihwnvCRGAA';
const FORM_WF4_ENTRY_IDS = {
  maClarification: '121280891',
  tieuDe:          '467245497',
  dauMoi:          '2135400846',
  soNgayQuaHan:    '1382889174',
  lyDoTre:         '2110302235',
  moTaChiTiet:     '629551257',
  tienDo:          '2020919115',
  ngayDuKien:      '966502385',
  camKet:          '1346486341',
};

function buildWF4PrefillUrl(data) {
  const E = FORM_WF4_ENTRY_IDS;
  const enc = (v) => encodeURIComponent(v || '');
  const base = `https://docs.google.com/forms/d/e/${FORM_WF4_ID}/viewform?usp=pp_url`;
  const params = [
    `entry.${E.maClarification}=${enc(data.id)}`,
    `entry.${E.tieuDe}=${enc(data.nhiemVu || data.tieuDe)}`,
    `entry.${E.dauMoi}=${enc(data.tenDauMoi || data.dauMoi)}`,
    `entry.${E.soNgayQuaHan}=${enc(data.overdueDays)}`,
  ].join('&');
  return `${base}&${params}`;
}

// =====================================================================
// GOOGLE FORM PREFILL — WF5 Progress Update
// =====================================================================

const FORM_WF5_ID = '1FAIpQLSePTJ_ga7DpFOw9ZVWYBLPeldZ99WX6BGjET_gPFech1-lqhQ';
const FORM_WF5_ENTRY_IDS = {
  maClarification: '835129464',
  tieuDe:          '857911239',
  dauMoi:          '349869165',
  tienDo:          '1394567439',
  noiDungDaLam:    '986028633',
  khoKhan:         '528116935',
  canHoTro:        '1717126287',
};

function buildWF5PrefillUrl(data) {
  const E = FORM_WF5_ENTRY_IDS;
  const enc = (v) => encodeURIComponent(v || '');
  const base = `https://docs.google.com/forms/d/e/${FORM_WF5_ID}/viewform?usp=pp_url`;
  const params = [
    `entry.${E.maClarification}=${enc(data.id)}`,
    `entry.${E.tieuDe}=${enc(data.tieuDe)}`,
    `entry.${E.dauMoi}=${enc(data.tenDauMoi || data.recipientName)}`,
  ].join('&');
  return `${base}&${params}`;
}

/**
 * WF1 STEP2: Gửi cho đầu mối xác nhận 5T (CTA → Google Form prefill)
 */
function buildStep2Email(data) {
  // Build prefill URL for this directive
  const formUrl = buildPrefillUrl(data);
  const header = eHdr(
    'NHIỆM VỤ MỚI — XIN MỜI XÁC NHẬN 5T',
    'Từ ' + (data.tenNguoiChiDao || 'Ban Giám Đốc')
  );

  const body =
    eGreeting(data.tenDauMoi) +
    eText(
      '<p style="margin:0 0 12px;"><strong>' + (data.tenNguoiChiDao || 'Ban Giám Đốc') + '</strong> đã ' +
      '<strong style="color:' + BRAND_GREEN + ';">PHÊ DUYỆT</strong> và giao nhiệm vụ sau:</p>'
    ) +
    eSection('▸ NỘI DUNG CHỈ ĐẠO', data.noiDung || data.tieuDe || '', BRAND_GREEN) +
    eText('<p style="margin:12px 0;font-weight:700;color:' + BRAND_BLUE + ';">▸ YÊU CẦU CỤ THỂ (5T):</p>') +
    '<div style="padding:0 16px;background:#fff;">' +
    eInfoBox(
      eRow('T1 — Đầu mối:', (data.tenDauMoi || '') + ' (đã được chỉ định)') +
      eRow('T2 — Nhiệm vụ:', data.t2NhiemVu || data.tieuDe || '') +
      eRow('T3 — Chỉ tiêu:', data.t3ChiTieu || '<span style="color:' + BRAND_AMBER + ';">Cần xác nhận</span>') +
      eRow('T4 — Thời hạn:', data.t4ThoiHan || '<span style="color:' + BRAND_AMBER + ';">Cần xác nhận</span>') +
      eRow('T5 — Liên quan:', data.t5LienQuan || '<span style="color:#94a3b8;">Chưa xác định</span>'),
      '#eff6ff', '#bfdbfe'
    ) + '</div>' +
    eDivider() +
    eText(
      '<p style="margin:0 0 6px;font-weight:700;color:' + BRAND_PURPLE + ';">📌 TẠI SAO CẦN XÁC NHẬN:</p>' +
      '<ul style="margin:0;padding-left:18px;">' +
      '<li style="margin:4px 0;"><strong>Làm rõ kỳ vọng:</strong> Đảm bảo hiểu đúng yêu cầu</li>' +
      '<li style="margin:4px 0;"><strong>Phối hợp hiệu quả:</strong> Xác nhận giúp cả đội cùng hiểu và cùng hành động</li>' +
      '<li style="margin:4px 0;"><strong>Hỗ trợ kịp thời:</strong> Ban Cố Vấn nắm tiến độ để hỗ trợ khi cần</li></ul>'
    ) +
    '<div style="padding:0 16px;background:#fff;">' +
    eBtn('▸ XÁC NHẬN THÔNG TIN 5T', formUrl, BRAND_GREEN) +
    '<p style="margin:4px 0 0;text-align:center;font-size:11px;color:#94a3b8;">' +
    '(Mở Google Form — thông tin đã điền sẵn, chỉ cần kiểm tra và gửi)</p>' +
    '</div>' +
    eText(
      '<div style="background:#dbeafe;border-radius:8px;padding:12px 16px;margin:16px 0;border:1px solid #93c5fd;">' +
      '<p style="margin:0;font-size:13px;color:#1e40af;">☑ <strong>Đồng nghiệp khác đã xác nhận 5T trong vòng 24h.</strong> Cảm ơn Anh/Chị!</p></div>'
    );

  return eWrap(header + body + '<div style="background:#fff;padding-bottom:4px;"></div>' + eFtr(buildTrackingPixel(data.id, data.recipientEmail || data.emailDauMoi)));
}

/**
 * WF2: Thông báo chỉ đạo đã confirmed 5T → đầu mối triển khai
 */
function buildProgressNotifyEmail(data) {
  const header = eHdr(
    'CHỈ ĐẠO ĐÃ XÁC NHẬN 5T — TRIỂN KHAI',
    'Chỉ đạo đã được xác nhận đầy đủ, sẵn sàng triển khai'
  );

  const body =
    eGreeting(data.tenDauMoi) +
    eText(
      '<p style="margin:0 0 12px;">Chỉ đạo sau đã được <strong style="color:' + BRAND_GREEN + ';">xác nhận đầy đủ 5T</strong> ' +
      'và sẵn sàng triển khai:</p>'
    ) +
    eSection('▸ ' + (data.tieuDe || 'Chỉ đạo'), '', BRAND_GREEN) +
    '<div style="padding:0 16px;background:#fff;">' +
    eInfoBox(
      eRow('Đầu mối:', data.tenDauMoi || '') +
      eRow('Nhiệm vụ:', data.t2NhiemVu || '') +
      eRow('Chỉ tiêu:', data.t3ChiTieu || '') +
      eRow('Thời hạn:', data.t4ThoiHan || '', data.t4ThoiHan ? BRAND_RED : null) +
      eRow('Nguồn:', data.nguon || ''),
      '#f0fdf4', '#bbf7d0'
    ) + '</div>' +
    '<div style="padding:0 16px;background:#fff;">' +
    eBtn('▸ XEM CHI TIẾT', data.url || '#', BRAND_GREEN) +
    '</div>';

  return eWrap(header + body + '<div style="background:#fff;padding-bottom:4px;"></div>' + eFtr(buildTrackingPixel(data.id, data.recipientEmail || data.emailDauMoi)));
}

// =====================================================================
// TRACKCHANGE DIFF — LELONGSON-Master 2.0
// Professional change visualization for status emails
// =====================================================================

/**
 * Build a single diff row: old → new with ± markers
 * @param {string} label - Field name (e.g. "Trạng thái")
 * @param {string} oldVal - Previous value
 * @param {string} newVal - New value
 * @param {number} lineNum - Line number for diff display
 * @returns {string} HTML table rows
 */
function eDiffRow(label, oldVal, newVal, lineNum) {
  if (!oldVal && !newVal) return '';
  if (oldVal === newVal) return ''; // No change

  const ln = lineNum || 1;
  const lnStyle = 'width:28px;padding:5px 6px;font-size:11px;font-family:monospace;color:#94a3b8;text-align:right;vertical-align:top;border-right:1px solid #e2e8f0;';

  let html = '';

  // Removed line (old value)
  if (oldVal) {
    html +=
      '<tr>' +
      '<td style="' + lnStyle + 'background:#fef2f2;">' + ln + '</td>' +
      '<td style="width:24px;padding:5px 4px;font-size:13px;font-weight:800;color:#dc2626;text-align:center;background:#fef2f2;font-family:monospace;">−</td>' +
      '<td style="padding:5px 10px;background:#fef2f2;font-size:13px;font-family:' + FONT + ';">' +
      '<span style="color:#94a3b8;font-size:11px;">' + label + ':</span> ' +
      '<span style="text-decoration:line-through;color:#991b1b;">' + oldVal + '</span>' +
      '</td></tr>';
  }

  // Added line (new value)
  if (newVal) {
    html +=
      '<tr>' +
      '<td style="' + lnStyle + 'background:#f0fdf4;">' + (ln + 1) + '</td>' +
      '<td style="width:24px;padding:5px 4px;font-size:13px;font-weight:800;color:#16a34a;text-align:center;background:#f0fdf4;font-family:monospace;">+</td>' +
      '<td style="padding:5px 10px;background:#f0fdf4;font-size:13px;font-family:' + FONT + ';">' +
      '<span style="color:#94a3b8;font-size:11px;">' + label + ':</span> ' +
      '<span style="font-weight:700;color:#166534;">' + newVal + '</span>' +
      '</td></tr>';
  }

  return html;
}

/**
 * Build complete diff block with metadata header
 * @param {Array} changes - Array of {label, oldVal, newVal}
 * @param {object} meta - {changedBy, changedAt, directiveTitle}
 * @returns {string} Full diff HTML block
 */
function eDiffBlock(changes, meta) {
  meta = meta || {};

  // Metadata header bar
  let metaBar =
    '<div style="margin:12px 16px 0;background:' + BRAND_DARK + ';border-radius:8px 8px 0 0;padding:10px 14px;">' +
    '<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>' +
    '<td style="font-size:12px;color:rgba(255,255,255,.85);font-family:monospace;font-weight:600;">' +
    'diff --directive ' + (meta.directiveTitle || 'a/chỉ-đạo').substring(0, 40) +
    '</td>' +
    '<td align="right" style="font-size:11px;color:rgba(255,255,255,.5);font-family:' + FONT + ';">' +
    (meta.changedAt || new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })) +
    '</td>' +
    '</tr></table></div>';

  // Change stats bar
  let addCount = 0, removeCount = 0;
  for (const c of changes) {
    if (c.oldVal && c.oldVal !== c.newVal) removeCount++;
    if (c.newVal && c.oldVal !== c.newVal) addCount++;
  }

  let statsBar =
    '<div style="margin:0 16px;padding:6px 14px;background:#f1f5f9;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;font-size:11px;font-family:monospace;color:#64748b;">' +
    '<span style="color:#16a34a;font-weight:700;">+' + addCount + ' thêm</span>' +
    ' &nbsp;·&nbsp; ' +
    '<span style="color:#dc2626;font-weight:700;">−' + removeCount + ' bỏ</span>' +
    (meta.changedBy ? ' &nbsp;·&nbsp; Cập nhật bởi: <strong>' + meta.changedBy + '</strong>' : '') +
    '</div>';

  // Diff table body
  let lineNum = 1;
  let diffRows = '';
  for (const c of changes) {
    if (c.oldVal === c.newVal) continue;
    diffRows += eDiffRow(c.label, c.oldVal, c.newVal, lineNum);
    lineNum += 2;
  }

  let diffTable =
    '<div style="margin:0 16px;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 8px 8px;overflow:hidden;">' +
    '<table width="100%" cellpadding="0" cellspacing="0" border="0">' +
    diffRows +
    '</table></div>';

  return metaBar + statsBar + diffTable;
}

/**
 * WF3: Thông báo thay đổi trạng thái chỉ đạo
 * LELONGSON-Master 2.0 — Professional TrackChange Diff UI
 *
 * Supports multiple field changes, not just status:
 *   data.changes = [{label, oldVal, newVal}, ...]
 *   OR data.oldStatus + data.newStatus (legacy fallback)
 */
function buildStatusChangeEmail(data) {
  const statusColors = {
    'Hoàn thành': BRAND_GREEN,
    'Đang xử lý': BRAND_BLUE,
    'Chờ làm rõ': BRAND_AMBER,
    'Cần quan tâm': BRAND_RED,
  };
  const color = statusColors[data.newStatus] || '#64748b';

  const header = eHdr(
    'CẬP NHẬT TRẠNG THÁI CHỈ ĐẠO',
    (data.tieuDe || '').substring(0, 60)
  );

  // Build changes array — support both new format and legacy fallback
  let changes = data.changes || [];
  if (changes.length === 0 && (data.oldStatus || data.newStatus)) {
    changes.push({
      label: 'Trạng thái',
      oldVal: data.oldStatus || 'Chưa rõ',
      newVal: data.newStatus || 'Chưa rõ',
    });
  }
  // Add deadline change if provided
  if (data.oldDeadline && data.newDeadline && data.oldDeadline !== data.newDeadline) {
    changes.push({
      label: 'Thời hạn',
      oldVal: data.oldDeadline,
      newVal: data.newDeadline,
    });
  }
  // Add assignee change if provided
  if (data.oldAssignee && data.newAssignee && data.oldAssignee !== data.newAssignee) {
    changes.push({
      label: 'Đầu mối',
      oldVal: data.oldAssignee,
      newVal: data.newAssignee,
    });
  }

  const diffBlock = eDiffBlock(changes, {
    directiveTitle: data.tieuDe || 'chỉ-đạo',
    changedBy: data.changedBy || data.tenDauMoi || '',
    changedAt: data.changedAt || new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
  });

  const body =
    eGreeting(data.recipientName) +
    eText(
      '<p style="margin:0 0 12px;">Chỉ đạo sau vừa được cập nhật. Vui lòng xem chi tiết thay đổi bên dưới:</p>'
    ) +
    diffBlock +
    '<div style="padding:12px 16px;background:#fff;">' +
    eInfoBox(
      eRow('Chỉ đạo:', data.tieuDe || '') +
      eRow('Đầu mối:', data.tenDauMoi || '') +
      eRow('Thời hạn:', data.t4ThoiHan || ''),
      '#f8fafc', '#e2e8f0'
    ) + '</div>' +
    '<div style="padding:0 16px;background:#fff;">' +
    eBtn('▸ XEM CHI TIẾT', data.url || '#', color) +
    '</div>';

  return eWrap(header + body + '<div style="background:#fff;padding-bottom:4px;"></div>' + eFtr(buildTrackingPixel(data.id, data.recipientEmail || data.emailDauMoi)));
}

/**
 * WF4: Escalation email — 3 levels
 * @param {'WARNING'|'ESCALATE'|'ALERT'} level
 */
function buildEscalationEmail(data, level) {
  const formUrl = buildWF4PrefillUrl(data);
  const levels = {
    WARNING: {
      titleVN: 'CẦN QUAN TÂM — Chỉ đạo cần hỗ trợ',
      subtitle: 'Chưa có cập nhật ' + (data.overdueDays || 0) + ' ngày · Tầng: Quan tâm',
      color: BRAND_AMBER,
      bgColor: '#fefce8',
      borderColor: '#fde68a',
      icon: '📋',
    },
    ESCALATE: {
      titleVN: 'TÍN HIỆU RỦI RO — Chỉ đạo cần xem xét',
      subtitle: 'Chưa có cập nhật ' + (data.overdueDays || 0) + ' ngày · Tầng: Rủi ro',
      color: '#ea580c',
      bgColor: '#fff7ed',
      borderColor: '#fed7aa',
      icon: '🔶',
    },
    ALERT: {
      titleVN: 'CẦN HỖ TRỢ ĐẶC BIỆT — Ban Cố Vấn can thiệp',
      subtitle: 'Chưa có cập nhật ' + (data.overdueDays || 0) + ' ngày · Tầng: Hỗ trợ đặc biệt · CC CEO',
      color: BRAND_RED,
      bgColor: '#fef2f2',
      borderColor: '#fecaca',
      icon: '📋',
    },
  };

  const cfg = levels[level] || levels.WARNING;
  const header = eHdr(cfg.icon + ' ' + cfg.titleVN, cfg.subtitle);

  // Badge lần escalation
  const badgeHtml =
    '<div style="text-align:center;padding:12px;background-color:' + cfg.bgColor +
    ';border-bottom:2px solid ' + cfg.color + ';">' +
    eBadge(level + ' · CHƯA CẬP NHẬT ' + (data.overdueDays || 0) + ' NGÀY', cfg.color) +
    '</div>';

  const body =
    badgeHtml +
    eGreeting(data.recipientName) +
    eText(
      '<p style="margin:0 0 12px;">Chỉ đạo sau đã <strong style="color:' + cfg.color + ';">chưa có cập nhật trong ' +
      (data.overdueDays || 0) + ' ngày</strong> và cần được xem xét:</p>'
    ) +
    '<div style="padding:0 16px;background:#fff;">' +
    eInfoBox(
      eRow('Nhiệm vụ:', data.nhiemVu || data.tieuDe || '') +
      eRow('Đầu mối:', data.tenDauMoi || '') +
      eRow('Thời hạn:', data.t4ThoiHan || '', BRAND_RED) +
      eRow('Chưa cập nhật:', (data.overdueDays || 0) + ' ngày', cfg.color) +
      eRow('Trạng thái:', data.tinhTrang || ''),
      cfg.bgColor, cfg.borderColor
    ) + '</div>' +
    eText(
      (level === 'ALERT'
        ? '<div style="background:#fef2f2;border-radius:8px;padding:12px 16px;margin:16px 0;border:1px solid #fecaca;">' +
          '<p style="margin:0;font-size:13px;color:' + BRAND_RED + ';font-weight:700;">📋 Email này đã được gửi đến CEO và Ban Cố Vấn để phối hợp hỗ trợ.</p></div>'
        : '')
    ) +
    '<div style="padding:0 16px;background:#fff;">' +
    eBtn('▸ CẬP NHẬT TÌNH HÌNH', formUrl, cfg.color) +
    '<p style="margin:4px 0 0;text-align:center;font-size:11px;color:#94a3b8;">' +
    '(Mở Google Form — chia sẻ tình hình và kế hoạch tiếp theo)</p>' +
    '</div>';

  return eWrap(header + body + '<div style="background:#fff;padding-bottom:4px;"></div>' + eFtr(buildTrackingPixel(data.id, data.recipientEmail || data.emailDauMoi)));
}

/**
 * WF5: Smart reminder — deadline sắp tới
 */
function buildReminderEmail(data) {
  const formUrl = buildWF5PrefillUrl(data);
  const daysLeft = data.daysLeft || 0;
  const isUrgent = daysLeft <= 1;
  const color = isUrgent ? BRAND_RED : daysLeft <= 3 ? BRAND_AMBER : BRAND_BLUE;

  const header = eHdr(
    'ĐỒNG HÀNH — Chỉ đạo sắp đến thời hạn',
    'Còn ' + daysLeft + ' ngày · ' + (data.tieuDe || '').substring(0, 50)
  );

  const body =
    eGreeting(data.recipientName) +
    eText(
      '<p style="margin:0 0 12px;">Chỉ đạo sau còn <strong style="color:' + color + ';">' +
      daysLeft + ' ngày</strong> đến thời hạn dự kiến. Anh/Chị có cần hỗ trợ gì không?</p>'
    ) +
    '<div style="padding:0 16px;background:#fff;">' +
    eInfoBox(
      eRow('Chỉ đạo:', data.tieuDe || '') +
      eRow('Đầu mối:', data.tenDauMoi || '') +
      eRow('Thời hạn:', data.t4ThoiHan || '', color) +
      eRow('Còn lại:', daysLeft + ' ngày', color) +
      eRow('Trạng thái:', data.tinhTrang || ''),
      isUrgent ? '#fef2f2' : '#eff6ff',
      isUrgent ? '#fecaca' : '#bfdbfe'
    ) + '</div>' +
    '<div style="padding:0 16px;background:#fff;">' +
    eBtn('▸ CẬP NHẬT TIẾN ĐỘ', formUrl, color) +
    '<p style="margin:4px 0 0;text-align:center;font-size:11px;color:#94a3b8;">' +
    '(Mở Google Form — cập nhật tiến độ thực hiện)</p>' +
    '</div>';

  return eWrap(header + body + '<div style="background:#fff;padding-bottom:4px;"></div>' + eFtr(buildTrackingPixel(data.id, data.recipientEmail || data.emailDauMoi)));
}

// =====================================================================
// EXPORTS
// =====================================================================

module.exports = {
  // Helpers (for custom templates)
  eWrap, eHdr, eFtr, eRow, eBadge, eBtn, eSection, eInfoBox, eGreeting, eText, eDivider,
  // TrackChange Diff helpers
  eDiffRow, eDiffBlock,
  // Tracking
  buildTrackingPixel, TRACKING_BASE_URL,
  // Forms
  buildPrefillUrl, buildWF4PrefillUrl, buildWF5PrefillUrl,
  FORM_ID, FORM_ENTRY_IDS,
  FORM_WF4_ID, FORM_WF4_ENTRY_IDS,
  FORM_WF5_ID, FORM_WF5_ENTRY_IDS,
  // WF builders
  buildStep1Email,
  buildStep2Email,
  buildProgressNotifyEmail,
  buildStatusChangeEmail,
  buildEscalationEmail,
  buildReminderEmail,
};
