/**
 * control-panel.js
 * CEO Directive System — Control Panel UI
 * 
 * Web UI để quản lý tất cả services:
 *   - Telegram Bot
 *   - Scheduler (WF1-5)
 *   - OpenClaw Bridge
 *   - Dashboard Static Server
 * 
 * Usage: node control-panel.js
 * Open:  http://localhost:9000
 */

require('dotenv').config();
const http = require('http');
const { spawn, execSync } = require('child_process');
const path = require('path');
const { URL } = require('url');

const PORT = parseInt(process.env.PORT_PANEL || '9001');
const AUTO_DIR = __dirname;
const ROOT_DIR = path.resolve(__dirname, '..');

// ===== RESOLVE EXECUTABLES (Windows needs full paths) =====
const NODE_EXE = process.execPath; // full path to node.exe
let PYTHON_EXE = 'python';
try {
  PYTHON_EXE = execSync('where python', { encoding: 'utf8' }).split('\n')[0].trim();
} catch (e) {
  try { PYTHON_EXE = execSync('where python3', { encoding: 'utf8' }).split('\n')[0].trim(); } catch (e2) {}
}

// ===== SERVICE DEFINITIONS =====
const SERVICES = {
  'telegram-bot': {
    name: 'Telegram Bot',
    desc: 'Bot Telegram — CEO commands',
    exe: NODE_EXE,
    args: [path.join(AUTO_DIR, 'telegram-bot.js')],
    cwd: AUTO_DIR,
    healthCheck: null,
    color: '#007aff',
  },
  'scheduler': {
    name: 'Scheduler (WF1-5)',
    desc: '10 cron jobs/day — WF1 to WF5',
    exe: NODE_EXE,
    args: [path.join(AUTO_DIR, 'scheduler.js')],
    cwd: AUTO_DIR,
    healthCheck: null,
    color: '#34c759',
  },
  'bridge': {
    name: 'OpenClaw Bridge',
    desc: `HTTP API gateway — port ${process.env.PORT_BRIDGE || '3101'}`,
    exe: NODE_EXE,
    args: [path.join(AUTO_DIR, 'openclaw-bridge.js')],
    cwd: AUTO_DIR,
    healthCheck: `http://localhost:${process.env.PORT_BRIDGE || '3101'}/health`,
    color: '#ff9500',
  },
  'dashboard': {
    name: 'Dashboard Server',
    desc: `Static file server — port ${process.env.PORT_DASHBOARD || '8081'}`,
    exe: PYTHON_EXE,
    args: ['-m', 'http.server', process.env.PORT_DASHBOARD || '8081', '--bind', '127.0.0.1'],
    cwd: ROOT_DIR,
    healthCheck: `http://127.0.0.1:${process.env.PORT_DASHBOARD || '8081'}/`,
    color: '#af52de',
  },
};
// ===== PROCESS MANAGER =====
const processes = {};
const startTimes = {};
const logs = {};
const MAX_LOG_LINES = 200;

function addLog(id, text) {
  if (!logs[id]) logs[id] = [];
  const lines = text.toString().split('\n').filter(l => l.trim());
  lines.forEach(line => {
    logs[id].push({ time: new Date().toLocaleTimeString('vi-VN'), text: line });
    if (logs[id].length > MAX_LOG_LINES) logs[id].shift();
  });
}

function isAlive(id) {
  const child = processes[id];
  if (!child) return false;
  try {
    process.kill(child.pid, 0); // signal 0 = check if alive
    return true;
  } catch (e) {
    return false;
  }
}

function startService(id) {
  if (isAlive(id)) {
    return { ok: false, msg: 'Already running' };
  }

  const svc = SERVICES[id];
  if (!svc) return { ok: false, msg: 'Service not found' };

  try {
    const child = spawn(svc.exe, svc.args, {
      cwd: svc.cwd,
      env: { ...process.env, FORCE_COLOR: '0' },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
      detached: false,
    });

    child.stdout.on('data', d => addLog(id, d));
    child.stderr.on('data', d => addLog(id, d));
    child.on('close', (code) => {
      addLog(id, `[SYSTEM] Exited (code ${code})`);
      processes[id] = null;
      delete startTimes[id];
    });
    child.on('error', (err) => {
      addLog(id, `[ERROR] ${err.message}`);
      processes[id] = null;
      delete startTimes[id];
    });

    processes[id] = child;
    startTimes[id] = Date.now();
    addLog(id, `[SYSTEM] Started ${svc.name} (PID: ${child.pid})`);
    return { ok: true, msg: `${svc.name} started (PID: ${child.pid})` };
  } catch (err) {
    addLog(id, `[ERROR] ${err.message}`);
    return { ok: false, msg: `Failed: ${err.message}` };
  }
}

function stopService(id) {
  if (!isAlive(id)) {
    processes[id] = null;
    return { ok: false, msg: 'Not running' };
  }
  const child = processes[id];
  try {
    execSync(`taskkill /pid ${child.pid} /f /t`, { stdio: 'ignore' });
  } catch (e) {
    try { child.kill('SIGTERM'); } catch (e2) {}
  }
  processes[id] = null;
  delete startTimes[id];
  addLog(id, `[SYSTEM] Stopped`);
  return { ok: true, msg: 'Stopped' };
}

function restartService(id) {
  stopService(id);
  setTimeout(() => startService(id), 1500);
  return { ok: true, msg: 'Restarting...' };
}

function getServiceStatus(id) {
  const alive = isAlive(id);
  const child = processes[id];
  const uptime = startTimes[id] ? Math.floor((Date.now() - startTimes[id]) / 1000) : 0;
  return {
    id,
    ...SERVICES[id],
    alive,
    pid: child?.pid || null,
    uptime,
    recentLogs: (logs[id] || []).slice(-30),
  };
}

// ===== HEALTH CHECK =====
async function httpHealthCheck(url) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: 3000 }, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 500);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

async function getAllStatus() {
  const statuses = [];
  for (const id of Object.keys(SERVICES)) {
    const status = getServiceStatus(id);
    // If has health check URL and process is alive, also check HTTP
    if (SERVICES[id].healthCheck && status.alive) {
      status.httpOk = await httpHealthCheck(SERVICES[id].healthCheck);
    }
    statuses.push(status);
  }
  return statuses;
}

// ===== HTTP SERVER =====
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const p = url.pathname;

  // CORS — restrict to dashboard
  const allowedOrigin = process.env.DASHBOARD_URL || 'https://ceodirectives.vercel.app';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST');

  // API endpoints
  if (p === '/api/status') {
    const statuses = await getAllStatus();
    return json(res, 200, { services: statuses, time: new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) });
  }

  if (p.startsWith('/api/start/')) {
    const id = p.replace('/api/start/', '');
    return json(res, 200, startService(id));
  }

  if (p.startsWith('/api/stop/')) {
    const id = p.replace('/api/stop/', '');
    return json(res, 200, stopService(id));
  }

  if (p.startsWith('/api/restart/')) {
    const id = p.replace('/api/restart/', '');
    return json(res, 200, restartService(id));
  }

  if (p === '/api/start-all') {
    const results = {};
    for (const id of Object.keys(SERVICES)) {
      results[id] = startService(id);
    }
    return json(res, 200, { results });
  }

  if (p === '/api/stop-all') {
    const results = {};
    for (const id of Object.keys(SERVICES)) {
      results[id] = stopService(id);
    }
    return json(res, 200, { results });
  }

  if (p.startsWith('/api/logs/')) {
    const id = p.replace('/api/logs/', '');
    return json(res, 200, { logs: logs[id] || [] });
  }

  // UI
  if (p === '/' || p === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(getHTML());
  }

  res.writeHead(404);
  res.end('Not found');
});

function json(res, code, data) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

server.listen(PORT, () => {
  console.log('==========================================');
  console.log(`  CEO Control Panel — http://localhost:${PORT}`);
  console.log(`  ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`);
  console.log('==========================================');
});

// ===== HTML UI =====
function getHTML() {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CEO Control Panel</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #f2f2f7; --card: #fff; --text: #1c1c1e; --text2: #636366; --text3: #aeaeb2;
      --border: rgba(0,0,0,0.06); --blue: #007aff; --green: #34c759; --red: #ff3b30;
      --orange: #ff9500; --purple: #af52de;
      --radius: 16px; --radius-sm: 10px;
      --shadow: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06);
      --shadow-lg: 0 4px 14px rgba(0,0,0,0.08);
      --font: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: var(--font); background: var(--bg); color: var(--text); min-height: 100vh; -webkit-font-smoothing: antialiased; }

    .topbar {
      position: sticky; top: 0; z-index: 100;
      display: flex; align-items: center; justify-content: space-between; padding: 14px 20px;
      background: rgba(255,255,255,0.85); backdrop-filter: blur(20px); border-bottom: 0.5px solid var(--border);
    }
    .topbar h1 { font-size: 1.1rem; font-weight: 700; }
    .topbar-time { font-size: 0.75rem; color: var(--text3); }
    .topbar-actions { display: flex; gap: 8px; }
    .topbar-btn {
      background: var(--bg); border: none; border-radius: var(--radius-sm); padding: 8px 14px;
      font-size: 0.78rem; font-weight: 600; cursor: pointer; font-family: var(--font);
      color: var(--text2); transition: all 0.2s;
    }
    .topbar-btn:hover { background: #e8e8ed; }
    .topbar-btn:active { transform: scale(0.96); }
    .topbar-btn.green { background: rgba(52,199,89,0.12); color: var(--green); }
    .topbar-btn.red { background: rgba(255,59,48,0.12); color: var(--red); }

    .container { max-width: 900px; margin: 0 auto; padding: 16px 20px; }

    /* ===== SYSTEM OVERVIEW ===== */
    .overview {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px;
    }
    .overview-card {
      background: var(--card); border-radius: var(--radius); padding: 16px; text-align: center;
      box-shadow: var(--shadow);
    }
    .overview-num { font-size: 2rem; font-weight: 800; line-height: 1; margin-bottom: 4px; }
    .overview-label { font-size: 0.65rem; color: var(--text3); font-weight: 500; }

    /* ===== SERVICE CARDS ===== */
    .service-card {
      background: var(--card); border-radius: var(--radius); box-shadow: var(--shadow);
      margin-bottom: 12px; overflow: hidden; transition: all 0.25s;
    }
    .service-card:hover { box-shadow: var(--shadow-lg); }

    .svc-header {
      display: flex; align-items: center; gap: 14px; padding: 16px 20px;
      cursor: pointer; user-select: none;
    }
    .svc-indicator {
      width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0;
      transition: all 0.3s;
    }
    .svc-indicator.alive {
      box-shadow: 0 0 10px rgba(52,199,89,0.5);
      animation: pulse-alive 2s ease-in-out infinite;
    }
    @keyframes pulse-alive {
      0%, 100% { box-shadow: 0 0 6px rgba(52,199,89,0.4); }
      50% { box-shadow: 0 0 14px rgba(52,199,89,0.7); }
    }
    .svc-indicator.dead { background: var(--red); box-shadow: 0 0 8px rgba(255,59,48,0.4); }

    .svc-info { flex: 1; min-width: 0; }
    .svc-name { font-size: 0.88rem; font-weight: 700; margin-bottom: 2px; }
    .svc-desc { font-size: 0.7rem; color: var(--text3); }
    .svc-badge {
      font-size: 0.62rem; font-weight: 700; padding: 3px 10px; border-radius: 100px;
      text-transform: uppercase; letter-spacing: 0.3px;
    }
    .svc-badge.alive { background: rgba(52,199,89,0.1); color: var(--green); }
    .svc-badge.dead { background: rgba(255,59,48,0.1); color: var(--red); }

    .svc-actions {
      display: flex; gap: 6px; padding: 0 20px 14px; flex-wrap: wrap;
    }
    .svc-btn {
      background: var(--bg); border: none; border-radius: var(--radius-sm); padding: 7px 14px;
      font-size: 0.72rem; font-weight: 600; cursor: pointer; font-family: var(--font);
      color: var(--text2); transition: all 0.2s;
    }
    .svc-btn:hover { background: #e8e8ed; }
    .svc-btn:active { transform: scale(0.95); }
    .svc-btn.start { background: rgba(52,199,89,0.1); color: var(--green); }
    .svc-btn.stop { background: rgba(255,59,48,0.1); color: var(--red); }
    .svc-btn.restart { background: rgba(255,149,0,0.1); color: var(--orange); }

    /* ===== LOG PANEL ===== */
    .svc-logs {
      max-height: 0; overflow: hidden; transition: max-height 0.35s ease;
      background: #1c1c1e; border-radius: 0 0 var(--radius) var(--radius);
    }
    .svc-logs.open { max-height: 400px; }
    .log-scroll {
      max-height: 350px; overflow-y: auto; padding: 12px 16px; font-size: 0.68rem;
      font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace; line-height: 1.6;
    }
    .log-line { color: #a0a0a5; }
    .log-line .log-time { color: #636366; margin-right: 8px; }
    .log-line.system { color: #5ac8fa; }
    .log-line.error { color: #ff6b6b; }

    /* ===== RESPONSIVE ===== */
    @media (max-width: 600px) {
      .overview { grid-template-columns: repeat(2, 1fr); }
      .svc-header { padding: 14px 16px; }
      .svc-actions { padding: 0 16px 12px; }
    }

    /* ===== LOADING ANIMATION ===== */
    .loading-bar {
      position: fixed; top: 0; left: 0; right: 0; height: 3px; z-index: 999;
      background: transparent; overflow: hidden;
    }
    .loading-bar.active::after {
      content: ''; display: block; width: 30%; height: 100%;
      background: var(--blue); border-radius: 0 2px 2px 0;
      animation: loading-slide 1.2s ease-in-out infinite;
    }
    @keyframes loading-slide {
      0% { transform: translateX(-100%); }
      50% { transform: translateX(200%); }
      100% { transform: translateX(400%); }
    }

    /* ===== TOAST ===== */
    .toast-container { position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); z-index: 999; }
    .toast {
      background: #1c1c1e; color: white; padding: 10px 20px; border-radius: 100px;
      font-size: 0.78rem; font-weight: 500; box-shadow: 0 4px 20px rgba(0,0,0,0.25);
      animation: toast-in 0.3s ease, toast-out 0.3s ease 2.5s forwards;
    }
    @keyframes toast-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes toast-out { to { opacity: 0; transform: translateY(-10px); } }
  </style>
</head>
<body>
  <div class="loading-bar" id="loadingBar"></div>

  <div class="topbar">
    <div>
      <h1>CEO Control Panel</h1>
      <div class="topbar-time" id="clock"></div>
    </div>
    <div class="topbar-actions">
      <button class="topbar-btn green" onclick="apiCall('/api/start-all')">B\u1eadt t\u1ea5t c\u1ea3</button>
      <button class="topbar-btn red" onclick="apiCall('/api/stop-all')">T\u1eaft t\u1ea5t c\u1ea3</button>
    </div>
  </div>

  <div class="container">
    <div class="overview" id="overview"></div>
    <div id="services"></div>
  </div>

  <div class="toast-container" id="toasts"></div>

  <script>
    const POLL_INTERVAL = 3000;
    let openLogs = {};

    function updateClock() {
      document.getElementById('clock').textContent = new Date().toLocaleString('vi-VN', {
        weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
    }
    updateClock(); setInterval(updateClock, 1000);

    function toast(msg) {
      const el = document.createElement('div');
      el.className = 'toast';
      el.textContent = msg;
      document.getElementById('toasts').appendChild(el);
      setTimeout(() => el.remove(), 3000);
    }

    async function apiCall(url) {
      document.getElementById('loadingBar').classList.add('active');
      try {
        const res = await fetch(url);
        const data = await res.json();
        toast(data.msg || 'OK');
        setTimeout(pollStatus, 500);
      } catch (e) {
        toast('L\u1ed7i: ' + e.message);
      }
      document.getElementById('loadingBar').classList.remove('active');
    }

    function toggleLogs(id) {
      openLogs[id] = !openLogs[id];
      const el = document.getElementById('logs-' + id);
      if (el) el.classList.toggle('open', openLogs[id]);
    }

    function renderOverview(services) {
      const alive = services.filter(s => s.alive).length;
      const total = services.length;
      const el = document.getElementById('overview');
      el.innerHTML = \`
        <div class="overview-card">
          <div class="overview-num" style="color:\${alive === total ? 'var(--green)' : 'var(--orange)'}">\${alive}/\${total}</div>
          <div class="overview-label">\u0110ang ch\u1ea1y</div>
        </div>
        <div class="overview-card">
          <div class="overview-num" style="color:var(--blue)">\${total}</div>
          <div class="overview-label">T\u1ed5ng services</div>
        </div>
        <div class="overview-card">
          <div class="overview-num" style="color:\${alive === total ? 'var(--green)' : 'var(--red)'}">\${alive === total ? 'OK' : '\u26a0\uFE0F'}</div>
          <div class="overview-label">Tr\u1ea1ng th\u00e1i h\u1ec7 th\u1ed1ng</div>
        </div>
        <div class="overview-card">
          <div class="overview-num" style="color:var(--purple)">24/7</div>
          <div class="overview-label">Gi\u00e1m s\u00e1t</div>
        </div>
      \`;
    }

    function renderServices(services) {
      const el = document.getElementById('services');
      el.innerHTML = services.map(svc => {
        const alive = svc.alive;
        const logLines = (svc.recentLogs || []).map(l => {
          let cls = 'log-line';
          if (l.text.includes('[SYSTEM]') || l.text.includes('[START]')) cls += ' system';
          if (l.text.includes('[ERROR]') || l.text.includes('FAIL')) cls += ' error';
          return \`<div class="\${cls}"><span class="log-time">\${l.time}</span>\${escapeHtml(l.text)}</div>\`;
        }).join('');

        return \`
          <div class="service-card">
            <div class="svc-header" onclick="toggleLogs('\${svc.id}')">
              <div class="svc-indicator \${alive ? 'alive' : 'dead'}" style="background:\${alive ? 'var(--green)' : 'var(--red)'}"></div>
              <div class="svc-info">
                <div class="svc-name">\${svc.name}</div>
                <div class="svc-desc">\${svc.desc}\${svc.pid ? ' \u2014 PID: ' + svc.pid : ''}</div>
              </div>
              <span class="svc-badge \${alive ? 'alive' : 'dead'}">\${alive ? '\u0110ang ch\u1ea1y' : '\u0110\u00e3 t\u1eaft'}</span>
            </div>
            <div class="svc-actions">
              \${!alive ? \`<button class="svc-btn start" onclick="apiCall('/api/start/\${svc.id}')">Kh\u1edfi \u0111\u1ed9ng</button>\` : ''}
              \${alive ? \`<button class="svc-btn stop" onclick="apiCall('/api/stop/\${svc.id}')">T\u1eaft</button>\` : ''}
              <button class="svc-btn restart" onclick="apiCall('/api/restart/\${svc.id}')">Restart</button>
            </div>
            <div class="svc-logs \${openLogs[svc.id] ? 'open' : ''}" id="logs-\${svc.id}">
              <div class="log-scroll" id="log-scroll-\${svc.id}">\${logLines || '<div class="log-line system">Ch\u01b0a c\u00f3 log</div>'}</div>
            </div>
          </div>
        \`;
      }).join('');
    }

    function escapeHtml(s) {
      return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    async function pollStatus() {
      try {
        const res = await fetch('/api/status');
        const data = await res.json();
        renderOverview(data.services);
        renderServices(data.services);
      } catch (e) {
        console.error('Poll error:', e);
      }
    }

    pollStatus();
    setInterval(pollStatus, POLL_INTERVAL);
  </script>
</body>
</html>`;
}
