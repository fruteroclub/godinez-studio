import { Hono } from "hono";
import type { AuthEnv } from "../types";
import { requireAuth } from "../middleware/auth";
import { resolveUser } from "../middleware/resolve-user";
import { getUserById } from "../dal/users";

const app = new Hono<AuthEnv>();

app.use("*", requireAuth, resolveUser);

app.get("/me", async (c) => {
  const userId = c.get("userId");
  const user = await getUserById(userId);
  if (!user) return c.json({ error: "User not found" }, 404);

  return c.json({
    id: user.id,
    email: user.email,
    role: user.role ?? "user",
    name: user.name ?? null,
  });
});

export default app;
