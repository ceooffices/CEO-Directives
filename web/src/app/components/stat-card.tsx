interface StatCardProps {
  label: string;
  value: number | string;
  icon?: string;
  color?: "green" | "yellow" | "red" | "blue" | "purple" | "default";
  pulse?: boolean;
  sub?: string;
}

const COLOR_MAP = {
  green: "border-green-500/30 bg-green-950/40",
  yellow: "border-yellow-500/30 bg-yellow-950/40",
  red: "border-red-500/30 bg-red-950/40",
  blue: "border-blue-500/30 bg-blue-950/40",
  purple: "border-purple-500/30 bg-purple-950/40",
  default: "border-zinc-800 bg-zinc-900",
};

const TEXT_COLOR = {
  green: "text-green-400",
  yellow: "text-yellow-400",
  red: "text-red-400",
  blue: "text-blue-400",
  purple: "text-purple-400",
  default: "text-white",
};

export default function StatCard({
  label,
  value,
  icon,
  color = "default",
  pulse = false,
  sub,
}: StatCardProps) {
  return (
    <div
      className={`rounded-2xl border p-5 transition-all hover:scale-[1.02] ${COLOR_MAP[color]} ${
        pulse ? "pulse-danger" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">{label}</p>
        {icon && <span className="text-xl">{icon}</span>}
      </div>
      <p className={`mt-2 text-3xl font-bold tabular-nums ${TEXT_COLOR[color]}`}>
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-zinc-500">{sub}</p>}
    </div>
  );
}
