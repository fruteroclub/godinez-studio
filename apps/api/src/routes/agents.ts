import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { AuthEnv } from "../types";
import { requireAuth } from "../middleware/auth";
import { resolveUser } from "../middleware/resolve-user";
import { getAllAgents, getAgentById, updateAgent } from "../dal/agents";
import { getWorkspaceByAgentId, getMemberRole } from "../dal/workspaces";
import { gateway } from "../services/gateway-relay";
import { buildSoulMd } from "../services/agent-soul-template";

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

// GET /api/agents/:id/files — List workspace files
app.get("/:id/files", async (c) => {
  const id = parseInt(c.req.param("id"));
  const agent = await getAgentById(id);
  if (!agent) return c.json({ error: "Agent not found" }, 404);
  if (!agent.openclawId) return c.json({ error: "Agent not linked to OpenClaw" }, 400);
  if (!gateway.isConnected) return c.json({ error: "Gateway offline" }, 503);

  try {
    const result = await gateway.agentsFilesList(agent.openclawId);
    return c.json({ files: result.files });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to list files";
    return c.json({ error: msg }, 502);
  }
});

// GET /api/agents/:id/files/:name — Read a workspace file
app.get("/:id/files/:name", async (c) => {
  const id = parseInt(c.req.param("id"));
  const name = c.req.param("name");
  const agent = await getAgentById(id);
  if (!agent) return c.json({ error: "Agent not found" }, 404);
  if (!agent.openclawId) return c.json({ error: "Agent not linked to OpenClaw" }, 400);
  if (!gateway.isConnected) return c.json({ error: "Gateway offline" }, 503);

  try {
    const file = await gateway.agentsFilesGet(agent.openclawId, name);
    return c.json({ file });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to read file";
    return c.json({ error: msg }, 502);
  }
});

// PUT /api/agents/:id/files/:name — Write a workspace file
app.put(
  "/:id/files/:name",
  zValidator("json", z.object({ content: z.string() })),
  async (c) => {
    const id = parseInt(c.req.param("id"));
    const name = c.req.param("name");
    const { content } = c.req.valid("json");
    const agent = await getAgentById(id);
    if (!agent) return c.json({ error: "Agent not found" }, 404);
    if (!agent.openclawId) return c.json({ error: "Agent not linked to OpenClaw" }, 400);
    if (!gateway.isConnected) return c.json({ error: "Gateway offline" }, 503);

    try {
      const file = await gateway.agentsFilesSet(agent.openclawId, name, content);
      return c.json({ file });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to write file";
      return c.json({ error: msg }, 502);
    }
  },
);

// PUT /api/agents/:id/config — Update agent config and re-inject SOUL.md
app.put(
  "/:id/config",
  zValidator(
    "json",
    z.object({
      agentName: z.string().min(1).max(50).optional(),
      personality: z
        .enum(["professional", "friendly", "creative", "technical"])
        .optional(),
      needs: z.array(z.string()).optional(),
      customInstructions: z.string().max(500).optional(),
    }),
  ),
  async (c) => {
    const userId = c.get("userId");
    const id = parseInt(c.req.param("id"));
    const body = c.req.valid("json");

    const agent = await getAgentById(id);
    if (!agent) return c.json({ error: "Agent not found" }, 404);
    if (!agent.openclawId)
      return c.json({ error: "Agent not linked to OpenClaw" }, 400);

    // Verify workspace ownership
    const workspace = await getWorkspaceByAgentId(id);
    if (!workspace) return c.json({ error: "No workspace linked" }, 404);

    const role = await getMemberRole(workspace.id, userId);
    if (!role || !["owner", "admin"].includes(role)) {
      return c.json({ error: "Forbidden" }, 403);
    }

    // Merge into config
    const prevConfig = (agent.config as Record<string, unknown>) ?? {};
    const newConfig: Record<string, unknown> = { ...prevConfig };
    if (body.personality !== undefined) newConfig.personality = body.personality;
    if (body.needs !== undefined) newConfig.needs = body.needs;
    if (body.customInstructions !== undefined)
      newConfig.customInstructions = body.customInstructions;

    // Update DB
    const resolvedName = body.agentName ?? agent.name;
    const updated = await updateAgent(id, {
      name: resolvedName,
      config: newConfig,
    });

    // Rebuild and re-inject SOUL.md
    if (!gateway.isConnected) {
      return c.json({ error: "Gateway offline" }, 503);
    }

    const soulMd = buildSoulMd({
      workspaceName: workspace.name,
      agentName: resolvedName,
      agentSlot: agent.openclawId,
      userName: (newConfig.userName as string) ?? undefined,
      personality: (newConfig.personality as string) ?? undefined,
      needs: (newConfig.needs as string[]) ?? undefined,
      customInstructions: (newConfig.customInstructions as string) ?? undefined,
    });

    try {
      await gateway.agentsFilesSet(agent.openclawId, "SOUL.md", soulMd);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to inject SOUL.md";
      console.warn("[AgentConfig] SOUL.md injection failed (non-fatal):", msg);
    }

    return c.json(updated);
  },
);

// POST /api/agents/:id/reinject-soul — Push platform SOUL.md to an existing agent
app.post("/:id/reinject-soul", async (c) => {
  const id = parseInt(c.req.param("id"));
  const agent = await getAgentById(id);
  if (!agent) return c.json({ error: "Agent not found" }, 404);
  if (!agent.openclawId) return c.json({ error: "Agent not linked to OpenClaw" }, 400);
  if (!gateway.isConnected) return c.json({ error: "Gateway offline" }, 503);

  const workspace = await getWorkspaceByAgentId(id);
  const cfg = (agent.config as Record<string, unknown>) ?? {};

  const soulMd = buildSoulMd({
    workspaceName: workspace?.name ?? "Espacio de trabajo",
    agentName: agent.name,
    agentSlot: agent.openclawId,
    userName: (cfg.userName as string) ?? undefined,
    personality: (cfg.personality as string) ?? undefined,
    needs: (cfg.needs as string[]) ?? undefined,
    customInstructions: (cfg.customInstructions as string) ?? undefined,
  });

  try {
    const file = await gateway.agentsFilesSet(agent.openclawId, "SOUL.md", soulMd);
    return c.json({ ok: true, file });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to inject SOUL.md";
    return c.json({ error: msg }, 502);
  }
});

export default app;
