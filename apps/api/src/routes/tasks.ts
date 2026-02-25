import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq, and } from "drizzle-orm";
import { tasks as tasksTable } from "@godinez/db";
import type { AuthEnv } from "../types";
import { requireAuth } from "../middleware/auth";
import { resolveUser } from "../middleware/resolve-user";
import {
  requireWorkspaceMember,
  requireRole,
} from "../middleware/require-workspace";
import {
  createTask,
  getTaskById,
  getTasksByProjectId,
  updateTask,
  deleteTask,
} from "../dal/tasks";
import {
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
} from "../validators";
import { db } from "../db";

const app = new Hono<AuthEnv>();

app.use("*", requireAuth, resolveUser);

// POST /api/tasks — Create task
app.post("/", zValidator("json", createTaskSchema), async (c) => {
  const userId = c.get("userId");
  const data = c.req.valid("json");
  const task = await createTask({ ...data, createdByUserId: userId });
  return c.json(task, 201);
});

// GET /api/tasks/:id — Get task detail
app.get("/:id", async (c) => {
  const id = parseInt(c.req.param("id"));
  const task = await getTaskById(id);
  if (!task) return c.json({ error: "Task not found" }, 404);
  return c.json(task);
});

// PUT /api/tasks/:id — Update task
app.put("/:id", zValidator("json", updateTaskSchema), async (c) => {
  const id = parseInt(c.req.param("id"));
  const data = c.req.valid("json");

  const updateData: Record<string, unknown> = { ...data };
  if (data.dueAt) updateData.dueAt = new Date(data.dueAt);

  const task = await updateTask(id, updateData);
  if (!task) return c.json({ error: "Task not found" }, 404);
  return c.json(task);
});

// PUT /api/tasks/:id/status — Update status only
app.put(
  "/:id/status",
  zValidator("json", updateTaskStatusSchema),
  async (c) => {
    const id = parseInt(c.req.param("id"));
    const { status } = c.req.valid("json");

    const existing = await getTaskById(id);
    if (!existing) return c.json({ error: "Task not found" }, 404);

    const updateData: Record<string, unknown> = { status };

    // Auto-set completedAt
    if (status === "completed" && existing.status !== "completed") {
      updateData.completedAt = new Date();
    } else if (status !== "completed" && existing.status === "completed") {
      updateData.completedAt = null;
    }

    const task = await updateTask(id, updateData);
    return c.json(task);
  },
);

// DELETE /api/tasks/:id — Delete task
app.delete("/:id", async (c) => {
  const id = parseInt(c.req.param("id"));
  const task = await getTaskById(id);
  if (!task) return c.json({ error: "Task not found" }, 404);
  await deleteTask(id);
  return c.json({ deleted: true });
});

export default app;

// Workspace-scoped task list
export const workspaceTasks = new Hono<AuthEnv>();

workspaceTasks.use("*", requireAuth, resolveUser);

// GET /api/workspaces/:id/tasks — List workspace tasks with filters
workspaceTasks.get("/:id/tasks", requireWorkspaceMember, async (c) => {
  const workspaceId = parseInt(c.req.param("id"));
  const status = c.req.query("status");
  const priority = c.req.query("priority");

  const conditions = [eq(tasksTable.workspaceId, workspaceId)];
  if (status) conditions.push(eq(tasksTable.status, status));
  if (priority) conditions.push(eq(tasksTable.priority, priority));

  const tasks = await db.query.tasks.findMany({
    where: and(...conditions),
    orderBy: tasksTable.createdAt,
  });
  return c.json(tasks);
});

// Project-scoped task list
export const projectTasks = new Hono<AuthEnv>();

projectTasks.use("*", requireAuth, resolveUser);

// GET /api/projects/:id/tasks — List project tasks
projectTasks.get("/:id/tasks", async (c) => {
  const projectId = parseInt(c.req.param("id"));
  const tasks = await getTasksByProjectId(projectId);
  return c.json(tasks);
});
