import { createMiddleware } from "hono/factory";

export const requireServiceKey = createMiddleware(async (c, next) => {
  const key = c.req.header("X-Service-Key");
  const expected = process.env.STUDIO_SERVICE_KEY;

  if (!expected) {
    return c.json({ error: "Service key not configured" }, 503);
  }

  if (!key || key !== expected) {
    return c.json({ error: "Invalid service key" }, 401);
  }

  await next();
});
