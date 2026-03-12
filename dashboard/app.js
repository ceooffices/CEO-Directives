/* =============================================
   CEO Dashboard — App Logic
   Reads JSON data, renders UI, handles interactions
   ============================================= */

(function () {
  'use strict';

  // ===== CONFIG =====
  const DATA_BASE = '../data/';
  const FILES = {
    directives: DATA_BASE + 'directives.json',
    meetings: DATA_BASE + 'meetings.json',
    outcomes: DATA_BASE + 'outcomes.json',
    people: DATA_BASE + 'people.json',
    statusLog: DATA_BASE + 'status_log.json'
  };

  const STATUS_LABELS = {
    moi_tao: '🆕 Mới tạo',
    cho_xac_nhan: '⏳ Chờ xác nhận',
    da_xac_nhan_5t: '✅ Đã xác nhận 5T',
    dang_thuc_hien: '🔄 Đang thực hiện',
    hoan_thanh: '✅ Hoàn thành',
    can_lam_ro: '❓ Cần làm rõ'
  };

  const STATUS_SHORT = {
    cho_xac_nhan: 'Chờ XN',
    da_xac_nhan_5t: 'Đã XN 5T',
    dang_thuc_hien: 'Đang TH',
    hoan_thanh: 'Hoàn thành',
    can_lam_ro: 'Cần LR',
    moi_tao: 'Mới tạo'
  };

  const CHART_COLORS = {
    cho_xac_nhan: '#fbbf24',
    da_xac_nhan_5t: '#22d3ee',
    dang_thuc_hien: '#6366f1',
    hoan_thanh: '#34d399',
    can_lam_ro: '#fb7185',
    moi_tao: '#9aa0b8'
  };

  const PEOPLE_COLORS = ['#6366f1', '#8b5cf6', '#22d3ee', '#34d399', '#fbbf24', '#fb7185', '#fb923c', '#a78bfa', '#f472b6'];

  // ===== STATE =====
  let data = { directives: [], meetings: [], outcomes: [], people: [], statusLog: [] };

  // ===== DOM REFS =====
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // ===== INIT =====
  async function init() {
    try {
      const [dir, meet, out, ppl, log] = await Promise.all([
        fetchJSON(FILES.directives),
        fetchJSON(FILES.meetings),
        fetchJSON(FILES.outcomes),
        fetchJSON(FILES.people),
        fetchJSON(FILES.statusLog)
      ]);

      data.directives = dir.directives || [];
      data.meetings = meet.meetings || [];
      data.outcomes = out.outcomes || [];
      data.people = ppl.people || [];
      data.statusLog = log.log || [];
      data.outcomesSummary = out.summary || {};
      data.outcomesSections = out.sections || [];

      renderAll();
      setupEvents();
      hideSplash();
      startClock();
    } catch (err) {
      console.error('Failed to load data:', err);
      const splash = $('#splash');
      if (splash) {
        splash.querySelector('p').textContent = '❌ Lỗi tải dữ liệu — kiểm tra data/ folder';
        splash.querySelector('.splash-progress').style.background = 'linear-gradient(135deg, #dc2626, #fb7185)';
      }
    }
  }

  async function fetchJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.json();
  }

  function hideSplash() {
    setTimeout(() => {
      const splash = $('#splash');
      splash.classList.add('fade-out');
      $('#app').classList.remove('hidden');
      setTimeout(() => splash.remove(), 500);
    }, 1600);
  }

  function startClock() {
    const el = $('#topbarTime');
    const tick = () => {
      const now = new Date();
      el.textContent = now.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' }) +
        ' ' + now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    };
    tick();
    setInterval(tick, 30000);
  }

  // ===== RENDER ALL =====
  function renderAll() {
    renderKPIs();
    renderStatusChart();
    renderPeopleChart();
    renderHM50Bars();
    renderRecentMeeting();
    renderDirectives();
    renderHM50List();
    renderPeopleList();
    populateFilters();
  }

  // ===== KPIs =====
  function renderKPIs() {
    const dirs = data.directives;
    const now = new Date();

    const total = dirs.length;
    const pending = dirs.filter(d => d.trang_thai === 'cho_xac_nhan').length;
    const done = dirs.filter(d => d.trang_thai === 'hoan_thanh').length;
    const overdue = dirs.filter(d => {
      if (d.trang_thai === 'hoan_thanh') return false;
      if (!d.thoi_han) return false;
      return new Date(d.thoi_han) < now;
    }).length;

    animateNum('#kpiTotal', total);
    animateNum('#kpiPending', pending);
    animateNum('#kpiDone', done);
    animateNum('#kpiOverdue', overdue);
  }

  function animateNum(sel, target) {
    const el = $(sel);
    let current = 0;
    const step = Math.max(1, Math.ceil(target / 20));
    const interval = setInterval(() => {
      current = Math.min(current + step, target);
      el.textContent = current;
      if (current >= target) clearInterval(interval);
    }, 50);
  }

  // ===== STATUS DONUT CHART =====
  function renderStatusChart() {
    const canvas = $('#chartStatus');
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 280 * dpr;
    canvas.height = 280 * dpr;
    ctx.scale(dpr, dpr);

    const dirs = data.directives;
    const counts = {};
    dirs.forEach(d => { counts[d.trang_thai] = (counts[d.trang_thai] || 0) + 1; });

    const total = dirs.length || 1;
    const cx = 140, cy = 140, r = 100, inner = 60;
    let startAngle = -Math.PI / 2;

    const entries = Object.entries(counts);
    entries.forEach(([status, count]) => {
      const slice = (count / total) * 2 * Math.PI;
      ctx.beginPath();
      ctx.arc(cx, cy, r, startAngle, startAngle + slice);
      ctx.arc(cx, cy, inner, startAngle + slice, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = CHART_COLORS[status] || '#555';
      ctx.fill();
      startAngle += slice;
    });

    // Center text
    ctx.fillStyle = '#e8eaed';
    ctx.font = 'bold 28px Inter';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(total, cx, cy - 8);
    ctx.font = '12px Inter';
    ctx.fillStyle = '#9aa0b8';
    ctx.fillText('CHỈ ĐẠO', cx, cy + 14);

    // Legend
    const legend = $('#chartStatusLegend');
    legend.innerHTML = entries.map(([s, c]) =>
      `<div class="chart-legend-item">
        <span class="chart-legend-dot" style="background:${CHART_COLORS[s] || '#555'}"></span>
        ${STATUS_SHORT[s] || s}: ${c}
      </div>`
    ).join('');
  }

  // ===== PEOPLE BAR CHART =====
  function renderPeopleChart() {
    const canvas = $('#chartPeople');
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 280 * dpr;
    canvas.height = 220 * dpr;
    ctx.scale(dpr, dpr);

    const counts = {};
    data.directives.forEach(d => {
      counts[d.dau_moi] = (counts[d.dau_moi] || 0) + 1;
    });

    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const maxVal = Math.max(...entries.map(e => e[1]), 1);
    const barH = 28, gap = 8, offsetX = 80, chartW = 180;
    const totalH = entries.length * (barH + gap);
    const startY = (220 - totalH) / 2;

    entries.forEach(([name, count], i) => {
      const y = startY + i * (barH + gap);
      const w = (count / maxVal) * chartW;
      const color = PEOPLE_COLORS[i % PEOPLE_COLORS.length];

      // Name
      ctx.fillStyle = '#9aa0b8';
      ctx.font = '11px Inter';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(name, offsetX - 8, y + barH / 2);

      // Bar
      const gradient = ctx.createLinearGradient(offsetX, 0, offsetX + w, 0);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, color + '88');
      ctx.beginPath();
      ctx.roundRect(offsetX, y, w, barH, 6);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Count
      ctx.fillStyle = '#e8eaed';
      ctx.font = 'bold 12px Inter';
      ctx.textAlign = 'left';
      ctx.fillText(count, offsetX + w + 6, y + barH / 2);
    });

    // Legend
    const legend = $('#chartPeopleLegend');
    legend.innerHTML = entries.map(([name, count], i) =>
      `<div class="chart-legend-item">
        <span class="chart-legend-dot" style="background:${PEOPLE_COLORS[i % PEOPLE_COLORS.length]}"></span>
        ${name}: ${count}
      </div>`
    ).join('');
  }

  // ===== HM50 BARS =====
  function renderHM50Bars() {
    const s = data.outcomesSummary;
    const total = s.total || 50;

    setTimeout(() => {
      $('#hmGreen').style.width = ((s.co_chu || 0) / total * 100) + '%';
      $('#hmYellow').style.width = ((s.co_nhac_chua_chu || 0) / total * 100) + '%';
      $('#hmRed').style.width = ((s.blind_spot || 0) / total * 100) + '%';
    }, 200);

    $('#hmGreenVal').textContent = s.co_chu || 0;
    $('#hmYellowVal').textContent = s.co_nhac_chua_chu || 0;
    $('#hmRedVal').textContent = s.blind_spot || 0;
  }

  // ===== RECENT MEETING =====
  function renderRecentMeeting() {
    const el = $('#recentMeeting');
    const m = data.meetings[0];
    if (!m) { el.textContent = 'Không có dữ liệu'; return; }

    el.innerHTML = `
      <div class="mi-row"><span class="mi-label">📅 Ngày</span><span class="mi-value">${m.date}</span></div>
      <div class="mi-row"><span class="mi-label">📌 Tiêu đề</span><span class="mi-value">${m.title}</span></div>
      <div class="mi-row"><span class="mi-label">👤 Chủ trì</span><span class="mi-value">${m.chu_tri}</span></div>
      <div class="mi-row"><span class="mi-label">👥 Tham dự</span><span class="mi-value">${m.tham_du.join(', ')}</span></div>
      <div class="mi-row"><span class="mi-label">📋 Chỉ đạo</span><span class="mi-value">${m.total_directives} directives</span></div>
      <div class="mi-row"><span class="mi-label">✅ Trạng thái</span><span class="mi-value">${m.status}</span></div>
    `;
  }

  // ===== DIRECTIVES LIST =====
  function renderDirectives(filterPerson, filterStatus) {
    const el = $('#directivesList');
    let dirs = [...data.directives];

    if (filterPerson && filterPerson !== 'all') {
      dirs = dirs.filter(d => d.dau_moi === filterPerson || d.chi_dao_boi === filterPerson);
    }
    if (filterStatus && filterStatus !== 'all') {
      dirs = dirs.filter(d => d.trang_thai === filterStatus);
    }

    if (dirs.length === 0) {
      el.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:40px 0;">Không có chỉ đạo nào phù hợp</p>';
      return;
    }

    el.innerHTML = dirs.map(d => {
      const isOverdue = d.trang_thai !== 'hoan_thanh' && d.thoi_han && new Date(d.thoi_han) < new Date();
      return `
        <div class="directive-card status-${d.trang_thai}" data-id="${d.id}">
          <div class="dc-header">
            <span class="dc-id">${d.id}</span>
            <span class="dc-status s-${d.trang_thai}">${STATUS_SHORT[d.trang_thai] || d.trang_thai}</span>
          </div>
          <div class="dc-task">${d.nhiem_vu}</div>
          <div class="dc-meta">
            <span>📢 ${d.chi_dao_boi}</span>
            <span>👤 ${d.dau_moi}</span>
            <span style="${isOverdue ? 'color:var(--accent-rose)' : ''}">⏰ ${d.thoi_han || '—'}</span>
            <span>🎯 ${d.hm50_ref || '—'}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // ===== HM50 LIST =====
  function renderHM50List(filterSection, filterStatus) {
    const el = $('#hm50List');
    let items = [...data.outcomes];

    if (filterSection && filterSection !== 'all') {
      items = items.filter(o => o.section === filterSection);
    }
    if (filterStatus && filterStatus !== 'all') {
      items = items.filter(o => o.status === filterStatus);
    }

    el.innerHTML = items.map(o => `
      <div class="hm50-card" data-hm="${o.id}">
        <div class="hm-top">
          <span class="hm-id">${o.id}</span>
          <span class="hm-status-badge">${o.status}</span>
        </div>
        <div class="hm-name">${o.name}</div>
        <div class="hm-detail">
          <span>👤 ${o.dau_moi}</span>
          <span>📅 ${o.deadline || '—'}</span>
          <span>🎯 ${o.target || '—'}</span>
        </div>
      </div>
    `).join('');
  }

  // ===== PEOPLE LIST =====
  function renderPeopleList() {
    const el = $('#peopleList');
    const dirCounts = {};
    data.directives.forEach(d => {
      dirCounts[d.dau_moi] = (dirCounts[d.dau_moi] || 0) + 1;
    });

    const hmCounts = {};
    data.outcomes.forEach(o => {
      hmCounts[o.dau_moi] = (hmCounts[o.dau_moi] || 0) + 1;
    });

    el.innerHTML = data.people.map((p, i) => {
      const initial = p.ten.charAt(0);
      const mainAlias = p.biet_danh[0] || p.ten;
      const dirCount = dirCounts[mainAlias] || 0;
      const hmCount = hmCounts[mainAlias] || hmCounts[p.ten] || 0;

      return `
        <div class="person-card">
          <div class="person-avatar" style="background:${PEOPLE_COLORS[i % PEOPLE_COLORS.length]}">${initial}</div>
          <div class="person-info">
            <div class="person-name">${p.ten}</div>
            <div class="person-role">${p.chuc_vu} — ${p.phong_ban}</div>
            <div class="person-stats">
              <span class="person-stat">📋 ${dirCount} chỉ đạo</span>
              <span class="person-stat">🎯 ${hmCount} HM50</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // ===== FILTERS =====
  function populateFilters() {
    // Person filter
    const personSet = new Set();
    data.directives.forEach(d => { personSet.add(d.dau_moi); personSet.add(d.chi_dao_boi); });
    const personSelect = $('#filterPerson');
    personSet.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p; opt.textContent = p;
      personSelect.appendChild(opt);
    });

    // Section filter
    const sectionSelect = $('#filterSection');
    data.outcomesSections.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id; opt.textContent = `${s.hm_range}: ${s.name}`;
      sectionSelect.appendChild(opt);
    });
  }

  // ===== MODAL =====
  function showDirectiveModal(id) {
    const d = data.directives.find(x => x.id === id);
    if (!d) return;

    const statusLabel = STATUS_LABELS[d.trang_thai] || d.trang_thai;
    const hm = data.outcomes.find(o => o.id === d.hm50_ref);

    const body = $('#modalBody');
    body.innerHTML = `
      <div class="modal-title">${d.nhiem_vu}</div>

      <div class="modal-section">
        <div class="modal-section-title">Thông tin 5T</div>
        <div class="modal-row"><span class="modal-row-label">T1 — Đầu mối</span><span class="modal-row-value">${d.dau_moi}</span></div>
        <div class="modal-row"><span class="modal-row-label">T2 — Nhiệm vụ</span><span class="modal-row-value">${d.nhiem_vu}</span></div>
        <div class="modal-row"><span class="modal-row-label">T3 — Chỉ tiêu</span><span class="modal-row-value">${d.chi_tieu || '—'}</span></div>
        <div class="modal-row"><span class="modal-row-label">T4 — Thời hạn</span><span class="modal-row-value">${d.thoi_han || '—'}</span></div>
        <div class="modal-row"><span class="modal-row-label">T5 — Liên quan</span><span class="modal-row-value">${(d.thanh_vien_lien_quan || []).map(t => `<span class="modal-tag">${t}</span>`).join(' ') || '—'}</span></div>
      </div>

      <div class="modal-section">
        <div class="modal-section-title">Chi tiết</div>
        <div class="modal-row"><span class="modal-row-label">Người chỉ đạo</span><span class="modal-row-value">${d.chi_dao_boi}</span></div>
        <div class="modal-row"><span class="modal-row-label">Trạng thái</span><span class="modal-row-value">${statusLabel}</span></div>
        <div class="modal-row"><span class="modal-row-label">5T status</span><span class="modal-row-value">${d.trang_thai_5t || '—'}</span></div>
        <div class="modal-row"><span class="modal-row-label">HM50 Link</span><span class="modal-row-value">${d.hm50_ref ? `${d.hm50_ref} — ${d.hm50_name}` : '—'}</span></div>
        <div class="modal-row"><span class="modal-row-label">Cuộc họp</span><span class="modal-row-value">${d.meeting_id}</span></div>
        ${d.ghi_chu ? `<div class="modal-row"><span class="modal-row-label">Ghi chú</span><span class="modal-row-value">${d.ghi_chu}</span></div>` : ''}
      </div>

      ${hm ? `
      <div class="modal-section">
        <div class="modal-section-title">HM50 liên quan: ${hm.id}</div>
        <div class="modal-row"><span class="modal-row-label">Hạng mục</span><span class="modal-row-value">${hm.name}</span></div>
        <div class="modal-row"><span class="modal-row-label">Target</span><span class="modal-row-value">${hm.target}</span></div>
        <div class="modal-row"><span class="modal-row-label">Deadline</span><span class="modal-row-value">${hm.deadline}</span></div>
      </div>` : ''}

      <div class="modal-section">
        <div class="modal-section-title">Lịch sử</div>
        <div class="modal-history">
          ${(d.history || []).map(h => `
            <div class="modal-history-item">
              <strong>${h.action}</strong> bởi ${h.by} — ${new Date(h.timestamp).toLocaleString('vi-VN')}
              ${h.note ? `<br><em>${h.note}</em>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;

    $('#modal').classList.remove('hidden');
  }

  function showHM50Modal(hmId) {
    const hm = data.outcomes.find(o => o.id === hmId);
    if (!hm) return;

    const linkedDirs = data.directives.filter(d => d.hm50_ref === hmId);

    const body = $('#modalBody');
    body.innerHTML = `
      <div class="modal-title">${hm.status} ${hm.name}</div>

      <div class="modal-section">
        <div class="modal-section-title">Chi tiết hạng mục</div>
        <div class="modal-row"><span class="modal-row-label">ID</span><span class="modal-row-value">${hm.id}</span></div>
        <div class="modal-row"><span class="modal-row-label">Đầu mối</span><span class="modal-row-value">${hm.dau_moi}</span></div>
        <div class="modal-row"><span class="modal-row-label">Task</span><span class="modal-row-value">${hm.task}</span></div>
        <div class="modal-row"><span class="modal-row-label">Target</span><span class="modal-row-value">${hm.target}</span></div>
        <div class="modal-row"><span class="modal-row-label">Deadline</span><span class="modal-row-value">${hm.deadline}</span></div>
        <div class="modal-row"><span class="modal-row-label">Liên quan</span><span class="modal-row-value">${(hm.lien_quan || []).map(t => `<span class="modal-tag">${t}</span>`).join(' ') || '—'}</span></div>
      </div>

      ${linkedDirs.length > 0 ? `
      <div class="modal-section">
        <div class="modal-section-title">Chỉ đạo liên quan (${linkedDirs.length})</div>
        ${linkedDirs.map(d => `
          <div class="modal-row" style="flex-direction:column;gap:2px;">
            <span style="font-size:0.75rem;color:var(--text-accent)">${d.id} — ${STATUS_SHORT[d.trang_thai]}</span>
            <span style="font-size:0.8rem">${d.nhiem_vu}</span>
          </div>
        `).join('')}
      </div>` : ''}
    `;

    $('#modal').classList.remove('hidden');
  }

  function closeModal() {
    $('#modal').classList.add('hidden');
  }

  // ===== EVENTS =====
  function setupEvents() {
    // Tabs
    $$('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        $$('.tab').forEach(t => t.classList.remove('active'));
        $$('.tab-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        $(`#tab-${tab.dataset.tab}`).classList.add('active');
      });
    });

    // Filters
    $('#filterPerson').addEventListener('change', (e) => {
      renderDirectives(e.target.value, $('#filterStatus').value);
    });
    $('#filterStatus').addEventListener('change', (e) => {
      renderDirectives($('#filterPerson').value, e.target.value);
    });
    $('#filterSection').addEventListener('change', (e) => {
      renderHM50List(e.target.value, $('#filterHmStatus').value);
    });
    $('#filterHmStatus').addEventListener('change', (e) => {
      renderHM50List($('#filterSection').value, e.target.value);
    });

    // Directive card click
    $('#directivesList').addEventListener('click', (e) => {
      const card = e.target.closest('.directive-card');
      if (card) showDirectiveModal(card.dataset.id);
    });

    // HM50 card click
    $('#hm50List').addEventListener('click', (e) => {
      const card = e.target.closest('.hm50-card');
      if (card) showHM50Modal(card.dataset.hm);
    });

    // Modal close
    $('#modalClose').addEventListener('click', closeModal);
    $('.modal-backdrop').addEventListener('click', closeModal);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

    // Refresh
    $('#btnRefresh').addEventListener('click', async () => {
      $('#btnRefresh').style.transform = 'rotate(360deg)';
      setTimeout(() => { $('#btnRefresh').style.transform = ''; }, 600);
      try {
        const [dir, meet, out, ppl, log] = await Promise.all([
          fetchJSON(FILES.directives + '?t=' + Date.now()),
          fetchJSON(FILES.meetings + '?t=' + Date.now()),
          fetchJSON(FILES.outcomes + '?t=' + Date.now()),
          fetchJSON(FILES.people + '?t=' + Date.now()),
          fetchJSON(FILES.statusLog + '?t=' + Date.now())
        ]);
        data.directives = dir.directives || [];
        data.meetings = meet.meetings || [];
        data.outcomes = out.outcomes || [];
        data.people = ppl.people || [];
        data.statusLog = log.log || [];
        data.outcomesSummary = out.summary || {};
        data.outcomesSections = out.sections || [];
        renderAll();
      } catch (err) {
        console.error('Refresh failed:', err);
      }
    });
  }

  // ===== POLYFILL roundRect =====
  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
      if (typeof r === 'number') r = [r, r, r, r];
      this.moveTo(x + r[0], y);
      this.lineTo(x + w - r[1], y);
      this.quadraticCurveTo(x + w, y, x + w, y + r[1]);
      this.lineTo(x + w, y + h - r[2]);
      this.quadraticCurveTo(x + w, y + h, x + w - r[2], y + h);
      this.lineTo(x + r[3], y + h);
      this.quadraticCurveTo(x, y + h, x, y + h - r[3]);
      this.lineTo(x, y + r[0]);
      this.quadraticCurveTo(x, y, x + r[0], y);
      this.closePath();
    };
  }

  // ===== START =====
  document.addEventListener('DOMContentLoaded', init);
})();
