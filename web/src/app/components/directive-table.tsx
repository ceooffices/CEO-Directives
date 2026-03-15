import type { Directive } from "@/lib/notion";
import Link from "next/link";

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

const URGENCY_STYLE = {
  green: "bg-green-500/20 text-green-400 border-green-500/30",
  yellow: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  red: "bg-red-500/20 text-red-400 border-red-500/30",
  black: "bg-red-900/40 text-red-300 border-red-500/50 font-bold",
  done: "bg-sky-500/20 text-sky-400 border-sky-500/30",
};

const URGENCY_LABEL = {
  green: "Đúng tiến độ",
  yellow: "Sắp đến hạn",
  red: "Quá hạn",
  black: "🚨 Báo động",
  done: "✓ Hoàn thành",
};

function daysOverdue(deadline: string): number {
  return Math.ceil(
    (new Date().getTime() - new Date(deadline).getTime()) / (1000 * 60 * 60 * 24)
  );
}

export default function DirectiveTable({
  directives,
  showUrgency = true,
}: {
  directives: Directive[];
  showUrgency?: boolean;
}) {
  if (directives.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-700 py-12 text-center">
        <p className="text-zinc-500">Không có chỉ đạo nào.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-800">
      <table className="w-full text-sm">
        <thead className="border-b border-zinc-800 bg-zinc-900">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-zinc-400">
              Chỉ đạo
            </th>
            <th className="px-4 py-3 text-left font-medium text-zinc-400">
              Đầu mối
            </th>
            <th className="px-4 py-3 text-left font-medium text-zinc-400">
              Thời hạn
            </th>
            {showUrgency && (
              <th className="px-4 py-3 text-left font-medium text-zinc-400">
                Mức độ
              </th>
            )}
            <th className="px-4 py-3 text-left font-medium text-zinc-400">
              Trạng thái
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {directives.map((d) => {
            const urgency = getUrgency(d);
            return (
              <tr
                key={d.id}
                className="transition-colors hover:bg-zinc-800/50"
              >
                <td className="max-w-xs px-4 py-3">
                  <Link href={`/directive/${d.id}`} className="truncate font-medium text-white hover:text-blue-400 transition-colors">
                    {d.title}
                  </Link>
                  {d.nhiem_vu && (
                    <p className="mt-0.5 truncate text-xs text-zinc-500">
                      {d.nhiem_vu}
                    </p>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-zinc-300">
                  {d.dau_moi || "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  {d.deadline ? (
                    <span
                      className={
                        urgency === "red" || urgency === "black"
                          ? "font-medium text-red-400"
                          : "text-zinc-300"
                      }
                    >
                      {new Date(d.deadline).toLocaleDateString("vi-VN")}
                      {(urgency === "red" || urgency === "black") &&
                        d.deadline && (
                          <span className="ml-1 text-xs text-red-500">
                            ({daysOverdue(d.deadline)}d)
                          </span>
                        )}
                    </span>
                  ) : (
                    <span className="text-zinc-600">—</span>
                  )}
                </td>
                {showUrgency && (
                  <td className="whitespace-nowrap px-4 py-3">
                    <span
                      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs ${URGENCY_STYLE[urgency]}`}
                    >
                      {URGENCY_LABEL[urgency]}
                    </span>
                  </td>
                )}
                <td className="whitespace-nowrap px-4 py-3 text-zinc-400">
                  {d.status}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
