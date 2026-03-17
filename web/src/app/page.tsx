import { getDashboardStatsFromSupabase, getBSCFromSupabase, getDirectiveOriginsFromSupabase, getBODTimelineFromSupabase, getAlertDirectives } from "@/lib/supabase";
import StatCard from "@/app/components/stat-card";
import DirectiveTable from "@/app/components/directive-table";
import HM50Heatmap from "@/app/components/hm50-heatmap";
import BODTimeline from "@/app/components/bod-timeline";
import BSCScorecard from "@/app/components/bsc-scorecard";
import LELONGSONPipelineView from "@/app/components/lelongson-pipeline";
import DirectiveOrigin from "@/app/components/directive-origin";
import CompanyTargets from "@/app/components/company-targets";
import AlertPanel from "@/app/components/alert-panel";

export const dynamic = "force-dynamic";

interface DisplayDirective {
  id: string;
  title: string;
  status: string;
  dau_moi: string;
  nhiem_vu: string;
  deadline: string | null;
  hm50_ref: string;
  section: string | null;
  nguon: string;
  url: string;
  created_at: string;
  lelongson_stage?: string;
}

function getUrgency(d: DisplayDirective): "green" | "yellow" | "red" | "black" | "done" {
  if (d.status === "hoan_thanh" || d.status === "Hoàn thành") return "done";
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
  const [
    { stats, byDauMoi, directives, lelongsonPipeline },
    bodTimeline,
    { bscPerspectives, matchSummary },
    origins,
    alertDirectives,
  ] = await Promise.all([
    getDashboardStatsFromSupabase(),
    getBODTimelineFromSupabase(),
    getBSCFromSupabase(),
    getDirectiveOriginsFromSupabase(),
    getAlertDirectives(),
  ]);

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

  const bscRates = bscPerspectives.map((p) => ({
    label: p.label,
    pct: p.completion_pct,
    color:
      p.key === "financial"
        ? "bg-green-500"
        : p.key === "customer"
        ? "bg-blue-500"
        : p.key === "process"
        ? "bg-amber-500"
        : "bg-purple-500",
  }));

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
        {/* Target banner */}
        <div className="border-t border-gray-100/80 bg-white/50 px-6 py-2 text-center text-[12px] text-gray-500">
          Mục tiêu 2026:{" "}
          <span className="font-bold text-green-700">3.333</span> tuyển sinh ·{" "}
          <span className="font-bold text-blue-700">2.222</span> xuất cảnh ·{" "}
          <span className="font-bold text-gray-700">50 HM</span> chiến lược
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-10">

        {/* ===== SECTION 1: TAI SAO (WHY) — BSC Scorecard ===== */}
        <section>
          <h2 className="mb-5 text-[15px] font-semibold text-gray-500 uppercase tracking-wide">
            Tại sao — BSC Scorecard
          </h2>
          <BSCScorecard perspectives={bscPerspectives} matchSummary={matchSummary} />
        </section>

        {/* ===== SECTION 2: TU DAU DEN (WHERE FROM) — Nguon goc ===== */}
        <section>
          <h2 className="mb-5 text-[15px] font-semibold text-gray-500 uppercase tracking-wide">
            Từ đâu đến — Nguồn gốc chỉ đạo
          </h2>
          {origins.total > 0 ? (
            <DirectiveOrigin origins={origins} />
          ) : (
            <div className="rounded-3xl border border-dashed border-gray-200 bg-white py-12 text-center">
              <p className="text-gray-400">Chưa có dữ liệu nguồn gốc (cần import BOD).</p>
            </div>
          )}
        </section>

        {/* ===== SECTION 3: DANG O DAU (WHERE AT) — LELONGSON Pipeline ===== */}
        <section>
          <h2 className="mb-5 text-[15px] font-semibold text-gray-500 uppercase tracking-wide">
            Đang ở đâu — Quy trình LELONGSON
          </h2>
          <LELONGSONPipelineView pipeline={lelongsonPipeline} />
        </section>

        {/* ===== SECTION 4: DI VE DAU (WHERE TO) — Ket qua & Muc tieu ===== */}
        <section>
          <h2 className="mb-5 text-[15px] font-semibold text-gray-500 uppercase tracking-wide">
            Đi về đâu — Kết quả & Mục tiêu
          </h2>

          {/* Stat cards */}
          <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
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

          {/* Health + Traffic + BSC bars */}
          <CompanyTargets
            healthScore={healthScore}
            traffic={traffic}
            bscRates={bscRates}
          />
        </section>

        {/* ===== SECTION 5: HANH DONG — Can xu ly + Dau moi ===== */}
        <section>
          <h2 className="mb-5 text-[15px] font-semibold text-gray-500 uppercase tracking-wide">
            Hành động — Cần xử lý ({actionDirectives.length})
          </h2>
          <AlertPanel directives={alertDirectives} />

          <div className="mt-6">
            <h3 className="mb-4 text-[13px] font-medium text-gray-400">
              Tất cả chỉ đạo cần xử lý
            </h3>
            <DirectiveTable directives={actionDirectives} />
          </div>

          {/* Leader accountability table */}
          {leaders.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-4 text-[13px] font-medium text-gray-400">
                Đầu mối chịu trách nhiệm
              </h3>
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
            </div>
          )}
        </section>

        {/* ===== SECTION 6: DIEN BIEN — Chien luoc ===== */}
        {bodTimeline.allHM.length > 0 && (
          <section>
            <h2 className="mb-5 text-[15px] font-semibold text-gray-500 uppercase tracking-wide">
              Diễn biến — BOD → HM50
            </h2>

            {/* Risk alerts */}
            {bodTimeline.hmItems.filter((h) => h.trend === "critical").length > 0 && (
              <div className="mb-6 rounded-3xl bg-red-50/50 p-5 ring-1 ring-red-100">
                <h3 className="text-[13px] font-semibold text-red-700">
                  Cảnh báo — HM leo thang nghiêm trọng
                </h3>
                <div className="mt-3 space-y-2">
                  {bodTimeline.hmItems
                    .filter((h) => h.trend === "critical")
                    .map((h) => (
                      <div
                        key={h.hm_tt}
                        className="flex items-center gap-3 text-[13px]"
                      >
                        <span className="font-bold text-red-600">
                          HM{h.hm_tt}
                        </span>
                        <span className="text-gray-700">{h.title}</span>
                        <span className="text-red-500">
                          {h.total_mentions} mentions
                        </span>
                        <span className="text-[12px] text-gray-400">
                          {h.current_status}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-5">
              {/* Heat map — 3 cột */}
              <div className="lg:col-span-3">
                <HM50Heatmap
                  hmItems={bodTimeline.hmItems}
                  allHM={bodTimeline.allHM}
                />
              </div>
              {/* Timeline — 2 cột */}
              <div className="lg:col-span-2">
                <BODTimeline
                  meetings={bodTimeline.meetings}
                  directives={bodTimeline.directivesByMeeting}
                />
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200/60 py-8 text-center text-[12px] text-gray-400">
        CEO Directive Automation — EsuhaiGroup © 2026 · Powered by Next.js + Notion
      </footer>
    </div>
  );
}
