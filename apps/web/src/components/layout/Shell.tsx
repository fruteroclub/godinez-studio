import { useState } from "react";
import { FeedbackWidget } from "@/components/errors/feedback-widget";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import WorkspaceProvider, {
  useWorkspace,
} from "@/providers/WorkspaceProvider";


function ShellContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { workspace, isLoading, slug } = useWorkspace();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[hsl(var(--background))]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-magenta border-t-transparent" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="flex h-screen items-center justify-center bg-[hsl(var(--background))]">
        <p className="text-[hsl(var(--muted-foreground))]">
          Espacio de trabajo no encontrado
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[hsl(var(--background))]">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar container - width adjusts based on collapsed state */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transform transition-all duration-200 lg:static lg:translate-x-0 ${
          sidebarCollapsed ? "w-14" : "w-60"
        } ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <Sidebar 
          slug={slug} 
          onNavigate={() => setSidebarOpen(false)}
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
        />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar onMenuToggle={() => setSidebarOpen(true)} />
        <main className={`flex-1 overflow-y-auto ${location.pathname.includes("/chat/") ? "" : "p-4 sm:p-6"}`}>
          <Outlet />
        </main>
        {!location.pathname.includes("/chat/") && <FeedbackWidget />}
      </div>
    </div>
  );
}

export default function Shell() {
  return (
    <WorkspaceProvider>
      <ShellContent />
    </WorkspaceProvider>
  );
}
