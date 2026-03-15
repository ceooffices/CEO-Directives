import { getDashboardStats } from "@/lib/notion";
import StatCard from "@/app/components/stat-card";
import TrafficLight from "@/app/components/traffic-light";
import DirectiveTable from "@/app/components/directive-table";
import type { Directive } from "@/lib/notion";

export const dynamic = "force-dynamic";

function getUrgency(d: Directive): "green" | "yellow" | "red" | "black" | "done" {
  if (d.status === "Hoàn thành") return "done";
  if (!d.deadline) return "green";
  const now = new Date();
  const deadline = new Date(d.deadline);
  const daysLeft = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (daysLeft < -14) return "black";
  if (daysLeft < 0) return "red";
  if (daysLeft < 3) return "yellow";
  return "green";
}

export default async function DashboardPage() {
  const { stats, byDauMoi, bySection, directives } = await getDashboardStats();

  const traffic = { green: 0, yellow: 0, red: 0, black: 0, done: 0 };
  for (const d of directives) {
    const u = getUrgency(d);
    traffic[u]++;
  }

  const completionRate = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;
  const activeWork = stats.total > 0 ? ((stats.completed + stats.active + stats.confirmed) / stats.total) * 100 : 0;
  const overdueRate = stats.total > 0 ? (stats.overdue / stats.total) * 100 : 0;
  const healthScore = Math.max(0, Math.min(100, Math.round(activeWork * 0.7 - overdueRate * 0.5 + completionRate * 0.3)));

  const leaders = Object.entries(byDauMoi)
    .map(([name, data]) => ({ name, ...data, completionRate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0 }))
    .sort((a, b) => b.total - a.total);

  const overdueDirectives = directives
    .filter((d) => getUrgency(d) === "red" || getUrgency(d) === "black")
    .sort((a, b) => {
      const da = a.deadline ? new Date(a.deadline).getTime() : 0;
      const db = b.deadline ? new Date(b.deadline).getTime() : 0;
      return da - db;
    });

  const actionDirectives = directives
    .filter((d) => {
      const u = getUrgency(d);
      return u === "yellow" || u === "red" || u === "black";
    })
    .sort((a, b) => {
      const ua = getUrgency(a);
      const ub = getUrgency(b);
      const priority = { black: 0, red: 1, yellow: 2, green: 3, done: 4 };
      return priority[ua] - priority[ub];
    });

  const sections = Object.entries(bySection)
    .map(([name, data]) => ({
      name,
      ...data,
      pct: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const now = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      {/* Header — Apple-style frosted glass */}
      <header className="sticky top-0 z-50 border-b border-gray-200/60 bg-white/70 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white shadow-lg shadow-blue-500/25">
              CD
            </div>
            <div>
              <h1 className="text-[17px] font-semibold tracking-tight text-gray-900">
                CEO Dashboard
              </h1>
              <p className="text-[12px] text-gray-400">EsuhaiGroup · {now}</p>
            </div>
          </div>
          <a
            href="/api/status"
            className="rounded-full bg-gray-100 px-4 py-2 text-[13px] font-medium text-gray-600 transition-all hover:bg-gray-200 active:scale-95"
          >
            API Status
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-10">

        {/* ===== SECTION 1: Overview ===== */}
        <section>
          <h2 className="mb-5 text-[15px] font-semibold text-gray-500 uppercase tracking-wide">
            Tổng quan
          </h2>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Tổng chỉ đạo" value={stats.total} color="blue" />
            <StatCard label="Chờ duyệt" value={stats.pending} color="yellow" />
            <StatCard label="Đã xác nhận" value={stats.confirmed} color="cyan" />
            <StatCard label="Đang thực hiện" value={stats.active} color="blue" />
            <StatCard label="Hoàn thành" value={stats.completed} color="green" sub={`${Math.round(completionRate)}%`} />
            <StatCard
              label="Quá hạn"
              value={stats.overdue}
              color={stats.overdue > 0 ? "red" : "green"}
              pulse={stats.overdue > 3}
            />
          </div>

          {/* Health Score + Traffic Light */}
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {/* Health Score */}
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200/50">
              <h3 className="text-[13px] font-medium text-gray-400">
                Sức khỏe hệ thống
              </h3>
              <div className="mt-3 flex items-end gap-3">
                <span
                  className={`text-6xl font-black tabular-nums ${
                    healthScore >= 70
                      ? "text-green-500"
                      : healthScore >= 40
                      ? "text-amber-500"
                      : "text-red-500"
                  }`}
                >
                  {healthScore}
                </span>
                <span className="mb-2 text-xl text-gray-300">/ 100</span>
              </div>
              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    healthScore >= 70
                      ? "bg-green-500"
                      : healthScore >= 40
                      ? "bg-amber-500"
                      : "bg-red-500"
                  }`}
                  style={{ width: `${healthScore}%` }}
                />
              </div>
            </div>

            {/* Traffic Light */}
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200/50">
              <h3 className="mb-4 text-[13px] font-medium text-gray-400">
                Đèn tín hiệu
              </h3>
              <TrafficLight
                green={traffic.green}
                yellow={traffic.yellow}
                red={traffic.red}
                black={traffic.black}
                done={traffic.done}
              />
            </div>
          </div>
        </section>

        {/* ===== SECTION 2: Escalation — grouped by 50HM ===== */}
        <section>
          <h2 className="mb-5 text-[15px] font-semibold text-gray-500 uppercase tracking-wide">
            Leo thang — Theo 50HM 2026 ({overdueDirectives.length})
          </h2>
          {(() => {
            const grouped: Record<string, typeof overdueDirectives> = {};
            for (const d of overdueDirectives) {
              const sec = d.section || "Ngoài kế hoạch";
              if (!grouped[sec]) grouped[sec] = [];
              grouped[sec].push(d);
            }
            const sortedSections = Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
            return sortedSections.length > 0 ? (
              <div className="space-y-6">
                {sortedSections.map(([sec, items]) => (
                  <div key={sec}>
                    <div className="mb-3 flex items-center gap-2">
                      <span className="rounded-full bg-red-50 px-3 py-1 text-[12px] font-semibold text-red-600">
                        {sec}
                      </span>
                      <span className="text-[12px] text-gray-400">{items.length} chỉ đạo</span>
                    </div>
                    <DirectiveTable directives={items} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-gray-200 bg-white py-12 text-center">
                <p className="text-gray-400">Không có chỉ đạo quá hạn.</p>
              </div>
            );
          })()}
        </section>

        {/* ===== SECTION 3: Strategy ===== */}
        <section>
          <h2 className="mb-5 text-[15px] font-semibold text-gray-500 uppercase tracking-wide">
            Chiến lược — Theo trụ cột
          </h2>
          {sections.length === 0 ? (
            <p className="text-gray-400">Chưa có dữ liệu chiến lược.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {sections.map((s) => (
                <div
                  key={s.name}
                  className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-200/50 transition-all hover:shadow-md hover:ring-gray-300/60"
                >
                  <p className="text-[13px] font-medium text-gray-500">{s.name}</p>
                  <div className="mt-3 flex items-end justify-between">
                    <span className="text-2xl font-bold tabular-nums text-gray-900">
                      {s.completed}/{s.total}
                    </span>
                    <span
                      className={`text-sm font-semibold ${
                        s.pct >= 70
                          ? "text-green-500"
                          : s.pct >= 40
                          ? "text-amber-500"
                          : "text-red-500"
                      }`}
                    >
                      {s.pct}%
                    </span>
                  </div>
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        s.pct >= 70
                          ? "bg-green-500"
                          : s.pct >= 40
                          ? "bg-amber-500"
                          : "bg-red-500"
                      }`}
                      style={{ width: `${s.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ===== SECTION 4: Leaders ===== */}
        <section>
          <h2 className="mb-5 text-[15px] font-semibold text-gray-500 uppercase tracking-wide">
            Đầu mối chịu trách nhiệm
          </h2>
          {leaders.length === 0 ? (
            <p className="text-gray-400">Chưa có dữ liệu đầu mối.</p>
          ) : (
            <div className="overflow-x-auto rounded-3xl bg-white shadow-sm ring-1 ring-gray-200/50">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-5 py-4 text-left text-[12px] font-medium uppercase tracking-wider text-gray-400">Đầu mối</th>
                    <th className="px-5 py-4 text-center text-[12px] font-medium uppercase tracking-wider text-gray-400">Tổng</th>
                    <th className="px-5 py-4 text-center text-[12px] font-medium uppercase tracking-wider text-gray-400">Hoàn thành</th>
                    <th className="px-5 py-4 text-center text-[12px] font-medium uppercase tracking-wider text-gray-400">Quá hạn</th>
                    <th className="px-5 py-4 text-center text-[12px] font-medium uppercase tracking-wider text-gray-400">Tỷ lệ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {leaders.map((l) => (
                    <tr key={l.name} className="transition-colors hover:bg-gray-50/50">
                      <td className="px-5 py-4 font-medium text-gray-900">{l.name}</td>
                      <td className="px-5 py-4 text-center tabular-nums text-gray-600">{l.total}</td>
                      <td className="px-5 py-4 text-center tabular-nums text-green-600">{l.completed}</td>
                      <td className="px-5 py-4 text-center tabular-nums">
                        {l.overdue > 0 ? (
                          <span className="text-red-500 font-medium">{l.overdue}</span>
                        ) : (
                          <span className="text-gray-300">0</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span
                          className={`inline-block min-w-12 rounded-full px-3 py-1 text-xs font-semibold ${
                            l.completionRate >= 70
                              ? "bg-green-50 text-green-600"
                              : l.completionRate >= 40
                              ? "bg-amber-50 text-amber-600"
                              : "bg-red-50 text-red-600"
                          }`}
                        >
                          {l.completionRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ===== SECTION 5: Action ===== */}
        <section>
          <h2 className="mb-5 text-[15px] font-semibold text-gray-500 uppercase tracking-wide">
            Cần xử lý ({actionDirectives.length})
          </h2>
          <DirectiveTable directives={actionDirectives} />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200/60 py-8 text-center text-[12px] text-gray-400">
        CEO Directive Automation — EsuhaiGroup © 2026 · Powered by Next.js + Notion
      </footer>
    </div>
  );
}
