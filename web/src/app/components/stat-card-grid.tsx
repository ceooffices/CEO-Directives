"use client";

import { useState, useCallback } from "react";
import DrilldownModal from "./drilldown-modal";
import DirectiveDetailPopup from "./directive-detail-popup";
import type { DrilldownDirective } from "./drilldown-modal";

const COLOR_MAP: Record<string, { bg: string; text: string; dot: string }> = {
  blue: { bg: "bg-blue-500/5", text: "text-blue-400", dot: "bg-blue-500" },
  green: { bg: "bg-emerald-500/5", text: "text-emerald-400", dot: "bg-emerald-500" },
  red: { bg: "bg-red-500/5", text: "text-red-400", dot: "bg-red-500" },
  yellow: { bg: "bg-amber-500/5", text: "text-amber-400", dot: "bg-amber-500" },
  cyan: { bg: "bg-cyan-500/5", text: "text-cyan-400", dot: "bg-cyan-500" },
  default: { bg: "bg-zinc-800/50", text: "text-zinc-400", dot: "bg-zinc-500" },
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
              className={`rounded-2xl ${c.bg} border border-zinc-800/50 p-4 text-left transition-all hover:border-zinc-700 hover:shadow-lg hover:shadow-black/20 cursor-pointer group`}
            >
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${c.dot} ${stat.pulse ? "animate-pulse" : ""}`} />
                <p className="text-[11px] font-medium text-zinc-500 group-hover:text-zinc-400 transition-colors">{stat.label}</p>
              </div>
              <div className="mt-2 flex items-end gap-2">
                <span className={`text-2xl font-bold tabular-nums ${c.text}`}>{stat.value}</span>
                {stat.sub && (
                  <span className="mb-0.5 text-[11px] font-medium text-zinc-500">{stat.sub}</span>
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
