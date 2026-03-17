#!/usr/bin/env node
/**
 * Seed 50 HM vao Supabase tu 50_chi_dao.json
 * Chay: node supabase/seed-hm50.js
 */

const fs = require('fs');
const path = require('path');

// Load .env thủ công (không cần dotenv dependency)
const envPath = path.join(__dirname, '..', 'automation', '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const match = line.match(/^([A-Z_]+)=(.+)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[SEED-HM50] SUPABASE_URL va SUPABASE_SERVICE_ROLE_KEY can co trong automation/.env');
  process.exit(1);
}

// BSC perspective mapping (tu hm50-linker.js)
const SECTION_TO_BSC = {
  'PHẦN I':   'hoc_hoi',
  'PHẦN II':  'quy_trinh',
  'PHẦN III': 'hoc_hoi',
  'PHẦN IV':  'quy_trinh',
  'PHẦN V':   'khach_hang',
  'PHẦN VI':  'tai_chinh',
  'PHẦN VII': 'quy_trinh',
  'PHẦN VIII':'hoc_hoi',
};

function classifyBSC(section) {
  for (const [key, bsc] of Object.entries(SECTION_TO_BSC)) {
    if (section && section.includes(key)) return bsc;
  }
  return null;
}

async function main() {
  // Doc seed file tu CEO_Office_Hubs
  const seedPath = path.join('/Volumes/ESUHAI/Projects/CEO_Office_Hubs/CEO_Offices_Hub_v2_new/src/intelligence/data/50_chi_dao.json');

  if (!fs.existsSync(seedPath)) {
    console.error(`[SEED-HM50] Khong tim thay ${seedPath}`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
  const directives = data.directives || [];
  console.log(`[SEED-HM50] Doc ${directives.length} HM tu ${seedPath}`);

  const rows = directives.map(d => ({
    hm_number: d.hm,
    ten: d.hang_muc,
    dau_moi: d.dau_moi || null,
    tinh_trang: 'chua_bat_dau',
    muc_tieu: d.target || null,
    thoi_han: d.deadline || null,
    bsc_perspective: classifyBSC(d.section),
    phan_cl: d.section || null,
  }));

  // Upsert (dung hm_number lam conflict key)
  const headers = {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'resolution=merge-duplicates,return=representation',
  };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/hm50?on_conflict=hm_number`, {
    method: 'POST',
    headers,
    body: JSON.stringify(rows),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`[SEED-HM50] Loi: HTTP ${res.status} — ${err}`);
    process.exit(1);
  }

  const result = await res.json();
  console.log(`[SEED-HM50] ☑ Seeded ${result.length} HM thanh cong`);
}

main().catch(err => {
  console.error('[SEED-HM50] Fatal:', err.message);
  process.exit(1);
});
