import { createMiddleware } from "hono/factory";
import { verifyToken } from "@clerk/backend";
import type { AuthEnv } from "../types";

export const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const token =
    c.req.header("Authorization")?.replace("Bearer ", "") ||
    c.req.query("token"); // fallback for EventSource (SSE can't send headers)
  if (!token) return c.json({ error: "Unauthorized" }, 401);

  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    });
    c.set("clerkUserId", payload.sub);
    await next();
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }
});
