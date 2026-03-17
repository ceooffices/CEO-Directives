/**
 * Diff Timeline — TrackChange UI giống GitHub Diff
 * Hiển thị thay đổi nội dung chỉ đạo theo thời gian
 * Red = xóa, Green = thêm, Gray = context
 * 
 * Triết lý: Theo dõi diễn biến — minh bạch, chuyên nghiệp
 */

"use client";

import { useState } from "react";

export interface DiffEntry {
  step_number: number;
  step_name: string;
  action: string;
  actor: string | null;
  detail: string | null;
  created_at: string;
  changes: DiffChange[];
}

export interface DiffChange {
  field: string;
  fieldLabel: string;
  oldValue: string | null;
  newValue: string | null;
  type: "added" | "removed" | "modified";
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

function DiffBlock({ change }: { change: DiffChange }) {
  return (
    <div className="font-mono text-[12px] leading-relaxed">
      {change.type === "modified" && change.oldValue && (
        <div className="flex items-start gap-2 bg-red-50 border-l-2 border-red-300 px-3 py-1.5 rounded-r">
          <span className="text-red-500 font-bold shrink-0 select-none">−</span>
          <span className="text-red-700">
            <span className="text-red-400 text-[10px]">{change.fieldLabel}: </span>
            {change.oldValue}
          </span>
        </div>
      )}
      {(change.type === "modified" || change.type === "added") && change.newValue && (
        <div className="flex items-start gap-2 bg-emerald-50 border-l-2 border-emerald-300 px-3 py-1.5 rounded-r">
          <span className="text-emerald-500 font-bold shrink-0 select-none">+</span>
          <span className="text-emerald-700">
            <span className="text-emerald-400 text-[10px]">{change.fieldLabel}: </span>
            {change.newValue}
          </span>
        </div>
      )}
      {change.type === "removed" && change.oldValue && (
        <div className="flex items-start gap-2 bg-red-50 border-l-2 border-red-300 px-3 py-1.5 rounded-r">
          <span className="text-red-500 font-bold shrink-0 select-none">−</span>
          <span className="text-red-700 line-through">
            <span className="text-red-400 text-[10px]">{change.fieldLabel}: </span>
            {change.oldValue}
          </span>
        </div>
      )}
    </div>
  );
}

function CommitEntry({
  entry,
  isFirst,
  isExpanded,
  onToggle,
}: {
  entry: DiffEntry;
  isFirst: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const stepIcons: Record<number, string> = {
    1: "📋", 2: "📤", 3: "🔍", 4: "🔬", 5: "⬆️", 6: "📨", 7: "✅",
  };
  const icon = stepIcons[entry.step_number] || "📝";
  const changeCount = entry.changes.length;

  return (
    <div className="relative">
      {/* Timeline dot + line */}
      <div className="absolute left-0 top-0 bottom-0 flex flex-col items-center">
        <div className={`relative z-10 h-8 w-8 rounded-full flex items-center justify-center text-sm ring-2 ring-white ${isFirst ? "bg-emerald-100" : "bg-gray-100"}`}>
          {icon}
        </div>
        <div className="flex-1 w-[2px] bg-gray-100" />
      </div>

      {/* Content */}
      <div className="ml-12 pb-6">
        {/* Commit header — like GitHub commit line */}
        <button
          onClick={onToggle}
          className="w-full text-left group"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[13px] font-semibold text-gray-900">
                  {entry.step_name}
                </span>
                <span className="text-[10px] text-gray-400">
                  — {entry.action}
                </span>
              </div>
              {entry.detail && (
                <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">
                  {entry.detail}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0 mt-0.5">
              {/* Change count badge — like GitHub "3 files changed" */}
              {changeCount > 0 && (
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">
                  {changeCount} thay đổi
                </span>
              )}
              <span className="text-[10px] text-gray-400 tabular-nums">
                {formatDateTime(entry.created_at)}
              </span>
              <svg
                className={`h-3 w-3 text-gray-400 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </div>
          </div>

          {/* Author + Commit hash */}
          <div className="flex items-center gap-2 mt-1">
            {entry.actor && (
              <span className="text-[10px] text-gray-400">
                👤 {entry.actor}
              </span>
            )}
            <span className="text-[10px] font-mono text-gray-300">
              {entry.created_at.substring(0, 10).replace(/-/g, "")}
            </span>
          </div>
        </button>

        {/* Diff content — expandable */}
        <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? "max-h-[600px] mt-3" : "max-h-0"}`}>
          {changeCount > 0 ? (
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              {/* Diff header bar — like GitHub file header */}
              <div className="flex items-center justify-between bg-gray-50 border-b border-gray-200 px-3 py-1.5">
                <span className="text-[10px] text-gray-500">
                  📄 Nội dung chỉ đạo
                </span>
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="text-emerald-600">
                    +{entry.changes.filter(c => c.type === "added" || c.type === "modified").length}
                  </span>
                  <span className="text-red-500">
                    −{entry.changes.filter(c => c.type === "removed" || c.type === "modified").length}
                  </span>
                </div>
              </div>

              {/* Diff lines */}
              <div className="divide-y divide-gray-100">
                {entry.changes.map((change, idx) => (
                  <DiffBlock key={idx} change={change} />
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 text-[11px] text-gray-400 text-center">
              Không có thay đổi nội dung — chỉ chuyển bước
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DiffTimeline({ entries }: { entries: DiffEntry[] }) {
  const [expandedSet, setExpandedSet] = useState<Set<number>>(() => new Set(entries.length > 0 ? [0] : []));

  const toggleExpand = (index: number) => {
    setExpandedSet((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  if (entries.length === 0) {
    return null;
  }

  const totalChanges = entries.reduce((sum, e) => sum + e.changes.length, 0);

  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-200/50 sm:p-6">
      {/* Header — like GitHub "Commits" page */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <h2 className="text-[13px] font-medium text-gray-400 uppercase tracking-wide">
            Lịch sử thay đổi
          </h2>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
            {entries.length} bước · {totalChanges} thay đổi
          </span>
        </div>
        <button
          onClick={() => {
            if (expandedSet.size === entries.length) {
              setExpandedSet(new Set());
            } else {
              setExpandedSet(new Set(entries.map((_, i) => i)));
            }
          }}
          className="text-[11px] text-blue-500 hover:text-blue-700 transition-colors"
        >
          {expandedSet.size === entries.length ? "Thu gọn" : "Mở rộng tất cả"}
        </button>
      </div>

      {/* Timeline */}
      <div className="relative pl-4">
        {entries.map((entry, i) => (
          <CommitEntry
            key={`${entry.created_at}-${i}`}
            entry={entry}
            isFirst={i === 0}
            isExpanded={expandedSet.has(i)}
            onToggle={() => toggleExpand(i)}
          />
        ))}
      </div>
    </div>
  );
}
