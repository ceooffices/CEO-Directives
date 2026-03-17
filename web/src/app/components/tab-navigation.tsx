"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useCallback } from "react";

const TABS = [
  { key: "tong-quan", label: "Tổng quan", icon: "📊" },
  { key: "hanh-dong", label: "Hành động", icon: "🚨" },
  { key: "chien-luoc", label: "Chiến lược", icon: "🎯" },
  { key: "dien-bien", label: "Diễn biến", icon: "📈" },
] as const;

export type TabKey = (typeof TABS)[number]["key"];

function TabBar() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = (searchParams.get("tab") as TabKey) || "tong-quan";

  const handleTabClick = useCallback(
    (key: TabKey) => {
      const params = new URLSearchParams(searchParams.toString());
      if (key === "tong-quan") {
        params.delete("tab");
      } else {
        params.set("tab", key);
      }
      const qs = params.toString();
      router.push(qs ? `/?${qs}` : "/", { scroll: false });
    },
    [searchParams, router]
  );

  return (
    <nav className="border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-1 px-4 sm:px-6">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabClick(tab.key)}
              className={`
                relative flex items-center gap-2 px-4 py-3 text-[13px] font-medium
                transition-all duration-200 whitespace-nowrap
                ${
                  isActive
                    ? "text-white"
                    : "text-zinc-500 hover:text-zinc-300"
                }
              `}
            >
              <span className="text-[15px]">{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
              {/* Active indicator */}
              {isActive && (
                <span className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-blue-500 tab-indicator" />
              )}
            </button>
          );
        })}

        {/* Badge for action count */}
        <div className="ml-auto flex items-center gap-3">
          <a
            href="/api/status"
            target="_blank"
            className="rounded-full bg-zinc-800/60 px-3 py-1.5 text-[11px] font-medium text-zinc-400 transition-all hover:bg-zinc-700/60 hover:text-zinc-300"
          >
            API
          </a>
        </div>
      </div>
    </nav>
  );
}

interface TabPanelProps {
  tabKey: TabKey;
  activeTab: TabKey;
  children: React.ReactNode;
}

function TabPanel({ tabKey, activeTab, children }: TabPanelProps) {
  if (tabKey !== activeTab) return null;
  return <div className="tab-panel">{children}</div>;
}

export { TABS, TabBar, TabPanel };
