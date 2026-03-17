/**
 * seed-emails.js — Seed email cho 52 chỉ đạo (chạy 1 lần)
 *
 * Mục tiêu:
 *   A. Map t1_email từ bảng staff (tra cứu 3 tầng: alias → ILIKE → department)
 *   B. Set bod_hosting_email cho toàn bộ directives
 *
 * Usage:
 *   node seed-emails.js --dry-run    # Preview, không update
 *   node seed-emails.js              # Update thật vào Supabase
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { createClient } = require('@supabase/supabase-js');

// ===== CONFIG =====

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[SEED-EMAIL] Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env');
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

const DRY_RUN = process.argv.includes('--dry-run');
const MODULE = '[SEED-EMAIL]';

// ===== ALIAS TABLE =====
// Tên ngắn / biệt danh → Tên đầy đủ trong bảng staff
const ALIASES = {
  'Thầy': 'Lê Long Sơn',
  'Sếp': 'Lê Long Sơn',
  'TGĐ': 'Lê Long Sơn',
  'Sếp Tuấn': 'Lê Anh Tuấn',
  'Tuấn': 'Lê Anh Tuấn',
  'Cô Nhiên': 'Nguyễn Thị Nhiên',
  'Nhiên': 'Nguyễn Thị Nhiên',
  'Thầy Nam': 'Võ Nam',
  'Cô Anh Thư': 'Huỳnh Thị Anh Thư',
  'Anh Thư': 'Huỳnh Thị Anh Thư',
  'Thầy Huy': 'Phạm Đăng Huy',
  'Cô Xuân': 'Lê Thị Xuân',
  'Dũng': 'Đặng Tiến Dũng',
  'Hiếu': 'Bùi Thị Thanh Hiếu',
  'Lan Vy': 'Nguyễn Ngọc Lan Vy',
  'Ngọc Hân': 'Nguyễn Ngọc Hân',
  'Như Trang': 'Nguyễn Như Trang',
  'Anh Minh': 'Trần Anh Minh',
  // Department aliases → tra cứu trưởng bộ phận
  'Đối ngoại': 'Ban Đối Ngoại',
  'MSA': 'MSA',
  'ONETEAM': 'ONETEAM',
  'KAIZEN': 'KAIZEN',
};

// Alias là department (cần lookup manager thay vì nhân viên)
const DEPARTMENT_ALIASES = new Set(['Đối ngoại', 'MSA', 'ONETEAM', 'KAIZEN', 'Ban Đối Ngoại']);

// ===== MAIN =====

async function run() {
  console.log(`${MODULE} Bắt đầu seed email...`);
  if (DRY_RUN) console.log(`${MODULE} Chế độ DRY-RUN — không update Supabase`);

  // 1. Load toàn bộ staff (366 records)
  const { data: staffList, error: staffErr } = await db
    .from('staff')
    .select('id, name, email, department, is_manager');

  if (staffErr) {
    console.error(`${MODULE} Lỗi query staff:`, staffErr.message);
    process.exit(1);
  }

  console.log(`${MODULE} Loaded ${staffList.length} nhân sự từ bảng staff`);

  // 2. Query directives cần seed
  const { data: directives, error: dirErr } = await db
    .from('directives')
    .select('id, directive_code, t1_dau_moi, t1_email, bod_hosting_email, meeting_source');

  if (dirErr) {
    console.error(`${MODULE} Lỗi query directives:`, dirErr.message);
    process.exit(1);
  }

  console.log(`${MODULE} Tổng cộng ${directives.length} chỉ đạo`);

  // ===== PART A: Map t1_email =====
  console.log(`\n${MODULE} === PART A: Map t1_email ===`);

  const needEmail = directives.filter((d) => !d.t1_email);
  console.log(`${MODULE} Cần map email: ${needEmail.length}/${directives.length}`);

  const resultA = { total: needEmail.length, mapped: 0, failed: 0, details: [] };

  for (const d of needEmail) {
    const rawName = (d.t1_dau_moi || '').trim();
    if (!rawName) {
      resultA.failed++;
      resultA.details.push({ code: d.directive_code, name: rawName, status: 'SKIP — t1_dau_moi trống' });
      continue;
    }

    // Tách nhiều người: "Dũng, Hiếu" → ["Dũng", "Hiếu"]
    const names = rawName.split(/[,;\/]+/).map((n) => n.trim()).filter(Boolean);

    // Lấy email người đầu tiên tìm được
    let foundEmail = null;
    let matchedName = null;

    for (const name of names) {
      const email = resolveEmail(name, staffList);
      if (email) {
        foundEmail = email;
        matchedName = name;
        break;
      }
    }

    if (foundEmail) {
      resultA.mapped++;
      resultA.details.push({
        code: d.directive_code,
        name: rawName,
        matched: matchedName,
        email: foundEmail,
        status: 'OK',
      });

      if (!DRY_RUN) {
        const { error: upErr } = await db
          .from('directives')
          .update({ t1_email: foundEmail })
          .eq('id', d.id);
        if (upErr) console.error(`${MODULE} Lỗi update ${d.directive_code}:`, upErr.message);
      }
    } else {
      resultA.failed++;
      resultA.details.push({
        code: d.directive_code,
        name: rawName,
        status: 'FAIL — không tìm thấy trong staff',
      });
    }
  }

  // Log Part A
  console.log(`${MODULE} Kết quả Part A: mapped=${resultA.mapped}, failed=${resultA.failed}`);
  console.log(`${MODULE} Chi tiết:`);
  for (const d of resultA.details) {
    const icon = d.status === 'OK' ? '✅' : '❌';
    const emailInfo = d.email ? ` → ${d.email}` : '';
    console.log(`  ${icon} ${d.code}: "${d.name}"${emailInfo} [${d.status}]`);
  }

  // ===== PART B: Set bod_hosting_email =====
  console.log(`\n${MODULE} === PART B: Set bod_hosting_email ===`);

  // Tìm email Lê Anh Tuấn (PTGĐốc — chủ trì tất cả BOD)
  const bodHostingStaff = staffList.find((s) =>
    s.name && s.name.toLowerCase().includes('lê anh tuấn')
  );

  if (!bodHostingStaff || !bodHostingStaff.email) {
    console.error(`${MODULE} Không tìm thấy email Lê Anh Tuấn trong staff!`);
    console.log(`${MODULE} Thử tìm gần đúng...`);
    const candidates = staffList.filter((s) => s.name && s.name.toLowerCase().includes('tuấn'));
    for (const c of candidates) {
      console.log(`  - ${c.name} (${c.email || 'no email'}) [${c.department}]`);
    }
  } else {
    console.log(`${MODULE} BOD Hosting: ${bodHostingStaff.name} → ${bodHostingStaff.email}`);
  }

  const bodHostingEmail = bodHostingStaff?.email || null;

  // Tìm email TGĐ (Lê Long Sơn) — cho trường hợp ngoại lệ
  const tgdStaff = staffList.find((s) =>
    s.name && s.name.toLowerCase().includes('lê long sơn')
  );
  const tgdEmail = tgdStaff?.email || null;
  if (tgdStaff) {
    console.log(`${MODULE} TGĐ: ${tgdStaff.name} → ${tgdEmail}`);
  }

  const needBodEmail = directives.filter((d) => !d.bod_hosting_email);
  console.log(`${MODULE} Cần set bod_hosting_email: ${needBodEmail.length}/${directives.length}`);

  let bodMapped = 0;
  for (const d of needBodEmail) {
    // Ngoại lệ: nếu t1_dau_moi là TGĐ → bod_hosting_email = email TGĐ
    const isTgd = isTgdDirective(d.t1_dau_moi);
    const email = isTgd && tgdEmail ? tgdEmail : bodHostingEmail;

    if (email) {
      bodMapped++;
      if (!DRY_RUN) {
        const { error: upErr } = await db
          .from('directives')
          .update({ bod_hosting_email: email })
          .eq('id', d.id);
        if (upErr) console.error(`${MODULE} Lỗi update bod_hosting_email ${d.directive_code}:`, upErr.message);
      }
    }
  }

  console.log(`${MODULE} bod_hosting_email mapped: ${bodMapped}/${needBodEmail.length}`);

  // ===== TỔNG KẾT =====
  console.log(`\n${MODULE} ========== TỔNG KẾT ==========`);
  console.log(`  t1_email:          ${resultA.mapped}/${resultA.total} mapped (${resultA.failed} failed)`);
  console.log(`  bod_hosting_email: ${bodMapped}/${needBodEmail.length} mapped`);
  console.log(`  Mode:              ${DRY_RUN ? 'DRY-RUN (không ghi DB)' : 'LIVE (đã ghi DB)'}`);

  return { partA: resultA, partB: { mapped: bodMapped, total: needBodEmail.length } };
}

// ===== RESOLVE EMAIL =====

/**
 * Tra cứu email cho 1 tên, theo 3 tầng:
 *   1. Alias table → tên đầy đủ → tìm trong staff
 *   2. ILIKE match trực tiếp trên staff.name
 *   3. Department fallback → email trưởng bộ phận
 */
function resolveEmail(name, staffList) {
  const trimmed = name.trim();
  if (!trimmed) return null;

  // Tầng 1: Alias table
  if (ALIASES[trimmed]) {
    const fullName = ALIASES[trimmed];

    // Nếu alias trỏ đến department → tìm manager
    if (DEPARTMENT_ALIASES.has(trimmed) || DEPARTMENT_ALIASES.has(fullName)) {
      const deptName = fullName;
      return findManagerByDepartment(deptName, staffList);
    }

    // Alias trỏ đến tên người → tìm trong staff
    const staff = findStaffByName(fullName, staffList);
    if (staff?.email) return staff.email;
  }

  // Tầng 2: ILIKE match trực tiếp
  const directMatch = findStaffByName(trimmed, staffList);
  if (directMatch?.email) return directMatch.email;

  // Tầng 3: Department fallback (nếu tên trùng tên bộ phận)
  const deptMatch = findManagerByDepartment(trimmed, staffList);
  if (deptMatch) return deptMatch;

  return null;
}

/**
 * Tìm nhân viên theo tên (ILIKE '%name%')
 * Ưu tiên is_manager = true nếu nhiều kết quả
 */
function findStaffByName(name, staffList) {
  const lower = name.toLowerCase();
  const matches = staffList.filter(
    (s) => s.name && s.name.toLowerCase().includes(lower) && s.email
  );

  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0];

  // Nhiều kết quả → ưu tiên manager
  const manager = matches.find((s) => s.is_manager);
  if (manager) return manager;

  // Ưu tiên match chính xác hơn (tên ngắn hơn = khớp hơn)
  matches.sort((a, b) => a.name.length - b.name.length);
  return matches[0];
}

/**
 * Tìm email trưởng bộ phận (is_manager = true trong department)
 */
function findManagerByDepartment(deptName, staffList) {
  const lower = deptName.toLowerCase();
  const manager = staffList.find(
    (s) =>
      s.is_manager &&
      s.email &&
      s.department &&
      s.department.toLowerCase().includes(lower)
  );
  return manager?.email || null;
}

/**
 * Kiểm tra t1_dau_moi có phải TGĐ không
 */
function isTgdDirective(t1_dau_moi) {
  if (!t1_dau_moi) return false;
  const lower = t1_dau_moi.toLowerCase();
  return (
    lower.includes('lê long sơn') ||
    lower === 'thầy' ||
    lower === 'sếp' ||
    lower === 'tgđ'
  );
}

// ===== EXECUTE =====

run()
  .then(() => {
    console.log(`\n${MODULE} Hoàn tất.`);
    process.exit(0);
  })
  .catch((err) => {
    console.error(`${MODULE} Lỗi nghiêm trọng:`, err);
    process.exit(1);
  });
