require('dotenv').config({ path: '/Users/esuhai/ceo-directives/CEO-Directives-github/automation/.env' });
const fs = require('fs');

(async () => {
  const headers = { 
    apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, 
    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` 
  };
  
  try {
    const res1 = await fetch(`${process.env.SUPABASE_URL}/rest/v1/hm50?select=id,hm_number,ten`, { headers });
    const hm50 = await res1.json();
    
    const res2 = await fetch(`${process.env.SUPABASE_URL}/rest/v1/directives?select=id,directive_code,t2_nhiem_vu,hm50_id,loai&meeting_source=eq.BOD%202026-04-07`, { headers });
    const dirs = await res2.json();
    
    fs.writeFileSync('/tmp/hm50_map.json', JSON.stringify({ hm50, dirs }, null, 2));
    console.log("Written to /tmp/hm50_map.json");
  } catch(e) {
    console.error(e);
  }
})();
