import { Hono } from "hono";
import { eq, and, desc } from "drizzle-orm";
import { agentLogs } from "@godinez/db";
import type { AuthEnv } from "../types";
import { requireAuth } from "../middleware/auth";
import { resolveUser } from "../middleware/resolve-user";
import { requireWorkspaceMember } from "../middleware/require-workspace";
import { db } from "../db";

const app = new Hono<AuthEnv>();

app.use("*", requireAuth, resolveUser);

// GET /api/workspaces/:id/activity — Recent agent activity
app.get("/:id/activity", requireWorkspaceMember, async (c) => {
  const workspaceId = parseInt(c.req.param("id"));
  const limit = Math.min(parseInt(c.req.query("limit") || "50"), 200);
  const level = c.req.query("level");

  const conditions = [eq(agentLogs.workspaceId, workspaceId)];
  if (level) conditions.push(eq(agentLogs.level, level));

  const logs = await db.query.agentLogs.findMany({
    where: and(...conditions),
    orderBy: desc(agentLogs.createdAt),
    limit,
  });

  return c.json({ logs });
});

export default app;
