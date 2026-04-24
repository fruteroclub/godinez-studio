import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  AgentcampCheckoutError,
  createAgentcampCheckoutSession,
} from "../services/agentcamp-checkout";

const app = new Hono();

const checkoutRequestSchema = z.object({
  cancelUrl: z.string().url(),
  checkoutSource: z.string().min(1),
  locale: z.enum(["en", "es"]),
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

      throw error;
    }
  },
);

export default app;
