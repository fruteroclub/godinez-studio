/**
 * Microsoft Clarity - Heatmaps, Session Recordings, Click Tracking
 * https://clarity.microsoft.com
 */

const clarityId = import.meta.env.VITE_CLARITY_ID;

export function initClarity() {
  if (!clarityId || typeof window === "undefined") return;

  // Prevent double initialization
  if ((window as unknown as { clarity?: unknown }).clarity) return;

  (function (c: Window, l: Document, a: string, r: string, i: string) {
    const w = c as unknown as { [key: string]: unknown };
    w[a] =
      w[a] ||
      function (...args: unknown[]) {
        (w[a] as { q?: unknown[] }).q = (w[a] as { q?: unknown[] }).q || [];
        (w[a] as { q: unknown[] }).q.push(args);
      };
    const t = l.createElement(r) as HTMLScriptElement;
    t.async = true;
    t.src = "https://www.clarity.ms/tag/" + i;
    const y = l.getElementsByTagName(r)[0];
    y.parentNode?.insertBefore(t, y);
  })(window, document, "clarity", "script", clarityId);
}

export function clarityIdentify(userId: string, sessionId?: string, customData?: Record<string, string>) {
  if (!clarityId || typeof window === "undefined") return;
  const w = window as unknown as { clarity?: (...args: unknown[]) => void };
  if (w.clarity) {
    w.clarity("identify", userId, sessionId, undefined, customData);
  }
}

export function claritySetTag(key: string, value: string) {
  if (!clarityId || typeof window === "undefined") return;
  const w = window as unknown as { clarity?: (...args: unknown[]) => void };
  if (w.clarity) {
    w.clarity("set", key, value);
  }
}
