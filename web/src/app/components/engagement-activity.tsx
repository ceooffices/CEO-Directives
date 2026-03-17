/**
 * Engagement Activity Timeline
 * Hiển thị lịch sử tương tác & hành vi tuân thủ chỉ đạo
 * Triết lý: Ghi nhận mọi tín hiệu hành vi — không phán xét, chỉ nhận diện
 */

interface EngagementEvent {
  event_type: string;
  recipient_email: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface EngagementActivityProps {
  events: EngagementEvent[];
}

const EVENT_CONFIG: Record<string, { icon: string; label: string; color: string; bgColor: string }> = {
  approve: { icon: "✅", label: "Đã duyệt", color: "text-green-700", bgColor: "bg-green-50" },
  reject: { icon: "❌", label: "Từ chối", color: "text-red-700", bgColor: "bg-red-50" },
  confirm: { icon: "🔵", label: "Xác nhận", color: "text-blue-700", bgColor: "bg-blue-50" },
  clarify: { icon: "❓", label: "Yêu cầu làm rõ", color: "text-amber-700", bgColor: "bg-amber-50" },
  remind: { icon: "💬", label: "Gửi hỗ trợ", color: "text-blue-700", bgColor: "bg-blue-50" },
  escalate: { icon: "📋", label: "Báo cáo rủi ro", color: "text-amber-700", bgColor: "bg-amber-50" },
  view: { icon: "👁", label: "Đã xem", color: "text-gray-600", bgColor: "bg-gray-50" },
  email_sent: { icon: "📧", label: "Gửi email", color: "text-indigo-700", bgColor: "bg-indigo-50" },
  auto_remind: { icon: "🤖", label: "Tự động kiểm tra", color: "text-purple-700", bgColor: "bg-purple-50" },
  auto_escalate: { icon: "🤖📋", label: "Tự động báo cáo", color: "text-amber-700", bgColor: "bg-amber-50" },
};

function relativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Vừa xong";
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours}h trước`;
  if (diffDays < 7) return `${diffDays} ngày trước`;
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

function extractNote(metadata: Record<string, unknown> | null): string | null {
  if (!metadata) return null;
  return (metadata.note as string) || (metadata.reason as string) || (metadata.ly_do as string) || null;
}

export default function EngagementActivity({ events }: EngagementActivityProps) {
  if (events.length === 0) {
    return (
      <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-200/50">
        <h3 className="text-sm font-semibold text-gray-900">📊 Hoạt động</h3>
        <p className="mt-3 text-center text-sm text-gray-400">Chưa có hoạt động nào</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-200/50">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">📊 Hoạt động</h3>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
          {events.length} sự kiện
        </span>
      </div>

      <div className="mt-4 space-y-0">
        {events.map((event, i) => {
          const config = EVENT_CONFIG[event.event_type] || {
            icon: "📋",
            label: event.event_type,
            color: "text-gray-600",
            bgColor: "bg-gray-50",
          };
          const note = extractNote(event.metadata);
          const isLast = i === events.length - 1;

          return (
            <div key={`${event.created_at}-${i}`} className="relative flex gap-3">
              {/* Timeline line */}
              {!isLast && (
                <div className="absolute left-[15px] top-8 h-[calc(100%-8px)] w-[2px] bg-gray-100" />
              )}

              {/* Icon circle */}
              <div className={`relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${config.bgColor} text-sm`}>
                {config.icon}
              </div>

              {/* Content */}
              <div className={`flex-1 pb-4 ${isLast ? "" : ""}`}>
                <div className="flex items-baseline justify-between">
                  <span className={`text-[13px] font-medium ${config.color}`}>
                    {config.label}
                  </span>
                  <span className="text-[11px] text-gray-400">
                    {relativeTime(event.created_at)}
                  </span>
                </div>
                {event.recipient_email && (
                  <p className="mt-0.5 text-[11px] text-gray-400">
                    {event.recipient_email}
                  </p>
                )}
                {note && (
                  <p className="mt-1 rounded-xl bg-gray-50 px-3 py-1.5 text-[12px] text-gray-600 italic">
                    &ldquo;{note}&rdquo;
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
