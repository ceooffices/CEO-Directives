const COLOR_MAP: Record<string, { bg: string; text: string; dot: string }> = {
  blue: { bg: "bg-blue-50", text: "text-blue-600", dot: "bg-blue-500" },
  green: { bg: "bg-green-50", text: "text-green-600", dot: "bg-green-500" },
  red: { bg: "bg-red-50", text: "text-red-600", dot: "bg-red-500" },
  yellow: { bg: "bg-amber-50", text: "text-amber-600", dot: "bg-amber-500" },
  cyan: { bg: "bg-cyan-50", text: "text-cyan-600", dot: "bg-cyan-500" },
  default: { bg: "bg-gray-50", text: "text-gray-600", dot: "bg-gray-400" },
};

export default function StatCard({
  label,
  value,
  color = "default",
  sub,
  pulse = false,
}: {
  label: string;
  value: number;
  color?: string;
  icon?: string;
  sub?: string;
  pulse?: boolean;
}) {
  const c = COLOR_MAP[color] || COLOR_MAP.default;

  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-200/50 transition-all hover:shadow-md hover:ring-gray-300/60">
      <div className="flex items-center gap-2">
        <div className={`h-2 w-2 rounded-full ${c.dot} ${pulse ? "animate-pulse" : ""}`} />
        <p className="text-[12px] font-medium text-gray-400">{label}</p>
      </div>
      <div className="mt-2 flex items-end gap-2">
        <span className={`text-3xl font-bold tabular-nums ${c.text}`}>
          {value}
        </span>
        {sub && (
          <span className="mb-1 text-[12px] font-medium text-gray-400">{sub}</span>
        )}
      </div>
    </div>
  );
}
