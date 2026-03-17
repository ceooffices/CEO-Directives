#!/usr/bin/env node
/**
 * Update HM50 tinh_trang + bsc_perspective từ hm50_master.json → Supabase
 * Chạy: node supabase/update-hm50-status.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');

// Load .env
const envPath = path.join(__dirname, '..', 'automation', '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const match = line.match(/^([A-Z_]+)=(.+)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN = process.argv.includes('--dry-run');

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[UPDATE-HM50] Cần SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY trong automation/.env');
  process.exit(1);
}

// Map status emoji → tinh_trang enum
const STATUS_MAP = {
  '✅ Có chủ':      'dang_lam',
  '⚠️ Chưa có chủ': 'chua_bat_dau',
  '❌ Blind spot':   'nghen',
};

// Map phần CL → BSC perspective (sắp xếp dài→ngắn để tránh match sai "I" trước "II")
const PHAN_CL_TO_BSC = [
  ['VIII', 'hoc_hoi'],
  ['VII',  'quy_trinh'],
  ['VI',   'tai_chinh'],
  ['V',    'khach_hang'],
  ['IV',   'quy_trinh'],
  ['III',  'hoc_hoi'],
  ['II',   'quy_trinh'],
  ['I',    'hoc_hoi'],
];

function classifyBSC(phanCL) {
  if (!phanCL) return null;
  for (const [roman, bsc] of PHAN_CL_TO_BSC) {
    // Match "VIII —" nhưng không match "VIII" bên trong "XVIII"
    const regex = new RegExp(`(^|\\s)${roman}(\\s|$|\\s—)`);
    if (regex.test(phanCL)) return bsc;
  }
  return null;
}

function mapStatus(statusStr) {
  if (!statusStr) return 'chua_bat_dau';
  for (const [pattern, value] of Object.entries(STATUS_MAP)) {
    if (statusStr.includes(pattern) || statusStr.includes(pattern.replace('️', ''))) {
      return value;
    }
  }
  // Fallback: kiểm tra keyword
  if (statusStr.includes('Có chủ')) return 'dang_lam';
  if (statusStr.includes('Chưa có chủ')) return 'chua_bat_dau';
  if (statusStr.includes('Blind spot')) return 'nghen';
  if (statusStr.includes('Hoàn thành')) return 'hoan_thanh';
  return 'chua_bat_dau';
}

async function main() {
  // Đọc hm50_master.json
  const masterPath = path.join(__dirname, '..', 'data', 'hm50_master.json');
  if (!fs.existsSync(masterPath)) {
    console.error(`[UPDATE-HM50] Không tìm thấy ${masterPath}`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(masterPath, 'utf-8'));
  const items = data.items || [];
  console.log(`[UPDATE-HM50] Đọc ${items.length} HM từ hm50_master.json`);

  // Thống kê
  const stats = { dang_lam: 0, chua_bat_dau: 0, nghen: 0, hoan_thanh: 0 };
  const bscStats = { tai_chinh: 0, khach_hang: 0, quy_trinh: 0, hoc_hoi: 0, null: 0 };

  const updates = items.map(item => {
    const tinhTrang = mapStatus(item.status);
    const bsc = classifyBSC(item.phan_cl);
    stats[tinhTrang]++;
    bscStats[bsc || 'null']++;

    return {
      hm_number: item.tt,
      ten: item.hang_muc,
      tinh_trang: tinhTrang,
      bsc_perspective: bsc,
      phan_cl: item.phan_cl || null,
      dau_moi: item.t1_dau_moi || null,
      muc_tieu: item.t3_target || null,
    };
  });

  console.log('\n[UPDATE-HM50] Thống kê tinh_trang:');
  console.log(`  ► dang_lam (Có chủ):     ${stats.dang_lam}`);
  console.log(`  ► chua_bat_dau (Chưa có): ${stats.chua_bat_dau}`);
  console.log(`  ► nghen (Blind spot):     ${stats.nghen}`);
  console.log(`  ► hoan_thanh:             ${stats.hoan_thanh}`);

  console.log('\n[UPDATE-HM50] Thống kê BSC perspective:');
  console.log(`  ► tai_chinh:  ${bscStats.tai_chinh}`);
  console.log(`  ► khach_hang: ${bscStats.khach_hang}`);
  console.log(`  ► quy_trinh:  ${bscStats.quy_trinh}`);
  console.log(`  ► hoc_hoi:    ${bscStats.hoc_hoi}`);

  if (DRY_RUN) {
    console.log('\n[UPDATE-HM50] DRY RUN — không ghi vào Supabase');
    // Hiển thị chi tiết
    for (const u of updates) {
      console.log(`  HM${String(u.hm_number).padStart(2, '0')} | ${u.tinh_trang.padEnd(13)} | ${(u.bsc_perspective || 'N/A').padEnd(10)} | ${u.ten}`);
    }
    return;
  }

  // Upsert vào Supabase (dùng hm_number làm conflict key)
  const headers = {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'resolution=merge-duplicates,return=representation',
  };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/hm50?on_conflict=hm_number`, {
    method: 'POST',
    headers,
    body: JSON.stringify(updates),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`[UPDATE-HM50] Lỗi: HTTP ${res.status} — ${err}`);
    process.exit(1);
  }

  const result = await res.json();
  console.log(`\n[UPDATE-HM50] ☑ Cập nhật ${result.length} HM thành công`);
}

main().catch(err => {
  console.error('[UPDATE-HM50] Fatal:', err.message);
  process.exit(1);
});
