/**
 * Alert Panel — Board cảnh báo "Cần hành động ngay"
 * 3 levels: 🔴 Quá hạn | 🟡 Sắp hạn (≤ 3 ngày) | ⚫ Mất kiểm soát (> 14 ngày)
 * Quick actions: Nhắc nhở / Leo thang
 */

import Link from "next/link";
import DeadlineCountdown from "./deadline-countdown";

interface AlertDirective {
  id: string;
  directive_code: string;
  t2_nhiem_vu: string;
  t1_dau_moi: string;
  t4_thoi_han: string | null;
  tinh_trang: string;
}

type AlertLevel = "black" | "red" | "yellow";

interface AlertPanelProps {
  directives: AlertDirective[];
}

function getAlertLevel(deadline: string | null): AlertLevel | null {
  if (!deadline) return null;
  const diffMs = new Date(deadline).getTime() - Date.now();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < -14) return "black";
  if (diffDays < 0) return "red";
  if (diffDays <= 3) return "yellow";
  return null;
}

const LEVEL_CONFIG: Record<AlertLevel, { label: string; icon: string; headerBg: string; headerText: string; ringColor: string; desc: string }> = {
  black: {
    label: "Mất kiểm soát",
    icon: "💀",
    headerBg: "bg-gray-900",
    headerText: "text-gray-100",
    ringColor: "ring-gray-800",
    desc: "Quá hạn > 14 ngày — cần leo thang CEO",
  },
  red: {
    label: "Quá hạn",
    icon: "🔥",
    headerBg: "bg-red-600",
    headerText: "text-white",
    ringColor: "ring-red-400",
    desc: "Đã quá deadline — cần hành động ngay",
  },
  yellow: {
    label: "Sắp hạn",
    icon: "⚡",
    headerBg: "bg-amber-500",
    headerText: "text-amber-950",
    ringColor: "ring-amber-400",
    desc: "Còn ≤ 3 ngày — nhắc nhở đầu mối",
  },
};

export default function AlertPanel({ directives }: AlertPanelProps) {
  // Group by alert level
  const grouped: Record<AlertLevel, AlertDirective[]> = { black: [], red: [], yellow: [] };

  for (const d of directives) {
    if (d.tinh_trang === "hoan_thanh" || d.tinh_trang === "Hoàn thành") continue;
    const level = getAlertLevel(d.t4_thoi_han);
    if (level) grouped[level].push(d);
  }

  const totalAlerts = grouped.black.length + grouped.red.length + grouped.yellow.length;

  if (totalAlerts === 0) {
    return (
      <div className="rounded-3xl bg-gradient-to-br from-green-50 to-emerald-50 p-6 shadow-sm ring-1 ring-green-200/50">
        <div className="flex items-center gap-3">
          <span className="text-3xl">✅</span>
          <div>
            <h3 className="text-sm font-semibold text-green-800">Không có cảnh báo</h3>
            <p className="text-xs text-green-600">Tất cả chỉ đạo đang đúng tiến độ</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200/50">
        <span className="text-2xl">🚨</span>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-gray-900">Cần hành động ngay</h3>
          <p className="text-[11px] text-gray-500">{totalAlerts} chỉ đạo cần xử lý</p>
        </div>
        <div className="flex gap-2">
          {grouped.black.length > 0 && (
            <span className="rounded-full bg-gray-800 px-2.5 py-0.5 text-[11px] font-bold text-gray-100">
              💀 {grouped.black.length}
            </span>
          )}
          {grouped.red.length > 0 && (
            <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-bold text-red-700">
              🔥 {grouped.red.length}
            </span>
          )}
          {grouped.yellow.length > 0 && (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-700">
              ⚡ {grouped.yellow.length}
            </span>
          )}
        </div>
      </div>

      {/* Alert groups */}
      {(["black", "red", "yellow"] as AlertLevel[]).map((level) => {
        const items = grouped[level];
        if (items.length === 0) return null;
        const config = LEVEL_CONFIG[level];

        return (
          <div key={level} className={`overflow-hidden rounded-3xl shadow-sm ring-1 ${config.ringColor}`}>
            {/* Level header */}
            <div className={`flex items-center gap-2 px-4 py-2.5 ${config.headerBg} ${config.headerText}`}>
              <span>{config.icon}</span>
              <span className="text-[13px] font-bold">{config.label}</span>
              <span className="ml-auto rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium">
                {items.length}
              </span>
            </div>
            <p className={`px-4 py-1.5 text-[10px] ${config.headerBg} ${config.headerText} opacity-70`}>
              {config.desc}
            </p>

            {/* Directive list */}
            <div className="divide-y divide-gray-100 bg-white">
              {items.map((d) => (
                <div key={d.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/directive/${d.id}`}
                      className="block truncate text-[13px] font-medium text-gray-900 hover:text-blue-600 transition-colors"
                    >
                      {d.t2_nhiem_vu}
                    </Link>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="text-[11px] text-gray-500">
                        {d.directive_code} • {d.t1_dau_moi}
                      </span>
                      <DeadlineCountdown deadline={d.t4_thoi_han} compact />
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <Link
                      href={`/api/remind?id=${d.id}`}
                      className="rounded-full bg-orange-50 px-3 py-1 text-[10px] font-medium text-orange-600 transition-all hover:bg-orange-100 active:scale-95"
                    >
                      🔔 Nhắc
                    </Link>
                    <Link
                      href={`/api/escalate?id=${d.id}`}
                      className="rounded-full bg-red-50 px-3 py-1 text-[10px] font-medium text-red-600 transition-all hover:bg-red-100 active:scale-95"
                    >
                      📢 Leo
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
