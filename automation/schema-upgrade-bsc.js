/**
 * schema-upgrade-bsc.js
 * Phase 1: Thêm properties BSC Tracking vào Notion databases
 *
 * Chạy 1 lần duy nhất để upgrade schema:
 *   node schema-upgrade-bsc.js              # LIVE
 *   node schema-upgrade-bsc.js --dry-run    # Preview only
 *
 * Properties mới KHÔNG ảnh hưởng data cũ.
 */

const { notion, DB } = require('./lib/notion-client');

const DRY_RUN = process.argv.includes('--dry-run');

// ===== PHASE 1.1: Thêm properties vào HM50 =====

const HM50_NEW_PROPERTIES = {
  BSC_Perspective: {
    select: {
      options: [
        { name: 'Tài chính', color: 'green' },
        { name: 'Khách hàng', color: 'blue' },
        { name: 'Quy trình nội bộ', color: 'orange' },
        { name: 'Học tập & Phát triển', color: 'purple' },
      ],
    },
  },
  Strategic_Goal: {
    rich_text: {},
  },
  Directive_Count: {
    number: { format: 'number' },
  },
  Completion_Rate: {
    number: { format: 'percent' },
  },
  LELONGSON_Stage: {
    select: {
      options: [
        { name: 'Chưa gửi', color: 'default' },
        { name: 'Đã gửi đề xuất', color: 'blue' },
        { name: 'ChatLong phản hồi', color: 'yellow' },
        { name: 'Đang nâng cấp', color: 'orange' },
        { name: 'Đã duyệt', color: 'green' },
        { name: 'Hoàn thành', color: 'pink' },
      ],
    },
  },
};

// ===== PHASE 1.2: Thêm properties vào CLARIFICATION =====

const CLARIFICATION_NEW_PROPERTIES = {
  Directive_Type: {
    select: {
      options: [
        { name: 'Mới phát sinh', color: 'blue' },
        { name: 'Leo thang từ HM', color: 'orange' },
        { name: 'Bổ sung/điều chỉnh', color: 'yellow' },
      ],
    },
  },
  HM50_Link: {
    relation: {
      database_id: DB.HM50,
      type: 'dual_property',
      dual_property: {},
    },
  },
  WHY_Context: {
    rich_text: {},
  },
  Meeting_Source: {
    relation: {
      database_id: DB.BOD_MEETINGS,
      type: 'dual_property',
      dual_property: {},
    },
  },
};

// ===== UPGRADE FUNCTIONS =====

async function upgradeDatabase(dbId, dbName, newProperties) {
  console.log(`\n[SCHEMA] Upgrading "${dbName}" (${dbId})...`);

  if (!dbId) {
    console.error(`  ❌ Database ID không tồn tại cho ${dbName}. Kiểm tra .env`);
    return false;
  }

  // Đọc schema hiện tại để check trùng
  const existing = await notion.databases.retrieve({ database_id: dbId });
  const existingProps = Object.keys(existing.properties);

  const propsToAdd = {};
  let skipped = 0;

  for (const [name, config] of Object.entries(newProperties)) {
    if (existingProps.includes(name)) {
      console.log(`  ⏩ "${name}" — đã tồn tại, bỏ qua`);
      skipped++;
    } else {
      propsToAdd[name] = config;
      console.log(`  ➕ "${name}" — sẽ thêm (${Object.keys(config)[0]})`);
    }
  }

  if (Object.keys(propsToAdd).length === 0) {
    console.log(`  ☑ Không có property mới cần thêm (${skipped} đã tồn tại)`);
    return true;
  }

  if (DRY_RUN) {
    console.log(`  🏜️ DRY-RUN: Sẽ thêm ${Object.keys(propsToAdd).length} properties`);
    return true;
  }

  await notion.databases.update({
    database_id: dbId,
    properties: propsToAdd,
  });

  console.log(`  ☑ Đã thêm ${Object.keys(propsToAdd).length} properties thành công`);
  return true;
}

async function verifySchema(dbId, dbName, expectedProps) {
  console.log(`\n[VERIFY] Kiểm tra schema "${dbName}"...`);
  const db = await notion.databases.retrieve({ database_id: dbId });
  const props = Object.keys(db.properties);

  let allGood = true;
  for (const name of Object.keys(expectedProps)) {
    if (props.includes(name)) {
      console.log(`  ☑ "${name}" — OK`);
    } else {
      console.log(`  ✖ "${name}" — MISSING`);
      allGood = false;
    }
  }
  return allGood;
}

// ===== MAIN =====

async function run() {
  console.log('==========================================');
  console.log('[SCHEMA] BSC Strategic Tracking — Schema Upgrade');
  console.log(`[SCHEMA] Mode: ${DRY_RUN ? '🏜️ DRY-RUN' : '⚡ LIVE'}`);
  console.log('==========================================');

  // Phase 1.1: HM50
  const hm50Ok = await upgradeDatabase(DB.HM50, '50 Chỉ đạo 5T (HM50)', HM50_NEW_PROPERTIES);

  // Phase 1.2: CLARIFICATION
  const clarOk = await upgradeDatabase(DB.CLARIFICATION, 'Chỉ đạo Cần Làm Rõ', CLARIFICATION_NEW_PROPERTIES);

  // Verify
  if (!DRY_RUN) {
    console.log('\n==========================================');
    console.log('[SCHEMA] VERIFICATION');
    console.log('==========================================');

    if (hm50Ok) await verifySchema(DB.HM50, 'HM50', HM50_NEW_PROPERTIES);
    if (clarOk) await verifySchema(DB.CLARIFICATION, 'CLARIFICATION', CLARIFICATION_NEW_PROPERTIES);
  }

  console.log('\n==========================================');
  console.log('[SCHEMA] DONE');
  console.log(`  HM50: ${hm50Ok ? '☑' : '✖'}`);
  console.log(`  CLARIFICATION: ${clarOk ? '☑' : '✖'}`);
  console.log('==========================================');
}

if (require.main === module) {
  run().catch(err => {
    console.error('❌ FATAL:', err.message || err);
    process.exit(1);
  });
}

module.exports = { run };
