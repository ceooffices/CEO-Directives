/**
 * control-panel.js
 * CEO Directive System — Control Panel UI (PM2 Backend)
 *
 * Web UI để quản lý tất cả services thông qua PM2:
 *   - NemoClaw Bridge
 *   - Telegram Bot
 *   - Scheduler (WF1-6)
 *   - Cloudflare Tunnel
 *
 * Tất cả service được quản lý bởi PM2 (ecosystem.config.js)
 * Control Panel chỉ gọi PM2 CLI để start/stop/restart/status
 *
 * Usage: node control-panel.js
 * Open:  http://localhost:9001
 */

require('dotenv').config();
const http = require('http');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { URL } = require('url');

const PORT = parseInt(process.env.PORT_PANEL || '9001');
const AUTO_DIR = __dirname;

// ===== PM2 CLI PATH =====
const HOME = process.env.HOME || '/Users/esuhai';
const PM2_BIN = path.join(HOME, '.npm-global/bin/pm2');

// ===== SERVICE DEFINITIONS (maps to PM2 process names in ecosystem.config.js) =====
const SERVICES = {
  'ceo-bridge': {
    name: 'Cầu nối API (Bridge)',
    desc: 'Cổng kết nối trung tâm — port ' + (process.env.PORT_BRIDGE || '3101'),
    detail: 'Đây là "trái tim" của hệ thống. Tất cả lệnh từ Telegram Bot, Dashboard đều đi qua đây để truy vấn dữ liệu Supabase, chạy Workflow, và điều phối các module AI.',
    scope: 'Nếu tắt: Bot Telegram sẽ không truy vấn được dữ liệu, Dashboard mất kết nối, không chạy được Workflow từ xa.',
    pm2Name: 'ceo-bridge',
    healthCheck: 'http://localhost:' + (process.env.PORT_BRIDGE || '3101') + '/health',
    color: '#ff9500',
    icon: '🌉'
  },
  'ceo-bot': {
    name: 'Bot Telegram',
    desc: 'Giao diện chat — điều khiển bằng tin nhắn',
    detail: 'Bot nhận lệnh của anh qua Telegram (VD: /trangthai, /quahan, /hoi). Hỗ trợ chat tự nhiên bằng tiếng Việt, gọi AI phân tích, chạy Workflow.',
    scope: 'Nếu tắt: Không nhận được lệnh qua Telegram nữa. Dashboard và Scheduler vẫn hoạt động bình thường.',
    pm2Name: 'ceo-bot',
    healthCheck: null,
    color: '#007aff',
    icon: '🤖'
  },
  'ceo-scheduler': {
    name: 'Lịch tự động (Scheduler)',
    desc: '16 lượt chạy/ngày — Thứ 2 đến Thứ 6',
    detail: 'Tự động chạy 6 quy trình (WF1-WF6) theo lịch cố định: gửi email duyệt chỉ đạo, theo dõi tiến độ, phát hiện rủi ro, nhắc nhở đầu mối, phân tích AI.',
    scope: 'Nếu tắt: Các quy trình tự động sẽ dừng (không gửi email, không nhắc nhở). Anh vẫn có thể chạy thủ công từng bước qua Bot hoặc Terminal.',
    pm2Name: 'ceo-scheduler',
    healthCheck: null,
    color: '#34c759',
    icon: '⏰'
  },
  'ceo-tunnel': {
    name: 'Hầm truy cập từ xa',
    desc: 'Kết nối an toàn qua Cloudflare',
    detail: 'Tạo đường truyền mã hóa HTTPS để anh mở Control Panel này từ bất kỳ đâu (điện thoại, iPad, laptop) mà không cần VPN.',
    scope: 'Nếu tắt: Chỉ mất truy cập từ xa. Hệ thống trên Mac Mini vẫn chạy bình thường. Anh vẫn thao tác được qua Telegram Bot.',
    pm2Name: 'ceo-tunnel',
    healthCheck: null,
    color: '#af52de',
    icon: '🔒'
  },
};

// ===== PM2 PROCESS MANAGER =====
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

function getPm2List() {
  try {
    const raw = execSync(PM2_BIN + ' jlist 2>/dev/null', { encoding: 'utf8', timeout: 5000 });
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function findPm2Process(pm2Name) {
  const list = getPm2List();
  return list.find(p => p.name === pm2Name) || null;
}

function startService(id) {
  const svc = SERVICES[id];
  if (!svc) return { ok: false, msg: 'Service not found' };
  try {
    const existing = findPm2Process(svc.pm2Name);
    if (existing && existing.pm2_env && existing.pm2_env.status === 'online') {
      addLog(id, '[PM2] ' + svc.name + ' already running (PID: ' + existing.pid + ')');
      return { ok: false, msg: 'Already running' };
    }
    const ecoFile = path.join(AUTO_DIR, 'ecosystem.config.js');
    execSync(PM2_BIN + ' start ' + ecoFile + ' --only ' + svc.pm2Name + ' 2>&1', {
      encoding: 'utf8', timeout: 10000, cwd: AUTO_DIR,
    });
    addLog(id, '[PM2] Started ' + svc.name);
    execSync(PM2_BIN + ' save 2>/dev/null', { encoding: 'utf8', timeout: 5000 });
    return { ok: true, msg: svc.name + ' started' };
  } catch (err) {
    addLog(id, '[ERROR] ' + err.message);
    return { ok: false, msg: 'Failed: ' + err.message.split('\n')[0] };
  }
}

function stopService(id) {
  const svc = SERVICES[id];
  if (!svc) return { ok: false, msg: 'Service not found' };
  try {
    execSync(PM2_BIN + ' stop ' + svc.pm2Name + ' 2>&1', { encoding: 'utf8', timeout: 10000 });
    addLog(id, '[PM2] Stopped ' + svc.name);
    execSync(PM2_BIN + ' save 2>/dev/null', { encoding: 'utf8', timeout: 5000 });
    return { ok: true, msg: 'Stopped' };
  } catch (err) {
    addLog(id, '[ERROR] ' + err.message);
    return { ok: false, msg: 'Failed: ' + err.message.split('\n')[0] };
  }
}

function restartService(id) {
  const svc = SERVICES[id];
  if (!svc) return { ok: false, msg: 'Service not found' };
  try {
    execSync(PM2_BIN + ' restart ' + svc.pm2Name + ' 2>&1', { encoding: 'utf8', timeout: 10000 });
    addLog(id, '[PM2] Restarted ' + svc.name);
    return { ok: true, msg: 'Restarted' };
  } catch (err) {
    addLog(id, '[ERROR] ' + err.message);
    return { ok: false, msg: 'Failed: ' + err.message.split('\n')[0] };
  }
}

function getServiceStatus(id) {
  const svc = SERVICES[id];
  if (!svc) return { id: id, alive: false, name: 'Unknown', desc: '', recentLogs: [] };
  const pm2Proc = findPm2Process(svc.pm2Name);
  const alive = !!(pm2Proc && pm2Proc.pm2_env && pm2Proc.pm2_env.status === 'online');
  const pid = pm2Proc ? pm2Proc.pid : null;
  const uptime = (pm2Proc && pm2Proc.pm2_env && pm2Proc.pm2_env.pm_uptime)
    ? Math.floor((Date.now() - pm2Proc.pm2_env.pm_uptime) / 1000)
    : 0;
  const restarts = (pm2Proc && pm2Proc.pm2_env) ? (pm2Proc.pm2_env.restart_time || 0) : 0;
  const memory = (pm2Proc && pm2Proc.monit && pm2Proc.monit.memory)
    ? Math.round(pm2Proc.monit.memory / 1024 / 1024) + 'MB'
    : '';
  const cpu = (pm2Proc && pm2Proc.monit && pm2Proc.monit.cpu !== undefined)
    ? pm2Proc.monit.cpu + '%'
    : '';
  return {
    id: id,
    name: svc.name,
    icon: svc.icon,
    desc: svc.desc,
    detail: svc.detail || '',
    scope: svc.scope || '',
    color: svc.color,
    alive: alive,
    pid: pid,
    uptime: uptime,
    restarts: restarts,
    memory: memory,
    cpu: cpu,
    recentLogs: (logs[id] || []).slice(-30),
  };
}

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
    if (SERVICES[id].healthCheck && status.alive) {
      status.httpOk = await httpHealthCheck(SERVICES[id].healthCheck);
    }
    statuses.push(status);
  }
  return statuses;
}

// ===== HTTP SERVER =====
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:' + PORT);
  const p = url.pathname;

  const allowedOrigin = process.env.DASHBOARD_URL || '*';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST');

  if (p === '/api/status') {
    const statuses = await getAllStatus();
    return json(res, 200, { services: statuses, time: new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) });
  }
  if (p.startsWith('/api/start/')) { return json(res, 200, startService(p.replace('/api/start/', ''))); }
  if (p.startsWith('/api/stop/')) { return json(res, 200, stopService(p.replace('/api/stop/', ''))); }
  if (p.startsWith('/api/restart/')) { return json(res, 200, restartService(p.replace('/api/restart/', ''))); }
  if (p === '/api/start-all') {
    const results = {};
    for (const id of Object.keys(SERVICES)) { results[id] = startService(id); }
    return json(res, 200, { results: results });
  }
  if (p === '/api/stop-all') {
    const results = {};
    for (const id of Object.keys(SERVICES)) { results[id] = stopService(id); }
    return json(res, 200, { results: results });
  }
  if (p.startsWith('/api/logs/')) {
    const id = p.replace('/api/logs/', '');
    return json(res, 200, { logs: logs[id] || [] });
  }
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
  console.log('  CEO Control Panel — http://localhost:' + PORT);
  console.log('  ' + new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }));
  console.log('==========================================');
});

// ===== HTML UI =====
function getHTML() {
  try {
    return fs.readFileSync(path.join(__dirname, 'panel-ui.html'), 'utf8');
  } catch (err) {
    return '<h1>Lỗi: Không tìm thấy giao diện panel-ui.html</h1><br>' + err.message;
  }
}
