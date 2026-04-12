import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import type { Task, TaskStatus, TaskPriority } from "@godinez/types";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import {
  useTasks,
  useCreateTask,
  useUpdateTask,
  useUpdateTaskStatus,
  useUpdateTaskProject,
  useDeleteTask,
} from "@/hooks/use-tasks";
import { useProjects } from "@/hooks/use-projects";
import { content } from "@/lib/content";
import { KanbanSkeleton } from "@/components/ui/Skeleton";

const { tasks: tc } = content.studio;

const columns = [
  { key: "pending", label: tc.columnPending, color: "border-yellow-500/30" },
  {
    key: "in_progress",
    label: tc.columnInProgress,
    color: "border-blue-500/30",
  },
  {
    key: "completed",
    label: tc.columnCompleted,
    color: "border-green-500/30",
  },
] as const;

const priorityColors: Record<string, string> = {
  low: "bg-gray-500/20 text-gray-400",
  medium: "bg-blue-500/20 text-blue-400",
  high: "bg-orange-500/20 text-orange-400",
  urgent: "bg-red-500/20 text-red-400",
};

// ─── Column ──────────────────────────────────────────────────────────

function Column({
  columnKey,
  label,
  color,
  tasks,
  projects,
  onProjectChange,
  onEdit,
}: {
  columnKey: string;
  label: string;
  color: string;
  tasks: Task[];
  projects: { id: number; name: string }[];
  onProjectChange: (taskId: number, projectId: number | null) => void;
  onEdit: (task: Task) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: columnKey });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg border ${color} bg-[hsl(var(--card))] p-4 transition-colors ${
        isOver ? "ring-2 ring-magenta/40 bg-magenta/5" : ""
      }`}
    >
      <h3 className="mb-3 text-sm font-medium text-[hsl(var(--muted-foreground))]">
        {label} <span className="text-xs">({tasks.length})</span>
      </h3>
      <div className="space-y-2">
        {tasks.length === 0 ? (
          <div className="flex h-20 items-center justify-center rounded border border-dashed border-[hsl(var(--border))]">
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              {tc.emptyColumn}
            </p>
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              projects={projects}
              onProjectChange={onProjectChange}
              onEdit={onEdit}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── TaskCard ────────────────────────────────────────────────────────

function TaskCard({
  task,
  projects,
  onProjectChange,
  onEdit,
}: {
  task: Task;
  projects: { id: number; name: string }[];
  onProjectChange: (taskId: number, projectId: number | null) => void;
  onEdit: (task: Task) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: task,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`group w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-3 text-left transition-colors hover:border-magenta/30 ${
        isDragging ? "opacity-30" : "cursor-grab active:cursor-grabbing"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-[hsl(var(--foreground))]">
          {task.title}
        </p>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onEdit(task)}
          className="shrink-0 rounded p-0.5 text-[hsl(var(--muted-foreground))] opacity-0 transition-opacity hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] group-hover:opacity-100"
          title="Editar tarea"
        >
          <span className="text-xs">✎</span>
        </button>
      </div>
      {task.description && (
        <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))] line-clamp-2">
          {task.description}
        </p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex h-[18px] items-center rounded-full px-2 text-[10px] font-medium leading-none ${priorityColors[task.priority] ?? priorityColors.medium}`}
        >
          {task.priority}
        </span>
        {/* Project badge — styled select that looks like a badge */}
        <div
          className="relative inline-flex items-center"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <select
            value={task.projectId ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              onProjectChange(task.id, val ? Number(val) : null);
            }}
            className="h-[18px] appearance-none rounded-full bg-violet-500/20 py-0 pl-2 pr-4 text-[10px] font-medium leading-[18px] text-violet-400 border-none outline-none cursor-pointer hover:bg-violet-500/30 transition-colors"
          >
            <option value="" disabled hidden>Asignar a proyecto</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-[8px] text-violet-400">
            ▾
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── TaskCardOverlay (drag preview) ──────────────────────────────────

function TaskCardOverlay({ task }: { task: Task }) {
  return (
    <div className="w-72 rotate-2 rounded-md border border-magenta/40 bg-[hsl(var(--background))] p-3 shadow-lg shadow-magenta/20">
      <p className="text-sm font-medium text-[hsl(var(--foreground))]">
        {task.title}
      </p>
      {task.description && (
        <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))] line-clamp-2">
          {task.description}
        </p>
      )}
      <div className="mt-2">
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${priorityColors[task.priority] ?? priorityColors.medium}`}
        >
          {task.priority}
        </span>
      </div>
    </div>
  );
}

// ─── TaskEditModal ───────────────────────────────────────────────────

function TaskEditModal({
  task,
  projects,
  onSave,
  onDelete,
  onClose,
  isDeleting,
  isSaving,
}: {
  task: Task;
  projects: { id: number; name: string }[];
  onSave: (data: {
    taskId: number;
    title: string;
    description?: string;
    priority: string;
    projectId: number | null;
  }) => void;
  onDelete: (taskId: number) => void;
  onClose: () => void;
  isDeleting: boolean;
  isSaving: boolean;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [priority, setPriority] = useState(task.priority);
  const [projectId, setProjectId] = useState<number | null>(task.projectId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({
      taskId: task.id,
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      projectId,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-xl"
      >
        <h2 className="mb-4 text-lg font-semibold text-[hsl(var(--foreground))]">
          Editar tarea
        </h2>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="mb-1 block text-xs font-medium text-[hsl(var(--muted-foreground))]">
              Título
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:border-magenta focus:outline-none focus:ring-2 focus:ring-magenta/20"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-xs font-medium text-[hsl(var(--muted-foreground))]">
              Descripción
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:border-magenta focus:outline-none focus:ring-2 focus:ring-magenta/20"
            />
          </div>

          {/* Priority + Project row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-[hsl(var(--muted-foreground))]">
                Prioridad
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] focus:border-magenta focus:outline-none focus:ring-2 focus:ring-magenta/20"
              >
                <option value="" disabled hidden>Prioridad</option>
            <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[hsl(var(--muted-foreground))]">
                Proyecto
              </label>
              <select
                value={projectId ?? ""}
                onChange={(e) =>
                  setProjectId(
                    e.target.value ? Number(e.target.value) : null,
                  )
                }
                className="w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] focus:border-magenta focus:outline-none focus:ring-2 focus:ring-magenta/20"
              >
                <option value="" disabled hidden>Asignar a proyecto</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status (read-only info) */}
          <div className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
            <span>Estado:</span>
            <span className="font-medium text-[hsl(var(--foreground))]">
              {task.status === "pending"
                ? "Pendiente"
                : task.status === "in_progress"
                  ? "En progreso"
                  : "Completada"}
            </span>
            <span className="ml-auto">
              {new Date(task.createdAt).toLocaleDateString("es-MX", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={() => onDelete(task.id)}
            disabled={isDeleting}
            className="rounded-md border border-red-500/30 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
          >
            Eliminar
          </button>
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[hsl(var(--border))] px-4 py-2 text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSaving || !title.trim()}
            className="rounded-md bg-magenta px-4 py-2 text-sm font-medium text-white hover:bg-magenta/90 transition-colors disabled:opacity-50"
          >
            Guardar
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Tasks (main page) ──────────────────────────────────────────────

export default function Tasks() {
  const { workspace } = useWorkspace();
  const { data: tasks, isLoading } = useTasks(workspace?.id);
  const { data: projects } = useProjects(workspace?.id);
  const createTask = useCreateTask(workspace?.id ?? 0);
  const updateTask = useUpdateTask(workspace?.id ?? 0);
  const updateStatus = useUpdateTaskStatus(workspace?.id ?? 0);
  const updateProject = useUpdateTaskProject(workspace?.id ?? 0);
  const deleteTask = useDeleteTask(workspace?.id ?? 0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority | "">("");
  const [projectId, setProjectId] = useState<number | undefined>(undefined);
  const [searchParams] = useSearchParams();
  const initialProject = searchParams.get("project") || "all";
  const [filterProjectId, setFilterProjectId] = useState<string>(initialProject);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveTask(event.active.data.current as Task);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as number;
    const newStatus = over.id as TaskStatus;
    const task = (tasks ?? []).find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    updateStatus.mutate({ taskId, status: newStatus });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await createTask.mutateAsync({
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      projectId,
    });
    setTitle("");
    setDescription("");
    setPriority("");
  }

  function handleProjectChange(taskId: number, projectId: number | null) {
    updateProject.mutate({ taskId, projectId });
  }

  function handleEditSave(data: {
    taskId: number;
    title: string;
    description?: string;
    priority: string;
    projectId: number | null;
  }) {
    updateTask.mutate(data, {
      onSuccess: () => setEditingTask(null),
    });
  }

  const filteredTasks = (tasks ?? []).filter((t) => {
    if (filterProjectId === "all") return true;
    if (filterProjectId === "none") return !t.projectId;
    return t.projectId === Number(filterProjectId);
  });

  const projectList = (projects ?? []).map((p) => ({ id: p.id, name: p.name }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[hsl(var(--foreground))]">
          {tc.title}
        </h1>
        <select
          value={filterProjectId}
          onChange={(e) => setFilterProjectId(e.target.value)}
          className="rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-1.5 text-sm text-[hsl(var(--foreground))] focus:border-magenta focus:outline-none focus:ring-2 focus:ring-magenta/20"
        >
          <option value="all">Filtrar por proyecto</option>
          <option value="none">Tareas sin proyecto</option>
          {(projects ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <form
        onSubmit={handleCreate}
        className="flex flex-col gap-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 md:flex-row md:items-center"
      >
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Nombre de la tarea"
          required
          className="w-full md:w-48 rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:border-magenta focus:outline-none focus:ring-2 focus:ring-magenta/20"
        />
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descripción (opcional)"
          className="w-full md:flex-1 rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:border-magenta focus:outline-none focus:ring-2 focus:ring-magenta/20"
        />
        {/* Proyecto + Prioridad: grid en móvil, inline en desktop */}
        <div className="grid grid-cols-2 gap-2 w-full md:contents">
          <select
            value={projectId ?? ""}
            onChange={(e) =>
              setProjectId(e.target.value ? Number(e.target.value) : undefined)
            }
            className="w-full md:w-auto rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] focus:border-magenta focus:outline-none focus:ring-2 focus:ring-magenta/20"
          >
            <option value="" disabled hidden>Asignar a proyecto</option>
            {(projects ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
            className="w-full md:w-auto rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] focus:border-magenta focus:outline-none focus:ring-2 focus:ring-magenta/20"
          >
            <option value="" disabled hidden>Prioridad</option>
            <option value="low">Baja</option>
            <option value="medium">Media</option>
            <option value="high">Alta</option>
            <option value="urgent">Urgente</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={createTask.isPending}
          className="w-full md:w-auto rounded-md bg-magenta px-5 py-2 text-sm font-medium text-white hover:bg-magenta/90 transition-colors disabled:opacity-50"
        >
          {tc.create}
        </button>
      </form>

      {isLoading ? (
        <KanbanSkeleton />
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {columns.map((col) => (
              <Column
                key={col.key}
                columnKey={col.key}
                label={col.label}
                color={col.color}
                tasks={filteredTasks.filter((t) => t.status === col.key)}
                projects={projectList}
                onProjectChange={handleProjectChange}
                onEdit={setEditingTask}
              />
            ))}
          </div>
          <DragOverlay>
            {activeTask ? <TaskCardOverlay task={activeTask} /> : null}
          </DragOverlay>
        </DndContext>
      )}

      {editingTask && (
        <TaskEditModal
          task={editingTask}
          projects={projectList}
          onSave={handleEditSave}
          onDelete={(taskId) => {
            deleteTask.mutate(taskId, {
              onSuccess: () => setEditingTask(null),
            });
          }}
          isDeleting={deleteTask.isPending}
          onClose={() => setEditingTask(null)}
          isSaving={updateTask.isPending}
        />
      )}
    </div>
  );
}
