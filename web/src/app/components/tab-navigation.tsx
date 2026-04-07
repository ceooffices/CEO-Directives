"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useCallback } from "react";

const TABS = [
  { key: "tong-quan", label: "Tổng quan" },
  { key: "hanh-dong", label: "Cần quan tâm" },
  { key: "chien-luoc", label: "50 Hạng mục" },
  { key: "dien-bien", label: "Hành trình" },
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
    <nav className="border-b border-[#E5E5EA] bg-white sticky top-[68px] z-40">
      <div className="mx-auto flex max-w-lg items-center gap-1 px-4 sm:max-w-2xl lg:max-w-4xl sm:px-6 scroll-touch overflow-x-auto whitespace-nowrap hide-scrollbar">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabClick(tab.key)}
              className={`
                relative flex items-center px-4 py-3 text-[16px] font-semibold
                transition-all duration-200 whitespace-nowrap
                ${
                  isActive
                    ? "text-[#007AFF]"
                    : "text-[#6C6C70]"
                }
              `}
            >
              {tab.label}
              {/* Active indicator */}
              {isActive && (
                <span className="absolute bottom-0 left-2 right-2 h-[3px] rounded-t-full bg-[#007AFF] tab-indicator" />
              )}
            </button>
          );
        })}

        {/* Badge for action count */}
        <div className="ml-auto flex items-center gap-3">
          <a
            href="/api/status"
            target="_blank"
            className="rounded-full bg-[#F2F2F7] px-3 py-1.5 text-[14px] font-medium text-[#6C6C70] transition-all hover:bg-[#E5E5EA] hover:text-[#1C1C1E]"
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
