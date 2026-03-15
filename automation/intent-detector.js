/**
 * intent-detector.js
 * CEO Directive Automation — Intent Detection Engine
 * 
 * Port từ Signal Bot chat_engine.py (CEO_BRAIN) → Node.js
 * 
 * Nguyên tắc:
 *   - Keyword matching nhanh — KHÔNG gọi API
 *   - Tiết kiệm API cost: greeting, thanks, status → trả lời cục bộ
 *   - 12 intent types phủ hết use-case CEO
 *   - Bible-compliant: xưng hô Thầy/con, emoji theo chuẩn
 * 
 * Content Bible ref: CONTENT_BIBLE_AIGENT.md v1.0
 * 
 * Usage:
 *   const { detectIntent, getQuickReply } = require('./intent-detector');
 *   const intent = detectIntent("Chào em");
 *   if (!intent.needsAI) {
 *     reply = getQuickReply(intent);  // Trả lời ngay, không tốn API
 *   }
 */

// ===== INTENT TYPES =====
// Mỗi intent có: type, needsAI, confidence, params
const INTENT_TYPES = {
  GREETING: 'greeting',       // Chào hỏi → trả lời cục bộ
  THANKS: 'thanks',           // Cảm ơn → trả lời cục bộ
  STATUS: 'status',           // Hỏi trạng thái hệ thống
  OVERDUE: 'overdue',         // Hỏi quá hạn
  SEARCH: 'search',           // Tìm kiếm chỉ đạo
  REPORT: 'report',           // Yêu cầu báo cáo
  RUN_WF: 'run_workflow',     // Chạy workflow
  AI_ANALYZE: 'ai_analyze',   // Phân tích AI
  AI_QUESTION: 'ai_question', // Hỏi đáp AI tự do
  HELP: 'help',               // Hướng dẫn sử dụng
  IDENTITY: 'identity',       // "Em là ai?"
  COST: 'cost',               // Hỏi chi phí API
  UNKNOWN: 'unknown',         // Không nhận diện → cần AI
};

// ===== KEYWORD PATTERNS =====
// Port từ Signal Bot chat_engine.py detect_intent()
// Sắp xếp theo độ ưu tiên: intent cụ thể trước, chung sau

const PATTERNS = [
  // --- Không cần AI ---
  {
    type: INTENT_TYPES.GREETING,
    needsAI: false,
    // Exact match hoặc prefix match
    exact: ['hello', 'hi', 'xin chào', 'chào', 'alo', 'hey', 'yo', 'ê',
            'chào em', 'chào bot', 'chào gravity', 'hi em'],
    prefixes: ['chào ', 'hello ', 'hi ', 'hey ', 'alo ', 'xin chào '],
  },
  {
    type: INTENT_TYPES.THANKS,
    needsAI: false,
    contains: ['cảm ơn', 'cám ơn', 'thank', 'thanks', 'tks', 'ok em',
               'good job', 'giỏi lắm', 'tốt lắm', 'hay lắm', 'đúng rồi'],
  },
  {
    type: INTENT_TYPES.IDENTITY,
    needsAI: false,
    contains: ['em là ai', 'mày là ai', 'who are you', 'giới thiệu đi',
               'tên gì', 'bot gì', 'ai đây'],
  },
  {
    type: INTENT_TYPES.COST,
    needsAI: false,
    contains: ['chi phí', 'cost', 'tốn bao nhiêu', 'budget', 'ngân sách',
               'tiền api', 'api cost', 'token cost'],
  },
  {
    type: INTENT_TYPES.HELP,
    needsAI: false,
    contains: ['giúp', 'help', 'hướng dẫn', 'cách dùng', 'cách sử dụng',
               'làm sao', 'how to', 'em làm được gì', 'em biết gì',
               'lệnh gì', 'command', 'khả năng'],
  },

  // --- Cần bridge/data nhưng không cần AI ---
  {
    type: INTENT_TYPES.STATUS,
    needsAI: false,
    contains: ['trạng thái', 'status', 'tình hình', 'thống kê', 'stats',
               'hệ thống', 'overview', 'tổng quan', 'chỉ đạo hiện tại'],
  },
  {
    type: INTENT_TYPES.OVERDUE,
    needsAI: false,
    contains: ['quá hạn', 'overdue', 'trễ hạn', 'chậm', 'muộn',
               'chưa hoàn thành', 'deadline qua', 'hạn chót'],
  },
  {
    type: INTENT_TYPES.RUN_WF,
    needsAI: false,
    contains: ['chạy', 'run', 'khởi chạy', 'trigger', 'kích hoạt',
               'gửi email', 'send email', 'workflow'],
    // Extract WF name vào params
    extractWF: true,
  },
  {
    type: INTENT_TYPES.REPORT,
    needsAI: false,
    contains: ['báo cáo', 'report', 'tổng hợp', 'digest', 'summary tuần',
               'weekly', 'monthly', 'hàng tuần', 'hàng tháng'],
  },

  // --- Cần AI ---
  {
    type: INTENT_TYPES.SEARCH,
    needsAI: true,
    contains: ['tìm', 'search', 'kiếm', 'có chỉ đạo nào', 'ai phụ trách',
               'liên quan đến', 'về vấn đề', 'hồ sơ', 'tra cứu'],
    extractQuery: true,
  },
  {
    type: INTENT_TYPES.AI_ANALYZE,
    needsAI: true,
    contains: ['phân tích', 'analyze', 'đánh giá', 'assessment',
               'nhận xét', 'dự đoán', 'predict', 'rủi ro', 'risk',
               'xu hướng', 'trend', 'pattern'],
  },
];

// ===== CORE DETECTION FUNCTION =====
/**
 * Nhận diện intent từ text — KHÔNG gọi API.
 * Port từ Signal Bot chat_engine.py detect_intent()
 * 
 * @param {string} text — Tin nhắn user
 * @returns {{ type: string, needsAI: boolean, confidence: number, params: object }}
 */
function detectIntent(text) {
  if (!text || typeof text !== 'string') {
    return { type: INTENT_TYPES.UNKNOWN, needsAI: true, confidence: 0, params: {} };
  }

  const normalized = text.toLowerCase().trim();
  
  // Bỏ qua command telegram (/start, /trangthai...) — đã handle riêng
  if (normalized.startsWith('/')) {
    return { type: INTENT_TYPES.UNKNOWN, needsAI: false, confidence: 1.0, params: { isCommand: true } };
  }

  for (const pattern of PATTERNS) {
    let matched = false;

    // Check exact match
    if (pattern.exact && pattern.exact.includes(normalized)) {
      matched = true;
    }

    // Check prefix match
    if (!matched && pattern.prefixes) {
      matched = pattern.prefixes.some(p => normalized.startsWith(p));
    }

    // Check contains match
    if (!matched && pattern.contains) {
      matched = pattern.contains.some(kw => normalized.includes(kw));
    }

    if (matched) {
      const result = {
        type: pattern.type,
        needsAI: pattern.needsAI,
        confidence: 0.9,
        params: {},
      };

      // Extract workflow name nếu là RUN_WF
      if (pattern.extractWF) {
        result.params.workflow = extractWorkflowName(normalized);
      }

      // Extract search query nếu là SEARCH
      if (pattern.extractQuery) {
        result.params.query = text.trim(); // Giữ nguyên case cho search
      }

      return result;
    }
  }

  // Default: câu hỏi AI tự do — cần gọi API
  return {
    type: INTENT_TYPES.AI_QUESTION,
    needsAI: true,
    confidence: 0.5,
    params: { query: text.trim() },
  };
}

// ===== WORKFLOW NAME EXTRACTOR =====
function extractWorkflowName(text) {
  const wfMap = {
    'wf1': ['wf1', 'email duyệt', 'approval'],
    'wf2': ['wf2', 'tiến độ', 'progress'],
    'wf3': ['wf3', 'trạng thái', 'status change'],
    'wf4': ['wf4', 'leo thang', 'escalation'],
    'wf5': ['wf5', 'nhắc nhở', 'reminder'],
    'wf6': ['wf6', 'dashboard', 'sync'],
    'hm50': ['hm50', '50 hạng mục', '50 hm'],
    'all': ['all', 'tất cả'],
  };

  for (const [wfName, keywords] of Object.entries(wfMap)) {
    if (keywords.some(kw => text.includes(kw))) {
      return wfName;
    }
  }
  return null; // Không nhận diện được WF cụ thể
}

// ===== QUICK REPLIES — Trả lời không cần API =====
// Content Bible compliant: xưng Thầy/con, emoji 📌☑⏳
/**
 * Trả về quick reply cho intent không cần AI.
 * Tuân thủ CONTENT_BIBLE_AIGENT.md:
 *   - Xưng hô: Thầy/con
 *   - Emoji: chỉ 8 icon cho phép
 *   - CTA: luôn kèm hành động tiếp theo
 * 
 * @param {{ type: string }} intent
 * @param {{ firstName?: string }} context — Optional user context
 * @returns {string|null} — Reply text, null nếu chuyển AI
 */
function getQuickReply(intent, context = {}) {
  const name = context.firstName || 'Thầy';
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? 'buổi sáng' : hour < 18 ? 'buổi chiều' : 'buổi tối';

  switch (intent.type) {
    case INTENT_TYPES.GREETING:
      return `Dạ, chào ${name} ${timeGreeting} ạ. Con sẵn sàng hỗ trợ.

► Thầy cần con làm gì ạ?
📌 /trangthai — Xem tổng quan
📌 /quahan — Kiểm tra quá hạn
📌 /hoi <câu hỏi> — Hỏi AI`;

    case INTENT_TYPES.THANKS:
      return `Dạ, con cảm ơn ${name} ạ. Thầy cần gì thêm cứ gọi con.

► Tiếp tục:
📌 /baocao — Xem báo cáo
📌 /phantich — AI phân tích`;

    case INTENT_TYPES.IDENTITY:
      return `Dạ thưa ${name}, con là Gravity Bot — hệ thống tự động quản lý chỉ đạo CEO của EsuhaiGroup.

▫️ Theo dõi chỉ đạo qua Notion
▫️ Gửi email duyệt, nhắc nhở, leo thang (WF1-6)
▫️ Phân tích AI — pattern, rủi ro, báo cáo
▫️ Kết nối Dashboard + Google Forms

► Gõ /start để xem danh sách lệnh ạ.`;

    case INTENT_TYPES.HELP:
      return `Dạ ${name}, đây là các lệnh con hỗ trợ:

📌 /trangthai — Trạng thái tổng quan
📌 /quahan — Chỉ đạo quá hạn
📌 /tim <từ khóa> — Tìm chỉ đạo
📌 /chay <wf> — Chạy workflow (wf1-6, hm50, all)
📌 /baocao — Báo cáo nhanh
📌 /hoi <câu hỏi> — Hỏi AI
📌 /phantich — AI phân tích
📌 /baocaotuan — Báo cáo tuần AI

► Hoặc Thầy chat tự nhiên, con sẽ hiểu ạ.`;

    case INTENT_TYPES.COST:
      // TODO: Khi có cost tracker module, lấy dữ liệu thực
      return `Dạ ${name}, hiện con đang dùng GPT-4o-mini cho phân tích.

▫️ Mỗi lần /phantich: ~1,000 tokens ≈ $0.0015
▫️ Mỗi lần /hoi: ~600 tokens ≈ $0.0009
▫️ Báo cáo tuần: ~1,800 tokens ≈ $0.0027

📌 Con sẽ thêm cost tracking chi tiết ở bản cập nhật tiếp theo ạ.`;

    case INTENT_TYPES.STATUS:
      // Redirect tới command — bridge sẽ xử lý
      return null; // Signal: cần gọi bridge

    case INTENT_TYPES.OVERDUE:
      return null; // Signal: cần gọi bridge

    case INTENT_TYPES.REPORT:
      return null; // Signal: cần gọi bridge

    case INTENT_TYPES.RUN_WF:
      return null; // Signal: cần gọi bridge + confirmation

    default:
      return null; // Chuyển AI
  }
}

// ===== INTENT TO COMMAND MAPPING =====
/**
 * Map intent → Telegram command tương ứng.
 * Dùng khi user chat tự nhiên thay vì gõ /command.
 * Ví dụ: "Có gì quá hạn không?" → /quahan
 */
function intentToCommand(intent) {
  const map = {
    [INTENT_TYPES.STATUS]: '/trangthai',
    [INTENT_TYPES.OVERDUE]: '/quahan',
    [INTENT_TYPES.REPORT]: '/baocao',
    [INTENT_TYPES.AI_ANALYZE]: '/phantich',
    [INTENT_TYPES.SEARCH]: '/tim',
    [INTENT_TYPES.RUN_WF]: '/chay',
  };
  return map[intent.type] || null;
}

// ===== EXPORTS =====
module.exports = {
  INTENT_TYPES,
  detectIntent,
  getQuickReply,
  intentToCommand,
  extractWorkflowName,
};
