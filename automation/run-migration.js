const fs = require('fs');

async function run() {
  const token = process.env.SUPABASE_PAT || 'sbp_7f5ad56bc5eb2085113b51aa6760e8f79728189b';
  const ref = 'fgiszdvchpknmyfscxnp';
  
  const sql4 = fs.readFileSync('../supabase/migration-004-employee-commitments.sql', 'utf8');
  const sql5 = fs.readFileSync('../supabase/migration-005-flexible-event-types.sql', 'utf8');

  console.log('Running migration...');
  let res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql4 })
  });
  console.log('Result 4:', res.status, await res.text());

  console.log('Running migration-005...');
  res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql5 })
  });
  console.log('Result 5:', res.status, await res.text());
}
run();
