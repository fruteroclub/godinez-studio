import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { AuthEnv } from "../types";
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
  updateWorkspace,
  deleteWorkspace,
  getMemberRole,
} from "../dal/workspaces";
import { ensureUniqueSlug } from "../lib/slug";

const app = new Hono<AuthEnv>();

app.use("*", requireAuth, resolveUser);

// POST /workspaces — Create workspace
app.post(
  "/",
  zValidator("json", z.object({ name: z.string().min(1).max(255) })),
  async (c) => {
    const userId = c.get("userId");
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
      tier: z.enum(["becario", "asistente", "agente"]).optional(),
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

// DELETE /workspaces/:id — Delete workspace
app.delete(
  "/:id",
  requireWorkspaceMember,
  requireRole("owner"),
  async (c) => {
    const id = parseInt(c.req.param("id"));
    await deleteWorkspace(id);
    return c.json({ deleted: true });
  },
);

export default app;
