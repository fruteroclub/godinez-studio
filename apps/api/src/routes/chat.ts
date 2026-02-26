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
  updateMessageMetadata,
  linkConversationToProject,
} from "../dal/conversations";
import { createProject } from "../dal/projects";
import { createTask } from "../dal/tasks";
import { getWorkspaceById, activateWorkspace } from "../dal/workspaces";
import { gateway } from "../services/gateway-relay";
import { resolveAgentSession } from "../services/agent-mapping";
import { createStubRun } from "../services/stub-agent";
import { parseActionBlocks, stripActionBlocks } from "../lib/action-parser";

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

    // Send to Gateway or use stub
    let runId: string;

    if (gateway.isConnected) {
      try {
        const sessionKey = await resolveAgentSession(workspaceId, conversationId);
        runId = await gateway.chatSend(sessionKey, content);
        runContexts.set(runId, { conversationId, workspaceId });
      } catch (err) {
        const error = err instanceof Error ? err.message : "Gateway error";
        return c.json({ error }, 502);
      }
    } else {
      // Stub mode — create a stub run and register it
      const stub = createStubRun(content);
      runId = stub.runId;

      // Register stub handlers that will be picked up by the SSE endpoint
      gateway.onRun(runId, {
        onDelta: () => {},
        onFinal: () => {},
        onError: () => {},
      });
      // Replace with stub simulation — store on a simple map
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

    const cleanup = () => {
      if (keepaliveTimer) clearInterval(keepaliveTimer);
      gateway.offRun(runId);
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
      gateway.offRun(runId);

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
            // Parse action blocks from agent text
            const actionBlocks = parseActionBlocks(text);
            const actions: ActionCard[] = actionBlocks.map((b) => ({
              ...b,
              status: "pending" as const,
            }));

            // Save agent message to DB (strip action blocks from visible content)
            const agentMessage = await createMessage({
              conversationId: stubEntry.conversationId,
              workspaceId: stubEntry.workspaceId,
              role: "agent",
              content: text,
              metadata: {
                stub: true,
                ...(actions.length > 0 ? { actions } : {}),
              },
            });

            // Activate workspace if still provisioning
            const ws = await getWorkspaceById(stubEntry.workspaceId);
            if (ws?.status === "provisioning") {
              await activateWorkspace(stubEntry.workspaceId);
            }

            await stream.writeSSE({
              event: "done",
              data: JSON.stringify({
                type: "done",
                text,
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
    let streamClosed = false;

    await new Promise<void>((resolve) => {
      gateway.onRun(runId, {
        onDelta: async (text) => {
          if (streamClosed) return;
          try {
            await stream.writeSSE({
              event: "delta",
              data: JSON.stringify({ type: "delta", text }),
            });
          } catch {
            streamClosed = true;
          }
        },
        onFinal: async (text) => {
          // Always save to DB, even if stream is closed (user navigated away)
          try {
            const ctx = runContexts.get(runId);
            if (ctx) {
              // Parse action blocks from agent text
              const actionBlocks = parseActionBlocks(text);
              const actions: ActionCard[] = actionBlocks.map((b) => ({
                ...b,
                status: "pending" as const,
              }));

              const agentMessage = await createMessage({
                conversationId: ctx.conversationId,
                workspaceId: ctx.workspaceId,
                role: "agent",
                content: text,
                ...(actions.length > 0
                  ? { metadata: { actions } }
                  : {}),
              });

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
                    text,
                    messageId: agentMessage.id,
                    ...(actions.length > 0 ? { actions } : {}),
                  }),
                });
              }
              runContexts.delete(runId);
            } else if (!streamClosed) {
              await stream.writeSSE({
                event: "done",
                data: JSON.stringify({ type: "done", text }),
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
  { conversationId: number; workspaceId: number }
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

    const metadata: Record<string, unknown> = message.metadata
      ? JSON.parse(message.metadata)
      : {};
    const actions: ActionCard[] = (metadata.actions as ActionCard[]) || [];
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

      switch (action.type) {
        case "create_project": {
          const project = await createProject({
            workspaceId,
            name: String(action.payload.name || ""),
            description: action.payload.description
              ? String(action.payload.description)
              : undefined,
          });
          resultId = project.id;
          // Link conversation to newly created project
          await linkConversationToProject(message.conversationId, project.id);
          break;
        }
        case "create_task": {
          const task = await createTask({
            workspaceId,
            title: String(action.payload.title || action.payload.name || ""),
            description: action.payload.description
              ? String(action.payload.description)
              : undefined,
            projectId: action.payload.projectId
              ? Number(action.payload.projectId)
              : undefined,
            priority: action.payload.priority
              ? String(action.payload.priority)
              : undefined,
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
