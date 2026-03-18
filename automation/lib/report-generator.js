/**
 * report-generator.js
 * Xuất HTML + PDF chuẩn format CEO_Office_Hub
 * 
 * Design tokens match CEO_Office_Hubs/src/convert/pdf.py:
 * - Font: Segoe UI, 16pt body
 * - Colors: Navy #1a1a2e, body #2d3436, accent #457b9d
 * - Tables: zebra striping, border #dfe6e9
 * - Layout: A4, 6mm margin
 * 
 * Usage:
 *   const { generateHTML, generatePDF, generateReport } = require('./lib/report-generator');
 *   await generateReport('Phân tích chỉ đạo', markdownContent, { format: 'both' });
 */

const fs = require('fs');
const path = require('path');

// ===== CEO_OFFICE_HUB CSS TEMPLATE =====
// Ported from CEO_Office_Hubs/src/convert/pdf.py get_enhanced_css_for_pdf()

const CEO_CSS = `
  * {
    -webkit-print-color-adjust: exact !important;
    color-adjust: exact !important;
    box-sizing: border-box;
  }

  body {
    font-family: 'Segoe UI', 'Arial', 'Helvetica Neue', 'Apple Color Emoji', sans-serif;
    font-size: 16pt;
    line-height: 1.6;
    color: #1a1a1a;
    background: #fff;
    margin: 0;
    padding: 20px 24px;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }

  /* Title (first H1) */
  h1:first-of-type {
    font-size: 22pt;
    font-weight: 800;
    color: #1a1a2e;
    margin: 0 0 12pt 0;
    padding-bottom: 8pt;
    border-bottom: 3px solid #1a1a2e;
    letter-spacing: -0.3pt;
    page-break-after: avoid;
  }

  h1 {
    font-size: 20pt;
    font-weight: 800;
    color: #1a1a2e;
    margin: 16pt 0 8pt 0;
    page-break-after: avoid;
  }

  h2 {
    font-size: 18pt;
    font-weight: 700;
    color: #2d3436;
    margin: 14pt 0 6pt 0;
    padding-bottom: 4pt;
    border-bottom: 1.5px solid #dfe6e9;
    page-break-after: avoid;
  }

  h3 {
    font-size: 16pt;
    font-weight: 700;
    color: #2d3436;
    margin: 10pt 0 5pt 0;
    page-break-after: avoid;
  }

  h4, h5, h6 {
    font-size: 16pt;
    font-weight: 700;
    color: #636e72;
    margin: 8pt 0 4pt 0;
  }

  strong, b {
    font-weight: 800;
    color: #1a1a2e;
  }

  em, i {
    font-style: italic;
    color: #2d3436;
  }

  p {
    margin: 0 0 6pt 0;
  }

  ul, ol {
    margin: 6pt 0;
    padding-left: 20pt;
  }

  li {
    margin: 3pt 0;
  }

  /* Tables */
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 10pt 0;
  }

  th, td {
    border: 1px solid #dfe6e9;
    padding: 6pt 8pt;
    text-align: left;
    font-size: 12pt;
  }

  th {
    background-color: #f8f9fa;
    font-weight: 700;
    color: #2d3436;
    font-size: 11pt;
    text-transform: uppercase;
    letter-spacing: 0.3pt;
  }

  tr:nth-child(even) {
    background-color: #fafbfc;
  }

  /* Code blocks */
  pre {
    background: #f8f9fa !important;
    border: 1px solid #e0e0e0 !important;
    border-radius: 4pt;
    padding: 10pt !important;
    margin: 8pt 0 !important;
    font-family: 'Consolas', 'Courier New', monospace !important;
    font-size: 10pt !important;
    line-height: 1.3 !important;
    overflow-x: auto !important;
    white-space: pre !important;
    page-break-inside: avoid;
  }

  code {
    background: #f0f0f0 !important;
    padding: 2pt 4pt !important;
    font-family: 'Consolas', 'Courier New', monospace !important;
    font-size: 10pt !important;
    border-radius: 3pt;
  }

  pre code {
    background: none !important;
    padding: 0 !important;
  }

  /* Blockquotes — accent accent */
  blockquote {
    margin: 10pt 0;
    padding: 10pt 14pt;
    border-left: 4pt solid #457b9d;
    background: #f0f7ff;
    border-radius: 0 4pt 4pt 0;
    font-style: italic;
    color: #1d3557;
  }

  blockquote strong {
    color: #1d3557;
  }

  /* Alert boxes */
  .alert {
    margin: 10pt 0;
    padding: 10pt 14pt;
    border-radius: 4pt;
    page-break-inside: avoid;
  }

  .alert-warning {
    background: #fff3cd;
    border-left: 4pt solid #ffc107;
    color: #856404;
  }

  .alert-danger {
    background: #f8d7da;
    border-left: 4pt solid #dc3545;
    color: #721c24;
  }

  .alert-info {
    background: #f0f7ff;
    border-left: 4pt solid #457b9d;
    color: #1d3557;
  }

  .alert-success {
    background: #d4edda;
    border-left: 4pt solid #28a745;
    color: #155724;
  }

  /* Score badge */
  .score-badge {
    display: inline-block;
    padding: 6pt 16pt;
    border-radius: 8pt;
    font-size: 24pt;
    font-weight: 800;
    color: #fff;
    margin: 8pt 0;
  }

  .score-critical { background: #dc3545; }
  .score-warning  { background: #ffc107; color: #333; }
  .score-ok       { background: #28a745; }

  /* Horizontal rules */
  hr {
    border: none;
    border-top: 1.5px solid #dfe6e9;
    margin: 12pt 0;
  }

  img {
    max-width: 100% !important;
    height: auto !important;
    page-break-inside: avoid;
  }

  /* Footer */
  .report-footer {
    margin-top: 24pt;
    padding-top: 8pt;
    border-top: 1px solid #dfe6e9;
    font-size: 9pt;
    color: #b2bec3;
    text-align: right;
  }

  @media print {
    body { font-size: 14pt; }
    h1:first-of-type { font-size: 20pt; }
    h1 { font-size: 18pt; }
    h2 { font-size: 16pt; }
    h3 { font-size: 14pt; }
  }
`;

// ===== MARKDOWN → HTML CONVERTER =====

/**
 * Convert markdown (AI output) thành HTML sections
 * Hỗ trợ: headings, lists, bold, italic, tables, blockquotes, code blocks
 */
function markdownToHTML(md) {
  if (!md) return '';

  let html = md;

  // Code blocks (trước các replacements khác)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre><code>${escapeHTML(code.trim())}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Headings
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Bold + italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Blockquotes
  html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');
  // Merge consecutive blockquotes
  html = html.replace(/<\/blockquote>\n<blockquote>/g, '\n');

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr>');
  html = html.replace(/^\*\*\*$/gm, '<hr>');

  // Tables
  html = html.replace(/^(\|.+\|)\n(\|[-: |]+\|)\n((?:\|.+\|\n?)+)/gm, (_, headerRow, sepRow, bodyRows) => {
    const headers = headerRow.split('|').filter(c => c.trim()).map(c => `<th>${c.trim()}</th>`).join('');
    const rows = bodyRows.trim().split('\n').map(row => {
      const cells = row.split('|').filter(c => c.trim()).map(c => `<td>${c.trim()}</td>`).join('');
      return `<tr>${cells}</tr>`;
    }).join('\n');
    return `<table>\n<thead><tr>${headers}</tr></thead>\n<tbody>\n${rows}\n</tbody>\n</table>`;
  });

  // Alert patterns: ⚠️ / ✖ / ✔ / 💡
  html = html.replace(/^⚠️\s*\*\*(.+?)\*\*:?\s*$/gm, '<div class="alert alert-warning"><strong>⚠️ $1</strong></div>');
  html = html.replace(/^✖\s*\*\*(.+?)\*\*:?\s*$/gm, '<div class="alert alert-danger"><strong>✖ $1</strong></div>');

  // Score patterns: **XX/100** 🔴/🟡/🟢
  html = html.replace(/\*\*(\d+)\/100\*\*\s*🔴/g, '<span class="score-badge score-critical">$1/100</span>');
  html = html.replace(/\*\*(\d+)\/100\*\*\s*🟡/g, '<span class="score-badge score-warning">$1/100</span>');
  html = html.replace(/\*\*(\d+)\/100\*\*\s*🟢/g, '<span class="score-badge score-ok">$1/100</span>');

  // Unordered lists (- or •)
  html = html.replace(/^[-•]\s+(.+)$/gm, '<li>$1</li>');
  // Ordered lists
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');
  // Wrap consecutive <li> in <ul>
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>\n$1</ul>');

  // Paragraphs: remaining standalone lines → <p>
  html = html.split('\n').map(line => {
    const trimmed = line.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('<')) return line; // Already HTML element
    return `<p>${trimmed}</p>`;
  }).join('\n');

  // Clean up empty lines
  html = html.replace(/\n{3,}/g, '\n\n');

  return html;
}

function escapeHTML(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ===== HTML GENERATION =====

/**
 * Tạo complete HTML document
 * 
 * @param {string} title - Tiêu đề báo cáo
 * @param {string} bodyHTML - Body HTML content (from markdownToHTML or raw)
 * @param {Object} options - { date, author, showFooter }
 * @returns {string} Complete HTML document
 */
function generateHTML(title, bodyHTML, options = {}) {
  const {
    date = new Date().toLocaleDateString('vi-VN'),
    author = 'CEO Office Hub AI',
    showFooter = true,
  } = options;

  const footer = showFooter
    ? `<div class="report-footer">${author} — ${date}</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHTML(title)}</title>
  <style>${CEO_CSS}</style>
</head>
<body>
  <h1>${escapeHTML(title)}</h1>
  ${bodyHTML}
  ${footer}
</body>
</html>`;
}

// ===== PDF GENERATION =====

/**
 * HTML → PDF via Puppeteer (headless Chrome)
 * Match CEO_Office_Hubs: A4, 6mm margins, 300dpi
 * 
 * @param {string} htmlContent - Full HTML document
 * @param {string} outputPath - Output .pdf path
 */
async function generatePDF(htmlContent, outputPath) {
  const puppeteer = require('puppeteer');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(htmlContent, {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });

    // Wait a tick for fonts to load
    await new Promise(r => setTimeout(r, 500));

    await page.pdf({
      path: outputPath,
      format: 'A4',
      margin: { top: '6mm', bottom: '6mm', left: '6mm', right: '6mm' },
      printBackground: true,
      preferCSSPageSize: false,
    });

    const stat = fs.statSync(outputPath);
    console.log(`[REPORT] ✅ PDF created: ${outputPath} (${(stat.size / 1024).toFixed(1)} KB)`);
  } finally {
    await browser.close();
  }
}

// ===== ALL-IN-ONE REPORT =====

/**
 * Generate report: markdown → HTML + PDF → optional TG send
 * 
 * @param {string} title - Report title
 * @param {string} markdownContent - AI output in markdown
 * @param {Object} options - { format: 'html'|'pdf'|'both', outputDir, sendTG }
 * @returns {Object} { htmlPath, pdfPath }
 */
async function generateReport(title, markdownContent, options = {}) {
  const {
    format = 'both',
    outputDir = path.join(__dirname, '..', 'output'),
    sendTG = false,
  } = options;

  // Ensure output dir exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Safe filename
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const safeTitle = title
    .replace(/[^a-zA-Z0-9\u00C0-\u1EF9\s_-]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 60);
  const baseName = `${safeTitle}_${dateStr}`;

  const result = { htmlPath: null, pdfPath: null };

  // Convert markdown → HTML body
  const bodyHTML = markdownToHTML(markdownContent);
  const fullHTML = generateHTML(title, bodyHTML);

  // Save HTML
  if (format === 'html' || format === 'both') {
    result.htmlPath = path.join(outputDir, `${baseName}.html`);
    fs.writeFileSync(result.htmlPath, fullHTML, 'utf-8');
    console.log(`[REPORT] ✅ HTML created: ${result.htmlPath}`);
  }

  // Generate PDF
  if (format === 'pdf' || format === 'both') {
    result.pdfPath = path.join(outputDir, `${baseName}.pdf`);
    await generatePDF(fullHTML, result.pdfPath);
  }

  // Send via TG if requested
  if (sendTG && (result.pdfPath || result.htmlPath)) {
    const filePath = result.pdfPath || result.htmlPath;
    const ext = path.extname(filePath).toUpperCase().replace('.', '');
    const fileSize = (fs.statSync(filePath).size / 1024).toFixed(0);
    const caption = `📋 ${title}\n${ext} | ${fileSize}KB`;

    try {
      const tgScript = path.join(__dirname, '..', '..', '.agents', 'workflows', 'scripts', 'send-to-telegram.js');
      if (fs.existsSync(tgScript)) {
        const { execSync } = require('child_process');
        execSync(`node "${tgScript}" --file "${filePath}" --caption "${caption}"`, {
          stdio: 'inherit',
          cwd: path.join(__dirname, '..'),
        });
      } else {
        console.log(`[REPORT] ⚠ TG script not found: ${tgScript}`);
      }
    } catch (err) {
      console.error(`[REPORT] ⚠ TG send failed: ${err.message}`);
    }
  }

  return result;
}

// ===== CLI TEST =====
if (require.main === module) {
  (async () => {
    const testMD = `## PHÂN TÍCH CHỈ ĐẠO CEO - ESUHAIGROUP

### 1. PATTERN - XU HƯỚNG ĐÁNG CHÚ Ý
- **Bottleneck nghiêm trọng**: 44% chỉ đạo chờ duyệt (47/107)
- **Phân bố không đều**: Đặng Tiến Dũng + Bùi Thị Thanh Hiếu gánh 50% công việc

### 2. RISK - RỦI RO CẢNH BÁO

⚠️ **NGUY CƠ CAO**:
- Họp thống nhất MS-Giáo viên đã trễ 14 ngày
- Thiếu dữ liệu SV tốt nghiệp 2026
- Quá tải 2 nhân sự chủ chốt

### 3. RECOMMENDATIONS

1. **GẤP**: Triệu tập họp MS-Giáo viên ngay thứ 2
2. **PHÂN QUYỀN**: Bổ nhiệm 2 phó để hỗ trợ Dũng-Hiếu
3. **DEADLINE CỨNG**: Yêu cầu TT liên kết nộp danh mục nghề trong 3 ngày

### 4. SCORE - SỨC KHỎE HỆ THỐNG
**35/100** 🔴

Tỷ lệ chờ duyệt quá cao, bottleneck nhân sự, trễ deadline quan trọng.`;

    console.log('[REPORT] Running self-test...');
    const result = await generateReport('Phân tích chỉ đạo CEO — Test', testMD, {
      format: 'both',
    });
    console.log('[REPORT] Result:', result);
  })();
}

// ===== EXPORTS =====
module.exports = {
  generateHTML,
  generatePDF,
  generateReport,
  markdownToHTML,
  CEO_CSS,
  escapeHTML,
};
