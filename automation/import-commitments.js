/**
 * import-commitments.js
 * Import employee commitment data from employee_kpi.json → Supabase
 *
 * Đọc data từ data/employee_kpi.json (334 employees)
 * Insert/update vào bảng employee_commitments trên Supabase
 *
 * Yêu cầu: chạy migration-004-employee-commitments.sql trước
 *
 * Usage:
 *   node import-commitments.js              # Import thật
 *   node import-commitments.js --dry-run    # Chỉ log, không insert
 *   node import-commitments.js --limit 5    # Chỉ import 5 records
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { db } = require('./lib/supabase-client');

const DRY_RUN = process.argv.includes('--dry-run');
const LIMIT_IDX = process.argv.indexOf('--limit');
const LIMIT = LIMIT_IDX > -1 ? parseInt(process.argv[LIMIT_IDX + 1]) : Infinity;

const KPI_FILE = path.join(__dirname, '..', 'data', 'employee_kpi.json');

// ===== MAIN =====

async function run() {
  const startTime = Date.now();

  console.log('==========================================');
  console.log(`[Import] ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`);
  console.log(`[Import] Mode: ${DRY_RUN ? '🏜️ DRY-RUN' : '⚡ LIVE'}`);
  if (LIMIT < Infinity) console.log(`[Import] Limit: ${LIMIT} records`);
  console.log('[Import] Target: Supabase → employee_commitments');
  console.log('==========================================');

  // 1. Load data
  console.log('\n[1/3] Loading employee_kpi.json...');
  if (!fs.existsSync(KPI_FILE)) {
    console.error(`❌ File not found: ${KPI_FILE}`);
    console.error('   Chạy parse_kpi_sheet.js trước.');
    process.exit(1);
  }

  const kpiData = JSON.parse(fs.readFileSync(KPI_FILE, 'utf-8'));
  const employees = kpiData.employees || [];
  console.log(`  Loaded: ${employees.length} employees`);

  const toProcess = employees.slice(0, LIMIT).filter(e => e.name && e.name.trim());
  console.log(`  Processing: ${toProcess.length} employees`);

  // 2. Match staff_id từ bảng staff
  console.log('\n[2/3] Matching staff IDs...');
  const { data: staffRows } = await db
    .from('staff')
    .select('id, name')
    .not('name', 'is', null);

  const staffMap = {};
  for (const s of (staffRows || [])) {
    staffMap[s.name.toLowerCase().trim()] = s.id;
  }
  console.log(`  Staff lookup: ${Object.keys(staffMap).length} entries`);

  // 3. Insert to Supabase
  console.log('\n[3/3] Importing to Supabase...');

  const rows = toProcess.map(emp => {
    const nameKey = emp.name.toLowerCase().trim();
    return {
      staff_id: staffMap[nameKey] || null,
      name: emp.name.trim(),
      department: emp.dept || emp.department || null,
      role: emp.role || null,
      commit_number: parseFloat(emp.commit || emp.commitment || 0) || 0,
      target: emp.target || null,
    };
  });

  if (DRY_RUN) {
    console.log(`  [DRY-RUN] Would insert ${rows.length} records`);
    rows.slice(0, 5).forEach(r => console.log(`    ${r.name} | ${r.department} | ${r.commit_number}`));
    return { created: rows.length, failed: 0, skipped: 0 };
  }

  // Xóa dữ liệu cũ trước khi import lại
  const { error: delErr } = await db
    .from('employee_commitments')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  if (delErr) console.warn(`  ⚠️ Xóa cũ: ${delErr.message}`);

  // Batch insert
  const BATCH_SIZE = 100;
  let created = 0, failed = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await db.from('employee_commitments').insert(batch);
    if (error) {
      console.error(`  ❌ Batch ${i}-${i + batch.length}: ${error.message}`);
      failed += batch.length;
    } else {
      created += batch.length;
      console.log(`  ✅ Batch ${i}-${i + batch.length}: OK`);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n==========================================');
  console.log('[Import] SUMMARY:');
  console.log(`  ✅ Created: ${created}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  ⏱️ Time: ${elapsed}s`);
  console.log('==========================================');

  return { created, failed, skipped: 0 };
}

if (require.main === module) {
  run().catch(err => {
    console.error('❌ FATAL:', err);
    process.exit(1);
  });
}

module.exports = { run };
