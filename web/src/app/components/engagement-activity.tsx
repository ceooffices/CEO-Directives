/**
 * Engagement Activity Timeline — GitHub Commit History Style
 * Hiển thị lịch sử tương tác & hành vi tuân thủ chỉ đạo
 * Grouped by date, expandable details, filter tabs
 * 
 * Triết lý: Ghi nhận mọi tín hiệu hành vi — không phán xét, chỉ nhận diện
 */

"use client";

import { useState, useMemo } from "react";

interface EngagementEvent {
  event_type: string;
  recipient_email: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface EngagementActivityProps {
  events: EngagementEvent[];
}

const EVENT_CONFIG: Record<string, { icon: string; label: string; color: string; bgColor: string; dotColor: string; category: "email" | "action" | "system" }> = {
  approve:       { icon: "✅", label: "CEO đã duyệt",             color: "text-emerald-700", bgColor: "bg-emerald-50",  dotColor: "bg-emerald-500", category: "action" },
  reject:        { icon: "❌", label: "CEO từ chối",               color: "text-red-700",     bgColor: "bg-red-50",      dotColor: "bg-red-500",     category: "action" },
  confirm:       { icon: "🔵", label: "Đầu mối xác nhận đã nhận", color: "text-blue-700",    bgColor: "bg-blue-50",     dotColor: "bg-blue-500",    category: "action" },
  clarify:       { icon: "❓", label: "Yêu cầu làm rõ",           color: "text-amber-700",   bgColor: "bg-amber-50",    dotColor: "bg-amber-500",   category: "action" },
  remind:        { icon: "💬", label: "Gửi hỗ trợ đầu mối",       color: "text-blue-700",    bgColor: "bg-blue-50",     dotColor: "bg-blue-400",    category: "action" },
  escalate:      { icon: "📋", label: "Báo cáo rủi ro",           color: "text-amber-700",   bgColor: "bg-amber-50",    dotColor: "bg-amber-500",   category: "action" },
  view:          { icon: "👁",  label: "Đã xem trên dashboard",    color: "text-gray-600",    bgColor: "bg-gray-50",     dotColor: "bg-gray-400",    category: "action" },
  email_sent:    { icon: "📧", label: "Gửi email đồng hành",      color: "text-indigo-700",  bgColor: "bg-indigo-50",   dotColor: "bg-indigo-500",  category: "email" },
  email_opened:  { icon: "👁",  label: "Đầu mối mở email",         color: "text-emerald-700", bgColor: "bg-emerald-50",  dotColor: "bg-emerald-500", category: "email" },
  link_clicked:  { icon: "🔗", label: "Click CTA trong email",     color: "text-blue-700",    bgColor: "bg-blue-50",     dotColor: "bg-blue-500",    category: "email" },
  auto_remind:   { icon: "🤖", label: "Hệ thống tự động kiểm tra", color: "text-purple-700",  bgColor: "bg-purple-50",   dotColor: "bg-purple-400",  category: "system" },
  auto_escalate: { icon: "🤖", label: "Hệ thống tự động báo cáo",  color: "text-orange-700",  bgColor: "bg-orange-50",   dotColor: "bg-orange-400",  category: "system" },
  confirmed:     { icon: "✅", label: "Đã xác nhận",               color: "text-emerald-700", bgColor: "bg-emerald-50",  dotColor: "bg-emerald-500", category: "action" },
  escalated:     { icon: "📋", label: "Đã báo cáo rủi ro",        color: "text-amber-700",   bgColor: "bg-amber-50",    dotColor: "bg-amber-500",   category: "action" },
};

const FILTER_TABS: { key: string; label: string; icon: string }[] = [
  { key: "all",    label: "Tất cả",   icon: "📋" },
  { key: "email",  label: "Email",    icon: "📧" },
  { key: "action", label: "Hành động", icon: "⚡" },
  { key: "system", label: "Hệ thống", icon: "🤖" },
];

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const d = date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" });
  const todayStr = today.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" });
  const yesterdayStr = yesterday.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" });

  if (d === todayStr) return "Hôm nay";
  if (d === yesterdayStr) return "Hôm qua";
  return d;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

function groupByDate(events: EngagementEvent[]): Record<string, EngagementEvent[]> {
  const groups: Record<string, EngagementEvent[]> = {};
  for (const event of events) {
    const dateKey = new Date(event.created_at).toLocaleDateString("vi-VN", {
      day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh",
    });
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(event);
  }
  return groups;
}

function extractDetail(event: EngagementEvent): string | null {
  const m = event.metadata;
  if (!m) return null;

  const parts: string[] = [];

  // Note / reason
  const note = (m.note as string) || (m.reason as string) || (m.ly_do as string);
  if (note) parts.push(`💬 "${note}"`);

  // Bot detection for email_opened
  if (event.event_type === "email_opened") {
    if (m.is_bot) {
      parts.push(`🤖 Bot: ${(m.bot_type as string) || "unknown"}`);
    } else {
      const ua = m.user_agent as string;
      if (ua) {
        // Parse browser + OS from user agent (simplified)
        const browser = ua.includes("Chrome") ? "Chrome" : ua.includes("Firefox") ? "Firefox" : ua.includes("Safari") ? "Safari" : ua.includes("Outlook") ? "Outlook" : "Email client";
        const os = ua.includes("Mac") ? "macOS" : ua.includes("Windows") ? "Windows" : ua.includes("iPhone") ? "iOS" : ua.includes("Android") ? "Android" : "";
        parts.push(`🖥 ${browser}${os ? " / " + os : ""}`);
      }
      if (m.ip && (m.ip as string) !== "unknown") {
        parts.push(`🌐 IP: ${(m.ip as string).replace(/\.\d+$/, ".***")}`); // mask last octet
      }
    }
  }

  // Subject for email_sent
  if (event.event_type === "email_sent" && m.subject) {
    parts.push(`📋 "${m.subject}"`);
  }

  return parts.length > 0 ? parts.join(" · ") : null;
}

export default function EngagementActivity({ events }: EngagementActivityProps) {
  const [filter, setFilter] = useState("all");
  const [expandedEvents, setExpandedEvents] = useState<Set<number>>(new Set());

  const filteredEvents = useMemo(() => {
    if (filter === "all") return events;
    return events.filter((e) => {
      const config = EVENT_CONFIG[e.event_type];
      return config?.category === filter;
    });
  }, [events, filter]);

  const grouped = useMemo(() => groupByDate(filteredEvents), [filteredEvents]);
  const dateKeys = Object.keys(grouped);

  const toggleExpand = (globalIndex: number) => {
    setExpandedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(globalIndex)) next.delete(globalIndex);
      else next.add(globalIndex);
      return next;
    });
  };

  if (events.length === 0) {
    return (
      <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-200/50">
        <h3 className="text-sm font-semibold text-gray-900">📊 Lịch sử tương tác</h3>
        <div className="mt-6 text-center py-8">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-sm text-gray-400">Chưa có hoạt động nào được ghi nhận</p>
          <p className="text-[11px] text-gray-300 mt-1">Hệ thống sẽ tự động ghi nhận khi có tương tác</p>
        </div>
      </div>
    );
  }

  let globalIndex = 0;

  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-200/50 sm:p-6">
      {/* Header + Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900">📊 Lịch sử tương tác</h3>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
            {events.length} sự kiện
          </span>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-0.5">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${
                filter === tab.key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline grouped by date */}
      <div className="space-y-5">
        {dateKeys.map((dateKey) => {
          const dateEvents = grouped[dateKey];
          const dateLabel = formatDate(dateEvents[0].created_at);

          return (
            <div key={dateKey}>
              {/* Date Header — like GitHub "Commits on Mar 17" */}
              <div className="flex items-center gap-2 mb-3">
                <div className="h-px flex-1 bg-gray-100" />
                <span className="text-[11px] font-semibold text-gray-500 bg-white px-2">
                  📅 {dateLabel}
                </span>
                <div className="h-px flex-1 bg-gray-100" />
                <span className="text-[10px] text-gray-400 bg-white px-1">
                  {dateEvents.length} sự kiện
                </span>
              </div>

              {/* Events for this date */}
              <div className="relative">
                {/* Vertical timeline line */}
                <div className="absolute left-[11px] top-3 bottom-3 w-[2px] bg-gray-100" />

                <div className="space-y-0">
                  {dateEvents.map((event, i) => {
                    const currentGlobalIndex = globalIndex++;
                    const config = EVENT_CONFIG[event.event_type] || {
                      icon: "📋",
                      label: event.event_type,
                      color: "text-gray-600",
                      bgColor: "bg-gray-50",
                      dotColor: "bg-gray-400",
                      category: "action" as const,
                    };
                    const detail = extractDetail(event);
                    const isExpanded = expandedEvents.has(currentGlobalIndex);
                    const isBot = event.metadata?.is_bot === true;

                    return (
                      <div
                        key={`${event.created_at}-${i}`}
                        className={`relative flex gap-3 group cursor-pointer hover:bg-gray-50/50 rounded-xl px-1 py-2 transition-colors ${isBot ? "opacity-50" : ""}`}
                        onClick={() => toggleExpand(currentGlobalIndex)}
                      >
                        {/* Timeline dot */}
                        <div className="relative z-10 mt-0.5">
                          <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs ${config.bgColor} ring-2 ring-white`}>
                            {config.icon}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2">
                            <div className="flex items-baseline gap-1.5 min-w-0">
                              <span className={`text-[13px] font-medium ${config.color} truncate`}>
                                {config.label}
                              </span>
                              {isBot && (
                                <span className="text-[9px] bg-gray-200 text-gray-500 rounded px-1 py-0.5 shrink-0">
                                  BOT
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {event.recipient_email && (
                                <span className="text-[10px] text-gray-400 font-mono hidden sm:inline">
                                  {event.recipient_email.split("@")[0]}@…
                                </span>
                              )}
                              <span className="text-[11px] text-gray-400 tabular-nums font-mono">
                                {formatTime(event.created_at)}
                              </span>
                            </div>
                          </div>

                          {/* Expandable detail */}
                          {detail && (
                            <div className={`overflow-hidden transition-all duration-200 ${isExpanded ? "max-h-40 mt-1.5" : "max-h-0"}`}>
                              <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2 text-[11px] text-gray-500 leading-relaxed">
                                {detail}
                              </div>
                            </div>
                          )}

                          {/* Expand hint */}
                          {detail && !isExpanded && (
                            <div className="text-[10px] text-gray-300 mt-0.5 group-hover:text-gray-400 transition-colors">
                              Click để xem chi tiết →
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom stats */}
      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400">
        <span>
          {filteredEvents.length === events.length
            ? `Tổng: ${events.length} sự kiện`
            : `Hiển thị: ${filteredEvents.length}/${events.length} sự kiện`}
        </span>
        <span>
          {dateKeys.length} ngày có hoạt động
        </span>
      </div>
    </div>
  );
}
