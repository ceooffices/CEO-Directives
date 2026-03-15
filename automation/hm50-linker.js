/**
 * hm50-linker.js
 * Auto-suggest + link chỉ đạo hàng ngày → 50 Hạng Mục Chiến Lược
 * 
 * Logic:
 *   1. Load 50 HM master (from Notion or JSON cache)
 *   2. Load all daily clarifications
 *   3. Match bằng keyword/similarity → generate hm50_mapping.json
 *   4. Sync mapping ngược lên dashboard
 * 
 * Usage:
 *   node hm50-linker.js              # Generate mapping
 *   node hm50-linker.js --sync       # Generate + sync to Notion
 *   node hm50-linker.js --dry-run    # Preview only
 */

const fs = require('fs');
const path = require('path');
const { queryAllClarifications, queryAllHM50,
        safeText, safeSelect, safeDate,
        DB } = require('./lib/notion-client');
const { logExecution } = require('./lib/logger');

const DRY_RUN = process.argv.includes('--dry-run');
const DATA_DIR = path.join(__dirname, '..', 'data');

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

function parseHM50Pages(pages) {
  return pages.map(p => {
    const props = p.properties || {};
    return {
      id: p.id,
      tt: props['TT']?.number || 0,
      hang_muc: safeText(props['Hạng mục']?.title),
      phan_cl: props['Phần CL']?.select?.name || '',
      status: props['Status']?.select?.name || '',
      t1_dau_moi: safeText(props['T1: Đầu mối']?.rich_text),
      t2_task: safeText(props['T2: Task']?.rich_text),
      t3_target: safeText(props['T3: Target']?.rich_text),
      kpi_daily: safeText(props['KPI_Daily']?.rich_text),
      impact_score: props['Impact_Score']?.number || 0,
    };
  }).sort((a, b) => a.tt - b.tt);
}

// ===== MAIN =====

async function run() {
  const startTime = Date.now();

  console.log('==========================================');
  console.log(`[HM50] ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`);
  console.log(`[HM50] Mode: ${DRY_RUN ? '🏜️ DRY-RUN' : '⚡ LIVE'}`);
  console.log('[HM50] Auto-Link Directives → 50 HM Chiến Lược');
  console.log('==========================================');

  // 1. Load HM50
  console.log('\n[1/4] Loading 50 HM Chiến Lược...');
  let hm50Items;
  try {
    const pages = await queryAllHM50();
    hm50Items = parseHM50Pages(pages);
    console.log(`  Loaded ${hm50Items.length} HM from Notion`);
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
  console.log('\n[2/4] Building keyword index...');
  const keywordIndex = buildKeywordIndex(hm50Items);
  console.log(`  Index built: ${keywordIndex.length} HM with keywords`);

  // 3. Load daily directives
  console.log('\n[3/4] Loading daily directives...');
  const directives = await queryAllClarifications();
  console.log(`  Found: ${directives.length} directives`);

  // 4. Match
  console.log('\n[4/4] Matching directives → HM...');
  const mapping = [];
  let matchedCount = 0, unmatchedCount = 0;

  for (const page of directives) {
    const props = page.properties || {};
    const title = safeText(props['Tiêu đề']?.title);
    const nhiemVu = safeText(props['T2 - Nhiệm vụ']?.rich_text);
    const tinhTrang = safeSelect(props['TINH_TRANG']?.select);

    const match = findBestMatch(title, nhiemVu, keywordIndex);

    const entry = {
      directive_id: page.id,
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
    phan_cl: 'Leo thang',
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
    items: Object.values(hmAggregate)
      .filter(h => h.tt > 0)
      .sort((a, b) => a.tt - b.tt)
      .map(h => ({
        ...h,
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

  // Save
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
      db_id: DB.HM50,
      total: hm50Items.length,
      items: hm50Items,
      exported_at: new Date().toISOString(),
    };
    fs.writeFileSync(masterPath, JSON.stringify(master, null, 2));
    console.log(`  💾 hm50_master.json updated`);
  }

  await logExecution({
    workflow: 'HM50 - Linker',
    step: 'Auto-Match',
    status: '✅ Success',
    details: `Matched: ${matchedCount}/${directives.length} (${progress.summary.match_rate}%)`,
    dryRun: DRY_RUN,
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n==========================================');
  console.log('[HM50] SUMMARY:');
  console.log(`  📋 HM: ${hm50Items.length}`);
  console.log(`  📊 Directives: ${directives.length}`);
  console.log(`  ✅ Matched: ${matchedCount} (${progress.summary.match_rate}%)`);
  console.log(`  ❓ Unmatched: ${unmatchedCount}`);
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

module.exports = { run, buildKeywordIndex, findBestMatch };
