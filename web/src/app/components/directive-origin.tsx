import type { DirectiveOrigins } from "@/lib/notion";

export default function DirectiveOrigin({
  origins,
}: {
  origins: DirectiveOrigins;
}) {
  const total = origins.total || 1; // Tránh chia 0

  const segments = [
    {
      label: "Tu 50HM",
      value: origins.from_hm50,
      pct: Math.round((origins.from_hm50 / total) * 100),
      bg: "bg-blue-400",
      text: "text-blue-600",
      dot: "bg-blue-500",
      cardBg: "bg-blue-50",
    },
    {
      label: "Leo thang",
      value: origins.escalation,
      pct: Math.round((origins.escalation / total) * 100),
      bg: "bg-red-400",
      text: "text-red-600",
      dot: "bg-red-500",
      cardBg: "bg-red-50",
    },
    {
      label: "Phat sinh moi",
      value: origins.new_initiative,
      pct: Math.round((origins.new_initiative / total) * 100),
      bg: "bg-cyan-400",
      text: "text-cyan-600",
      dot: "bg-cyan-500",
      cardBg: "bg-cyan-50",
    },
  ];

  return (
    <div className="space-y-4">
      {/* 3 stat cards */}
      <div className="grid grid-cols-3 gap-4">
        {segments.map((seg) => (
          <div
            key={seg.label}
            className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-200/50"
          >
            <div className="flex items-center gap-2">
              <div
                className={`h-2 w-2 rounded-full ${seg.dot} ${
                  seg.label === "Leo thang" && seg.value > 3
                    ? "animate-pulse"
                    : ""
                }`}
              />
              <p className="text-[12px] font-medium text-gray-400">
                {seg.label}
              </p>
            </div>
            <div className="mt-2 flex items-end gap-2">
              <span className={`text-3xl font-bold tabular-nums ${seg.text}`}>
                {seg.value}
              </span>
              <span className="mb-1 text-[12px] font-medium text-gray-400">
                {seg.pct}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Stacked proportion bar */}
      {origins.total > 0 && (
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-100">
          {segments.map(
            (seg) =>
              seg.value > 0 && (
                <div
                  key={seg.label}
                  className={`h-full ${seg.bg} transition-all duration-500`}
                  style={{
                    width: `${Math.max((seg.value / total) * 100, 3)}%`,
                  }}
                />
              )
          )}
        </div>
      )}

      {/* Top escalated HMs */}
      {origins.top_escalated.length > 0 && (
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-200/50">
          <h4 className="mb-3 text-[13px] font-medium text-gray-400">
            HM leo thang nhieu nhat
          </h4>
          <div className="space-y-2">
            {origins.top_escalated.map((hm) => (
              <div
                key={hm.hm_tt}
                className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-2.5 text-[13px]"
              >
                <span className="shrink-0 rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-bold text-red-600">
                  HM{hm.hm_tt}
                </span>
                <span className="flex-1 font-medium text-gray-700 truncate">
                  {hm.title}
                </span>
                <span className="shrink-0 text-[12px] font-semibold text-red-500">
                  {hm.count}x
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
