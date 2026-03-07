import { Link, useNavigate } from "react-router-dom";
import { useWorkspaces } from "@/hooks/use-workspace";
import { content } from "@/lib/content";
import EmptyState from "@/components/ui/EmptyState";
import { ListSkeleton } from "@/components/ui/Skeleton";

const { workspaceSelector } = content.studio;

export default function WorkspaceSelector() {
  const { data: workspaces, isLoading } = useWorkspaces();
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[hsl(var(--foreground))]">
          {workspaceSelector.title}
        </h1>
        <button
          onClick={() => navigate("/studio/new")}
          className="rounded-md bg-magenta px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-magenta/90"
        >
          {workspaceSelector.create}
        </button>
      </div>

      <div className="mt-8">
        {isLoading ? (
          <ListSkeleton rows={3} />
        ) : !workspaces?.length ? (
          <EmptyState message={workspaceSelector.empty} />
        ) : (
          <div className="space-y-2">
            {workspaces.map((ws) => (
              <Link
                key={ws.id}
                to={`/studio/${ws.slug}`}
                className="flex items-center justify-between rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 transition-colors hover:border-magenta/30"
              >
                <div>
                  <p className="font-medium text-[hsl(var(--foreground))]">
                    {ws.name}
                  </p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    {ws.slug}
                  </p>
                </div>
                <span className="text-xs text-[hsl(var(--muted-foreground))]">
                  {ws.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
