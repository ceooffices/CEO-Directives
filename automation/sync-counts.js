require('dotenv').config({ path: '/Users/esuhai/ceo-directives/CEO-Directives-github/automation/.env' });

function supabaseHeaders() {
  return {
    apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
}

async function run() {
  try {
    // 1. Fetch all directives
    const res1 = await fetch(`${process.env.SUPABASE_URL}/rest/v1/directives?select=*`, { headers: supabaseHeaders() });
    const allDirs = await res1.json();
    
    // Group by hm50_id
    const counts = {};
    for (const d of allDirs) {
      if (d.hm50_id) {
        counts[d.hm50_id] = (counts[d.hm50_id] || 0) + 1;
      }
    }
    
    // 2. Fetch all HM50
    const res2 = await fetch(`${process.env.SUPABASE_URL}/rest/v1/hm50?select=id,hm_number,ten,directive_count`, { headers: supabaseHeaders() });
    const allHm50 = await res2.json();
    
    // 3. Update HM50 directive_count
    for (const h of allHm50) {
      const actualCount = counts[h.id] || 0;
      if (h.directive_count !== actualCount) {
        console.log(`Fixing HM-${h.hm_number}: directive_count ${h.directive_count} -> ${actualCount}`);
        await fetch(`${process.env.SUPABASE_URL}/rest/v1/hm50?id=eq.${h.id}`, {
          method: 'PATCH',
          headers: supabaseHeaders(),
          body: JSON.stringify({ directive_count: actualCount })
        });
      }
    }
    console.log("✅ Recalculated and sync'd HM50 directive_count cache!");
  } catch(e) {
    console.error(e);
  }
}
run();
