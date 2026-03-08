import type { ActionCard } from "@godinez/types";

const API_URL = import.meta.env.VITE_API_URL || "";

export interface SSEHandlers {
  onDelta?: (text: string) => void;
  onDone?: (text: string, messageId?: number, actions?: ActionCard[]) => void;
  onError?: (error: string) => void;
  onStatus?: (status: string) => void;
  onTimeout?: () => void;
}

const INITIAL_DELAY_MS = 600;
const CHARS_PER_SECOND = 55;
const ACCELERATION_FACTOR = 1.08; // 8% speed increase per frame when catching up

export function connectSSE(runId: string, handlers: SSEHandlers, token?: string | null): () => void {
  const url = token
    ? `${API_URL}/api/chat/stream/${runId}?token=${encodeURIComponent(token)}`
    : `${API_URL}/api/chat/stream/${runId}`;
  
  const es = new EventSource(url);
  let closed = false;
  
  // State
  let latestText = "";
  let displayedLength = 0;
  let started = false;
  let animationFrameId: number | null = null;
  let lastFrameTime = 0;
  let charDebt = 0;
  let currentSpeed = CHARS_PER_SECOND;
  
  // Done state
  let doneReceived = false;
  let doneData: { text: string; messageId?: number; actions?: ActionCard[] } | null = null;

  function animateText(timestamp: number) {
    if (closed) return;
    
    // Calculate time delta
    if (lastFrameTime === 0) lastFrameTime = timestamp;
    const deltaMs = timestamp - lastFrameTime;
    lastFrameTime = timestamp;
    
    // Accelerate 8% per frame when done received (smooth catch-up)
    if (doneReceived && displayedLength < latestText.length) {
      currentSpeed *= ACCELERATION_FACTOR;
    }
    
    // Calculate chars to reveal this frame
    const charsThisFrame = (deltaMs / 1000) * currentSpeed + charDebt;
    const wholeChars = Math.floor(charsThisFrame);
    charDebt = charsThisFrame - wholeChars;
    
    if (wholeChars > 0 && displayedLength < latestText.length) {
      displayedLength = Math.min(displayedLength + wholeChars, latestText.length);
      handlers.onDelta?.(latestText.slice(0, displayedLength));
    }
    
    // Check if animation is complete
    if (doneReceived && displayedLength >= latestText.length) {
      closed = true;
      if (doneData) {
        handlers.onDone?.(doneData.text, doneData.messageId, doneData.actions);
      }
      return;
    }
    
    // Keep animating
    animationFrameId = requestAnimationFrame(animateText);
  }

  // Start animation after initial delay
  const startTimeout = setTimeout(() => {
    started = true;
    animationFrameId = requestAnimationFrame(animateText);
  }, INITIAL_DELAY_MS);

  es.addEventListener("delta", (e) => {
    if (closed) return;
    try {
      const { text } = JSON.parse(e.data);
      if (text) {
        latestText = text;
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
        clearTimeout(startTimeout);
        started = true;
        animationFrameId = requestAnimationFrame(animateText);
      }
    } catch {
      closed = true;
    }
    es.close();
  });

  es.addEventListener("error", (e) => {
    if (closed) return;
    closed = true;
    
    clearTimeout(startTimeout);
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
    }
    
    if (e instanceof MessageEvent) {
      try {
        const { error } = JSON.parse(e.data);
        handlers.onError?.(error);
      } catch {
        handlers.onError?.("Connection error");
      }
    } else {
      handlers.onError?.("Connection lost");
    }
    es.close();
  });

  es.addEventListener("open", () => {
    if (closed) es.close();
  });

  return () => {
    closed = true;
    clearTimeout(startTimeout);
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
    }
    es.close();
  };
}
