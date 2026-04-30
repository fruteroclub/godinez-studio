import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  AgentcampCheckoutError,
  createAgentcampCheckoutSession,
} from "../services/agentcamp-checkout";
import { logger } from "../lib/logger";

const app = new Hono();

const checkoutRequestSchema = z.object({
  cancelUrl: z.string().url(),
  checkoutSource: z.string().min(1),
  locale: z.enum(["en", "es"]),
  referralCode: z.string().optional(),
  successUrl: z.string().url(),
});

app.post(
  "/checkout",
  zValidator("json", checkoutRequestSchema),
  async (c) => {
    try {
      const payload = c.req.valid("json");
      const result = await createAgentcampCheckoutSession(payload);
      return c.json(result);
    } catch (error) {
      if (error instanceof AgentcampCheckoutError) {
        return c.json(
          {
            error: error.code,
            message: error.message,
          },
          error.status as 409 | 502 | 503,
        );
      }

      const message = error instanceof Error ? error.message : String(error);
      const cause = error instanceof Error && error.cause
        ? (error.cause instanceof Error ? error.cause.message : String(error.cause))
        : undefined;
      const stack = error instanceof Error ? error.stack : undefined;
      logger.error({ err: message, cause, stack }, "agentcamp checkout unhandled error");

      return c.json(
        {
          error: "checkout_failed",
          message: `Checkout error: ${message}`,
          cause: cause ?? null,
        },
        500,
      );
    }
  },
);

export default app;
