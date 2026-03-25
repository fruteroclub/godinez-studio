/**
 * Onboarding V3: Context update endpoint
 * 
 * Allows users to change their project type/subtype after onboarding.
 * Regenerates SOUL.md with new context.
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { AuthEnv } from "../types";
import { requireAuth } from "../middleware/auth";
import { resolveUser } from "../middleware/resolve-user";
import { updateUser, getUserById } from "../dal/users";
import { getWorkspacesByUserId } from "../dal/workspaces";
import { pool } from "../services/gateway-pool";
import { buildSoulMd } from "../services/agent-soul-template";
import { logger } from "../lib/logger";

const log = logger.child({ service: "context" });

const app = new Hono<AuthEnv>();

app.use("*", requireAuth, resolveUser);

// Project type and subtype enums (same as provision.ts)
const PROJECT_TYPES = ["educacion", "profesional", "personal"] as const;
const PROJECT_SUBTYPES = [
  "bootcamp", "aprender",
  "hackathon", "emprendimiento", "proyecto",
  "crear_contenido", "automatizar", "construir",
  "investigar", "vender", "organizar",
] as const;

// GET /api/context — Get current user context
app.get("/", async (c) => {
  const userId = c.get("userId");
  const user = await getUserById(userId);
  
  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }
  
  return c.json({
    projectType: user.projectType || null,
    projectSubtype: user.projectSubtype || null,
  });
});

// PATCH /api/context — Update user's project context
app.patch(
  "/",
  zValidator(
    "json",
    z.object({
      projectType: z.enum(PROJECT_TYPES),
      projectSubtype: z.enum(PROJECT_SUBTYPES),
    }),
  ),
  async (c) => {
    const userId = c.get("userId");
    const { projectType, projectSubtype } = c.req.valid("json");

    // 1. Update user record
    await updateUser(userId, { projectType, projectSubtype });
    log.info({ userId, projectType, projectSubtype }, "user context updated");

    // 2. Get user's workspace and agent to regenerate SOUL.md
    const workspaces = await getWorkspacesByUserId(userId);
    const workspace = workspaces[0];
    
    if (!workspace?.agentSlot || !workspace.instanceId) {
      // User doesn't have an agent yet, just save the context
      return c.json({ ok: true, regenerated: false });
    }

    // 3. Get full user data for SOUL.md generation
    const user = await getUserById(userId);
    if (!user) {
      return c.json({ ok: true, regenerated: false });
    }

    // 4. Regenerate SOUL.md with new context
    try {
      const relay = await pool.getRelayForWorkspace(workspace.instanceId);
      
      const newSoul = buildSoulMd({
        workspaceName: workspace.name,
        agentName: workspace.name + " Agent",
        agentSlot: workspace.agentSlot,
        userName: user.name || undefined,
        userRole: user.jobRole || undefined,
        businessDescription: user.businessDescription || undefined,
        projectType,
        projectSubtype,
      });
      
      await relay.agentsFilesSet(workspace.agentSlot, "SOUL.md", newSoul);
      
      log.info({ userId, projectType, projectSubtype }, "SOUL.md regenerated");
      return c.json({ ok: true, regenerated: true });
    } catch (err) {
      // Non-fatal: context was saved, but SOUL.md couldn't be updated
      const msg = err instanceof Error ? err.message : "SOUL.md regeneration failed";
      log.warn({ userId, err: msg }, "context updated but SOUL.md regeneration failed");
      return c.json({ ok: true, regenerated: false, warning: msg });
    }
  },
);

export default app;
