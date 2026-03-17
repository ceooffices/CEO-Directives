"use client";

import { useState } from "react";

export interface BODMeeting {
  meeting_id: string;
  date: string;
  total_directives: number;
  hm_affected: number;
  risk_signals: { hm_tt: number; reason: string }[];
}

export interface BODDirective {
  local_id: number;
  title: string;
  nhom: string;
  loai: string;
  t1_dau_moi: string[];
  t4_deadline: string | null;
  hm50_match: {
    hm_tt: number;
    hm_title: string;
    confidence: number;
    hm_status: string;
  } | null;
  status: string;
}

interface BODTimelineProps {
  meetings: BODMeeting[];
  directives: Record<string, BODDirective[]>; // meeting_id → directives
}

const NHOM_LABELS: Record<string, { label: string; color: string }> = {
  A: { label: "MSA & Nguồn tuyển", color: "bg-blue-100 text-blue-700" },
  B: { label: "ONETEAM / Việc làm", color: "bg-purple-100 text-purple-700" },
  C: { label: "Kiểm soát & Nhân sự", color: "bg-red-100 text-red-700" },
  D: { label: "Chất lượng ĐT", color: "bg-amber-100 text-amber-700" },
  E: { label: "Giữ nguồn HV", color: "bg-emerald-100 text-emerald-700" },
};

const LOAI_STYLE: Record<string, string> = {
  leo_thang: "bg-red-50 text-red-600 ring-1 ring-red-200",
  moi: "bg-blue-50 text-blue-600 ring-1 ring-blue-200",
  bo_sung: "bg-gray-100 text-gray-600 ring-1 ring-gray-200",
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function isOverdue(deadline: string | null): boolean {
  if (!deadline) return false;
  return new Date(deadline) < new Date();
}

export default function BODTimeline({
  meetings,
  directives,
}: BODTimelineProps) {
  const [expandedMeeting, setExpandedMeeting] = useState<string | null>(
    meetings.length > 0 ? meetings[0].meeting_id : null
  );

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200/50">
      <h3 className="mb-5 text-[13px] font-medium text-gray-400">
        Dòng thời gian BOD
      </h3>

      <div className="relative ml-4 border-l-2 border-gray-200 pl-6 space-y-6">
        {meetings.map((meeting, idx) => {
          const isExpanded = expandedMeeting === meeting.meeting_id;
          const meetingDirectives = directives[meeting.meeting_id] || [];

          // Group by nhóm
          const grouped: Record<string, BODDirective[]> = {};
          for (const d of meetingDirectives) {
            const key = d.nhom || "?";
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(d);
          }

          const leoThangCount = meetingDirectives.filter(
            (d) => d.loai === "leo_thang"
          ).length;
          const hasRisk = meeting.risk_signals.length > 0;

          return (
            <div key={meeting.meeting_id} className="relative">
              {/* Timeline dot */}
              <div
                className={`absolute -left-[31px] top-1 flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-white ${
                  idx === 0
                    ? "bg-blue-500"
                    : "bg-gray-300"
                }`}
              >
                {idx === 0 && (
                  <div className="h-1.5 w-1.5 rounded-full bg-white" />
                )}
              </div>

              {/* Meeting header */}
              <button
                onClick={() =>
                  setExpandedMeeting(isExpanded ? null : meeting.meeting_id)
                }
                className="group flex w-full items-start justify-between text-left"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-semibold text-gray-900">
                      {formatDate(meeting.date)}
                    </span>
                    {hasRisk && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600">
                        {meeting.risk_signals.length} rủi ro
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[12px] text-gray-400">
                    {meeting.total_directives} chỉ đạo · {meeting.hm_affected}{" "}
                    HM liên quan · {leoThangCount} leo thang
                  </p>
                </div>
                <svg
                  className={`mt-1 h-5 w-5 shrink-0 text-gray-400 transition-transform ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* Risk signals */}
              {isExpanded && hasRisk && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {meeting.risk_signals.map((r) => (
                    <span
                      key={r.hm_tt}
                      className="rounded-full bg-red-50 px-3 py-1 text-[11px] font-medium text-red-600 ring-1 ring-red-200"
                    >
                      HM{r.hm_tt}: {r.reason}
                    </span>
                  ))}
                </div>
              )}

              {/* Expanded: directives by nhóm */}
              {isExpanded && (
                <div className="mt-4 space-y-4">
                  {Object.entries(grouped)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([nhom, items]) => {
                      const nhomStyle = NHOM_LABELS[nhom] || {
                        label: nhom,
                        color: "bg-gray-100 text-gray-600",
                      };

                      return (
                        <div key={nhom}>
                          <div className="mb-2 flex items-center gap-2">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${nhomStyle.color}`}
                            >
                              {nhom}
                            </span>
                            <span className="text-[11px] text-gray-400">
                              {nhomStyle.label} · {items.length}
                            </span>
                          </div>

                          <div className="space-y-1.5">
                            {items.map((d) => {
                              const overdue = isOverdue(d.t4_deadline);

                              return (
                                <div
                                  key={d.local_id}
                                  className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-[13px] ${
                                    overdue
                                      ? "bg-red-50/50 ring-1 ring-red-100"
                                      : "bg-gray-50"
                                  }`}
                                >
                                  <span className="shrink-0 w-6 text-right text-[12px] font-bold text-gray-400">
                                    #{d.local_id}
                                  </span>
                                  <span
                                    className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                      LOAI_STYLE[d.loai] || LOAI_STYLE.bo_sung
                                    }`}
                                  >
                                    {d.loai === "leo_thang"
                                      ? "Leo"
                                      : d.loai === "moi"
                                      ? "Mới"
                                      : "B/S"}
                                  </span>
                                  <span className="flex-1 font-medium text-gray-700 truncate">
                                    {d.title}
                                  </span>
                                  {d.hm50_match && (
                                    <span className="shrink-0 text-[11px] text-gray-400">
                                      HM{d.hm50_match.hm_tt} ({d.hm50_match.confidence}%)
                                    </span>
                                  )}
                                  {d.t4_deadline && (
                                    <span
                                      className={`shrink-0 text-[11px] font-medium ${
                                        overdue
                                          ? "text-red-500"
                                          : "text-gray-400"
                                      }`}
                                    >
                                      {new Date(d.t4_deadline).toLocaleDateString("vi-VN", {
                                        day: "2-digit",
                                        month: "2-digit",
                                      })}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {meetings.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-gray-400">Chưa có dữ liệu cuộc họp BOD.</p>
        </div>
      )}
    </div>
  );
}
