/* =============================================
   CEO Dashboard — App Logic v4
   Chiến lược → Leo thang → Kết quả → Hành động
   
   KHÁI NIỆM LEO THANG:
   - 50 HM = chiến lược gốc đầu năm
   - DIR = chỉ đạo BOD hàng ngày
   - DIR có hm50_ref → LEO THANG từ HM gốc (triển khai cụ thể)
   - DIR không có hm50_ref → CHỈ ĐẠO MỚI ngoài chiến lược
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
    moi_tao: 'Mới tạo', cho_xac_nhan: 'Chờ xác nhận', da_xac_nhan_5t: 'Đã xác nhận 5T',
    dang_thuc_hien: 'Đang thực hiện', hoan_thanh: 'Hoàn thành', can_lam_ro: 'Cần làm rõ'
  };

  // Directive urgency based on timeline
  function getUrgencyLevel(d) {
    if (d.trang_thai === 'hoan_thanh') return 'done';
    const now = new Date();
    const deadline = d.thoi_han ? new Date(d.thoi_han) : null;
    if (!deadline) return 'green';
    const daysLeft = (deadline - now) / (1000 * 60 * 60 * 24);
    const totalDays = (deadline - new Date(d.created_at)) / (1000 * 60 * 60 * 24);
    const elapsed = totalDays - daysLeft;
    const pctElapsed = totalDays > 0 ? (elapsed / totalDays) * 100 : 0;

    if (daysLeft < -14) return 'black';
    if (daysLeft < 0) return 'red';
    if (daysLeft < 3 || pctElapsed > 80) return 'yellow';
    return 'green';
  }

  const URGENCY_LABELS = {
    green: 'Đúng tiến độ', yellow: 'Sắp đến hạn', red: 'Quá hạn', black: 'Báo động', done: 'Hoàn thành'
  };

  const URGENCY_COLORS = {
    green: '#34c759', yellow: '#ff9500', red: '#ff3b30', black: '#1c1c1e', done: '#5ac8fa'
  };

  const STATUS_ICONS = {
    '✅': { cls: 'green', color: '#34c759' },
    '⚠️': { cls: 'yellow', color: '#ff9500' },
    '❌': { cls: 'red', color: '#ff3b30' }
  };

  const PEOPLE_COLORS = ['#007aff', '#af52de', '#5ac8fa', '#34c759', '#ff9500', '#ff2d55', '#5856d6', '#ff3b30', '#ffcc00'];

  // Section strategic outcomes
  const SECTION_OUTCOMES = {
    'SEC-I': 'Toàn hệ thống thay đổi tư duy, từ XKLĐ thành hệ sinh thái nhân lực quốc tế. Mọi nhân viên hiểu triết lý và cam kết cá nhân.',
    'SEC-II': 'Mỗi ngày có số liệu, mỗi tuần có review, mỗi tháng có pipeline — không có "vùng mờ" trong quản trị.',
    'SEC-III': 'Tổ chức gọn nhẹ, 9 đội MSA đủ quân, pipeline KOKA→MSA→JPC liền mạch, không có link yếu.',
    'SEC-IV': 'Mọi người được trả lương theo kết quả thật, thưởng vượt kỳ vọng, tư duy đầu mối thay cho tư duy làm thuê.',
    'SEC-V': 'Văn hoá "chiến binh chủ động" thay cho thụ động. Mỗi NV tự hỏi: bỏ tôi ra, kết quả có đổi không?',
    'SEC-VI': 'Marketing có đo lường, 8 landing page chuyên biệt, TikMe chiêu sinh số, 2.483 leads mới/năm.',
    'SEC-VII': '100% NV dùng Bitrix, Dashboard 3 tầng (tổng quan → chi tiết → dự báo AI), hệ thống đèn Xanh-Vàng-Đỏ-Đen tự động.',
    'SEC-VIII': 'Tổ chức học tập liên tục, Kaizen PDCA, tầm nhìn 2045: 20.000 vị trí/năm, hàng trăm ngàn TN VN.'
  };

  const ACTION_SUGGESTIONS = {
    green: 'Duy trì, ghi nhận, chia sẻ best practice',
    yellow: 'Nhắc nhở đầu mối, check-in tiến độ, hỗ trợ nguồn lực',
    red: 'Họp khẩn cấp với đầu mối, tái phân bổ nguồn lực, báo cáo BOD',
    black: 'CEO can thiệp trực tiếp, có thể thay đầu mối, ưu tiên cao nhất'
  };

  let data = { directives: [], meetings: [], outcomes: [], people: [], statusLog: [] };

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const ICONS = {
    speaker: '<svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>',
    person: '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    target: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
    chevron: '<svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>',
    link: '<svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
    alert: '<svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    star: '<svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'
  };

  function icon(name) { return `<span class="dc-meta-icon">${ICONS[name] || ''}</span>`; }

  // ===== INIT =====
  async function init() {
    try {
      const [dir, meet, out, ppl, log] = await Promise.all([
        fetchJSON(FILES.directives), fetchJSON(FILES.meetings), fetchJSON(FILES.outcomes),
        fetchJSON(FILES.people), fetchJSON(FILES.statusLog)
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
      console.error('Lỗi tải dữ liệu:', err);
      const splash = $('#splash');
      if (splash) {
        splash.querySelector('p').textContent = 'Lỗi tải dữ liệu';
        splash.querySelector('.splash-progress').style.background = '#ff3b30';
      }
    }
  }

  async function fetchJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} cho ${url}`);
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
    tick(); setInterval(tick, 30000);
  }

  // ===== RENDER ALL =====
  function renderAll() {
    renderHealthScore();
    renderTrafficLights();
    renderPillarsGrid();
    renderFunnel();
    // Tab 2: Leo thang (đúng nghĩa)
    renderEscalationSummary();
    renderEscalationFromHM();
    renderEscalationNewDirs();
    renderEscalationTimeline();
    // Tab 3: Chiến lược
    renderStrategyMap();
    // Tab 4: Hành động
    renderUrgentActions();
    renderActionsByStatus();
    renderProgressTracking();
  }

  // ===== TAB 1: BỨC TRANH TỔNG =====

  function renderHealthScore() {
    const total = data.outcomes.length || 50;
    const ok = data.outcomes.filter(o => o.status === '✅').length;
    const pct = Math.round((ok / total) * 100);

    const dirDone = data.directives.filter(d => d.trang_thai === 'hoan_thanh').length;
    const dirTotal = data.directives.length;
    const dirPct = dirTotal > 0 ? Math.round((dirDone / dirTotal) * 100) : 0;

    const combined = Math.round(pct * 0.6 + dirPct * 0.4);
    const color = combined >= 70 ? '#34c759' : combined >= 40 ? '#ff9500' : '#ff3b30';
    const label = combined >= 70 ? 'Hệ thống ổn định' : combined >= 40 ? 'Cần chú ý, có rủi ro' : 'Báo động — cần hành động ngay';

    const circumference = 2 * Math.PI * 60;
    const offset = circumference - (combined / 100) * circumference;

    $('#healthScore').innerHTML = `
      <div class="health-score-ring">
        <svg viewBox="0 0 140 140">
          <circle class="track" cx="70" cy="70" r="60"/>
          <circle class="fill" cx="70" cy="70" r="60"
            stroke="${color}"
            stroke-dasharray="${circumference}"
            stroke-dashoffset="${offset}"/>
        </svg>
        <div class="health-score-value" style="color:${color}">
          ${combined}<span class="health-score-pct">%</span>
        </div>
      </div>
      <div class="health-label">Điểm sức khoẻ tổng thể</div>
      <div class="health-desc">${label}</div>
      <div style="display:flex;justify-content:center;gap:20px;margin-top:14px;font-size:0.72rem;color:var(--text-secondary)">
        <span>Chiến lược: ${pct}% (${ok}/${total})</span>
        <span>Thực thi: ${dirPct}% (${dirDone}/${dirTotal})</span>
      </div>
    `;
  }

  function renderTrafficLights() {
    const levels = { green: 0, yellow: 0, red: 0, black: 0 };
    data.directives.forEach(d => {
      const lvl = getUrgencyLevel(d);
      if (lvl !== 'done' && levels[lvl] !== undefined) levels[lvl]++;
    });

    $('#trafficLights').innerHTML = `
      <div class="tl-card">
        <div class="tl-dot green"></div>
        <div class="tl-count" style="color:var(--green)">${levels.green}</div>
        <div class="tl-label">Đúng tiến độ</div>
        <div class="tl-threshold">Ổn định</div>
      </div>
      <div class="tl-card">
        <div class="tl-dot yellow"></div>
        <div class="tl-count" style="color:var(--orange)">${levels.yellow}</div>
        <div class="tl-label">Sắp đến hạn</div>
        <div class="tl-threshold">Cần theo dõi</div>
      </div>
      <div class="tl-card">
        <div class="tl-dot red"></div>
        <div class="tl-count" style="color:var(--red)">${levels.red}</div>
        <div class="tl-label">Quá hạn</div>
        <div class="tl-threshold">&lt;2 tuần</div>
      </div>
      <div class="tl-card">
        <div class="tl-dot black"></div>
        <div class="tl-count" style="color:var(--black-signal)">${levels.black}</div>
        <div class="tl-label">Báo động</div>
        <div class="tl-threshold">&gt;2 tuần quá</div>
      </div>
    `;
  }

  function renderPillarsGrid() {
    const el = $('#pillarsGrid');
    el.innerHTML = data.outcomesSections.map(sec => {
      const items = data.outcomes.filter(o => o.section === sec.id);
      const total = items.length;
      const ok = items.filter(o => o.status === '✅').length;
      const pct = total > 0 ? Math.round((ok / total) * 100) : 0;
      const color = pct >= 70 ? '#34c759' : pct >= 40 ? '#ff9500' : '#ff3b30';

      return `
        <div class="pillar-card" data-section="${sec.id}">
          <div class="pillar-range">${sec.hm_range}</div>
          <div class="pillar-name">${sec.name}</div>
          <div class="pillar-bar-track">
            <div class="pillar-bar-fill" style="width:${pct}%;background:${color}"></div>
          </div>
          <div class="pillar-stats">
            <span style="color:${color}">${pct}% hoàn thành</span>
            <span>${ok}/${total}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderFunnel() {
    const stages = [
      { key: 'cho_xac_nhan', label: 'Chờ xác nhận', color: '#ff9500' },
      { key: 'da_xac_nhan_5t', label: 'Đã xác nhận 5T', color: '#5ac8fa' },
      { key: 'dang_thuc_hien', label: 'Đang thực hiện', color: '#007aff' },
      { key: 'hoan_thanh', label: 'Hoàn thành', color: '#34c759' },
      { key: 'can_lam_ro', label: 'Cần làm rõ', color: '#ff3b30' }
    ];

    const total = data.directives.length || 1;
    const el = $('#funnelCard');
    el.innerHTML = '<div class="funnel-stages">' + stages.map(s => {
      const count = data.directives.filter(d => d.trang_thai === s.key).length;
      const pct = (count / total * 100);
      return `
        <div class="funnel-stage">
          <span class="funnel-label">${s.label}</span>
          <div class="funnel-bar-wrap">
            <div class="funnel-bar-outer">
              <div class="funnel-bar-inner" style="width:${pct}%;background:${s.color}">
                ${pct > 15 ? `<span class="funnel-bar-label">${Math.round(pct)}%</span>` : ''}
              </div>
            </div>
          </div>
          <span class="funnel-count" style="color:${s.color}">${count}</span>
        </div>
      `;
    }).join('') + '</div>';
  }

  // ===== TAB 2: LEO THANG (ĐÚNG NGHĨA) =====
  // Leo thang = từ 50 HM chiến lược gốc → sinh ra chỉ đạo cụ thể hàng ngày
  // Hướng nhìn: HM gốc → đã triển khai thành bao nhiêu DIR → tình trạng thế nào

  function renderEscalationSummary() {
    const el = $('#escalationSummary');

    // Count linked vs unlinked
    const linked = data.directives.filter(d => d.hm50_ref);
    const unlinked = data.directives.filter(d => !d.hm50_ref);

    // Which HMs have been activated (have at least 1 DIR)
    const activatedHMs = new Set(linked.map(d => d.hm50_ref));
    const totalHM = data.outcomes.length;
    const activatedCount = activatedHMs.size;
    const dormantCount = totalHM - activatedCount;

    // HMs with urgent dirs
    const urgentHMs = new Set();
    linked.forEach(d => {
      const lvl = getUrgencyLevel(d);
      if (lvl === 'red' || lvl === 'black') urgentHMs.add(d.hm50_ref);
    });

    el.innerHTML = `
      <div class="esc-summary-grid">
        <div class="esc-summary-card">
          <div class="esc-summary-num" style="color:#007aff">${totalHM}</div>
          <div class="esc-summary-label">Chiến lược gốc</div>
          <div class="esc-summary-sub">50 HM đầu năm</div>
        </div>
        <div class="esc-summary-card">
          <div class="esc-summary-num" style="color:#34c759">${activatedCount}</div>
          <div class="esc-summary-label">Đã kích hoạt</div>
          <div class="esc-summary-sub">Có chỉ đạo triển khai</div>
        </div>
        <div class="esc-summary-card">
          <div class="esc-summary-num" style="color:#8e8e93">${dormantCount}</div>
          <div class="esc-summary-label">Chưa triển khai</div>
          <div class="esc-summary-sub">Chưa có chỉ đạo mới</div>
        </div>
        <div class="esc-summary-card">
          <div class="esc-summary-num" style="color:#ff9500">${unlinked.length}</div>
          <div class="esc-summary-label">Phát sinh mới</div>
          <div class="esc-summary-sub">Ngoài 50 HM gốc</div>
        </div>
      </div>

      <div class="esc-ratio-card">
        <div class="esc-ratio-header">
          <span>Tỷ lệ kích hoạt chiến lược</span>
          <span style="color:#007aff;font-weight:700">${Math.round(activatedCount / totalHM * 100)}%</span>
        </div>
        <div class="pillar-bar-track" style="margin-top:8px">
          <div class="pillar-bar-fill" style="width:${activatedCount / totalHM * 100}%;background:#007aff"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:0.68rem;color:var(--text-tertiary);margin-top:6px">
          <span>${activatedCount}/${totalHM} HM đã có chỉ đạo triển khai</span>
          <span>${data.directives.length} chỉ đạo BOD tất cả</span>
        </div>
      </div>

      ${urgentHMs.size > 0 ? `
      <div class="esc-ratio-card" style="border-left:3px solid var(--red)">
        <div style="font-size:0.78rem;font-weight:600;color:var(--red);margin-bottom:6px">
          ${urgentHMs.size} chiến lược gốc có chỉ đạo quá hạn
        </div>
        <div style="font-size:0.72rem;color:var(--text-secondary);line-height:1.5">
          ${[...urgentHMs].map(hmId => {
            const hm = data.outcomes.find(o => o.id === hmId);
            return hm ? `${hmId}: ${hm.name}` : hmId;
          }).join(' — ')}
        </div>
      </div>` : ''}
    `;
  }

  function renderEscalationFromHM() {
    const el = $('#escalationFromHM');

    // Group directives by their HM root
    const hmGroups = {};
    data.directives.filter(d => d.hm50_ref).forEach(d => {
      if (!hmGroups[d.hm50_ref]) hmGroups[d.hm50_ref] = [];
      hmGroups[d.hm50_ref].push(d);
    });

    if (Object.keys(hmGroups).length === 0) {
      el.innerHTML = '<div class="action-group"><div class="action-group-header"><span class="action-group-title">Chưa có chỉ đạo nào liên kết với HM gốc</span></div></div>';
      return;
    }

    // Sort by number of dirs (most active first)
    const sorted = Object.entries(hmGroups).sort((a, b) => b[1].length - a[1].length);

    el.innerHTML = sorted.map(([hmId, dirs]) => {
      const hm = data.outcomes.find(o => o.id === hmId);
      if (!hm) return '';

      const si = STATUS_ICONS[hm.status] || STATUS_ICONS['❌'];
      const sec = data.outcomesSections.find(s => s.id === hm.section);

      return `
        <div class="esc-hm-group">
          <div class="esc-hm-root">
            <div class="esc-hm-root-left">
              <div class="esc-hm-badge" style="background:${si.color}15;color:${si.color}">${hmId}</div>
              <div>
                <div class="esc-hm-name">${hm.name}</div>
                <div class="esc-hm-pillar">${sec ? sec.name : ''} — ${hm.dau_moi}</div>
              </div>
            </div>
            <div class="esc-hm-count">${dirs.length} chỉ đạo</div>
          </div>
          <div class="esc-hm-children">
            ${dirs.map(d => {
              const lvl = getUrgencyLevel(d);
              const daysInfo = getDaysInfo(d);
              return `
                <div class="esc-child-card" data-id="${d.id}">
                  <div class="esc-child-connector"></div>
                  <div class="esc-child-content">
                    <div class="esc-child-header">
                      <span class="dc-id">${d.id}</span>
                      <span class="dc-esc-badge ${lvl}">${URGENCY_LABELS[lvl]}</span>
                    </div>
                    <div class="esc-child-task">${d.nhiem_vu}</div>
                    <div class="dc-meta">
                      <span class="dc-meta-item">${icon('person')} ${d.dau_moi}</span>
                      <span class="dc-meta-item" style="${lvl === 'red' || lvl === 'black' ? 'color:var(--red)' : ''}">${icon('clock')} ${daysInfo}</span>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');
  }

  function renderEscalationNewDirs() {
    const el = $('#escalationNewDirs');
    const unlinked = data.directives.filter(d => !d.hm50_ref);

    if (unlinked.length === 0) {
      el.innerHTML = `
        <div class="esc-ratio-card" style="border-left:3px solid var(--green)">
          <div style="font-size:0.78rem;font-weight:600;color:var(--green)">
            Tất cả chỉ đạo đều nằm trong chiến lược
          </div>
          <div style="font-size:0.72rem;color:var(--text-secondary);margin-top:4px">
            Không có chỉ đạo nào phát sinh ngoài 50 HM gốc. Hệ thống đang chạy đúng chiến lược.
          </div>
        </div>
      `;
      return;
    }

    el.innerHTML = `
      <div class="esc-ratio-card" style="border-left:3px solid var(--orange)">
        <div style="font-size:0.78rem;font-weight:600;color:var(--orange);margin-bottom:8px">
          ${unlinked.length} chỉ đạo không thuộc 50 HM chiến lược
        </div>
        <div style="font-size:0.72rem;color:var(--text-secondary);margin-bottom:12px">
          Những chỉ đạo này phát sinh từ thực tiễn, chưa nằm trong tầm nhìn đầu năm. Cần xem xét: bổ sung vào chiến lược hay xử lý riêng?
        </div>
        ${unlinked.map(d => {
          const lvl = getUrgencyLevel(d);
          return `
            <div class="directive-card esc-${lvl}" data-id="${d.id}">
              <div class="dc-header">
                <span class="dc-id">${d.id}</span>
                <span class="dc-esc-badge" style="background:var(--orange)15;color:var(--orange)">Ngoài chiến lược</span>
              </div>
              <div class="dc-task">${d.nhiem_vu}</div>
              <div class="dc-meta">
                <span class="dc-meta-item">${icon('person')} ${d.dau_moi}</span>
                <span class="dc-meta-item">${icon('clock')} ${getDaysInfo(d)}</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function renderEscalationTimeline() {
    const el = $('#escalationTimeline');

    // Group directives by meeting date
    const byMeeting = {};
    data.directives.forEach(d => {
      const date = d.meeting_id || 'Không rõ';
      if (!byMeeting[date]) byMeeting[date] = [];
      byMeeting[date].push(d);
    });

    const meetingDates = Object.keys(byMeeting).sort().reverse();

    el.innerHTML = `
      <div class="timeline-container">
        ${meetingDates.map(meetId => {
          const dirs = byMeeting[meetId];
          const linked = dirs.filter(d => d.hm50_ref);
          const unlinked = dirs.filter(d => !d.hm50_ref);
          const date = dirs[0]?.created_at ? new Date(dirs[0].created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : meetId;

          // Unique HM roots touched in this meeting
          const hmRoots = [...new Set(linked.map(d => d.hm50_ref))];

          return `
            <div class="timeline-entry">
              <div class="timeline-dot"></div>
              <div class="timeline-content">
                <div class="timeline-date">${meetId} — ${date}</div>
                <div class="timeline-stats">
                  ${dirs.length} chỉ đạo ban hành —
                  ${linked.length} leo thang từ ${hmRoots.length} HM gốc
                  ${unlinked.length > 0 ? `, ${unlinked.length} phát sinh mới` : ''}
                </div>
                <div class="timeline-hm-tags">
                  ${hmRoots.map(hmId => {
                    const hm = data.outcomes.find(o => o.id === hmId);
                    return `<span class="timeline-tag">${hmId}: ${hm ? hm.name.substring(0, 30) : ''}${hm && hm.name.length > 30 ? '...' : ''}</span>`;
                  }).join('')}
                  ${unlinked.length > 0 ? `<span class="timeline-tag new">+${unlinked.length} mới</span>` : ''}
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function getDaysInfo(d) {
    if (d.trang_thai === 'hoan_thanh') return 'Đã hoàn thành';
    if (!d.thoi_han) return 'Chưa có deadline';
    const now = new Date();
    const deadline = new Date(d.thoi_han);
    const days = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
    if (days < 0) return `Quá hạn ${Math.abs(days)} ngày`;
    if (days === 0) return 'Hôm nay là deadline';
    return `Còn ${days} ngày`;
  }

  // ===== TAB 3: CHIẾN LƯỢC =====

  function renderStrategyMap() {
    const el = $('#strategyMap');
    el.innerHTML = data.outcomesSections.map(sec => {
      const items = data.outcomes.filter(o => o.section === sec.id);
      const total = items.length;
      const ok = items.filter(o => o.status === '✅').length;
      const pct = total > 0 ? Math.round((ok / total) * 100) : 0;
      const color = pct >= 70 ? '#34c759' : pct >= 40 ? '#ff9500' : '#ff3b30';

      const linkedDirs = data.directives.filter(d => {
        const hmNum = d.hm50_ref ? parseInt(d.hm50_ref.replace('HM-', '')) : -1;
        const rangeMatch = sec.hm_range.match(/HM (\d+)-(\d+)/);
        if (!rangeMatch) return false;
        return hmNum >= parseInt(rangeMatch[1]) && hmNum <= parseInt(rangeMatch[2]);
      });

      const outcomeText = SECTION_OUTCOMES[sec.id] || '';

      return `
        <div class="strategy-section">
          <div class="strat-header">
            <div>
              <div style="font-size:0.62rem;color:var(--text-tertiary);font-weight:600;margin-bottom:2px">${sec.hm_range}</div>
              <div class="strat-title">${sec.name}</div>
            </div>
            <div class="strat-score" style="background:${color}15;color:${color}">${pct}%</div>
          </div>

          <div class="strat-outcome">
            <div class="strat-outcome-label">Dẫn đến đâu?</div>
            <div class="strat-outcome-text">${outcomeText}</div>
          </div>

          ${linkedDirs.length > 0 ? `
          <div class="strat-outcome">
            <div class="strat-outcome-label">Chỉ đạo BOD liên quan (${linkedDirs.length})</div>
            ${linkedDirs.map(d => {
              const lvl = getUrgencyLevel(d);
              return `<div class="strat-item" data-id="${d.id}">
                <div class="strat-item-dot" style="background:${URGENCY_COLORS[lvl]}"></div>
                <span class="strat-item-name">${d.nhiem_vu.substring(0, 60)}${d.nhiem_vu.length > 60 ? '...' : ''}</span>
                <span class="strat-item-owner">${d.dau_moi}</span>
              </div>`;
            }).join('')}
          </div>` : ''}

          <div class="strat-outcome">
            <div class="strat-outcome-label">${total} hạng mục chiến lược</div>
            <div class="strat-items">
              ${items.map(o => {
                const si = STATUS_ICONS[o.status] || STATUS_ICONS['❌'];
                return `<div class="strat-item" data-hm="${o.id}">
                  <div class="strat-item-dot" style="background:${si.color}"></div>
                  <span class="strat-item-name">${o.name}</span>
                  <span class="strat-item-owner">${o.dau_moi}</span>
                </div>`;
              }).join('')}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // ===== TAB 4: HÀNH ĐỘNG =====

  function renderUrgentActions() {
    const el = $('#urgentActions');
    const urgent = data.directives
      .filter(d => {
        const lvl = getUrgencyLevel(d);
        return lvl === 'black' || lvl === 'red' || lvl === 'yellow';
      })
      .sort((a, b) => {
        const order = { black: 0, red: 1, yellow: 2 };
        return (order[getUrgencyLevel(a)] || 9) - (order[getUrgencyLevel(b)] || 9);
      });

    if (!urgent.length) {
      el.innerHTML = '<div class="action-group"><div class="action-group-header"><span class="action-group-title">Tất cả chỉ đạo đang ổn định</span></div></div>';
      return;
    }

    el.innerHTML = `
      <div class="action-group">
        <div class="action-group-header">
          <span class="action-group-title">Chỉ đạo cần xử lý (${urgent.length})</span>
          <span class="action-group-count" style="background:rgba(255,59,48,0.1);color:var(--red)">${urgent.length}</span>
        </div>
        ${urgent.map(d => {
          const lvl = getUrgencyLevel(d);
          return `
            <div class="action-item" data-id="${d.id}">
              <div class="action-dot" style="background:${URGENCY_COLORS[lvl]}"></div>
              <div class="action-body">
                <div class="action-task">${d.nhiem_vu.substring(0, 80)}${d.nhiem_vu.length > 80 ? '...' : ''}</div>
                <div class="action-meta">${d.dau_moi} — ${getDaysInfo(d)}</div>
                ${d.hm50_ref ? `<div class="action-meta" style="color:var(--blue)">Leo thang từ: ${d.hm50_ref} — ${d.hm50_name || ''}</div>` : `<div class="action-meta" style="color:var(--orange)">Phát sinh ngoài chiến lược</div>`}
                <div class="action-suggest">Hành động: ${ACTION_SUGGESTIONS[lvl]}</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function renderActionsByStatus() {
    const el = $('#actionsByStatus');
    const groups = [
      {
        status: '❌', label: 'Blind spot — Cần hành động gấp',
        desc: 'Chưa có chủ, chưa ai chịu trách nhiệm. Cần chỉ định đầu mối và deadline cụ thể.',
        color: '#ff3b30'
      },
      {
        status: '⚠️', label: 'Chưa chủ động — Cần thúc đẩy',
        desc: 'Có nhắc nhưng chưa có hành động cụ thể. Cần chỉ định người theo dõi và cam kết tiến độ.',
        color: '#ff9500'
      },
      {
        status: '✅', label: 'Đang tốt — Giữ nguyên và nhân rộng',
        desc: 'Đã có chủ, đang thực hiện. Tiếp tục giám sát và chia sẻ kinh nghiệm cho nhóm khác.',
        color: '#34c759'
      }
    ];

    el.innerHTML = groups.map(g => {
      const items = data.outcomes.filter(o => o.status === g.status);
      return `
        <div class="action-group">
          <div class="action-group-header">
            <span class="action-group-title" style="color:${g.color}">${g.label}</span>
            <span class="action-group-count" style="background:${g.color}15;color:${g.color}">${items.length}</span>
          </div>
          <div style="padding:10px 16px;font-size:0.72rem;color:var(--text-secondary);border-bottom:0.5px solid var(--border-light)">${g.desc}</div>
          ${items.slice(0, 5).map(o => `
            <div class="action-item" data-hm="${o.id}">
              <div class="action-dot" style="background:${g.color}"></div>
              <div class="action-body">
                <div class="action-task">${o.name}</div>
                <div class="action-meta">${o.dau_moi} — ${o.deadline}</div>
              </div>
            </div>
          `).join('')}
          ${items.length > 5 ? `<div style="padding:8px 16px;text-align:center;font-size:0.72rem;color:var(--text-tertiary)">+ ${items.length - 5} mục khác</div>` : ''}
        </div>
      `;
    }).join('');
  }

  function renderProgressTracking() {
    const el = $('#progressTracking');
    const personDirs = {};
    data.directives.forEach(d => {
      if (!personDirs[d.dau_moi]) personDirs[d.dau_moi] = { total: 0, done: 0 };
      personDirs[d.dau_moi].total++;
      if (d.trang_thai === 'hoan_thanh') personDirs[d.dau_moi].done++;
    });

    el.innerHTML = `
      <div class="progress-card">
        ${Object.entries(personDirs).map(([person, pData], i) => {
          const pct = Math.round((pData.done / pData.total) * 100);
          const color = PEOPLE_COLORS[i % PEOPLE_COLORS.length];
          return `
            <div class="progress-row">
              <span class="progress-person">${person}</span>
              <div class="progress-track">
                <div class="progress-fill" style="width:${pct}%;background:${color}"></div>
              </div>
              <span class="progress-pct" style="color:${color}">${pData.done}/${pData.total}</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // ===== MODAL =====
  function showDirectiveModal(id) {
    const d = data.directives.find(x => x.id === id);
    if (!d) return;
    const lvl = getUrgencyLevel(d);
    const hm = data.outcomes.find(o => o.id === d.hm50_ref);
    const isLinked = !!d.hm50_ref;
    const body = $('#modalBody');
    body.innerHTML = `
      <div class="modal-title">${d.nhiem_vu}</div>
      <div style="margin-bottom:16px;display:flex;gap:8px;flex-wrap:wrap">
        <span class="dc-esc-badge ${lvl}" style="font-size:0.75rem;padding:4px 14px">
          ${URGENCY_LABELS[lvl]}
        </span>
        ${isLinked ? `
          <span class="dc-esc-badge" style="font-size:0.75rem;padding:4px 14px;background:#007aff15;color:#007aff">
            Leo thang từ ${d.hm50_ref}
          </span>
        ` : `
          <span class="dc-esc-badge" style="font-size:0.75rem;padding:4px 14px;background:#ff950015;color:#ff9500">
            Phát sinh ngoài chiến lược
          </span>
        `}
      </div>

      ${isLinked && hm ? `
      <div class="modal-section">
        <div class="modal-section-title">Nguồn gốc chiến lược</div>
        <div class="modal-row"><span class="modal-row-label">Chiến lược gốc</span><span class="modal-row-value">${d.hm50_ref}: ${hm.name}</span></div>
        <div class="modal-row"><span class="modal-row-label">Target gốc</span><span class="modal-row-value">${hm.target}</span></div>
        <div class="modal-row"><span class="modal-row-label">Dẫn đến</span><span class="modal-row-value">${SECTION_OUTCOMES[hm.section] || '—'}</span></div>
      </div>` : `
      <div class="modal-section" style="border-left:3px solid var(--orange)">
        <div class="modal-section-title">Phát sinh ngoài chiến lược</div>
        <div style="font-size:0.82rem;color:var(--text-secondary);line-height:1.5;padding:4px 0">
          Chỉ đạo này không nằm trong 50 HM chiến lược đầu năm. Cần xem xét: có nên bổ sung vào chiến lược không?
        </div>
      </div>`}

      <div class="modal-section">
        <div class="modal-section-title">5T Chi tiết</div>
        <div class="modal-row"><span class="modal-row-label">T1 Đầu mối</span><span class="modal-row-value">${d.dau_moi}</span></div>
        <div class="modal-row"><span class="modal-row-label">T2 Nhiệm vụ</span><span class="modal-row-value">${d.nhiem_vu}</span></div>
        <div class="modal-row"><span class="modal-row-label">T3 Chỉ tiêu</span><span class="modal-row-value">${d.chi_tieu || '—'}</span></div>
        <div class="modal-row"><span class="modal-row-label">T4 Thời hạn</span><span class="modal-row-value">${d.thoi_han || '—'} (${getDaysInfo(d)})</span></div>
        <div class="modal-row"><span class="modal-row-label">T5 Liên quan</span><span class="modal-row-value">${(d.thanh_vien_lien_quan || []).map(t => `<span class="modal-tag">${t}</span>`).join(' ') || '—'}</span></div>
      </div>

      ${(lvl === 'yellow' || lvl === 'red' || lvl === 'black') ? `
      <div class="modal-section">
        <div class="modal-section-title">Hành động đề xuất</div>
        <div style="padding:10px 14px;background:${URGENCY_COLORS[lvl]}08;border:1px solid ${URGENCY_COLORS[lvl]}20;border-radius:var(--radius-sm);font-size:0.82rem;color:var(--text-primary);line-height:1.5">
          ${ACTION_SUGGESTIONS[lvl]}
        </div>
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
    const si = STATUS_ICONS[hm.status] || STATUS_ICONS['❌'];
    const body = $('#modalBody');
    body.innerHTML = `
      <div class="modal-title">${hm.name}</div>
      <div style="margin-bottom:16px;display:flex;gap:8px;flex-wrap:wrap">
        <span class="dc-esc-badge" style="background:${si.color}15;color:${si.color};font-size:0.75rem;padding:4px 14px">
          ${hm.status === '✅' ? 'Có chủ' : hm.status === '⚠️' ? 'Chưa chủ' : 'Blind spot'}
        </span>
        <span class="dc-esc-badge" style="background:#007aff15;color:#007aff;font-size:0.75rem;padding:4px 14px">
          ${linkedDirs.length} chỉ đạo leo thang
        </span>
      </div>
      <div class="modal-section">
        <div class="modal-section-title">Chi tiết hạng mục chiến lược</div>
        <div class="modal-row"><span class="modal-row-label">Đầu mối</span><span class="modal-row-value">${hm.dau_moi}</span></div>
        <div class="modal-row"><span class="modal-row-label">Nhiệm vụ</span><span class="modal-row-value">${hm.task}</span></div>
        <div class="modal-row"><span class="modal-row-label">Target</span><span class="modal-row-value">${hm.target}</span></div>
        <div class="modal-row"><span class="modal-row-label">Deadline</span><span class="modal-row-value">${hm.deadline}</span></div>
      </div>
      <div class="modal-section">
        <div class="modal-section-title">Dẫn đến đâu?</div>
        <div style="font-size:0.82rem;line-height:1.5;color:var(--text-primary)">${SECTION_OUTCOMES[hm.section] || '—'}</div>
      </div>
      ${linkedDirs.length ? `
      <div class="modal-section">
        <div class="modal-section-title">Chỉ đạo BOD leo thang (${linkedDirs.length})</div>
        ${linkedDirs.map(d => {
          const lvl = getUrgencyLevel(d);
          return `<div class="modal-row" style="flex-direction:column;gap:4px">
            <span style="font-size:0.75rem;color:${URGENCY_COLORS[lvl]};font-weight:600">${d.id} — ${URGENCY_LABELS[lvl]}</span>
            <span style="font-size:0.82rem">${d.nhiem_vu}</span>
            <span style="font-size:0.72rem;color:var(--text-tertiary)">${d.dau_moi} — ${getDaysInfo(d)}</span>
          </div>`;
        }).join('')}
      </div>` : `
      <div class="modal-section" style="border-left:3px solid var(--text-tertiary)">
        <div class="modal-section-title">Chưa có chỉ đạo triển khai</div>
        <div style="font-size:0.82rem;color:var(--text-secondary);line-height:1.5">
          Chiến lược này chưa được kích hoạt thành chỉ đạo BOD cụ thể. Cần xem xét: đã triển khai ngầm hay bỏ sót?
        </div>
      </div>`}
      ${hm.status !== '✅' ? `
      <div class="modal-section">
        <div class="modal-section-title">Hành động đề xuất</div>
        <div style="padding:10px 14px;background:${si.color}08;border:1px solid ${si.color}20;border-radius:var(--radius-sm);font-size:0.82rem;color:var(--text-primary);line-height:1.5">
          ${hm.status === '❌' ? 'Cần chỉ định đầu mối chính thức, lập deadline rõ ràng, và cam kết 5T. Đây là blind spot — không hành động = không kết quả.' :
            'Cần thúc đẩy hành động cụ thể. Đầu mối cần báo cáo tiến độ hàng tuần, đặt mốc trung gian, và cam kết deadline.'}
        </div>
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

    document.addEventListener('click', (e) => {
      const dirCard = e.target.closest('[data-id]');
      if (dirCard) { showDirectiveModal(dirCard.dataset.id); return; }
      const hmCard = e.target.closest('[data-hm]');
      if (hmCard) { showHM50Modal(hmCard.dataset.hm); return; }
      const pillarCard = e.target.closest('.pillar-card[data-section]');
      if (pillarCard) {
        $$('.tab').forEach(t => t.classList.remove('active'));
        $$('.tab-panel').forEach(p => p.classList.remove('active'));
        $$('.tab')[2].classList.add('active');
        $('#tab-strategy').classList.add('active');
        return;
      }
    });

    $('#modalClose').addEventListener('click', closeModal);
    $('.modal-backdrop').addEventListener('click', closeModal);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

    $('#btnRefresh').addEventListener('click', async () => {
      const btn = $('#btnRefresh');
      btn.textContent = '...';
      try {
        const [dir, meet, out, ppl, log] = await Promise.all([
          fetchJSON(FILES.directives + '?t=' + Date.now()), fetchJSON(FILES.meetings + '?t=' + Date.now()),
          fetchJSON(FILES.outcomes + '?t=' + Date.now()), fetchJSON(FILES.people + '?t=' + Date.now()),
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
      } catch (err) { console.error('Lỗi làm mới:', err); }
      btn.textContent = 'Làm mới';
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
