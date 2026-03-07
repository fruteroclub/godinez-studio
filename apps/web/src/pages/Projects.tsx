import { useState } from "react";
import { Link } from "react-router-dom";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import { useProjects, useCreateProject } from "@/hooks/use-projects";
import { content } from "@/lib/content";
import EmptyState from "@/components/ui/EmptyState";
import { ListSkeleton } from "@/components/ui/Skeleton";

const { projects: pc } = content.studio;

const statusColors: Record<string, string> = {
  active: "bg-green-500/20 text-green-400",
  completed: "bg-blue-500/20 text-blue-400",
  archived: "bg-gray-500/20 text-gray-400",
};

export default function Projects() {
  const { workspace, slug } = useWorkspace();
  const { data: projects, isLoading } = useProjects(workspace?.id);
  const createProject = useCreateProject(workspace?.id ?? 0);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await createProject.mutateAsync({
      name: name.trim(),
      description: description.trim() || undefined,
    });
    setName("");
    setDescription("");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-[hsl(var(--foreground))]">
        {pc.title}
      </h1>

      <form
        onSubmit={handleCreate}
        className="flex gap-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4"
      >
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del proyecto"
          required
          minLength={2}
          className="min-w-[200px] flex-1 rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:border-magenta focus:outline-none focus:ring-2 focus:ring-magenta/20"
        />
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descripcion (opcional)"
          className="hidden flex-1 rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:border-magenta focus:outline-none focus:ring-2 focus:ring-magenta/20 sm:block"
        />
        <button
          type="submit"
          disabled={createProject.isPending}
          className="rounded-md bg-magenta px-4 py-2 text-sm font-medium text-white hover:bg-magenta/90 transition-colors disabled:opacity-50"
        >
          {pc.create}
        </button>
      </form>

      {isLoading ? (
        <ListSkeleton />
      ) : !projects?.length ? (
        <EmptyState message={pc.empty} />
      ) : (
        <div className="space-y-2">
          {projects.map((project) => (
            <Link
              key={project.id}
              to={`/studio/${slug}/projects/${project.id}`}
              className="flex items-center justify-between rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 transition-colors hover:border-magenta/30"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-[hsl(var(--foreground))]">
                  {project.name}
                </p>
                {project.description && (
                  <p className="mt-0.5 text-sm text-[hsl(var(--muted-foreground))] truncate">
                    {project.description}
                  </p>
                )}
              </div>
              <span
                className={`ml-3 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[project.status] ?? statusColors.archived}`}
              >
                {project.status}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
