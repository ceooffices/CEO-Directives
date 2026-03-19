/**
 * seed-employee-commitments.js
 * Import 334 nhân viên cam kết từ employee_kpi.json → Supabase employee_commitments
 *
 * Yêu cầu: chạy migration-004-employee-commitments.sql trước
 *
 * Usage:
 *   node seed-employee-commitments.js              # Import thật
 *   node seed-employee-commitments.js --dry-run    # Chỉ log, không insert
 *   node seed-employee-commitments.js --limit 5    # Chỉ import 5 records
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', 'automation', '.env') });
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env');
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

const DRY_RUN = process.argv.includes('--dry-run');
const LIMIT_IDX = process.argv.indexOf('--limit');
const LIMIT = LIMIT_IDX > -1 ? parseInt(process.argv[LIMIT_IDX + 1]) : Infinity;

const KPI_FILE = path.join(__dirname, '..', 'data', 'employee_kpi.json');

async function run() {
  const startTime = Date.now();

  console.log('==========================================');
  console.log(`[SEED] Employee Commitments → Supabase`);
  console.log(`[SEED] ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`);
  console.log(`[SEED] Mode: ${DRY_RUN ? '🏜️ DRY-RUN' : '⚡ LIVE'}`);
  console.log('==========================================');

  // 1. Load data
  if (!fs.existsSync(KPI_FILE)) {
    console.error(`❌ File not found: ${KPI_FILE}`);
    process.exit(1);
  }

  const kpiData = JSON.parse(fs.readFileSync(KPI_FILE, 'utf-8'));
  const employees = kpiData.employees || [];
  console.log(`\n[1/3] Loaded: ${employees.length} employees`);

  // 2. Load staff table để match staff_id
  console.log('[2/3] Loading staff table cho matching...');
  const { data: staffRows, error: staffErr } = await db
    .from('staff')
    .select('id, name')
    .not('name', 'is', null);

  if (staffErr) {
    console.error(`❌ Lỗi load staff: ${staffErr.message}`);
  }
  const staffMap = {};
  for (const s of (staffRows || [])) {
    staffMap[s.name.toLowerCase().trim()] = s.id;
  }
  console.log(`  Staff lookup: ${Object.keys(staffMap).length} entries`);

  // 3. Insert
  console.log('[3/3] Inserting...');
  const toProcess = employees.slice(0, LIMIT).filter(e => e.name && e.name.trim());

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
    console.log('  ...');
  } else {
    // Xóa dữ liệu cũ trước khi seed lại
    const { error: delErr } = await db.from('employee_commitments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (delErr) console.warn(`  ⚠️ Xóa cũ: ${delErr.message}`);

    // Batch insert (Supabase cho phép bulk)
    const BATCH_SIZE = 100;
    let inserted = 0, failed = 0;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const { error } = await db.from('employee_commitments').insert(batch);
      if (error) {
        console.error(`  ❌ Batch ${i}-${i + batch.length}: ${error.message}`);
        failed += batch.length;
      } else {
        inserted += batch.length;
        console.log(`  ✅ Batch ${i}-${i + batch.length}: ${batch.length} inserted`);
      }
    }

    console.log(`\n  Inserted: ${inserted} | Failed: ${failed}`);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n==========================================`);
  console.log(`[SEED] Done in ${elapsed}s`);
  console.log('==========================================');
}

run().catch(err => { console.error('❌ FATAL:', err); process.exit(1); });
