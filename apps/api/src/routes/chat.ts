import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { AuthEnv } from "../types";
import { requireAuth } from "../middleware/auth";
import { resolveUser } from "../middleware/resolve-user";
import { createMessage, getMessages } from "../dal/conversations";
import { gateway } from "../services/gateway-relay";
import { resolveAgentSession } from "../services/agent-mapping";
import { createStubRun } from "../services/stub-agent";

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
        const sessionKey = await resolveAgentSession(workspaceId);
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
            // Save agent message to DB
            const agentMessage = await createMessage({
              conversationId: stubEntry.conversationId,
              workspaceId: stubEntry.workspaceId,
              role: "agent",
              content: text,
              metadata: { stub: true },
            });

            await stream.writeSSE({
              event: "done",
              data: JSON.stringify({
                type: "done",
                text,
                messageId: agentMessage.id,
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
    await new Promise<void>((resolve) => {
      gateway.onRun(runId, {
        onDelta: async (text) => {
          try {
            await stream.writeSSE({
              event: "delta",
              data: JSON.stringify({ type: "delta", text }),
            });
          } catch {
            cleanup();
            resolve();
          }
        },
        onFinal: async (text) => {
          try {
            // We need conversationId/workspaceId — extract from pending context
            // For real Gateway mode, the chat/send endpoint should store context
            const ctx = runContexts.get(runId);
            if (ctx) {
              const agentMessage = await createMessage({
                conversationId: ctx.conversationId,
                workspaceId: ctx.workspaceId,
                role: "agent",
                content: text,
              });
              await stream.writeSSE({
                event: "done",
                data: JSON.stringify({
                  type: "done",
                  text,
                  messageId: agentMessage.id,
                }),
              });
              runContexts.delete(runId);
            } else {
              await stream.writeSSE({
                event: "done",
                data: JSON.stringify({ type: "done", text }),
              });
            }
          } catch {
            // stream closed
          } finally {
            cleanup();
            resolve();
            await stream.close();
          }
        },
        onError: async (error) => {
          try {
            await stream.writeSSE({
              event: "error",
              data: JSON.stringify({ type: "error", error }),
            });
          } catch {
            // stream closed
          } finally {
            cleanup();
            runContexts.delete(runId);
            resolve();
            await stream.close();
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

// GET /api/chat/history/:conversationId — Message history
app.get("/history/:conversationId", async (c) => {
  const conversationId = parseInt(c.req.param("conversationId"));
  const messages = await getMessages(conversationId);
  return c.json({ messages });
});

export default app;
