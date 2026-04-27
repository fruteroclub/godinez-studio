import { Hono } from "hono";
import type Stripe from "stripe";
import { stripe } from "../lib/stripe";
import {
  reconcileAgentcampCheckoutCompleted,
  reconcileAgentcampCheckoutExpired,
} from "../services/agentcamp-reconcile";

const app = new Hono();

app.post("/stripe/webhook", async (c) => {
  if (!stripe) {
    return c.json({ error: "Billing not configured" }, 503);
  }
  const agentcampWebhookSecret =
    process.env.STRIPE_AGENTCAMP_WEBHOOK_SECRET ?? process.env.STRIPE_WEBHOOK_SECRET;
  if (!agentcampWebhookSecret) {
    return c.json({ error: "AgentCamp webhook secret not configured" }, 503);
  }

  const signature = c.req.header("stripe-signature");
  if (!signature) {
    return c.json({ error: "Missing signature" }, 400);
  }

  let event: Stripe.Event;
  try {
    const payload = await c.req.text();
    event = await stripe.webhooks.constructEventAsync(
      payload,
      signature,
      agentcampWebhookSecret,
    );
  } catch {
    return c.json({ error: "Invalid signature" }, 400);
  }

  switch (event.type) {
    case "checkout.session.completed":
      await reconcileAgentcampCheckoutCompleted(
        event.data.object as Stripe.Checkout.Session,
      );
      break;
    case "checkout.session.expired":
      await reconcileAgentcampCheckoutExpired(
        event.data.object as Stripe.Checkout.Session,
      );
      break;
    default:
      break;
  }

  return c.json({ received: true });
});

export default app;
