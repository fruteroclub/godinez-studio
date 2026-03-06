import { Hono } from "hono";
import { eq, and, count } from "drizzle-orm";
import { projects, tasks, messages, agents, workspaces } from "@godinez/db";
import { getTierLimits } from "@godinez/types";
import type { AuthEnv } from "../types";
import { requireAuth } from "../middleware/auth";
import { resolveUser } from "../middleware/resolve-user";
import { requireWorkspaceMember } from "../middleware/require-workspace";
import { getWorkspaceUsage } from "../dal/quotas";
import { db } from "../db";

const app = new Hono<AuthEnv>();

app.use("*", requireAuth, resolveUser);

// GET /workspaces/:id/dashboard — Workspace stats
app.get("/:id/dashboard", requireWorkspaceMember, async (c) => {
  const workspaceId = parseInt(c.req.param("id"));

  const [[activeProjects], [pendingTasks], [totalMessages], workspace] =
    await Promise.all([
      db.select({ count: count() }).from(projects)
        .where(and(eq(projects.workspaceId, workspaceId), eq(projects.status, "active"))),
      db.select({ count: count() }).from(tasks)
        .where(and(eq(tasks.workspaceId, workspaceId), eq(tasks.status, "pending"))),
      db.select({ count: count() }).from(messages)
        .where(eq(messages.workspaceId, workspaceId)),
      db.query.workspaces.findFirst({ where: eq(workspaces.id, workspaceId) }),
    ]);

  let agent = null;
  if (workspace?.agentId) {
    const found = await db.query.agents.findFirst({
      where: eq(agents.id, workspace.agentId),
    });
    if (found) {
      agent = { name: found.name, template: found.template, status: found.status };
    }
  }

  return c.json({
    activeProjects: activeProjects.count,
    pendingTasks: pendingTasks.count,
    totalMessages: totalMessages.count,
    agent,
  });
});

// GET /workspaces/:id/usage — Workspace quota usage
app.get("/:id/usage", requireWorkspaceMember, async (c) => {
  const workspaceId = parseInt(c.req.param("id"));
  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, workspaceId),
  });
  if (!workspace) return c.json({ error: "Workspace not found" }, 404);

  const usage = await getWorkspaceUsage(workspaceId);
  const limits = getTierLimits(workspace.tier);

  return c.json({
    tier: workspace.tier,
    tokens: { used: usage.tokensUsedThisMonth, limit: limits.monthlyTokens },
    storage: { used: usage.storageBytesUsed, limit: limits.storageBytes },
    members: { used: usage.memberCount, limit: limits.maxMembers },
  });
});

export default app;
