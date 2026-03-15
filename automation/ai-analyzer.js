/**
 * ai-analyzer.js
 * CEO Directive Automation — AI Pattern Analysis & Risk Prediction
 * 
 * Capabilities:
 *   1. Pattern Analysis — phát hiện xu hướng từ dữ liệu Notion
 *   2. Risk Prediction — dự đoán chỉ đạo nào có nguy cơ thất bại
 *   3. Natural Language Query — trả lời câu hỏi tự nhiên về chỉ đạo
 *   4. Weekly Insights — tổng hợp insights tự động
 * 
 * Usage:
 *   const analyzer = require('./ai-analyzer');
 *   const insights = await analyzer.analyzePatterns();
 *   const answer = await analyzer.askQuestion("Chỉ đạo nào quá hạn?");
 */

require('dotenv').config();
const OpenAI = require('openai');

// ===== AI ROUTER: Gemini (rẻ hơn) → fallback OpenAI =====
let openai;
let MODEL;

if (process.env.GEMINI_API_KEY) {
  // Gemini API tương thích OpenAI SDK qua base URL
  openai = new OpenAI({
    apiKey: process.env.GEMINI_API_KEY,
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
  });
  MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  console.log('[AI] ☑ Router: Gemini (' + MODEL + ')');
} else if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  MODEL = 'gpt-4o-mini';
  console.log('[AI] ☑ Router: OpenAI (' + MODEL + ')');
} else {
  console.error('[AI] ✖ Không có GEMINI_API_KEY hoặc OPENAI_API_KEY trong .env');
  process.exit(1);
}

// ===== NOTION DATA LOADER =====
async function loadDirectiveData() {
  const {
    queryClarificationsStep1,
    queryConfirmed5T,
    queryOverdueClarifications,
    queryActiveClarifications,
    safeText, safeDate
  } = require('./lib/notion-client');

  const [pending, confirmed, overdue, active] = await Promise.all([
    queryClarificationsStep1().catch(() => []),
    queryConfirmed5T().catch(() => []),
    queryOverdueClarifications().catch(() => []),
    queryActiveClarifications().catch(() => []),
  ]);

  const parsePages = (pages, label) => pages.map(page => {
    const props = page.properties || {};
    return {
      label,
      title: safeText(props['Tiêu đề']?.title) || '',
      status: props['TINH_TRANG']?.select?.name || '',
      dauMoi: safeText(props['T1 - Đầu mối']?.rich_text) || '',
      nhiemVu: safeText(props['T2 - Nhiệm vụ']?.rich_text) || '',
      deadline: safeDate(props['T4 - Thời hạn']?.date) || '',
      created: page.created_time?.slice(0, 10) || '',
    };
  });

  return [
    ...parsePages(pending, 'pending'),
    ...parsePages(confirmed, 'confirmed'),
    ...parsePages(overdue, 'overdue'),
    ...parsePages(active, 'active'),
  ];
}

// ===== 1. PATTERN ANALYSIS =====
async function analyzePatterns() {
  const data = await loadDirectiveData();
  
  // Build summary stats
  const stats = {
    total: data.length,
    pending: data.filter(d => d.label === 'pending').length,
    confirmed: data.filter(d => d.label === 'confirmed').length,
    overdue: data.filter(d => d.label === 'overdue').length,
    active: data.filter(d => d.label === 'active').length,
  };

  // Group by đầu mối
  const byDauMoi = {};
  data.forEach(d => {
    const dm = d.dauMoi || 'Không rõ';
    if (!byDauMoi[dm]) byDauMoi[dm] = { total: 0, overdue: 0, items: [] };
    byDauMoi[dm].total++;
    if (d.label === 'overdue') byDauMoi[dm].overdue++;
    byDauMoi[dm].items.push(d.title?.slice(0, 50));
  });

  // Overdue details
  const overdueItems = data
    .filter(d => d.label === 'overdue')
    .map(d => {
      const days = d.deadline 
        ? Math.ceil((new Date() - new Date(d.deadline)) / 86400000)
        : 0;
      return { title: d.title, dauMoi: d.dauMoi, daysOverdue: days };
    })
    .sort((a, b) => b.daysOverdue - a.daysOverdue);

  const prompt = `Bạn là chuyên gia phân tích quản trị doanh nghiệp cho EsuhaiGroup (Giáo dục & Nhân lực Việt-Nhật).

DỮ LIỆU CHỈ ĐẠO CEO:
- Tổng: ${stats.total} chỉ đạo
- Chờ duyệt: ${stats.pending}
- Đã confirm 5T: ${stats.confirmed}
- Đang thực hiện: ${stats.active}
- Quá hạn: ${stats.overdue}

PHÂN BỐ THEO ĐẦU MỐI (top 10):
${Object.entries(byDauMoi)
  .sort((a, b) => b[1].total - a[1].total)
  .slice(0, 10)
  .map(([name, data]) => `  ${name}: ${data.total} tổng, ${data.overdue} quá hạn`)
  .join('\n')}

TOP QUÁ HẠN NẶNG NHẤT:
${overdueItems.slice(0, 5).map(d => `  - "${d.title}" (${d.dauMoi}) — ${d.daysOverdue} ngày`).join('\n')}

Phân tích và trả lời bằng tiếng Việt:
1. PATTERN: Xu hướng đáng chú ý (bottleneck, phân bố không đều, v.v.)
2. RISK: Những rủi ro cần cảnh báo CEO ngay
3. RECOMMENDATIONS: 3 hành động cụ thể CEO nên làm tuần này
4. SCORE: Chấm điểm sức khỏe hệ thống (0-100)

Trả lời ngắn gọn, thực tế, không lý thuyết.`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: 'Bạn là AI trợ lý phân tích quản trị cho CEO EsuhaiGroup. Trả lời ngắn gọn, có cấu trúc, tiếng Việt.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.3,
    max_tokens: 1000,
  });

  return {
    analysis: response.choices[0].message.content,
    stats,
    overdueTop5: overdueItems.slice(0, 5),
    byDauMoi: Object.entries(byDauMoi)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10)
      .map(([name, d]) => ({ name, total: d.total, overdue: d.overdue })),
    tokens: response.usage,
  };
}

// ===== 2. RISK PREDICTION =====
async function predictRisks() {
  const data = await loadDirectiveData();
  
  const activeItems = data.filter(d => d.label === 'active' || d.label === 'pending');
  const now = new Date();

  // Find items approaching deadline (within 3 days)
  const atRisk = activeItems.filter(d => {
    if (!d.deadline) return true; // No deadline = risk
    const daysLeft = Math.ceil((new Date(d.deadline) - now) / 86400000);
    return daysLeft <= 3 && daysLeft >= 0;
  });

  // Find items with no deadline
  const noDeadline = activeItems.filter(d => !d.deadline);

  const prompt = `Dự đoán rủi ro cho các chỉ đạo CEO:

SẮP QUÁ HẠN (≤3 ngày):
${atRisk.slice(0, 10).map(d => `  - "${d.title}" → ${d.dauMoi} → hạn ${d.deadline}`).join('\n') || '  (không có)'}

KHÔNG CÓ DEADLINE:
${noDeadline.slice(0, 10).map(d => `  - "${d.title}" → ${d.dauMoi}`).join('\n') || '  (không có)'}

Với mỗi mục, dự đoán:
- Xác suất thất bại (%)
- Lý do
- Hành động khuyến nghị

Trả lời tiếng Việt, ngắn gọn.`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: 'Bạn là AI dự đoán rủi ro quản trị. Phân tích dựa trên dữ liệu thực tế.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.2,
    max_tokens: 800,
  });

  return {
    prediction: response.choices[0].message.content,
    atRiskCount: atRisk.length,
    noDeadlineCount: noDeadline.length,
    tokens: response.usage,
  };
}

// ===== 3. NATURAL LANGUAGE QUERY =====
async function askQuestion(question) {
  const data = await loadDirectiveData();

  // Build concise context
  const context = data.slice(0, 30).map(d => 
    `[${d.label}] "${d.title}" | Đầu mối: ${d.dauMoi} | Hạn: ${d.deadline} | Trạng thái: ${d.status}`
  ).join('\n');

  const stats = {
    total: data.length,
    pending: data.filter(d => d.label === 'pending').length,
    overdue: data.filter(d => d.label === 'overdue').length,
    active: data.filter(d => d.label === 'active').length,
  };

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: `Bạn là AI trợ lý CEO EsuhaiGroup. Trả lời câu hỏi dựa trên dữ liệu chỉ đạo bên dưới.
Trả lời ngắn gọn, tiếng Việt, có cấu trúc. Nếu không đủ dữ liệu, nói rõ.

THỐNG KÊ: ${stats.total} tổng, ${stats.pending} chờ duyệt, ${stats.overdue} quá hạn, ${stats.active} đang thực hiện.

DỮ LIỆU (30 mới nhất):
${context}` },
      { role: 'user', content: question }
    ],
    temperature: 0.3,
    max_tokens: 600,
  });

  return {
    answer: response.choices[0].message.content,
    tokens: response.usage,
  };
}

// ===== EXPORTS =====
module.exports = { analyzePatterns, predictRisks, askQuestion, loadDirectiveData };

// ===== CLI =====
if (require.main === module) {
  const cmd = process.argv[2] || 'patterns';
  
  (async () => {
    try {
      if (cmd === 'patterns') {
        console.log('🧠 Analyzing patterns...\n');
        const result = await analyzePatterns();
        console.log(result.analysis);
        console.log(`\n📊 Tokens: ${result.tokens?.total_tokens || '?'}`);
      } else if (cmd === 'risks') {
        console.log('⚠️ Predicting risks...\n');
        const result = await predictRisks();
        console.log(result.prediction);
        console.log(`\n📊 Tokens: ${result.tokens?.total_tokens || '?'}`);
      } else {
        console.log(`💬 Asking: "${cmd}"...\n`);
        const result = await askQuestion(cmd);
        console.log(result.answer);
        console.log(`\n📊 Tokens: ${result.tokens?.total_tokens || '?'}`);
      }
    } catch (err) {
      console.error('❌ Error:', err.message);
    }
  })();
}
