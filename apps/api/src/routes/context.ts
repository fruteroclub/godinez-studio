/**
 * Onboarding V3: Context update endpoint
 * 
 * Allows users to change their project type/subtype after onboarding.
 * Regenerates SOUL.md with new context and updates workspace name.
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { AuthEnv } from "../types";
import { requireAuth } from "../middleware/auth";
import { resolveUser } from "../middleware/resolve-user";
import { updateUser, getUserById } from "../dal/users";
import { getWorkspacesByUserId, getWorkspaceBySlug, getMemberRole, updateWorkspace } from "../dal/workspaces";
import { pool } from "../services/gateway-pool";
import { buildSoulMd } from "../services/agent-soul-template";
import { logger } from "../lib/logger";

const log = logger.child({ service: "context" });

const app = new Hono<AuthEnv>();

app.use("*", requireAuth, resolveUser);

// Project type and subtype enums (same as provision.ts)
const PROJECT_TYPES = ["educacion", "profesional", "personal"] as const;
const PROJECT_SUBTYPES_BY_TYPE = {
  educacion: ["bootcamp", "aprender"],
  personal: ["hackathon", "emprendimiento", "proyecto"],
  profesional: ["crear_contenido", "automatizar", "construir", "investigar", "vender", "organizar"],
} as const;

const PROJECT_SUBTYPES = [
  "bootcamp", "aprender",
  "hackathon", "emprendimiento", "proyecto",
  "crear_contenido", "automatizar", "construir",
  "investigar", "vender", "organizar",
] as const;

const TYPE_LABELS: Record<string, string> = {
  educacion: "Educación",
  profesional: "Profesional",
  personal: "Personal",
};

// GET /api/context — Get current user context
app.get("/", async (c) => {
  const userId = c.get("userId");
  const user = await getUserById(userId);
  
  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }
  
  return c.json({
    projectType: user.projectType || null,
    jobRole: user.jobRole || null,
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
    }).refine(
      (data) => {
        const validSubtypes = PROJECT_SUBTYPES_BY_TYPE[data.projectType] as readonly string[];
        return validSubtypes.includes(data.projectSubtype);
      },
      { message: "Invalid projectSubtype for the given projectType" }
    ),
  ),
  async (c) => {
    const userId = c.get("userId");
    const { projectType, projectSubtype } = c.req.valid("json");

    // 1. Update user record
    await updateUser(userId, { projectType, projectSubtype });
    log.info({ userId, projectType, projectSubtype }, "user context updated");

    // 2. Get user and workspace (verify ownership)
    const user = await getUserById(userId);
    const workspaces = await getWorkspacesByUserId(userId);
    const workspace = workspaces[0];

    if (!user || !workspace) {
      return c.json({ ok: true, regenerated: false });
    }

    const role = await getMemberRole(workspace.id, userId);
    if (!role || !["owner", "admin"].includes(role)) {
      return c.json({ error: "Forbidden" }, 403);
    }

    // 3. Update workspace name to reflect new type
    const firstName = user.name?.split(" ")[0] || "Usuario";
    const newName = `${firstName} - ${TYPE_LABELS[projectType] || projectType}`;
    let newSlug = newName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    // Ensure slug uniqueness
    const existing = await getWorkspaceBySlug(newSlug);
    if (existing && existing.id !== workspace.id) {
      newSlug = `${newSlug}-${workspace.id}`;
    }

    await updateWorkspace(workspace.id, { name: newName, slug: newSlug });
    log.info({ workspaceId: workspace.id, newName }, "workspace name updated");

    // 4. Regenerate SOUL.md if agent exists
    if (!workspace.agentSlot || !workspace.instanceId) {
      return c.json({ ok: true, regenerated: false, workspaceName: newName });
    }

    try {
      const relay = await pool.getRelayForWorkspace(workspace.instanceId);
      
      const newSoul = buildSoulMd({
        workspaceName: newName,
        agentName: newName + " Agent",
        agentSlot: workspace.agentSlot,
        userName: user.name || undefined,
        userRole: user.jobRole || undefined,
        businessDescription: user.businessDescription || undefined,
        projectType,
        projectSubtype,
      });
      
      await relay.agentsFilesSet(workspace.agentSlot, "SOUL.md", newSoul);
      
      log.info({ userId, projectType, projectSubtype }, "SOUL.md regenerated");
      return c.json({ ok: true, regenerated: true, workspaceName: newName });
    } catch (err) {
      // Non-fatal: context was saved, but SOUL.md couldn't be updated
      const msg = err instanceof Error ? err.message : "SOUL.md regeneration failed";
      log.warn({ userId, err: msg }, "context updated but SOUL.md regeneration failed");
      return c.json({ ok: true, regenerated: false, workspaceName: newName, warning: msg });
    }
  },
);


// PATCH /api/context/role — Update user role only
app.patch(
  "/role",
  zValidator(
    "json",
    z.object({
      jobRole: z.string().max(50),
    }),
  ),
  async (c) => {
    const userId = c.get("userId");
    const { jobRole } = c.req.valid("json");

    await updateUser(userId, { jobRole });
    log.info({ userId, jobRole }, "user role updated");

    return c.json({ ok: true });
  },
);
export default app;
