import WebSocket from "ws";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { logger as rootLogger } from "../lib/logger";

const log = rootLogger.child({ service: "gateway" });

// ─── Protocol types (matching OpenClaw protocol v3) ─────────────────

interface RequestFrame {
  type: "req";
  id: string;
  method: string;
  params?: unknown;
}


interface ResponseFrame {
  type: "res";
  id: string;
  ok: boolean;
  payload?: Record<string, unknown>;
  error?: { code: string; message: string; details?: unknown };
}


interface EventFrame {
  type: "event";
  event: string;
  payload?: Record<string, unknown>;
  seq?: number;
}


type GatewayFrame = ResponseFrame | EventFrame;

interface HelloOk {
  type: "hello-ok";
  protocol: number;
  server: { version: string; connId: string };
  features: { methods: string[]; events: string[] };
}


// ─── Device identity (Ed25519 challenge-response auth) ──────────────

const ED25519_SPKI_PREFIX = Buffer.from(
  "302a300506032b6570032100",
  "hex",
);

function base64UrlEncode(buf: Buffer): string {
  return buf.toString("base64url");
}


interface DeviceIdentity {
  deviceId: string;
  publicKeyB64: string;
  privateKeyPem: string;
}


const DEVICE_IDENTITY_PATH = path.join(
  process.env.DEVICE_IDENTITY_DIR ?? ".openclaw",
  "device-identity.json",
);

function loadOrCreateDeviceIdentity(): DeviceIdentity {
  try {
    const data = JSON.parse(fs.readFileSync(DEVICE_IDENTITY_PATH, "utf-8"));
    if (data.deviceId && data.publicKeyB64 && data.privateKeyPem) {
      log.debug({ deviceId: data.deviceId.slice(0, 8) }, "loaded device identity");
      return data;
    }

  } catch {
    // File doesn't exist or is invalid — generate new identity
  }


  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const rawPub = publicKey.export({ type: "spki", format: "der" }).subarray(12);
  const deviceId = crypto.createHash("sha256").update(rawPub).digest("hex");
  const identity: DeviceIdentity = {
    deviceId,
    publicKeyB64: base64UrlEncode(rawPub),
    privateKeyPem: privateKey.export({ type: "pkcs8", format: "pem" }) as string,
  };

  fs.mkdirSync(path.dirname(DEVICE_IDENTITY_PATH), { recursive: true });
  fs.writeFileSync(DEVICE_IDENTITY_PATH, JSON.stringify(identity, null, 2), { mode: 0o600 });
  log.info({ deviceId: deviceId.slice(0, 8) }, "created new device identity");
  return identity;
}


function buildDeviceAuthPayload(params: {
  deviceId: string;
  clientId: string;
  clientMode: string;
  role: string;
  scopes: string[];
  signedAtMs: number;
  token: string;
  nonce: string;
}): string {
  return [
    "v2",
    params.deviceId,
    params.clientId,
    params.clientMode,
    params.role,
    params.scopes.join(","),
    String(params.signedAtMs),
    params.token,
    params.nonce,
  ].join("|");
}


function signPayload(privateKeyPem: string, payload: string): string {
  const key = crypto.createPrivateKey(privateKeyPem);
  const sig = crypto.sign(null, Buffer.from(payload, "utf8"), key);
  return base64UrlEncode(sig);
}


// ─── Chat event types ───────────────────────────────────────────────

interface ChatEventPayload {
  runId: string;
  sessionKey: string;
  seq: number;
  state: "delta" | "final" | "aborted" | "error";
  message?: {
    content?: Array<{ type?: string; text?: string }>;
    [key: string]: unknown;
  };
  errorMessage?: string;
  usage?: unknown;
  stopReason?: string;
}


// ─── Agent management types ─────────────────────────────────────────

interface AgentSummary {
  id: string;
  name?: string;
  identity?: {
    name?: string;
    theme?: string;
    emoji?: string;
    avatar?: string;
    avatarUrl?: string;
  };
}


interface AgentsListResult {
  defaultId: string;
  mainKey: string;
  scope: "per-sender" | "global";
  agents: AgentSummary[];
}


interface AgentsCreateResult {
  ok: true;
  agentId: string;
  name: string;
  workspace: string;
}


interface AgentFileEntry {
  name: string;
  path: string;
  missing: boolean;
  size?: number;
  updatedAtMs?: number;
  content?: string;
}


// ─── Zod schemas for runtime validation of gateway responses ────────

const HelloOkPayloadSchema = z.object({
  type: z.literal("hello-ok"),
  protocol: z.number(),
  server: z.object({ version: z.string(), connId: z.string() }),
  features: z.object({
    methods: z.array(z.string()),
    events: z.array(z.string()),
  }),
});

const ChatSendPayloadSchema = z.object({
  runId: z.string().optional(),
  status: z.string().optional(),
});

const ChatHistoryPayloadSchema = z.object({
  messages: z.array(z.unknown()),
  sessionId: z.string().optional(),
});

const AgentSummarySchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  identity: z
    .object({
      name: z.string().optional(),
      theme: z.string().optional(),
      emoji: z.string().optional(),
      avatar: z.string().optional(),
      avatarUrl: z.string().optional(),
    })
    .optional(),
});

const AgentsListPayloadSchema = z.object({
  defaultId: z.string(),
  mainKey: z.string(),
  scope: z.enum(["per-sender", "global"]),
  agents: z.array(AgentSummarySchema),
});

const AgentsCreatePayloadSchema = z.object({
  ok: z.literal(true),
  agentId: z.string(),
  name: z.string(),
  workspace: z.string(),
});

const AgentFileEntrySchema = z.object({
  name: z.string(),
  path: z.string(),
  missing: z.boolean(),
  size: z.number().optional(),
  updatedAtMs: z.number().optional(),
  content: z.string().optional(),
});

const AgentsFilesListPayloadSchema = z.object({
  agentId: z.string(),
  workspace: z.string(),
  files: z.array(AgentFileEntrySchema),
});

const AgentsFileResultPayloadSchema = z.object({
  file: AgentFileEntrySchema,
});

const ChatEventPayloadSchema = z.object({
  runId: z.string(),
  sessionKey: z.string(),
  seq: z.number(),
  state: z.enum(["delta", "final", "aborted", "error"]),
  message: z
    .object({
      content: z
        .array(z.object({ type: z.string().optional(), text: z.string().optional() }))
        .optional(),
    })
    .passthrough()
    .optional(),
  errorMessage: z.string().optional(),
  usage: z.unknown().optional(),
  stopReason: z.string().optional(),
});

/** Parse gateway payload with Zod. Throws with a clear message on mismatch. */
function parsePayload<T>(schema: z.ZodType<T>, payload: unknown, method: string): T {
  const result = schema.safeParse(payload);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
    throw new Error(`[Gateway] ${method} response validation failed: ${issues}`);
  }

  return result.data;
}


// ─── Run handler for streaming ──────────────────────────────────────

type RunHandler = {
  onDelta: (text: string, message?: Record<string, unknown>) => void;
  onFinal: (text: string, message?: Record<string, unknown>) => void;
  onError: (error: string) => void;
  lastSeq: number;
};

// ─── Gateway Relay ──────────────────────────────────────────────────

export class GatewayRelay {
  private ws: WebSocket | null = null;
  private pendingRuns = new Map<string, RunHandler>();
  private pendingRequests = new Map<
    string,
    { resolve: (frame: ResponseFrame) => void }

  >();
  private reqId = 0;
  private _connected = false;
  private url = "";
  private token = "";
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private serverInfo: { version: string; connId: string } | null = null;
  private device = loadOrCreateDeviceIdentity();

  /** ID from gateway_instances table. -1 for legacy singleton. */
  readonly instanceId: number;
  /** Updated on every method call — used by GatewayPool for idle reaping. */
  lastActivityAt: Date;

  constructor(instanceId = -1) {
    this.instanceId = instanceId;
    this.lastActivityAt = new Date();
  }


  get isConnected(): boolean {
    return this._connected;
  }


  async connect(url: string, token: string): Promise<HelloOk> {
    this.lastActivityAt = new Date();
    this.url = url;
    this.token = token;

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url, {
        headers: {
          // Required for ngrok free tier to skip browser warning page
          "ngrok-skip-browser-warning": "true",
        },
      });

      this.ws.on("error", (err) => {
        if (!this._connected) {
          reject(err);
        } else {
          log.error({ err: err.message }, "websocket error");
        }

      });

      let handshakeDone = false;

      this.ws.on("message", (data) => {
        try {
          const frame = JSON.parse(data.toString());

          // Step 1: Wait for connect.challenge event
          if (
            !handshakeDone &&
            frame.type === "event" &&
            frame.event === "connect.challenge"
          ) {
            const { nonce } = frame.payload as { nonce: string; ts: number };
            log.debug("received challenge, sending auth");

            const signedAt = Date.now();
            const scopes = ["operator.admin", "operator.read", "operator.write"];
            const payload = buildDeviceAuthPayload({
              deviceId: this.device.deviceId,
              clientId: "gateway-client",
              clientMode: "node",
              role: "operator",
              scopes,
              signedAtMs: signedAt,
              token,
              nonce,
            });
            const signature = signPayload(this.device.privateKeyPem, payload);

            // Send connect request (proper req frame, not raw params)
            const connectReq: RequestFrame = {
              type: "req",
              id: String(++this.reqId),
              method: "connect",
              params: {
                minProtocol: 3,
                maxProtocol: 3,
                client: {
                  id: "gateway-client",
                  displayName: "Godinez Studio",
                  version: "0.1.0",
                  platform: "node",
                  mode: "node",
                },
                role: "operator",
                scopes,
                device: {
                  id: this.device.deviceId,
                  publicKey: this.device.publicKeyB64,
                  signature,
                  signedAt,
                  nonce,
                },
                auth: { token },
              },
            };
            this.ws!.send(JSON.stringify(connectReq));
            return;
          }


          // Step 2: hello-ok comes as a response to the connect request
          if (!handshakeDone && frame.type === "res" && frame.ok) {
            const p = frame.payload as Record<string, unknown> | undefined;
            if (p?.type === "hello-ok") {
              handshakeDone = true;
              this._connected = true;
              this.reconnectAttempt = 0;
              const helloOk = parsePayload(HelloOkPayloadSchema, p, "connect");
              this.serverInfo = helloOk.server;
              log.info({ version: helloOk.server.version, connId: helloOk.server.connId }, "connected to OpenClaw");
              resolve(helloOk);
              return;
            }

          }


          // Step 2b: auth rejected
          if (!handshakeDone && frame.type === "res" && !frame.ok) {
            handshakeDone = true;
            const msg = frame.error?.message ?? "connect rejected";
            log.error({ err: msg }, "auth failed");
            this.ws?.close();
            reject(new Error(msg));
            return;
          }


          if (handshakeDone) {
            this.handleFrame(frame as GatewayFrame);
          }

        } catch {
          log.error("failed to parse gateway message");
        }

      });

      this.ws.on("close", () => {
        this._connected = false;
        this.serverInfo = null;
        if (handshakeDone) {
          this.scheduleReconnect();
        }

      });

      // Timeout handshake after 15s
      setTimeout(() => {
        if (!handshakeDone) {
          this.ws?.close();
          reject(new Error("Handshake timeout"));
        }

      }, 15_000);
    });
  }


  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.ws?.close();
    this.ws = null;
    this._connected = false;
    this.serverInfo = null;
  }


  // ─── Chat methods ───────────────────────────────────────────────

  async chatSend(
    sessionKey: string,
    message: string,
    attachments?: Array<{ fileId: number; url: string; mimeType: string; filename: string }>,
  ): Promise<string> {
    const idempotencyKey = crypto.randomUUID();
    
    // Build message with attachments prepended as MEDIA: directives
    // OpenClaw understands MEDIA:<url> format for inline media
    let fullMessage = message;
    if (attachments?.length) {
      const mediaLines = attachments.map(att => {
        // Use MEDIA: prefix which OpenClaw media pipeline understands
        return `[Attached: ${att.filename} (${att.mimeType})]\nMEDIA:${att.url}`;
      }).join('\n\n');
      fullMessage = `${mediaLines}\n\n${message}`;
    }

    const response = await this.sendRequest("chat.send", {
      sessionKey,
      message: fullMessage,
      idempotencyKey,
    });
    if (!response.ok) {
      throw new Error(
        response.error?.message ?? "chat.send failed",
      );
    }
    const payload = parsePayload(ChatSendPayloadSchema, response.payload, "chat.send");
    return payload.runId ?? idempotencyKey;
  }

  async chatAbort(sessionKey: string, runId?: string): Promise<void> {
    await this.sendRequest("chat.abort", { sessionKey, runId });
  }


  async chatHistory(
    sessionKey: string,
    limit = 50,
  ): Promise<{ messages: unknown[]; sessionId?: string }> {
    const response = await this.sendRequest("chat.history", {
      sessionKey,
      limit,
    });
    if (!response.ok) {
      throw new Error(response.error?.message ?? "chat.history failed");
    }

    return parsePayload(ChatHistoryPayloadSchema, response.payload, "chat.history");
  }


  // ─── Agent management methods ─────────────────────────────────

  async agentsList(): Promise<AgentsListResult> {
    const response = await this.sendRequest("agents.list", {});
    if (!response.ok) {
      throw new Error(response.error?.message ?? "agents.list failed");
    }

    return parsePayload(AgentsListPayloadSchema, response.payload, "agents.list");
  }


  async agentsCreate(params: {
    name: string;
    workspace: string;
    emoji?: string;
    avatar?: string;
  }): Promise<AgentsCreateResult> {
    const response = await this.sendRequest("agents.create", params);
    if (!response.ok) {
      throw new Error(response.error?.message ?? "agents.create failed");
    }

    return parsePayload(AgentsCreatePayloadSchema, response.payload, "agents.create");
  }


  async agentsUpdate(params: {
    agentId: string;
    name?: string;
    workspace?: string;
    model?: string;
    avatar?: string;
  }): Promise<void> {
    const response = await this.sendRequest("agents.update", params);
    if (!response.ok) {
      throw new Error(response.error?.message ?? "agents.update failed");
    }

  }


  async agentsDelete(
    agentId: string,
    deleteFiles = false,
  ): Promise<void> {
    const response = await this.sendRequest("agents.delete", {
      agentId,
      deleteFiles,
    });
    if (!response.ok) {
      throw new Error(response.error?.message ?? "agents.delete failed");
    }

  }


  async agentsFilesList(
    agentId: string,
  ): Promise<{ agentId: string; workspace: string; files: AgentFileEntry[] }> {
    const response = await this.sendRequest("agents.files.list", { agentId });
    if (!response.ok) {
      throw new Error(response.error?.message ?? "agents.files.list failed");
    }

    return parsePayload(AgentsFilesListPayloadSchema, response.payload, "agents.files.list");
  }


  async agentsFilesGet(
    agentId: string,
    name: string,
  ): Promise<AgentFileEntry> {
    const response = await this.sendRequest("agents.files.get", {
      agentId,
      name,
    });
    if (!response.ok) {
      throw new Error(response.error?.message ?? "agents.files.get failed");
    }

    const result = parsePayload(AgentsFileResultPayloadSchema, response.payload, "agents.files.get");
    return result.file;
  }


  async agentsFilesSet(
    agentId: string,
    name: string,
    content: string,
  ): Promise<AgentFileEntry> {
    const response = await this.sendRequest("agents.files.set", {
      agentId,
      name,
      content,
    });
    if (!response.ok) {
      throw new Error(response.error?.message ?? "agents.files.set failed");
    }

    const result = parsePayload(AgentsFileResultPayloadSchema, response.payload, "agents.files.set");
    return result.file;
  }


  // ─── Run handlers for streaming ───────────────────────────────

  onRun(runId: string, handlers: Omit<RunHandler, "lastSeq">): void {
    this.lastActivityAt = new Date();
    this.pendingRuns.set(runId, { ...handlers, lastSeq: -1 });
  }


  offRun(runId: string): void {
    this.lastActivityAt = new Date();
    this.pendingRuns.delete(runId);
  }


  // ─── Internal frame handling ──────────────────────────────────

  private handleFrame(frame: GatewayFrame): void {
    // Response to a pending request
    if (frame.type === "res") {
      const pending = this.pendingRequests.get(frame.id);
      if (pending) {
        this.pendingRequests.delete(frame.id);
        pending.resolve(frame);
      }

      return;
    }


    // Event broadcast
    if (frame.type === "event" && frame.event === "chat") {
      log.debug({ payload: frame.payload }, "chat event received");
      const parsed = ChatEventPayloadSchema.safeParse(frame.payload);
      if (!parsed.success) {
        log.warn({ err: parsed.error.message }, "chat event validation failed");
        return;
      }

      const { runId, seq, state, message, errorMessage } = parsed.data;
      const handler = this.pendingRuns.get(runId);
      if (!handler) return;

      // Deduplicate by seq — skip events we've already seen
      // Dedupe: skip if seq already processed, BUT allow final event with same seq as last delta
      if (seq < handler.lastSeq || (seq === handler.lastSeq && state === "delta")) return;
      handler.lastSeq = seq;

      // Extract text from message content blocks
      const text = this.extractText(message);

      if (state === "delta") {
        handler.onDelta(text, message as Record<string, unknown>);
      }

      log.debug({ state, runId }, "chat event state");
      if (state === "final") {
        handler.onFinal(text, message as Record<string, unknown>);
        this.pendingRuns.delete(runId);
      }

      if (state === "aborted") {
        handler.onFinal(text, message as Record<string, unknown>);
        this.pendingRuns.delete(runId);
      }

      if (state === "error") {
        handler.onError(errorMessage ?? "unknown error");
        this.pendingRuns.delete(runId);
      }

    }

  }


  private extractText(
    message?: { content?: Array<{ type?: string; text?: string }> },
  ): string {
    if (!message?.content) return "";
    return message.content
      .filter((block) => block.type === "text" || !block.type)
      .map((block) => block.text ?? "")
      .join("");
  }


  private sendRequest(
    method: string,
    params: Record<string, unknown>,
  ): Promise<ResponseFrame> {
    this.lastActivityAt = new Date();
    return new Promise((resolve) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        resolve({
          type: "res",
          id: "0",
          ok: false,
          error: { code: "NOT_CONNECTED", message: "Gateway not connected" },
        });
        return;
      }


      const id = String(++this.reqId);

      const frame: RequestFrame = {
        type: "req",
        id,
        method,
        params,
      };

      this.pendingRequests.set(id, { resolve });
      this.ws.send(JSON.stringify(frame));

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          resolve({
            type: "res",
            id,
            ok: false,
            error: { code: "TIMEOUT", message: `${method} timed out` },
          });
        }

      }, 30_000);
    });
  }


  private scheduleReconnect(): void {
    // Preserve run handlers across reconnect — active streams survive WS drops.
    // When WS reconnects, OpenClaw resends pending events or the handler
    // times out naturally via the SSE stream timeout on the client side.
    log.warn({ activeRuns: this.pendingRuns.size }, "WS disconnected — preserving run handlers for reconnect");

    const delay = Math.min(
      1000 * Math.pow(2, this.reconnectAttempt),
      30_000,
    );
    this.reconnectAttempt++;
    log.info({ delayMs: delay }, "scheduling reconnect");

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect(this.url, this.token);
        log.info("reconnected");
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.error({ err: msg }, "reconnect failed");
      }

    }, delay);
  }

}


// Backward-compat singleton — will be replaced by GatewayPool in OPS-22
export const gateway = new GatewayRelay();
