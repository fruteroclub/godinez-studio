import { Hono } from "hono";
import type { AuthEnv } from "../types";
import { requireAuth } from "../middleware/auth";
import { resolveUser } from "../middleware/resolve-user";
import { getAllAgents, getAgentById } from "../dal/agents";

const app = new Hono<AuthEnv>();

app.use("*", requireAuth, resolveUser);

// GET /api/agents — List all available agents
app.get("/", async (c) => {
  const agents = await getAllAgents();
  return c.json(agents);
});

// GET /api/agents/:id — Get agent detail + config
app.get("/:id", async (c) => {
  const id = parseInt(c.req.param("id"));
  const agent = await getAgentById(id);
  if (!agent) return c.json({ error: "Agent not found" }, 404);
  return c.json(agent);
});

export default app;
