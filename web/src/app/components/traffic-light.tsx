interface TrafficLightProps {
  green: number;
  yellow: number;
  red: number;
  black?: number;
  done?: number;
}

export default function TrafficLight({
  green,
  yellow,
  red,
  black = 0,
  done = 0,
}: TrafficLightProps) {
  const total = green + yellow + red + black + done;

  const lights = [
    { label: "Đúng tiến độ", count: green, cls: "light-green", pct: total ? (green / total) * 100 : 0 },
    { label: "Sắp đến hạn", count: yellow, cls: "light-yellow", pct: total ? (yellow / total) * 100 : 0 },
    { label: "Quá hạn", count: red, cls: "light-red", pct: total ? (red / total) * 100 : 0 },
    { label: "Báo động", count: black, cls: "light-black", pct: total ? (black / total) * 100 : 0 },
    { label: "Hoàn thành", count: done, cls: "bg-sky-500 shadow-[0_0_12px_theme(colors.sky.500)]", pct: total ? (done / total) * 100 : 0 },
  ].filter(l => l.count > 0);

  return (
    <div className="space-y-3">
      {lights.map((l) => (
        <div key={l.label} className="flex items-center gap-3">
          <div className={`h-4 w-4 shrink-0 rounded-full ${l.cls}`} />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-zinc-300">{l.label}</span>
              <span className="text-sm font-bold tabular-nums text-white">
                {l.count}
              </span>
            </div>
            <div className="progress-bar mt-1">
              <div
                className={`progress-fill ${l.cls}`}
                style={{ width: `${l.pct}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
