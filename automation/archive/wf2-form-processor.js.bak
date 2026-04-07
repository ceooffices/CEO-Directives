/**
 * wf2-form-processor.js
 * CEO Directive WF2: Xử lý Form Response từ Google Sheets
 *
 * Flow: Google Form submit → Google Sheets → Poll this script → Update Supabase
 * Migrated: Notion → Supabase (2026-03-18)
 *
 * Google Sheets columns (from Form):
 *   [0] Timestamp
 *   [1] Email Address
 *   [2] Mã Clarification (= directive_code)
 *   [3] Nguồn chỉ đạo
 *   [4] Ngày nhận chỉ đạo
 *   [5] Nội dung chỉ đạo gốc
 *   [6] Đầu mối thực hiện (T1)
 *   [7] T2 - Nhiệm vụ
 *   [8] T3 - Chỉ tiêu
 *   [9] T4 - Thời hạn
 *   [10] Ghi chú
 *   [11] Xác nhận
 *
 * Usage:
 *   node wf2-form-processor.js            # Process new responses
 *   node wf2-form-processor.js --dry-run  # Dry run
 */

require('dotenv').config();
const https = require('https');
const fs = require('fs');
const path = require('path');
const { updateDirectiveByCode, logEvent } = require('./lib/supabase-client');
const { sendEmail } = require('./lib/email-sender');
const { buildProgressNotifyEmail } = require('./lib/email-templates');

const DRY_RUN = process.argv.includes('--dry-run');
const ALWAYS_CC = (process.env.ALWAYS_CC || '').split(',').map(e => e.trim()).filter(Boolean);

// Google Sheets CSV export URL (same sheet as KPI)
// Response sheet from the Google Form
const FORM_RESPONSE_SHEET_ID = process.env.FORM_RESPONSE_SHEET_ID || '';
const FORM_RESPONSE_SHEET_URL = FORM_RESPONSE_SHEET_ID
  ? `https://docs.google.com/spreadsheets/d/${FORM_RESPONSE_SHEET_ID}/export?format=csv`
  : '';

// Track processed rows to avoid duplicates
const PROCESSED_FILE = path.join(__dirname, 'data', 'processed_form_responses.json');

function loadProcessed() {
  try {
    return JSON.parse(fs.readFileSync(PROCESSED_FILE, 'utf8'));
  } catch {
    return { lastTimestamp: null, processedIds: [] };
  }
}

function saveProcessed(data) {
  fs.writeFileSync(PROCESSED_FILE, JSON.stringify(data, null, 2));
}

// ===== FETCH CSV =====
function fetchCSV(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchCSV(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

// ===== PARSE CSV =====
function parseCSV(csv) {
  const lines = csv.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = (values[idx] || '').trim();
    });
    rows.push(row);
  }
  return rows;
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

// ===== SMART FIELD DETECTION (from n8n WF2) =====
function findField(row, keywords, excludeKeywords = []) {
  const columns = Object.keys(row);
  for (const col of columns) {
    const colLC = col.toLowerCase();
    const hasKeyword = keywords.some(kw => colLC.includes(kw.toLowerCase()));
    const hasExclude = excludeKeywords.some(kw => colLC.includes(kw.toLowerCase()));
    if (hasKeyword && !hasExclude) {
      return row[col] || '';
    }
  }
  return '';
}

// ===== EXTRACT FORM DATA =====
function extractFormData(row) {
  const timestamp = row['Timestamp'] || row['Dấu thời gian'] || '';
  const email = row['Email Address'] || row['Địa chỉ email'] || '';
  const clarificationId = findField(row, ['mã clarification', 'clarification id', 'mã chỉ đạo']);

  const nguonChiDao = findField(row, ['nguồn chỉ đạo', 'nguồn']);
  const ngayNhanChiDao = findField(row, ['ngày nhận']);
  const noiDungChiDaoGoc = findField(row, ['nội dung chỉ đạo gốc', 'nội dung chỉ đạo']);
  const dauMoiT1 = findField(row, ['đầu mối', 't1']);
  const t2NhiemVu = findField(row, ['t2', 'nhiệm vụ']);
  const t3ChiTieu = findField(row, ['t3', 'chỉ tiêu']);
  let t4ThoiHan = findField(row, ['t4', 'thời hạn', 'deadline']);
  const ghiChu = findField(row, ['ghi chú', 'thắc mắc']);
  const xacNhanRaw = findField(row, ['xác nhận']);

  // Convert M/D/YYYY → YYYY-MM-DD
  if (t4ThoiHan && t4ThoiHan.includes('/')) {
    const parts = t4ThoiHan.split('/');
    if (parts.length === 3) {
      const month = parts[0].padStart(2, '0');
      const day = parts[1].padStart(2, '0');
      t4ThoiHan = `${parts[2]}-${month}-${day}`;
    }
  }

  // Parse confirmation
  const xacNhanLC = (xacNhanRaw || '').toLowerCase();
  const xacNhanDoc = xacNhanLC.includes('xác nhận') || xacNhanLC.includes('đã hiểu');
  const camKetThucHien = xacNhanLC.includes('cam kết');

  const has4T = Boolean(noiDungChiDaoGoc && t2NhiemVu && t3ChiTieu && t4ThoiHan);
  const isConfirmed = Boolean(xacNhanDoc || camKetThucHien);
  const hasId = Boolean(clarificationId && clarificationId.length > 5);

  return {
    timestamp, email, clarificationId: (clarificationId || '').trim(),
    nguonChiDao, ngayNhanChiDao, noiDungChiDaoGoc,
    dauMoiT1, t2NhiemVu, t3ChiTieu, t4ThoiHan, ghiChu,
    xacNhanDoc, camKetThucHien,
    has4T, isConfirmed, hasId,
    isValid: has4T && isConfirmed && hasId,
  };
}

// ===== UPDATE SUPABASE =====
async function updateSupabaseFromForm(formData) {
  const directiveCode = formData.clarificationId;

  const fields = {
    tinh_trang: 'da_xac_nhan',
  };

  // Update T2/T3/T4 if provided by form
  if (formData.t2NhiemVu) fields.t2_nhiem_vu = formData.t2NhiemVu;
  if (formData.t3ChiTieu) fields.t3_chi_tieu = formData.t3ChiTieu;
  if (formData.t4ThoiHan) fields.t4_thoi_han = formData.t4ThoiHan;

  if (DRY_RUN) {
    console.log(`  [DRY-RUN] Would update directive ${directiveCode}:`, JSON.stringify(fields));
    return { directive_code: directiveCode, dryRun: true };
  }

  return await updateDirectiveByCode(directiveCode, fields);
}

// ===== MAIN =====
async function run() {
  const startTime = Date.now();
  console.log('==========================================');
  console.log(`[WF2-FORM] ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`);
  console.log(`[WF2-FORM] Mode: ${DRY_RUN ? '🏜️ DRY-RUN' : '⚡ LIVE'}`);
  console.log('[WF2-FORM] Source: Supabase');
  console.log('==========================================');

  if (!FORM_RESPONSE_SHEET_URL) {
    console.log('\n⚠️  FORM_RESPONSE_SHEET_ID not set in .env');
    console.log('   Set FORM_RESPONSE_SHEET_ID=<Google Sheet ID containing form responses>');
    console.log('   Skipping form processing.');
    return { processed: 0, error: 'MISSING_SHEET_ID' };
  }

  // 1. Load processed history
  const processed = loadProcessed();
  console.log(`\n[1/4] Last processed: ${processed.lastTimestamp || 'never'}`);
  console.log(`  Previously processed: ${processed.processedIds.length} responses`);

  // 2. Fetch Google Sheets CSV
  console.log('\n[2/4] Fetching Google Sheets...');
  let csv;
  try {
    csv = await fetchCSV(FORM_RESPONSE_SHEET_URL);
    console.log(`  CSV fetched: ${csv.length} bytes`);
  } catch (err) {
    console.error(`  ❌ Failed to fetch sheet: ${err.message}`);
    return { processed: 0, error: err.message };
  }

  // 3. Parse & filter new responses
  console.log('\n[3/4] Parsing responses...');
  const rows = parseCSV(csv);
  console.log(`  Total rows: ${rows.length}`);

  const newRows = rows.filter(row => {
    const formData = extractFormData(row);
    if (!formData.clarificationId) return false;
    if (processed.processedIds.includes(formData.clarificationId)) return false;
    return formData.isValid;
  });

  console.log(`  New valid responses: ${newRows.length}`);

  if (newRows.length === 0) {
    console.log('\n✅ No new form responses to process.');
    return { processed: 0 };
  }

  // 4. Process each new response
  console.log('\n[4/4] Processing responses...');
  let successCount = 0, failCount = 0;

  for (const row of newRows) {
    const formData = extractFormData(row);
    console.log(`\n  📝 Processing: ${formData.clarificationId}`);
    console.log(`     T2: ${formData.t2NhiemVu || '(empty)'}`);
    console.log(`     T3: ${formData.t3ChiTieu || '(empty)'}`);
    console.log(`     T4: ${formData.t4ThoiHan || '(empty)'}`);
    console.log(`     ✅ Confirmed: ${formData.isConfirmed}`);

    try {
      // Update Supabase
      const result = await updateSupabaseFromForm(formData);
      console.log(`     ✅ Supabase updated`);

      // Track as processed
      processed.processedIds.push(formData.clarificationId);
      processed.lastTimestamp = formData.timestamp;
      successCount++;

      // Log event
      await logEvent(
        result?.id || null,
        'wf2_form_processed',
        { directiveCode: formData.clarificationId, email: formData.email },
        DRY_RUN
      );
    } catch (err) {
      console.error(`     ❌ Error: ${err.message}`);
      failCount++;
    }
  }

  // Save processed state
  if (!DRY_RUN) {
    saveProcessed(processed);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n==========================================');
  console.log(`[WF2-FORM] SUMMARY:`);
  console.log(`  ✅ Processed: ${successCount}`);
  console.log(`  ❌ Failed: ${failCount}`);
  console.log(`  ⏱️  Time: ${elapsed}s`);
  console.log('==========================================');

  return { processed: successCount, failed: failCount };
}

// ===== RUN =====
if (require.main === module) {
  run().then(r => {
    console.log('\nResult:', JSON.stringify(r));
    process.exit(0);
  }).catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
  });
}

module.exports = { run };
