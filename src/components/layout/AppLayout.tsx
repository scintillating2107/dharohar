"use client";

import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { AppShellTopbar } from "./AppShellTopbar";
import { GovFooter } from "./GovBranding";

export function AppLayout({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <AppShellTopbar />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 bg-[var(--gov-bg)]">
          <Topbar title={title} />
          <main className="flex-1 p-5 lg:p-7 overflow-auto">
            <div className="max-w-[1400px] mx-auto">{children}</div>
          </main>
          <GovFooter />
        </div>
      </div>
    </div>
  );
}
