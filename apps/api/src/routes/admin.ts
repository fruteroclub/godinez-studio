import { Hono } from "hono";
import type { AuthEnv } from "../types";
import { requireAuth } from "../middleware/auth";
import { resolveUser } from "../middleware/resolve-user";
import { requireAdmin } from "../middleware/require-admin";

const app = new Hono<AuthEnv>();

app.use("*", requireAuth, resolveUser, requireAdmin);

app.get("/", (c) => {
  return c.json({ message: "admin ok" });
});

export default app;
