import { useParams, Link, useNavigate } from "react-router-dom";
import { Plus, MessageSquare, FileText, ExternalLink, Globe, CheckCircle2, Circle, Clock } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  useProject,
  useProjectTasks,
  useProjectFiles,
  useProjectConversations,
} from "@/hooks/use-projects";
import { useCreateConversation } from "@/hooks/use-conversations";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import { PageSkeleton } from "@/components/ui/Skeleton";

const priorityColors: Record<string, string> = {
  low: "bg-gray-500",
  medium: "bg-blue-500",
  high: "bg-orange-500",
  urgent: "bg-red-500",
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date: string | null) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("es-MX", { month: "short", day: "numeric" });
}

function generateProgressData(tasks: any[] | undefined) {
  if (!tasks || tasks.length === 0) return [];
  
  const days: { date: string; label: string; completed: number; total: number }[] = [];
  const today = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    const label = date.toLocaleDateString("es-MX", { weekday: "short", day: "numeric" });
    
    const completed = tasks.filter(t => {
      if (t.status !== "completed") return false;
      const completedDate = t.updatedAt ? new Date(t.updatedAt).toISOString().split("T")[0] : null;
      return completedDate && completedDate <= dateStr;
    }).length;
    
    days.push({ date: dateStr, label, completed, total: tasks.length });
  }
  
  return days;
}

export default function ProjectDetail() {
  const { slug, projectId } = useParams<{ slug: string; projectId: string }>();
  const navigate = useNavigate();
  const { workspace } = useWorkspace();
  const { data: project, isLoading } = useProject(projectId);
  const { data: tasks } = useProjectTasks(projectId);
  const { data: files } = useProjectFiles(projectId);
  const { data: conversations, refetch: refetchConversations } = useProjectConversations(projectId);
  const createConversation = useCreateConversation(workspace?.id ?? 0);

  async function handleNewConversation() {
    if (!projectId) return;
    const conv = await createConversation.mutateAsync({
      projectId: parseInt(projectId),
      title: `Chat - ${project?.name}`,
    });
    await refetchConversations();
    navigate(`/studio/${slug}/chat/${conv.id}`);
  }

  if (isLoading) return <PageSkeleton />;
  if (!project) {
    return <p className="text-[hsl(var(--muted-foreground))]">Proyecto no encontrado</p>;
  }

  const completedTasks = tasks?.filter(t => t.status === "completed").length ?? 0;
  const totalTasks = tasks?.length ?? 0;
  const progressData = generateProgressData(tasks);
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[hsl(var(--foreground))]">{project.name}</h1>
          {project.description && (
            <p className="mt-1 text-[hsl(var(--muted-foreground))]">{project.description}</p>
          )}
        </div>
        <button
          onClick={handleNewConversation}
          disabled={createConversation.isPending}
          className="flex items-center gap-2 rounded-lg bg-magenta px-4 py-2 text-sm font-medium text-white hover:bg-magenta/90 transition-colors disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Nueva conversación
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-500/10">
              <CheckCircle2 className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-[hsl(var(--foreground))]">{completedTasks}/{totalTasks}</p>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">Tareas completadas</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10">
              <MessageSquare className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-[hsl(var(--foreground))]">{conversations?.length ?? 0}</p>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">Conversaciones</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <FileText className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-[hsl(var(--foreground))]">{files?.length ?? 0}</p>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">Archivos</p>
            </div>
          </div>
        </div>
      </div>

      {/* Three columns: Tareas, Conversaciones, Archivos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Tareas */}
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(var(--border))]">
            <h2 className="font-medium text-[hsl(var(--foreground))]">Tareas</h2>
            <Link to={`/studio/${slug}/tasks?project=${projectId}`} className="text-xs text-magenta hover:underline">
              Ver todas
            </Link>
          </div>
          <div className="divide-y divide-[hsl(var(--border))]">
            {!tasks?.length ? (
              <div className="px-4 py-6 text-center">
                <Circle className="w-6 h-6 text-[hsl(var(--muted-foreground))] mx-auto mb-2 opacity-50" />
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Sin tareas</p>
              </div>
            ) : (
              tasks.slice(0, 3).map((task) => (
                <div key={task.id} className="flex items-center gap-3 px-4 py-2.5">
                  {task.status === "completed" ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                  ) : task.status === "in_progress" ? (
                    <Clock className="w-4 h-4 text-blue-400 shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-[hsl(var(--muted-foreground))] shrink-0" />
                  )}
                  <span className={`flex-1 text-sm truncate ${task.status === "completed" ? "text-[hsl(var(--muted-foreground))] line-through" : "text-[hsl(var(--foreground))]"}`}>
                    {task.title}
                  </span>
                  <div className={`w-2 h-2 rounded-full ${priorityColors[task.priority] ?? priorityColors.medium}`} title={task.priority} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Conversaciones */}
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(var(--border))]">
            <h2 className="font-medium text-[hsl(var(--foreground))]">Conversaciones</h2>
            <Link to={`/studio/${slug}/chat?highlight=${projectId}`} className="text-xs text-magenta hover:underline">
              Ver todas
            </Link>
          </div>
          <div className="divide-y divide-[hsl(var(--border))]">
            {!conversations?.length ? (
              <button
                onClick={handleNewConversation}
                disabled={createConversation.isPending}
                className="w-full px-4 py-6 text-center hover:bg-[hsl(var(--muted))]/30 transition-colors"
              >
                <MessageSquare className="w-6 h-6 text-[hsl(var(--muted-foreground))] mx-auto mb-2 opacity-50" />
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Iniciar conversación</p>
              </button>
            ) : (
              conversations.slice(0, 3).map((conv) => (
                <Link
                  key={conv.id}
                  to={`/studio/${slug}/chat/${conv.id}`}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-[hsl(var(--muted))]/30 transition-colors"
                >
                  <MessageSquare className="w-4 h-4 text-[hsl(var(--muted-foreground))] shrink-0" />
                  <span className="flex-1 text-sm text-[hsl(var(--foreground))] truncate">{conv.title}</span>
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">
                    {formatDate(conv.lastMessageAt ?? conv.createdAt)}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Archivos */}
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(var(--border))]">
            <h2 className="font-medium text-[hsl(var(--foreground))]">Archivos</h2>
            <Link to={`/studio/${slug}/files?highlight=${projectId}`} className="text-xs text-magenta hover:underline">
              Ver todos
            </Link>
          </div>
          <div className="divide-y divide-[hsl(var(--border))]">
            {!files?.length ? (
              <div className="px-4 py-6 text-center">
                <FileText className="w-6 h-6 text-[hsl(var(--muted-foreground))] mx-auto mb-2 opacity-50" />
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Sin archivos</p>
              </div>
            ) : (
              files.slice(0, 3).map((file) => (
                <a
                  key={file.id}
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-[hsl(var(--muted))]/30 transition-colors group"
                >
                  <FileText className="w-4 h-4 text-[hsl(var(--muted-foreground))] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[hsl(var(--foreground))] truncate group-hover:text-magenta">
                      {file.filename}
                    </p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1">
                      {formatBytes(file.sizeBytes ?? 0)}
                      {(file as any).isGlobal && (
                        <span className="text-blue-400 flex items-center gap-0.5">
                          <Globe className="w-3 h-3" />
                        </span>
                      )}
                    </p>
                  </div>
                  <ExternalLink className="w-3 h-3 text-[hsl(var(--muted-foreground))] opacity-0 group-hover:opacity-100 shrink-0" />
                </a>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Progress Chart - Compacto */}
      {totalTasks > 0 && (
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Progreso: {completedTasks}/{totalTasks} tareas
            </p>
            <span className="text-2xl font-bold text-magenta">{progressPercent}%</span>
          </div>
          
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={progressData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <XAxis 
                  dataKey="label" 
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, totalTasks]}
                  allowDecimals={false}
                  width={20}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Line
                  type="monotone"
                  dataKey="completed"
                  stroke="#ec4899"
                  strokeWidth={2}
                  dot={{ fill: "#ec4899", strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5, fill: "#ec4899" }}
                  name="Completadas"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-between mt-2 text-[10px] text-[hsl(var(--muted-foreground))]">
            <span>← Días</span>
            <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-magenta rounded"></span> Tareas completadas</span>
          </div>
        </div>
      )}
    </div>
  );
}
