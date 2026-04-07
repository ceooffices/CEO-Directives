"use client";

import { useState } from "react";
import type { LELONGSONPipeline } from "@/lib/supabase-types";
import DirectiveTable from "./directive-table";

const STAGE_HINTS: Record<string, { active: string; done: string; pending: string }> = {
  B1: {
    active: "🎯 Nhiệm vụ: Thư ký đang thu thập thông tin và cập nhật lên hệ thống.",
    done: "✅ Hoàn thành! Chỉ đạo đã được ghi nhận đủ 5T.",
    pending: "⏳ Đang chờ hệ thống ghi nhận.",
  },
  B2: {
    active: "🔍 Nhiệm vụ: Chờ BOD/CEO phê duyệt chính thức.",
    done: "✅ Hoàn thành! CEO đã phê duyệt định hướng.",
    pending: "⏳ Hoàn thành B1 để kích hoạt phê duyệt.",
  },
  B3_B5: {
    active: "📋 Nhiệm vụ: Đầu mối tiếp nhận, phân tích rủi ro và xác nhận cam kết.",
    done: "✅ Hoàn thành! Đầu mối đã xác nhận và lập plan.",
    pending: "⏳ Chờ CEO duyệt (B2) để đầu mối tiếp nhận.",
  },
  B7: {
    active: "⏳ Nhiệm vụ: Thực thi nhiệm vụ. AI auto-tracking và theo sát tiến độ.",
    done: "✅ Hoàn thành! Đã thực thi xong tác vụ được giao.",
    pending: "⏳ Hoàn thành B3-B5 để bắt đầu chạy pipeline thực thi.",
  },
  done: {
    active: "🎉 Nhiệm vụ: Nghiệm thu và đánh giá kết quả.",
    done: "✅ Hoàn thành! Nhiệm vụ đã được đóng lại.",
    pending: "⏳ Hoàn thành B7 để nghiệm thu kết quả.",
  },
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
    <div className="space-y-6">
      {/* Gamified Horizontal Timeline */}
      <div className="rounded-3xl bg-zinc-900/50 p-6 shadow-sm ring-1 ring-zinc-800/50">
        <div className="relative flex w-full items-start justify-between">
          <div className="absolute top-5 left-0 h-1 w-full -translate-y-1/2 rounded-full bg-zinc-800">
            {/* Compute active fill */}
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500"
              style={{
                width: `${
                  pipeline.total === 0
                    ? 0
                    : ((pipeline.stages.findIndex((s) => s.count > 0) + 1) /
                        pipeline.stages.length) *
                      100
                }%`,
              }}
            />
          </div>

          {pipeline.stages.map((stage, idx) => {
            const hasItems = stage.count > 0;
            const isSelected = selectedStage === stage.key;
            const hint = hasItems
              ? STAGE_HINTS[stage.key]?.active
              : STAGE_HINTS[stage.key]?.pending;
            const isDone = stage.key === "done" && hasItems;

            return (
              <div
                key={stage.key}
                className="relative z-10 flex w-1/5 flex-col items-center group cursor-pointer"
                onClick={() => setSelectedStage(isSelected ? null : stage.key)}
              >
                {/* Stage Dot */}
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-4 border-zinc-950 transition-all duration-300 ${
                    isSelected ? "ring-2 ring-emerald-500 ring-offset-2 ring-offset-zinc-950" : ""
                  } ${
                    isDone
                      ? "bg-emerald-500 text-white"
                      : hasItems
                      ? "bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                      : "bg-zinc-800 text-zinc-500"
                  }`}
                >
                  {isDone ? (
                    <span className="text-xl">✓</span>
                  ) : (
                    <span className="text-sm font-bold">{idx + 1}</span>
                  )}
                </div>

                {/* Stage Label */}
                <div
                  className={`mt-3 text-center text-xs font-semibold uppercase tracking-wider transition-colors ${
                    hasItems ? "text-zinc-100" : "text-zinc-600"
                  }`}
                >
                  {stage.label}
                  {hasItems && (
                    <span className="ml-1 inline-flex items-center rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white">
                      {stage.count}
                    </span>
                  )}
                </div>

                {/* Quest Hint tooltip mapping style */}
                {hint && (
                  <div
                    className={`mt-2 max-w-[120px] text-center text-[10px] leading-snug opacity-0 transition-opacity group-hover:opacity-100 ${
                      hasItems ? "text-blue-400 font-medium" : "text-zinc-600"
                    }`}
                  >
                    {hint}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Expanded directive list */}
      {selectedData && selectedData.count > 0 && (
        <div className="animate-in fade-in slide-in-from-top-4 rounded-3xl bg-zinc-900 border border-zinc-800 p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between border-b border-zinc-800/60 pb-4">
            <h4 className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wider">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 text-xs">
                {selectedData.label.charAt(1)}
              </span>
              {selectedData.label}
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                {selectedData.count}
              </span>
            </h4>
            <div className="text-[11px] font-medium text-emerald-400">
              {STAGE_HINTS[selectedData.key]?.active}
            </div>
          </div>
          <DirectiveTable directives={selectedData.directives} />
        </div>
      )}
    </div>
  );
}
