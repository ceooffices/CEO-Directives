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
 *   const answer = await analyzer.askQuestion("Chỉ đạo nào cần quan tâm?");
 */

require('dotenv').config();
const { aiCall, MODEL, PROVIDER } = require('./lib/ai-router');

// ===== SUPABASE DATA LOADER =====
async function loadDirectiveData() {
  const {
    queryPendingApproval,
    queryConfirmed5T,
    queryOverdueDirectives,
    queryActiveDirectives,
  } = require('./lib/supabase-client');

  const [pending, confirmed, overdue, active] = await Promise.all([
    queryPendingApproval().catch(() => []),
    queryConfirmed5T().catch(() => []),
    queryOverdueDirectives().catch(() => []),
    queryActiveDirectives().catch(() => []),
  ]);

  const parseRows = (rows, label) => rows.map(row => ({
    label,
    title: row.t2_nhiem_vu || row.directive_code || '',
    status: row.tinh_trang || '',
    dauMoi: row.t1_dau_moi || '',
    nhiemVu: row.t2_nhiem_vu || '',
    deadline: row.t4_thoi_han || '',
    created: row.created_at?.slice(0, 10) || '',
  }));

  return [
    ...parseRows(pending, 'pending'),
    ...parseRows(confirmed, 'confirmed'),
    ...parseRows(overdue, 'overdue'),
    ...parseRows(active, 'active'),
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
- Cần quan tâm: ${stats.overdue}

PHÂN BỐ THEO ĐẦU MỐI (top 10):
${Object.entries(byDauMoi)
  .sort((a, b) => b[1].total - a[1].total)
  .slice(0, 10)
  .map(([name, data]) => `  ${name}: ${data.total} tổng, ${data.overdue} cần quan tâm`)
  .join('\n')}

CẦN QUAN TÂM NHẤT:
${overdueItems.slice(0, 5).map(d => `  - "${d.title}" (${d.dauMoi}) — ${d.daysOverdue} ngày`).join('\n')}

Phân tích và trả lời bằng tiếng Việt:
1. PATTERN: Xu hướng đáng chú ý (bottleneck, phân bố không đều, v.v.)
2. RISK: Những rủi ro cần cảnh báo CEO ngay
3. RECOMMENDATIONS: 3 hành động cụ thể CEO nên làm tuần này
4. SCORE: Chấm điểm sức khỏe hệ thống (0-100)

Trả lời ngắn gọn, thực tế, không lý thuyết.`;

  const response = await aiCall([
      { role: 'system', content: 'Bạn là AI trợ lý phân tích quản trị cho CEO EsuhaiGroup. Trả lời ngắn gọn, có cấu trúc, tiếng Việt.' },
      { role: 'user', content: prompt }
    ], { temperature: 0.3, max_tokens: 1000 });

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

SẮP CẦN QUAN TÂM (≤3 ngày):
${atRisk.slice(0, 10).map(d => `  - "${d.title}" → ${d.dauMoi} → hạn ${d.deadline}`).join('\n') || '  (không có)'}

KHÔNG CÓ DEADLINE:
${noDeadline.slice(0, 10).map(d => `  - "${d.title}" → ${d.dauMoi}`).join('\n') || '  (không có)'}

Với mỗi mục, dự đoán:
- Xác suất thất bại (%)
- Lý do
- Hành động khuyến nghị

Trả lời tiếng Việt, ngắn gọn.`;

  const response = await aiCall([
      { role: 'system', content: 'Bạn là AI dự đoán rủi ro quản trị. Phân tích dựa trên dữ liệu thực tế.' },
      { role: 'user', content: prompt }
    ], { temperature: 0.2, max_tokens: 800 });

  return {
    prediction: response.choices[0].message.content,
    atRiskCount: atRisk.length,
    noDeadlineCount: noDeadline.length,
    tokens: response.usage,
  };
}

// ===== 3. NATURAL LANGUAGE QUERY (S2.2 — RAG pipeline) =====
async function askQuestion(question) {
  const data = await loadDirectiveData();

  // Build concise directive context (top 30 mới nhất)
  const directiveContext = data.slice(0, 30).map(d =>
    `[${d.label}] "${d.title}" | Đầu mối: ${d.dauMoi} | Hạn: ${d.deadline} | Trạng thái: ${d.status}`
  ).join('\n');

  const stats = {
    total: data.length,
    pending: data.filter(d => d.label === 'pending').length,
    overdue: data.filter(d => d.label === 'overdue').length,
    active: data.filter(d => d.label === 'active').length,
  };

  // RAG: Lấy context liên quan từ knowledge base thay vì inject toàn bộ
  let ragContext = '';
  try {
    const rag = require('./rag-engine');
    await rag.init();
    ragContext = rag.buildContext(question, 5, 2000);
  } catch (err) {
    console.warn('[AI] ⚠ RAG không khả dụng, chỉ dùng directive data:', err.message);
  }

  const systemPrompt = `Bạn là AI trợ lý CEO EsuhaiGroup. Trả lời câu hỏi dựa trên dữ liệu chỉ đạo và kiến thức nền bên dưới.
Trả lời ngắn gọn, tiếng Việt, có cấu trúc. Nếu không đủ dữ liệu, nói rõ.

THỐNG KÊ: ${stats.total} tổng, ${stats.pending} chờ duyệt, ${stats.overdue} cần quan tâm, ${stats.active} đang thực hiện.

DỮ LIỆU CHỈ ĐẠO (30 mới nhất):
${directiveContext}${ragContext ? `

KIẾN THỨC NỀN (RAG):
${ragContext}` : ''}`;

  const response = await aiCall([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question }
    ], { temperature: 0.3, max_tokens: 600 });

  return {
    answer: response.choices[0].message.content,
    tokens: response.usage,
  };
}

// ===== EXPORTS =====
module.exports = { analyzePatterns, predictRisks, askQuestion, loadDirectiveData };

// ===== CLI =====
if (require.main === module) {
  const args = process.argv.slice(2);
  const cmd = args.find(a => !a.startsWith('--')) || 'patterns';
  
  // Parse --format html|pdf|both
  const fmtIdx = args.indexOf('--format');
  const format = fmtIdx >= 0 ? args[fmtIdx + 1] : null;
  const sendTG = args.includes('--tg');
  
  (async () => {
    try {
      let content = '';
      let title = '';

      if (cmd === 'patterns') {
        console.log('🧠 Analyzing patterns...\n');
        const result = await analyzePatterns();
        content = result.analysis;
        title = 'Phân tích xu hướng chỉ đạo CEO';
        console.log(content);
        console.log(`\n📊 Tokens: ${result.tokens?.total_tokens || '?'}`);
      } else if (cmd === 'risks') {
        console.log('⚠️ Predicting risks...\n');
        const result = await predictRisks();
        content = result.prediction;
        title = 'Dự đoán rủi ro chỉ đạo CEO';
        console.log(content);
        console.log(`\n📊 Tokens: ${result.tokens?.total_tokens || '?'}`);
      } else {
        console.log(`💬 Asking: "${cmd}"...\n`);
        const result = await askQuestion(cmd);
        content = result.answer;
        title = `Trả lời — ${cmd.slice(0, 40)}`;
        console.log(content);
        console.log(`\n📊 Tokens: ${result.tokens?.total_tokens || '?'}`);
      }

      // Export to HTML/PDF if --format specified
      if (format && content) {
        const { generateReport } = require('./lib/report-generator');
        console.log(`\n📄 Xuất ${format.toUpperCase()}...`);
        const report = await generateReport(title, content, { format, sendTG });
        if (report.htmlPath) console.log(`  ✅ HTML: ${report.htmlPath}`);
        if (report.pdfPath)  console.log(`  ✅ PDF:  ${report.pdfPath}`);
      }
    } catch (err) {
      console.error('❌ Error:', err.message);
    }
  })();
}
