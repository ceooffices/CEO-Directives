/**
 * wf7-preflight-check.js
 * CEO Directive WF7: Pre-flight Check trước cuộc họp BQT Thứ Hai
 *
 * Logic:
 *   1. Query tất cả active directives → đếm theo BU/đầu mối
 *   2. Query overdue directives → phát hiện risk trước họp
 *   3. Tổng hợp dashboard-ready report
 *
 * Chạy: Cron Thứ Sáu chiều + Thứ Hai sáng sớm
 *
 * Usage:
 *   node wf7-preflight-check.js              # Chạy thật
 *   node wf7-preflight-check.js --dry-run    # Chỉ log
 */

const { queryActiveDirectives, queryOverdueDirectives, queryAllDirectives,
        logEvent, directiveUrl, DASHBOARD_URL } = require('./lib/supabase-client');

const DRY_RUN = process.argv.includes('--dry-run');

// ===== MAIN =====

async function run() {
  const startTime = Date.now();
  const now = new Date();

  console.log('==========================================');
  console.log(`[WF7] ${now.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`);
  console.log(`[WF7] Mode: ${DRY_RUN ? '🏜️ DRY-RUN' : '⚡ LIVE'}`);
  console.log('[WF7] Pre-flight Check Engine — Supabase');
  console.log('==========================================');

  // 1. Query data thật
  console.log('\n[1/3] Querying Supabase for meeting preparation data...');
  const [active, overdue, all] = await Promise.all([
    queryActiveDirectives(),
    queryOverdueDirectives(),
    queryAllDirectives(),
  ]);

  const completedCount = all.filter(d => d.tinh_trang === 'hoan_thanh').length;
  const confirmedCount = all.filter(d => d.confirmed_by).length;

  console.log(`  Active directives: ${active.length}`);
  console.log(`  Overdue (>= 3 days): ${overdue.length}`);
  console.log(`  Total: ${all.length} (Completed: ${completedCount}, Confirmed: ${confirmedCount})`);

  // 2. Phân tích theo đầu mối — ai có nhiều task cần quan tâm nhất
  console.log('\n[2/3] Analyzing by đầu mối (BU grouping)...');
  const byPerson = {};
  for (const row of active) {
    const dauMoi = row.t1_dau_moi || 'Chưa phân công';
    if (!byPerson[dauMoi]) {
      byPerson[dauMoi] = { active: 0, overdue: 0 };
    }
    byPerson[dauMoi].active++;
  }
  for (const row of overdue) {
    const dauMoi = row.t1_dau_moi || 'Chưa phân công';
    if (!byPerson[dauMoi]) {
      byPerson[dauMoi] = { active: 0, overdue: 0 };
    }
    byPerson[dauMoi].overdue++;
  }

  // Sort by overdue count (cao nhất trước)
  const sortedPersons = Object.entries(byPerson)
    .sort((a, b) => b[1].overdue - a[1].overdue);

  // 3. Build pre-flight report
  console.log('\n[3/3] Building Pre-flight Report...');

  // Overall readiness score
  let readiness = 'READY';
  let readinessIcon = '☑';
  if (overdue.length > 10) {
    readiness = 'NEEDS ATTENTION';
    readinessIcon = '📌';
  } else if (overdue.length > 5) {
    readiness = 'READY WITH NOTES';
    readinessIcon = '⏳';
  }

  // Report output
  console.log('\n===== PRE-FLIGHT REPORT =====');
  console.log(`📌 Trạng thái tổng: ${readinessIcon} ${readiness}`);
  console.log(`   ☑ Hoàn thành: ${completedCount}/${all.length}`);
  console.log(`   ⏳ Đang xử lý: ${active.length}`);
  console.log(`   📌 Cần quan tâm: ${overdue.length}`);
  console.log(`   📋 Đã xác nhận 5T: ${confirmedCount}/${all.length}`);

  console.log('\n   TOP đầu mối cần quan tâm tại họp:');
  for (const [name, stats] of sortedPersons.slice(0, 5)) {
    const icon = stats.overdue > 3 ? '📌' : stats.overdue > 0 ? '⏳' : '☑';
    console.log(`   ${icon} ${name}: ${stats.active} active, ${stats.overdue} cần quan tâm`);
  }
  console.log('=============================');

  // Log event
  await logEvent(null, 'wf7_preflight_check', {
    readiness,
    activeCount: active.length,
    overdueCount: overdue.length,
    completedCount,
    totalCount: all.length,
    topPersons: sortedPersons.slice(0, 5).map(([name, stats]) => ({
      name, active: stats.active, overdue: stats.overdue,
    })),
  }, DRY_RUN);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n[WF7] Done in ${elapsed}s`);

  return {
    readiness,
    active: active.length,
    overdue: overdue.length,
    completed: completedCount,
    total: all.length,
    confirmed: confirmedCount,
    topPersons: sortedPersons.slice(0, 5).map(([name, stats]) => ({
      name, ...stats,
    })),
  };
}

if (require.main === module) {
  run().catch(err => {
    console.error('❌ FATAL:', err);
    process.exit(1);
  });
}

module.exports = { run };
