export default function TrafficLight({
  green,
  yellow,
  red,
  black,
  done,
}: {
  green: number;
  yellow: number;
  red: number;
  black: number;
  done: number;
}) {
  const items = [
    { label: "An toàn", count: green, color: "bg-green-500", ring: "ring-green-200" },
    { label: "Cảnh báo", count: yellow, color: "bg-amber-500", ring: "ring-amber-200" },
    { label: "Quá hạn", count: red, color: "bg-red-500", ring: "ring-red-200" },
    { label: "Báo động", count: black, color: "bg-gray-800", ring: "ring-gray-300" },
    { label: "Hoàn thành", count: done, color: "bg-blue-500", ring: "ring-blue-200" },
  ];

  const total = green + yellow + red + black + done;

  return (
    <div className="space-y-4">
      {/* Bar chart */}
      {total > 0 && (
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-100">
          {items.map((item) =>
            item.count > 0 ? (
              <div
                key={item.label}
                className={`${item.color} transition-all duration-500`}
                style={{ width: `${(item.count / total) * 100}%` }}
              />
            ) : null
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${item.color} ring-2 ${item.ring}`} />
            <span className="text-[13px] text-gray-500">
              {item.label}
            </span>
            <span className="text-[13px] font-semibold text-gray-700 tabular-nums">
              {item.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
