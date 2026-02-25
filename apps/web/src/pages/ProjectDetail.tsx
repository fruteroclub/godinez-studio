import { useParams } from "react-router-dom";
import { useProject } from "@/hooks/use-projects";
import { PageSkeleton } from "@/components/ui/Skeleton";

export default function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: project, isLoading } = useProject(projectId);

  if (isLoading) return <PageSkeleton />;
  if (!project) {
    return (
      <p className="text-[hsl(var(--muted-foreground))]">
        Proyecto no encontrado
      </p>
    );
  }

  const stats = [
    { label: "Tareas totales", value: project.stats.totalTasks },
    { label: "Completadas", value: project.stats.completedTasks },
    { label: "Conversaciones", value: project.stats.conversations },
    { label: "Archivos", value: project.stats.files },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[hsl(var(--foreground))]">
          {project.name}
        </h1>
        {project.description && (
          <p className="mt-1 text-[hsl(var(--muted-foreground))]">
            {project.description}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4"
          >
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              {s.label}
            </p>
            <p className="mt-1 text-2xl font-semibold text-[hsl(var(--foreground))]">
              {s.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
