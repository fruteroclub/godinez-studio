/**
 * Error Observatory Routes - Simplified v2
 * Endpoints básicos, sin lógica de negocio compleja
 */
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  logError,
  getErrors,
  resolveError,
  deleteError,
  getSystemHealth,
  getDashboardSummary,
  createFeedback,
  getFeedback,
  updateFeedbackStatus,
  deleteFeedback,
} from "../dal/errors";

const app = new Hono();

// Health & Dashboard
app.get("/health", async (c) => {
  const health = await getSystemHealth();
  return c.json(health);
});

app.get("/dashboard", async (c) => {
  const summary = await getDashboardSummary();
  return c.json(summary);
});

// Errors CRUD
app.get("/", async (c) => {
  const resolved = c.req.query("resolved");
  const errors = await getErrors({
    resolved: resolved !== undefined ? resolved === "true" : undefined,
  });
  return c.json(errors);
});

app.post(
  "/",
  zValidator(
    "json",
    z.object({
      code: z.string(),
      message: z.string(),
      userMessage: z.string(),
      priority: z.enum(["P0", "P1", "P2", "P3"]).optional(),
      userId: z.string().optional(),
      path: z.string().optional(),
      metadata: z.record(z.unknown()).optional(),
    })
  ),
  async (c) => {
    const data = c.req.valid("json");
    const error = await logError(data);
    return c.json(error, 201);
  }
);

app.patch("/:id/resolve", async (c) => {
  const id = parseInt(c.req.param("id"));
  const resolved = await resolveError(id, "admin");
  return c.json(resolved);
});

app.delete("/:id", async (c) => {
  const id = parseInt(c.req.param("id"));
  await deleteError(id);
  return c.json({ success: true });
});

// Feedback CRUD
app.get("/feedback", async (c) => {
  const list = await getFeedback();
  return c.json(list);
});

app.post(
  "/feedback",
  zValidator(
    "json",
    z.object({
      type: z.enum(["bug", "feature", "comment"]),
      message: z.string(),
      email: z.string().email().optional(),
    })
  ),
  async (c) => {
    const data = c.req.valid("json");
    const fb = await createFeedback(data);
    return c.json(fb, 201);
  }
);

app.patch("/feedback/:id", async (c) => {
  const id = parseInt(c.req.param("id"));
  const { status } = await c.req.json();
  const updated = await updateFeedbackStatus(id, status);
  return c.json(updated);
});

app.delete("/feedback/:id", async (c) => {
  const id = parseInt(c.req.param("id"));
  const deleted = await deleteFeedback(id);
  return c.json({ success: true, deleted });
});

export default app;
