#!/usr/bin/env node
/**
 * Seed staff vao Supabase tu staff_directory.csv
 * Chay: node supabase/seed-staff.js
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
  console.error('[SEED-STAFF] SUPABASE_URL va SUPABASE_SERVICE_ROLE_KEY can co trong automation/.env');
  process.exit(1);
}

function parseCSV(content) {
  const lines = content.split('\n').filter(l => l.trim());
  const header = lines[0];
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length < 9) continue;

    // CSV columns: #, Ma NV, Ho ten, Email, Phong ban, Zone, Chuc danh, Cong ty, Noi CT, Trang thai, Ngay nop, QUAN LY?
    const staffCode = (cols[1] || '').trim();
    const name = (cols[2] || '').trim();
    const email = (cols[3] || '').trim();
    const department = (cols[4] || '').trim();
    const zone = parseInt(cols[5]) || 0;
    const title = (cols[6] || '').trim();
    const company = (cols[7] || '').trim();
    const location = (cols[8] || '').trim();
    const isManager = (cols[11] || '').trim().toLowerCase().includes('quản lý') ||
                      (cols[11] || '').trim().toLowerCase().includes('quan ly');

    if (!name || name === 'Họ tên') continue; // Skip header row or empty

    rows.push({
      staff_code: staffCode || null,
      name,
      email: email && email.includes('@') ? email : null,
      department: department || null,
      zone,
      title: title || null,
      company: company || null,
      location: location || null,
      is_manager: isManager,
    });
  }

  return rows;
}

async function main() {
  const csvPath = path.join('/Volumes/ESUHAI/Projects/CEO_Office_Hubs/CEO_Offices_Hub_v2_new/data/staff_directory.csv');

  if (!fs.existsSync(csvPath)) {
    console.error(`[SEED-STAFF] Khong tim thay ${csvPath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCSV(content);
  console.log(`[SEED-STAFF] Parsed ${rows.length} nhan vien tu CSV`);

  // Upsert theo batch 50
  const headers = {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'resolution=merge-duplicates,return=representation',
  };

  let totalSeeded = 0;
  const BATCH_SIZE = 50;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    const res = await fetch(`${SUPABASE_URL}/rest/v1/staff?on_conflict=staff_code`, {
      method: 'POST',
      headers,
      body: JSON.stringify(batch),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`[SEED-STAFF] Loi batch ${i}: HTTP ${res.status} — ${err}`);
      continue;
    }

    const result = await res.json();
    totalSeeded += result.length;
    console.log(`[SEED-STAFF] ► Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${result.length} records`);
  }

  console.log(`[SEED-STAFF] ☑ Seeded ${totalSeeded} nhan vien thanh cong`);
}

main().catch(err => {
  console.error('[SEED-STAFF] Fatal:', err.message);
  process.exit(1);
});
