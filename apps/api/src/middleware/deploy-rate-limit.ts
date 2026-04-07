/**
 * Per-user rate limiting for deploy endpoints.
 * Max 3 deploy requests per user per 60-second window.
 * In-memory store with TTL cleanup.
 */
import type { Context, Next } from "hono";
import { logger } from "../lib/logger";

interface DeployRateLimitEntry {
  count: number;
  resetAt: number;
}

const WINDOW_MS = 60 * 1000; // 60 seconds
const MAX_REQUESTS = 3;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// Per-user in-memory store
const store = new Map<string, DeployRateLimitEntry>();

// Periodic cleanup of expired entries
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  }
}, CLEANUP_INTERVAL_MS);

/**
 * Deploy rate limit middleware.
 * Requires auth middleware to have run first (reads clerkUserId from context).
 * Falls back to IP-based keying if no user ID is available.
 */
export function deployRateLimit() {
  return async (c: Context, next: Next) => {
    const userId =
      c.get("clerkUserId") as string | undefined ??
      c.req.header("x-forwarded-for") ??
      c.req.header("x-real-ip") ??
      "unknown";

    const key = `deploy:${userId}`;
    const now = Date.now();

    let entry = store.get(key);

    if (!entry || entry.resetAt < now) {
      entry = { count: 0, resetAt: now + WINDOW_MS };
      store.set(key, entry);
    }

    entry.count++;

    // Set standard rate limit headers
    const remaining = Math.max(0, MAX_REQUESTS - entry.count);
    c.header("X-RateLimit-Limit", String(MAX_REQUESTS));
    c.header("X-RateLimit-Remaining", String(remaining));
    c.header("X-RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > MAX_REQUESTS) {
      const retryAfterMs = entry.resetAt - now;

      logger.warn(
        { userId, count: entry.count, max: MAX_REQUESTS, retryAfterMs },
        "Deploy rate limit exceeded",
      );

      return c.json(
        {
          ok: false,
          error: "RATE_LIMITED",
          retryAfterMs,
          message:
            "Tu solicitud está siendo procesada. Hay alto tráfico en la plataforma.",
        },
        429,
      );
    }

    await next();
  };
}
