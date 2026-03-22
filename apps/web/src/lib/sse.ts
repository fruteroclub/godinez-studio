import type { ActionCard } from "@godinez/types";

const API_URL = import.meta.env.VITE_API_URL || "";

export interface SSEHandlers {
  onDelta?: (text: string) => void;
  onDone?: (text: string, messageId?: number, actions?: ActionCard[]) => void;
  onError?: (error: string) => void;
  onStatus?: (status: "connecting" | "connected" | "reconnecting" | "error") => void;
  onTimeout?: () => void;
}

const INITIAL_DELAY_MS = 600;
const CHARS_PER_SECOND = 55;
const ACCELERATION_FACTOR = 1.08;

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // 1s, 2s, 4s
const STREAM_TIMEOUT_MS = 90_000; // 90 seconds without data = timeout

export function connectSSE(runId: string, handlers: SSEHandlers, token?: string | null): () => void {
  const url = token
    ? `${API_URL}/api/chat/stream/${runId}?token=${encodeURIComponent(token)}`
    : `${API_URL}/api/chat/stream/${runId}`;
  
  let closed = false;
  let retryCount = 0;
  let es: EventSource | null = null;
  let timeoutTimer: ReturnType<typeof setTimeout> | null = null;
  let lastDataTime = Date.now();
  
  // Animation state
  let latestText = "";
  let displayedLength = 0;
  let started = false;
  let animationFrameId: number | null = null;
  let lastFrameTime = 0;
  let charDebt = 0;
  let currentSpeed = CHARS_PER_SECOND;
  let startTimeout: ReturnType<typeof setTimeout> | null = null;
  
  // Done state
  let doneReceived = false;
  let doneData: { text: string; messageId?: number; actions?: ActionCard[] } | null = null;

  function resetTimeout() {
    lastDataTime = Date.now();
    if (timeoutTimer) clearTimeout(timeoutTimer);
    timeoutTimer = setTimeout(checkTimeout, 10_000); // Check every 10s
  }

  function checkTimeout() {
    if (closed) return;
    const elapsed = Date.now() - lastDataTime;
    if (elapsed >= STREAM_TIMEOUT_MS) {
      handlers.onTimeout?.();
      handlers.onStatus?.("error");
      cleanup();
      handlers.onError?.("Stream timeout - no data received");
    } else {
      timeoutTimer = setTimeout(checkTimeout, 10_000);
    }
  }

  function animateText(timestamp: number) {
    if (closed) return;
    
    if (lastFrameTime === 0) lastFrameTime = timestamp;
    const deltaMs = timestamp - lastFrameTime;
    lastFrameTime = timestamp;
    
    if (doneReceived && displayedLength < latestText.length) {
      currentSpeed *= ACCELERATION_FACTOR;
    }
    
    const charsThisFrame = (deltaMs / 1000) * currentSpeed + charDebt;
    const wholeChars = Math.floor(charsThisFrame);
    charDebt = charsThisFrame - wholeChars;
    
    if (wholeChars > 0 && displayedLength < latestText.length) {
      displayedLength = Math.min(displayedLength + wholeChars, latestText.length);
      handlers.onDelta?.(latestText.slice(0, displayedLength));
    }
    
    if (doneReceived && displayedLength >= latestText.length) {
      closed = true;
      if (doneData) {
        handlers.onDone?.(doneData.text, doneData.messageId, doneData.actions);
      }
      return;
    }
    
    animationFrameId = requestAnimationFrame(animateText);
  }

  function cleanup() {
    closed = true;
    if (startTimeout) clearTimeout(startTimeout);
    if (timeoutTimer) clearTimeout(timeoutTimer);
    if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
    if (es) es.close();
  }

  function connect() {
    if (closed) return;

    es = new EventSource(url);
    handlers.onStatus?.(retryCount > 0 ? "reconnecting" : "connecting");
    resetTimeout();

    es.addEventListener("open", () => {
      if (closed) {
        es?.close();
        return;
      }
      retryCount = 0; // Reset retry count on successful connection
      handlers.onStatus?.("connected");
      resetTimeout();
    });

    es.addEventListener("keepalive", () => {
      resetTimeout();
    });

    es.addEventListener("delta", (e) => {
      if (closed) return;
      resetTimeout();
      try {
        const { text } = JSON.parse(e.data);
        if (text) {
          latestText = text;
          
          // Start animation if not started
          if (!started) {
            if (startTimeout) clearTimeout(startTimeout);
            startTimeout = setTimeout(() => {
              started = true;
              animationFrameId = requestAnimationFrame(animateText);
            }, INITIAL_DELAY_MS);
          }
        }
      } catch {
        // Invalid JSON
      }
    });

    es.addEventListener("done", (e) => {
      if (closed) return;
      
      try {
        const { text, messageId, actions } = JSON.parse(e.data);
        latestText = text;
        doneData = { text, messageId, actions };
        doneReceived = true;
        
        if (!started) {
          if (startTimeout) clearTimeout(startTimeout);
          started = true;
          animationFrameId = requestAnimationFrame(animateText);
        }
      } catch {
        closed = true;
      }
      es?.close();
    });

    es.addEventListener("error", (e) => {
      if (closed) return;
      
      es?.close();
      
      // Check if we should retry
      if (retryCount < MAX_RETRIES && !doneReceived) {
        retryCount++;
        handlers.onStatus?.("reconnecting");
        const delay = RETRY_DELAYS[retryCount - 1] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
        
        setTimeout(() => {
          if (!closed) connect();
        }, delay);
        return;
      }
      
      // Max retries reached or done was already received
      closed = true;
      if (startTimeout) clearTimeout(startTimeout);
      if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
      
      handlers.onStatus?.("error");
      
      if (e instanceof MessageEvent) {
        try {
          const { error } = JSON.parse(e.data);
          handlers.onError?.(error);
        } catch {
          handlers.onError?.("Connection error");
        }
      } else {
        handlers.onError?.(`Connection lost after ${retryCount} retries`);
      }
    });
  }

  // Start initial connection
  connect();

  return cleanup;
}
