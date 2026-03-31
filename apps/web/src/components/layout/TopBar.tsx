import { Link, useLocation } from "react-router-dom";
import { UserButton } from "@clerk/clerk-react";
import { WifiOff, RefreshCw, Clock, AlertTriangle } from "lucide-react";
import { useConnection } from "@/providers/ConnectionProvider";

function getBreadcrumbs(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; href: string }[] = [];
  let currentPath = "";
  for (const segment of segments) {
    currentPath += `/${segment}`;
    const label = segment.charAt(0).toUpperCase() + segment.slice(1);
    crumbs.push({ label, href: currentPath });
  }
  return crumbs;
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
  const breadcrumbs = getBreadcrumbs(pathname);
  
  const { state: connectionState } = useConnection();
  const hasConnectionIssue = connectionState !== "connected";
  const config = hasConnectionIssue ? connectionConfig[connectionState as keyof typeof connectionConfig] : null;
  const Icon = config?.icon;

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
        <nav className="flex items-center gap-2 text-sm overflow-x-auto flex-1">
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.href} className="flex items-center gap-2 shrink-0">
              {i > 0 && <span className="text-[hsl(var(--muted-foreground))]">/</span>}
              {i === breadcrumbs.length - 1 ? (
                <span className="text-[hsl(var(--foreground))] font-medium">{crumb.label}</span>
              ) : (
                <Link to={crumb.href} className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors">
                  {crumb.label}
                </Link>
              )}
            </span>
          ))}
        </nav>
      )}

      <UserButton appearance={{ elements: { avatarBox: "h-8 w-8" } }} />
    </header>
  );
}
