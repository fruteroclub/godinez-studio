const API_URL = import.meta.env.VITE_API_URL || "";

export interface SSEHandlers {
  onDelta?: (text: string) => void;
  onDone?: (text: string, messageId?: number) => void;
  onError?: (error: string) => void;
}

export function connectSSE(runId: string, handlers: SSEHandlers): () => void {
  const es = new EventSource(`${API_URL}/api/chat/stream/${runId}`);

  es.addEventListener("delta", (e) => {
    const { text } = JSON.parse(e.data);
    handlers.onDelta?.(text);
  });

  es.addEventListener("done", (e) => {
    const { text, messageId } = JSON.parse(e.data);
    handlers.onDone?.(text, messageId);
    es.close();
  });

  es.addEventListener("error", (e) => {
    if (e instanceof MessageEvent) {
      const { error } = JSON.parse(e.data);
      handlers.onError?.(error);
    } else {
      handlers.onError?.("Connection lost");
    }
    es.close();
  });

  return () => es.close();
}
