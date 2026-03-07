import { createMiddleware } from "hono/factory";
import type { AuthEnv } from "../types";
import { getUserById } from "../dal/users";

export const requireAdmin = createMiddleware<AuthEnv>(async (c, next) => {
  const userId = c.get("userId");
  const user = await getUserById(userId);

  if (!user || user.role !== "admin") {
    return c.json({ error: "admin_required" }, 403);
  }

  await next();
});
