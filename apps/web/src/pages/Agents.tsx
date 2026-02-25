import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { content } from "@/lib/content";
import EmptyState from "@/components/ui/EmptyState";
import { ListSkeleton } from "@/components/ui/Skeleton";

const { agents: ac } = content.studio;

interface Agent {
  id: number;
  name: string;
  slug: string;
  template: string;
  status: string;
  config: Record<string, unknown> | null;
}

export default function Agents() {
  const { getToken } = useAuth();
  const { data: agents, isLoading } = useQuery({
    queryKey: ["agents"],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<Agent[]>("/api/agents", { token });
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-[hsl(var(--foreground))]">
        {ac.title}
      </h1>

      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : !agents?.length ? (
        <EmptyState message={ac.empty} />
      ) : (
        <div className="space-y-2">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="flex items-center gap-4 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-brand text-lg">
                🤖
              </div>
              <div className="flex-1">
                <p className="font-medium text-[hsl(var(--foreground))]">
                  {agent.name}
                </p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  {agent.template} · {agent.slug}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  agent.status === "active"
                    ? "bg-green-500/20 text-green-400"
                    : "bg-gray-500/20 text-gray-400"
                }`}
              >
                {agent.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
