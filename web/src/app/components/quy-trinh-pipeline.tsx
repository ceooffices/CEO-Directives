"use client";

import { useState } from "react";
import DirectiveTable from "./directive-table";

interface QuyTrinhStep {
  key: number;
  label: string;
  desc: string;
  color: string;
  icon: string;
  count: number;
  directives: Array<{
    id: string;
    title: string;
    status: string;
    dau_moi: string;
    nhiem_vu: string;
    deadline: string | null;
    hm50_ref: string;
    section: string | null;
    nguon: string;
    url: string;
    created_at: string;
  }>;
}

interface QuyTrinhPipelineProps {
  pipeline: {
    steps: QuyTrinhStep[];
    total: number;
  };
}

export default function QuyTrinhPipeline({ pipeline }: QuyTrinhPipelineProps) {
  const [selectedStep, setSelectedStep] = useState<number | null>(null);

  const selectedData = selectedStep !== null
    ? pipeline.steps.find((s) => s.key === selectedStep)
    : null;

  // Calculate progress: how far through the 7 steps are we?
  const completedCount = pipeline.steps.find((s) => s.key === 7)?.count || 0;
  const progressPct = pipeline.total > 0
    ? Math.round((completedCount / pipeline.total) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* 7-Step Horizontal Pipeline */}
      <div className="card p-6 border-[#E5E5EA]">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-[16px] font-semibold text-[#6C6C70] uppercase tracking-wider">
            Hành trình 7 bước
          </h3>
          <div className="flex items-center gap-2 text-[15px]">
            <span className="text-[#6C6C70]">Hoàn thành:</span>
            <span className="font-bold text-[#34C759]">{progressPct}%</span>
            <span className="text-[#AEAEB2]">({completedCount}/{pipeline.total})</span>
          </div>
        </div>

        {/* Progress track */}
        <div className="relative">
          {/* Background line */}
          <div className="absolute top-5 left-[7%] right-[7%] h-1 rounded-full bg-[#E5E5EA]" />
          {/* Active fill */}
          <div
            className="absolute top-5 left-[7%] h-1 rounded-full bg-gradient-to-r from-[#007AFF] via-[#AF52DE] to-[#34C759] transition-all duration-700"
            style={{
              width: `${Math.min(
                86,
                pipeline.total === 0 ? 0 : progressPct * 0.86
              )}%`,
            }}
          />

          {/* Steps */}
          <div className="relative flex w-full items-start justify-between">
            {pipeline.steps.map((step) => {
              const hasItems = step.count > 0;
              const isSelected = selectedStep === step.key;
              const isDone = step.key === 7 && hasItems;
              const isActive = step.key < 7 && hasItems;

              return (
                <div
                  key={step.key}
                  className="relative z-10 flex flex-col items-center group cursor-pointer"
                  style={{ width: `${100 / 7}%` }}
                  onClick={() => setSelectedStep(isSelected ? null : step.key)}
                >
                  {/* Step Circle */}
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-4 border-white transition-all duration-300 ${
                      isSelected
                        ? "ring-2 ring-[#007AFF] ring-offset-2 ring-offset-white scale-110"
                        : ""
                    } ${
                      isDone
                        ? "bg-[#34C759] text-white shadow-[0_0_12px_rgba(52,199,89,0.3)]"
                        : isActive
                        ? "bg-[#007AFF] text-white shadow-[0_0_12px_rgba(0,122,255,0.3)]"
                        : "bg-[#F2F2F7] text-[#AEAEB2]"
                    }`}
                  >
                    {isDone ? (
                      <span className="text-lg">✓</span>
                    ) : (
                      <span className="text-[15px]">{step.icon}</span>
                    )}
                  </div>

                  {/* Label */}
                  <div
                    className={`mt-3 text-center transition-colors ${
                      hasItems ? "text-[#1C1C1E]" : "text-[#6C6C70]"
                    }`}
                  >
                    <div className="text-[13px] font-semibold uppercase tracking-wider">
                      {step.label}
                    </div>
                    {hasItems && (
                      <span
                        className={`mt-1 inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-bold ${
                          isDone
                            ? "bg-[#EAFAF1] text-[#34C759]"
                            : "bg-[#EBF4FF] text-[#007AFF]"
                        }`}
                      >
                        {step.count}
                      </span>
                    )}
                  </div>

                  {/* Hover hint */}
                  <div
                    className={`mt-2 max-w-[100px] text-center text-[13px] leading-snug opacity-0 transition-opacity group-hover:opacity-100 hidden sm:block ${
                      hasItems ? "text-[#007AFF]/80" : "text-[#AEAEB2]"
                    }`}
                  >
                    {step.desc}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Expanded directive list */}
      {selectedData && selectedData.count > 0 && (
        <div className="animate-in fade-in slide-in-from-top-4 card p-6 border-[#E5E5EA] shadow-md">
          <div className="mb-4 flex items-center justify-between border-b border-[#E5E5EA] pb-4">
            <h4 className="flex items-center gap-2 text-base font-bold text-[#1C1C1E] uppercase tracking-wider">
              <span className="text-[21px]">{selectedData.icon}</span>
              Bước {selectedData.key}: {selectedData.label}
              <span className="rounded-full bg-[#F2F2F7] px-2 py-0.5 text-sm text-[#6C6C70]">
                {selectedData.count}
              </span>
            </h4>
            <div className="text-[14px] font-medium text-[#6C6C70]">
              {selectedData.desc}
            </div>
          </div>
          <DirectiveTable directives={selectedData.directives} />
        </div>
      )}
    </div>
  );
}
