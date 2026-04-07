import type { BSCPerspective } from "@/lib/supabase-types";

const PERSPECTIVE_STYLE: Record<string, { bg: string; text: string; dot: string; bar: string }> = {
  financial: { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500", bar: "bg-green-500" },
  customer: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500", bar: "bg-blue-500" },
  process: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500", bar: "bg-amber-500" },
  learning: { bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-500", bar: "bg-purple-500" },
};

export default function BSCScorecard({
  perspectives,
  matchSummary,
}: {
  perspectives: BSCPerspective[];
  matchSummary: { matched: number; total: number };
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {perspectives.map((p) => {
          const style = PERSPECTIVE_STYLE[p.key] || PERSPECTIVE_STYLE.process;

          return (
            <div
              key={p.key}
              className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-200/50 transition-all hover:shadow-md hover:ring-gray-300/60"
            >
              {/* Header */}
              <div className="flex items-center gap-2">
                <div className={`h-2.5 w-2.5 rounded-full ${style.dot}`} />
                <h4 className={`text-[13px] font-semibold ${style.text}`}>
                  {p.label}
                </h4>
              </div>

              {/* Metrics */}
              <div className="mt-3 flex items-end justify-between">
                <div>
                  <span className="text-2xl font-bold tabular-nums text-gray-900">
                    {p.hm_count}
                  </span>
                  <span className="ml-1 text-[12px] text-gray-400">HM</span>
                  <span className="mx-2 text-gray-200">|</span>
                  <span className="text-lg font-semibold tabular-nums text-gray-700">
                    {p.directive_count}
                  </span>
                  <span className="ml-1 text-[12px] text-gray-400">
                    chỉ đạo
                  </span>
                </div>
                <span
                  className={`text-sm font-semibold ${
                    p.completion_pct >= 70
                      ? "text-green-500"
                      : p.completion_pct >= 40
                      ? "text-amber-500"
                      : p.completion_pct > 0
                      ? "text-red-500"
                      : "text-gray-300"
                  }`}
                >
                  {p.completion_pct}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${style.bar}`}
                  style={{ width: `${Math.max(p.completion_pct, 2)}%` }}
                />
              </div>

              {/* Sections */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {p.sections.map((sec) => {
                  const short = sec.match(/^([IVX]+)/)?.[1] || sec;
                  return (
                    <span
                      key={sec}
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${style.bg} ${style.text}`}
                    >
                      {short}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Match summary */}
      <div className="text-center text-[12px] text-gray-400">
        {matchSummary.matched}/{matchSummary.total} chỉ đạo đã liên kết HM50
      </div>
    </div>
  );
}
