import { useWorkspace } from "@/providers/WorkspaceProvider";
import { useDashboard } from "@/hooks/use-workspace";
import { content } from "@/lib/content";
import { PageSkeleton } from "@/components/ui/Skeleton";

const { dashboard } = content.studio;

export default function Dashboard() {
  const { workspace } = useWorkspace();
  const { data: stats, isLoading } = useDashboard(workspace?.id);

  if (isLoading) return <PageSkeleton />;

  const statCards = [
    { label: dashboard.activeProjects, value: stats?.activeProjects ?? 0 },
    { label: dashboard.pendingTasks, value: stats?.pendingTasks ?? 0 },
    { label: dashboard.recentMessages, value: stats?.totalMessages ?? 0 },
    {
      label: dashboard.agentStatus,
      value: stats?.agent?.status === "active" ? "Activo" : "Sin asignar",
    },
  ];

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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4"
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
        <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-brand text-lg">
              🤖
            </div>
            <div>
              <p className="font-medium text-[hsl(var(--foreground))]">
                {stats.agent.name}
              </p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                {stats.agent.template} ·{" "}
                {stats.agent.status === "active" ? "Activo" : stats.agent.status}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
