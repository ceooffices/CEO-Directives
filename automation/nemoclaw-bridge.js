/**
 * nemoclaw-bridge.js
 * CEO Directive Automation — NemoClaw Bridge
 * 
 * HTTP server nhận lệnh từ NemoClaw gateway hoặc Telegram bot
 * → Dispatch WF1-6, hm50-linker, status queries
 * 
 * Usage:
 *   node nemoclaw-bridge.js              # Start bridge on port 3100
 *   node nemoclaw-bridge.js --port 3200  # Custom port
 */

require('dotenv').config();
const http = require('http');
const { URL } = require('url');

// ===== CONFIG =====
const PORT = parseInt(process.argv.find((a, i, arr) => arr[i - 1] === '--port') || process.env.PORT_BRIDGE || '3101');
const AUTH_TOKEN = process.env.NEMOCLAW_GATEWAY_TOKEN;
if (!AUTH_TOKEN) {
  console.error('[BRIDGE] ❌ NEMOCLAW_GATEWAY_TOKEN chưa cấu hình trong .env');
  process.exit(1);
}

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
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

async function handleRequest(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;
  const method = req.method;

  // CORS — restrict to dashboard
  const allowedOrigin = process.env.DASHBOARD_URL || 'https://ceodirectives.vercel.app';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
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

    // GET /scheduler/status — AI Scheduler state
    if (path === '/scheduler/status' && method === 'GET') {
      try {
        const { loadState } = require('./lib/scheduler-state');
        const state = loadState();
        return json(res, 200, {
          lastCheck: state.timestamp,
          counts: state.counts,
          lastWfRuns: state.lastWfRuns || {},
          nextCheckMinutes: state.nextCheckMinutes || 30,
        });
      } catch (err) {
        return json(res, 200, { status: 'not_initialized', message: 'AI Scheduler chưa chạy lần nào' });
      }
    }

    // POST /scheduler/force-check — Trigger AI checkpoint ngay
    if (path === '/scheduler/force-check' && method === 'POST') {
      try {
        const { runCheckpoint } = require('./ai-scheduler');
        console.log('[BRIDGE] Force AI checkpoint...');
        const result = await runCheckpoint();
        return json(res, 200, {
          status: 'ok',
          decision: result.decision,
          executionResults: result.executionResults,
          tokensUsed: result.tokensUsed,
        });
      } catch (err) {
        return json(res, 500, { error: `AI Scheduler error: ${err.message}` });
      }
    }

    // POST /telegram-hook — forward Telegram update to telegram-bot.js webhook
    if (path === '/telegram-hook' && method === 'POST') {
      const body = await readBody(req);
      const hookPort = process.env.PORT_TELEGRAM_HOOK || '3102';
      
      try {
        const result = await new Promise((resolve, reject) => {
          const fwdReq = http.request({
            hostname: 'localhost',
            port: hookPort,
            path: '/telegram-hook',
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${AUTH_TOKEN}`,
              'Content-Type': 'application/json',
            },
          }, (fwdRes) => {
            let data = '';
            fwdRes.on('data', chunk => data += chunk);
            fwdRes.on('end', () => {
              try { resolve(JSON.parse(data)); }
              catch { resolve({ raw: data }); }
            });
          });
          fwdReq.on('error', reject);
          fwdReq.setTimeout(10000, () => { fwdReq.destroy(); reject(new Error('Timeout forwarding to telegram-bot')); });
          fwdReq.write(body);
          fwdReq.end();
        });
        
        return json(res, 200, { forwarded: true, result });
      } catch (err) {
        console.error('[BRIDGE] Failed to forward to telegram-bot:', err.message);
        return json(res, 502, { error: `telegram-bot unreachable: ${err.message}` });
      }
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
        'GET  /scheduler/status',
        'POST /scheduler/force-check',
        'POST /telegram-hook (forward to telegram-bot)',
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
  console.log('  GET  /scheduler/status');
  console.log('  POST /scheduler/force-check');
  console.log(`  POST /telegram-hook → forward to telegram-bot:${process.env.PORT_TELEGRAM_HOOK || '3102'}`);
  console.log('==========================================');
});
