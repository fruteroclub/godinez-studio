import { Hono } from "hono";
import { z } from "zod";
import type { AuthEnv } from "../types";
import { requireAuth } from "../middleware/auth";
import { resolveUser } from "../middleware/resolve-user";
import { requireAdmin } from "../middleware/require-admin";
import {
  getOverviewStats,
  getWorkspacesList,
  getAgentsList,
  getGrowthTimeSeries,
} from "../dal/admin";

const app = new Hono<AuthEnv>();

app.use("*", requireAuth, resolveUser, requireAdmin);

const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.coerce.number().int().positive().optional(),
});

const growthSchema = z.object({
  period: z.enum(["7d", "30d", "90d"]).default("7d"),
});

app.get("/overview", async (c) => {
  const stats = await getOverviewStats();
  return c.json(stats);
});

app.get("/workspaces", async (c) => {
  const { limit, cursor } = paginationSchema.parse(c.req.query());
  const result = await getWorkspacesList({ limit, cursor });
  return c.json(result);
});

app.get("/agents", async (c) => {
  const { limit, cursor } = paginationSchema.parse(c.req.query());
  const result = await getAgentsList({ limit, cursor });
  return c.json(result);
});

app.get("/growth", async (c) => {
  const { period } = growthSchema.parse(c.req.query());
  const result = await getGrowthTimeSeries({ period });
  return c.json(result);
});

export default app;
