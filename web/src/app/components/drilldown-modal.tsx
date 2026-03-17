"use client";

export interface DrilldownDirective {
  id: string;
  directive_code: string;
  t1_dau_moi: string;
  t2_nhiem_vu: string;
  t4_thoi_han: string | null;
  tinh_trang: string;
  meeting_source: string | null;
  created_at: string;
  lls_step: number | null;
}



function daysOverdue(deadline: string | null): number | null {
  if (!deadline) return null;
  const diff = (new Date().getTime() - new Date(deadline).getTime()) / (1000 * 60 * 60 * 24);
  return Math.floor(diff);
}

function DeadlineBadge({ deadline }: { deadline: string | null }) {
  if (!deadline) return <span className="text-zinc-600 text-[11px]">Không có hạn</span>;
  const days = daysOverdue(deadline);
  if (days === null) return null;
  const formatted = new Date(deadline).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  
  if (days > 7) return <span className="text-red-400 font-semibold text-[11px]">🔴 {formatted} · Quá {days}d</span>;
  if (days > 0) return <span className="text-amber-400 font-semibold text-[11px]">⚠️ {formatted} · Quá {days}d</span>;
  if (days > -3) return <span className="text-amber-300 text-[11px]">⏰ {formatted} · Còn {-days}d</span>;
  return <span className="text-zinc-400 text-[11px]">📅 {formatted}</span>;
}

interface DrilldownModalProps {
  title: string;
  color: string;
  directives: DrilldownDirective[];
  isOpen: boolean;
  onClose: () => void;
  onSelectDirective: (d: DrilldownDirective) => void;
}

export default function DrilldownModal({ title, color, directives, isOpen, onClose, onSelectDirective }: DrilldownModalProps) {
  if (!isOpen) return null;

  const colorMap: Record<string, string> = {
    blue: "border-blue-500/30",
    green: "border-emerald-500/30",
    red: "border-red-500/30",
    yellow: "border-amber-500/30",
    cyan: "border-cyan-500/30",
  };
  const borderColor = colorMap[color] || "border-zinc-700";

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      {/* Modal */}
      <div
        className={`relative w-full sm:max-w-lg max-h-[85vh] bg-zinc-900 border-t-2 ${borderColor} sm:border sm:border-zinc-700/50 sm:rounded-2xl overflow-hidden rounded-t-2xl sm:rounded-2xl shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800 bg-zinc-900/95 backdrop-blur-sm px-5 py-4">
          <div className="flex items-center gap-3">
            <h3 className="text-[15px] font-semibold text-white">{title}</h3>
            <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-[12px] font-bold text-zinc-300 tabular-nums">
              {directives.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Directive list */}
        <div className="overflow-y-auto max-h-[calc(85vh-65px)] divide-y divide-zinc-800/50">
          {directives.length === 0 ? (
            <div className="py-16 text-center text-zinc-500">Không có chỉ đạo nào</div>
          ) : (
            directives.map((d) => (
              <button
                key={d.id}
                onClick={() => onSelectDirective(d)}
                className="w-full px-5 py-4 text-left hover:bg-zinc-800/40 transition-colors group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-mono font-bold text-blue-400">{d.directive_code}</span>
                      <DeadlineBadge deadline={d.t4_thoi_han} />
                    </div>
                    <p className="text-[13px] text-zinc-300 line-clamp-2 leading-relaxed">
                      {d.t2_nhiem_vu}
                    </p>
                    <p className="mt-1.5 text-[11px] text-zinc-500">
                      👤 {d.t1_dau_moi}
                    </p>
                  </div>
                  <span className="mt-1 text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0">›</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
