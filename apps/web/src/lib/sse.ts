import type { ActionCard } from "@godinez/types";

const API_URL = import.meta.env.VITE_API_URL || "";

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000];
const INACTIVITY_TIMEOUT_MS = 60_000;

export interface SSEHandlers {
  onDelta?: (text: string) => void;
  onDone?: (text: string, messageId?: number, actions?: ActionCard[]) => void;
  onError?: (error: string) => void;
  onStatus?: (status: "connected" | "reconnecting" | "disconnected") => void;
  onTimeout?: () => void;
}

export function connectSSE(
  runId: string,
  handlers: SSEHandlers,
  token?: string | null,
): () => void {
  let attempt = 0;
  let es: EventSource | null = null;
  let closed = false;
  let inactivityTimer: ReturnType<typeof setTimeout> | null = null;
  let lastText = "";

  function resetInactivityTimer() {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
      handlers.onTimeout?.();
    }, INACTIVITY_TIMEOUT_MS);
  }

  function cleanup() {
    closed = true;
    if (inactivityTimer) clearTimeout(inactivityTimer);
    es?.close();
    es = null;
  }

  function connect() {
    if (closed) return;

    const url = token
      ? `${API_URL}/api/chat/stream/${runId}?token=${encodeURIComponent(token)}`
      : `${API_URL}/api/chat/stream/${runId}`;
    es = new EventSource(url);

    es.addEventListener("open", () => {
      attempt = 0;
      handlers.onStatus?.("connected");
      resetInactivityTimer();
    });

    es.addEventListener("delta", (e) => {
      resetInactivityTimer();
      const { text } = JSON.parse(e.data);
      lastText = text;
      handlers.onDelta?.(text);
    });

    es.addEventListener("done", (e) => {
      const { text, messageId, actions } = JSON.parse(e.data);
      handlers.onDone?.(text, messageId, actions);
      cleanup();
    });

    es.addEventListener("keepalive", () => {
      resetInactivityTimer();
    });

    es.addEventListener("error", (e) => {
      if (closed) return;

      // Server-sent error event (has data)
      if (e instanceof MessageEvent) {
        const { error } = JSON.parse(e.data);
        handlers.onError?.(error);
        cleanup();
        return;
      }

      // Connection drop — try to reconnect
      es?.close();
      es = null;

      if (attempt < MAX_RETRIES) {
        handlers.onStatus?.("reconnecting");
        const delay = RETRY_DELAYS[attempt] ?? RETRY_DELAYS[RETRY_DELAYS.length - 1];
        attempt++;
        setTimeout(connect, delay);
      } else {
        // If we had partial text, deliver it as done (server likely saved it)
        if (lastText) {
          handlers.onDone?.(lastText);
        } else {
          handlers.onError?.("Connection lost");
        }
        handlers.onStatus?.("disconnected");
        cleanup();
      }
    });
  }

  connect();
  return () => cleanup();
}
