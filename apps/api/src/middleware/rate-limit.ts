/**
 * Simple in-memory rate limiter
 * For production scale, use Redis-based solution
 */
import type { Context, Next } from "hono";
import { Errors } from "../lib/errors";
import { logger } from "../lib/logger";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store (use Redis in production for multi-instance)
const store = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

interface RateLimitOptions {
  windowMs: number;  // Time window in milliseconds
  max: number;       // Max requests per window
  keyGenerator?: (c: Context) => string;
}

/**
 * Create rate limit middleware
 */
export function rateLimit(options: RateLimitOptions) {
  const { windowMs, max, keyGenerator } = options;

  return async (c: Context, next: Next) => {
    // Generate key (default: IP address)
    const key = keyGenerator 
      ? keyGenerator(c) 
      : c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";

    const now = Date.now();
    let entry = store.get(key);

    // Reset if window expired
    if (!entry || entry.resetAt < now) {
      entry = { count: 0, resetAt: now + windowMs };
      store.set(key, entry);
    }

    entry.count++;

    // Set rate limit headers
    const remaining = Math.max(0, max - entry.count);
    c.header("X-RateLimit-Limit", String(max));
    c.header("X-RateLimit-Remaining", String(remaining));
    c.header("X-RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));

    // Check if exceeded
    if (entry.count > max) {
      logger.warn({ key, count: entry.count, max }, "Rate limit exceeded");
      throw Errors.rateLimitExceeded();
    }

    await next();
  };
}

// Preset configurations
export const rateLimits = {
  // General: 100 requests per minute (backward compat alias)
  general: rateLimit({ windowMs: 60 * 1000, max: 100 }),
  
  // Standard API: 100 requests per minute
  standard: rateLimit({ windowMs: 60 * 1000, max: 100 }),
  
  // Chat/SSE: 30 requests per minute (more expensive)
  chat: rateLimit({ windowMs: 60 * 1000, max: 30 }),
  
  // Auth: 10 requests per minute (prevent brute force)
  auth: rateLimit({ windowMs: 60 * 1000, max: 10 }),
  
  // Hackathon actions: 60 per minute
  hackathon: rateLimit({ windowMs: 60 * 1000, max: 60 }),
};

// Alias for backward compatibility
export { rateLimits as rateLimiters };
