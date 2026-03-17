/**
 * Directive Detail Page — /directive/[id]
 * Đọc từ Supabase (không Notion)
 */

import { getDirectiveById, getTrackingEvents, getStepHistory, LLS_STEP_NAMES } from "@/lib/supabase";
import Link from "next/link";
import DeadlineCountdown from "@/app/components/deadline-countdown";
import EngagementActivity from "@/app/components/engagement-activity";

export const dynamic = "force-dynamic";

function daysUntil(deadline: string | null): number | null {
  if (!deadline) return null;
  const diff = new Date(deadline).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function statusBadge(tinh_trang: string) {
  const colors: Record<string, string> = {
    hoan_thanh: "bg-green-50 text-green-600",
    dang_thuc_hien: "bg-blue-50 text-blue-600",
    da_xac_nhan: "bg-cyan-50 text-cyan-600",
    cho_duyet: "bg-amber-50 text-amber-600",
    cho_xu_ly: "bg-gray-50 text-gray-500",
    leo_thang_ceo: "bg-red-50 text-red-600",
  };
  const cls = colors[tinh_trang] || "bg-gray-50 text-gray-500";
  return `inline-block rounded-full px-3 py-1 text-xs font-semibold ${cls}`;
}

const STATUS_LABELS: Record<string, string> = {
  cho_xu_ly: "Chờ xử lý",
  cho_duyet: "Chờ duyệt",
  da_duyet: "Đã duyệt",
  da_xac_nhan: "Đã xác nhận",
  dang_thuc_hien: "Đang thực hiện",
  hoan_thanh: "Hoàn thành",
  tu_choi: "Từ chối",
  leo_thang_ceo: "Leo thang CEO",
};

export default async function DirectivePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const directive = await getDirectiveById(id);

  if (!directive) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f5f7] text-gray-400">
        <div className="text-center">
          <p className="text-5xl font-bold text-gray-300">404</p>
          <p className="mt-2 text-gray-500">Không tìm thấy chỉ đạo</p>
          <Link href="/" className="mt-4 inline-block text-blue-500 hover:underline">
            Về Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const [events, history] = await Promise.all([
    getTrackingEvents(directive.id),
    getStepHistory(directive.id),
  ]);

  const days = daysUntil(directive.t4_thoi_han);
  const d = directive;

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200/60 bg-white/70 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="rounded-full bg-gray-100 px-4 py-2 text-[13px] font-medium text-gray-600 transition-all hover:bg-gray-200 active:scale-95">
            Dashboard
          </Link>
          <div className="flex gap-2">
            <Link href={`/approve/${d.id}`} className="rounded-full bg-green-50 px-4 py-2 text-[13px] font-medium text-green-600 transition-all hover:bg-green-100">
              Duyệt
            </Link>
            <Link href={`/confirm/${d.id}`} className="rounded-full bg-blue-50 px-4 py-2 text-[13px] font-medium text-blue-600 transition-all hover:bg-blue-100">
              Xác nhận
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 space-y-6 sm:px-6">
        {/* Title + Status */}
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-200/50 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className={statusBadge(d.tinh_trang)}>
              {STATUS_LABELS[d.tinh_trang] || d.tinh_trang}
            </span>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-mono text-gray-500">
              {d.directive_code}
            </span>
            {d.hm50 && (
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-medium text-indigo-500">
                HM{d.hm50.hm_number} — {d.hm50.ten}
              </span>
            )}
          </div>
          <h1 className="mt-3 text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
            {d.t2_nhiem_vu || "Không có tiêu đề"}
          </h1>
          {d.meeting_source && (
            <p className="mt-2 text-[13px] text-gray-400">{d.meeting_source}</p>
          )}
          <div className="mt-3">
            <DeadlineCountdown deadline={d.t4_thoi_han} />
          </div>
        </div>

        {/* 5T Grid */}
        <div className="grid grid-cols-2 gap-3">
          <InfoCard label="T1 — Đầu mối" value={d.t1_dau_moi} />
          <InfoCard label="T2 — Nhiệm vụ" value={d.t2_nhiem_vu} />
          <InfoCard label="T3 — Chỉ tiêu" value={d.t3_chi_tieu || "Chưa có"} />
          <InfoCard
            label="T4 — Thời hạn"
            value={d.t4_thoi_han ? new Date(d.t4_thoi_han).toLocaleDateString("vi-VN") : "Không có"}
            accent={days !== null && days < 0 ? "red" : days !== null && days < 3 ? "amber" : undefined}
            sub={days !== null ? (days < 0 ? `Quá hạn ${Math.abs(days)} ngày` : days === 0 ? "Hôm nay" : `Còn ${days} ngày`) : undefined}
          />
          <InfoCard label="T5 — Thành viên" value={d.t5_thanh_vien?.join(", ") || "Chưa có"} />
          <InfoCard label="LELONGSON" value={LLS_STEP_NAMES[d.lls_step] || `Bước ${d.lls_step}`} />
        </div>

        {/* Step History */}
        {history.length > 0 && (
          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-200/50 sm:p-6">
            <h2 className="text-[13px] font-medium text-gray-400 uppercase tracking-wide">
              Lịch sử LELONGSON
            </h2>
            <div className="mt-4 space-y-2">
              {history.map((h, i) => (
                <div key={i} className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3 text-[13px]">
                  <div>
                    <p className="text-gray-600 font-medium">{h.step_name} — {h.action}</p>
                    {h.detail && <p className="text-[11px] text-gray-400 mt-0.5">{h.detail}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] text-gray-400">{h.actor || ""}</p>
                    <p className="text-[11px] text-gray-300 tabular-nums">
                      {new Date(h.created_at).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Engagement Events — Phase 4 Timeline */}
        <EngagementActivity events={events} />

        {/* Meta */}
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-200/50 sm:p-6">
          <h2 className="text-[13px] font-medium text-gray-400 uppercase tracking-wide">
            Thông tin
          </h2>
          <div className="mt-3 space-y-3 text-[13px]">
            <div className="flex justify-between">
              <span className="text-gray-400">Ngày tạo</span>
              <span className="text-gray-700">{new Date(d.created_at).toLocaleDateString("vi-VN")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Loại</span>
              <span className="text-gray-700">{d.loai === "leo_thang" ? "Leo thang từ HM50" : d.loai === "bo_sung" ? "Bổ sung cho HM50" : d.loai === "moi" ? "Mới phát sinh" : d.loai || "Chưa phân loại"}</span>
            </div>
            {d.approved_by && (
              <div className="flex justify-between">
                <span className="text-gray-400">Duyệt bởi</span>
                <span className="text-gray-700">{d.approved_by}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-400">ID</span>
              <span className="font-mono text-[11px] text-gray-300">{d.id.slice(0, 8)}</span>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-200/60 py-6 text-center text-[11px] text-gray-300">
        CEO Directive Automation — EsuhaiGroup © 2026
      </footer>
    </div>
  );
}

function InfoCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: "red" | "amber" }) {
  const accentClass = accent === "red" ? "text-red-500" : accent === "amber" ? "text-amber-500" : "text-gray-900";
  return (
    <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-gray-200/50">
      <p className="text-[11px] font-medium text-gray-400">{label}</p>
      <p className={`mt-1 text-[14px] font-semibold truncate ${accentClass}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-gray-400">{sub}</p>}
    </div>
  );
}
