import { Navigate, useNavigate } from "react-router-dom";
import { Bot } from "lucide-react";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import { useConnection, type ConnectionState } from "@/providers/ConnectionProvider";
import { useDashboard, useWorkspaceUsage } from "@/hooks/use-workspace";
import { content } from "@/lib/content";
import { PageSkeleton } from "@/components/ui/Skeleton";

const { dashboard } = content.studio;

// Estados de conexión con colores y textos
const CONNECTION_STATUS: Record<ConnectionState, { color: string; text: string }> = {
  connected: { color: "bg-green-500", text: "En línea" },
  offline: { color: "bg-red-500", text: "Sin conexión" },
  reconnecting: { color: "bg-yellow-500", text: "Reconectando..." },
  timeout: { color: "bg-orange-500", text: "Tiempo de espera" },
  unstable: { color: "bg-amber-500", text: "Conexión inestable" },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { workspace, slug } = useWorkspace();
  const { state: connectionState } = useConnection();
  const { data: stats, isLoading } = useDashboard(workspace?.id);
  const { data: usage } = useWorkspaceUsage(workspace?.id);

  if (isLoading) return <PageSkeleton />;

  // Redirect to onboarding if no agent provisioned
  if (!workspace?.agentSlot) {
    return <Navigate to="/studio/new" replace />;
  }

  const statCards = [
    { label: dashboard.activeProjects, value: stats?.activeProjects ?? 0, path: `/studio/${slug}/projects` },
    { label: dashboard.pendingTasks, value: stats?.pendingTasks ?? 0, path: `/studio/${slug}/tasks` },
    { label: dashboard.recentMessages, value: stats?.totalMessages ?? 0, path: `/studio/${slug}/chat` },
  ];

  const status = CONNECTION_STATUS[connectionState];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[hsl(var(--foreground))]">
          {dashboard.title}
        </h1>
        <p className="text-[hsl(var(--muted-foreground))]">
          {dashboard.welcome}, {workspace?.name}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            onClick={() => navigate(stat.path)}
            className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 cursor-pointer transition-all hover:border-magenta/50 hover:bg-[hsl(var(--card))]/80"
          >
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              {stat.label}
            </p>
            <p className="mt-1 text-2xl font-semibold text-[hsl(var(--foreground))]">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {stats?.agent && (
        <div 
          onClick={() => navigate(`/studio/${slug}/agents`)} 
          className="rounded-lg cursor-pointer transition-all hover:border-magenta/50 border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-brand text-lg">
              <Bot className="w-5 h-5 text-white stroke-[1.5]" />
            </div>
            <div>
              <p className="font-medium text-[hsl(var(--foreground))]">
                {stats.agent.name}
              </p>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${status.color}`} />
                <span className="text-xs text-[hsl(var(--muted-foreground))]">
                  {status.text}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {usage && (
        <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 space-y-3">
          <p className="text-sm font-medium text-[hsl(var(--foreground))]">
            Uso del mes
          </p>
          <UsageBar label="Tokens" used={usage.tokens.used} limit={usage.tokens.limit} format="tokens" />
          <UsageBar label="Almacenamiento" used={usage.storage.used} limit={usage.storage.limit} format="bytes" />
          <UsageBar label="Miembros" used={usage.members.used} limit={usage.members.limit} format="number" />
        </div>
      )}
    </div>
  );
}

function UsageBar({ label, used, limit, format }: {
  label: string;
  used: number;
  limit: number;
  format: "tokens" | "bytes" | "number";
}) {
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const isHigh = pct >= 80;

  function fmt(value: number) {
    if (format === "bytes") {
      if (value === 0) return "0 B";
      const k = 1024;
      const sizes = ["B", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(value) / Math.log(k));
      return `${(value / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
    }
    if (format === "tokens") {
      if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
      if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
      return String(value);
    }
    return String(value);
  }

  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-[hsl(var(--muted-foreground))]">{label}</span>
        <span className="text-[hsl(var(--foreground))]">
          {fmt(used)} / {fmt(limit)}
        </span>
      </div>
      <div className="h-2 rounded-full bg-[hsl(var(--muted))]">
        <div
          className={`h-full rounded-full transition-all ${isHigh ? "bg-red-500" : "bg-magenta"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
