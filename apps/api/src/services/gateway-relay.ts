import WebSocket from "ws";

type RunHandler = {
  onDelta: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (error: string) => void;
};

class GatewayRelay {
  private ws: WebSocket | null = null;
  private pendingRuns = new Map<string, RunHandler>();
  private rpcId = 0;
  private _connected = false;
  private url = "";
  private token = "";
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  get isConnected(): boolean {
    return this._connected;
  }

  async connect(url: string, token: string): Promise<void> {
    this.url = url;
    this.token = token;

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url);

      this.ws.on("open", () => {
        this.send("connect", {
          auth: { token },
          client: { id: "godinez-studio", displayName: "Godinez Studio" },
          subscribe: ["chat", "agent"],
        });
        this._connected = true;
        this.reconnectAttempt = 0;
        resolve();
      });

      this.ws.on("error", (err) => {
        if (!this._connected) {
          reject(err);
        } else {
          console.error("[Gateway] WebSocket error:", err.message);
        }
      });

      this.ws.on("message", (data) => {
        try {
          const frame = JSON.parse(data.toString());
          this.handleFrame(frame);
        } catch {
          console.error("[Gateway] Failed to parse message");
        }
      });

      this.ws.on("close", () => {
        this._connected = false;
        this.scheduleReconnect();
      });
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
  }

  async chatSend(sessionKey: string, message: string): Promise<string> {
    const runId = crypto.randomUUID();
    const response = await this.sendRpc("chat.send", {
      sessionKey,
      message,
      idempotencyKey: runId,
    });
    return response?.result?.runId ?? runId;
  }

  async chatAbort(sessionKey: string): Promise<void> {
    this.send("chat.abort", { sessionKey });
  }

  async chatHistory(
    sessionKey: string,
    limit = 50,
  ): Promise<unknown> {
    const response = await this.sendRpc("chat.history", {
      sessionKey,
      limit,
    });
    return response?.result;
  }

  onRun(runId: string, handlers: RunHandler): void {
    this.pendingRuns.set(runId, handlers);
  }

  offRun(runId: string): void {
    this.pendingRuns.delete(runId);
  }

  private handleFrame(frame: Record<string, unknown>): void {
    // Broadcast event (chat delta/final/error)
    if (frame.event === "chat") {
      const payload = frame.payload as {
        runId: string;
        state: string;
        message?: { content?: Array<{ text?: string }> };
        errorMessage?: string;
      };

      const { runId, state, message, errorMessage } = payload;
      const handler = this.pendingRuns.get(runId);
      if (!handler) return;

      const text = message?.content?.[0]?.text ?? "";

      if (state === "delta") {
        handler.onDelta(text);
      }
      if (state === "final") {
        handler.onFinal(text);
        this.pendingRuns.delete(runId);
      }
      if (state === "error") {
        handler.onError(errorMessage ?? "unknown error");
        this.pendingRuns.delete(runId);
      }
    }
  }

  private send(method: string, params: Record<string, unknown>): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(
      JSON.stringify({
        jsonrpc: "2.0",
        id: ++this.rpcId,
        method,
        params,
      }),
    );
  }

  private sendRpc(
    method: string,
    params: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return new Promise((resolve) => {
      const id = ++this.rpcId;

      const onMessage = (data: WebSocket.Data) => {
        try {
          const frame = JSON.parse(data.toString());
          if (frame.id === id) {
            this.ws?.off("message", onMessage);
            resolve(frame);
          }
        } catch {
          // ignore parse errors
        }
      };

      this.ws?.on("message", onMessage);
      this.ws?.send(
        JSON.stringify({ jsonrpc: "2.0", id, method, params }),
      );

      // Timeout after 10 seconds
      setTimeout(() => {
        this.ws?.off("message", onMessage);
        resolve({});
      }, 10_000);
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
        console.error("[Gateway] Reconnect failed:", err);
      }
    }, delay);
  }
}

export const gateway = new GatewayRelay();
