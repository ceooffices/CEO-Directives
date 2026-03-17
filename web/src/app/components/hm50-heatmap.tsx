"use client";

import { useState } from "react";

export interface HMTimelineItem {
  hm_tt: number;
  title: string;
  phan_cl: string;
  current_status: string;
  t1_dau_moi: string;
  total_mentions: number;
  total_escalations: number;
  trend: "critical" | "worsening" | "stable";
  escalation_history: {
    meeting: string;
    date: string;
    count: number;
    directives: { id: string; title: string; loai: string }[];
  }[];
}

// Màu theo mức leo thang
function getHeatColor(mentions: number, status: string): string {
  const isDanger = status.includes("Chưa có chủ") || status.includes("Blind spot");
  if (mentions >= 4) return isDanger ? "bg-red-600 text-white ring-2 ring-red-900" : "bg-red-500 text-white";
  if (mentions >= 2) return isDanger ? "bg-amber-500 text-white ring-2 ring-red-700" : "bg-amber-400 text-gray-900";
  if (mentions === 1) return "bg-emerald-100 text-emerald-800";
  return "bg-gray-50 text-gray-300";
}

function getTrendLabel(trend: string): string {
  if (trend === "critical") return "Nghiêm trọng";
  if (trend === "worsening") return "Cần chú ý";
  return "Ổn định";
}

// 8 phần CL → group
const SECTION_ORDER = [
  "I — Tầm nhìn & Triết lý",
  "II — Quản trị kết quả",
  "III — Tổ chức & Nhân sự",
  "IV — Lương 3P & Đầu mối",
  "V — Văn hóa & Con người",
  "VI — Chiến lược KD & MKT",
  "VII — Công nghệ & Dữ liệu",
  "VIII — Học tập & Tương lai",
];

function getSectionShort(phanCl: string): string {
  const match = phanCl.match(/^([IVX]+)/);
  return match ? match[1] : "?";
}

export default function HM50Heatmap({
  hmItems,
  allHM,
}: {
  hmItems: HMTimelineItem[];
  allHM: { tt: number; hang_muc: string; phan_cl: string; status: string }[];
}) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [hoveredHM, setHoveredHM] = useState<number | null>(null);

  // Build lookup: hm_tt → timeline data
  const hmMap = new Map<number, HMTimelineItem>();
  for (const item of hmItems) {
    hmMap.set(item.hm_tt, item);
  }

  // Group HM by section
  const grouped: Record<string, typeof allHM> = {};
  for (const hm of allHM) {
    const sec = hm.phan_cl || "Khác";
    if (!grouped[sec]) grouped[sec] = [];
    grouped[sec].push(hm);
  }

  const expandedItem = expanded !== null ? hmMap.get(expanded) : null;

  return (
    <div className="space-y-6">
      {/* Heat Map Grid — grouped by section */}
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200/50">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[13px] font-medium text-gray-400">
            50 HM — Mức leo thang BOD
          </h3>
          <div className="flex items-center gap-3 text-[11px] text-gray-400">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded bg-gray-50 ring-1 ring-gray-200" />
              0
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded bg-emerald-100" />
              1
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded bg-amber-400" />
              2-3
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded bg-red-500" />
              4+
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded bg-red-600 ring-2 ring-red-900" />
              Nguy hiểm
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {SECTION_ORDER.map((sec) => {
            const items = grouped[sec];
            if (!items || items.length === 0) return null;

            return (
              <div key={sec} className="flex items-start gap-3">
                <span className="mt-1 w-8 shrink-0 text-right text-[11px] font-semibold text-gray-400">
                  {getSectionShort(sec)}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {items
                    .sort((a, b) => a.tt - b.tt)
                    .map((hm) => {
                      const data = hmMap.get(hm.tt);
                      const mentions = data?.total_mentions || 0;
                      const color = getHeatColor(mentions, hm.status);
                      const isExpanded = expanded === hm.tt;

                      return (
                        <div key={hm.tt} className="relative">
                          <button
                            onClick={() =>
                              setExpanded(isExpanded ? null : hm.tt)
                            }
                            onMouseEnter={() => setHoveredHM(hm.tt)}
                            onMouseLeave={() => setHoveredHM(null)}
                            className={`flex h-9 w-9 items-center justify-center rounded-lg text-[11px] font-bold transition-all ${color} ${
                              isExpanded
                                ? "scale-125 shadow-lg z-10"
                                : "hover:scale-110 hover:shadow-md"
                            }`}
                          >
                            {hm.tt}
                          </button>

                          {/* Tooltip on hover */}
                          {hoveredHM === hm.tt && !isExpanded && (
                            <div className="absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-xl bg-gray-900 px-3 py-2 text-[11px] text-white shadow-xl">
                              <p className="font-semibold">
                                HM{hm.tt}: {hm.hang_muc}
                              </p>
                              {data ? (
                                <>
                                  <p className="mt-0.5 text-gray-300">
                                    {data.total_mentions} mentions
                                    {" · "}
                                    {getTrendLabel(data.trend)}
                                  </p>
                                  <p className="text-gray-400">
                                    {hm.status}
                                  </p>
                                </>
                              ) : (
                                <p className="mt-0.5 text-gray-400">
                                  Chưa leo thang · {hm.status}
                                </p>
                              )}
                              <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Expanded detail panel */}
      {expandedItem && (
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200/50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    expandedItem.trend === "critical"
                      ? "bg-red-100 text-red-700"
                      : expandedItem.trend === "worsening"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {getTrendLabel(expandedItem.trend)}
                </span>
                <span className="text-[12px] text-gray-400">
                  {expandedItem.current_status}
                </span>
              </div>
              <h4 className="mt-2 text-lg font-semibold text-gray-900">
                HM{expandedItem.hm_tt}: {expandedItem.title}
              </h4>
              <p className="mt-1 text-[13px] text-gray-500">
                {expandedItem.phan_cl} · {expandedItem.t1_dau_moi}
              </p>
            </div>
            <button
              onClick={() => setExpanded(null)}
              className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Danh sách chỉ đạo từ BOD */}
          <div className="mt-4 space-y-3">
            {expandedItem.escalation_history.map((hist) => (
              <div key={hist.meeting}>
                <div className="flex items-center gap-2 text-[12px] text-gray-400">
                  <span className="font-semibold text-gray-600">
                    {hist.meeting.replace("BOD_", "BOD ")}
                  </span>
                  <span>·</span>
                  <span>{hist.date}</span>
                  <span>·</span>
                  <span>{hist.count} chỉ đạo</span>
                </div>
                <div className="mt-2 space-y-1.5">
                  {hist.directives.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center gap-2 rounded-xl bg-gray-50 px-4 py-2.5 text-[13px]"
                    >
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          d.loai === "leo_thang"
                            ? "bg-red-100 text-red-600"
                            : d.loai === "moi"
                            ? "bg-blue-100 text-blue-600"
                            : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {d.loai === "leo_thang"
                          ? "Leo thang"
                          : d.loai === "moi"
                          ? "Mới"
                          : "Bổ sung"}
                      </span>
                      <span className="font-medium text-gray-700">
                        {d.id}
                      </span>
                      <span className="text-gray-600">{d.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
