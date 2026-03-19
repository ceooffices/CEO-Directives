/**
 * openclaw-bridge.js
 * CEO Directive Automation — OpenClaw Bridge
 * 
 * HTTP server nhận lệnh từ OpenClaw gateway hoặc Telegram bot
 * → Dispatch WF1-6, hm50-linker, status queries
 * 
 * Usage:
 *   node openclaw-bridge.js              # Start bridge on port 3100
 *   node openclaw-bridge.js --port 3200  # Custom port
 */

require('dotenv').config();
const http = require('http');
const { URL } = require('url');

// ===== CONFIG =====
const PORT = parseInt(process.argv.find((a, i, arr) => arr[i - 1] === '--port') || process.env.PORT_BRIDGE || '3101');
const AUTH_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || 'ceo-directives-r8d-2026-esuhai-secure-token';

// ===== LAZY-LOAD WORKFLOWS =====
const workflows = {
  wf1: () => require('./wf1-approval').run,
  wf2: () => require('./wf2-directive-progress').run,
  wf3: () => require('./wf3-directive-status').run,
  wf4: () => require('./wf4-directive-escalation').run,
  wf5: () => require('./wf5-reminders').run,
  wf6: () => require('./wf6-dashboard-sync').run,
  hm50: () => require('./hm50-linker').run,
};

// ===== SUPABASE DATA QUERIES =====
async function getStatus() {
  const {
    queryPendingApproval, queryConfirmed5T,
    queryOverdueDirectives, queryActiveDirectives
  } = require('./lib/supabase-client');

  const [pending, confirmed, overdue, active] = await Promise.all([
    queryPendingApproval().then(p => p.length).catch(() => '?'),
    queryConfirmed5T().then(p => p.length).catch(() => '?'),
    queryOverdueDirectives().then(p => p.length).catch(() => '?'),
    queryActiveDirectives().then(p => p.length).catch(() => '?'),
  ]);

  return {
    timestamp: new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
    directives: {
      pending_approval: pending,
      confirmed_5t: confirmed,
      overdue: overdue,
      active: active,
    },
    workflows: Object.keys(workflows),
    uptime: process.uptime(),
  };
}

// ===== OVERDUE LIST =====
async function getOverdueList(limit = 5) {
  const { queryOverdueDirectives } = require('./lib/supabase-client');
  const rows = await queryOverdueDirectives();
  const now = new Date();

  const items = rows
    .map(row => {
      const deadline = row.t4_thoi_han;
      if (!deadline) return null;
      const daysOverdue = Math.ceil((now - new Date(deadline)) / (1000 * 60 * 60 * 24));
      if (daysOverdue < 1) return null;
      return {
        title: row.t2_nhiem_vu || row.directive_code || 'Không tên',
        deadline,
        dauMoi: row.t1_dau_moi || 'N/A',
        daysOverdue,
        url: null,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.daysOverdue - a.daysOverdue)
    .slice(0, limit);

  return { count: items.length, total: rows.length, items };
}

// ===== SEARCH =====
async function searchDirectives(keyword) {
  const { queryActiveDirectives } = require('./lib/supabase-client');
  const rows = await queryActiveDirectives();
  const kw = keyword.toLowerCase();

  return rows
    .filter(row => {
      const nhiemVu = (row.t2_nhiem_vu || '').toLowerCase();
      const dauMoi = (row.t1_dau_moi || '').toLowerCase();
      const code = (row.directive_code || '').toLowerCase();
      return nhiemVu.includes(kw) || dauMoi.includes(kw) || code.includes(kw);
    })
    .slice(0, 10)
    .map(row => ({
      title: row.t2_nhiem_vu || row.directive_code || '',
      status: row.tinh_trang || '',
      url: null,
    }));
}

// ===== HTTP HANDLER =====
async function handleRequest(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;
  const method = req.method;

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  // Health check (no auth)
  if (path === '/health') {
    return json(res, 200, { status: 'ok', uptime: process.uptime() });
  }

  // Auth check
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
  if (token !== AUTH_TOKEN) {
    return json(res, 401, { error: 'Unauthorized' });
  }

  try {
    // GET /status
    if (path === '/status' && method === 'GET') {
      const status = await getStatus();
      return json(res, 200, status);
    }

    // GET /overdue?limit=5
    if (path === '/overdue' && method === 'GET') {
      const limit = parseInt(url.searchParams.get('limit') || '5');
      const result = await getOverdueList(limit);
      return json(res, 200, result);
    }

    // GET /search?q=keyword
    if (path === '/search' && method === 'GET') {
      const q = url.searchParams.get('q') || '';
      if (!q) return json(res, 400, { error: 'Missing ?q= parameter' });
      const results = await searchDirectives(q);
      return json(res, 200, { query: q, count: results.length, results });
    }

    // POST /run/:workflow
    const runMatch = path.match(/^\/run\/(\w+)$/);
    if (runMatch && method === 'POST') {
      const wfName = runMatch[1];

      // Run all
      if (wfName === 'all') {
        const results = {};
        for (const [name, loader] of Object.entries(workflows)) {
          try {
            results[name] = await loader()();
          } catch (err) {
            results[name] = { error: err.message };
          }
        }
        return json(res, 200, { ran: 'all', results });
      }

      // Run single
      if (!workflows[wfName]) {
        return json(res, 404, { error: `Unknown workflow: ${wfName}`, available: Object.keys(workflows) });
      }

      console.log(`[BRIDGE] Running ${wfName}...`);
      const result = await workflows[wfName]()();
      console.log(`[BRIDGE] ${wfName} completed:`, JSON.stringify(result));
      return json(res, 200, { ran: wfName, result });
    }

    // Not found
    return json(res, 404, {
      error: 'Not found',
      endpoints: [
        'GET  /health',
        'GET  /status',
        'GET  /overdue?limit=5',
        'GET  /search?q=keyword',
        'POST /run/:workflow (wf1-wf6, hm50, all)',
      ],
    });
  } catch (err) {
    console.error('[BRIDGE] Error:', err);
    return json(res, 500, { error: err.message });
  }
}

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data, null, 2));
}

// ===== START =====
const server = http.createServer(handleRequest);
server.listen(PORT, () => {
  console.log('==========================================');
  console.log(`[BRIDGE] CEO Directive Bridge — port ${PORT}`);
  console.log(`[BRIDGE] ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`);
  console.log('[BRIDGE] Endpoints:');
  console.log('  GET  /health');
  console.log('  GET  /status');
  console.log('  GET  /overdue?limit=5');
  console.log('  GET  /search?q=keyword');
  console.log('  POST /run/:workflow');
  console.log('==========================================');
});
