import { Hono } from "hono";
import { eq, and, desc, lt } from "drizzle-orm";
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

  const cursor = c.req.query("cursor") ? parseInt(c.req.query("cursor")!) : undefined;

  const conditions = [eq(agentLogs.workspaceId, workspaceId)];
  if (level) conditions.push(eq(agentLogs.level, level));
  if (cursor) conditions.push(lt(agentLogs.id, cursor));

  const items = await db.query.agentLogs.findMany({
    where: and(...conditions),
    orderBy: desc(agentLogs.id),
    limit: limit + 1,
  });

  const hasMore = items.length > limit;
  const page = hasMore ? items.slice(0, limit) : items;

  return c.json({
    items: page,
    nextCursor: hasMore ? page[page.length - 1].id : null,
  });
});

export default app;
