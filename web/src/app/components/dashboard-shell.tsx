"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { TabBar, type TabKey } from "./tab-navigation";

interface DashboardShellProps {
  tongQuan: ReactNode;
  hanhDong: ReactNode;
  chienLuoc: ReactNode;
  dienBien: ReactNode;
}

function ShellInner({ tongQuan, hanhDong, chienLuoc, dienBien }: DashboardShellProps) {
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get("tab") as TabKey) || "tong-quan";

  return (
    <>
      <TabBar />
      <main className="mx-auto max-w-lg px-4 pt-4 pb-8 pb-safe sm:max-w-2xl lg:max-w-4xl sm:px-6">
        {activeTab === "tong-quan" && <div className="tab-panel space-y-4">{tongQuan}</div>}
        {activeTab === "hanh-dong" && <div className="tab-panel space-y-4">{hanhDong}</div>}
        {activeTab === "chien-luoc" && <div className="tab-panel space-y-4">{chienLuoc}</div>}
        {activeTab === "dien-bien" && <div className="tab-panel space-y-4">{dienBien}</div>}
      </main>
    </>
  );
}

export default function DashboardShell(props: DashboardShellProps) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20 text-zinc-500">
        Đang tải…
      </div>
    }>
      <ShellInner {...props} />
    </Suspense>
  );
}
