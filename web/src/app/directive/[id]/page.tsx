/**
 * Directive Detail Page — /directive/[id]
 * 
 * Trang CEO quan tâm nhất — xét duyệt báo cáo đầu mối
 * Features: Engagement Stats (hero numbers), GitHub Timeline, Diff View
 * 
 * Triết lý: Nhận diện hành vi qua metadata — tinh tế, chuyên nghiệp
 */

import { getDirectiveById, getTrackingEvents, getStepHistory, getEngagementStats, LLS_STEP_NAMES } from "@/lib/supabase";
import Link from "next/link";
import DeadlineCountdown from "@/app/components/deadline-countdown";
import EngagementActivity from "@/app/components/engagement-activity";
import EngagementStats from "@/app/components/engagement-stats";
import DiffTimeline from "@/app/components/diff-timeline";
import type { DiffEntry, DiffChange } from "@/app/components/diff-timeline";

export const dynamic = "force-dynamic";

function daysUntil(deadline: string | null): number | null {
  if (!deadline) return null;
  const diff = new Date(deadline).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function statusBadge(tinh_trang: string) {
  const colors: Record<string, string> = {
    hoan_thanh: "bg-emerald-50 text-emerald-600 ring-emerald-200/50",
    dang_thuc_hien: "bg-blue-50 text-blue-600 ring-blue-200/50",
    da_xac_nhan: "bg-cyan-50 text-cyan-600 ring-cyan-200/50",
    cho_duyet: "bg-amber-50 text-amber-600 ring-amber-200/50",
    cho_xu_ly: "bg-gray-50 text-gray-500 ring-gray-200/50",
    leo_thang_ceo: "bg-red-50 text-red-600 ring-red-200/50",
  };
  const cls = colors[tinh_trang] || "bg-gray-50 text-gray-500 ring-gray-200/50";
  return `inline-block rounded-full px-3 py-1 text-xs font-semibold ring-1 ${cls}`;
}

const STATUS_LABELS: Record<string, string> = {
  cho_xu_ly: "Chờ xử lý",
  cho_duyet: "Chờ duyệt",
  da_duyet: "Đã duyệt",
  da_xac_nhan: "Đã xác nhận",
  dang_thuc_hien: "Đang thực hiện",
  hoan_thanh: "Hoàn thành",
  tu_choi: "Từ chối",
  leo_thang_ceo: "Tín hiệu rủi ro CEO",
};

const LOAI_LABELS: Record<string, string> = {
  leo_thang: "Tín hiệu rủi ro từ HM50",
  bo_sung: "Bổ sung cho HM50",
  moi: "Mới phát sinh",
  tu_50hm: "Từ 50 Hạng mục",
};

/**
 * Build diff entries từ step history
 * So sánh giữa các bước để tìm thay đổi
 */
function buildDiffEntries(
  history: { step_number: number; step_name: string; action: string; actor: string | null; detail: string | null; created_at: string }[],
  directive: { t2_nhiem_vu: string; t3_chi_tieu: string | null; t4_thoi_han: string | null; t1_dau_moi: string; t5_thanh_vien: string[] | null }
): DiffEntry[] {
  // If no history, create initial state entry
  if (history.length === 0) {
    const changes: DiffChange[] = [];
    changes.push({ field: "t2_nhiem_vu", fieldLabel: "Nhiệm vụ", oldValue: null, newValue: directive.t2_nhiem_vu, type: "added" });
    changes.push({ field: "t1_dau_moi", fieldLabel: "Đầu mối", oldValue: null, newValue: directive.t1_dau_moi, type: "added" });
    if (directive.t3_chi_tieu) {
      changes.push({ field: "t3_chi_tieu", fieldLabel: "Chỉ tiêu", oldValue: null, newValue: directive.t3_chi_tieu, type: "added" });
    }
    if (directive.t4_thoi_han) {
      changes.push({
        field: "t4_thoi_han",
        fieldLabel: "Thời hạn",
        oldValue: null,
        newValue: new Date(directive.t4_thoi_han).toLocaleDateString("vi-VN"),
        type: "added",
      });
    }
    if (directive.t5_thanh_vien?.length) {
      changes.push({ field: "t5_thanh_vien", fieldLabel: "Thành viên", oldValue: null, newValue: directive.t5_thanh_vien.join(", "), type: "added" });
    }
    return [{
      step_number: 1,
      step_name: "B1 Khởi tạo chỉ đạo",
      action: "Tạo mới",
      actor: null,
      detail: null,
      created_at: new Date().toISOString(),
      changes,
    }];
  }

  // Build from history (reverse to chronological order)
  const chronological = [...history].reverse();
  return chronological.map((h) => {
    const changes: DiffChange[] = [];

    // Parse detail for diff information
    if (h.detail) {
      // Try to extract field changes from detail text
      const fieldPatterns = [
        { pattern: /deadline.*→\s*(.+)/i, field: "t4_thoi_han", label: "Thời hạn" },
        { pattern: /chi.*tiêu.*→\s*(.+)/i, field: "t3_chi_tieu", label: "Chỉ tiêu" },
        { pattern: /thành.*viên.*→\s*(.+)/i, field: "t5_thanh_vien", label: "Thành viên" },
      ];

      let matched = false;
      for (const fp of fieldPatterns) {
        const m = h.detail.match(fp.pattern);
        if (m) {
          changes.push({
            field: fp.field,
            fieldLabel: fp.label,
            oldValue: null,
            newValue: m[1].trim(),
            type: "modified",
          });
          matched = true;
        }
      }

      // If no pattern matched, treat detail as a general change
      if (!matched && h.detail.length > 0) {
        changes.push({
          field: "detail",
          fieldLabel: h.step_name,
          oldValue: null,
          newValue: h.detail,
          type: "added",
        });
      }
    }

    return {
      step_number: h.step_number,
      step_name: h.step_name,
      action: h.action,
      actor: h.actor,
      detail: h.detail,
      created_at: h.created_at,
      changes,
    };
  });
}

export default async function DirectivePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const directive = await getDirectiveById(id);

  if (!directive) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-gray-400">
        <div className="text-center">
          <p className="text-6xl font-bold text-zinc-700">404</p>
          <p className="mt-3 text-gray-500">Không tìm thấy chỉ đạo</p>
          <Link href="/" className="mt-6 inline-block rounded-full bg-zinc-800 px-5 py-2.5 text-sm font-medium text-zinc-300 transition-all hover:bg-zinc-700">
            ← Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const [events, history, engagementStats] = await Promise.all([
    getTrackingEvents(directive.id),
    getStepHistory(directive.id),
    getEngagementStats(directive.id),
  ]);

  const days = daysUntil(directive.t4_thoi_han);
  const d = directive;
  const diffEntries = buildDiffEntries(history, {
    t2_nhiem_vu: d.t2_nhiem_vu,
    t3_chi_tieu: d.t3_chi_tieu,
    t4_thoi_han: d.t4_thoi_han,
    t1_dau_moi: d.t1_dau_moi,
    t5_thanh_vien: d.t5_thanh_vien,
  });

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header — sticky, dark theme */}
      <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="rounded-full bg-zinc-800 px-4 py-2 text-[13px] font-medium text-zinc-400 transition-all hover:bg-zinc-700 hover:text-zinc-200 active:scale-95">
            ← Dashboard
          </Link>
          <div className="flex gap-2">
            <Link href={`/approve/${d.id}`} className="rounded-full bg-emerald-900/50 px-4 py-2 text-[13px] font-medium text-emerald-400 transition-all hover:bg-emerald-900/80 ring-1 ring-emerald-800/50">
              ✓ Duyệt
            </Link>
            <Link href={`/confirm/${d.id}`} className="rounded-full bg-blue-900/50 px-4 py-2 text-[13px] font-medium text-blue-400 transition-all hover:bg-blue-900/80 ring-1 ring-blue-800/50">
              Xác nhận
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 space-y-5 sm:px-6">
        {/* Title + Status */}
        <div className="rounded-3xl bg-zinc-900 p-5 shadow-lg ring-1 ring-zinc-800 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className={statusBadge(d.tinh_trang)}>
              {STATUS_LABELS[d.tinh_trang] || d.tinh_trang}
            </span>
            <span className="rounded-full bg-zinc-800 px-3 py-1 text-[11px] font-mono text-zinc-500">
              {d.directive_code}
            </span>
            {d.hm50 && (
              <span className="rounded-full bg-indigo-950/50 px-3 py-1 text-[11px] font-medium text-indigo-400 ring-1 ring-indigo-800/30">
                HM{d.hm50.hm_number} — {d.hm50.ten}
              </span>
            )}
          </div>
          <h1 className="mt-3 text-xl font-bold tracking-tight text-zinc-100 sm:text-2xl">
            {d.t2_nhiem_vu || "Không có tiêu đề"}
          </h1>
          {d.meeting_source && (
            <p className="mt-2 text-[13px] text-zinc-500">{d.meeting_source}</p>
          )}
          <div className="mt-3">
            <DeadlineCountdown deadline={d.t4_thoi_han} />
          </div>
        </div>

        {/* 🔥 Engagement Stats — Hero Numbers */}
        <EngagementStats
          emailSent={engagementStats.emailSent}
          emailOpened={engagementStats.emailOpened}
          linkClicked={engagementStats.linkClicked}
          firstOpenAt={engagementStats.firstOpenAt}
          lastOpenAt={engagementStats.lastOpenAt}
          uniqueOpeners={engagementStats.uniqueOpeners}
          totalRecipients={engagementStats.totalRecipients}
        />

        {/* 5T Grid — upgraded visual */}
        <div className="grid grid-cols-2 gap-3">
          <InfoCard label="T1 — Đầu mối" value={d.t1_dau_moi} icon="👤" />
          <InfoCard label="T2 — Nhiệm vụ" value={d.t2_nhiem_vu} icon="📋" />
          <InfoCard label="T3 — Chỉ tiêu" value={d.t3_chi_tieu || "Chưa có"} icon="🎯" />
          <InfoCard
            label="T4 — Thời hạn"
            value={d.t4_thoi_han ? new Date(d.t4_thoi_han).toLocaleDateString("vi-VN") : "Không có"}
            icon="📅"
            accent={days !== null && days < 0 ? "red" : days !== null && days < 3 ? "amber" : undefined}
            sub={days !== null ? (days < 0 ? `Cần quan tâm — ${Math.abs(days)} ngày` : days === 0 ? "Hôm nay" : `Còn ${days} ngày`) : undefined}
          />
          <InfoCard label="T5 — Thành viên" value={d.t5_thanh_vien?.join(", ") || "Chưa có"} icon="👥" />
          <InfoCard label="LELONGSON" value={LLS_STEP_NAMES[d.lls_step] || `Bước ${d.lls_step}`} icon="🔄" />
        </div>

        {/* 📜 Timeline — GitHub Commit History Style */}
        <EngagementActivity events={events} />

        {/* 📝 Diff History — TrackChange View */}
        <DiffTimeline entries={diffEntries} />

        {/* ℹ️ Meta */}
        <div className="rounded-3xl bg-zinc-900 p-5 shadow-lg ring-1 ring-zinc-800 sm:p-6">
          <h2 className="text-[13px] font-medium text-zinc-500 uppercase tracking-wide">
            Thông tin
          </h2>
          <div className="mt-3 space-y-3 text-[13px]">
            <div className="flex justify-between">
              <span className="text-zinc-500">Ngày tạo</span>
              <span className="text-zinc-300">{new Date(d.created_at).toLocaleDateString("vi-VN")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Loại</span>
              <span className="text-zinc-300">{LOAI_LABELS[d.loai || ""] || d.loai || "Chưa phân loại"}</span>
            </div>
            {d.approved_by && (
              <div className="flex justify-between">
                <span className="text-zinc-500">Duyệt bởi</span>
                <span className="text-zinc-300">{d.approved_by}</span>
              </div>
            )}
            {d.approved_at && (
              <div className="flex justify-between">
                <span className="text-zinc-500">Duyệt lúc</span>
                <span className="text-zinc-300">{new Date(d.approved_at).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</span>
              </div>
            )}
            {d.confirmed_by && (
              <div className="flex justify-between">
                <span className="text-zinc-500">Xác nhận bởi</span>
                <span className="text-zinc-300">{d.confirmed_by}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-zinc-500">ID</span>
              <span className="font-mono text-[11px] text-zinc-600">{d.id.slice(0, 8)}</span>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-800 py-6 text-center text-[11px] text-zinc-600">
        CEO Directive Automation — EsuhaiGroup © 2026
      </footer>
    </div>
  );
}

function InfoCard({ label, value, sub, accent, icon }: { label: string; value: string; sub?: string; accent?: "red" | "amber"; icon?: string }) {
  const accentClass = accent === "red" ? "text-red-400" : accent === "amber" ? "text-amber-400" : "text-zinc-200";
  return (
    <div className="rounded-2xl bg-zinc-900 p-4 shadow-sm ring-1 ring-zinc-800">
      <div className="flex items-center gap-1.5">
        {icon && <span className="text-sm">{icon}</span>}
        <p className="text-[11px] font-medium text-zinc-500">{label}</p>
      </div>
      <p className={`mt-1.5 text-[14px] font-semibold truncate ${accentClass}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-zinc-500">{sub}</p>}
    </div>
  );
}
