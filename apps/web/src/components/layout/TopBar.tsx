import { Link, useLocation } from "react-router-dom";
import { UserButton } from "@clerk/clerk-react";
import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { WifiOff, RefreshCw, Clock, AlertTriangle } from "lucide-react";
import { useConnection } from "@/providers/ConnectionProvider";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import { apiFetch } from "@/lib/api";

interface Agent {
  id: number;
  name: string;
  status: string;
}

// Obtener título simple según la página actual
function getPageTitle(
  pathname: string, 
  agentName?: string,
  workspaceName?: string
): { title: string; subtitle?: string } {
  const segments = pathname.split("/").filter(Boolean);
  
  // Chat con agente
  if (segments.includes("chat") && segments.some(s => /^\d+$/.test(s))) {
    return {
      title: agentName || "Agente",
      subtitle: "Chat activo"
    };
  }
  
  // Dashboard
  if (segments.includes("dashboard") || (segments.length === 2 && segments[0] === "studio")) {
    return {
      title: workspaceName || "Dashboard"
    };
  }
  
  // Página de Agents
  if (segments.includes("agents")) {
    return {
      title: agentName || "Agente",
      subtitle: "Configuración"
    };
  }
  
  // Otras páginas
  const lastSegment = segments[segments.length - 1] || "Inicio";
  return {
    title: lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1)
  };
}

const connectionConfig = {
  offline: {
    icon: WifiOff,
    bg: "bg-red-500/20",
    text: "text-red-400",
    label: "Agente desconectado",
    description: "Los mensajes no serán respondidos hasta que se reconecte",
    spin: false,
  },
  reconnecting: {
    icon: RefreshCw,
    bg: "bg-yellow-500/20",
    text: "text-yellow-400",
    label: "Reconectando...",
    description: "Intentando restablecer la conexión",
    spin: true,
  },
  timeout: {
    icon: Clock,
    bg: "bg-orange-500/20",
    text: "text-orange-400",
    label: "Conexión agotada",
    description: "Intenta recargar la página",
    spin: false,
  },
  unstable: {
    icon: AlertTriangle,
    bg: "bg-amber-500/20",
    text: "text-amber-400",
    label: "Conexión inestable",
    description: "Algunas respuestas pueden tardar",
    spin: false,
  },
};

export default function TopBar({
  onMenuToggle,
}: {
  onMenuToggle?: () => void;
}) {
  const { pathname } = useLocation();
  const { workspace, slug } = useWorkspace();
  const { getToken } = useAuth();
  
  // Obtener datos del agente
  const { data: agent } = useQuery({
    queryKey: ["agent", workspace?.agentId],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<Agent>(`/api/agents/${workspace!.agentId}`, { token });
    },
    enabled: !!workspace?.agentId,
  });
  
  const pageInfo = getPageTitle(pathname, agent?.name, workspace?.name);
  
  const { state: connectionState } = useConnection();
  const hasConnectionIssue = connectionState !== "connected";
  const config = hasConnectionIssue ? connectionConfig[connectionState as keyof typeof connectionConfig] : null;
  const Icon = config?.icon;

  // Link al dashboard del workspace
  const dashboardLink = slug ? `/studio/${slug}` : "/studio";

  return (
    <header 
      className={`flex h-14 min-h-14 shrink-0 items-center justify-between border-b px-4 sm:px-6 ${
        hasConnectionIssue 
          ? `${config?.bg} border-${connectionState === 'offline' ? 'red' : connectionState === 'reconnecting' ? 'yellow' : connectionState === 'timeout' ? 'orange' : 'amber'}-500/30` 
          : 'bg-[hsl(var(--background))] border-[hsl(var(--border))]'
      }`}
      role={hasConnectionIssue ? "alert" : undefined}
      aria-live={hasConnectionIssue ? "assertive" : undefined}
    >
      <button
        onClick={onMenuToggle}
        className={`mr-3 rounded-md p-1.5 transition-colors lg:hidden shrink-0 ${
          hasConnectionIssue 
            ? `${config?.text} hover:bg-white/10` 
            : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--foreground))]'
        }`}
        aria-label="Abrir menu"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {hasConnectionIssue && Icon ? (
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Icon className={`w-5 h-5 ${config?.text} shrink-0 ${config?.spin ? 'animate-spin' : ''}`} />
          <div className="flex flex-col min-w-0">
            <span className={`text-sm font-semibold ${config?.text} leading-tight`}>{config?.label}</span>
            <span className={`text-xs ${config?.text} opacity-70 truncate leading-tight`}>{config?.description}</span>
          </div>
        </div>
      ) : (
        <Link 
          to={dashboardLink}
          className="flex flex-col min-w-0 hover:opacity-80 transition-opacity cursor-pointer"
        >
          <span className="text-[hsl(var(--foreground))] font-medium text-sm leading-tight">
            {pageInfo.title}
          </span>
          {pageInfo.subtitle && (
            <span className="text-[hsl(var(--muted-foreground))] text-xs leading-tight">
              {pageInfo.subtitle}
            </span>
          )}
        </Link>
      )}

      <UserButton appearance={{ elements: { avatarBox: "h-8 w-8" } }} />
    </header>
  );
}
