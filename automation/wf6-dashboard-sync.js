/**
 * wf6-dashboard-sync.js
 * CEO Directive WF6: Dashboard Data Sync
 *
 * ⚠️ DEPRECATED — Dashboard đọc Supabase trực tiếp (2026-03-18)
 * Xem: web/src/lib/supabase.ts
 *
 * Flow cũ:
 *   Query Notion DBs → Transform → Write JSON → Next.js Dashboard đọc JSON
 *
 * Usage:
 *   node wf6-dashboard-sync.js              # Exit ngay với warning
 */

console.warn('[WF6] ⚠️ DEPRECATED — Dashboard đọc Supabase trực tiếp. File này không còn cần thiết.');
console.warn('[WF6] Xem: web/src/lib/supabase.ts');
process.exit(0);

// === DEAD CODE — giữ lại để tham khảo, không chạy ===
const fs = require('fs');
const path = require('path');
// notion-client đã bị loại bỏ (isolation plan GĐ3)
const safeText = () => ''; const safeSelect = () => ''; const safeDate = () => '';
const safeRollupEmail = () => ''; const safeRollupTitle = () => '';
const queryAllClarifications = async () => []; const queryActiveClarifications = async () => [];
const queryAllHR = async () => []; const queryAllHM50 = async () => [];
const logExecution = async () => {};

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
  // BUG-5 fix: dùng + thay || để cộng cả 2 status name (Notion có thể có cả hai)
  const done = (statusMap['Hoàn thành'] || 0) + (statusMap['Đã hoàn thành'] || 0);
  const inProgress = (statusMap['Đang xử lý'] || 0) + (statusMap['Đang thực hiện'] || 0);
  const waiting = (statusMap['Chờ xử lý'] || 0) + (statusMap['Chờ làm rõ'] || 0);

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

// ===== BSC SUMMARY (Phase 4) =====

const BSC_KEY_MAP = {
  'Tài chính':            'financial',
  'Khách hàng':           'customer',
  'Quy trình nội bộ':    'process',
  'Học tập & Phát triển': 'learning',
};

const LELONGSON_KEY_MAP = {
  'Chưa gửi':            'chua_gui',
  'Đã gửi đề xuất':      'da_gui',
  'ChatLong phản hồi':   'chatlong_phan_hoi',
  'Đang nâng cấp':       'dang_nang_cap',
  'Đã duyệt':            'da_duyet',
  'Hoàn thành':           'hoan_thanh',
};

function computeBSCSummary(hm50Pages) {
  // Khởi tạo cấu trúc output
  const bsc = {
    financial: { hm_count: 0, directive_count: 0, completion: 0 },
    customer:  { hm_count: 0, directive_count: 0, completion: 0 },
    process:   { hm_count: 0, directive_count: 0, completion: 0 },
    learning:  { hm_count: 0, directive_count: 0, completion: 0 },
  };

  const lelongson_stages = {
    chua_gui: 0, da_gui: 0, chatlong_phan_hoi: 0,
    dang_nang_cap: 0, da_duyet: 0, hoan_thanh: 0,
  };

  // Track completion sums cho weighted average
  const bscCompletionSum = { financial: 0, customer: 0, process: 0, learning: 0 };

  for (const page of hm50Pages) {
    const props = page.properties || {};

    const bscPerspective = safeSelect(props['BSC_Perspective']?.select);
    const directiveCount = props['Directive_Count']?.number || 0;
    // Convention: Completion_Rate trong Notion luôn 0-1 (hm50-linker ghi 0-1)
    // Guard: clamp về 0-1 nếu ai nhập > 1 (ví dụ 75 thay vì 0.75)
    let completionRate = props['Completion_Rate']?.number || 0;
    if (completionRate > 1) completionRate = completionRate / 100;
    const lelongsonStage = safeSelect(props['LELONGSON_Stage']?.select);

    // Aggregate BSC
    const bscKey = BSC_KEY_MAP[bscPerspective];
    if (bscKey && bsc[bscKey]) {
      bsc[bscKey].hm_count++;
      bsc[bscKey].directive_count += directiveCount;
      bscCompletionSum[bscKey] += completionRate;
    }

    // Aggregate LELONGSON stages
    const stageKey = LELONGSON_KEY_MAP[lelongsonStage];
    if (stageKey && lelongson_stages[stageKey] !== undefined) {
      lelongson_stages[stageKey]++;
    }
  }

  // Tính completion trung bình cho mỗi BSC perspective
  for (const key of Object.keys(bsc)) {
    if (bsc[key].hm_count > 0) {
      bsc[key].completion = Math.round((bscCompletionSum[key] / bsc[key].hm_count) * 100);
    }
  }

  return {
    bsc,
    lelongson_stages,
    total_hm: hm50Pages.length,
    synced_at: new Date().toISOString(),
  };
}

// ===== SNAPSHOT APPEND (Phase 4) =====

/**
 * Append HM50 snapshots vào JSONL file khi có thay đổi directive_count hoặc completion_rate.
 * Mỗi dòng = 1 JSON object cho 1 HM tại 1 thời điểm.
 */
function appendHM50Snapshots(hm50Pages) {
  const snapshotPath = path.join(DATA_DIR, 'hm50_snapshots.jsonl');
  const now = new Date().toISOString();

  // Đọc snapshot cuối cùng cho mỗi HM để detect thay đổi
  const lastByHM = {};
  if (fs.existsSync(snapshotPath)) {
    const lines = fs.readFileSync(snapshotPath, 'utf-8').trim().split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        if (entry.hm_tt) {
          lastByHM[entry.hm_tt] = entry;
        }
      } catch (_) {
        // Bỏ qua dòng lỗi
      }
    }
  }

  // So sánh và append nếu có thay đổi
  let appendCount = 0;
  for (const page of hm50Pages) {
    const props = page.properties || {};
    const hmTT = props['TT']?.number;
    if (!hmTT) continue;

    const hmTitle = safeText(props['Hạng mục']?.title);
    const status = safeSelect(props['Status']?.select) || '';
    const directiveCount = props['Directive_Count']?.number || 0;
    const completionRate = props['Completion_Rate']?.number || 0;

    const last = lastByHM[hmTT];
    const changed = !last
      || last.directive_count !== directiveCount
      || last.completion_rate !== completionRate;

    if (changed) {
      const snapshot = {
        ts: now,
        hm_tt: hmTT,
        hm_title: hmTitle,
        status,
        directive_count: directiveCount,
        completion_rate: completionRate,
        source: 'wf6-sync',
      };
      fs.appendFileSync(snapshotPath, JSON.stringify(snapshot) + '\n');
      appendCount++;
    }
  }

  if (appendCount > 0) {
    console.log(`  📸 Appended ${appendCount} HM50 snapshots to hm50_snapshots.jsonl`);
  } else {
    console.log(`  📸 No HM50 changes detected — snapshots skipped`);
  }
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
  console.log('\n[1/4] Querying Notion databases...');
  let clarifications = [], activeClarifications = [], hr = [], hm50Pages = [];

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

  try {
    hm50Pages = await queryAllHM50();
  } catch (e) {
    console.warn('  ⚠️ HM50 DB not accessible:', e.message);
  }
  console.log(`  Clarifications: ${clarifications.length}`);
  console.log(`  Active directives: ${activeClarifications.length}`);
  console.log(`  HR records: ${hr.length}`);
  console.log(`  HM50 records: ${hm50Pages.length}`);

  // 2. Transform data
  console.log('\n[2/4] Transforming data...');
  const directives = transformDirectives(clarifications);
  const activeData = computeActiveClarifications(activeClarifications);
  const people = transformPeople(hr);
  const outcomes = computeOutcomes(directives);
  const bscSummary = computeBSCSummary(hm50Pages);

  console.log(`  Directives: ${directives.total} items`);
  console.log(`  Active: ${activeData.total} items (${activeData.overdue} overdue)`);
  console.log(`  People: ${people.length} records`);
  console.log(`  Completion rate: ${outcomes.summary.completion_rate}%`);
  console.log(`  BSC: ${bscSummary.total_hm} HM across 4 perspectives`);

  // 3. Write JSON files
  console.log('\n[3/4] Writing JSON files...');
  if (!DRY_RUN) {
    // Ensure data dir exists
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    writeJSON('directives.json', directives);
    writeJSON('outcomes.json', outcomes);
    writeJSON('active_directives.json', activeData);
    writeJSON('bsc_summary.json', bscSummary);
    // Don't overwrite people.json from HR import or kpi_targets.json

    writeJSON('sync_status.json', {
      last_sync: new Date().toISOString(),
      counts: {
        directives: directives.total,
        active: activeData.total,
        overdue: activeData.overdue,
        people: people.length,
        hm50: bscSummary.total_hm,
      },
      status: 'success',
    });

    // Append HM50 snapshots (chỉ ghi khi có thay đổi)
    appendHM50Snapshots(hm50Pages);
  } else {
    console.log('  [DRY-RUN] Would write: directives.json, outcomes.json, bsc_summary.json, sync_status.json');
  }

  // 4. BSC Summary log
  console.log('\n[4/4] BSC Summary:');
  for (const [key, data] of Object.entries(bscSummary.bsc)) {
    console.log(`  📈 ${key}: ${data.hm_count} HM, ${data.directive_count} directives, ${data.completion}% completion`);
  }
  const stageEntries = Object.entries(bscSummary.lelongson_stages).filter(([, v]) => v > 0);
  if (stageEntries.length > 0) {
    console.log('  📊 LELONGSON Stages:', stageEntries.map(([k, v]) => `${k}=${v}`).join(', '));
  }

  await logExecution({
    workflow: 'WF6 - Dashboard Sync',
    step: 'Full Sync',
    status: '✅ Success',
    details: `Directives: ${directives.total}, Active: ${activeData.total}, Overdue: ${activeData.overdue}, People: ${people.length}, HM50: ${bscSummary.total_hm}`,
    dryRun: DRY_RUN,
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n==========================================');
  console.log('[WF6] SUMMARY:');
  console.log(`  📊 Directives: ${directives.total}`);
  console.log(`  ⚡ Active: ${activeData.total}`);
  console.log(`  🔴 Overdue: ${activeData.overdue}`);
  console.log(`  👥 People: ${people.length}`);
  console.log(`  📈 HM50 BSC: ${bscSummary.total_hm}`);
  console.log(`  ⏱️ Time: ${elapsed}s`);
  console.log('==========================================');

  return { directives: directives.total, active: activeData.total, people: people.length, hm50: bscSummary.total_hm };
}

if (require.main === module) {
  run().catch(err => {
    console.error('❌ FATAL:', err);
    process.exit(1);
  });
}

module.exports = { run };
