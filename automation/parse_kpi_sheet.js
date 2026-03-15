// Parse Google Sheet CSV to extract KPI data per employee
const https = require('https');
const fs = require('fs');
const path = require('path');

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1NFPOYsbh_5J3K4f88M3nxH9PhgZVCxzNfxddK7hJg50/export?format=csv';
const OUTPUT_DIR = path.join(__dirname, '..', 'data');

function downloadCSV() {
  return new Promise((resolve, reject) => {
    const follow = (url) => {
      const mod = url.startsWith('https') ? https : require('http');
      mod.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          follow(res.headers.location);
          return;
        }
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
        res.on('error', reject);
      }).on('error', reject);
    };
    follow(SHEET_URL);
  });
}

function parseCSV(text) {
  const rows = [];
  let current = [];
  let field = '';
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') { field += '"'; i++; }
        else { inQuotes = false; }
      } else { field += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { current.push(field.trim()); field = ''; }
      else if (ch === '\n' || (ch === '\r' && text[i + 1] === '\n')) {
        current.push(field.trim());
        if (current.length > 5) rows.push(current);
        current = []; field = '';
        if (ch === '\r') i++;
      } else { field += ch; }
    }
  }
  if (field || current.length > 0) {
    current.push(field.trim());
    if (current.length > 5) rows.push(current);
  }
  return rows;
}

async function main() {
  console.log('Downloading Google Sheet...');
  const csv = await downloadCSV();
  console.log(`CSV size: ${csv.length} bytes`);
  
  const rows = parseCSV(csv);
  console.log(`Total rows: ${rows.length} (first is header)`);
  
  const header = rows[0];
  console.log(`Columns: ${header.length}`);
  
  const findCol = (partial) => header.findIndex(h => h.includes(partial));
  
  const COL_NAME = findCol('Họ và tên');
  const COL_DEPT = findCol('Phòng ban');
  const COL_ROLE = findCol('Chức danh');
  const COL_MANAGER = findCol('Quản lý trực tiếp');
  const COL_MT1_GOAL = findCol('MT1 — Mục tiêu quan trọng');
  const COL_MT1_NUM = findCol('MT1 — Con số');
  const COL_MT1_HM = findCol('MT1 — Liên kết');
  const COL_MT2_GOAL = findCol('MT2 — Mục tiêu');
  const COL_MT2_NUM = findCol('MT2 — Con số');
  const COL_MT2_HM = findCol('MT2 — Liên kết');
  const COL_MT3_GOAL = findCol('MT3 — Mục tiêu');
  const COL_MT3_NUM = findCol('MT3 — Con số');
  const COL_MT3_HM = findCol('MT3 — Liên kết');
  const COL_COMMIT_NUM = findCol('Con số cam kết');
  const COL_COMMIT_TARGET = findCol('Đóng góp vào mục tiêu');
  
  console.log('\n=== Column Mapping ===');
  console.log('Name:', COL_NAME, 'Dept:', COL_DEPT);
  console.log('Commit Num:', COL_COMMIT_NUM, 'Target:', COL_COMMIT_TARGET);
  
  const employees = [];
  const deptStats = {};
  const hmStats = {};
  let totalCommit3333 = 0, totalCommit2222 = 0, totalCommitBoth = 0, totalCommitOther = 0;
  
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const name = r[COL_NAME] || '';
    if (!name) continue;
    
    const dept = r[COL_DEPT] || '';
    const role = r[COL_ROLE] || '';
    const manager = r[COL_MANAGER] || '';
    const commitNum = parseInt(r[COL_COMMIT_NUM]) || 0;
    const commitTarget = r[COL_COMMIT_TARGET] || '';
    
    const is3333 = commitTarget.includes('3333') || commitTarget.includes('Tuyển sinh') || commitTarget.includes('chiêu sinh') || commitTarget.includes('Chiêu sinh');
    const is2222 = commitTarget.includes('2222') || commitTarget.includes('Xuất cảnh') || commitTarget.includes('出国');
    const isBoth = commitTarget.includes('Cả hai') || commitTarget.includes('両方');
    
    if (is3333) totalCommit3333 += commitNum;
    else if (is2222) totalCommit2222 += commitNum;
    else if (isBoth) totalCommitBoth += commitNum;
    else totalCommitOther += commitNum;
    
    if (!deptStats[dept]) deptStats[dept] = { count: 0, commit3333: 0, commit2222: 0, commitBoth: 0, commitOther: 0, total: 0 };
    deptStats[dept].count++;
    deptStats[dept].total += commitNum;
    if (is3333) deptStats[dept].commit3333 += commitNum;
    else if (is2222) deptStats[dept].commit2222 += commitNum;
    else if (isBoth) deptStats[dept].commitBoth += commitNum;
    else deptStats[dept].commitOther += commitNum;
    
    [COL_MT1_HM, COL_MT2_HM, COL_MT3_HM].forEach(col => {
      if (col >= 0) {
        const hm = r[col] || '';
        if (hm) {
          if (!hmStats[hm]) hmStats[hm] = 0;
          hmStats[hm]++;
        }
      }
    });
    
    employees.push({ name, dept, role, manager, commitNum, commitTarget });
  }
  
  console.log(`\n========== TỔNG KẾT ==========`);
  console.log(`Tổng nhân viên: ${employees.length}`);
  console.log(`Cam kết 3333 (Tuyển sinh): ${totalCommit3333}`);
  console.log(`Cam kết 2222 (Xuất cảnh): ${totalCommit2222}`);
  console.log(`Cam kết Cả hai: ${totalCommitBoth}`);
  console.log(`Cam kết khác/gián tiếp: ${totalCommitOther}`);
  console.log(`TỔNG: ${totalCommit3333 + totalCommit2222 + totalCommitBoth + totalCommitOther}`);
  
  console.log(`\n========== PHÒNG BAN ==========`);
  Object.entries(deptStats)
    .sort((a, b) => b[1].count - a[1].count)
    .forEach(([dept, s]) => {
      console.log(`${dept}: ${s.count} NV, tổng=${s.total} (3333:${s.commit3333}, 2222:${s.commit2222}, Cả hai:${s.commitBoth}, Khác:${s.commitOther})`);
    });
  
  console.log(`\n========== HM LINKED ==========`);
  Object.entries(hmStats).sort((a, b) => b[1] - a[1]).slice(0, 15)
    .forEach(([hm, count]) => console.log(`  ${hm}: ${count}x`));
  
  // Save summary
  const summary = {
    source: 'Google Sheet - Thư cam kết cá nhân 2026',
    last_updated: new Date().toISOString(),
    total_employees: employees.length,
    kpi_summary: {
      commit_3333_tuyen_sinh: totalCommit3333,
      commit_2222_xuat_canh: totalCommit2222,
      commit_both: totalCommitBoth,
      commit_other: totalCommitOther,
      grand_total: totalCommit3333 + totalCommit2222 + totalCommitBoth + totalCommitOther
    },
    departments: deptStats,
    hm_linkage: hmStats,
    employees: employees.map(e => ({
      name: e.name, dept: e.dept, role: e.role, commit: e.commitNum, target: e.commitTarget
    }))
  };
  
  const outPath = path.join(OUTPUT_DIR, 'employee_kpi.json');
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2));
  console.log(`\nSaved to ${outPath}`);
}

main().catch(console.error);
