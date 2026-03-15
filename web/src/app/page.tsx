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

  // Calculate traffic light numbers
  const traffic = { green: 0, yellow: 0, red: 0, black: 0, done: 0 };
  for (const d of directives) {
    const u = getUrgency(d);
    traffic[u]++;
  }

  // Health score (0-100) — balanced formula
  const completionRate = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;
  const activeWork = stats.total > 0 ? ((stats.completed + stats.active + stats.confirmed) / stats.total) * 100 : 0;
  const overdueRate = stats.total > 0 ? (stats.overdue / stats.total) * 100 : 0;
  const healthScore = Math.max(0, Math.min(100, Math.round(activeWork * 0.7 - overdueRate * 0.5 + completionRate * 0.3)));

  // Top leaders sorted by total
  const leaders = Object.entries(byDauMoi)
    .map(([name, data]) => ({ name, ...data, completionRate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0 }))
    .sort((a, b) => b.total - a.total);

  // Overdue directives
  const overdueDirectives = directives
    .filter((d) => getUrgency(d) === "red" || getUrgency(d) === "black")
    .sort((a, b) => {
      const da = a.deadline ? new Date(a.deadline).getTime() : 0;
      const db = b.deadline ? new Date(b.deadline).getTime() : 0;
      return da - db;
    });

  // Action items: yellow + red + black
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

  // Sections for strategy tab
  const sections = Object.entries(bySection)
    .map(([name, data]) => ({
      name,
      ...data,
      pct: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const now = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-sm font-bold">
              CD
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">CEO Dashboard</h1>
              <p className="text-xs text-zinc-500">EsuhaiGroup • {now}</p>
            </div>
          </div>
          <a
            href="/api/status"
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:border-zinc-500 hover:text-white"
          >
            API Status →
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-10">

        {/* ===== SECTION 1: BỨC TRANH TỔNG ===== */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-zinc-300">📊 Bức tranh tổng</h2>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Tổng chỉ đạo" value={stats.total} icon="📌" color="blue" />
            <StatCard label="Chờ duyệt" value={stats.pending} icon="⏳" color="yellow" />
            <StatCard label="Đã xác nhận" value={stats.confirmed} icon="☑" />
            <StatCard label="Đang thực hiện" value={stats.active} icon="🔄" color="blue" />
            <StatCard label="Hoàn thành" value={stats.completed} icon="✅" color="green" sub={`${Math.round(completionRate)}%`} />
            <StatCard
              label="Quá hạn"
              value={stats.overdue}
              icon="🔴"
              color={stats.overdue > 0 ? "red" : "green"}
              pulse={stats.overdue > 3}
            />
          </div>

          {/* Health Score + Traffic Light */}
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {/* Health Score */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
              <h3 className="text-sm font-medium text-zinc-400">🏥 Sức khỏe hệ thống</h3>
              <div className="mt-3 flex items-end gap-4">
                <span
                  className={`text-6xl font-black tabular-nums ${
                    healthScore >= 70
                      ? "text-green-400"
                      : healthScore >= 40
                      ? "text-yellow-400"
                      : "text-red-400"
                  }`}
                >
                  {healthScore}
                </span>
                <span className="mb-2 text-xl text-zinc-500">/ 100</span>
              </div>
              <div className="progress-bar mt-4">
                <div
                  className={`progress-fill ${
                    healthScore >= 70
                      ? "bg-green-500"
                      : healthScore >= 40
                      ? "bg-yellow-500"
                      : "bg-red-500"
                  }`}
                  style={{ width: `${healthScore}%` }}
                />
              </div>
            </div>

            {/* Traffic Light */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
              <h3 className="mb-4 text-sm font-medium text-zinc-400">
                🚦 Hệ thống đèn tín hiệu
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

        {/* ===== SECTION 2: LEO THANG ===== */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-zinc-300">
            🔺 Leo thang — Chỉ đạo quá hạn ({overdueDirectives.length})
          </h2>
          <DirectiveTable directives={overdueDirectives} />
        </section>

        {/* ===== SECTION 3: CHIẾN LƯỢC ===== */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-zinc-300">🎯 Chiến lược — Theo trụ cột</h2>
          {sections.length === 0 ? (
            <p className="text-zinc-500">Chưa có dữ liệu chiến lược.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {sections.map((s) => (
                <div
                  key={s.name}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 transition-all hover:border-zinc-600"
                >
                  <p className="text-sm font-medium text-zinc-300">{s.name}</p>
                  <div className="mt-2 flex items-end justify-between">
                    <span className="text-2xl font-bold tabular-nums text-white">
                      {s.completed}/{s.total}
                    </span>
                    <span
                      className={`text-sm font-semibold ${
                        s.pct >= 70
                          ? "text-green-400"
                          : s.pct >= 40
                          ? "text-yellow-400"
                          : "text-red-400"
                      }`}
                    >
                      {s.pct}%
                    </span>
                  </div>
                  <div className="progress-bar mt-2">
                    <div
                      className={`progress-fill ${
                        s.pct >= 70
                          ? "bg-green-500"
                          : s.pct >= 40
                          ? "bg-yellow-500"
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

        {/* ===== SECTION 4: LÃNH ĐẠO ===== */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-zinc-300">👥 Lãnh đạo — Đầu mối</h2>
          {leaders.length === 0 ? (
            <p className="text-zinc-500">Chưa có dữ liệu đầu mối.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-zinc-800">
              <table className="w-full text-sm">
                <thead className="border-b border-zinc-800 bg-zinc-900">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-zinc-400">Đầu mối</th>
                    <th className="px-4 py-3 text-center font-medium text-zinc-400">Tổng</th>
                    <th className="px-4 py-3 text-center font-medium text-zinc-400">Hoàn thành</th>
                    <th className="px-4 py-3 text-center font-medium text-zinc-400">Quá hạn</th>
                    <th className="px-4 py-3 text-center font-medium text-zinc-400">Tỷ lệ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {leaders.map((l) => (
                    <tr key={l.name} className="transition-colors hover:bg-zinc-800/50">
                      <td className="px-4 py-3 font-medium text-white">{l.name}</td>
                      <td className="px-4 py-3 text-center tabular-nums">{l.total}</td>
                      <td className="px-4 py-3 text-center tabular-nums text-green-400">
                        {l.completed}
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums">
                        {l.overdue > 0 ? (
                          <span className="text-red-400">{l.overdue}</span>
                        ) : (
                          <span className="text-zinc-600">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block min-w-[3rem] rounded-full border px-2 py-0.5 text-xs font-semibold ${
                            l.completionRate >= 70
                              ? "border-green-500/30 bg-green-500/20 text-green-400"
                              : l.completionRate >= 40
                              ? "border-yellow-500/30 bg-yellow-500/20 text-yellow-400"
                              : "border-red-500/30 bg-red-500/20 text-red-400"
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

        {/* ===== SECTION 5: HÀNH ĐỘNG ===== */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-zinc-300">
            ⚡ Hành động — Cần xử lý ({actionDirectives.length})
          </h2>
          <DirectiveTable directives={actionDirectives} />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-6 text-center text-xs text-zinc-600">
        CEO Directive Automation — EsuhaiGroup © 2026 • Powered by Next.js + Notion
      </footer>
    </div>
  );
}
