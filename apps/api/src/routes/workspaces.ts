import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { AuthEnv } from "../types";
import { logger } from "../lib/logger";
import { requireAuth } from "../middleware/auth";
import { resolveUser } from "../middleware/resolve-user";
import {
  requireWorkspaceMember,
  requireRole,
} from "../middleware/require-workspace";
import {
  createWorkspace,
  getWorkspacesByUserId,
  getWorkspaceBySlug,
  getWorkspaceById,
  updateWorkspace,
  deleteWorkspace,
  getMemberRole,
  getWorkspacePreview,
  saveWorkspacePreview,
  getRecentChatMessages,
} from "../dal/workspaces";
import { pool } from "../services/gateway-pool";
import { decrementUsedSlots } from "../dal/instances";
import { ensureUniqueSlug } from "../lib/slug";
import { resolveAccount } from "../middleware/resolve-account";

const app = new Hono<AuthEnv>();

app.use("*", requireAuth, resolveUser);

// POST /workspaces — Create workspace (max 1 per user)
app.post(
  "/",
  resolveAccount,
  zValidator("json", z.object({ name: z.string().min(1).max(255) })),
  async (c) => {
    // Billing gate — block workspace creation without active subscription
    if (process.env.BILLING_ENABLED === "true") {
      const account = c.get("account");
      if (account.subscriptionStatus !== "active") {
        return c.json(
          {
            error: "SUBSCRIPTION_REQUIRED",
            message: "Necesitas una suscripción activa para crear un workspace.",
          },
          402,
        );
      }
    }

    const userId = c.get("userId");
    const existing = await getWorkspacesByUserId(userId);
    if (existing.length >= 1) {
      return c.json({ error: "WORKSPACE_LIMIT", message: "Solo puedes tener un workspace." }, 409);
    }
    const { name } = c.req.valid("json");
    const slug = await ensureUniqueSlug(name);
    const workspace = await createWorkspace({ name, slug, ownerId: userId });
    return c.json(workspace, 201);
  },
);

// GET /workspaces — List user's workspaces
app.get("/", async (c) => {
  const userId = c.get("userId");
  const list = await getWorkspacesByUserId(userId);
  return c.json(list);
});

// GET /workspaces/:slug — Get workspace by slug
app.get("/:slug", async (c) => {
  const userId = c.get("userId");
  const slug = c.req.param("slug");
  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) return c.json({ error: "Workspace not found" }, 404);

  const role = await getMemberRole(workspace.id, userId);
  if (!role) return c.json({ error: "Not a workspace member" }, 403);

  return c.json(workspace);
});

// PUT /workspaces/:id — Update workspace
app.put(
  "/:id",
  requireWorkspaceMember,
  requireRole("owner", "admin"),
  zValidator(
    "json",
    z.object({
      name: z.string().min(1).max(255).optional(),
      tier: z.enum(["beta_tester"]).optional(),
      status: z.enum(["active", "suspended", "provisioning"]).optional(),
    }),
  ),
  async (c) => {
    const id = parseInt(c.req.param("id"));
    const data = c.req.valid("json");
    const workspace = await updateWorkspace(id, data);
    if (!workspace) return c.json({ error: "Workspace not found" }, 404);
    return c.json(workspace);
  },
);

// DELETE /workspaces/:id — Delete workspace + cleanup OpenClaw agent
app.delete(
  "/:id",
  requireWorkspaceMember,
  requireRole("owner"),
  async (c) => {
    const id = parseInt(c.req.param("id"));

    // Look up workspace to find linked agent before deleting
    const workspace = await getWorkspaceById(id);

    // Clean up OpenClaw agent if one is linked
    if (workspace?.agentSlot) {
      try {
        const relay = await pool.getRelayForWorkspace(workspace.instanceId);
        await relay.agentsDelete(workspace.agentSlot, true);
        logger.info({ agentSlot: workspace.agentSlot }, "deleted OpenClaw agent");
        // Decrement used_slots on the instance
        if (workspace.instanceId) {
          await decrementUsedSlots(workspace.instanceId);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "agents.delete failed";
        logger.warn({ err: msg }, "agent cleanup failed (non-fatal)");
      }
    }

    // Cascade-delete all DB rows (conversations, messages, tasks, etc.)
    await deleteWorkspace(id);
    return c.json({ deleted: true });
  },
);

// GET /workspaces/:slug/preview — Get active preview URL for workspace
app.get("/:slug/preview", async (c) => {
  const userId = c.get("userId");
  const slug = c.req.param("slug");
  
  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) return c.json({ error: "Workspace not found" }, 404);

  const role = await getMemberRole(workspace.id, userId);
  if (!role) return c.json({ error: "Not a workspace member" }, 403);

  const preview = await getWorkspacePreview(workspace.id);
  if (!preview) return c.json({ error: "No preview available" }, 404);

  return c.json({ previewUrl: preview.previewUrl, projectName: preview.name });
});

// POST /workspaces/:slug/preview — Save preview URL (auto-detected from chat)
app.post(
  "/:slug/preview",
  zValidator("json", z.object({ previewUrl: z.string().url() })),
  async (c) => {
    const userId = c.get("userId");
    const slug = c.req.param("slug");
    const { previewUrl } = c.req.valid("json");
    
    const workspace = await getWorkspaceBySlug(slug);
    if (!workspace) return c.json({ error: "Workspace not found" }, 404);

    const role = await getMemberRole(workspace.id, userId);
    if (!role) return c.json({ error: "Not a workspace member" }, 403);

    // Update the most recent active project, or create one
    const saved = await saveWorkspacePreview(workspace.id, previewUrl);
    return c.json({ ok: true, project: saved });
  },
);

// GET /workspaces/:slug/chat/recent — Get recent chat messages for tunnel URL extraction
app.get("/:slug/chat/recent", async (c) => {
  const userId = c.get("userId");
  const slug = c.req.param("slug");
  
  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) return c.json({ error: "Workspace not found" }, 404);

  const role = await getMemberRole(workspace.id, userId);
  if (!role) return c.json({ error: "Not a workspace member" }, 403);

  const messages = await getRecentChatMessages(workspace.id, 20);
  return c.json({ messages });
});

export default app;
