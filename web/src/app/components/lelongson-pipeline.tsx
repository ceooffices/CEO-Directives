"use client";

import { useState } from "react";
import type { LELONGSONPipeline } from "@/lib/notion";
import DirectiveTable from "./directive-table";

const STAGE_TEXT_COLOR: Record<string, string> = {
  "bg-blue-200": "text-blue-800",
  "bg-blue-400": "text-white",
  "bg-amber-400": "text-amber-900",
  "bg-emerald-400": "text-white",
  "bg-emerald-600": "text-white",
};

export default function LELONGSONPipelineView({
  pipeline,
}: {
  pipeline: LELONGSONPipeline;
}) {
  const [selectedStage, setSelectedStage] = useState<string | null>(null);

  const selectedData = selectedStage
    ? pipeline.stages.find((s) => s.key === selectedStage)
    : null;

  return (
    <div className="space-y-4">
      {/* Pipeline bar */}
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200/50">
        {/* Stacked bar */}
        <div className="flex h-12 w-full overflow-hidden rounded-2xl bg-gray-100">
          {pipeline.stages.map((stage) => {
            const pct =
              pipeline.total > 0
                ? (stage.count / pipeline.total) * 100
                : 0;
            if (pct === 0) return null;

            const textColor = STAGE_TEXT_COLOR[stage.color] || "text-gray-700";
            const isSelected = selectedStage === stage.key;

            return (
              <button
                key={stage.key}
                onClick={() =>
                  setSelectedStage(isSelected ? null : stage.key)
                }
                className={`relative flex items-center justify-center transition-all ${stage.color} ${textColor} ${
                  isSelected
                    ? "ring-2 ring-gray-900 ring-offset-1 z-10"
                    : "hover:brightness-110"
                }`}
                style={{ width: `${Math.max(pct, 8)}%` }}
                title={`${stage.label}: ${stage.count}`}
              >
                <span className="text-[13px] font-bold tabular-nums">
                  {stage.count}
                </span>
              </button>
            );
          })}
          {pipeline.total === 0 && (
            <div className="flex w-full items-center justify-center text-[13px] text-gray-400">
              Chua co chi dao
            </div>
          )}
        </div>

        {/* Labels */}
        <div className="mt-3 flex flex-wrap justify-between gap-2">
          {pipeline.stages.map((stage) => {
            const isSelected = selectedStage === stage.key;
            return (
              <button
                key={stage.key}
                onClick={() =>
                  setSelectedStage(isSelected ? null : stage.key)
                }
                className={`text-[11px] transition-colors ${
                  isSelected
                    ? "font-bold text-gray-900"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                {stage.label}
                {stage.count > 0 && (
                  <span className="ml-1 tabular-nums">({stage.count})</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Expanded directive list */}
      {selectedData && selectedData.count > 0 && (
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200/50">
          <h4 className="mb-4 text-[13px] font-medium text-gray-400">
            {selectedData.label} — {selectedData.count} chi dao
          </h4>
          <DirectiveTable directives={selectedData.directives} />
        </div>
      )}
    </div>
  );
}
