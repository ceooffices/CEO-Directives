/* =============================================
   CEO Dashboard — App Logic (v2 Apple-style)
   No emojis, cards instead of charts, clean
   ============================================= */

(function () {
  'use strict';

  const DATA_BASE = '../data/';
  const FILES = {
    directives: DATA_BASE + 'directives.json',
    meetings: DATA_BASE + 'meetings.json',
    outcomes: DATA_BASE + 'outcomes.json',
    people: DATA_BASE + 'people.json',
    statusLog: DATA_BASE + 'status_log.json'
  };

  const STATUS_LABELS = {
    moi_tao: 'Moi tao',
    cho_xac_nhan: 'Cho xac nhan',
    da_xac_nhan_5t: 'Da xac nhan 5T',
    dang_thuc_hien: 'Dang thuc hien',
    hoan_thanh: 'Hoan thanh',
    can_lam_ro: 'Can lam ro'
  };

  const STATUS_SHORT = {
    cho_xac_nhan: 'Cho XN',
    da_xac_nhan_5t: 'Da XN 5T',
    dang_thuc_hien: 'Dang TH',
    hoan_thanh: 'Hoan thanh',
    can_lam_ro: 'Can LR',
    moi_tao: 'Moi tao'
  };

  const STATUS_COLORS = {
    cho_xac_nhan: '#ff9500',
    da_xac_nhan_5t: '#5ac8fa',
    dang_thuc_hien: '#007aff',
    hoan_thanh: '#34c759',
    can_lam_ro: '#ff3b30',
    moi_tao: '#8e8e93'
  };

  const PEOPLE_COLORS = ['#007aff', '#af52de', '#5ac8fa', '#34c759', '#ff9500', '#ff2d55', '#5856d6', '#ff3b30', '#ffcc00'];

  let data = { directives: [], meetings: [], outcomes: [], people: [], statusLog: [] };

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // ===== SVG ICONS =====
  const ICONS = {
    speaker: '<svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>',
    person: '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    target: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
    chevron: '<svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>',
    calendar: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    users: '<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    file: '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    check: '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>',
    meeting: '<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'
  };

  function icon(name) {
    return `<span class="dc-meta-icon">${ICONS[name] || ''}</span>`;
  }

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
        splash.querySelector('p').textContent = 'Loi tai du lieu — kiem tra data/ folder';
        splash.querySelector('.splash-progress').style.background = '#ff3b30';
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
      setTimeout(() => splash.remove(), 400);
    }, 1400);
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
    renderStatusCards();
    renderPersonBars();
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
    animateNum('#kpiTotal', dirs.length);
    animateNum('#kpiPending', dirs.filter(d => d.trang_thai === 'cho_xac_nhan').length);
    animateNum('#kpiDone', dirs.filter(d => d.trang_thai === 'hoan_thanh').length);
    animateNum('#kpiOverdue', dirs.filter(d => {
      if (d.trang_thai === 'hoan_thanh') return false;
      return d.thoi_han && new Date(d.thoi_han) < now;
    }).length);
  }

  function animateNum(sel, target) {
    const el = $(sel);
    let current = 0;
    const step = Math.max(1, Math.ceil(target / 15));
    const interval = setInterval(() => {
      current = Math.min(current + step, target);
      el.textContent = current;
      if (current >= target) clearInterval(interval);
    }, 60);
  }

  // ===== STATUS CARDS (replaces donut) =====
  function renderStatusCards() {
    const counts = {};
    data.directives.forEach(d => { counts[d.trang_thai] = (counts[d.trang_thai] || 0) + 1; });

    const el = $('#statusCards');
    el.innerHTML = Object.entries(counts).map(([status, count]) => `
      <div class="stat-row">
        <div class="stat-left">
          <div class="stat-dot" style="background:${STATUS_COLORS[status] || '#8e8e93'}"></div>
          <span class="stat-name">${STATUS_LABELS[status] || status}</span>
        </div>
        <span class="stat-count">${count}</span>
      </div>
    `).join('');
  }

  // ===== PERSON BARS (replaces bar chart) =====
  function renderPersonBars() {
    const counts = {};
    data.directives.forEach(d => { counts[d.dau_moi] = (counts[d.dau_moi] || 0) + 1; });

    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const maxVal = Math.max(...entries.map(e => e[1]), 1);

    const el = $('#personBars');
    el.innerHTML = entries.map(([name, count], i) => {
      const color = PEOPLE_COLORS[i % PEOPLE_COLORS.length];
      const pct = (count / maxVal * 100);
      return `
        <div class="person-bar-row">
          <div class="person-bar-avatar" style="background:${color}">${name.charAt(0)}</div>
          <span class="person-bar-name">${name}</span>
          <div class="person-bar-track">
            <div class="person-bar-fill" style="width:${pct}%;background:${color}"></div>
          </div>
          <span class="person-bar-count">${count}</span>
        </div>
      `;
    }).join('');
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
    if (!m) { el.textContent = 'Khong co du lieu'; return; }
    el.innerHTML = `
      <div class="mi-row"><span class="mi-label">Ngay</span><span class="mi-value">${m.date}</span></div>
      <div class="mi-row"><span class="mi-label">Tieu de</span><span class="mi-value">${m.title}</span></div>
      <div class="mi-row"><span class="mi-label">Chu tri</span><span class="mi-value">${m.chu_tri}</span></div>
      <div class="mi-row"><span class="mi-label">Tham du</span><span class="mi-value">${m.tham_du.join(', ')}</span></div>
      <div class="mi-row"><span class="mi-label">Chi dao</span><span class="mi-value">${m.total_directives} directives</span></div>
      <div class="mi-row"><span class="mi-label">Trang thai</span><span class="mi-value">${m.status}</span></div>
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
    if (!dirs.length) {
      el.innerHTML = '<p style="text-align:center;color:var(--text-tertiary);padding:40px 0;">Khong co chi dao nao phu hop</p>';
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
            <span class="dc-meta-item">${icon('speaker')} ${d.chi_dao_boi}</span>
            <span class="dc-meta-item">${icon('person')} ${d.dau_moi}</span>
            <span class="dc-meta-item" style="${isOverdue ? 'color:var(--red)' : ''}">${icon('clock')} ${d.thoi_han || '—'}</span>
            <span class="dc-meta-item">${icon('target')} ${d.hm50_ref || '—'}</span>
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
      const statusMap = { ok: '✅', warn: '⚠️', fail: '❌' };
      items = items.filter(o => o.status === statusMap[filterStatus]);
    }

    // Wrap in container
    el.innerHTML = items.map(o => {
      const cls = o.status === '✅' ? 'hm-s-ok' : o.status === '⚠️' ? 'hm-s-warn' : 'hm-s-fail';
      return `
        <div class="hm50-card" data-hm="${o.id}">
          <div class="hm-indicator ${cls}"></div>
          <div class="hm-body">
            <div class="hm-top-row">
              <span class="hm-id">${o.id}</span>
            </div>
            <div class="hm-name">${o.name}</div>
            <div class="hm-detail">
              <span>${o.dau_moi}</span>
              <span>${o.deadline || '—'}</span>
            </div>
          </div>
          <span class="hm-chevron">${ICONS.chevron}</span>
        </div>
      `;
    }).join('');
  }

  // ===== PEOPLE LIST =====
  function renderPeopleList() {
    const el = $('#peopleList');
    const dirCounts = {};
    data.directives.forEach(d => { dirCounts[d.dau_moi] = (dirCounts[d.dau_moi] || 0) + 1; });
    const hmCounts = {};
    data.outcomes.forEach(o => { hmCounts[o.dau_moi] = (hmCounts[o.dau_moi] || 0) + 1; });

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
              <span class="person-stat">${dirCount} chi dao</span>
              <span class="person-stat">${hmCount} HM50</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // ===== FILTERS =====
  function populateFilters() {
    const personSet = new Set();
    data.directives.forEach(d => { personSet.add(d.dau_moi); personSet.add(d.chi_dao_boi); });
    const personSelect = $('#filterPerson');
    personSet.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p; opt.textContent = p;
      personSelect.appendChild(opt);
    });

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
    const hm = data.outcomes.find(o => o.id === d.hm50_ref);
    const body = $('#modalBody');
    body.innerHTML = `
      <div class="modal-title">${d.nhiem_vu}</div>
      <div class="modal-section">
        <div class="modal-section-title">Thong tin 5T</div>
        <div class="modal-row"><span class="modal-row-label">T1 Dau moi</span><span class="modal-row-value">${d.dau_moi}</span></div>
        <div class="modal-row"><span class="modal-row-label">T2 Nhiem vu</span><span class="modal-row-value">${d.nhiem_vu}</span></div>
        <div class="modal-row"><span class="modal-row-label">T3 Chi tieu</span><span class="modal-row-value">${d.chi_tieu || '—'}</span></div>
        <div class="modal-row"><span class="modal-row-label">T4 Thoi han</span><span class="modal-row-value">${d.thoi_han || '—'}</span></div>
        <div class="modal-row"><span class="modal-row-label">T5 Lien quan</span><span class="modal-row-value">${(d.thanh_vien_lien_quan || []).map(t => `<span class="modal-tag">${t}</span>`).join(' ') || '—'}</span></div>
      </div>
      <div class="modal-section">
        <div class="modal-section-title">Chi tiet</div>
        <div class="modal-row"><span class="modal-row-label">Nguoi chi dao</span><span class="modal-row-value">${d.chi_dao_boi}</span></div>
        <div class="modal-row"><span class="modal-row-label">Trang thai</span><span class="modal-row-value">${STATUS_LABELS[d.trang_thai]}</span></div>
        <div class="modal-row"><span class="modal-row-label">5T status</span><span class="modal-row-value">${d.trang_thai_5t || '—'}</span></div>
        <div class="modal-row"><span class="modal-row-label">HM50 Link</span><span class="modal-row-value">${d.hm50_ref ? `${d.hm50_ref} — ${d.hm50_name}` : '—'}</span></div>
        <div class="modal-row"><span class="modal-row-label">Cuoc hop</span><span class="modal-row-value">${d.meeting_id}</span></div>
        ${d.ghi_chu ? `<div class="modal-row"><span class="modal-row-label">Ghi chu</span><span class="modal-row-value">${d.ghi_chu}</span></div>` : ''}
      </div>
      ${hm ? `
      <div class="modal-section">
        <div class="modal-section-title">HM50 lien quan: ${hm.id}</div>
        <div class="modal-row"><span class="modal-row-label">Hang muc</span><span class="modal-row-value">${hm.name}</span></div>
        <div class="modal-row"><span class="modal-row-label">Target</span><span class="modal-row-value">${hm.target}</span></div>
        <div class="modal-row"><span class="modal-row-label">Deadline</span><span class="modal-row-value">${hm.deadline}</span></div>
      </div>` : ''}
      <div class="modal-section">
        <div class="modal-section-title">Lich su</div>
        <div class="modal-history">
          ${(d.history || []).map(h => `
            <div class="modal-history-item">
              <strong>${h.action}</strong> boi ${h.by} — ${new Date(h.timestamp).toLocaleString('vi-VN')}
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
      <div class="modal-title">${hm.name}</div>
      <div class="modal-section">
        <div class="modal-section-title">Chi tiet hang muc</div>
        <div class="modal-row"><span class="modal-row-label">ID</span><span class="modal-row-value">${hm.id}</span></div>
        <div class="modal-row"><span class="modal-row-label">Dau moi</span><span class="modal-row-value">${hm.dau_moi}</span></div>
        <div class="modal-row"><span class="modal-row-label">Task</span><span class="modal-row-value">${hm.task}</span></div>
        <div class="modal-row"><span class="modal-row-label">Target</span><span class="modal-row-value">${hm.target}</span></div>
        <div class="modal-row"><span class="modal-row-label">Deadline</span><span class="modal-row-value">${hm.deadline}</span></div>
        <div class="modal-row"><span class="modal-row-label">Lien quan</span><span class="modal-row-value">${(hm.lien_quan || []).map(t => `<span class="modal-tag">${t}</span>`).join(' ') || '—'}</span></div>
      </div>
      ${linkedDirs.length ? `
      <div class="modal-section">
        <div class="modal-section-title">Chi dao lien quan (${linkedDirs.length})</div>
        ${linkedDirs.map(d => `
          <div class="modal-row" style="flex-direction:column;gap:4px">
            <span style="font-size:0.75rem;color:var(--blue);font-weight:600">${d.id} — ${STATUS_SHORT[d.trang_thai]}</span>
            <span style="font-size:0.82rem">${d.nhiem_vu}</span>
          </div>
        `).join('')}
      </div>` : ''}
    `;
    $('#modal').classList.remove('hidden');
  }

  function closeModal() { $('#modal').classList.add('hidden'); }

  // ===== EVENTS =====
  function setupEvents() {
    $$('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        $$('.tab').forEach(t => t.classList.remove('active'));
        $$('.tab-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        $(`#tab-${tab.dataset.tab}`).classList.add('active');
      });
    });

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

    $('#directivesList').addEventListener('click', (e) => {
      const card = e.target.closest('.directive-card');
      if (card) showDirectiveModal(card.dataset.id);
    });

    $('#hm50List').addEventListener('click', (e) => {
      const card = e.target.closest('.hm50-card');
      if (card) showHM50Modal(card.dataset.hm);
    });

    $('#modalClose').addEventListener('click', closeModal);
    $('.modal-backdrop').addEventListener('click', closeModal);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

    $('#btnRefresh').addEventListener('click', async () => {
      const btn = $('#btnRefresh');
      btn.textContent = '...';
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
      } catch (err) { console.error('Refresh failed:', err); }
      btn.textContent = 'Lam moi';
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
