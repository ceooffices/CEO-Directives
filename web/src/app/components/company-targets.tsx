"use client";

import TrafficLight from "./traffic-light";

// ============================================================
// KPI_SEED — Tạm thời từ báo cáo BOD 07/04/2026 (anh Tuấn)
// CÁCH THAY: Set KPI_SOURCE = "supabase" khi có nguồn chính thức
// Hoặc truyền kpiActual từ Supabase vào đây.
// ============================================================
export const KPI_SEED = {
  nhapHoc: 0,      // Chờ nguồn chính thức từ phòng tuyển sinh
  matching: 127,   // Anh Tuấn báo cáo BOD 07/04: đang matching Q1 — 127 học viên đã ghép đơn
  matchingNote: "Q1/2026 — Nguồn: Báo cáo OneTeam BOD 07/04 (tạm)",
  nhapHocNote: "Chờ số liệu chính thức từ phòng Nhập học",
  lastUpdated: "07/04/2026",
};

interface CompanyTargetsProps {
  healthScore: number;
  traffic: { green: number; yellow: number; red: number; black: number; done: number };
  bscRates: { label: string; pct: number; color: string }[];
  kpiActual?: { nhapHoc: number; matching: number };
}

export default function CompanyTargets({
  healthScore,
  traffic,
  bscRates,
  kpiActual,
}: CompanyTargetsProps) {
  const TARGET_NHAP_HOC = 3333;
  const TARGET_MATCHING = 2222;

  // Ưu tiên: prop từ Supabase (nếu > 0) → KPI_SEED
  const actual = {
    nhapHoc: kpiActual?.nhapHoc || KPI_SEED.nhapHoc,
    matching: kpiActual?.matching || KPI_SEED.matching,
  };

  const nhapHocPct = Math.min(100, Math.round((actual.nhapHoc / TARGET_NHAP_HOC) * 100));
  const matchingPct = Math.min(100, Math.round((actual.matching / TARGET_MATCHING) * 100));

  return (
    <div className="space-y-3">
      {/* ===== KPI CARDS ===== */}
      <div className="grid grid-cols-2 gap-3">
        {/* Nhập học */}
        <div className="card p-4 flex flex-col gap-2">
          <p className="text-[13px] font-semibold uppercase tracking-wider text-[#34C759]">
            Nhập học 2026
          </p>
          <div className="flex items-end gap-1">
            <span className="text-4xl font-black tabular-nums text-[#1C1C1E]">
              {actual.nhapHoc.toLocaleString("vi-VN")}
            </span>
            <span className="mb-0.5 text-[14px] text-[#6C6C70]">/ {TARGET_NHAP_HOC.toLocaleString("vi-VN")}</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill bg-[#34C759]" style={{ width: `${Math.max(nhapHocPct, 1)}%` }} />
          </div>
          <p className="text-[13px] text-[#AEAEB2]">{nhapHocPct}% mục tiêu</p>
          {/* CTA */}
          <a
            href="?tab=hanh-dong"
            className="cta-secondary cta-success mt-1 text-[15px] py-2 px-3 rounded-xl"
          >
            Xem tiến độ →
          </a>
        </div>

        {/* Matching */}
        <div className="card p-4 flex flex-col gap-2">
          <p className="text-[13px] font-semibold uppercase tracking-wider text-[#007AFF]">
            Matching 2026
          </p>
          <div className="flex items-end gap-1">
            <span className="text-4xl font-black tabular-nums text-[#1C1C1E]">
              {actual.matching.toLocaleString("vi-VN")}
            </span>
            <span className="mb-0.5 text-[14px] text-[#6C6C70]">/ {TARGET_MATCHING.toLocaleString("vi-VN")}</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill bg-[#007AFF]" style={{ width: `${Math.max(matchingPct, 1)}%` }} />
          </div>
          <p className="text-[13px] text-[#AEAEB2]">{matchingPct}% mục tiêu</p>
          {/* CTA */}
          <a
            href="?tab=hanh-dong"
            className="cta-secondary mt-1 text-[15px] py-2 px-3 rounded-xl"
          >
            Cập nhật →
          </a>
        </div>
      </div>

      {/* Data freshness badge */}
      <p className="text-[13px] text-[#AEAEB2] text-center">
        🕐 Cập nhật {KPI_SEED.lastUpdated} · {KPI_SEED.matchingNote}
      </p>

      {/* ===== HEALTH SCORE + TRAFFIC ===== */}
      <div className="grid grid-cols-2 gap-3">
        {/* Health Score */}
        <div className="card p-4">
          <h3 className="text-[14px] font-medium text-[#6C6C70] uppercase tracking-wide mb-2">
            Sức khoẻ hệ thống
          </h3>
          <div className="flex items-end gap-2">
            <span
              className={`text-5xl font-black tabular-nums ${
                healthScore >= 70 ? "text-[#34C759]" : healthScore >= 40 ? "text-[#FF9500]" : "text-[#FF3B30]"
              }`}
            >
              {healthScore}
            </span>
            <span className="mb-1 text-[16px] text-[#AEAEB2]">/ 100</span>
          </div>
          <div className="progress-bar mt-3">
            <div
              className={`progress-fill ${
                healthScore >= 70 ? "bg-[#34C759]" : healthScore >= 40 ? "bg-[#FF9500]" : "bg-[#FF3B30]"
              }`}
              style={{ width: `${healthScore}%` }}
            />
          </div>
        </div>

        {/* Traffic Light */}
        <div className="card p-4">
          <h3 className="text-[14px] font-medium text-[#6C6C70] uppercase tracking-wide mb-2">
            Tín hiệu
          </h3>
          <TrafficLight
            green={traffic.green}
            yellow={traffic.yellow}
            red={traffic.red}
            black={traffic.black}
            done={traffic.done}
          />
        </div>
      </div>

      {/* ===== BSC COMPLETION ===== */}
      {bscRates.length > 0 && (
        <div className="card p-4">
          <h3 className="text-[14px] font-medium text-[#6C6C70] uppercase tracking-wide mb-3">
            Tiến độ theo BSC
          </h3>
          <div className="space-y-3">
            {bscRates.map((rate) => (
              <div key={rate.label}>
                <div className="flex items-center justify-between text-[15px] mb-1">
                  <span className="font-medium text-[#1C1C1E]">{rate.label}</span>
                  <span
                    className={`font-semibold ${
                      rate.pct >= 70 ? "text-[#34C759]" : rate.pct >= 40 ? "text-[#FF9500]" : rate.pct > 0 ? "text-[#FF3B30]" : "text-[#AEAEB2]"
                    }`}
                  >
                    {rate.pct}%
                  </span>
                </div>
                <div className="progress-bar">
                  <div className={`progress-fill ${rate.color}`} style={{ width: `${Math.max(rate.pct, 1)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
