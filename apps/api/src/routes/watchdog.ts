/**
 * Watchdog API - Endpoints para el agente de monitoreo
 * Autenticación via API key (header X-Watchdog-Key)
 */
import { Hono } from "hono";
import { getUnprocessedErrors, updateErrorClassification, getSystemHealth } from "../dal/errors";

const app = new Hono();

// API Key simple para Watchdog
const WATCHDOG_API_KEY = process.env.WATCHDOG_API_KEY || "watchdog-dev-key-2026";

// Middleware de autenticación
app.use("*", async (c, next) => {
  const apiKey = c.req.header("X-Watchdog-Key");
  if (apiKey !== WATCHDOG_API_KEY) {
    return c.json({ error: "Unauthorized", code: "INVALID_API_KEY" }, 401);
  }
  await next();
});

// GET /api/watchdog/health - Estado del sistema
app.get("/health", async (c) => {
  const health = await getSystemHealth();
  return c.json(health);
});

// GET /api/watchdog/errors/unprocessed - Errores sin clasificar
app.get("/errors/unprocessed", async (c) => {
  const limit = parseInt(c.req.query("limit") || "50");
  const errors = await getUnprocessedErrors(limit);
  return c.json({ errors, count: errors.length });
});

// PATCH /api/watchdog/errors/:id - Clasificar error
app.patch("/errors/:id", async (c) => {
  const id = parseInt(c.req.param("id"));
  const body = await c.req.json();
  const { code, priority, metadata } = body;
  
  const updated = await updateErrorClassification(id, { code, priority, metadata });
  return c.json(updated);
});

export default app;


