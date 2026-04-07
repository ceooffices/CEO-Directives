"use client";

import { useState, useCallback } from "react";
import DrilldownModal from "./drilldown-modal";
import DirectiveDetailPopup from "./directive-detail-popup";
import type { DrilldownDirective } from "./drilldown-modal";

const COLOR_MAP: Record<string, { bg: string; text: string; dot: string; hover: string }> = {
  blue: { bg: "bg-blue-50", text: "text-blue-600", dot: "bg-blue-500", hover: "hover:bg-blue-100/50 hover:border-blue-200" },
  green: { bg: "bg-green-50", text: "text-green-600", dot: "bg-green-500", hover: "hover:bg-green-100/50 hover:border-green-200" },
  red: { bg: "bg-red-50", text: "text-red-600", dot: "bg-red-500", hover: "hover:bg-red-100/50 hover:border-red-200" },
  yellow: { bg: "bg-amber-50", text: "text-amber-600", dot: "bg-amber-500", hover: "hover:bg-amber-100/50 hover:border-amber-200" },
  cyan: { bg: "bg-cyan-50", text: "text-cyan-600", dot: "bg-cyan-500", hover: "hover:bg-cyan-100/50 hover:border-cyan-200" },
  default: { bg: "bg-zinc-50", text: "text-zinc-700", dot: "bg-zinc-400", hover: "hover:bg-zinc-100 hover:border-zinc-300" },
};

interface StatDef {
  label: string;
  value: number;
  color: string;
  sub?: string;
  pulse?: boolean;
  filterStatus: string; // "all" | specific status key
}

interface StatCardGridProps {
  stats: StatDef[];
  directives: DrilldownDirective[];
}

export default function StatCardGrid({ stats, directives }: StatCardGridProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStat, setSelectedStat] = useState<StatDef | null>(null);
  const [detailDirective, setDetailDirective] = useState<DrilldownDirective | null>(null);
  const [updatedStatuses, setUpdatedStatuses] = useState<Record<string, string>>({});

  const handleCardClick = useCallback((stat: StatDef) => {
    setSelectedStat(stat);
    setModalOpen(true);
  }, []);

  const handleSelectDirective = useCallback((d: DrilldownDirective) => {
    setDetailDirective(d);
  }, []);

  const handleStatusChange = useCallback((directiveId: string, newStatus: string) => {
    setUpdatedStatuses((prev) => ({ ...prev, [directiveId]: newStatus }));
  }, []);

  // Apply local status overrides
  const effectiveDirectives = directives.map((d) => ({
    ...d,
    tinh_trang: updatedStatuses[d.id] || d.tinh_trang,
  }));

  // Filter directives for modal
  const filteredDirectives = selectedStat
    ? selectedStat.filterStatus === "all"
      ? effectiveDirectives
      : selectedStat.filterStatus === "overdue"
      ? effectiveDirectives.filter((d) => {
          if (!d.t4_thoi_han) return false;
          return new Date(d.t4_thoi_han) < new Date() && d.tinh_trang !== "hoan_thanh";
        })
      : effectiveDirectives.filter((d) => d.tinh_trang === selectedStat.filterStatus)
    : [];

  // Recompute stat values based on effective directives
  const recomputedStats = stats.map((s) => {
    let value = s.value;
    if (Object.keys(updatedStatuses).length > 0) {
      if (s.filterStatus === "all") {
        value = effectiveDirectives.length;
      } else if (s.filterStatus === "overdue") {
        value = effectiveDirectives.filter((d) => {
          if (!d.t4_thoi_han) return false;
          return new Date(d.t4_thoi_han) < new Date() && d.tinh_trang !== "hoan_thanh";
        }).length;
      } else {
        value = effectiveDirectives.filter((d) => d.tinh_trang === s.filterStatus).length;
      }
    }
    return { ...s, value };
  });

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {recomputedStats.map((stat) => {
          const c = COLOR_MAP[stat.color] || COLOR_MAP.default;
          return (
            <button
              key={stat.label}
              onClick={() => handleCardClick(stat)}
              className={`rounded-[18px] ${c.bg} border border-[#E5E5EA] p-3 sm:p-4 text-left transition-all ${c.hover} shadow-sm group cursor-pointer`}
            >
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${c.dot} ${stat.pulse ? "animate-pulse" : ""}`} />
                <p className="text-[14px] font-semibold text-[#6C6C70] group-hover:text-[#1C1C1E] transition-colors">{stat.label}</p>
              </div>
              <div className="mt-2 flex items-end gap-1.5">
                <span className={`text-[26px] sm:text-3xl font-black tabular-nums ${c.text}`}>{stat.value}</span>
                {stat.sub && (
                  <span className="mb-0.5 text-[13px] sm:text-[14px] font-medium text-[#6C6C70]">{stat.sub}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Drilldown modal */}
      <DrilldownModal
        title={selectedStat?.label || ""}
        color={selectedStat?.color || "default"}
        directives={filteredDirectives}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelectDirective={handleSelectDirective}
      />

      {/* Directive detail popup */}
      <DirectiveDetailPopup
        directive={detailDirective}
        isOpen={!!detailDirective}
        onClose={() => setDetailDirective(null)}
        onStatusChange={handleStatusChange}
      />
    </>
  );
}
