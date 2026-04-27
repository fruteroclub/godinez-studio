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
  getLastAgentMessage,
  getConversationById,
  updateMessageMetadata,
  linkConversationToProject,
  updateConversationTitle,
  getMessageCountForConversation,
} from "../dal/conversations";
import { createProject } from "../dal/projects";
import { createTask } from "../dal/tasks";
import { updateFileMessageLink, getFileById, createFile as createFileRecord } from "../dal/files";
import { getWorkspaceById, activateWorkspace } from "../dal/workspaces";
import { pool } from "../services/gateway-pool";
import type { GatewayRelay } from "../services/gateway-relay";
import { resolveAgentSession } from "../services/agent-mapping";
import { createStubRun } from "../services/stub-agent";
import { parseActionBlocks, stripActionBlocks } from "../lib/action-parser";
import { logger } from "../lib/logger";
import { getRedis } from "../lib/redis";
import {
  saveRunContext,
  getRunContext,
  deleteRunContext,
  cleanExpiredRunContexts,
} from "../dal/run-contexts";
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
import { buildHackathonContext, type HackathonContext } from "../services/hackathon-context";
import { buildHistoryContext } from "../services/conversation-history-context";
import { syncWorkspaceFile } from "../services/workspace-sync";
import { storage } from "../services/storage";
import { db } from "../db";
import { files as filesTable } from "@godinez/db";
import { eq, and } from "drizzle-orm";
import { requireQuota } from "../middleware/require-quota";
import { resolveAccount } from "../middleware/resolve-account";
import { hasStudioAccess } from "../lib/account-access";

const app = new Hono<AuthEnv>();

app.use("*", requireAuth, resolveUser, resolveAccount);

// Attachment schema for validation
const attachmentSchema = z.object({
  fileId: z.number(),
  url: z.string().url(),
  mimeType: z.string(),
  filename: z.string(),
});

// POST /api/chat/send — Send a message and get a runId for streaming
app.post(
  "/send",
  requireQuota("tokens"),
  zValidator(
    "json",
    z.object({
      conversationId: z.number(),
      workspaceId: z.number(),
      content: z.string().min(1),
      attachments: z.array(attachmentSchema).optional(),
      hackathonContext: z.object({
        active: z.boolean(),
        name: z.string(),
        deadline: z.string(),
        timeRemaining: z.string().optional(),
        currentPhase: z.number(),
        phases: z.array(z.object({
          number: z.number(),
          status: z.enum(["done", "current", "pending"]),
          notes: z.array(z.string()),
        })),
      }).optional(),
    }),
  ),
  async (c) => {
    // Billing gate (only enforced when BILLING_ENABLED=true)
    if (process.env.BILLING_ENABLED === "true") {
      const account = c.get("account");
      if (!hasStudioAccess(account)) {
        return c.json(
          {
            error: "SUBSCRIPTION_REQUIRED",
            message: "Suscripción vencida. Actualiza tu método de pago.",
          },
          402,
        );
      }
    }

    const userId = c.get("userId");
    const { conversationId, workspaceId, content, attachments, hackathonContext } = c.req.valid("json");

    // Save user message with attachment metadata
    const messageMetadata = attachments?.length
      ? { attachments: attachments.map(a => ({ fileId: a.fileId, url: a.url, mimeType: a.mimeType, filename: a.filename })) }
      : undefined;

    const message = await createMessage({
      conversationId,
      workspaceId,
      role: "user",
      content,
      userId,
      metadata: messageMetadata,
    });

    // Link attachments to this message and conversation
    if (attachments?.length) {
      for (const att of attachments) {
        await updateFileMessageLink(att.fileId, {
          messageId: message.id,
          conversationId,
        });
      }
    }

    // Auto-title: on first message, set a heuristic title from user text
    const msgCount = await getMessageCountForConversation(conversationId);
    if (msgCount === 1 && !hackathonContext?.active) {
      const heuristicTitle = generateHeuristicTitle(content);
      await updateConversationTitle(conversationId, heuristicTitle);
    }

    // Build context-enriched content for the agent
    const contextHeader = await buildMessageContext(conversationId, workspaceId);
    const hackathonHeader = buildHackathonContext(hackathonContext);
    const historyContext = await buildHistoryContext(conversationId);
    const combinedHeader = [hackathonHeader, historyContext, contextHeader].filter(Boolean).join("\n\n");
    const enrichedContent = prependContext(combinedHeader, content);

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
        // Send with attachments if present
        runId = await relay.chatSend(sessionKey, enrichedContent, attachments);
        await saveRunContext({ runId, conversationId, workspaceId, instanceId: workspace!.instanceId });

        // Save run intent in Redis so SSE handler can validate quickly
        const redis = getRedis();
        if (redis) {
          await redis.set(
            `run-intent:${runId}`,
            JSON.stringify({ conversationId, workspaceId, instanceId: workspace!.instanceId }),
            { ex: 600 },
          );
        }
      } catch (err) {
        const error = err instanceof Error ? err.message : "Gateway error";
        return c.json({ error }, 502);
      }
    } else {
      // Stub mode — create a stub run and register it
      const stub = createStubRun(enrichedContent);
      runId = stub.runId;
      stubRuns.set(runId, { stub, conversationId, workspaceId, createdAt: Date.now() });
    }

    // Track hackathon runs for extended SSE timeout (10 min vs 5 min)
    if (hackathonContext?.active) {
      hackathonRunIds.add(runId);
    }

    return c.json({ runId, messageId: message.id });
  },
);

// Set of runIds that were initiated in hackathon mode (for extended timeout)
const hackathonRunIds = new Set<string>();

// Map for stub runs waiting to be streamed (with TTL cleanup)
const stubRuns = new Map<
  string,
  {
    stub: ReturnType<typeof createStubRun>;
    conversationId: number;
    workspaceId: number;
    createdAt: number;
  }
>();

// Clean up orphaned stub runs every 2 minutes (TTL: 60s)
setInterval(() => {
  const cutoff = Date.now() - 60_000;
  for (const [id, entry] of stubRuns) {
    if (entry.createdAt < cutoff) stubRuns.delete(id);
  }
}, 2 * 60 * 1000);

// GET /api/chat/stream/:runId — SSE stream of agent response
app.get("/stream/:runId", async (c) => {
  const runId = c.req.param("runId");
  const userId = c.get("userId");

  return streamSSE(c, async (stream) => {
    let keepaliveTimer: ReturnType<typeof setInterval> | null = null;

    // Resolve the relay for this run (needed for onRun/offRun)
    const ctx = await getRunContext(runId);
    let relay: GatewayRelay | null = null;
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
      // Clean Redis run-intent (fire-and-forget)
      const redis = getRedis();
      if (redis) redis.del(`run-intent:${runId}`).catch(() => {});
    };

    // Keepalive every 30 seconds
    keepaliveTimer = setInterval(async () => {
      try {
        await stream.writeSSE({ event: "keepalive", data: "" });
      } catch {
        cleanup();
      }
    }, 15_000);

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

    // Check Redis Stream for completed run replay (handles navigate-away + return)
    const redis = getRedis();
    if (redis) {
      const streamEntries = await redis.xrange(`rs:${runId}`, "-", "+", 100);
      if (streamEntries.length > 0) {
        // Find the final/aborted/error entry
        const finalEntry = streamEntries.find(([, fields]) => {
          const typeIdx = fields.indexOf("t");
          const type = typeIdx >= 0 ? fields[typeIdx + 1] : null;
          return type === "f" || type === "a" || type === "e";
        });

        if (finalEntry) {
          const [, fields] = finalEntry;
          const typeIdx = fields.indexOf("t");
          const type = fields[typeIdx + 1];
          const textIdx = fields.indexOf("text");
          const text = textIdx >= 0 ? fields[textIdx + 1] : "";
          const msgIdx = fields.indexOf("msg");
          const errorMsg = msgIdx >= 0 ? fields[msgIdx + 1] : "unknown";

          if (type === "e") {
            await stream.writeSSE({ event: "error", data: JSON.stringify({ type: "error", error: errorMsg }) });
          } else {
            // Persist message if not already saved
            const runCtx = ctx ?? await getRunContext(runId);
            let messageId: number | undefined;
            if (runCtx) {
              const cleanText = stripTitleBlocks(text);
              const suggestedTitle = parseTitleBlock(text);
              const actionBlocks = parseActionBlocks(cleanText);
              const actions: ActionCard[] = actionBlocks.map((b) => ({ ...b, status: "pending" as const }));
              const agentMessage = await createMessage({
                conversationId: runCtx.conversationId,
                workspaceId: runCtx.workspaceId,
                role: "agent",
                content: cleanText,
                ...(actions.length > 0 ? { metadata: { actions } } : {}),
              });
              messageId = agentMessage.id;
              if (suggestedTitle) await updateConversationTitle(runCtx.conversationId, suggestedTitle);
              await deleteRunContext(runId);
            }
            await stream.writeSSE({
              event: "done",
              data: JSON.stringify({ type: "done", text: stripTitleBlocks(text), ...(messageId ? { messageId } : {}) }),
            });
          }

          logger.info({ runId, type }, "replayed completed run from Redis Stream");
          cleanup();
          await redis.del(`rs:${runId}`);
          await stream.close();
          return;
        }
      }
    }

    // If no relay from DB context, check Redis run-intent as fallback
    if (!relay && !ctx) {
      const redis = getRedis();
      if (redis) {
        const intent = await redis.get(`run-intent:${runId}`);
        if (intent) {
          try {
            const parsed = JSON.parse(intent);
            if (parsed.instanceId != null) {
              try {
                relay = await pool.getRelayForWorkspace(parsed.instanceId);
              } catch { /* fall through to AGENT_OFFLINE */ }
            }
          } catch { /* invalid JSON, ignore */ }
        }
      }
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
    let lastSentLength = 0;

    await new Promise<void>((resolve) => {
      relay.onRun(runId, {
        onDelta: async (text) => {
          if (streamClosed) return;
          // OpenClaw sends full text snapshots (not incremental deltas)
          if (text === accumulated) return; // Exact duplicate
          if (text.length < accumulated.length) return; // Shorter = partial, skip

          accumulated = text;
          const fragment = accumulated.slice(lastSentLength);
          if (!fragment) return;
          lastSentLength = accumulated.length;

          try {
            await stream.writeSSE({
              event: "delta",
              data: JSON.stringify({ type: "delta", fragment }),
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

            const ctx = await getRunContext(runId);
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
              await deleteRunContext(runId);
            } else {
              // No context found - message NOT saved to DB!
              // Frontend will use /persist-response as fallback
              console.warn(`[chat/stream] No runContext for runId ${runId} - message not persisted via SSE`);
              if (!streamClosed) {
                await stream.writeSSE({
                  event: "done",
                  data: JSON.stringify({ type: "done", text: cleanText }),
                });
              }
            }
          } catch (err) {
            // DB or stream error - log for debugging
            console.error(`[chat/stream] Error in onFinal for runId ${runId}:`, err);
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
            await deleteRunContext(runId);
            resolve();
            try { await stream.close(); } catch { /* already closed */ }
          }
        },
      });

      // Timeout: 10 min for hackathon runs (longer agent processing), 5 min otherwise
      const isHackathonRun = hackathonRunIds.has(runId);
      hackathonRunIds.delete(runId); // consume — avoid memory leak
      const streamTimeoutMs = isHackathonRun ? 10 * 60 * 1000 : 5 * 60 * 1000;
      setTimeout(async () => {
        cleanup();
        await deleteRunContext(runId);
        resolve();
        try { await stream.close(); } catch { /* already closed */ }
      }, streamTimeoutMs);
    });
  });
});

// Clean up expired run contexts every 5 minutes (TTL: 10 min)
setInterval(() => {
  cleanExpiredRunContexts().catch((err) =>
    logger.error({ err }, "failed to clean expired run contexts"),
  );
}, 5 * 60 * 1000);

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
          const filename = typeof p.filename === "string" ? p.filename : "";
          const content = typeof p.content === "string" ? p.content : "";
          
          if (!filename) {
            throw new Error("Action payload missing filename");
          }
          
          const buffer = Buffer.from(content, "utf-8");
          
          const ext = filename.split(".").pop()?.toLowerCase() || "";
          const mimeTypes: Record<string, string> = {
            md: "text/markdown",
            txt: "text/plain",
            json: "application/json",
            js: "application/javascript",
            ts: "application/typescript",
            html: "text/html",
            css: "text/css",
          };
          const mimeType = mimeTypes[ext] || "text/plain";
          
          const existingFile = await db.query.files.findFirst({
            where: and(
              eq(filesTable.workspaceId, workspaceId),
              eq(filesTable.filename, filename)
            ),
          });
          
          if (existingFile) {
            await storage.delete(existingFile.storageKey);
            const { url, key } = await storage.upload(buffer, filename, mimeType, workspaceId);
            await db.update(filesTable)
              .set({ storageKey: key, url, sizeBytes: buffer.length })
              .where(eq(filesTable.id, existingFile.id));
            resultId = existingFile.id;
          } else {
            const { url, key } = await storage.upload(buffer, filename, mimeType, workspaceId);
            const file = await createFileRecord({
              workspaceId,
              projectId: conversation?.projectId ?? undefined,
              storageKey: key,
              url,
              filename,
              mimeType,
              sizeBytes: buffer.length,
            });
            resultId = file.id;
          }
          
          syncWorkspaceFile(workspaceId);
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

// POST /api/chat/persist-response — Ensure agent response is persisted (fallback for SSE race condition)
app.post(
  "/persist-response",
  zValidator(
    "json",
    z.object({
      conversationId: z.number(),
      workspaceId: z.number(),
      content: z.string(),
      messageId: z.number().optional(),
      actions: z
        .array(
          z.object({
            id: z.string(),
            type: z.string(),
            label: z.string(),
            payload: z.record(z.unknown()).optional(),
            status: z.string().optional(),
          }),
        )
        .optional(),
    }),
  ),
  async (c) => {
    const userId = c.get("userId");
    const { conversationId, workspaceId, content, messageId, actions } = c.req.valid("json");

    // Verify workspace access
    if (!(await verifyWorkspaceAccess(userId, workspaceId))) {
      return c.json({ error: "Not a workspace member" }, 403);
    }

    // Fast path: if SSE already saved with a messageId, just verify it exists
    if (messageId) {
      const existing = await getMessageById(messageId);
      if (existing) {
        return c.json({ persisted: true, messageId, alreadyExisted: true });
      }
    }

    // Check last agent message (single row query, not full history)
    const lastAgentMessage = await getLastAgentMessage(conversationId);
    if (lastAgentMessage && lastAgentMessage.content === content) {
      return c.json({ persisted: true, messageId: lastAgentMessage.id, alreadyExisted: true });
    }

    // Save the message (fallback persistence)
    try {
      const agentMessage = await createMessage({
        conversationId,
        workspaceId,
        role: "agent",
        content,
        ...(actions?.length ? { metadata: { actions, fallbackPersist: true } } : { metadata: { fallbackPersist: true } }),
      });

      logger.info({ conversationId, messageId: agentMessage.id }, "fallback persist saved message");

      return c.json({ persisted: true, messageId: agentMessage.id, alreadyExisted: false });
    } catch (err) {
      logger.error({ err, conversationId }, "fallback persist failed");
      return c.json({ error: "Failed to persist message" }, 500);
    }
  },
);

export default app;
