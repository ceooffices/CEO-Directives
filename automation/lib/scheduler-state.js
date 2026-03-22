/**
 * lib/scheduler-state.js
 * Snapshot management cho AI Scheduler
 * 
 * Lưu/đọc/diff trạng thái dữ liệu giữa các checkpoint.
 * State lưu trong file JSON đơn giản (không cần DB thêm).
 */

const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, '..', '.scheduler-state.json');

const EMPTY_STATE = {
  timestamp: null,
  counts: { pending: 0, confirmed: 0, overdue: 0, active: 0 },
  directiveIds: { pending: [], confirmed: [], overdue: [], active: [] },
  lastWfRuns: {},      // { wf1: '2026-03-22T08:00:00', wf4: '...' }
  nextCheckMinutes: 30,
};

// ===== LOAD/SAVE =====

function loadState() {
  try {
    if (!fs.existsSync(STATE_FILE)) return { ...EMPTY_STATE };
    const raw = fs.readFileSync(STATE_FILE, 'utf8');
    return { ...EMPTY_STATE, ...JSON.parse(raw) };
  } catch {
    return { ...EMPTY_STATE };
  }
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

// ===== BUILD SNAPSHOT =====

/**
 * Tạo snapshot từ dữ liệu Supabase hiện tại
 */
async function buildSnapshot() {
  const {
    queryPendingApproval,
    queryConfirmed5T,
    queryOverdueDirectives,
    queryActiveDirectives,
  } = require('./supabase-client');

  const [pending, confirmed, overdue, active] = await Promise.all([
    queryPendingApproval().catch(() => []),
    queryConfirmed5T().catch(() => []),
    queryOverdueDirectives().catch(() => []),
    queryActiveDirectives().catch(() => []),
  ]);

  return {
    timestamp: new Date().toISOString(),
    counts: {
      pending: pending.length,
      confirmed: confirmed.length,
      overdue: overdue.length,
      active: active.length,
    },
    directiveIds: {
      pending: pending.map(d => d.id),
      confirmed: confirmed.map(d => d.id),
      overdue: overdue.map(d => d.id),
      active: active.map(d => d.id),
    },
    // Thêm chi tiết cho AI phân tích
    overdueDetails: overdue.slice(0, 10).map(d => ({
      title: (d.t2_nhiem_vu || d.directive_code || '').slice(0, 60),
      dauMoi: d.t1_dau_moi || 'N/A',
      deadline: d.t4_thoi_han || 'N/A',
      daysOverdue: d.t4_thoi_han
        ? Math.ceil((Date.now() - new Date(d.t4_thoi_han).getTime()) / 86400000)
        : 0,
    })),
    pendingDetails: pending.slice(0, 5).map(d => ({
      title: (d.t2_nhiem_vu || d.directive_code || '').slice(0, 60),
      dauMoi: d.t1_dau_moi || 'N/A',
      createdAt: d.created_at?.slice(0, 10) || 'N/A',
    })),
  };
}

// ===== DIFF =====

/**
 * So sánh 2 snapshots, trả về mô tả thay đổi
 */
function diffSnapshots(prev, curr) {
  const changes = [];
  const prevCounts = prev.counts || {};
  const currCounts = curr.counts || {};

  // Thay đổi số lượng
  for (const key of ['pending', 'confirmed', 'overdue', 'active']) {
    const p = prevCounts[key] || 0;
    const c = currCounts[key] || 0;
    if (c !== p) {
      const arrow = c > p ? '📈' : '📉';
      changes.push(`${arrow} ${key}: ${p} → ${c} (${c > p ? '+' : ''}${c - p})`);
    }
  }

  // IDs mới xuất hiện
  const prevIds = prev.directiveIds || {};
  const currIds = curr.directiveIds || {};

  const newPending = (currIds.pending || []).filter(id => !(prevIds.pending || []).includes(id));
  const newOverdue = (currIds.overdue || []).filter(id => !(prevIds.overdue || []).includes(id));
  const newConfirmed = (currIds.confirmed || []).filter(id => !(prevIds.confirmed || []).includes(id));

  if (newPending.length > 0) changes.push(`🆕 ${newPending.length} chỉ đạo mới chờ duyệt`);
  if (newOverdue.length > 0) changes.push(`🔴 ${newOverdue.length} chỉ đạo mới quá hạn`);
  if (newConfirmed.length > 0) changes.push(`✅ ${newConfirmed.length} chỉ đạo mới confirmed 5T`);

  // Thời gian từ lần check trước
  const timeDiffMinutes = prev.timestamp
    ? Math.round((new Date(curr.timestamp) - new Date(prev.timestamp)) / 60000)
    : null;

  return {
    hasChanges: changes.length > 0,
    changes,
    summary: changes.length > 0 ? changes.join('\n') : 'Không có thay đổi',
    timeDiffMinutes,
    newPendingCount: newPending.length,
    newOverdueCount: newOverdue.length,
    newConfirmedCount: newConfirmed.length,
  };
}

// ===== RECORD WF RUN =====

function recordWfRun(state, wfName) {
  if (!state.lastWfRuns) state.lastWfRuns = {};
  state.lastWfRuns[wfName] = new Date().toISOString();
}

function getLastRunSummary(state) {
  const runs = state.lastWfRuns || {};
  if (Object.keys(runs).length === 0) return 'Chưa có WF nào chạy';
  return Object.entries(runs)
    .map(([wf, ts]) => {
      const ago = Math.round((Date.now() - new Date(ts).getTime()) / 60000);
      return `${wf}: ${ago} phút trước`;
    })
    .join(', ');
}

module.exports = {
  loadState,
  saveState,
  buildSnapshot,
  diffSnapshots,
  recordWfRun,
  getLastRunSummary,
  EMPTY_STATE,
};
