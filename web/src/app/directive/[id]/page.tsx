/**
 * Directive Detail / Analytics Page
 * /directive/[id] — Light Apple-style, mobile-first
 */

import { getDirectives } from "@/lib/notion";
import Link from "next/link";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

interface TrackingEvent {
  directiveId: string;
  recipientEmail: string;
  openedAt: string;
  isBot: boolean;
  userAgent?: string;
}

async function getTrackingData(directiveId: string): Promise<TrackingEvent[]> {
  try {
    const filePath = path.join(process.cwd(), "..", "data", "email_opens.json");
    if (!fs.existsSync(filePath)) return [];
    const raw = fs.readFileSync(filePath, "utf-8");
    const events: TrackingEvent[] = JSON.parse(raw);
    return events.filter((e) => e.directiveId === directiveId);
  } catch {
    return [];
  }
}

function daysUntil(deadline: string | null): number | null {
  if (!deadline) return null;
  const diff = new Date(deadline).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    "Hoàn thành": "bg-green-50 text-green-600",
    "Đã hoàn thành": "bg-green-50 text-green-600",
    "Đang thực hiện": "bg-blue-50 text-blue-600",
    "Đang xử lý": "bg-blue-50 text-blue-600",
    "Chờ làm rõ": "bg-amber-50 text-amber-600",
    "Chờ xác nhận": "bg-amber-50 text-amber-600",
    "Đã xác nhận 5T": "bg-cyan-50 text-cyan-600",
  };
  const cls = colors[status] || "bg-gray-50 text-gray-500";
  return `inline-block rounded-full px-3 py-1 text-xs font-semibold ${cls}`;
}

export default async function DirectivePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const directives = await getDirectives();
  const directive = directives.find((d) => d.id === id || d.id.replace(/-/g, "") === id);

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

  const tracking = await getTrackingData(directive.id);
  const realOpens = tracking.filter((e) => !e.isBot);
  const botOpens = tracking.filter((e) => e.isBot);
  const days = daysUntil(directive.deadline);

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200/60 bg-white/70 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="rounded-full bg-gray-100 px-4 py-2 text-[13px] font-medium text-gray-600 transition-all hover:bg-gray-200 active:scale-95">
            Dashboard
          </Link>
          <a
            href={directive.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-blue-50 px-4 py-2 text-[13px] font-medium text-blue-600 transition-all hover:bg-blue-100 active:scale-95"
          >
            Notion
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 space-y-6 sm:px-6">
        {/* Title */}
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-200/50 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className={statusBadge(directive.status)}>{directive.status}</span>
            {directive.hm50_ref && (
              <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-medium text-gray-500">
                {directive.hm50_ref}
              </span>
            )}
            {directive.section && (
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-medium text-indigo-500">
                {directive.section}
              </span>
            )}
          </div>
          <h1 className="mt-3 text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
            {directive.title || "Không có tiêu đề"}
          </h1>
        </div>

        {/* 5T Grid — mobile 2-col */}
        <div className="grid grid-cols-2 gap-3">
          <InfoCard label="T1 — Đầu mối" value={directive.dau_moi || "Chưa rõ"} />
          <InfoCard label="T2 — Nhiệm vụ" value={directive.nhiem_vu || "Chưa rõ"} />
          <InfoCard
            label="T4 — Thời hạn"
            value={directive.deadline ? new Date(directive.deadline).toLocaleDateString("vi-VN") : "Không có"}
            accent={
              days !== null && days < 0
                ? "red"
                : days !== null && days < 3
                ? "amber"
                : undefined
            }
            sub={
              days !== null
                ? days < 0
                  ? `Quá hạn ${Math.abs(days)} ngày`
                  : days === 0
                  ? "Hôm nay"
                  : `Còn ${days} ngày`
                : undefined
            }
          />
          <InfoCard label="Nguồn" value={directive.nguon || "Không rõ"} />
        </div>

        {/* Tracking */}
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-200/50 sm:p-6">
          <h2 className="text-[13px] font-medium text-gray-400 uppercase tracking-wide">
            Email Tracking
          </h2>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-2xl font-bold tabular-nums text-gray-900">{tracking.length}</p>
              <p className="mt-0.5 text-[11px] text-gray-400">Tổng</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold tabular-nums text-green-600">{realOpens.length}</p>
              <p className="mt-0.5 text-[11px] text-gray-400">Người thật</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold tabular-nums text-gray-300">{botOpens.length}</p>
              <p className="mt-0.5 text-[11px] text-gray-400">Bot</p>
            </div>
          </div>

          {tracking.length > 0 && (
            <div className="mt-5 space-y-2">
              {tracking
                .sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime())
                .slice(0, 10)
                .map((e, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3 text-[13px]"
                  >
                    <div>
                      <p className="text-gray-600">{e.recipientEmail}</p>
                      <p className="text-[11px] text-gray-400 tabular-nums">
                        {new Date(e.openedAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}
                      </p>
                    </div>
                    {e.isBot ? (
                      <span className="text-[11px] text-gray-300">Bot</span>
                    ) : (
                      <span className="text-[11px] font-medium text-green-500">Đã đọc</span>
                    )}
                  </div>
                ))}
            </div>
          )}

          {tracking.length === 0 && (
            <p className="mt-4 text-[13px] text-gray-300">Chưa có dữ liệu tracking.</p>
          )}
        </div>

        {/* Info */}
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-200/50 sm:p-6">
          <h2 className="text-[13px] font-medium text-gray-400 uppercase tracking-wide">
            Thông tin
          </h2>
          <div className="mt-3 space-y-3 text-[13px]">
            <div className="flex justify-between">
              <span className="text-gray-400">Ngày tạo</span>
              <span className="text-gray-700">{new Date(directive.created_at).toLocaleDateString("vi-VN")}</span>
            </div>
            {directive.section && (
              <div className="flex justify-between">
                <span className="text-gray-400">Trụ cột</span>
                <span className="text-gray-700">{directive.section}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-400">Notion ID</span>
              <span className="font-mono text-[11px] text-gray-300">{directive.id.slice(0, 8)}</span>
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
