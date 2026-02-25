import { Hono } from "hono";
import { eq, and, count } from "drizzle-orm";
import { projects, tasks, messages, agents, workspaces } from "@godinez/db";
import type { AuthEnv } from "../types";
import { requireAuth } from "../middleware/auth";
import { resolveUser } from "../middleware/resolve-user";
import { requireWorkspaceMember } from "../middleware/require-workspace";
import { db } from "../db";

const app = new Hono<AuthEnv>();

app.use("*", requireAuth, resolveUser);

// GET /workspaces/:id/dashboard — Workspace stats
app.get("/:id/dashboard", requireWorkspaceMember, async (c) => {
  const workspaceId = parseInt(c.req.param("id"));

  const [activeProjects] = await db
    .select({ count: count() })
    .from(projects)
    .where(
      and(
        eq(projects.workspaceId, workspaceId),
        eq(projects.status, "active"),
      ),
    );

  const [pendingTasks] = await db
    .select({ count: count() })
    .from(tasks)
    .where(
      and(
        eq(tasks.workspaceId, workspaceId),
        eq(tasks.status, "pending"),
      ),
    );

  const [totalMessages] = await db
    .select({ count: count() })
    .from(messages)
    .where(eq(messages.workspaceId, workspaceId));

  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, workspaceId),
  });

  let agent = null;
  if (workspace?.agentId) {
    const found = await db.query.agents.findFirst({
      where: eq(agents.id, workspace.agentId),
    });
    if (found) {
      agent = {
        name: found.name,
        template: found.template,
        status: found.status,
      };
    }
  }

  return c.json({
    activeProjects: activeProjects.count,
    pendingTasks: pendingTasks.count,
    totalMessages: totalMessages.count,
    agent,
  });
});

export default app;
