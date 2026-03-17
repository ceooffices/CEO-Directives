import TrafficLight from "./traffic-light";

export default function CompanyTargets({
  healthScore,
  traffic,
  bscRates,
}: {
  healthScore: number;
  traffic: { green: number; yellow: number; red: number; black: number; done: number };
  bscRates: { label: string; pct: number; color: string }[];
}) {
  return (
    <div className="space-y-4">
      {/* Company targets */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-3xl bg-gradient-to-br from-green-50 to-emerald-50 p-6 shadow-sm ring-1 ring-green-200/50">
          <p className="text-[12px] font-medium text-green-600">
            Muc tieu tuyen sinh 2026
          </p>
          <div className="mt-2 flex items-end gap-1">
            <span className="text-4xl font-black tabular-nums text-green-700">
              3.333
            </span>
            <span className="mb-1 text-[13px] text-green-500">hoc vien</span>
          </div>
        </div>
        <div className="rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-50 p-6 shadow-sm ring-1 ring-blue-200/50">
          <p className="text-[12px] font-medium text-blue-600">
            Muc tieu xuat canh 2026
          </p>
          <div className="mt-2 flex items-end gap-1">
            <span className="text-4xl font-black tabular-nums text-blue-700">
              2.222
            </span>
            <span className="mb-1 text-[13px] text-blue-500">hoc vien</span>
          </div>
        </div>
      </div>

      {/* Health score + Traffic light */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Health Score */}
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200/50">
          <h3 className="text-[13px] font-medium text-gray-400">
            Suc khoe he thong
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
            Den tin hieu
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

      {/* BSC completion bars */}
      {bscRates.length > 0 && (
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200/50">
          <h3 className="mb-4 text-[13px] font-medium text-gray-400">
            Tien do theo BSC
          </h3>
          <div className="space-y-3">
            {bscRates.map((rate) => (
              <div key={rate.label}>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="font-medium text-gray-600">
                    {rate.label}
                  </span>
                  <span
                    className={`font-semibold ${
                      rate.pct >= 70
                        ? "text-green-500"
                        : rate.pct >= 40
                        ? "text-amber-500"
                        : rate.pct > 0
                        ? "text-red-500"
                        : "text-gray-300"
                    }`}
                  >
                    {rate.pct}%
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${rate.color}`}
                    style={{ width: `${Math.max(rate.pct, 1)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
