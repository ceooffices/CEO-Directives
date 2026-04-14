require('dotenv').config({ path: '/Users/esuhai/ceo-directives/CEO-Directives-github/automation/.env' });
const { getStaffEmail, ALWAYS_CC } = require('./lib/supabase-client');

const MANAGER_MAP = {
  'masuda@esuhai.com': 'satomura@esuhai.com',
  'thanh hiếu': 'dungdt@esuhai.com',
  'thiện tín': 'dungdt@esuhai.com',
  // will leave others empty to see what defaults
};

async function previewEmails() {
  const { createClient } = require('@supabase/supabase-js');
  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Get recently inserted directives
  const { data: rows } = await db.from('directives')
    .select('directive_code, t1_dau_moi, t1_email, t2_nhiem_vu')
    .ilike('directive_code', 'DR-20260413-%')
    .order('directive_code', { ascending: true });

  console.log('| Mã Chỉ Đạo | Đầu Mối | Email TO | Email CC (Trưởng phòng + BOD) |');
  console.log('| :--- | :--- | :--- | :--- |');

  for (const row of rows) {
    let emailTO = row.t1_email || await getStaffEmail(row.t1_dau_moi);
    if (!emailTO) emailTO = `[KHÔNG TÌM THẤY: ${row.t1_dau_moi}]`;

    // Calculate CC
    const ccSet = new Set(ALWAYS_CC);
    const loweredTO = emailTO.toLowerCase();
    const loweredName = (row.t1_dau_moi || '').toLowerCase();

    // Map manager
    let manager = null;
    if (MANAGER_MAP[loweredTO]) manager = MANAGER_MAP[loweredTO];
    else {
      for (const [k, v] of Object.entries(MANAGER_MAP)) {
        if (loweredName.includes(k)) {
          manager = v; break;
        }
      }
    }

    if (manager && manager !== loweredTO) {
      ccSet.add(manager);
    }
    
    // special rule Dũng là trưởng phòng
    if (loweredTO === 'dungdt@esuhai.com') {
      // no need to cc manager
    }

    ccSet.delete(loweredTO); // don't CC the TO person
    const ccList = Array.from(ccSet).join(', ');

    console.log(`| ${row.directive_code} | ${row.t1_dau_moi} | ${emailTO} | ${ccList} |`);
  }
}
previewEmails();
