import { useState } from "react";
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
import { useWorkspace } from "@/providers/WorkspaceProvider";
import {
  useTasks,
  useCreateTask,
  useUpdateTaskStatus,
} from "@/hooks/use-tasks";
import { content } from "@/lib/content";
import { KanbanSkeleton } from "@/components/ui/Skeleton";

const { tasks: tc } = content.studio;

interface Task {
  id: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  createdAt: string;
  completedAt: string | null;
}

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

function Column({
  columnKey,
  label,
  color,
  tasks,
}: {
  columnKey: string;
  label: string;
  color: string;
  tasks: Task[];
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
          tasks.map((task) => <TaskCard key={task.id} task={task} />)
        )}
      </div>
    </div>
  );
}

function TaskCard({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: task,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-3 text-left transition-colors hover:border-magenta/30 ${
        isDragging ? "opacity-30" : "cursor-grab active:cursor-grabbing"
      }`}
    >
      <p className="text-sm font-medium text-[hsl(var(--foreground))]">
        {task.title}
      </p>
      {task.description && (
        <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))] line-clamp-2">
          {task.description}
        </p>
      )}
      <div className="mt-2 flex items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${priorityColors[task.priority] ?? priorityColors.medium}`}
        >
          {task.priority}
        </span>
        <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
          {tc.dragHint}
        </span>
      </div>
    </div>
  );
}

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

export default function Tasks() {
  const { workspace } = useWorkspace();
  const { data: tasks, isLoading } = useTasks(workspace?.id);
  const createTask = useCreateTask(workspace?.id ?? 0);
  const updateStatus = useUpdateTaskStatus(workspace?.id ?? 0);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("medium");
  const [activeTask, setActiveTask] = useState<Task | null>(null);

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
    const newStatus = over.id as string;
    const task = (tasks ?? []).find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    updateStatus.mutate({ taskId, status: newStatus });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await createTask.mutateAsync({ title: title.trim(), priority });
    setTitle("");
    setPriority("medium");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-[hsl(var(--foreground))]">
        {tc.title}
      </h1>

      <form
        onSubmit={handleCreate}
        className="flex flex-wrap gap-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4"
      >
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Nombre de la tarea"
          required
          className="min-w-[200px] flex-1 rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:border-magenta focus:outline-none focus:ring-2 focus:ring-magenta/20"
        />
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] focus:border-magenta focus:outline-none focus:ring-2 focus:ring-magenta/20"
        >
          <option value="low">Baja</option>
          <option value="medium">Media</option>
          <option value="high">Alta</option>
          <option value="urgent">Urgente</option>
        </select>
        <button
          type="submit"
          disabled={createTask.isPending}
          className="rounded-md bg-magenta px-4 py-2 text-sm font-medium text-white hover:bg-magenta/90 transition-colors disabled:opacity-50"
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
                tasks={(tasks ?? []).filter((t) => t.status === col.key)}
              />
            ))}
          </div>
          <DragOverlay>
            {activeTask ? <TaskCardOverlay task={activeTask} /> : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
