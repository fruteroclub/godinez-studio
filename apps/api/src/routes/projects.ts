import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq, and, count } from "drizzle-orm";
import { tasks, conversations, files, projects as projectsTable } from "@godinez/db";
import type { AuthEnv } from "../types";
import { requireAuth } from "../middleware/auth";
import { resolveUser } from "../middleware/resolve-user";
import {
  requireWorkspaceMember,
  requireRole,
} from "../middleware/require-workspace";
import {
  createProject,
  getProjectById,
  getProjectsByWorkspaceId,
  updateProject,
  deleteProject,
} from "../dal/projects";
import { createProjectSchema, updateProjectSchema } from "../validators";
import { db } from "../db";
import { syncWorkspaceFile } from "../services/workspace-sync";
import { verifyWorkspaceAccess } from "../middleware/require-resource-access";

const app = new Hono<AuthEnv>();

app.use("*", requireAuth, resolveUser);

// POST /api/projects — Create project
app.post("/", zValidator("json", createProjectSchema), async (c) => {
  const userId = c.get("userId");
  const data = c.req.valid("json");
  if (!(await verifyWorkspaceAccess(userId, data.workspaceId))) {
    return c.json({ error: "Not a workspace member" }, 403);
  }
  const project = await createProject(data);
  syncWorkspaceFile(data.workspaceId);
  return c.json(project, 201);
});

// GET /api/projects/:id — Project detail + stats
app.get("/:id", async (c) => {
  const userId = c.get("userId");
  const id = parseInt(c.req.param("id"));
  const project = await getProjectById(id);
  if (!project) return c.json({ error: "Project not found" }, 404);
  if (!(await verifyWorkspaceAccess(userId, project.workspaceId))) {
    return c.json({ error: "Not a workspace member" }, 403);
  }

  // Get counts
  const [taskCounts] = await db
    .select({ count: count() })
    .from(tasks)
    .where(eq(tasks.projectId, id));

  const [completedTasks] = await db
    .select({ count: count() })
    .from(tasks)
    .where(and(eq(tasks.projectId, id), eq(tasks.status, "completed")));

  const [conversationCount] = await db
    .select({ count: count() })
    .from(conversations)
    .where(eq(conversations.projectId, id));

  const [fileCount] = await db
    .select({ count: count() })
    .from(files)
    .where(eq(files.projectId, id));

  return c.json({
    ...project,
    stats: {
      totalTasks: taskCounts.count,
      completedTasks: completedTasks.count,
      conversations: conversationCount.count,
      files: fileCount.count,
    },
  });
});

// PUT /api/projects/:id — Update project
app.put("/:id", zValidator("json", updateProjectSchema), async (c) => {
  const userId = c.get("userId");
  const id = parseInt(c.req.param("id"));
  const existing = await getProjectById(id);
  if (!existing) return c.json({ error: "Project not found" }, 404);
  if (!(await verifyWorkspaceAccess(userId, existing.workspaceId))) {
    return c.json({ error: "Not a workspace member" }, 403);
  }
  const data = c.req.valid("json");
  const project = await updateProject(id, data);
  if (!project) return c.json({ error: "Project not found" }, 404);
  syncWorkspaceFile(project.workspaceId);
  return c.json(project);
});

// DELETE /api/projects/:id — Delete project (owner/admin only)
app.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const id = parseInt(c.req.param("id"));
  const project = await getProjectById(id);
  if (!project) return c.json({ error: "Project not found" }, 404);
  if (!(await verifyWorkspaceAccess(userId, project.workspaceId))) {
    return c.json({ error: "Not a workspace member" }, 403);
  }
  await deleteProject(id);
  syncWorkspaceFile(project.workspaceId);
  return c.json({ deleted: true });
});

export default app;

// Workspace-scoped project list
export const workspaceProjects = new Hono<AuthEnv>();

workspaceProjects.use("*", requireAuth, resolveUser);

// GET /api/workspaces/:id/projects — List workspace projects
workspaceProjects.get(
  "/:id/projects",
  requireWorkspaceMember,
  async (c) => {
    const workspaceId = parseInt(c.req.param("id"));
    const list = await getProjectsByWorkspaceId(workspaceId);
    return c.json(list);
  },
);
