"use client";

/**
 * Deadline Countdown Badge
 * Hiển thị countdown thời hạn chỉ đạo với visual urgency
 * 🟢 Còn > 3 ngày | 🟡 ≤ 3 ngày | 🔴 Quá hạn | ⚫ Quá 14 ngày
 */

interface DeadlineCountdownProps {
  deadline: string | null;
  compact?: boolean; // true = chỉ icon + text nhỏ
}

export default function DeadlineCountdown({ deadline, compact = false }: DeadlineCountdownProps) {
  if (!deadline) {
    return compact ? null : (
      <span className="text-[11px] text-gray-400">Không có thời hạn</span>
    );
  }

  const now = new Date();
  const dl = new Date(deadline);
  const diffMs = dl.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));

  let label: string;
  let colorClass: string;
  let bgClass: string;
  let pulse = false;

  if (diffDays > 7) {
    label = `Còn ${diffDays} ngày`;
    colorClass = "text-green-600";
    bgClass = "bg-green-50 ring-green-200/50";
  } else if (diffDays > 3) {
    label = `Còn ${diffDays} ngày`;
    colorClass = "text-emerald-600";
    bgClass = "bg-emerald-50 ring-emerald-200/50";
  } else if (diffDays > 1) {
    label = `Còn ${diffDays} ngày`;
    colorClass = "text-amber-600";
    bgClass = "bg-amber-50 ring-amber-200/50";
    pulse = true;
  } else if (diffDays === 1) {
    label = "Ngày mai";
    colorClass = "text-amber-600";
    bgClass = "bg-amber-50 ring-amber-300/50";
    pulse = true;
  } else if (diffDays === 0) {
    label = diffHours > 0 ? `Còn ${diffHours}h` : "Hôm nay!";
    colorClass = "text-orange-600";
    bgClass = "bg-orange-50 ring-orange-300/50";
    pulse = true;
  } else if (diffDays >= -3) {
    label = `Quá ${Math.abs(diffDays)} ngày`;
    colorClass = "text-red-600";
    bgClass = "bg-red-50 ring-red-300/50";
    pulse = true;
  } else if (diffDays >= -14) {
    label = `Quá ${Math.abs(diffDays)} ngày`;
    colorClass = "text-red-700";
    bgClass = "bg-red-100 ring-red-400/50";
    pulse = true;
  } else {
    label = `Quá ${Math.abs(diffDays)} ngày`;
    colorClass = "text-gray-100";
    bgClass = "bg-gray-800 ring-gray-600/50";
    pulse = true;
  }

  const icon = diffDays > 3 ? "⏱" : diffDays > 0 ? "⚡" : diffDays >= -14 ? "🔥" : "💀";

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${bgClass} ${colorClass} ${pulse ? "animate-pulse" : ""}`}>
        {icon} {label}
      </span>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium ring-1 ${bgClass} ${colorClass} ${pulse ? "animate-pulse" : ""}`}>
      <span className="text-base">{icon}</span>
      <div>
        <div className="font-semibold">{label}</div>
        <div className="text-[10px] opacity-70">
          {dl.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}
        </div>
      </div>
    </div>
  );
}
