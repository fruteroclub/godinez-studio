import { useParams, Link } from "react-router-dom";
import {
  useProject,
  useProjectTasks,
  useProjectFiles,
  useProjectConversations,
} from "@/hooks/use-projects";
import { content } from "@/lib/content";
import { PageSkeleton } from "@/components/ui/Skeleton";

const { projectDetail: pd } = content.studio;

const priorityColors: Record<string, string> = {
  low: "bg-gray-500/20 text-gray-400",
  medium: "bg-blue-500/20 text-blue-400",
  high: "bg-orange-500/20 text-orange-400",
  urgent: "bg-red-500/20 text-red-400",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400",
  in_progress: "bg-blue-500/20 text-blue-400",
  completed: "bg-green-500/20 text-green-400",
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date: string | null) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("es-MX", {
    month: "short",
    day: "numeric",
  });
}

export default function ProjectDetail() {
  const { slug, projectId } = useParams<{
    slug: string;
    projectId: string;
  }>();
  const { data: project, isLoading } = useProject(projectId);
  const { data: tasks } = useProjectTasks(projectId);
  const { data: files } = useProjectFiles(projectId);
  const { data: conversations } = useProjectConversations(projectId);

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
      {/* Header */}
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

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2.5"
          >
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              {s.label}
            </p>
            <p className="mt-0.5 text-xl font-semibold text-[hsl(var(--foreground))]">
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Tasks section */}
      <section>
        <h2 className="mb-3 text-lg font-medium text-[hsl(var(--foreground))]">
          {pd.tasksSection}
        </h2>
        {!tasks?.length ? (
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {pd.noTasks}
          </p>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3"
              >
                <p className="flex-1 text-sm font-medium text-[hsl(var(--foreground))]">
                  {task.title}
                </p>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[task.status] ?? statusColors.pending}`}
                >
                  {task.status}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${priorityColors[task.priority] ?? priorityColors.medium}`}
                >
                  {task.priority}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Files section */}
      <section>
        <h2 className="mb-3 text-lg font-medium text-[hsl(var(--foreground))]">
          {pd.filesSection}
        </h2>
        {!files?.length ? (
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {pd.noFiles}
          </p>
        ) : (
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3"
              >
                <p className="flex-1 truncate text-sm font-medium text-[hsl(var(--foreground))]">
                  {file.filename}
                </p>
                <span className="text-xs text-[hsl(var(--muted-foreground))]">
                  {file.mimeType?.split("/")[1] ?? "file"}
                </span>
                <span className="text-xs text-[hsl(var(--muted-foreground))]">
                  {formatBytes(file.sizeBytes)}
                </span>
                <span className="text-xs text-[hsl(var(--muted-foreground))]">
                  {formatDate(file.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Conversations section */}
      <section>
        <h2 className="mb-3 text-lg font-medium text-[hsl(var(--foreground))]">
          {pd.conversationsSection}
        </h2>
        {!conversations?.length ? (
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {pd.noConversations}
          </p>
        ) : (
          <div className="space-y-2">
            {conversations.map((conv) => (
              <Link
                key={conv.id}
                to={`/studio/${slug}/chat/${conv.id}`}
                className="flex items-center gap-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 transition-colors hover:border-magenta/30"
              >
                <p className="flex-1 text-sm font-medium text-[hsl(var(--foreground))]">
                  {conv.title}
                </p>
                <span className="text-xs text-[hsl(var(--muted-foreground))]">
                  {formatDate(conv.lastMessageAt ?? conv.createdAt)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
