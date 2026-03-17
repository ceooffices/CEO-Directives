/**
 * Alert Panel — Bảng nhận diện rủi ro tuân thủ
 * 4 levels tín hiệu hành vi:
 *   💚 Bình thường → hoạt động tốt
 *   ⚡ Quan tâm → chưa có phản hồi 1 ngày
 *   🔥 Rủi ro → mất tín hiệu 3+ ngày
 *   📋 Nghiêm trọng → mất tín hiệu 14+ ngày
 *
 * Triết lý: Nhận diện hành vi, không phán xét. Hỗ trợ thay vì áp lực.
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

type AlertLevel = "critical" | "risk" | "attention";

interface AlertPanelProps {
  directives: AlertDirective[];
}

function getAlertLevel(deadline: string | null): AlertLevel | null {
  if (!deadline) return null;
  const diffMs = new Date(deadline).getTime() - Date.now();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < -14) return "critical";
  if (diffDays < 0) return "risk";
  if (diffDays <= 3) return "attention";
  return null;
}

const LEVEL_CONFIG: Record<AlertLevel, { label: string; icon: string; headerBg: string; headerText: string; ringColor: string; desc: string }> = {
  critical: {
    label: "Cần hỗ trợ đặc biệt",
    icon: "📋",
    headerBg: "bg-gray-900",
    headerText: "text-gray-100",
    ringColor: "ring-gray-800",
    desc: "Chưa có tương tác > 14 ngày — đề xuất Ban Cố Vấn hỗ trợ trực tiếp",
  },
  risk: {
    label: "Tín hiệu rủi ro",
    icon: "🔶",
    headerBg: "bg-orange-600",
    headerText: "text-white",
    ringColor: "ring-orange-400",
    desc: "Chưa có phản hồi — cần tìm hiểu khó khăn của đầu mối",
  },
  attention: {
    label: "Cần quan tâm",
    icon: "⚡",
    headerBg: "bg-amber-500",
    headerText: "text-amber-950",
    ringColor: "ring-amber-400",
    desc: "Sắp đến thời hạn — hỏi đầu mối có cần hỗ trợ gì không",
  },
};

export default function AlertPanel({ directives }: AlertPanelProps) {
  // Group by alert level
  const grouped: Record<AlertLevel, AlertDirective[]> = { critical: [], risk: [], attention: [] };

  for (const d of directives) {
    if (d.tinh_trang === "hoan_thanh" || d.tinh_trang === "Hoàn thành") continue;
    const level = getAlertLevel(d.t4_thoi_han);
    if (level) grouped[level].push(d);
  }

  const totalAlerts = grouped.critical.length + grouped.risk.length + grouped.attention.length;

  if (totalAlerts === 0) {
    return (
      <div className="rounded-3xl bg-gradient-to-br from-green-50 to-emerald-50 p-6 shadow-sm ring-1 ring-green-200/50">
        <div className="flex items-center gap-3">
          <span className="text-3xl">✅</span>
          <div>
            <h3 className="text-sm font-semibold text-green-800">Tất cả đang tốt</h3>
            <p className="text-xs text-green-600">Mọi chỉ đạo đều có tương tác đúng tiến độ</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200/50">
        <span className="text-2xl">📌</span>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-gray-900">Chỉ đạo cần quan tâm</h3>
          <p className="text-[11px] text-gray-500">{totalAlerts} chỉ đạo chưa có tín hiệu phản hồi đầy đủ</p>
        </div>
        <div className="flex gap-2">
          {grouped.critical.length > 0 && (
            <span className="rounded-full bg-gray-800 px-2.5 py-0.5 text-[11px] font-bold text-gray-100">
              📋 {grouped.critical.length}
            </span>
          )}
          {grouped.risk.length > 0 && (
            <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-[11px] font-bold text-orange-700">
              🔶 {grouped.risk.length}
            </span>
          )}
          {grouped.attention.length > 0 && (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-700">
              ⚡ {grouped.attention.length}
            </span>
          )}
        </div>
      </div>

      {/* Alert groups */}
      {(["critical", "risk", "attention"] as AlertLevel[]).map((level) => {
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
                      className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-medium text-blue-600 transition-all hover:bg-blue-100 active:scale-95"
                    >
                      💬 Hỗ trợ
                    </Link>
                    <Link
                      href={`/api/escalate?id=${d.id}`}
                      className="rounded-full bg-amber-50 px-3 py-1 text-[10px] font-medium text-amber-600 transition-all hover:bg-amber-100 active:scale-95"
                    >
                      📋 Báo cáo
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
