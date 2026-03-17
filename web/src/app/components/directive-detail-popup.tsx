"use client";

import { useState } from "react";
import type { DrilldownDirective } from "./drilldown-modal";

const STATUS_FLOW = [
  { key: "cho_xu_ly", label: "Chờ duyệt", icon: "⏳", color: "amber" },
  { key: "da_xac_nhan", label: "Đã xác nhận", icon: "✅", color: "cyan" },
  { key: "dang_thuc_hien", label: "Đang thực hiện", icon: "🔄", color: "blue" },
  { key: "hoan_thanh", label: "Hoàn thành", icon: "🎉", color: "green" },
];

const LLS_STEP_NAMES: Record<number, string> = {
  1: "B1 Chuẩn bị",
  2: "B2 Gửi CEO",
  3: "B3 ChatLong phân tích",
  4: "B4 Nghiên cứu sâu",
  5: "B5 Nâng cấp đề xuất",
  6: "B6 Gửi lại v2.0",
  7: "B7 TGĐ duyệt",
};

interface DirectiveDetailPopupProps {
  directive: DrilldownDirective | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (directiveId: string, newStatus: string) => void;
}

export default function DirectiveDetailPopup({
  directive,
  isOpen,
  onClose,
  onStatusChange,
}: DirectiveDetailPopupProps) {
  const [updating, setUpdating] = useState(false);
  const [localStatus, setLocalStatus] = useState<string | null>(null);

  if (!isOpen || !directive) return null;

  const currentStatus = localStatus || directive.tinh_trang;
  const currentIdx = STATUS_FLOW.findIndex((s) => s.key === currentStatus);

  const handleStatusChange = async (newStatus: string) => {
    setUpdating(true);
    try {
      const res = await fetch("/api/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          directive_id: directive.id,
          new_status: newStatus,
        }),
      });

      if (res.ok) {
        setLocalStatus(newStatus);
        onStatusChange?.(directive.id, newStatus);
      } else {
        const err = await res.json();
        alert(`Lỗi: ${err.error || "Không thể cập nhật"}`);
      }
    } catch {
      alert("Lỗi kết nối server");
    } finally {
      setUpdating(false);
    }
  };

  const deadline = directive.t4_thoi_han;
  const daysOver = deadline
    ? Math.floor((new Date().getTime() - new Date(deadline).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      
      <div
        className="relative w-full sm:max-w-md max-h-[90vh] bg-zinc-900 border border-zinc-700/50 rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-zinc-800 px-5 py-4">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-mono font-bold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-md">
              {directive.directive_code}
            </span>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)] px-5 py-5 space-y-5">
          {/* Nhiệm vụ */}
          <div>
            <h4 className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Nhiệm vụ</h4>
            <p className="text-[14px] text-zinc-200 leading-relaxed">{directive.t2_nhiem_vu}</p>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1">Đầu mối</h4>
              <p className="text-[13px] text-zinc-300">{directive.t1_dau_moi}</p>
            </div>
            <div>
              <h4 className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1">Thời hạn</h4>
              {deadline ? (
                <div>
                  <p className="text-[13px] text-zinc-300">
                    {new Date(deadline).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}
                  </p>
                  {daysOver !== null && daysOver > 0 && (
                    <p className="text-[11px] text-red-400 font-semibold mt-0.5">Quá hạn {daysOver} ngày</p>
                  )}
                  {daysOver !== null && daysOver <= 0 && daysOver > -3 && (
                    <p className="text-[11px] text-amber-400 mt-0.5">Còn {-daysOver} ngày</p>
                  )}
                </div>
              ) : (
                <p className="text-[13px] text-zinc-500">Chưa có</p>
              )}
            </div>
            {directive.meeting_source && (
              <div>
                <h4 className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1">Nguồn</h4>
                <p className="text-[13px] text-zinc-300">{directive.meeting_source}</p>
              </div>
            )}
            {directive.lls_step && (
              <div>
                <h4 className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1">LELONGSON</h4>
                <p className="text-[13px] text-zinc-300">{LLS_STEP_NAMES[directive.lls_step] || `Bước ${directive.lls_step}`}</p>
              </div>
            )}
          </div>

          {/* Status workflow */}
          <div>
            <h4 className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-3">Trạng thái · Phê duyệt</h4>
            <div className="flex flex-wrap gap-2">
              {STATUS_FLOW.map((step, idx) => {
                const isCurrent = step.key === currentStatus;
                const isPast = idx < currentIdx;
                const isNext = idx === currentIdx + 1;

                const colorMap: Record<string, { active: string; next: string }> = {
                  amber: { active: "bg-amber-500/20 border-amber-500/50 text-amber-300", next: "border-amber-500/30 text-amber-400 hover:bg-amber-500/10" },
                  cyan: { active: "bg-cyan-500/20 border-cyan-500/50 text-cyan-300", next: "border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10" },
                  blue: { active: "bg-blue-500/20 border-blue-500/50 text-blue-300", next: "border-blue-500/30 text-blue-400 hover:bg-blue-500/10" },
                  green: { active: "bg-emerald-500/20 border-emerald-500/50 text-emerald-300", next: "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10" },
                };
                const colors = colorMap[step.color] || colorMap.amber;

                if (isCurrent) {
                  return (
                    <span key={step.key} className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold ${colors.active}`}>
                      {step.icon} {step.label}
                    </span>
                  );
                }

                if (isPast) {
                  return (
                    <span key={step.key} className="flex items-center gap-1 rounded-full border border-zinc-700/50 px-3 py-1.5 text-[12px] text-zinc-500 line-through">
                      {step.icon} {step.label}
                    </span>
                  );
                }

                if (isNext) {
                  return (
                    <button
                      key={step.key}
                      onClick={() => handleStatusChange(step.key)}
                      disabled={updating}
                      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-all ${colors.next} ${updating ? "opacity-50 cursor-wait" : "cursor-pointer"}`}
                    >
                      {updating ? "⏳" : "→"} {step.label}
                    </button>
                  );
                }

                return (
                  <span key={step.key} className="flex items-center gap-1 rounded-full border border-zinc-800/50 px-3 py-1.5 text-[12px] text-zinc-600">
                    {step.icon} {step.label}
                  </span>
                );
              })}
            </div>
            {currentStatus === "hoan_thanh" && (
              <p className="mt-3 text-[12px] text-emerald-400 font-medium">✅ Chỉ đạo đã hoàn thành</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-800 px-5 py-3 text-[11px] text-zinc-600">
          Tạo: {new Date(directive.created_at).toLocaleDateString("vi-VN")}
        </div>
      </div>
    </div>
  );
}
