/**
 * Engagement Stats — Hero Panel
 * Hiển thị số liệu tương tác lớn, sinh động, CEO nhìn 1 giây biết ngay
 * 
 * Triết lý: Nhận diện hành vi quan tâm của đầu mối — không phán xét
 */

"use client";

import { useEffect, useState } from "react";

interface EngagementStatsProps {
  emailSent: number;
  emailOpened: number;
  linkClicked: number;
  firstOpenAt: string | null;
  lastOpenAt: string | null;
  uniqueOpeners: number;
  totalRecipients: number;
}

function CountUp({ target, duration = 1200 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (target === 0) return;
    const step = Math.max(1, Math.ceil(target / (duration / 30)));
    let current = 0;
    const timer = setInterval(() => {
      current += step;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(current);
      }
    }, 30);
    return () => clearInterval(timer);
  }, [target, duration]);

  return <>{count}</>;
}

function formatTimeSpan(firstOpen: string | null, lastOpen: string | null): string {
  if (!firstOpen) return "—";
  if (!lastOpen || firstOpen === lastOpen) return "Vừa mở";

  const diffMs = new Date(lastOpen).getTime() - new Date(firstOpen).getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

function engagementLevel(
  emailSent: number,
  emailOpened: number,
  linkClicked: number
): { label: string; color: string; bgColor: string; pct: number } {
  if (emailSent === 0) return { label: "Chưa gửi", color: "text-gray-400", bgColor: "bg-gray-200", pct: 0 };

  // Score: opens count 1pt each, clicks count 2pt each
  const score = emailOpened + linkClicked * 2;
  const maxScore = emailSent * 3; // perfect = all opened + all clicked
  const pct = Math.min(100, Math.round((score / maxScore) * 100));

  if (pct >= 70) return { label: "Rất cao", color: "text-emerald-600", bgColor: "bg-emerald-500", pct };
  if (pct >= 40) return { label: "Khá tốt", color: "text-blue-600", bgColor: "bg-blue-500", pct };
  if (pct >= 15) return { label: "Trung bình", color: "text-amber-600", bgColor: "bg-amber-500", pct };
  if (emailOpened > 0) return { label: "Thấp", color: "text-orange-600", bgColor: "bg-orange-500", pct };
  return { label: "Chưa mở", color: "text-red-500", bgColor: "bg-red-400", pct: 3 };
}

export default function EngagementStats({
  emailSent,
  emailOpened,
  linkClicked,
  firstOpenAt,
  lastOpenAt,
  uniqueOpeners,
  totalRecipients,
}: EngagementStatsProps) {
  const level = engagementLevel(emailSent, emailOpened, linkClicked);
  const timeSpan = formatTimeSpan(firstOpenAt, lastOpenAt);

  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-200/50 sm:p-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[13px] font-medium text-gray-400 uppercase tracking-wide">
          Mức quan tâm
        </h2>
        <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${level.color} bg-opacity-10`}
          style={{ backgroundColor: `color-mix(in srgb, currentColor 10%, transparent)` }}>
          {level.label}
        </span>
      </div>

      {/* Hero Numbers */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <StatCard
          icon="📧"
          value={emailSent}
          label="Email gửi"
          accent="indigo"
        />
        <StatCard
          icon="👁"
          value={emailOpened}
          label="Lần mở"
          accent="emerald"
          highlight={emailOpened > 0}
        />
        <StatCard
          icon="🔗"
          value={linkClicked}
          label="Click CTA"
          accent="blue"
          highlight={linkClicked > 0}
        />
        <StatCard
          icon="⏱"
          value={timeSpan}
          label="Theo dõi"
          accent="amber"
          isText
        />
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-gray-400">Mức tương tác</span>
          <span className={`text-[11px] font-semibold ${level.color}`}>{level.pct}%</span>
        </div>
        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${level.bgColor} transition-all duration-1000 ease-out`}
            style={{ width: `${level.pct}%` }}
          />
        </div>
      </div>

      {/* Footer Details */}
      <div className="flex items-center justify-between text-[11px] text-gray-400 border-t border-gray-100 pt-3">
        <div className="flex items-center gap-4">
          <span>
            <span className="font-medium text-gray-600">{uniqueOpeners}</span>/{totalRecipients} người đã mở
          </span>
        </div>
        <div className="flex items-center gap-4">
          {firstOpenAt && (
            <span>Đầu tiên: <span className="font-medium text-gray-600">{formatDateTime(firstOpenAt)}</span></span>
          )}
          {lastOpenAt && firstOpenAt !== lastOpenAt && (
            <span>Gần nhất: <span className="font-medium text-gray-600">{formatDateTime(lastOpenAt)}</span></span>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
  accent,
  highlight = false,
  isText = false,
}: {
  icon: string;
  value: number | string;
  label: string;
  accent: string;
  highlight?: boolean;
  isText?: boolean;
}) {
  const accentColors: Record<string, string> = {
    indigo: "bg-indigo-50 text-indigo-700",
    emerald: "bg-emerald-50 text-emerald-700",
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
  };
  const cls = accentColors[accent] || "bg-gray-50 text-gray-700";

  return (
    <div className={`rounded-2xl p-3 text-center transition-all ${highlight ? cls : "bg-gray-50"} ${highlight ? "ring-1 ring-current/10 shadow-sm" : ""}`}>
      <div className="text-lg mb-0.5">{icon}</div>
      <div className={`text-2xl font-bold tabular-nums ${highlight ? "" : "text-gray-800"}`}>
        {isText ? value : <CountUp target={value as number} />}
      </div>
      <div className={`text-[10px] mt-0.5 ${highlight ? "opacity-70" : "text-gray-400"}`}>{label}</div>
    </div>
  );
}
