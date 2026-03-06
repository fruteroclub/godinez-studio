import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { AuthEnv } from "../types";
import { requireAuth } from "../middleware/auth";
import { resolveUser } from "../middleware/resolve-user";
import {
  getWorkspaceById,
  getMemberRole,
  linkAgentToWorkspace,
} from "../dal/workspaces";
import { createAgent } from "../dal/agents";
import { createConversation } from "../dal/conversations";
import { updateUser } from "../dal/users";
import { incrementUsedSlots } from "../dal/instances";
import { pool } from "../services/gateway-pool";
import { buildSoulMd } from "../services/agent-soul-template";
import { AGENT_MAX_SLOTS } from "../lib/config";

const app = new Hono<AuthEnv>();

app.use("*", requireAuth, resolveUser);

// POST /api/agents/provision — Provision an OpenClaw agent for a workspace
app.post(
  "/provision",
  zValidator(
    "json",
    z.object({
      workspaceId: z.number(),
      userName: z.string().optional(),
      agentName: z.string().min(1).max(50).optional(),
      personality: z
        .enum(["professional", "friendly", "creative", "technical"])
        .optional(),
      needs: z.array(z.string()).optional(),
      userRole: z.string().max(50).optional(),
      businessDescription: z.string().max(255).optional(),
    }),
  ),
  async (c) => {
    const userId = c.get("userId");
    const { workspaceId, userName, agentName, personality, needs, userRole, businessDescription } =
      c.req.valid("json");

    // 1. Verify workspace exists
    const workspace = await getWorkspaceById(workspaceId);
    if (!workspace) {
      return c.json({ error: "Workspace not found" }, 404);
    }

    // 2. Verify user owns/admins the workspace
    const role = await getMemberRole(workspaceId, userId);
    if (!role || !["owner", "admin"].includes(role)) {
      return c.json({ error: "Forbidden" }, 403);
    }

    // 3. Verify workspace has no agent yet
    if (workspace.agentSlot) {
      return c.json({ error: "Workspace already has an agent" }, 409);
    }

    // 4. Pick an instance from the pool
    const tier = workspace.tier === "pro" ? "dedicated" as const : "shared" as const;
    const instance = await pool.pickInstance(tier);
    if (!instance) {
      return c.json(
        { error: "CAPACITY_FULL", message: "No hay instancias disponibles. Intenta más tarde." },
        503,
      );
    }

    // 5. Connect to the instance
    let relay;
    try {
      relay = await pool.getRelay(instance.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gateway connection failed";
      console.error("[Provision] Gateway connection failed:", msg);
      return c.json(
        { error: "GATEWAY_OFFLINE", message: "El servicio de agentes no está disponible." },
        503,
      );
    }

    // 6. Find available slot
    let agents;
    try {
      console.log("[Provision] Listing agents on instance", instance.name);
      agents = await relay.agentsList();
      console.log("[Provision] Agents:", JSON.stringify(agents.agents.map((a) => a.name)));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "agents.list failed";
      console.error("[Provision] agents.list failed:", msg);
      return c.json({ error: "GATEWAY_ERROR", message: msg }, 502);
    }

    const usedSlots = new Set(
      agents.agents.map((a) => a.name).filter(Boolean),
    );

    let slotNumber: number | null = null;
    for (let i = 1; i <= AGENT_MAX_SLOTS; i++) {
      if (!usedSlots.has(`godin-slot-${i}`)) {
        slotNumber = i;
        break;
      }
    }

    if (slotNumber === null) {
      return c.json(
        { error: "CAPACITY_FULL", message: "Todos los slots están ocupados. Intenta más tarde." },
        503,
      );
    }

    // 7. Create agent on OpenClaw
    const slotName = `godin-slot-${slotNumber}`;
    console.log("[Provision] Creating agent:", slotName, "on instance", instance.name);
    let agentResult;
    try {
      agentResult = await relay.agentsCreate({
        name: slotName,
        workspace: `${instance.workspaceBase}/${slotName}`,
      });
      console.log("[Provision] Agent created:", agentResult.agentId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "agents.create failed";
      console.error("[Provision] agents.create failed:", msg);
      return c.json({ error: "PROVISION_FAILED", message: msg }, 502);
    }

    // 8. Inject platform-aware SOUL.md into agent workspace
    const resolvedAgentName = agentName || `${workspace.name} Agent`;
    try {
      const soulMd = buildSoulMd({
        workspaceName: workspace.name,
        agentName: resolvedAgentName,
        agentSlot: slotName,
        userName,
        userRole,
        businessDescription,
        personality,
        needs,
      });
      await relay.agentsFilesSet(agentResult.agentId, "SOUL.md", soulMd);
      console.log("[Provision] SOUL.md injected for", slotName);
    } catch (err) {
      // Non-fatal — agent still works, just without platform instructions
      const msg = err instanceof Error ? err.message : "agents.files.set failed";
      console.warn("[Provision] SOUL.md injection failed (non-fatal):", msg);
    }

    // 9. Insert DB agent
    console.log("[Provision] Inserting DB agent...");
    const slug = `${workspace.slug}-agent`;
    const agentConfig: Record<string, unknown> = {};
    if (userName) agentConfig.userName = userName;
    if (userRole) agentConfig.userRole = userRole;
    if (businessDescription) agentConfig.businessDescription = businessDescription;
    if (personality) agentConfig.personality = personality;
    if (needs?.length) agentConfig.needs = needs;

    // Persist role + business on user record (source of truth for analytics)
    if (userRole || businessDescription) {
      await updateUser(userId, {
        ...(userRole && { jobRole: userRole }),
        ...(businessDescription && { businessDescription }),
      });
    }

    const dbAgent = await createAgent({
      name: resolvedAgentName,
      slug,
      template: "custom",
      status: "active",
      openclawId: agentResult.agentId,
      ...(Object.keys(agentConfig).length > 0 && { config: agentConfig }),
    });

    // 10. Link agent to workspace with instance binding
    await linkAgentToWorkspace(workspaceId, {
      agentId: dbAgent.id,
      agentSlot: agentResult.agentId,
      instanceId: instance.id,
    });

    // 11. Increment used_slots on the instance
    await incrementUsedSlots(instance.id);

    // 12. Create onboarding conversation
    const conversation = await createConversation({
      workspaceId,
      agentId: dbAgent.id,
      title: "Onboarding",
    });

    return c.json({
      agent: {
        id: dbAgent.id,
        openclawId: dbAgent.openclawId,
        name: dbAgent.name,
      },
      conversationId: conversation.id,
    });
  },
);

export default app;
