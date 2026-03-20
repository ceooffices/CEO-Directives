/**
 * hm50-linker.js
 * Auto-suggest + link chỉ đạo hàng ngày → 50 Hạng Mục Chiến Lược
 *
 * v2: BSC Strategic Tracking — Phase 2
 *   - Write Supabase hm50_id relation on directive
 *   - Update Directive_Count + Completion_Rate on HM50
 *   - Auto-classify Directive_Type + BSC_Perspective
 *
 * Usage:
 *   node hm50-linker.js              # Generate mapping + sync Supabase
 *   node hm50-linker.js --sync       # (legacy alias, same as default)
 *   node hm50-linker.js --dry-run    # Preview only, không ghi DB
 */

const fs = require('fs');
const path = require('path');
const { queryAllDirectives, queryAllHM50, updateDirective,
        db } = require('./lib/supabase-client');
const { logExecution } = require('./lib/logger');

const DRY_RUN = process.argv.includes('--dry-run');
const DATA_DIR = path.join(__dirname, '..', 'data');

// ===== BSC AUTO-CLASSIFY (Task 2.2) =====

const PHAN_CL_TO_BSC = {
  'I — Tầm nhìn & Triết lý':        'Học tập & Phát triển',
  'II — Quản trị kết quả':           'Quy trình nội bộ',
  'III — Tổ chức & Nhân sự':         'Học tập & Phát triển',
  'IV — Lương 3P & Đầu mối':        'Quy trình nội bộ',
  'V — Văn hóa & Con người':        'Khách hàng',
  'VI — Chiến lược KD & MKT':       'Tài chính',
  'VII — Công nghệ & Dữ liệu':      'Quy trình nội bộ',
  'VIII — Học tập & Tương lai':      'Học tập & Phát triển',
};

/**
 * Xác định BSC Perspective từ Phần CL của HM50
 */
function classifyBSC(phanCL) {
  if (!phanCL) return null;
  // Exact match trước
  if (PHAN_CL_TO_BSC[phanCL]) return PHAN_CL_TO_BSC[phanCL];
  // Fallback: match Roman numeral prefix (e.g. "VII" → "VII — Công nghệ...")
  // Sắp xếp dài → ngắn để tránh "I" match trước "II"
  const sortedKeys = Object.keys(PHAN_CL_TO_BSC).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    const prefix = key.split(' — ')[0]; // "VII", "II", etc.
    if (phanCL.startsWith(prefix + ' ') || phanCL === prefix) {
      return PHAN_CL_TO_BSC[key];
    }
  }
  return null;
}

// ===== KEYWORD MATCHING ENGINE =====

/**
 * Build keyword index from HM50 items
 * Each HM has keywords extracted from: hang_muc, t2_task, t3_target
 */
function buildKeywordIndex(hm50Items) {
  const index = [];

  for (const hm of hm50Items) {
    // Extract meaningful words from title + task + target
    const text = [
      hm.hang_muc,
      hm.t2_task,
      hm.t3_target,
      hm.kpi_daily,
    ].filter(Boolean).join(' ').toLowerCase();

    // Extract keywords (Vietnamese-aware)
    const keywords = text
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2)
      .filter(w => !['các', 'của', 'cho', 'với', 'trong', 'theo', 'được', 'này', 'những'].includes(w));

    index.push({
      id: hm.id,
      tt: hm.tt,
      title: hm.hang_muc,
      phan_cl: hm.phan_cl,
      keywords: [...new Set(keywords)],
    });
  }

  return index;
}

/**
 * Score how well a directive matches an HM based on keyword overlap
 */
function scoreMatch(directiveText, hmKeywords) {
  const dirWords = directiveText.toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2);

  let matchCount = 0;
  for (const kw of hmKeywords) {
    if (dirWords.some(dw => dw.includes(kw) || kw.includes(dw))) {
      matchCount++;
    }
  }

  // Score = percentage of HM keywords matched
  return hmKeywords.length > 0 ? matchCount / hmKeywords.length : 0;
}

/**
 * Find best matching HM for a directive
 */
function findBestMatch(directiveTitle, directiveContent, keywordIndex, threshold = 0.15) {
  const fullText = [directiveTitle, directiveContent].filter(Boolean).join(' ');
  let bestMatch = null;
  let bestScore = 0;

  for (const hm of keywordIndex) {
    const score = scoreMatch(fullText, hm.keywords);
    if (score > bestScore && score >= threshold) {
      bestScore = score;
      bestMatch = hm;
    }
  }

  return bestMatch ? { ...bestMatch, score: Math.round(bestScore * 100) } : null;
}

// ===== HM50 DATA READER =====

// Supabase trả flat rows — parse trực tiếp
function parseHM50Rows(rows) {
  return rows.map(r => ({
    id: r.id,
    tt: r.hm_number || 0,
    hang_muc: r.ten || '',
    phan_cl: r.phan_cl || '',
    status: r.status || '',
    t1_dau_moi: r.t1_dau_moi || '',
    t2_task: r.t2_task || '',
    t3_target: r.t3_target || '',
    kpi_daily: r.kpi_daily || '',
    impact_score: r.impact_score || 0,
  })).sort((a, b) => a.tt - b.tt);
}

// ===== SUPABASE SYNC (Phase 2) =====

/**
 * Task 2.1: Ghi hm50_id relation lên directive
 * KHÔNG override Directive_Type — giữ nguyên giá trị từ bod-import hoặc manual input
 */
async function syncDirectiveToSupabase(directiveId, match) {
  if (match) {
    await updateDirective(directiveId, { hm50_id: match.id });
  }
}

/**
 * Task 2.1: Cập nhật directive_count + completion_rate trên bảng hm50
 * Task 2.2: Auto-set bsc_perspective dựa trên Phần CL
 */
async function syncHM50ToSupabase(hmId, directiveCount, completionRate, phanCL) {
  const fields = {
    directive_count: directiveCount,
    completion_rate: completionRate,
  };

  // BSC auto-classify
  const bsc = classifyBSC(phanCL);
  if (bsc) {
    fields.bsc_perspective = bsc;
  }

  const { error } = await db
    .from('hm50')
    .update(fields)
    .eq('id', hmId);

  if (error) throw new Error(`syncHM50 ${hmId}: ${error.message}`);
}

// ===== TIMELINE BUILDER (Phase 4) =====

/**
 * Build hm50_timeline.json từ tất cả BOD_*.json trong data/bod/
 * Tổng hợp escalation history + trend cho mỗi HM qua nhiều cuộc họp.
 */
function buildTimeline(hmAggregate, hm50Items) {
  const bodDir = path.join(DATA_DIR, 'bod');
  if (!fs.existsSync(bodDir)) {
    console.log('  ⚠️ data/bod/ không tồn tại — bỏ qua timeline');
    return null;
  }

  // 1. Scan tất cả BOD_*.json
  const bodFiles = fs.readdirSync(bodDir)
    .filter(f => f.startsWith('BOD_') && f.endsWith('.json'))
    .sort();

  if (bodFiles.length === 0) {
    console.log('  ⚠️ Không tìm thấy BOD_*.json — bỏ qua timeline');
    return null;
  }

  const meetings = [];
  // Track: hm_tt → { escalation_history[], total_mentions, total_escalations }
  const hmTimeline = {};

  // Khởi tạo từ hm50Items
  for (const hm of hm50Items) {
    hmTimeline[hm.tt] = {
      hm_tt: hm.tt,
      title: hm.hang_muc,
      phan_cl: hm.phan_cl,
      current_status: hm.status,
      t1_dau_moi: hm.t1_dau_moi,
      escalation_history: [],
      total_mentions: 0,
      total_escalations: 0,
      snapshots: [],
    };
  }

  // 2. Đọc từng BOD file và trích xuất dữ liệu escalation
  for (const file of bodFiles) {
    const filePath = path.join(bodDir, file);
    let bodData;
    try {
      bodData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (err) {
      console.error(`  ✖ Không đọc được ${file}: ${err.message}`);
      continue;
    }

    const meetingId = bodData.meeting_id || file.replace('.json', '');
    const meetingDate = bodData.date || '';
    const directives = bodData.directives || [];

    // Aggregate: HM → danh sách chỉ đạo từ meeting này
    const hmDirectives = {};
    for (const d of directives) {
      const hmMatch = d.hm50_match;
      if (!hmMatch || !hmMatch.hm_tt) continue;

      const hmTT = hmMatch.hm_tt;
      if (!hmDirectives[hmTT]) {
        hmDirectives[hmTT] = [];
      }
      hmDirectives[hmTT].push({
        id: `#${d.local_id}`,
        title: d.title,
        loai: d.loai || 'moi',
      });
    }

    // Đếm HM bị ảnh hưởng
    const hmAffected = Object.keys(hmDirectives).length;
    const riskSignals = [];

    // 3. Ghi vào escalation_history cho từng HM
    for (const [hmTTStr, dirList] of Object.entries(hmDirectives)) {
      const hmTT = parseInt(hmTTStr, 10);
      if (!hmTimeline[hmTT]) {
        // HM chưa có trong master — tạo mới
        hmTimeline[hmTT] = {
          hm_tt: hmTT,
          title: `HM${hmTT}`,
          phan_cl: '',
          current_status: '',
          t1_dau_moi: '',
          escalation_history: [],
          total_mentions: 0,
          total_escalations: 0,
          snapshots: [],
        };
      }

      const escalationCount = dirList.filter(d => d.loai === 'leo_thang').length;

      hmTimeline[hmTT].escalation_history.push({
        meeting: meetingId,
        date: meetingDate,
        count: dirList.length,
        directives: dirList,
      });

      hmTimeline[hmTT].total_mentions += dirList.length;
      hmTimeline[hmTT].total_escalations += escalationCount;

      // Thêm snapshot cho meeting này
      const agg = hmAggregate[hmTT];
      hmTimeline[hmTT].snapshots.push({
        date: meetingDate,
        directive_count: dirList.length,
        completion_rate: agg ? (agg.total > 0 ? Math.round((agg.completed / agg.total) * 100) / 100 : 0) : 0,
      });

      // Risk signal: HM có status xấu + có tín hiệu rủi ro
      const status = hmTimeline[hmTT].current_status;
      if (escalationCount > 0 && (status.includes('Blind spot') || status.includes('Chưa có chủ'))) {
        riskSignals.push({
          hm_tt: hmTT,
          reason: `Tín hiệu ${escalationCount} lần, status ${status}`,
        });
      }
    }

    meetings.push({
      meeting_id: meetingId,
      date: meetingDate,
      total_directives: directives.length,
      hm_affected: hmAffected,
      risk_signals: riskSignals,
    });
  }

  // 4. Tính trend cho từng HM
  const hmItems = Object.values(hmTimeline)
    .filter(h => h.escalation_history.length > 0)
    .sort((a, b) => b.total_mentions - a.total_mentions)
    .map(h => {
      let trend;
      if (h.total_mentions >= 4) {
        trend = 'critical';
      } else if (h.total_mentions >= 2) {
        trend = 'worsening';
      } else {
        trend = 'stable';
      }
      return { ...h, trend };
    });

  // 5. Summary
  const summary = {
    total_hm_affected: hmItems.length,
    critical: hmItems.filter(h => h.trend === 'critical').length,
    worsening: hmItems.filter(h => h.trend === 'worsening').length,
    stable: hmItems.filter(h => h.trend === 'stable').length,
  };

  const timeline = {
    generated_at: new Date().toISOString(),
    meetings,
    hm_items: hmItems,
    summary,
  };

  return timeline;
}

// ===== MAIN =====

async function run() {
  const startTime = Date.now();

  console.log('==========================================');
  console.log(`[HM50] ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`);
  console.log(`[HM50] Mode: ${DRY_RUN ? '🏜️ DRY-RUN' : '⚡ LIVE'}`);
  console.log('[HM50] Auto-Link Directives → 50 HM Chiến Lược (v2 BSC)');
  console.log('==========================================');

  // 1. Load HM50
  console.log('\n[1/7] Loading 50 HM Chiến Lược...');
  let hm50Items;
  try {
    const rows = await queryAllHM50();
    hm50Items = parseHM50Rows(rows);
    console.log(`  Loaded ${hm50Items.length} HM from Supabase`);
  } catch (e) {
    // Fallback to cached JSON
    const cachePath = path.join(DATA_DIR, 'hm50_master.json');
    if (fs.existsSync(cachePath)) {
      const cached = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
      hm50Items = cached.items;
      console.log(`  Loaded ${hm50Items.length} HM from cache`);
    } else {
      console.error('  ❌ Cannot load HM50 data');
      return;
    }
  }

  // 2. Build keyword index
  console.log('\n[2/7] Building keyword index...');
  const keywordIndex = buildKeywordIndex(hm50Items);
  console.log(`  Index built: ${keywordIndex.length} HM with keywords`);

  // 3. Load daily directives
  console.log('\n[3/7] Loading daily directives...');
  const directives = await queryAllDirectives();
  console.log(`  Found: ${directives.length} directives`);

  // 4. Match
  console.log('\n[4/7] Matching directives → HM...');
  const mapping = [];
  let matchedCount = 0, unmatchedCount = 0;

  for (const row of directives) {
    const title = row.t2_nhiem_vu || row.directive_code || '';
    const nhiemVu = row.t2_nhiem_vu || '';
    const tinhTrang = row.tinh_trang || '';

    const match = findBestMatch(title, nhiemVu, keywordIndex);

    const entry = {
      directive_id: row.id,
      directive_title: title,
      directive_status: tinhTrang,
      hm_match: match ? {
        hm_id: match.id,
        hm_tt: match.tt,
        hm_title: match.title,
        hm_phan_cl: match.phan_cl,
        confidence: match.score,
      } : null,
    };

    mapping.push(entry);

    if (match) {
      matchedCount++;
      if (match.score >= 30) {
        console.log(`  ✅ "${title.substring(0, 50)}" → HM${match.tt} (${match.score}%)`);
      } else {
        console.log(`  🟡 "${title.substring(0, 50)}" → HM${match.tt} (${match.score}% weak)`);
      }
    } else {
      unmatchedCount++;
      console.log(`  ❓ "${title.substring(0, 50)}" → Không tìm thấy HM phù hợp`);
    }
  }

  // 5. Sync relations to Supabase (Phase 2 — Task 2.1)
  console.log('\n[5/7] Syncing to Supabase...');
  if (!DRY_RUN) {
    let syncOk = 0, syncErr = 0;

    // 5a. Sync directive → hm50_id
    for (const m of mapping) {
      try {
        await syncDirectiveToSupabase(m.directive_id, m.hm_match ? { id: m.hm_match.hm_id } : null);
        syncOk++;
      } catch (err) {
        syncErr++;
        console.error(`  ✖ Sync directive ${m.directive_id}: ${err.message}`);
      }
    }
    console.log(`  Directives synced: ${syncOk} ok, ${syncErr} errors`);
  } else {
    console.log('  🏜️ DRY-RUN: Bỏ qua sync directives');
  }

  // Generate aggregate: HM → list of directives
  const hmAggregate = {};
  for (const hm of hm50Items) {
    hmAggregate[hm.tt] = {
      id: hm.id,
      tt: hm.tt,
      title: hm.hang_muc,
      phan_cl: hm.phan_cl,
      status: hm.status,
      dau_moi: hm.t1_dau_moi,
      impact_score: hm.impact_score,
      directives: [],
      completed: 0,
      in_progress: 0,
      total: 0,
    };
  }

  // Also add "Unmatched" bucket
  hmAggregate['new'] = {
    id: 'unmatched',
    tt: 0,
    title: '🆕 Chỉ đạo mới (chưa gắn HM)',
    phan_cl: 'Tín hiệu rủi ro',
    status: '',
    dau_moi: '',
    impact_score: 0,
    directives: [],
    completed: 0,
    in_progress: 0,
    total: 0,
  };

  for (const m of mapping) {
    const key = m.hm_match ? m.hm_match.hm_tt : 'new';
    if (hmAggregate[key]) {
      hmAggregate[key].directives.push({
        id: m.directive_id,
        title: m.directive_title,
        status: m.directive_status,
        confidence: m.hm_match?.confidence || 0,
      });
      hmAggregate[key].total++;
      if (m.directive_status === 'Hoàn thành') hmAggregate[key].completed++;
      else hmAggregate[key].in_progress++;
    }
  }

  // 6. Sync HM50 counts + BSC to Supabase (Phase 2 — Task 2.1 + 2.2)
  console.log('\n[6/7] Updating HM50 counts + BSC...');
  if (!DRY_RUN) {
    let hmSyncOk = 0, hmSyncErr = 0;

    for (const hm of hm50Items) {
      const agg = hmAggregate[hm.tt];
      if (!agg) continue;

      const completionRate = agg.total > 0 ? agg.completed / agg.total : 0;

      try {
        await syncHM50ToSupabase(hm.id, agg.total, completionRate, hm.phan_cl);
        hmSyncOk++;
      } catch (err) {
        hmSyncErr++;
        console.error(`  ✖ Sync HM${hm.tt}: ${err.message}`);
      }
    }
    console.log(`  HM50 synced: ${hmSyncOk} ok, ${hmSyncErr} errors`);
  } else {
    // Dry-run: hiển thị BSC mapping
    console.log('  🏜️ DRY-RUN: BSC Preview:');
    for (const hm of hm50Items) {
      const bsc = classifyBSC(hm.phan_cl);
      const agg = hmAggregate[hm.tt];
      console.log(`    HM${hm.tt}: ${hm.phan_cl} → ${bsc || '?'} (${agg?.total || 0} directives)`);
    }
  }

  // 7. Build timeline (Phase 4)
  console.log('\n[7/7] Building HM50 timeline...');
  const timeline = buildTimeline(hmAggregate, hm50Items);
  if (timeline && !DRY_RUN) {
    const timelinePath = path.join(DATA_DIR, 'hm50_timeline.json');
    fs.writeFileSync(timelinePath, JSON.stringify(timeline, null, 2));
    console.log(`  💾 hm50_timeline.json saved (${timeline.hm_items.length} HMs, ${timeline.meetings.length} meetings)`);
    console.log(`  📊 Trends: ${timeline.summary.critical} critical, ${timeline.summary.worsening} worsening, ${timeline.summary.stable} stable`);
  } else if (timeline && DRY_RUN) {
    console.log(`  🏜️ DRY-RUN: Would write hm50_timeline.json (${timeline.hm_items.length} HMs)`);
  }

  // Build progress output
  const progress = {
    summary: {
      total_hm: hm50Items.length,
      total_directives: directives.length,
      matched: matchedCount,
      unmatched: unmatchedCount,
      match_rate: directives.length > 0 ? Math.round((matchedCount / directives.length) * 100) : 0,
    },
    by_phan_cl: {},
    by_bsc: {},
    items: Object.values(hmAggregate)
      .filter(h => h.tt > 0)
      .sort((a, b) => a.tt - b.tt)
      .map(h => ({
        ...h,
        bsc_perspective: classifyBSC(h.phan_cl) || 'Chưa phân loại',
        progress_pct: h.total > 0 ? Math.round((h.completed / h.total) * 100) : 0,
      })),
    unmatched: hmAggregate['new'],
    synced_at: new Date().toISOString(),
  };

  // Aggregate by Phần CL
  for (const item of progress.items) {
    if (!progress.by_phan_cl[item.phan_cl]) {
      progress.by_phan_cl[item.phan_cl] = { total_hm: 0, total_directives: 0, completed: 0 };
    }
    progress.by_phan_cl[item.phan_cl].total_hm++;
    progress.by_phan_cl[item.phan_cl].total_directives += item.total;
    progress.by_phan_cl[item.phan_cl].completed += item.completed;
  }

  // Aggregate by BSC Perspective
  for (const item of progress.items) {
    const bsc = item.bsc_perspective;
    if (!progress.by_bsc[bsc]) {
      progress.by_bsc[bsc] = { total_hm: 0, total_directives: 0, completed: 0 };
    }
    progress.by_bsc[bsc].total_hm++;
    progress.by_bsc[bsc].total_directives += item.total;
    progress.by_bsc[bsc].completed += item.completed;
  }

  // Save JSON (backward compatible)
  if (!DRY_RUN) {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

    const progressPath = path.join(DATA_DIR, 'hm50_progress.json');
    fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2));
    console.log(`\n  💾 hm50_progress.json saved`);

    const mappingPath = path.join(DATA_DIR, 'hm50_mapping.json');
    fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 2));
    console.log(`  💾 hm50_mapping.json saved`);

    // Update hm50_master.json cache
    const masterPath = path.join(DATA_DIR, 'hm50_master.json');
    const master = {
      db_source: 'supabase:hm50',
      total: hm50Items.length,
      items: hm50Items,
      exported_at: new Date().toISOString(),
    };
    fs.writeFileSync(masterPath, JSON.stringify(master, null, 2));
    console.log(`  💾 hm50_master.json updated`);
  }

  await logExecution({
    workflow: 'HM50 - Linker v2 BSC',
    step: 'Auto-Match + Sync',
    status: '✅ Success',
    details: `Matched: ${matchedCount}/${directives.length} (${progress.summary.match_rate}%) | BSC: ${Object.keys(progress.by_bsc).length} perspectives`,
    dryRun: DRY_RUN,
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n==========================================');
  console.log('[HM50] SUMMARY (v2 BSC):');
  console.log(`  📋 HM: ${hm50Items.length}`);
  console.log(`  📊 Directives: ${directives.length}`);
  console.log(`  ✅ Matched: ${matchedCount} (${progress.summary.match_rate}%)`);
  console.log(`  ❓ Unmatched: ${unmatchedCount}`);
  console.log(`  📈 BSC Breakdown:`);
  for (const [bsc, data] of Object.entries(progress.by_bsc)) {
    console.log(`     ${bsc}: ${data.total_hm} HM, ${data.total_directives} directives`);
  }
  console.log(`  ⏱️ Time: ${elapsed}s`);
  console.log('==========================================');

  return progress;
}

if (require.main === module) {
  run().catch(err => {
    console.error('❌ FATAL:', err);
    process.exit(1);
  });
}

module.exports = { run, buildKeywordIndex, findBestMatch, classifyBSC, PHAN_CL_TO_BSC };
