/**
 * import-hr-csv.js
 * Import danh sách nhân sự từ CSV → Notion HR Database
 * 
 * Đọc file CSV nhân sự S2Group, parse, rồi tạo từng record trong Notion HR DB.
 * Xóa record cũ trước, rồi import mới hoàn toàn.
 * 
 * Usage:
 *   node import-hr-csv.js                   # Import thật
 *   node import-hr-csv.js --dry-run         # Chỉ log, không tạo
 *   node import-hr-csv.js --limit 5         # Chỉ import 5 records (test)
 *   node import-hr-csv.js --skip-delete     # Không xóa records cũ
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { notion, DB, queryDatabase } = require('./lib/notion-client');

const DRY_RUN = process.argv.includes('--dry-run');
const SKIP_DELETE = process.argv.includes('--skip-delete');
const LIMIT_IDX = process.argv.indexOf('--limit');
const LIMIT = LIMIT_IDX > -1 ? parseInt(process.argv[LIMIT_IDX + 1]) : Infinity;

const CSV_FILE = path.join(__dirname, '..', 'danh sách nhan su S2Group - 15022026 - Danh sách NV.csv');

// ===== HELPERS =====

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

function trunc(str, max = 2000) {
  return (str || '').substring(0, max);
}

// ===== MAIN =====

async function run() {
  const startTime = Date.now();

  console.log('==========================================');
  console.log(`[HR Import] ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`);
  console.log(`[HR Import] Mode: ${DRY_RUN ? '🏜️ DRY-RUN' : '⚡ LIVE'}`);
  if (LIMIT < Infinity) console.log(`[HR Import] Limit: ${LIMIT} records`);
  console.log('==========================================');

  // 1. Check DB
  if (!DB.HR) {
    console.error('❌ NOTION_DB_HR not set in .env');
    process.exit(1);
  }

  // 2. Read CSV
  console.log('\n[1/3] Reading CSV file...');
  if (!fs.existsSync(CSV_FILE)) {
    console.error(`❌ CSV file not found: ${CSV_FILE}`);
    process.exit(1);
  }

  const content = fs.readFileSync(CSV_FILE, 'utf-8');
  const lines = content.split('\n').map(l => l.replace(/\r$/, '')).filter(l => l.trim());

  // Parse header
  const header = parseCSVLine(lines[0]);
  console.log(`  Header: ${header.join(' | ')}`);

  // Parse data rows
  const employees = [];
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    if (fields.length < 8) continue;

    const emp = {
      stt: fields[0],
      maNV: fields[1],
      hoTen: fields[2],
      email: fields[3],
      phongBan: fields[4],
      zone: fields[5],
      chucDanh: fields[6],
      congTy: fields[7],
      noiCT: fields[8] || '',
      trangThai: fields[9] || '',
      ngayNop: fields[10] || '',
      quanLy: fields[11] || '',
    };

    // Skip summary rows (Tổng NV, Đã nộp, etc.)
    if (!emp.maNV || emp.maNV.match(/^(Tổng|Đã|Chưa|%)/)) continue;

    employees.push(emp);
  }

  console.log(`  Parsed: ${employees.length} employees`);

  // 3. Delete old records (optional)
  if (!SKIP_DELETE && !DRY_RUN) {
    console.log('\n[2/3] Deleting old records...');
    try {
      const oldPages = await queryDatabase(DB.HR);
      console.log(`  Found ${oldPages.length} existing records to archive`);

      for (let i = 0; i < oldPages.length; i++) {
        try {
          await notion.pages.update({
            page_id: oldPages[i].id,
            archived: true,
          });
          if ((i + 1) % 50 === 0) {
            console.log(`  Archived ${i + 1}/${oldPages.length}...`);
          }
          await delay(150); // Rate limit
        } catch (e) {
          console.warn(`  ⚠️ Could not archive ${oldPages[i].id}: ${e.message}`);
        }
      }
      console.log(`  ✅ Archived ${oldPages.length} old records`);
    } catch (e) {
      console.warn(`  ⚠️ Could not query/delete old records: ${e.message}`);
      console.warn('  Continuing with import anyway...');
    }
  } else {
    console.log('\n[2/3] Skipping delete (--skip-delete or --dry-run)');
  }

  // 4. Import new records
  console.log('\n[3/3] Importing employees...');
  const toProcess = employees.slice(0, LIMIT);
  let created = 0, failed = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const emp = toProcess[i];
    const progress = `[${i + 1}/${toProcess.length}]`;

    // Map to actual Notion HR DB properties:
    // Họ tên (title), Email (email), Bộ phận (select), Chức vụ (select),
    // Vai trò hệ thống (select), Ghi chú (rich_text)
    const properties = {
      'Họ tên': {
        title: [{ text: { content: trunc(emp.hoTen, 200) } }],
      },
    };

    if (emp.email && emp.email.includes('@')) {
      properties['Email'] = { email: emp.email };
    }

    if (emp.phongBan) {
      properties['Bộ phận'] = { select: { name: trunc(emp.phongBan, 100) } };
    }

    if (emp.chucDanh) {
      properties['Chức vụ'] = { select: { name: trunc(emp.chucDanh, 100) } };
    }

    if (emp.quanLy === 'Quản lý') {
      properties['Vai trò hệ thống'] = { select: { name: 'Quản lý' } };
    }

    // Pack extra info into Ghi chú
    const notes = [
      emp.maNV ? `Mã NV: ${emp.maNV}` : '',
      emp.congTy ? `Công ty: ${emp.congTy}` : '',
      emp.noiCT ? `Nơi CT: ${emp.noiCT}` : '',
      emp.zone ? `Zone: ${emp.zone}` : '',
    ].filter(Boolean).join(' | ');

    if (notes) {
      properties['Ghi chú'] = {
        rich_text: [{ text: { content: trunc(notes) } }],
      };
    }

    try {
      if (!DRY_RUN) {
        await notion.pages.create({
          parent: { database_id: DB.HR },
          properties,
        });
        await delay(350); // Rate limit: ~3 requests/sec
      }

      if ((i + 1) % 20 === 0 || i === toProcess.length - 1) {
        console.log(`  ${progress} ✅ ${emp.hoTen} (${emp.phongBan})`);
      }
      created++;
    } catch (error) {
      failed++;
      console.error(`  ${progress} ❌ ${emp.hoTen}: ${error.message}`);
      await delay(500);
    }
  }

  // Also save as JSON for dashboard (immediate use)
  const peopleJson = employees.map(emp => ({
    maNV: emp.maNV,
    name: emp.hoTen,
    email: emp.email,
    department: emp.phongBan,
    zone: emp.zone,
    role: emp.chucDanh,
    company: emp.congTy,
    location: emp.noiCT,
    isManager: emp.quanLy === 'Quản lý',
  }));

  const jsonPath = path.join(__dirname, '..', 'data', 'people.json');
  fs.writeFileSync(jsonPath, JSON.stringify(peopleJson, null, 2));
  console.log(`\n  💾 Saved people.json (${peopleJson.length} records)`);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n==========================================');
  console.log('[HR Import] SUMMARY:');
  console.log(`  ✅ Created: ${created}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  💾 people.json: ${peopleJson.length} records`);
  console.log(`  ⏱️ Time: ${elapsed}s`);
  console.log('==========================================');

  return { created, failed, jsonSaved: peopleJson.length };
}

if (require.main === module) {
  run().catch(err => {
    console.error('❌ FATAL:', err);
    process.exit(1);
  });
}

module.exports = { run };
