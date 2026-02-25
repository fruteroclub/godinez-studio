import WebSocket from "ws";

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

interface ConnectParams {
  minProtocol: number;
  maxProtocol: number;
  client: {
    id: string;
    displayName?: string;
    version: string;
    platform: string;
    mode: "node";
  };
  auth?: { token?: string };
  scopes?: string[];
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

// ─── Run handler for streaming ──────────────────────────────────────

type RunHandler = {
  onDelta: (text: string, message?: Record<string, unknown>) => void;
  onFinal: (text: string, message?: Record<string, unknown>) => void;
  onError: (error: string) => void;
};

// ─── Gateway Relay ──────────────────────────────────────────────────

class GatewayRelay {
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

  get isConnected(): boolean {
    return this._connected;
  }

  async connect(url: string, token: string): Promise<HelloOk> {
    this.url = url;
    this.token = token;

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url);

      this.ws.on("open", () => {
        // Send connect handshake
        const connectParams: ConnectParams = {
          minProtocol: 3,
          maxProtocol: 3,
          client: {
            id: "godinez-studio",
            displayName: "Godinez Studio",
            version: "0.1.0",
            platform: "node",
            mode: "node",
          },
          auth: { token },
          scopes: ["chat", "agents"],
        };
        this.ws!.send(JSON.stringify(connectParams));
      });

      this.ws.on("error", (err) => {
        if (!this._connected) {
          reject(err);
        } else {
          console.error("[Gateway] WebSocket error:", err.message);
        }
      });

      // Wait for hello-ok as first message, then switch to normal frame handling
      let handshakeDone = false;

      this.ws.on("message", (data) => {
        try {
          const frame = JSON.parse(data.toString());

          // First message should be hello-ok
          if (!handshakeDone && frame.type === "hello-ok") {
            handshakeDone = true;
            this._connected = true;
            this.reconnectAttempt = 0;
            this.serverInfo = frame.server;
            console.log(
              `[Gateway] Connected to OpenClaw v${frame.server.version} (conn: ${frame.server.connId})`,
            );
            resolve(frame as HelloOk);
            return;
          }

          this.handleFrame(frame as GatewayFrame);
        } catch {
          console.error("[Gateway] Failed to parse message");
        }
      });

      this.ws.on("close", () => {
        this._connected = false;
        this.serverInfo = null;
        this.scheduleReconnect();
      });

      // Timeout handshake after 10s
      setTimeout(() => {
        if (!handshakeDone) {
          this.ws?.close();
          reject(new Error("Handshake timeout"));
        }
      }, 10_000);
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

  async chatSend(sessionKey: string, message: string): Promise<string> {
    const idempotencyKey = crypto.randomUUID();
    const response = await this.sendRequest("chat.send", {
      sessionKey,
      message,
      idempotencyKey,
    });
    if (!response.ok) {
      throw new Error(
        response.error?.message ?? "chat.send failed",
      );
    }
    const payload = response.payload as { runId?: string; status?: string };
    return payload?.runId ?? idempotencyKey;
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
    return response.payload as { messages: unknown[]; sessionId?: string };
  }

  // ─── Agent management methods ─────────────────────────────────

  async agentsList(): Promise<AgentsListResult> {
    const response = await this.sendRequest("agents.list", {});
    if (!response.ok) {
      throw new Error(response.error?.message ?? "agents.list failed");
    }
    return response.payload as unknown as AgentsListResult;
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
    return response.payload as unknown as AgentsCreateResult;
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
    return response.payload as unknown as {
      agentId: string;
      workspace: string;
      files: AgentFileEntry[];
    };
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
    const result = response.payload as unknown as {
      file: AgentFileEntry;
    };
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
    const result = response.payload as unknown as {
      file: AgentFileEntry;
    };
    return result.file;
  }

  // ─── Run handlers for streaming ───────────────────────────────

  onRun(runId: string, handlers: RunHandler): void {
    this.pendingRuns.set(runId, handlers);
  }

  offRun(runId: string): void {
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
      const payload = frame.payload as unknown as ChatEventPayload;
      const { runId, state, message, errorMessage } = payload;
      const handler = this.pendingRuns.get(runId);
      if (!handler) return;

      // Extract text from message content blocks
      const text = this.extractText(message);

      if (state === "delta") {
        handler.onDelta(text, message as Record<string, unknown>);
      }
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
    const delay = Math.min(
      1000 * Math.pow(2, this.reconnectAttempt),
      30_000,
    );
    this.reconnectAttempt++;
    console.log(`[Gateway] Reconnecting in ${delay}ms...`);

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect(this.url, this.token);
        console.log("[Gateway] Reconnected");
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[Gateway] Reconnect failed:", msg);
      }
    }, delay);
  }
}

export const gateway = new GatewayRelay();
