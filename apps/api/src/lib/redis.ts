/**
 * Upstash Redis client — shared singleton for the API.
 *
 * Uses @upstash/redis which works over HTTP (no persistent TCP connection needed),
 * making it compatible with Railway's serverless-friendly environment.
 *
 * Required env var: REDIS_URL  (format: https://<host>  or  rediss://<host>:<port>)
 * Required env var: REDIS_TOKEN (Upstash REST API token)
 *
 * If REDIS_URL is not set, the client will be null and callers must handle gracefully.
 * This allows the API to boot without Redis (degraded mode — falls back to in-memory).
 */

import { logger } from "./logger";

const log = logger.child({ service: "redis" });

export type StreamEntry = [id: string, fields: string[]];

export interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { ex?: number }): Promise<"OK">;
  del(...keys: string[]): Promise<number>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  ping(): Promise<string>;
  /** Append entry to a Redis Stream. Returns the entry ID. */
  xadd(key: string, id: string, ...fieldValues: string[]): Promise<string>;
  /** Read a range of entries from a Redis Stream. */
  xrange(key: string, start: string, end: string, count?: number): Promise<StreamEntry[]>;
}

let _redis: RedisClient | null = null;
let _initialized = false;

function buildClient(): RedisClient | null {
  const url = process.env.REDIS_URL;
  const token = process.env.REDIS_TOKEN;

  if (!url || !token) {
    log.warn(
      "REDIS_URL or REDIS_TOKEN not set — Redis unavailable, using degraded mode",
    );
    return null;
  }

  // Upstash REST API — no native redis package needed
  async function request(
    command: string[],
  ): Promise<{ result: unknown; error?: string }> {
    const res = await fetch(`${url}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Redis HTTP ${res.status}: ${text}`);
    }
    return res.json() as Promise<{ result: unknown; error?: string }>;
  }

  const client: RedisClient = {
    async get(key) {
      const r = await request(["GET", key]);
      return (r.result as string | null) ?? null;
    },
    async set(key, value, opts) {
      const cmd: string[] = ["SET", key, value];
      if (opts?.ex) cmd.push("EX", String(opts.ex));
      await request(cmd);
      return "OK";
    },
    async del(...keys) {
      const r = await request(["DEL", ...keys]);
      return r.result as number;
    },
    async incr(key) {
      const r = await request(["INCR", key]);
      return r.result as number;
    },
    async expire(key, seconds) {
      const r = await request(["EXPIRE", key, String(seconds)]);
      return r.result as number;
    },
    async ping() {
      const r = await request(["PING"]);
      return r.result as string;
    },
    async xadd(key, id, ...fieldValues) {
      const r = await request(["XADD", key, id, ...fieldValues]);
      return r.result as string;
    },
    async xrange(key, start, end, count) {
      const cmd = ["XRANGE", key, start, end];
      if (count) cmd.push("COUNT", String(count));
      const r = await request(cmd);
      // Upstash returns [[id, [field, value, ...]], ...]
      const raw = r.result as Array<[string, string[]]> | null;
      return (raw ?? []) as StreamEntry[];
    },
  };

  return client;
}

export function getRedis(): RedisClient | null {
  if (!_initialized) {
    _initialized = true;
    _redis = buildClient();
    if (_redis) {
      // Verify connection at startup (non-blocking)
      _redis
        .ping()
        .then(() => log.info("Redis connected ✅"))
        .catch((e: Error) => log.error({ err: e.message }, "Redis ping failed"));
    }
  }
  return _redis;
}

/**
 * Health check — returns true if Redis is reachable.
 */
export async function redisHealthy(): Promise<boolean> {
  const r = getRedis();
  if (!r) return false;
  try {
    await r.ping();
    return true;
  } catch {
    return false;
  }
}
