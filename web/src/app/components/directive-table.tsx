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
  green: "bg-green-50 text-green-600",
  yellow: "bg-amber-50 text-amber-600",
  red: "bg-red-50 text-red-600",
  black: "bg-red-100 text-red-700 font-bold",
  done: "bg-blue-50 text-blue-600",
};

const URGENCY_LABEL = {
  green: "Đúng tiến độ",
  yellow: "Sắp đến hạn",
  red: "Quá hạn",
  black: "Báo động",
  done: "Hoàn thành",
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
      <div className="rounded-3xl border border-dashed border-gray-200 bg-white py-12 text-center">
        <p className="text-gray-400">Không có chỉ đạo nào.</p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile: Card layout */}
      <div className="space-y-3 sm:hidden">
        {directives.map((d) => {
          const urgency = getUrgency(d);
          return (
            <Link
              key={d.id}
              href={`/directive/${d.id}`}
              className="block rounded-3xl bg-white p-4 shadow-sm ring-1 ring-gray-200/50 transition-all hover:shadow-md active:scale-[0.98]"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[14px] font-semibold text-gray-900 line-clamp-2 leading-tight">
                  {d.title}
                </p>
                {showUrgency && (
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${URGENCY_STYLE[urgency]}`}>
                    {URGENCY_LABEL[urgency]}
                  </span>
                )}
              </div>
              {d.nhiem_vu && (
                <p className="mt-1 text-[12px] text-gray-400 line-clamp-1">{d.nhiem_vu}</p>
              )}
              <div className="mt-3 flex items-center gap-4 text-[12px] text-gray-500">
                <span>{d.dau_moi || "—"}</span>
                {d.deadline && (
                  <span className={urgency === "red" || urgency === "black" ? "font-medium text-red-500" : ""}>
                    {new Date(d.deadline).toLocaleDateString("vi-VN")}
                    {(urgency === "red" || urgency === "black") && (
                      <span className="ml-1 text-red-400">({daysOverdue(d.deadline)}d)</span>
                    )}
                  </span>
                )}
                {d.hm50_ref && (
                  <span className="ml-auto text-[11px] text-gray-300">{d.hm50_ref}</span>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Desktop: Table layout */}
      <div className="hidden sm:block overflow-x-auto rounded-3xl bg-white shadow-sm ring-1 ring-gray-200/50">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-5 py-4 text-left text-[12px] font-medium uppercase tracking-wider text-gray-400">
                Chỉ đạo
              </th>
              <th className="px-5 py-4 text-left text-[12px] font-medium uppercase tracking-wider text-gray-400">
                Đầu mối
              </th>
              <th className="px-5 py-4 text-left text-[12px] font-medium uppercase tracking-wider text-gray-400">
                Thời hạn
              </th>
              {showUrgency && (
                <th className="px-5 py-4 text-left text-[12px] font-medium uppercase tracking-wider text-gray-400">
                  Mức độ
                </th>
              )}
              <th className="px-5 py-4 text-left text-[12px] font-medium uppercase tracking-wider text-gray-400">
                Trạng thái
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {directives.map((d) => {
              const urgency = getUrgency(d);
              return (
                <tr
                  key={d.id}
                  className="transition-colors hover:bg-gray-50/50"
                >
                  <td className="max-w-xs px-5 py-4">
                    <Link href={`/directive/${d.id}`} className="block truncate font-medium text-gray-900 hover:text-blue-600 transition-colors">
                      {d.title}
                    </Link>
                    {d.nhiem_vu && (
                      <p className="mt-0.5 truncate text-[12px] text-gray-400">
                        {d.nhiem_vu}
                      </p>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-gray-600">
                    {d.dau_moi || "—"}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">
                    {d.deadline ? (
                      <span
                        className={
                          urgency === "red" || urgency === "black"
                            ? "font-medium text-red-500"
                            : "text-gray-600"
                        }
                      >
                        {new Date(d.deadline).toLocaleDateString("vi-VN")}
                        {(urgency === "red" || urgency === "black") &&
                          d.deadline && (
                            <span className="ml-1 text-xs text-red-400">
                              ({daysOverdue(d.deadline)}d)
                            </span>
                          )}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  {showUrgency && (
                    <td className="whitespace-nowrap px-5 py-4">
                      <span
                        className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${URGENCY_STYLE[urgency]}`}
                      >
                        {URGENCY_LABEL[urgency]}
                      </span>
                    </td>
                  )}
                  <td className="whitespace-nowrap px-5 py-4 text-gray-500">
                    {d.status}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
