import { Hono } from "hono";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { pool } from "../services/gateway-pool";

const health = new Hono();

const startedAt = Date.now();

health.get("/", async (c) => {
  // DB probe
  let dbStatus: "ok" | "error" = "error";
  try {
    await db.execute(sql`SELECT 1`);
    dbStatus = "ok";
  } catch {
    // leave as error
  }

  // Gateway pool — check if any relay is connected
  let gatewayStatus: "connected" | "disconnected" = "disconnected";
  try {
    gatewayStatus = pool.hasConnectedRelays() ? "connected" : "disconnected";
  } catch {
    // leave as disconnected
  }

  const uptimeMs = Date.now() - startedAt;
  const status = dbStatus === "ok" ? "ok" : "degraded";
  const httpStatus = dbStatus === "ok" ? 200 : 503;

  return c.json({ status, db: dbStatus, gateway: gatewayStatus, uptime: uptimeMs }, httpStatus);
});

health.get("/stats", async (c) => {
  c.header("Access-Control-Allow-Origin", "*");
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(sql`agents`);
  return c.json({ activeAgents: result?.count ?? 0 });
});

export default health;
