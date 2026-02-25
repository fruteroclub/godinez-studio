import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useWorkspaces, useCreateWorkspace } from "@/hooks/use-workspace";
import { content } from "@/lib/content";
import EmptyState from "@/components/ui/EmptyState";
import { ListSkeleton } from "@/components/ui/Skeleton";

const { workspaceSelector } = content.studio;

export default function WorkspaceSelector() {
  const { data: workspaces, isLoading } = useWorkspaces();
  const createWorkspace = useCreateWorkspace();
  const navigate = useNavigate();
  const [name, setName] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const ws = await createWorkspace.mutateAsync(name.trim());
    setName("");
    navigate(`/studio/${ws.slug}`);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-semibold text-[hsl(var(--foreground))]">
        {workspaceSelector.title}
      </h1>

      <form onSubmit={handleCreate} className="mt-6 flex gap-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del espacio"
          className="flex-1 rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:border-magenta focus:outline-none focus:ring-2 focus:ring-magenta/20"
        />
        <button
          type="submit"
          disabled={createWorkspace.isPending}
          className="rounded-md bg-magenta px-4 py-2 text-sm font-medium text-white hover:bg-magenta/90 transition-colors disabled:opacity-50"
        >
          {workspaceSelector.create}
        </button>
      </form>

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
                    {ws.slug} · {ws.tier}
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
