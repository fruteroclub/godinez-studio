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
  getUsageByWorkspace,
} from "../dal/admin";
import {
  getAllInstances,
  getInstanceWithWorkspaces,
  createInstance,
  updateInstance,
  deleteInstance,
} from "../dal/instances";
import {
  listReferralCodes,
  createReferralCode,
} from "../dal/referral-codes";

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

const usageSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.coerce.number().int().positive().optional(),
  period: z.enum(["7d", "30d", "90d"]).default("30d"),
});

app.get("/usage", async (c) => {
  const params = usageSchema.parse(c.req.query());
  const result = await getUsageByWorkspace(params);
  return c.json(result);
});

// --- Instance registry ---

const createInstanceSchema = z.object({
  name: z.string().min(1).max(50),
  url: z.string().url(),
  token: z.string().min(1),
  tier: z.enum(["shared", "dedicated"]).default("shared"),
  maxSlots: z.number().int().min(1).default(15),
  workspaceBase: z.string().min(1).default("/home/openclaw/.openclaw/workspaces"),
  region: z.string().max(20).optional(),
  customerId: z.number().int().positive().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const updateInstanceSchema = createInstanceSchema
  .omit({ token: true })
  .partial()
  .extend({
    token: z.string().min(1).optional(),
    status: z
      .enum(["active", "offline", "draining", "decommissioned"])
      .optional(),
  });

app.get("/instances", async (c) => {
  const instances = await getAllInstances();
  return c.json(instances);
});

app.post("/instances", async (c) => {
  const body = createInstanceSchema.parse(await c.req.json());
  const instance = await createInstance(body);
  return c.json(instance, 201);
});

app.put("/instances/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = updateInstanceSchema.parse(await c.req.json());
  const instance = await updateInstance(id, body);
  if (!instance) return c.json({ error: "Instance not found" }, 404);
  return c.json(instance);
});

app.delete("/instances/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const result = await deleteInstance(id);
  if (result.error === "not_found") {
    return c.json({ error: "Instance not found" }, 404);
  }
  if (result.error === "must_be_decommissioned") {
    return c.json(
      { error: "Instance must be decommissioned before deletion" },
      409,
    );
  }
  if (result.error === "has_assigned_workspaces") {
    return c.json(
      { error: "Instance still has assigned workspaces" },
      409,
    );
  }
  return c.json({ ok: true });
});

app.get("/instances/:id/health", async (c) => {
  const id = Number(c.req.param("id"));
  const data = await getInstanceWithWorkspaces(id);
  if (!data) return c.json({ error: "Instance not found" }, 404);

  let gatewayReachable = false;
  try {
    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(data.url);
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error("timeout"));
      }, 5000);
      ws.addEventListener("open", () => {
        clearTimeout(timeout);
        ws.close();
        resolve();
      });
      ws.addEventListener("error", () => {
        clearTimeout(timeout);
        reject(new Error("ws error"));
      });
    });
    gatewayReachable = true;
  } catch {
    // gateway unreachable — still return DB data
  }

  return c.json({ ...data, gatewayReachable });
});

// --- Referral codes (waitlist pipeline) ---

app.get("/referral-codes", async (c) => {
  const codes = await listReferralCodes();
  return c.json(codes);
});

app.post(
  "/referral-codes",
  async (c) => {
    const body = z
      .object({
        email: z.string().email(),
        name: z.string().optional(),
        source: z.string().max(100).optional(),
      })
      .parse(await c.req.json());
    const code = await createReferralCode(body);
    return c.json(code, 201);
  },
);

export default app;
