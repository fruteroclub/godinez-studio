import type { MiddlewareHandler } from "hono";
import { logger, generateRequestId } from "../lib/logger";

declare module "hono" {
  interface ContextVariableMap {
    requestId: string;
    log: typeof logger;
  }
}

export const requestLogger: MiddlewareHandler = async (c, next) => {
  const requestId = generateRequestId();
  const log = logger.child({ requestId });
  c.set("requestId", requestId);
  c.set("log", log);

  const start = Date.now();
  await next();
  const duration = Date.now() - start;

  const status = c.res.status;
  const method = c.req.method;
  const path = c.req.path;

  if (status >= 500) {
    log.error({ method, path, status, duration }, "request error");
  } else if (status >= 400) {
    log.warn({ method, path, status, duration }, "request client error");
  } else {
    log.info({ method, path, status, duration }, "request");
  }
};
