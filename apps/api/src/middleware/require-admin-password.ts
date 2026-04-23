import { createMiddleware } from "hono/factory";
import { timingSafeEqual } from "node:crypto";

export const requireAdminPassword = createMiddleware(async (c, next) => {
  const provided = c.req.header("X-Admin-Password");
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected) {
    return c.json({ error: "Admin password not configured" }, 503);
  }

  if (!provided) {
    return c.json({ error: "Missing X-Admin-Password header" }, 401);
  }

  const providedBuf = Buffer.from(provided);
  const expectedBuf = Buffer.from(expected);

  if (
    providedBuf.length !== expectedBuf.length ||
    !timingSafeEqual(providedBuf, expectedBuf)
  ) {
    return c.json({ error: "Invalid admin password" }, 401);
  }

  await next();
});
