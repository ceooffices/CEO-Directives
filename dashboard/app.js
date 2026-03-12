/* =============================================
   CEO Dashboard — App Logic v3
   Chiến lược → Leo thang → Kết quả → Hành động
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

  // Escalation logic based on HM-47: Xanh ≥90%, Vàng 70-89%, Đỏ <70%, Đen = Đỏ >2 tuần
  // For directives: calculate escalation based on timeline and status
  function getEscalationLevel(d) {
    if (d.trang_thai === 'hoan_thanh') return 'done';
    const now = new Date();
    const deadline = d.thoi_han ? new Date(d.thoi_han) : null;
    if (!deadline) return 'green';
    const daysLeft = (deadline - now) / (1000 * 60 * 60 * 24);
    const totalDays = (deadline - new Date(d.created_at)) / (1000 * 60 * 60 * 24);
    const elapsed = totalDays - daysLeft;
    const pctElapsed = totalDays > 0 ? (elapsed / totalDays) * 100 : 0;

    if (daysLeft < -14) return 'black';  // Quá hạn >2 tuần = ĐEN
    if (daysLeft < 0) return 'red';       // Quá hạn = ĐỎ
    if (daysLeft < 3 || pctElapsed > 80) return 'yellow'; // Sắp đến hạn = VÀNG
    return 'green';
  }

  const ESC_LABELS = {
    green: 'Xanh', yellow: 'Vàng', red: 'Đỏ', black: 'Đen', done: 'Hoàn thành'
  };

  const ESC_COLORS = {
    green: '#34c759', yellow: '#ff9500', red: '#ff3b30', black: '#1c1c1e', done: '#5ac8fa'
  };

  const STATUS_ICONS = {
    '✅': { cls: 'green', color: '#34c759' },
    '⚠️': { cls: 'yellow', color: '#ff9500' },
    '❌': { cls: 'red', color: '#ff3b30' }
  };

  const PEOPLE_COLORS = ['#007aff', '#af52de', '#5ac8fa', '#34c759', '#ff9500', '#ff2d55', '#5856d6', '#ff3b30', '#ffcc00'];

  // Section strategic outcomes — what each pillar LEADS TO
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

  // What actions to take based on results
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
    chevron: '<svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>'
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
      console.error('Failed to load data:', err);
      const splash = $('#splash');
      if (splash) {
        splash.querySelector('p').textContent = 'Lỗi tải dữ liệu';
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
    tick(); setInterval(tick, 30000);
  }

  // ===== RENDER ALL =====
  function renderAll() {
    renderHealthScore();
    renderTrafficLights();
    renderPillarsGrid();
    renderFunnel();
    renderEscalationPipeline();
    renderEscalationList();
    renderStrategyMap();
    renderUrgentActions();
    renderActionsByStatus();
    renderProgressTracking();
  }

  // ===== TAB 1: BỨC TRANH TỔNG =====

  function renderHealthScore() {
    const total = data.outcomes.length || 50;
    const ok = data.outcomes.filter(o => o.status === '✅').length;
    const pct = Math.round((ok / total) * 100);

    // Calculate directive health too
    const dirDone = data.directives.filter(d => d.trang_thai === 'hoan_thanh').length;
    const dirTotal = data.directives.length;
    const dirPct = dirTotal > 0 ? Math.round((dirDone / dirTotal) * 100) : 0;

    // Combined score weighted: 60% strategy completion, 40% directive execution
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
      const lvl = getEscalationLevel(d);
      if (lvl !== 'done' && levels[lvl] !== undefined) levels[lvl]++;
    });

    const doneCount = data.directives.filter(d => d.trang_thai === 'hoan_thanh').length;

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
      const warn = items.filter(o => o.status === '⚠️').length;
      const fail = items.filter(o => o.status === '❌').length;
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

  // ===== TAB 2: LEO THANG =====

  function renderEscalationPipeline() {
    const levels = [
      { key: 'green', label: 'Xanh — Đúng tiến độ', desc: 'Chỉ đạo đang triển khai tốt, chưa gặp rào cản gì.', color: '#34c759' },
      { key: 'yellow', label: 'Vàng — Sắp đến hạn', desc: 'Còn dưới 3 ngày hoặc đã qua 80% thời gian. Cần theo dõi sát và đảm bảo tiến độ.', color: '#ff9500' },
      { key: 'red', label: 'Đỏ — Quá hạn', desc: 'Đã quá deadline nhưng chưa vượt 2 tuần. Cần họp khẩn với đầu mối, tái phân bổ nguồn lực.', color: '#ff3b30' },
      { key: 'black', label: 'Đen — Báo động', desc: 'Quá hạn trên 2 tuần. CEO cần can thiệp trực tiếp, có thể cần thay đầu mối hoặc ưu tiên lại.', color: '#1c1c1e' }
    ];

    const grouped = {};
    data.directives.forEach(d => {
      const lvl = getEscalationLevel(d);
      if (lvl === 'done') return;
      if (!grouped[lvl]) grouped[lvl] = [];
      grouped[lvl].push(d);
    });

    const el = $('#escalationPipeline');
    el.innerHTML = '<div class="esc-timeline">' + levels.map(l => {
      const items = grouped[l.key] || [];
      return `
        <div class="esc-level">
          <div class="esc-dot" style="background:${l.color}"></div>
          <div class="esc-level-header">
            <span class="esc-level-name" style="color:${l.color}">${l.label}</span>
            <span class="esc-level-count" style="color:${l.color}">${items.length}</span>
          </div>
          <div class="esc-level-desc">${l.desc}</div>
          ${items.length > 0 ? `<div class="esc-level-items">
            ${items.slice(0, 3).map(d => `
              <div class="esc-item" data-id="${d.id}">
                ${d.nhiem_vu.substring(0, 80)}${d.nhiem_vu.length > 80 ? '...' : ''}
                <div class="esc-item-meta">${d.dau_moi} — Hạn: ${d.thoi_han || '—'}</div>
              </div>
            `).join('')}
            ${items.length > 3 ? `<div class="esc-item" style="color:var(--text-tertiary);text-align:center">+${items.length - 3} chỉ đạo khác</div>` : ''}
          </div>` : ''}
        </div>
      `;
    }).join('') + '</div>';
  }

  function renderEscalationList() {
    const el = $('#escalationList');
    // Sort by escalation level: black first, then red, yellow, green, done
    const order = { black: 0, red: 1, yellow: 2, green: 3, done: 4 };
    const sorted = [...data.directives].sort((a, b) => {
      return (order[getEscalationLevel(a)] || 5) - (order[getEscalationLevel(b)] || 5);
    });

    el.innerHTML = sorted.map(d => {
      const lvl = getEscalationLevel(d);
      const daysInfo = getDaysInfo(d);
      return `
        <div class="directive-card esc-${lvl}" data-id="${d.id}">
          <div class="dc-header">
            <span class="dc-id">${d.id}</span>
            <span class="dc-esc-badge ${lvl}">${ESC_LABELS[lvl]}</span>
          </div>
          <div class="dc-task">${d.nhiem_vu}</div>
          <div class="dc-meta">
            <span class="dc-meta-item">${icon('person')} ${d.dau_moi}</span>
            <span class="dc-meta-item" style="${lvl === 'red' || lvl === 'black' ? 'color:var(--red)' : ''}">${icon('clock')} ${daysInfo}</span>
            <span class="dc-meta-item">${icon('target')} ${d.hm50_ref || '—'}</span>
          </div>
          ${(lvl === 'red' || lvl === 'black') ? `<div class="dc-esc-reason">Hành động: ${ACTION_SUGGESTIONS[lvl]}</div>` : ''}
        </div>
      `;
    }).join('');
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

      // Find linked directives
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
              const lvl = getEscalationLevel(d);
              return `<div class="strat-item" data-id="${d.id}">
                <div class="strat-item-dot" style="background:${ESC_COLORS[lvl]}"></div>
                <span class="strat-item-name">${d.nhiem_vu.substring(0, 60)}${d.nhiem_vu.length > 60 ? '...' : ''}</span>
                <span class="strat-item-owner">${d.dau_moi}</span>
              </div>`;
            }).join('')}
          </div>` : ''}

          <div class="strat-outcome">
            <div class="strat-outcome-label">${total} hạng mục chỉ đạo</div>
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
    // Find directives that need action: overdue, approaching deadline, or missing info
    const urgent = data.directives
      .filter(d => {
        const lvl = getEscalationLevel(d);
        return lvl === 'black' || lvl === 'red' || lvl === 'yellow';
      })
      .sort((a, b) => {
        const order = { black: 0, red: 1, yellow: 2 };
        return (order[getEscalationLevel(a)] || 9) - (order[getEscalationLevel(b)] || 9);
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
          const lvl = getEscalationLevel(d);
          return `
            <div class="action-item" data-id="${d.id}">
              <div class="action-dot" style="background:${ESC_COLORS[lvl]}"></div>
              <div class="action-body">
                <div class="action-task">${d.nhiem_vu.substring(0, 80)}${d.nhiem_vu.length > 80 ? '...' : ''}</div>
                <div class="action-meta">${d.dau_moi} — ${getDaysInfo(d)}</div>
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
    // Group HM50 outcomes by status and suggest actions
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
    // Per-person progress
    const personDirs = {};
    data.directives.forEach(d => {
      if (!personDirs[d.dau_moi]) personDirs[d.dau_moi] = { total: 0, done: 0 };
      personDirs[d.dau_moi].total++;
      if (d.trang_thai === 'hoan_thanh') personDirs[d.dau_moi].done++;
    });

    el.innerHTML = `
      <div class="progress-card">
        ${Object.entries(personDirs).map(([person, data], i) => {
          const pct = Math.round((data.done / data.total) * 100);
          const color = PEOPLE_COLORS[i % PEOPLE_COLORS.length];
          return `
            <div class="progress-row">
              <span class="progress-person">${person}</span>
              <div class="progress-track">
                <div class="progress-fill" style="width:${pct}%;background:${color}"></div>
              </div>
              <span class="progress-pct" style="color:${color}">${data.done}/${data.total}</span>
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
    const lvl = getEscalationLevel(d);
    const hm = data.outcomes.find(o => o.id === d.hm50_ref);
    const body = $('#modalBody');
    body.innerHTML = `
      <div class="modal-title">${d.nhiem_vu}</div>
      <div style="margin-bottom:16px">
        <span class="dc-esc-badge ${lvl}" style="font-size:0.75rem;padding:4px 14px">
          Đèn tín hiệu: ${ESC_LABELS[lvl]}
        </span>
      </div>
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
        <div style="padding:10px 14px;background:${ESC_COLORS[lvl]}08;border:1px solid ${ESC_COLORS[lvl]}20;border-radius:var(--radius-sm);font-size:0.82rem;color:var(--text-primary);line-height:1.5">
          ${ACTION_SUGGESTIONS[lvl]}
        </div>
      </div>` : ''}
      ${hm ? `
      <div class="modal-section">
        <div class="modal-section-title">Chiến lược liên quan: ${hm.id}</div>
        <div class="modal-row"><span class="modal-row-label">Hạng mục</span><span class="modal-row-value">${hm.name}</span></div>
        <div class="modal-row"><span class="modal-row-label">Target</span><span class="modal-row-value">${hm.target}</span></div>
        <div class="modal-row"><span class="modal-row-label">Dẫn đến</span><span class="modal-row-value">${SECTION_OUTCOMES[hm.section] || '—'}</span></div>
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
      <div style="margin-bottom:16px">
        <span class="dc-esc-badge" style="background:${si.color}15;color:${si.color};font-size:0.75rem;padding:4px 14px">
          ${hm.status === '✅' ? 'Có chủ' : hm.status === '⚠️' ? 'Chưa chủ' : 'Blind spot'}
        </span>
      </div>
      <div class="modal-section">
        <div class="modal-section-title">Chi tiết hạng mục</div>
        <div class="modal-row"><span class="modal-row-label">Đầu mối</span><span class="modal-row-value">${hm.dau_moi}</span></div>
        <div class="modal-row"><span class="modal-row-label">Task</span><span class="modal-row-value">${hm.task}</span></div>
        <div class="modal-row"><span class="modal-row-label">Target</span><span class="modal-row-value">${hm.target}</span></div>
        <div class="modal-row"><span class="modal-row-label">Deadline</span><span class="modal-row-value">${hm.deadline}</span></div>
      </div>
      <div class="modal-section">
        <div class="modal-section-title">Dẫn đến đâu?</div>
        <div style="font-size:0.82rem;line-height:1.5;color:var(--text-primary)">${SECTION_OUTCOMES[hm.section] || '—'}</div>
      </div>
      ${linkedDirs.length ? `
      <div class="modal-section">
        <div class="modal-section-title">Chỉ đạo BOD liên quan (${linkedDirs.length})</div>
        ${linkedDirs.map(d => {
          const lvl = getEscalationLevel(d);
          return `<div class="modal-row" style="flex-direction:column;gap:4px">
            <span style="font-size:0.75rem;color:${ESC_COLORS[lvl]};font-weight:600">${d.id} — ${ESC_LABELS[lvl]}</span>
            <span style="font-size:0.82rem">${d.nhiem_vu}</span>
          </div>`;
        }).join('')}
      </div>` : ''}
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

    // Delegate clicks for directive cards
    document.addEventListener('click', (e) => {
      const dirCard = e.target.closest('[data-id]');
      if (dirCard) { showDirectiveModal(dirCard.dataset.id); return; }
      const hmCard = e.target.closest('[data-hm]');
      if (hmCard) { showHM50Modal(hmCard.dataset.hm); return; }
      const pillarCard = e.target.closest('.pillar-card[data-section]');
      if (pillarCard) {
        // Switch to strategy tab and scroll to section
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
      } catch (err) { console.error('Refresh failed:', err); }
      btn.textContent = 'Làm mới';
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
