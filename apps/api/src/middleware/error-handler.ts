import type { Context, Next } from "hono";
import { isAppError, formatErrorResponse, AppError } from "../lib/errors";
import { logger } from "../lib/logger";

/**
 * Global error handling middleware
 * Catches all errors and returns user-friendly responses
 */
export async function errorHandler(c: Context, next: Next) {
  try {
    await next();
  } catch (error) {
    const response = formatErrorResponse(error);
    const statusCode = isAppError(error) ? error.statusCode : 500;

    // Log the error with full context
    logger.error({
      error: error instanceof Error ? error.message : "Unknown error",
      code: response.code,
      statusCode,
      path: c.req.path,
      method: c.req.method,
      details: response.details,
      stack: error instanceof Error ? error.stack : undefined,
    }, "Request error");

    return c.json(response, statusCode as any);
  }
}

/**
 * Not found handler for undefined routes
 */
export function notFoundHandler(c: Context) {
  return c.json({
    error: "La página que buscas no existe",
    code: "NOT_FOUND",
    message: `Route ${c.req.path} not found`,
  }, 404);
}
