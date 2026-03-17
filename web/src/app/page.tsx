import { getDashboardStatsFromSupabase, getBSCFromSupabase, getDirectiveOriginsFromSupabase, getBODTimelineFromSupabase, getAlertDirectives, getAllDirectivesForDrilldown } from "@/lib/supabase";
import DirectiveTable from "@/app/components/directive-table";
import HM50Heatmap from "@/app/components/hm50-heatmap";
import BODTimeline from "@/app/components/bod-timeline";
import BSCScorecard from "@/app/components/bsc-scorecard";
import LELONGSONPipelineView from "@/app/components/lelongson-pipeline";
import DirectiveOrigin from "@/app/components/directive-origin";
import CompanyTargets from "@/app/components/company-targets";
import AlertPanel from "@/app/components/alert-panel";
import DashboardShell from "@/app/components/dashboard-shell";
import StatCardGrid from "@/app/components/stat-card-grid";

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
    drilldownDirectives,
  ] = await Promise.all([
    getDashboardStatsFromSupabase(),
    getBODTimelineFromSupabase(),
    getBSCFromSupabase(),
    getDirectiveOriginsFromSupabase(),
    getAlertDirectives(),
    getAllDirectivesForDrilldown(),
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
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white shadow-lg shadow-blue-500/25">
              CD
            </div>
            <div>
              <h1 className="text-[17px] font-semibold tracking-tight text-white">
                CEO Dashboard
              </h1>
              <p className="text-[12px] text-zinc-500">EsuhaiGroup · {now}</p>
            </div>
          </div>
        </div>
        {/* Target banner */}
        <div className="border-t border-zinc-800/40 px-4 py-2 text-center text-[12px] text-zinc-500 sm:px-6">
          Mục tiêu 2026:{" "}
          <span className="font-bold text-emerald-400">3.333</span> tuyển sinh ·{" "}
          <span className="font-bold text-blue-400">2.222</span> xuất cảnh ·{" "}
          <span className="font-bold text-zinc-300">50 HM</span> chiến lược
        </div>
      </header>

      {/* Tabs + Content */}
      <DashboardShell
        tongQuan={
          <>
            {/* Quick stats — clickable drilldown */}
            <StatCardGrid
              stats={[
                { label: "Tổng chỉ đạo", value: stats.total, color: "blue", filterStatus: "all" },
                { label: "Chờ duyệt", value: stats.pending, color: "yellow", filterStatus: "cho_xu_ly" },
                { label: "Đã xác nhận", value: stats.confirmed, color: "cyan", filterStatus: "da_xac_nhan" },
                { label: "Đang thực hiện", value: stats.active, color: "blue", filterStatus: "dang_thuc_hien" },
                { label: "Hoàn thành", value: stats.completed, color: "green", sub: `${Math.round(completionRate)}%`, filterStatus: "hoan_thanh" },
                { label: "Cần quan tâm", value: stats.overdue, color: stats.overdue > 0 ? "red" : "green", pulse: stats.overdue > 3, filterStatus: "overdue" },
              ]}
              directives={drilldownDirectives}
            />

            {/* Health + Traffic + BSC bars */}
            <CompanyTargets
              healthScore={healthScore}
              traffic={traffic}
              bscRates={bscRates}
            />

            {/* Leader accountability table */}
            {leaders.length > 0 && (
              <div>
                <h3 className="mb-4 text-[13px] font-medium text-zinc-500 uppercase tracking-wide">
                  Đầu mối chịu trách nhiệm
                </h3>
                <div className="overflow-x-auto rounded-2xl bg-zinc-900 ring-1 ring-zinc-800">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800">
                        <th className="px-5 py-4 text-left text-[12px] font-medium uppercase tracking-wider text-zinc-500">Đầu mối</th>
                        <th className="px-5 py-4 text-center text-[12px] font-medium uppercase tracking-wider text-zinc-500">Tổng</th>
                        <th className="px-5 py-4 text-center text-[12px] font-medium uppercase tracking-wider text-zinc-500">Hoàn thành</th>
                        <th className="px-5 py-4 text-center text-[12px] font-medium uppercase tracking-wider text-zinc-500">Rủi ro</th>
                        <th className="px-5 py-4 text-center text-[12px] font-medium uppercase tracking-wider text-zinc-500">Tỷ lệ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {leaders.map((l) => (
                        <tr key={l.name} className="transition-colors hover:bg-zinc-800/30">
                          <td className="px-5 py-4 font-medium text-white">{l.name}</td>
                          <td className="px-5 py-4 text-center tabular-nums text-zinc-400">{l.total}</td>
                          <td className="px-5 py-4 text-center tabular-nums text-emerald-400">{l.completed}</td>
                          <td className="px-5 py-4 text-center tabular-nums">
                            {l.overdue > 0 ? (
                              <span className="text-red-400 font-medium">{l.overdue}</span>
                            ) : (
                              <span className="text-zinc-600">0</span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span
                              className={`inline-block min-w-12 rounded-full px-3 py-1 text-xs font-semibold ${
                                l.completionRate >= 70
                                  ? "bg-emerald-500/10 text-emerald-400"
                                  : l.completionRate >= 40
                                  ? "bg-amber-500/10 text-amber-400"
                                  : "bg-red-500/10 text-red-400"
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
          </>
        }

        hanhDong={
          <>
            <AlertPanel directives={alertDirectives} />

            <div>
              <h3 className="mb-4 text-[13px] font-medium text-zinc-500 uppercase tracking-wide">
                Chỉ đạo cần hỗ trợ thêm ({actionDirectives.length})
              </h3>
              <DirectiveTable directives={actionDirectives} />
            </div>
          </>
        }

        chienLuoc={
          <>
            {/* BSC Scorecard */}
            <section>
              <h2 className="mb-4 text-[13px] font-medium text-zinc-500 uppercase tracking-wide">
                BSC Scorecard — Tại sao
              </h2>
              <BSCScorecard perspectives={bscPerspectives} matchSummary={matchSummary} />
            </section>

            {/* LELONGSON Pipeline */}
            <section>
              <h2 className="mb-4 text-[13px] font-medium text-zinc-500 uppercase tracking-wide">
                Quy trình LELONGSON — Đang ở đâu
              </h2>
              <LELONGSONPipelineView pipeline={lelongsonPipeline} />
            </section>

            {/* Directive Origins */}
            <section>
              <h2 className="mb-4 text-[13px] font-medium text-zinc-500 uppercase tracking-wide">
                Nguồn gốc chỉ đạo — Từ đâu đến
              </h2>
              {origins.total > 0 ? (
                <DirectiveOrigin origins={origins} />
              ) : (
                <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900 py-12 text-center">
                  <p className="text-zinc-500">Chưa có dữ liệu nguồn gốc (cần import BOD).</p>
                </div>
              )}
            </section>
          </>
        }

        dienBien={
          <>
            {bodTimeline.allHM.length > 0 ? (
              <>
                {/* Risk alerts */}
                {bodTimeline.hmItems.filter((h) => h.trend === "critical").length > 0 && (
                  <div className="rounded-2xl bg-red-500/10 p-5 ring-1 ring-red-500/20">
                    <h3 className="text-[13px] font-semibold text-red-400">
                      Tín hiệu — HM cần quan tâm thêm
                    </h3>
                    <div className="mt-3 space-y-2">
                      {bodTimeline.hmItems
                        .filter((h) => h.trend === "critical")
                        .map((h) => (
                          <div key={h.hm_tt} className="flex items-center gap-3 text-[13px]">
                            <span className="font-bold text-red-400">HM{h.hm_tt}</span>
                            <span className="text-zinc-300">{h.title}</span>
                            <span className="text-red-400">{h.total_mentions} mentions</span>
                            <span className="text-[12px] text-zinc-500">{h.current_status}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                <div className="grid gap-6 lg:grid-cols-5">
                  {/* Heat map — 3 cột */}
                  <div className="lg:col-span-3">
                    <HM50Heatmap hmItems={bodTimeline.hmItems} allHM={bodTimeline.allHM} />
                  </div>
                  {/* Timeline — 2 cột */}
                  <div className="lg:col-span-2">
                    <BODTimeline meetings={bodTimeline.meetings} directives={bodTimeline.directivesByMeeting} />
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900 py-16 text-center">
                <p className="text-[32px] mb-2">📈</p>
                <p className="text-zinc-500">Chưa có dữ liệu diễn biến BOD / HM50.</p>
              </div>
            )}
          </>
        }
      />

      {/* Footer */}
      <footer className="border-t border-zinc-800/60 py-8 text-center text-[12px] text-zinc-500">
        CEO Directive Automation — EsuhaiGroup © 2026 · Powered by Next.js + Supabase
      </footer>
    </div>
  );
}
