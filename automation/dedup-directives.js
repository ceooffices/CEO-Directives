/**
 * dedup-directives.js — Kiểm tra chỉ đạo trùng lặp giữa 3 cuộc BOD
 *
 * Vấn đề: Chỉ đạo tín hiệu lặp lại có thể lặp lại qua nhiều cuộc họp.
 * Script này tạo report, KHÔNG tự động xóa.
 *
 * Usage:
 *   node dedup-directives.js                # Dry-run (default) — chỉ report
 *   node dedup-directives.js --apply        # Đánh dấu superseded trong metadata
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// ===== CONFIG =====

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[DEDUP] Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env');
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

const APPLY = process.argv.includes('--apply');
const MODULE = '[DEDUP]';

// ===== MAIN =====

async function run() {
  console.log(`${MODULE} Bắt đầu kiểm tra chỉ đạo trùng lặp...`);
  console.log(`${MODULE} Mode: ${APPLY ? 'APPLY (sẽ đánh dấu superseded)' : 'DRY-RUN (chỉ report)'}`);

  // 1. Query tất cả directives
  const { data: directives, error } = await db
    .from('directives')
    .select('id, directive_code, t1_dau_moi, t2_nhiem_vu, t4_thoi_han, loai, hm50_id, meeting_source, tinh_trang')
    .order('meeting_source', { ascending: true });

  if (error) {
    console.error(`${MODULE} Lỗi query:`, error.message);
    process.exit(1);
  }

  console.log(`${MODULE} Tổng cộng ${directives.length} chỉ đạo`);

  // 2. Group by hm50_id (chỉ xét những cái có hm50_id)
  const grouped = new Map();
  let noHm50 = 0;

  for (const d of directives) {
    if (!d.hm50_id) {
      noHm50++;
      continue;
    }
    if (!grouped.has(d.hm50_id)) grouped.set(d.hm50_id, []);
    grouped.get(d.hm50_id).push(d);
  }

  console.log(`${MODULE} ${grouped.size} nhóm HM50 (${noHm50} chỉ đạo không có hm50_id)`);

  // 3. Tìm cặp trùng lặp
  const duplicatePairs = [];

  for (const [hm50Id, group] of grouped) {
    if (group.length < 2) continue;

    // Tìm cặp: cùng hm50_id + cùng loại 'leo_thang' + meeting khác nhau
    const leoThang = group.filter((d) => d.loai === 'leo_thang');
    if (leoThang.length < 2) continue;

    // So sánh từng cặp
    for (let i = 0; i < leoThang.length; i++) {
      for (let j = i + 1; j < leoThang.length; j++) {
        const a = leoThang[i];
        const b = leoThang[j];
        if (a.meeting_source !== b.meeting_source) {
          duplicatePairs.push({
            hm50_id: hm50Id,
            older: getMeetingDate(a.meeting_source) <= getMeetingDate(b.meeting_source) ? a : b,
            newer: getMeetingDate(a.meeting_source) <= getMeetingDate(b.meeting_source) ? b : a,
          });
        }
      }
    }
  }

  // 4. Tìm thêm: cùng hm50_id, cùng đầu mối, meeting khác nhau (không nhất thiết leo_thang)
  const similarPairs = [];

  for (const [hm50Id, group] of grouped) {
    if (group.length < 2) continue;

    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i];
        const b = group[j];
        if (a.meeting_source === b.meeting_source) continue;

        // Cùng đầu mối
        if (a.t1_dau_moi === b.t1_dau_moi) {
          // Đã report ở trên chưa?
          const alreadyReported = duplicatePairs.some(
            (p) => (p.older.id === a.id && p.newer.id === b.id) || (p.older.id === b.id && p.newer.id === a.id)
          );
          if (!alreadyReported) {
            similarPairs.push({
              hm50_id: hm50Id,
              a,
              b,
              reason: 'Cùng HM50 + cùng đầu mối, meeting khác nhau',
            });
          }
        }
      }
    }
  }

  // 5. Tạo report
  const reportLines = [];
  reportLines.push('# Báo Cáo Trùng Lặp Chỉ Đạo');
  reportLines.push(`> Tạo: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`);
  reportLines.push(`> Tổng chỉ đạo: ${directives.length}`);
  reportLines.push('');

  // Section 1: Tín hiệu trùng lặp
  reportLines.push('## 1. Chỉ đạo tín hiệu lặp lại (cùng HM50, meeting khác nhau)');
  reportLines.push('');

  if (duplicatePairs.length === 0) {
    reportLines.push('Không tìm thấy cặp tín hiệu trùng lặp.');
  } else {
    reportLines.push(`Tìm thấy **${duplicatePairs.length} cặp**:`);
    reportLines.push('');
    for (const pair of duplicatePairs) {
      reportLines.push(`### ${pair.older.directive_code} ↔ ${pair.newer.directive_code}`);
      reportLines.push(`- **Cũ:** ${pair.older.directive_code} (${pair.older.meeting_source}) — "${pair.older.t2_nhiem_vu?.substring(0, 80)}..."`);
      reportLines.push(`- **Mới:** ${pair.newer.directive_code} (${pair.newer.meeting_source}) — "${pair.newer.t2_nhiem_vu?.substring(0, 80)}..."`);
      reportLines.push(`- **Đầu mối:** ${pair.older.t1_dau_moi} / ${pair.newer.t1_dau_moi}`);
      reportLines.push(`- **Đề xuất:** Đánh dấu ${pair.older.directive_code} là superseded`);
      reportLines.push('');
    }
  }

  // Section 2: Tương tự (cùng HM50 + cùng đầu mối)
  reportLines.push('## 2. Chỉ đạo tương tự (cùng HM50 + cùng đầu mối)');
  reportLines.push('');

  if (similarPairs.length === 0) {
    reportLines.push('Không tìm thấy cặp tương tự nào thêm.');
  } else {
    reportLines.push(`Tìm thấy **${similarPairs.length} cặp** cần review:`);
    reportLines.push('');
    for (const pair of similarPairs) {
      reportLines.push(`- ${pair.a.directive_code} (${pair.a.meeting_source}) ↔ ${pair.b.directive_code} (${pair.b.meeting_source}) — Đầu mối: ${pair.a.t1_dau_moi}`);
    }
  }

  // Section 3: Thống kê
  reportLines.push('');
  reportLines.push('## 3. Thống kê');
  reportLines.push('');
  reportLines.push(`| Metric | Giá trị |`);
  reportLines.push(`|--------|---------|`);
  reportLines.push(`| Tổng chỉ đạo | ${directives.length} |`);
  reportLines.push(`| Có hm50_id | ${directives.length - noHm50} |`);
  reportLines.push(`| Nhóm HM50 | ${grouped.size} |`);
  reportLines.push(`| Cặp tín hiệu trùng | ${duplicatePairs.length} |`);
  reportLines.push(`| Cặp tương tự | ${similarPairs.length} |`);

  const reportContent = reportLines.join('\n');

  // Ghi report ra file
  const reportPath = path.join(__dirname, '..', 'docs', 'dedup-report.md');
  fs.writeFileSync(reportPath, reportContent, 'utf-8');
  console.log(`${MODULE} Report đã ghi: ${reportPath}`);

  // Console output
  console.log('');
  console.log(reportContent);

  // 6. Apply nếu có flag
  if (APPLY && duplicatePairs.length > 0) {
    console.log(`\n${MODULE} Đang đánh dấu ${duplicatePairs.length} chỉ đạo cũ là superseded...`);

    for (const pair of duplicatePairs) {
      const { error: upErr } = await db
        .from('directives')
        .update({
          tinh_trang: 'superseded',
        })
        .eq('id', pair.older.id);

      if (upErr) {
        console.error(`${MODULE} Lỗi update ${pair.older.directive_code}:`, upErr.message);
      } else {
        console.log(`${MODULE} ✅ ${pair.older.directive_code} → superseded (thay thế bởi ${pair.newer.directive_code})`);
      }
    }
  }

  return { duplicatePairs: duplicatePairs.length, similarPairs: similarPairs.length };
}

// ===== HELPERS =====

/**
 * Trích ngày từ meeting_source: "BOD 16/03/2026" → Date
 */
function getMeetingDate(source) {
  if (!source) return new Date(0);
  const match = source.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) return new Date(0);
  return new Date(`${match[3]}-${match[2]}-${match[1]}`);
}

// ===== EXECUTE =====

run()
  .then((result) => {
    console.log(`\n${MODULE} Hoàn tất. Trùng lặp: ${result.duplicatePairs}, Tương tự: ${result.similarPairs}`);
    process.exit(0);
  })
  .catch((err) => {
    console.error(`${MODULE} Lỗi nghiêm trọng:`, err);
    process.exit(1);
  });
