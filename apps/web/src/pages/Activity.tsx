import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import { apiFetch } from "@/lib/api";
import { content } from "@/lib/content";
import EmptyState from "@/components/ui/EmptyState";
import { ListSkeleton } from "@/components/ui/Skeleton";

const { activity: ac } = content.studio;

interface LogEntry {
  id: number;
  level: string;
  event: string;
  message: string;
  tokensUsed: number | null;
  durationMs: number | null;
  createdAt: string;
}

const levelColors: Record<string, string> = {
  info: "bg-blue-500/20 text-blue-400",
  warn: "bg-yellow-500/20 text-yellow-400",
  error: "bg-red-500/20 text-red-400",
  debug: "bg-gray-500/20 text-gray-400",
};

export default function Activity() {
  const { workspace } = useWorkspace();
  const { getToken } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["activity", workspace?.id],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<{ logs: LogEntry[] }>(
        `/api/workspaces/${workspace?.id}/activity`,
        { token },
      );
    },
    enabled: !!workspace?.id,
  });

  const logs = data?.logs ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-[hsl(var(--foreground))]">
        {ac.title}
      </h1>

      {isLoading ? (
        <ListSkeleton />
      ) : !logs.length ? (
        <EmptyState message={ac.empty} />
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div
              key={log.id}
              className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${levelColors[log.level] ?? levelColors.debug}`}
                >
                  {log.level}
                </span>
                <span className="text-sm font-medium text-[hsl(var(--foreground))]">
                  {log.event}
                </span>
                <span className="ml-auto text-xs text-[hsl(var(--muted-foreground))]">
                  {new Date(log.createdAt).toLocaleString("es-MX")}
                </span>
              </div>
              <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                {log.message}
              </p>
              {(log.tokensUsed || log.durationMs) && (
                <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                  {log.tokensUsed && `${log.tokensUsed} tokens`}
                  {log.tokensUsed && log.durationMs && " · "}
                  {log.durationMs && `${log.durationMs}ms`}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
