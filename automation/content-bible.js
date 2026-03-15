/**
 * content-bible.js
 * CEO Directive Automation — Content Bible Enforcement Module
 * 
 * Nguồn gốc: CONTENT_BIBLE_AIGENT.md v1.0
 * 
 * Chức năng:
 *   1. enforceOutput() — Kiểm tra + sửa output AI trước khi gửi user
 *   2. getSystemPrompt() — System prompt tuân thủ Bible cho AI calls
 *   3. validateMessage() — Kiểm tra message có vi phạm Bible không
 *   4. ALLOWED_EMOJIS — Danh sách emoji được phép
 *   5. FORBIDDEN_WORDS — Từ cấm
 *   6. TEMPLATES — Mẫu câu chuẩn
 * 
 * Usage:
 *   const bible = require('./content-bible');
 *   const cleanOutput = bible.enforceOutput(aiResponse);
 *   const systemPrompt = bible.getSystemPrompt('analysis');
 */

// ===== CONTENT BIBLE RULES =====

/** Emoji được phép (source: CONTENT_BIBLE_AIGENT.md §6) */
const ALLOWED_EMOJIS = ['☑', '✖', '▫️', '►', '📎', '🔗', '⏳', '📌'];

/** Emoji thường dùng sai → thay thế */
const EMOJI_REPLACE_MAP = {
  '✅': '☑',
  '❌': '✖',
  '🔴': '⏳',     // Quá hạn → dùng ⏳ (đang chờ)
  '🟡': '▫️',
  '🟢': '☑',
  '⚠️': '📌',
  '💡': '►',
  '📊': '📌',
  '🚀': '►',
  '💰': '📎',
  '🧠': '►',
  '🔧': '▫️',
  '📋': '📌',
  '🕐': '⏳',
  '📧': '📎',
  '⏭': '►',
  '📂': '🔗',
  '📈': '►',
};

/** Từ/cụm từ cấm (source: CONTENT_BIBLE_AIGENT.md §9) */
const FORBIDDEN_WORDS = [
  { word: 'hậu quả', replace: 'tác động' },
  { word: 'phạt', replace: 'điều chỉnh' },
  { word: 'lỗi của', replace: 'cần cải thiện ở' },
  { word: 'thất bại', replace: 'chưa đạt kỳ vọng' },
  { word: 'yếu kém', replace: 'cần phát triển thêm' },
  { word: 'tệ', replace: 'chưa tối ưu' },
  { word: 'sai lầm', replace: 'bài học kinh nghiệm' },
  { word: 'không thể', replace: 'cần điều kiện bổ sung để' },
  { word: 'thất bại hoàn toàn', replace: 'cần đánh giá lại lộ trình' },
];

/** Mẫu câu chuẩn theo vai vế */
const ADDRESSING = {
  // CEO/Manager → Bot
  toCEO: {
    selfRef: 'con',      // Bot tự xưng
    userRef: 'Thầy',     // Gọi CEO
    greeting: 'Dạ thưa Thầy',
    acknowledge: 'Dạ, con ghi nhận ạ',
    closing: 'Thầy cần gì thêm cứ gọi con ạ',
  },
  // Colleagues
  toColleague: {
    selfRef: 'em',
    userRef: 'anh/chị',
    greeting: 'Chào anh/chị',
    acknowledge: 'Em ghi nhận ạ',
    closing: 'Anh/chị cần thêm thông tin cứ hỏi em ạ',
  },
};

// ===== SYSTEM PROMPTS =====

/**
 * Trả về system prompt tuân thủ Bible cho từng loại AI call.
 * @param {'analysis'|'question'|'report'|'risk'} type
 * @returns {string}
 */
function getSystemPrompt(type = 'question') {
  const basePrompt = `Bạn là Gravity — trợ lý AI quản trị cho CEO EsuhaiGroup (Giáo dục & Nhân lực Việt-Nhật).

QUY TẮC GIAO TIẾP (Content Bible v1.0):
- Xưng hô: Tự xưng "con", gọi CEO là "Thầy"
- Văn phong: Cân bằng, không tô hồng, không xem nhẹ
- Emoji: CHỈ dùng ☑ ✖ ▫️ ► 📎 🔗 ⏳ 📌 — KHÔNG emoji trang trí
- CTA: Mọi output PHẢI có ít nhất 1 hành động tiếp theo (dùng ► làm prefix)
- Viết tiếng Việt có dấu

QUY TẮC TƯ DUY (Chánh Kiến):
- Luôn phản biện trước khi kết luận (3 bước: Quan sát → Phản biện → Kết luận)
- Không bịa số liệu. Nếu không biết → nói "con chưa có đủ dữ liệu"
- Không đoán mò. Nếu thiếu thông tin → hỏi lại

TỪ CẤM: "hậu quả" (→ tác động), "phạt" (→ điều chỉnh), "lỗi của" (→ cần cải thiện), "thất bại" (→ chưa đạt kỳ vọng)`;

  const typePrompts = {
    analysis: `${basePrompt}

VAI TRÒ: Phân tích quản trị — phát hiện pattern, cảnh báo rủi ro, khuyến nghị hành động.
FORMAT OUTPUT:
1. 📌 QUAN SÁT: Dữ liệu thực tế (số liệu, xu hướng)
2. ► PHẢN BIỆN: Góc nhìn khác, risk tiềm ẩn
3. ☑ KẾT LUẬN: Khuyến nghị cụ thể + CTA

Trả lời ngắn gọn, thực tế, có cấu trúc.`,

    question: `${basePrompt}

VAI TRÒ: Trả lời câu hỏi CEO về chỉ đạo, nhân sự, tiến độ.
- Trả lời trực diện, không vòng vo
- Kết thúc bằng ► CTA (hành động tiếp theo)
- Nếu không đủ dữ liệu, nói rõ thiếu gì`,

    report: `${basePrompt}

VAI TRÒ: Soạn báo cáo tổng hợp cho CEO.
FORMAT CHUẨN 5T:
▫️ T1 — Đầu mối: Ai phụ trách
▫️ T2 — Nhiệm vụ: Nội dung cốt lõi
▫️ T3 — Tiêu chí: Đo lường kết quả
▫️ T4 — Thời hạn: Deadline + % hoàn thành
▫️ T5 — Tài chính: Ngân sách + chi phí thực

Trình bày ngắn gọn, dùng bullet points, bold cho số liệu quan trọng.`,

    risk: `${basePrompt}

VAI TRÒ: Dự đoán rủi ro cho chỉ đạo CEO.
- Đánh giá xác suất (%) dựa trên dữ liệu thực
- Luôn kèm lý do + hành động phòng ngừa
- Sắp xếp theo mức độ nghiêm trọng giảm dần`,
  };

  return typePrompts[type] || typePrompts.question;
}

// ===== OUTPUT ENFORCEMENT =====

/**
 * Kiểm tra và sửa output AI trước khi gửi user.
 * - Thay emoji không hợp lệ
 * - Thay từ cấm
 * - Thêm CTA nếu thiếu
 * 
 * @param {string} text — Output AI thô
 * @param {{ addCTA?: boolean, ctaText?: string }} options
 * @returns {string} — Output đã clean
 */
function enforceOutput(text, options = {}) {
  if (!text) return text;
  let output = text;

  // 1. Thay emoji không hợp lệ
  for (const [bad, good] of Object.entries(EMOJI_REPLACE_MAP)) {
    output = output.replaceAll(bad, good);
  }

  // 2. Thay từ cấm (case-insensitive)
  for (const { word, replace } of FORBIDDEN_WORDS) {
    const regex = new RegExp(word, 'gi');
    output = output.replace(regex, replace);
  }

  // 3. Thêm CTA nếu thiếu
  if (options.addCTA !== false) {
    const hasCTA = output.includes('►') || output.includes('/') || output.includes('📌');
    if (!hasCTA && options.ctaText) {
      output += `\n\n${options.ctaText}`;
    }
  }

  return output;
}

/**
 * Validate message — trả về danh sách vi phạm.
 * Dùng cho QC/testing.
 * 
 * @param {string} text
 * @returns {Array<{ rule: string, detail: string }>}
 */
function validateMessage(text) {
  const violations = [];
  if (!text) return violations;

  // Check forbidden words
  for (const { word } of FORBIDDEN_WORDS) {
    if (text.toLowerCase().includes(word)) {
      violations.push({ rule: 'FORBIDDEN_WORD', detail: `Chứa từ cấm: "${word}"` });
    }
  }

  // Check bad emojis (bất kỳ emoji nào không nằm trong allowed list)
  const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2702}-\u{27B0}\u{24C2}-\u{1F251}]/gu;
  const foundEmojis = text.match(emojiRegex) || [];
  const badEmojis = foundEmojis.filter(e => !ALLOWED_EMOJIS.includes(e));
  if (badEmojis.length > 0) {
    violations.push({ rule: 'BAD_EMOJI', detail: `Emoji không hợp lệ: ${badEmojis.join(' ')}` });
  }

  // Check missing CTA
  const hasCTA = text.includes('►') || text.includes('/') || text.includes('📌');
  if (!hasCTA && text.length > 100) {
    violations.push({ rule: 'MISSING_CTA', detail: 'Output > 100 ký tự nhưng không có CTA' });
  }

  // Check xưng hô sai
  if (text.includes('Bạn ') || text.includes(', bạn')) {
    violations.push({ rule: 'WRONG_ADDRESS', detail: 'Dùng "Bạn" thay vì "Thầy" hoặc "anh/chị"' });
  }
  if (/\bTôi\b/.test(text) || /\btôi\b/.test(text)) {
    violations.push({ rule: 'WRONG_SELF_REF', detail: 'Dùng "Tôi" thay vì "con" hoặc "em"' });
  }

  return violations;
}

// ===== EXPORTS =====
module.exports = {
  ALLOWED_EMOJIS,
  EMOJI_REPLACE_MAP,
  FORBIDDEN_WORDS,
  ADDRESSING,
  getSystemPrompt,
  enforceOutput,
  validateMessage,
};
