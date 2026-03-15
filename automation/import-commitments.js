/**
 * import-commitments.js
 * Import employee commitment data from employee_kpi.json → Notion DB
 * 
 * Reads parsed data from data/employee_kpi.json (334 employees)
 * Creates/updates records in NOTION_DB_EMPLOYEE_COMMITMENTS
 * 
 * Usage:
 *   node import-commitments.js              # Import thật
 *   node import-commitments.js --dry-run    # Chỉ log, không tạo
 *   node import-commitments.js --limit 5    # Chỉ import 5 records
 */

const fs = require('fs');
const path = require('path');
const { createPage, queryDatabase, DB } = require('./lib/notion-client');

const DRY_RUN = process.argv.includes('--dry-run');
const LIMIT_IDX = process.argv.indexOf('--limit');
const LIMIT = LIMIT_IDX > -1 ? parseInt(process.argv[LIMIT_IDX + 1]) : Infinity;

const KPI_FILE = path.join(__dirname, '..', 'data', 'employee_kpi.json');

// ===== HELPERS =====

/** Delay to avoid Notion API rate limits */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Safe truncate for rich text (Notion limit 2000 chars) */
function trunc(str, max = 2000) {
  return (str || '').substring(0, max);
}

// ===== MAIN =====

async function run() {
  const startTime = Date.now();

  console.log('==========================================');
  console.log(`[Import] ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`);
  console.log(`[Import] Mode: ${DRY_RUN ? '🏜️ DRY-RUN' : '⚡ LIVE'}`);
  if (LIMIT < Infinity) console.log(`[Import] Limit: ${LIMIT} records`);
  console.log('==========================================');

  // 1. Check DB ID
  if (!DB.EMPLOYEE_COMMITMENTS) {
    console.error('❌ NOTION_DB_EMPLOYEE_COMMITMENTS not set in .env');
    console.error('   Tạo Notion database trước, rồi thêm ID vào .env');
    process.exit(1);
  }

  // 2. Load data
  console.log('\n[1/2] Loading employee_kpi.json...');
  if (!fs.existsSync(KPI_FILE)) {
    console.error(`❌ File not found: ${KPI_FILE}`);
    console.error('   Chạy parse_kpi_sheet.js trước.');
    process.exit(1);
  }

  const kpiData = JSON.parse(fs.readFileSync(KPI_FILE, 'utf-8'));
  const employees = kpiData.employees || [];
  console.log(`  Loaded: ${employees.length} employees`);

  const toProcess = employees.slice(0, LIMIT);
  console.log(`  Processing: ${toProcess.length} employees`);

  // 3. Import to Notion
  console.log('\n[2/2] Importing to Notion...');
  let created = 0, failed = 0, skipped = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const emp = toProcess[i];

    const progress = `[${i + 1}/${toProcess.length}]`;

    if (!emp.name || emp.name.trim() === '') {
      console.log(`  ${progress} ⏭️ Skipped (no name)`);
      skipped++;
      continue;
    }

    const properties = {
      'Họ tên': {
        title: [{ text: { content: trunc(emp.name, 200) } }],
      },
    };

    // Phòng ban
    if (emp.department) {
      properties['Phòng ban'] = { select: { name: trunc(emp.department, 100) } };
    }

    // Chức danh
    if (emp.role) {
      properties['Chức danh'] = {
        rich_text: [{ text: { content: trunc(emp.role) } }],
      };
    }

    // Quản lý trực tiếp
    if (emp.manager) {
      properties['Quản lý'] = {
        rich_text: [{ text: { content: trunc(emp.manager) } }],
      };
    }

    // MT goals
    const goals = emp.goals || [];
    for (let g = 0; g < Math.min(goals.length, 3); g++) {
      const goal = goals[g];
      const num = g + 1;
      if (goal.goal) {
        properties[`MT${num} - Mục tiêu`] = {
          rich_text: [{ text: { content: trunc(goal.goal) } }],
        };
      }
      if (goal.number !== undefined && goal.number !== null && !isNaN(goal.number)) {
        properties[`MT${num} - Con số`] = { number: parseFloat(goal.number) || 0 };
      }
      if (goal.hm_link) {
        properties[`MT${num} - HM liên kết`] = {
          select: { name: trunc(goal.hm_link, 100) },
        };
      }
    }

    // Cam kết tổng
    if (emp.commitment !== undefined && emp.commitment !== null) {
      properties['Cam kết tổng'] = { number: parseFloat(emp.commitment) || 0 };
    }

    // Đóng góp vào mục tiêu nào
    if (emp.target) {
      properties['Đóng góp vào'] = {
        select: { name: trunc(emp.target, 100) },
      };
    }

    try {
      if (!DRY_RUN) {
        await createPage(DB.EMPLOYEE_COMMITMENTS, properties);
        // Rate limit: ~3 requests/sec to stay safe
        await delay(350);
      }

      console.log(`  ${progress} ✅ ${emp.name} (${emp.department || 'N/A'})`);
      created++;
    } catch (error) {
      console.error(`  ${progress} ❌ ${emp.name}: ${error.message}`);
      failed++;
      // Continue on error, don't stop the batch
      await delay(500);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n==========================================');
  console.log('[Import] SUMMARY:');
  console.log(`  ✅ Created: ${created}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  ⏭️ Skipped: ${skipped}`);
  console.log(`  ⏱️ Time: ${elapsed}s`);
  console.log('==========================================');

  return { created, failed, skipped };
}

if (require.main === module) {
  run().catch(err => {
    console.error('❌ FATAL:', err);
    process.exit(1);
  });
}

module.exports = { run };
