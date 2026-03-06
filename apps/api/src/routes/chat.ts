import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { ActionCard } from "@godinez/types";
import type { AuthEnv } from "../types";
import { requireAuth } from "../middleware/auth";
import { resolveUser } from "../middleware/resolve-user";
import {
  createMessage,
  getMessages,
  getMessageById,
  getConversationById,
  updateMessageMetadata,
  linkConversationToProject,
  updateConversationTitle,
  getMessageCountForConversation,
} from "../dal/conversations";
import { createProject } from "../dal/projects";
import { createTask } from "../dal/tasks";
import { getWorkspaceById, activateWorkspace } from "../dal/workspaces";
import { pool } from "../services/gateway-pool";
import { resolveAgentSession } from "../services/agent-mapping";
import { createStubRun } from "../services/stub-agent";
import { parseActionBlocks, stripActionBlocks } from "../lib/action-parser";
import { verifyWorkspaceAccess } from "../middleware/require-resource-access";
import {
  generateHeuristicTitle,
  parseTitleBlock,
  stripTitleBlocks,
} from "../services/conversation-title";
import {
  buildMessageContext,
  prependContext,
} from "../services/message-context";
import { syncWorkspaceFile } from "../services/workspace-sync";

const app = new Hono<AuthEnv>();

app.use("*", requireAuth, resolveUser);

// POST /api/chat/send — Send a message and get a runId for streaming
app.post(
  "/send",
  zValidator(
    "json",
    z.object({
      conversationId: z.number(),
      workspaceId: z.number(),
      content: z.string().min(1),
    }),
  ),
  async (c) => {
    const userId = c.get("userId");
    const { conversationId, workspaceId, content } = c.req.valid("json");

    // Save user message
    const message = await createMessage({
      conversationId,
      workspaceId,
      role: "user",
      content,
      userId,
    });

    // Auto-title: on first message, set a heuristic title from user text
    const msgCount = await getMessageCountForConversation(conversationId);
    if (msgCount === 1) {
      const heuristicTitle = generateHeuristicTitle(content);
      await updateConversationTitle(conversationId, heuristicTitle);
    }

    // Build context-enriched content for the agent
    const contextHeader = await buildMessageContext(conversationId, workspaceId);
    const enrichedContent = prependContext(contextHeader, content);

    // Send to Gateway or use stub
    let runId: string;

    // Resolve workspace to find its instance
    const workspace = await getWorkspaceById(workspaceId);

    let relay;
    try {
      relay = workspace ? await pool.getRelayForWorkspace(workspace.instanceId) : null;
    } catch {
      relay = null;
    }

    if (relay) {
      try {
        const sessionKey = await resolveAgentSession(workspaceId, conversationId);
        runId = await relay.chatSend(sessionKey, enrichedContent);
        runContexts.set(runId, { conversationId, workspaceId, instanceId: workspace!.instanceId });
      } catch (err) {
        const error = err instanceof Error ? err.message : "Gateway error";
        return c.json({ error }, 502);
      }
    } else {
      // Stub mode — create a stub run and register it
      const stub = createStubRun(enrichedContent);
      runId = stub.runId;
      stubRuns.set(runId, { stub, conversationId, workspaceId });
    }

    return c.json({ runId, messageId: message.id });
  },
);

// Map for stub runs waiting to be streamed
const stubRuns = new Map<
  string,
  {
    stub: ReturnType<typeof createStubRun>;
    conversationId: number;
    workspaceId: number;
  }
>();

// GET /api/chat/stream/:runId — SSE stream of agent response
app.get("/stream/:runId", async (c) => {
  const runId = c.req.param("runId");
  const userId = c.get("userId");

  return streamSSE(c, async (stream) => {
    let keepaliveTimer: ReturnType<typeof setInterval> | null = null;

    // Resolve the relay for this run (needed for onRun/offRun)
    const ctx = runContexts.get(runId);
    let relay;
    try {
      relay = ctx?.instanceId != null
        ? await pool.getRelayForWorkspace(ctx.instanceId)
        : null;
    } catch {
      relay = null;
    }

    const cleanup = () => {
      if (keepaliveTimer) clearInterval(keepaliveTimer);
      relay?.offRun(runId);
    };

    // Keepalive every 30 seconds
    keepaliveTimer = setInterval(async () => {
      try {
        await stream.writeSSE({ event: "keepalive", data: "" });
      } catch {
        cleanup();
      }
    }, 30_000);

    // Check if this is a stub run
    const stubEntry = stubRuns.get(runId);
    if (stubEntry) {
      stubRuns.delete(runId);

      stubEntry.stub.simulateStream({
        onDelta: async (text) => {
          try {
            await stream.writeSSE({
              event: "delta",
              data: JSON.stringify({ type: "delta", text }),
            });
          } catch {
            cleanup();
          }
        },
        onFinal: async (text) => {
          try {
            // Parse and strip :::title block (agent-suggested title)
            const suggestedTitle = parseTitleBlock(text);
            const cleanText = stripTitleBlocks(text);

            // Parse action blocks from agent text
            const actionBlocks = parseActionBlocks(cleanText);
            const actions: ActionCard[] = actionBlocks.map((b) => ({
              ...b,
              status: "pending" as const,
            }));

            // Save agent message to DB (with title block stripped)
            const agentMessage = await createMessage({
              conversationId: stubEntry.conversationId,
              workspaceId: stubEntry.workspaceId,
              role: "agent",
              content: cleanText,
              metadata: {
                stub: true,
                ...(actions.length > 0 ? { actions } : {}),
              },
            });

            // Update conversation title if agent suggested one
            if (suggestedTitle) {
              await updateConversationTitle(
                stubEntry.conversationId,
                suggestedTitle,
              );
            }

            // Activate workspace if still provisioning
            const ws = await getWorkspaceById(stubEntry.workspaceId);
            if (ws?.status === "provisioning") {
              await activateWorkspace(stubEntry.workspaceId);
            }

            await stream.writeSSE({
              event: "done",
              data: JSON.stringify({
                type: "done",
                text: cleanText,
                messageId: agentMessage.id,
                ...(actions.length > 0 ? { actions } : {}),
              }),
            });
          } catch {
            // stream already closed
          } finally {
            cleanup();
            await stream.close();
          }
        },
      });
      return;
    }

    // Real Gateway mode — register handlers
    if (!relay) {
      await stream.writeSSE({
        event: "error",
        data: JSON.stringify({ type: "error", error: "AGENT_OFFLINE" }),
      });
      cleanup();
      await stream.close();
      return;
    }

    let streamClosed = false;
    let accumulated = "";

    await new Promise<void>((resolve) => {
      relay.onRun(runId, {
        onDelta: async (text) => {
          if (streamClosed) return;
          // Accumulate text — OpenClaw may send incremental or full deltas.
          // If text is longer than accumulated, treat it as the full snapshot;
          // otherwise append the new chunk.
          if (text.length >= accumulated.length && accumulated.length > 0 && text.startsWith(accumulated)) {
            accumulated = text;
          } else if (accumulated.endsWith(text)) {
            // Duplicate of last chunk — skip
            return;
          } else {
            accumulated += text;
          }
          try {
            await stream.writeSSE({
              event: "delta",
              data: JSON.stringify({ type: "delta", text: accumulated }),
            });
          } catch {
            streamClosed = true;
          }
        },
        onFinal: async (text) => {
          // Always save to DB, even if stream is closed (user navigated away)
          try {
            // Parse and strip :::title block (agent-suggested title)
            const suggestedTitle = parseTitleBlock(text);
            const cleanText = stripTitleBlocks(text);

            const ctx = runContexts.get(runId);
            if (ctx) {
              // Parse action blocks from agent text
              const actionBlocks = parseActionBlocks(cleanText);
              const actions: ActionCard[] = actionBlocks.map((b) => ({
                ...b,
                status: "pending" as const,
              }));

              const agentMessage = await createMessage({
                conversationId: ctx.conversationId,
                workspaceId: ctx.workspaceId,
                role: "agent",
                content: cleanText,
                ...(actions.length > 0
                  ? { metadata: { actions } }
                  : {}),
              });

              // Update conversation title if agent suggested one
              if (suggestedTitle) {
                await updateConversationTitle(
                  ctx.conversationId,
                  suggestedTitle,
                );
              }

              // Activate workspace if still provisioning
              const ws = await getWorkspaceById(ctx.workspaceId);
              if (ws?.status === "provisioning") {
                await activateWorkspace(ctx.workspaceId);
              }

              if (!streamClosed) {
                await stream.writeSSE({
                  event: "done",
                  data: JSON.stringify({
                    type: "done",
                    text: cleanText,
                    messageId: agentMessage.id,
                    ...(actions.length > 0 ? { actions } : {}),
                  }),
                });
              }
              runContexts.delete(runId);
            } else if (!streamClosed) {
              await stream.writeSSE({
                event: "done",
                data: JSON.stringify({ type: "done", text: cleanText }),
              });
            }
          } catch {
            // DB or stream error
          } finally {
            cleanup();
            resolve();
            try { await stream.close(); } catch { /* already closed */ }
          }
        },
        onError: async (error) => {
          try {
            if (!streamClosed) {
              await stream.writeSSE({
                event: "error",
                data: JSON.stringify({ type: "error", error }),
              });
            }
          } catch {
            // stream closed
          } finally {
            cleanup();
            runContexts.delete(runId);
            resolve();
            try { await stream.close(); } catch { /* already closed */ }
          }
        },
      });

      // Timeout after 5 minutes
      setTimeout(() => {
        cleanup();
        runContexts.delete(runId);
        resolve();
      }, 5 * 60 * 1000);
    });
  });
});

// Context map for Gateway runs (conversationId + workspaceId needed when saving final message)
export const runContexts = new Map<
  string,
  { conversationId: number; workspaceId: number; instanceId?: number | null }
>();

// POST /api/chat/actions/:messageId/execute — Execute a pending action
app.post(
  "/actions/:messageId/execute",
  zValidator("json", z.object({ actionId: z.string() })),
  async (c) => {
    const messageId = parseInt(c.req.param("messageId"));
    const { actionId } = c.req.valid("json");

    const message = await getMessageById(messageId);
    if (!message) return c.json({ error: "Message not found" }, 404);

    const userId = c.get("userId");
    if (!(await verifyWorkspaceAccess(userId, message.workspaceId))) {
      return c.json({ error: "Not a workspace member" }, 403);
    }

    let metadata: Record<string, unknown> = {};
    try {
      metadata = message.metadata ? JSON.parse(message.metadata) : {};
    } catch {
      return c.json({ error: "Invalid message metadata" }, 400);
    }
    const actions: ActionCard[] = Array.isArray(metadata.actions)
      ? (metadata.actions as ActionCard[])
      : [];
    const idx = actions.findIndex((a) => a.id === actionId);
    if (idx === -1) return c.json({ error: "Action not found" }, 404);

    const action = actions[idx];
    if (action.status !== "pending" && action.status !== "error") {
      return c.json({ error: "Action already executed" }, 400);
    }

    // Mark executing
    actions[idx] = { ...action, status: "executing" };
    await updateMessageMetadata(messageId, { ...metadata, actions });

    try {
      let resultId: number | undefined;
      const workspaceId = message.workspaceId;

      // Resolve conversation's project for task inheritance
      const conversation = await getConversationById(message.conversationId);

      const p = action.payload ?? {};

      switch (action.type) {
        case "create_project": {
          const name = typeof p.name === "string" ? p.name : "";
          if (!name) return c.json({ error: "Action payload missing name" }, 400);
          const project = await createProject({
            workspaceId,
            name,
            description: typeof p.description === "string" ? p.description : undefined,
          });
          resultId = project.id;
          // Link conversation to newly created project
          await linkConversationToProject(message.conversationId, project.id);
          break;
        }
        case "create_task": {
          const title = typeof p.title === "string" ? p.title
            : typeof p.name === "string" ? p.name : "";
          if (!title) return c.json({ error: "Action payload missing title" }, 400);

          // Inherit project from action payload, or fall back to conversation's project
          const rawProjectId = typeof p.projectId === "number" ? p.projectId
            : typeof p.projectId === "string" ? Number(p.projectId) : undefined;
          const taskProjectId = rawProjectId && !Number.isNaN(rawProjectId)
            ? rawProjectId
            : conversation?.projectId ?? undefined;

          const task = await createTask({
            workspaceId,
            title,
            description: typeof p.description === "string" ? p.description : undefined,
            projectId: taskProjectId,
            priority: typeof p.priority === "string" ? p.priority : undefined,
          });
          resultId = task.id;
          break;
        }
        case "create_file": {
          // Phase 1: file creation is a stub — just mark completed
          resultId = undefined;
          break;
        }
      }

      // Mark completed
      actions[idx] = {
        ...action,
        status: "completed",
        resultId,
        executedAt: new Date().toISOString(),
      };
      await updateMessageMetadata(messageId, { ...metadata, actions });

      // Sync workspace state to agent after resource creation
      syncWorkspaceFile(workspaceId);

      return c.json({ action: actions[idx] });
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Execution failed";
      actions[idx] = { ...action, status: "error", error: errorMsg };
      await updateMessageMetadata(messageId, { ...metadata, actions });
      return c.json({ action: actions[idx] }, 500);
    }
  },
);

// GET /api/chat/history/:conversationId — Message history
app.get("/history/:conversationId", async (c) => {
  const conversationId = parseInt(c.req.param("conversationId"));
  const messages = await getMessages(conversationId);
  return c.json({ messages });
});

export default app;
