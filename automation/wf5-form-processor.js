/**
 * wf5-form-processor.js
 * CEO Directive WF5: Xử lý Cập nhật Tiến độ từ Google Form
 * 
 * Flow: Email đồng hành → Đầu mối click → Google Form → Sheets → Poll → Update Notion
 * 
 * Usage:
 *   node wf5-form-processor.js            # Process responses
 *   node wf5-form-processor.js --dry-run  # Dry run
 */

require('dotenv').config();
const https = require('https');
const fs = require('fs');
const path = require('path');
const { updatePage } = require('./lib/notion-client');
const { logExecution } = require('./lib/logger');

const DRY_RUN = process.argv.includes('--dry-run');

const SHEET_ID = process.env.FORM_WF5_RESPONSE_SHEET_ID || '';
const SHEET_URL = SHEET_ID
  ? `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`
  : '';

const PROCESSED_FILE = path.join(__dirname, 'data', 'processed_wf5_responses.json');

function loadProcessed() {
  try { return JSON.parse(fs.readFileSync(PROCESSED_FILE, 'utf8')); }
  catch { return { processedIds: [] }; }
}
function saveProcessed(data) {
  fs.writeFileSync(PROCESSED_FILE, JSON.stringify(data, null, 2));
}

function fetchCSV(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location)
        return fetchCSV(res.headers.location).then(resolve).catch(reject);
      let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(d)); res.on('error', reject);
    }).on('error', reject);
  });
}

function parseCSV(csv) {
  const lines = csv.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map(line => {
    const vals = parseCSVLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h.trim()] = (vals[i] || '').trim(); });
    return row;
  });
}

function parseCSVLine(line) {
  const result = []; let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { if (inQ && line[i+1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
    else if (c === ',' && !inQ) { result.push(cur); cur = ''; }
    else cur += c;
  }
  result.push(cur); return result;
}

function findField(row, keywords) {
  for (const col of Object.keys(row)) {
    const lc = col.toLowerCase();
    if (keywords.some(kw => lc.includes(kw.toLowerCase()))) return row[col] || '';
  }
  return '';
}

function extractData(row) {
  const ts = row['Timestamp'] || row['Dấu thời gian'] || '';
  const clrId = findField(row, ['mã clarification', 'clarification']);
  const tieuDe = findField(row, ['tiêu đề']);
  const dauMoi = findField(row, ['đầu mối']);
  const tienDo = findField(row, ['tiến độ']);
  const noiDungDaLam = findField(row, ['nội dung đã', 'đã thực hiện']);
  const khoKhan = findField(row, ['khó khăn', 'vướng mắc']);
  const canHoTro = findField(row, ['cần hỗ trợ']);

  const hasId = clrId && clrId.length > 10;

  return {
    timestamp: ts, clarificationId: clrId.trim(), tieuDe, dauMoi,
    tienDo, noiDungDaLam, khoKhan, canHoTro, hasId,
    isValid: hasId && !!tienDo,
  };
}

async function updateNotion(data) {
  const props = {};
  if (data.tienDo) {
    const pct = parseInt(data.tienDo) || 0;
    props['Tiến độ (%)'] = { number: pct };
  }
  if (data.noiDungDaLam) {
    props['Báo cáo tiến độ'] = {
      rich_text: [{ text: { content: data.noiDungDaLam.substring(0, 2000) } }],
    };
  }
  if (data.khoKhan) {
    props['Khó khăn'] = {
      rich_text: [{ text: { content: data.khoKhan.substring(0, 2000) } }],
    };
  }
  if (data.canHoTro) {
    props['Cần hỗ trợ'] = {
      rich_text: [{ text: { content: data.canHoTro.substring(0, 2000) } }],
    };
  }
  if (DRY_RUN) {
    console.log(`  [DRY-RUN] Would update ${data.clarificationId}:`, JSON.stringify(props));
    return { id: data.clarificationId, dryRun: true };
  }
  return await updatePage(data.clarificationId, props);
}

async function run() {
  const start = Date.now();
  console.log('==========================================');
  console.log(`[WF5-FORM] ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`);
  console.log(`[WF5-FORM] Mode: ${DRY_RUN ? '🏜️ DRY-RUN' : '⚡ LIVE'}`);
  console.log('==========================================');

  if (!SHEET_URL) {
    console.log('\n⚠️  FORM_WF5_RESPONSE_SHEET_ID not set in .env');
    return { processed: 0, error: 'MISSING_SHEET_ID' };
  }

  const processed = loadProcessed();
  console.log(`\n[1/3] Previously processed: ${processed.processedIds.length}`);

  console.log('[2/3] Fetching Google Sheets...');
  let csv;
  try { csv = await fetchCSV(SHEET_URL); console.log(`  CSV: ${csv.length} bytes`); }
  catch (e) { console.error(`  ❌ ${e.message}`); return { processed: 0, error: e.message }; }

  const rows = parseCSV(csv);
  const newRows = rows.filter(r => {
    const d = extractData(r);
    return d.isValid && !processed.processedIds.includes(d.clarificationId);
  });

  console.log(`  Total: ${rows.length} | New valid: ${newRows.length}`);

  if (!newRows.length) { console.log('\n✅ No new responses.'); return { processed: 0 }; }

  console.log('[3/3] Processing...');
  let ok = 0, fail = 0;
  for (const row of newRows) {
    const d = extractData(row);
    try {
      await updateNotion(d);
      processed.processedIds.push(d.clarificationId);
      ok++;
      await logExecution(`WF5-Form: ${d.clarificationId}`, `✅ ${d.tienDo} | ${d.noiDungDaLam?.substring(0,50)}`);
    } catch (e) { console.error(`  ❌ ${e.message}`); fail++; }
  }

  if (!DRY_RUN) saveProcessed(processed);
  console.log(`\n✅ ${ok} processed | ❌ ${fail} failed | ⏱️ ${((Date.now()-start)/1000).toFixed(1)}s`);
  return { processed: ok, failed: fail };
}

if (require.main === module) {
  run().then(r => { console.log('Result:', JSON.stringify(r)); process.exit(0); })
    .catch(e => { console.error('Fatal:', e); process.exit(1); });
}
module.exports = { run };
