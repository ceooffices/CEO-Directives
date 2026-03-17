'use client';

import { useState } from 'react';

/* ═══════════════════════════════════════════════════
   P1 Client — Interactive part of Assistant Dashboard
   Nhận data từ server component, render + handle actions
   ═══════════════════════════════════════════════════ */

interface PendingItem {
  id: string;
  code: string;
  t2: string;
  t1: string;
  meeting: string;
}

interface SilentItem {
  id: string;
  code: string;
  name: string;
  title: string;
  updatedAt: string;
  silentHours: number;
}

interface CompletedItem {
  code: string;
  title: string;
  dau_moi: string;
}

interface Props {
  pendingApproval: PendingItem[];
  silentDirectives: SilentItem[];
  completedRecent: CompletedItem[];
  hmStats: { total: number; done: number; inProgress: number; notStarted: number; blocked: number };
  totalDirectives: number;
}

function formatDate(): string {
  return new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function AssistantClient({
  pendingApproval,
  silentDirectives,
  completedRecent,
  hmStats,
  totalDirectives,
}: Props) {
  const [actions, setActions] = useState<string[]>([]);
  const [processing, setProcessing] = useState<Set<string>>(new Set());

  function logAction(msg: string) {
    setActions((prev) => [`${new Date().toLocaleTimeString('vi-VN')} — ${msg}`, ...prev].slice(0, 8));
  }

  async function handleRemind(id: string, name: string) {
    setProcessing(p => new Set(p).add(id));
    try {
      const res = await fetch('/api/remind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ directive_id: id }),
      });
      const result = await res.json();
      if (result.success) {
        logAction(`Đã nhắc ${name}`);
      } else {
        logAction(`Lỗi nhắc ${name}: ${result.error}`);
      }
    } catch {
      logAction(`Lỗi kết nối khi nhắc ${name}`);
    }
    setProcessing(p => { const n = new Set(p); n.delete(id); return n; });
  }

  async function handleEscalate(id: string, code: string) {
    setProcessing(p => new Set(p).add(id));
    try {
      const res = await fetch('/api/escalate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ directive_id: id }),
      });
      const result = await res.json();
      if (result.success) {
        logAction(`Đã leo thang ${code} lên CEO`);
      } else {
        logAction(`Lỗi leo thang ${code}: ${result.error}`);
      }
    } catch {
      logAction(`Lỗi kết nối khi leo thang ${code}`);
    }
    setProcessing(p => { const n = new Set(p); n.delete(id); return n; });
  }

  return (
    <main className="min-h-screen px-4 py-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight mb-1">
          Bảng Điều Khiển Buổi Sáng
        </h1>
        <p className="text-zinc-400 text-sm">
          Chào anh Kha, hôm nay {formatDate()}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <StatCard
          label="50 Hạng Mục"
          value={`${hmStats.done}/${hmStats.total}`}
          sub={`Xong ${hmStats.done} · Đang ${hmStats.inProgress} · Chưa ${hmStats.notStarted} · Nghẽn ${hmStats.blocked}`}
          color="text-white"
        />
        <StatCard
          label="Tổng chỉ đạo"
          value={totalDirectives}
          sub="trong Supabase"
          color="text-blue-400"
        />
        <StatCard
          label="Chờ duyệt"
          value={pendingApproval.length}
          sub="cần xử lý sáng nay"
          color="text-amber-400"
        />
        <StatCard
          label="Hoàn thành"
          value={completedRecent.length}
          sub="gần đây"
          color="text-green-400"
        />
      </div>

      {/* Urgent: Chờ gửi duyệt */}
      <section className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          {pendingApproval.length > 0 && (
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
          )}
          <h2 className="text-lg font-semibold">
            {pendingApproval.length > 0
              ? `${pendingApproval.length} Chỉ đạo chờ gửi duyệt`
              : 'Không có chỉ đạo chờ duyệt'}
          </h2>
        </div>
        {pendingApproval.length > 0 && (
          <div className="rounded-2xl bg-zinc-900/50 border border-red-900/30 p-4">
            {pendingApproval.map((d) => (
              <div key={d.id} className="flex items-center justify-between py-3 border-b border-zinc-800 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-200 truncate">{d.t2}</p>
                  <p className="text-xs text-zinc-500">
                    Đầu mối: {d.t1} · {d.meeting}
                  </p>
                </div>
                <a
                  href={`/approve/${d.id}`}
                  className="ml-3 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                >
                  Mở duyệt ▶
                </a>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Warning: Im lặng > 48h */}
      <section className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          {silentDirectives.length > 0 && (
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
          )}
          <h2 className="text-lg font-semibold">
            {silentDirectives.length > 0
              ? `${silentDirectives.length} Đầu mối im lặng > 48h`
              : 'Không có đầu mối im lặng'}
          </h2>
        </div>
        {silentDirectives.length > 0 && (
          <div className="rounded-2xl bg-zinc-900/50 border border-amber-900/30 p-4">
            {silentDirectives.map((s) => (
              <div key={s.id} className="flex items-center justify-between py-3 border-b border-zinc-800 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-200 truncate">{s.title}</p>
                  <p className="text-xs text-zinc-500">
                    {s.name} · Im lặng {s.silentHours}h
                  </p>
                </div>
                <div className="flex gap-2 ml-3 shrink-0">
                  <button
                    onClick={() => handleRemind(s.id, s.name)}
                    disabled={processing.has(s.id)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-500 text-white transition-colors disabled:opacity-50"
                  >
                    {processing.has(s.id) ? '...' : 'Nhắc ngay'}
                  </button>
                  <button
                    onClick={() => handleEscalate(s.id, s.code)}
                    disabled={processing.has(s.id)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors disabled:opacity-50"
                  >
                    {processing.has(s.id) ? '...' : 'Leo thang'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Success: Hoàn thành */}
      {completedRecent.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <h2 className="text-lg font-semibold">
              {completedRecent.length} Hoàn thành gần đây
            </h2>
          </div>
          <div className="rounded-2xl bg-zinc-900/50 border border-green-900/30 p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {completedRecent.map((c) => (
                <div key={c.code} className="flex items-center gap-2 text-sm">
                  <span className="text-green-500">✓</span>
                  <span className="font-mono text-zinc-500 text-xs">{c.code}</span>
                  <span className="text-zinc-300 truncate">{c.title}</span>
                  <span className="text-zinc-600 text-xs ml-auto">{c.dau_moi}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Action Log */}
      {actions.length > 0 && (
        <section className="mt-8 border-t border-zinc-800 pt-4">
          <h3 className="text-xs text-zinc-500 uppercase mb-2">Nhật ký hành động</h3>
          {actions.map((a, i) => (
            <p key={i} className="text-xs text-zinc-400 font-mono py-0.5">{a}</p>
          ))}
        </section>
      )}
    </main>
  );
}

function StatCard({
  label, value, sub, color,
}: {
  label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <div className="rounded-2xl bg-zinc-900/70 border border-zinc-800 p-5 backdrop-blur-sm">
      <p className="text-xs text-zinc-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-sm text-zinc-500 mt-1">{sub}</p>}
    </div>
  );
}
