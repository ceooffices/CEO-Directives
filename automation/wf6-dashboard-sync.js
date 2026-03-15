/**
 * wf6-dashboard-sync.js
 * CEO Directive WF6: Dashboard Data Sync
 * 
 * Flow:
 *   Query Notion DBs → Transform → Write JSON → Dashboard auto-reads
 * 
 * Usage:
 *   node wf6-dashboard-sync.js              # Chạy thật
 *   node wf6-dashboard-sync.js --dry-run    # Chỉ log, không ghi file
 */

const fs = require('fs');
const path = require('path');
const { queryAllClarifications, queryActiveClarifications, queryAllHR,
        safeText, safeSelect, safeDate, safeRelation,
        safeRollupEmail, safeRollupTitle } = require('./lib/notion-client');
const { logExecution } = require('./lib/logger');

const DRY_RUN = process.argv.includes('--dry-run');
const DATA_DIR = path.join(__dirname, '..', 'data');

// ===== TRANSFORMERS =====

function transformDirectives(pages) {
  const directives = [];
  const statusCounts = {};
  const sourceCounts = {};
  const leaderCounts = {};

  for (const page of pages) {
    const props = page.properties || {};

    const tieuDe = safeText(props['Tiêu đề']?.title);
    const nguon = safeSelect(props['Nguồn']?.select);
    const ngayNhan = safeDate(props['Ngày nhận']?.date);
    const tinhTrang = safeSelect(props['TINH_TRANG']?.select) || safeSelect(props['TÌNH TRẠNG']?.select);
    const chiDaoBoi = safeRollupTitle(props['Tên người chỉ đạo']?.rollup);
    const dauMoi = safeRollupTitle(props['Tên đầu mối']?.rollup);
    const hm50Ref = safeSelect(props['HM50_REF']?.select) || safeText(props['HM50_REF']?.rich_text);

    directives.push({
      id: page.id,
      title: tieuDe,
      source: nguon,
      date: ngayNhan,
      status: tinhTrang,
      leader: chiDaoBoi,
      assignee: dauMoi,
      hm50_ref: hm50Ref,
      url: page.url,
    });

    // Aggregate counts
    statusCounts[tinhTrang] = (statusCounts[tinhTrang] || 0) + 1;
    if (nguon) sourceCounts[nguon] = (sourceCounts[nguon] || 0) + 1;
    if (chiDaoBoi) leaderCounts[chiDaoBoi] = (leaderCounts[chiDaoBoi] || 0) + 1;
  }

  return {
    items: directives,
    total: directives.length,
    by_status: statusCounts,
    by_source: sourceCounts,
    by_leader: leaderCounts,
    synced_at: new Date().toISOString(),
  };
}

/** Compute active directives breakdown */
function computeActiveClarifications(pages) {
  const statusCounts = {};
  let overdueCount = 0;
  const now = new Date();

  for (const page of pages) {
    const props = page.properties || {};
    const tinhTrang = safeSelect(props['TINH_TRANG']?.select) || 'Chưa rõ';
    statusCounts[tinhTrang] = (statusCounts[tinhTrang] || 0) + 1;

    const deadline = safeDate(props['T4 - Thời hạn']?.date);
    if (deadline && new Date(deadline) < now) overdueCount++;
  }

  return {
    total: pages.length,
    by_status: statusCounts,
    overdue: overdueCount,
    synced_at: new Date().toISOString(),
  };
}

function transformPeople(hrPages) {
  const people = [];

  for (const page of hrPages) {
    const props = page.properties || {};

    let name = '';
    for (const [key, value] of Object.entries(props)) {
      if (value.type === 'title' && value.title?.[0]) {
        name = value.title[0].plain_text || '';
        break;
      }
    }

    let email = '';
    for (const [key, value] of Object.entries(props)) {
      if (key.toLowerCase().includes('email')) {
        if (value.type === 'email') email = value.email || '';
        break;
      }
    }

    let dept = '';
    for (const [key, value] of Object.entries(props)) {
      if (key.toLowerCase().includes('phòng') || key.toLowerCase().includes('dept')) {
        dept = safeSelect(value.select) || safeText(value.rich_text);
        break;
      }
    }

    people.push({ name, email, department: dept });
  }

  return people;
}

function computeOutcomes(directives) {
  const statusMap = directives.by_status || {};
  const total = directives.total || 0;
  const done = statusMap['Hoàn thành'] || statusMap['Đã hoàn thành'] || 0;
  const inProgress = statusMap['Đang xử lý'] || 0;
  const waiting = statusMap['Chờ xử lý'] || statusMap['Chờ làm rõ'] || 0;

  return {
    summary: {
      total,
      completed: done,
      in_progress: inProgress,
      waiting,
      completion_rate: total > 0 ? Math.round((done / total) * 100) : 0,
    },
    by_status: statusMap,
    synced_at: new Date().toISOString(),
  };
}

// ===== WRITE HELPERS =====

function writeJSON(filename, data) {
  const filepath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  const sizeKB = (Buffer.byteLength(JSON.stringify(data, null, 2)) / 1024).toFixed(1);
  console.log(`  💾 ${filename} (${sizeKB}KB)`);
  return filepath;
}

// ===== MAIN LOGIC =====

async function run() {
  const startTime = Date.now();

  console.log('==========================================');
  console.log(`[WF6] ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`);
  console.log(`[WF6] Mode: ${DRY_RUN ? '🏜️ DRY-RUN' : '⚡ LIVE'}`);
  console.log('==========================================');

  // 1. Query all Notion data
  console.log('\n[1/3] Querying Notion databases...');
  let clarifications = [], activeClarifications = [], hr = [];

  try {
    clarifications = await queryAllClarifications();
  } catch (e) {
    console.warn('  ⚠️ Clarifications DB not accessible:', e.message);
  }

  try {
    activeClarifications = await queryActiveClarifications();
  } catch (e) {
    console.warn('  ⚠️ Active Clarifications query failed:', e.message);
  }

  try {
    hr = await queryAllHR();
  } catch (e) {
    console.warn('  ⚠️ HR DB not accessible:', e.message);
  }
  console.log(`  Clarifications: ${clarifications.length}`);
  console.log(`  Active directives: ${activeClarifications.length}`);
  console.log(`  HR records: ${hr.length}`);

  // 2. Transform data
  console.log('\n[2/3] Transforming data...');
  const directives = transformDirectives(clarifications);
  const activeData = computeActiveClarifications(activeClarifications);
  const people = transformPeople(hr);
  const outcomes = computeOutcomes(directives);

  console.log(`  Directives: ${directives.total} items`);
  console.log(`  Active: ${activeData.total} items (${activeData.overdue} overdue)`);
  console.log(`  People: ${people.length} records`);
  console.log(`  Completion rate: ${outcomes.summary.completion_rate}%`);

  // 3. Write JSON files
  console.log('\n[3/3] Writing JSON files...');
  if (!DRY_RUN) {
    // Ensure data dir exists
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    writeJSON('directives.json', directives);
    writeJSON('outcomes.json', outcomes);
    writeJSON('active_directives.json', activeData);
    // Don't overwrite people.json from HR import or kpi_targets.json

    writeJSON('sync_status.json', {
      last_sync: new Date().toISOString(),
      counts: {
        directives: directives.total,
        active: activeData.total,
        overdue: activeData.overdue,
        people: people.length,
      },
      status: 'success',
    });
  } else {
    console.log('  [DRY-RUN] Would write: directives.json, outcomes.json, people.json, sync_status.json');
  }

  await logExecution({
    workflow: 'WF6 - Dashboard Sync',
    step: 'Full Sync',
    status: '✅ Success',
    details: `Directives: ${directives.total}, Active: ${activeData.total}, Overdue: ${activeData.overdue}, People: ${people.length}`,
    dryRun: DRY_RUN,
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n==========================================');
  console.log('[WF6] SUMMARY:');
  console.log(`  📊 Directives: ${directives.total}`);
  console.log(`  ⚡ Active: ${activeData.total}`);
  console.log(`  🔴 Overdue: ${activeData.overdue}`);
  console.log(`  👥 People: ${people.length}`);
  console.log(`  ⏱️ Time: ${elapsed}s`);
  console.log('==========================================');

  return { directives: directives.total, active: activeData.total, people: people.length };
}

if (require.main === module) {
  run().catch(err => {
    console.error('❌ FATAL:', err);
    process.exit(1);
  });
}

module.exports = { run };
