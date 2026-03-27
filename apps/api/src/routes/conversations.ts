import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, desc, lt } from "drizzle-orm";
import { conversations as conversationsTable } from "@godinez/db";
import type { AuthEnv } from "../types";
import { requireAuth } from "../middleware/auth";
import { resolveUser } from "../middleware/resolve-user";
import { requireWorkspaceMember } from "../middleware/require-workspace";
import { db } from "../db";
import {
  createConversation,
  getConversationById,
  getConversationsByWorkspaceId,
  getConversationsByProject,
  updateConversationTitle,
<<<<<<< Updated upstream
  updateConversation,
  deleteConversation,
  getOrCreateHackathonConversation,
  getHackathonConversation,
  deleteHackathonConversation,
=======
  getOrCreateHackathonConversation,
  getHackathonConversation,
>>>>>>> Stashed changes
} from "../dal/conversations";
import { getProjectById } from "../dal/projects";
import { getWorkspaceById } from "../dal/workspaces";
import { verifyWorkspaceAccess } from "../middleware/require-resource-access";
const app = new Hono<AuthEnv>();
app.use("*", requireAuth, resolveUser);
// POST /api/conversations — Create conversation
app.post(
  "/",
  zValidator(
    "json",
    z.object({
      workspaceId: z.number(),
      title: z.string().optional(),
      projectId: z.number().optional(),
      agentId: z.number().optional(),
    }),
  ),
  async (c) => {
    const userId = c.get("userId");
    const data = c.req.valid("json");
    if (!(await verifyWorkspaceAccess(userId, data.workspaceId))) {
      return c.json({ error: "Not a workspace member" }, 403);
    }
    // Resolve agentId: use provided, fall back to workspace default
    let agentId = data.agentId;
    if (!agentId) {
      const workspace = await getWorkspaceById(data.workspaceId);
      agentId = workspace?.agentId ?? undefined;
    }
    if (!agentId) {
      return c.json({ error: "No agent assigned to this workspace" }, 400);
    }
    const conversation = await createConversation({
      workspaceId: data.workspaceId,
      title: data.title ?? "Nueva conversación",
      projectId: data.projectId,
      agentId,
    });
    return c.json(conversation, 201);
  },
);
<<<<<<< Updated upstream
// POST /api/conversations/hackathon — Get or create hackathon conversation (by hackathonId)
=======

// POST /api/conversations/hackathon — Get or create hackathon conversation
>>>>>>> Stashed changes
app.post(
  "/hackathon",
  zValidator(
    "json",
    z.object({
      workspaceId: z.number(),
<<<<<<< Updated upstream
      hackathonId: z.number(),
      hackathonName: z.string(),
    }),
  ),
  async (c) => {
    const userId = c.get("userId");
    const { workspaceId, hackathonId, hackathonName } = c.req.valid("json");
    if (!(await verifyWorkspaceAccess(userId, workspaceId))) {
      return c.json({ error: "Not a workspace member" }, 403);
    }
=======
    }),
  ),
  async (c) => {
    const { workspaceId } = c.req.valid("json");

>>>>>>> Stashed changes
    const workspace = await getWorkspaceById(workspaceId);
    if (!workspace?.agentId) {
      return c.json({ error: "No agent assigned to this workspace" }, 400);
    }
<<<<<<< Updated upstream
    const conversation = await getOrCreateHackathonConversation(
      workspaceId,
      workspace.agentId,
      hackathonId,
      hackathonName,
=======

    const conversation = await getOrCreateHackathonConversation(
      workspaceId,
      workspace.agentId,
>>>>>>> Stashed changes
    );
    return c.json(conversation);
  },
);
<<<<<<< Updated upstream
// DELETE /api/conversations/hackathon/:hackathonId — Delete hackathon conversation
app.delete("/hackathon/:hackathonId", async (c) => {
  const hackathonId = parseInt(c.req.param("hackathonId"));
  const result = await deleteHackathonConversation(hackathonId);
  return c.json(result);
});
=======

>>>>>>> Stashed changes
// GET /api/conversations/:id — Get conversation detail
app.get("/:id", async (c) => {
  const userId = c.get("userId");
  const id = parseInt(c.req.param("id"));
  const conversation = await getConversationById(id);
  if (!conversation) return c.json({ error: "Conversation not found" }, 404);
  if (!(await verifyWorkspaceAccess(userId, conversation.workspaceId))) {
    return c.json({ error: "Not a workspace member" }, 403);
  }
  return c.json(conversation);
});
// PATCH /api/conversations/:id — Update conversation title
app.patch(
  "/:id",
  zValidator("json", z.object({ title: z.string().min(1).max(255).optional(), isStarred: z.boolean().optional() }).refine(data => data.title !== undefined || data.isStarred !== undefined, { message: "At least one field required" })),
  async (c) => {
    const userId = c.get("userId");
    const id = parseInt(c.req.param("id"));
    const conversation = await getConversationById(id);
    if (!conversation) return c.json({ error: "Conversation not found" }, 404);
    if (!(await verifyWorkspaceAccess(userId, conversation.workspaceId))) {
      return c.json({ error: "Not a workspace member" }, 403);
    }
    const { title, isStarred } = c.req.valid("json");
    const updated = await updateConversation(id, { title, isStarred });
    if (!updated) return c.json({ error: "Conversation not found" }, 404);
    return c.json(updated);
  },
);
// DELETE /api/conversations/:id — Delete conversation + messages
app.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const id = parseInt(c.req.param("id"));
  const conversation = await getConversationById(id);
  if (!conversation) return c.json({ error: "Conversation not found" }, 404);
  if (!(await verifyWorkspaceAccess(userId, conversation.workspaceId))) {
    return c.json({ error: "Not a workspace member" }, 403);
  }
  await deleteConversation(id);
  return c.json({ deleted: true });
});
export default app;
// Project-scoped conversation list
export const projectConversations = new Hono<AuthEnv>();
projectConversations.use("*", requireAuth, resolveUser);
// GET /api/projects/:id/conversations — List project conversations
projectConversations.get("/:id/conversations", async (c) => {
  const userId = c.get("userId");
  const projectId = parseInt(c.req.param("id"));
  const project = await getProjectById(projectId);
  if (!project) return c.json({ error: "Project not found" }, 404);
  if (!(await verifyWorkspaceAccess(userId, project.workspaceId))) {
    return c.json({ error: "Not a workspace member" }, 403);
  }
  const list = await getConversationsByProject(project.workspaceId, projectId);
  return c.json(list);
});
// Workspace-scoped conversation list is mounted on the workspaces router
export const workspaceConversations = new Hono<AuthEnv>();
workspaceConversations.use("*", requireAuth, resolveUser);
// GET /api/workspaces/:id/conversations — List workspace conversations (paginated)
workspaceConversations.get(
  "/:id/conversations",
  requireWorkspaceMember,
  async (c) => {
    const workspaceId = parseInt(c.req.param("id"));
    const limit = Math.min(parseInt(c.req.query("limit") || "50"), 100);
    const cursor = c.req.query("cursor") ? parseInt(c.req.query("cursor")!) : undefined;
    const conditions = [eq(conversationsTable.workspaceId, workspaceId)];
    if (cursor) conditions.push(lt(conversationsTable.id, cursor));
    const items = await db.query.conversations.findMany({
      where: and(...conditions),
      orderBy: desc(conversationsTable.id),
      limit: limit + 1,
    });
    const hasMore = items.length > limit;
    const page = hasMore ? items.slice(0, limit) : items;
    return c.json({
      items: page,
      nextCursor: hasMore ? page[page.length - 1].id : null,
    });
  },
);
