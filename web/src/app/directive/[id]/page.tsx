/**
 * Directive Detail / Analytics Page
 * /directive/[id] — Shows individual directive details and email open tracking
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
    "Hoàn thành": "bg-green-500/20 text-green-400 border-green-500/30",
    "Đã hoàn thành": "bg-green-500/20 text-green-400 border-green-500/30",
    "Đang thực hiện": "bg-blue-500/20 text-blue-400 border-blue-500/30",
    "Đang xử lý": "bg-blue-500/20 text-blue-400 border-blue-500/30",
    "Chờ làm rõ": "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    "Chờ xác nhận": "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    "Đã xác nhận 5T": "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    "Quá hạn": "bg-red-500/20 text-red-400 border-red-500/30",
  };
  const cls = colors[status] || "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
  return `inline-block rounded-full border px-3 py-1 text-xs font-semibold ${cls}`;
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
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">
        <div className="text-center">
          <p className="text-4xl font-bold">404</p>
          <p className="mt-2">Không tìm thấy chỉ đạo</p>
          <Link href="/" className="mt-4 inline-block text-blue-400 hover:underline">
            ← Về Dashboard
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
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-sm text-zinc-400 hover:text-white transition-colors">
            ← Dashboard
          </Link>
          <a
            href={directive.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:border-zinc-500 hover:text-white transition-colors"
          >
            Mở trong Notion →
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8 space-y-8">
        {/* Title + Status */}
        <div>
          <div className="flex items-start gap-3 flex-wrap">
            <span className={statusBadge(directive.status)}>{directive.status}</span>
            {directive.hm50_ref && (
              <span className="rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs text-zinc-400">
                {directive.hm50_ref}
              </span>
            )}
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-white">
            {directive.title || "Không có tiêu đề"}
          </h1>
        </div>

        {/* 5T Info Grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <InfoCard
            label="T1 — Đầu mối"
            value={directive.dau_moi || "Chưa rõ"}
            icon="👤"
          />
          <InfoCard
            label="T2 — Nhiệm vụ"
            value={directive.nhiem_vu || "Chưa rõ"}
            icon="📋"
          />
          <InfoCard
            label="T4 — Thời hạn"
            value={directive.deadline || "Không có"}
            icon={days !== null && days < 0 ? "🔴" : days !== null && days < 3 ? "🟡" : "🟢"}
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
          <InfoCard label="Nguồn" value={directive.nguon || "Không rõ"} icon="📎" />
        </div>

        {/* Tracking Analytics */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-zinc-300">
            📊 Email Tracking
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 text-center">
              <p className="text-3xl font-black tabular-nums text-white">
                {tracking.length}
              </p>
              <p className="mt-1 text-xs text-zinc-500">Tổng opens</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 text-center">
              <p className="text-3xl font-black tabular-nums text-green-400">
                {realOpens.length}
              </p>
              <p className="mt-1 text-xs text-zinc-500">Người thật</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 text-center">
              <p className="text-3xl font-black tabular-nums text-zinc-500">
                {botOpens.length}
              </p>
              <p className="mt-1 text-xs text-zinc-500">Bot/Preview</p>
            </div>
          </div>

          {/* Tracking Events Table */}
          {tracking.length > 0 ? (
            <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-800">
              <table className="w-full text-sm">
                <thead className="border-b border-zinc-800 bg-zinc-900">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-zinc-400">
                      Thời gian
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-400">
                      Email
                    </th>
                    <th className="px-4 py-3 text-center font-medium text-zinc-400">
                      Loại
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {tracking
                    .sort(
                      (a, b) =>
                        new Date(b.openedAt).getTime() -
                        new Date(a.openedAt).getTime()
                    )
                    .slice(0, 20)
                    .map((e, i) => (
                      <tr
                        key={i}
                        className="transition-colors hover:bg-zinc-800/50"
                      >
                        <td className="px-4 py-3 text-zinc-300 tabular-nums">
                          {new Date(e.openedAt).toLocaleString("vi-VN", {
                            timeZone: "Asia/Ho_Chi_Minh",
                          })}
                        </td>
                        <td className="px-4 py-3 text-zinc-400">
                          {e.recipientEmail}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {e.isBot ? (
                            <span className="text-zinc-600 text-xs">Bot</span>
                          ) : (
                            <span className="text-green-400 text-xs font-semibold">
                              ✔ Người thật
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-4 text-sm text-zinc-600">
              Chưa có dữ liệu tracking cho chỉ đạo này.
            </p>
          )}
        </section>

        {/* Timeline */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-zinc-300">
            📅 Thông tin
          </h2>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 space-y-3 text-sm">
            <div className="flex justify-between text-zinc-400">
              <span>Ngày tạo</span>
              <span className="text-zinc-300">
                {new Date(directive.created_at).toLocaleDateString("vi-VN")}
              </span>
            </div>
            {directive.section && (
              <div className="flex justify-between text-zinc-400">
                <span>Trụ cột chiến lược</span>
                <span className="text-zinc-300">{directive.section}</span>
              </div>
            )}
            <div className="flex justify-between text-zinc-400">
              <span>Notion ID</span>
              <span className="font-mono text-xs text-zinc-500">
                {directive.id.slice(0, 8)}…
              </span>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-800 py-6 text-center text-xs text-zinc-600">
        CEO Directive Automation — EsuhaiGroup © 2026
      </footer>
    </div>
  );
}

// ===== Sub-Components =====

function InfoCard({
  label,
  value,
  icon,
  sub,
}: {
  label: string;
  value: string;
  icon: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <p className="text-xs font-medium text-zinc-500">
        {icon} {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-white truncate">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-zinc-500">{sub}</p>}
    </div>
  );
}
