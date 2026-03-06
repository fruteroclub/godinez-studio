import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { AuthEnv } from "../types";
import { requireAuth } from "../middleware/auth";
import { resolveUser } from "../middleware/resolve-user";
import { requireWorkspaceMember } from "../middleware/require-workspace";
import {
  createConversation,
  getConversationById,
  getConversationsByWorkspaceId,
  getConversationsByProject,
  updateConversationTitle,
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
  zValidator("json", z.object({ title: z.string().min(1).max(255) })),
  async (c) => {
    const userId = c.get("userId");
    const id = parseInt(c.req.param("id"));
    const conversation = await getConversationById(id);
    if (!conversation) return c.json({ error: "Conversation not found" }, 404);
    if (!(await verifyWorkspaceAccess(userId, conversation.workspaceId))) {
      return c.json({ error: "Not a workspace member" }, 403);
    }
    const { title } = c.req.valid("json");
    const updated = await updateConversationTitle(id, title);
    if (!updated) return c.json({ error: "Conversation not found" }, 404);
    return c.json(updated);
  },
);

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

// GET /api/workspaces/:id/conversations — List workspace conversations
workspaceConversations.get(
  "/:id/conversations",
  requireWorkspaceMember,
  async (c) => {
    const workspaceId = parseInt(c.req.param("id"));
    const conversations = await getConversationsByWorkspaceId(workspaceId);
    return c.json(conversations);
  },
);
