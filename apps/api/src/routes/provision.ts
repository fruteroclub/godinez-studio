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
import type { GatewayRelay } from "../services/gateway-relay";
import { buildSoulMd } from "../services/agent-soul-template";
import { getInstanceTier } from "@godinez/types";
import { AGENT_MAX_SLOTS } from "../lib/config";
import { logger } from "../lib/logger";

const log = logger.child({ service: "provision" });

/**
 * NOTE: projectType/projectSubtype are stored in TWO places:
 * - users table (SOURCE OF TRUTH for analytics)
 * - agents.config (cached copy for agent access)
 * Always update users first, then sync to agents.config.
 */

const app = new Hono<AuthEnv>();

app.use("*", requireAuth, resolveUser);

// Onboarding V3: Project type and subtype enums
const PROJECT_TYPES = ["educacion", "profesional", "personal"] as const;
const PROJECT_SUBTYPES_BY_TYPE = {
  educacion: ["bootcamp", "aprender"],
  personal: ["hackathon", "emprendimiento", "proyecto"],
  profesional: ["crear_contenido", "automatizar", "construir", "investigar", "vender", "organizar"],
} as const;

const PROJECT_SUBTYPES = [
  // educacion
  "bootcamp", "aprender",
  // personal
  "hackathon", "emprendimiento", "proyecto",
  // profesional
  "crear_contenido", "automatizar", "construir",
  "investigar", "vender", "organizar",
] as const;

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
      // Onboarding V3: New fields
      projectType: z.enum(PROJECT_TYPES).optional(),
      projectSubtype: z.enum(PROJECT_SUBTYPES).optional(),
    }).refine(
      (data) => {
        if (!data.projectType && !data.projectSubtype) return true;
        if (!data.projectType || !data.projectSubtype) return false;
        const validSubtypes = PROJECT_SUBTYPES_BY_TYPE[data.projectType] as readonly string[];
        return validSubtypes.includes(data.projectSubtype);
      },
      { message: "Invalid projectSubtype for the given projectType" }
    ),
  ),
  async (c) => {
    const userId = c.get("userId");
    const { 
      workspaceId, userName, agentName, personality, needs, userRole, businessDescription,
      projectType, projectSubtype  // Onboarding V3
    } = c.req.valid("json");

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

    // 4-6. Pick instance, connect, find slot — with fallback across instances
    const instanceTier = getInstanceTier(workspace.tier);
    const excludeIds: number[] = [];
    let instance;
    let relay;
    let slotNumber: number | null = null;
    let agents: Awaited<ReturnType<GatewayRelay["agentsList"]>> | undefined;

    for (let attempt = 0; attempt < 3; attempt++) {
      instance = await pool.pickInstance(instanceTier, workspace.id, excludeIds);
      if (!instance) break;

      try {
        relay = await pool.getRelay(instance.id);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Gateway connection failed";
        log.warn({ instance: instance.name, err: msg, attempt }, "gateway connection failed, trying next");
        excludeIds.push(instance.id);
        continue;
      }

      try {
        log.info({ instance: instance.name }, "listing agents");
        agents = await relay.agentsList();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "agents.list failed";
        log.warn({ instance: instance.name, err: msg, attempt }, "agents.list failed, trying next");
        excludeIds.push(instance.id);
        continue;
      }

      const usedSlots = new Set(
        agents!.agents.map((a) => a.name).filter(Boolean),
      );

      for (let i = 1; i <= AGENT_MAX_SLOTS; i++) {
        if (!usedSlots.has(`godin-slot-${i}`)) {
          slotNumber = i;
          break;
        }
      }

      if (slotNumber === null) {
        log.warn({ instance: instance.name, attempt }, "instance physically full, trying next");
        excludeIds.push(instance.id);
        continue;
      }

      break;
    }

    if (!instance || !relay || slotNumber === null) {
      return c.json(
        { error: "CAPACITY_FULL", message: "No hay instancias disponibles. Intenta más tarde." },
        503,
      );
    }

    // 7. Create agent on OpenClaw
    const slotName = `godin-slot-${slotNumber}`;
    log.info({ slot: slotName, instance: instance.name }, "creating agent");
    let agentResult;
    try {
      agentResult = await relay.agentsCreate({
        name: slotName,
        workspace: `${instance.workspaceBase}/${slotName}`,
      });
      log.info({ agentId: agentResult.agentId }, "agent created");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "agents.create failed";
      log.error({ err: msg }, "agents.create failed");
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
        projectType,      // Onboarding V3
        projectSubtype,   // Onboarding V3
      });
      await relay.agentsFilesSet(agentResult.agentId, "SOUL.md", soulMd);
      log.info({ slot: slotName }, "SOUL.md injected");
    } catch (err) {
      // Non-fatal — agent still works, just without platform instructions
      const msg = err instanceof Error ? err.message : "agents.files.set failed";
      log.warn({ slot: slotName, err: msg }, "SOUL.md injection failed (non-fatal)");
    }

    // 8b. Copy auth-profiles.json from main agent (non-fatal)
    // Required for external channel integrations (Telegram, Discord per-agent).
    // Studio WebSocket chat works without it, but we copy proactively for future-proofing.
    try {
      const authFile = await relay.agentsFilesGet(agents!.mainKey, "agent/auth-profiles.json");
      if (authFile.content) {
        await relay.agentsFilesSet(agentResult.agentId, "agent/auth-profiles.json", authFile.content);
        log.info({ slot: slotName }, "auth-profiles.json copied from main");
      }
    } catch (err) {
      // Non-fatal — Studio chat works via WebSocket without this file
      const msg = err instanceof Error ? err.message : "auth-profiles copy failed";
      log.warn({ slot: slotName, err: msg }, "auth-profiles.json copy failed (non-fatal)");
    }

    // 9-12. DB operations wrapped with ghost agent rollback
    const slug = `${workspace.slug}-agent`;
    const agentConfig: Record<string, unknown> = {};
    if (userName) agentConfig.userName = userName;
    if (userRole) agentConfig.userRole = userRole;
    if (businessDescription) agentConfig.businessDescription = businessDescription;
    if (personality) agentConfig.personality = personality;
    if (needs?.length) agentConfig.needs = needs;
    if (projectType) agentConfig.projectType = projectType;           // Onboarding V3
    if (projectSubtype) agentConfig.projectSubtype = projectSubtype;  // Onboarding V3

    try {
      // Persist user data on user record (source of truth for analytics)
      if (userRole || businessDescription || projectType || projectSubtype) {
        await updateUser(userId, {
          ...(userRole && { jobRole: userRole }),
          ...(businessDescription && { businessDescription }),
          ...(projectType && { projectType }),           // Onboarding V3
          ...(projectSubtype && { projectSubtype }),     // Onboarding V3
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
    } catch (err) {
      // Rollback: delete agent from gateway to prevent ghost agent
      log.error({ err, slot: slotName, agentId: agentResult.agentId }, "DB failed after gateway agent created, rolling back");
      try {
        await relay.agentsDelete(agentResult.agentId);
        log.info({ agentId: agentResult.agentId }, "ghost agent rolled back");
      } catch (rollbackErr) {
        log.error({ rollbackErr, agentId: agentResult.agentId }, "ghost agent rollback failed — manual cleanup needed");
      }
      return c.json(
        { error: "PROVISION_FAILED", message: "Error al registrar el agente. Intenta de nuevo." },
        502,
      );
    }
  },
);

export default app;
