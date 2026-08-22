"use client";
import { useState }        from "react";
import { Sidebar }         from "./Sidebar";
import { Topbar }          from "./Topbar";
import { MobileSidebar }   from "./MobileSidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div data-testid="app-shell" className="flex h-screen w-full overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex shrink-0">
        <Sidebar collapsed={collapsed} onCollapse={() => setCollapsed(v => !v)} />
      </div>

      {/* Main area */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <div
          data-testid="topbar-container"
          className="relative z-40 flex items-center gap-2 border-b bg-card px-3 sm:px-4 h-[3.75rem] shrink-0 shadow-xs"
        >
          <div className="lg:hidden shrink-0">
            <MobileSidebar />
          </div>
          <div className="flex-1 min-w-0">
            <Topbar data-testid="topbar" sidebarCollapsed={collapsed} />
          </div>
        </div>
        <main data-testid="main-content" className="flex-1 overflow-y-auto overflow-x-hidden p-3.5 sm:p-5 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
