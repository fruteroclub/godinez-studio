import { Hono } from "hono";
import { createClerkClient } from "@clerk/backend";
import type Stripe from "stripe";
import type { AuthEnv } from "../types";
import { stripe } from "../lib/stripe";
import { requireAuth } from "../middleware/auth";
import { resolveUser } from "../middleware/resolve-user";
import { resolveAccount } from "../middleware/resolve-account";
import {
  createAccount,
  updateAccountSubscription,
} from "../dal/accounts";
import { upsertUser, getUserByEmail } from "../dal/users";
import { getWorkspacesByUserId } from "../dal/workspaces";
import { logger } from "../lib/logger";
import { hasStudioAccess } from "../lib/account-access";

const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!,
});

const billing = new Hono<AuthEnv>();

// ─── AUTH REQUIRED: Billing Status (for decision gate) ─────────────────────
// Returns the user's current billing + workspace state so the frontend can
// decide where to route: checkout, onboarding, studio, or paywall.
billing.get(
  "/status",
  requireAuth,
  resolveUser,
  resolveAccount,
  async (c) => {
    const userId = c.get("userId");
    const account = c.get("account");
    const workspaces = await getWorkspacesByUserId(userId);
    const firstWorkspace = workspaces[0];

    const billingEnabled = process.env.BILLING_ENABLED === "true";
    const subscriptionStatus = account.subscriptionStatus;
    const hasActiveSubscription = !billingEnabled || hasStudioAccess(account);

    return c.json({
      authenticated: true,
      hasAccount: true,
      subscriptionStatus,
      hasActiveSubscription,
      hasWorkspace: workspaces.length > 0,
      workspaceSlug: firstWorkspace?.slug ?? null,
      billingEnabled,
    });
  },
);

// ─── PUBLIC: Create Checkout Session ────────────────────────────────────────
billing.post("/checkout", async (c) => {
  if (!stripe) return c.json({ error: "Billing not configured" }, 503);

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [{ price: process.env.STRIPE_GODINEZ_PERSONAL_PRICE_ID!, quantity: 1 }],
    mode: "subscription",
    success_url: process.env.STRIPE_SUCCESS_URL!,
    cancel_url: process.env.STRIPE_CANCEL_URL!,
  });

  return c.json({ url: session.url });
});

// ─── AUTH REQUIRED: Customer Portal ─────────────────────────────────────────
billing.get(
  "/portal",
  requireAuth,
  resolveUser,
  resolveAccount,
  async (c) => {
    if (!stripe) return c.json({ error: "Billing not configured" }, 503);

    const account = c.get("account");

    if (!account.stripeCustomerId) {
      return c.json({ error: "No active subscription" }, 400);
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: account.stripeCustomerId,
      return_url: process.env.STRIPE_SUCCESS_URL!,
    });

    return c.json({ url: session.url });
  },
);

// ─── PUBLIC: Stripe Webhook ──────────────────────────────────────────────────
// Must receive raw body — do NOT add JSON parsing middleware before this route
billing.post("/webhook", async (c) => {
  if (!stripe) return c.json({ error: "Billing not configured" }, 503);
  const billingWebhookSecret =
    process.env.STRIPE_BILLING_WEBHOOK_SECRET ?? process.env.STRIPE_WEBHOOK_SECRET;
  if (!billingWebhookSecret) {
    return c.json({ error: "Billing webhook secret not configured" }, 503);
  }

  const sig = c.req.header("stripe-signature");
  if (!sig) return c.json({ error: "Missing signature" }, 400);

  let event: Stripe.Event;
  try {
    const body = await c.req.text();
    event = await stripe.webhooks.constructEventAsync(
      body,
      sig,
      billingWebhookSecret,
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return c.json({ error: "Invalid signature" }, 400);
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== "subscription") {
        logger.info(
          { sessionId: session.id, mode: session.mode },
          "ignoring non-subscription checkout completion on billing webhook",
        );
        break;
      }

      await handleCheckoutCompleted(session);
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId =
        typeof invoice.customer === "string"
          ? invoice.customer
          : invoice.customer?.id;
      if (customerId) {
        await updateAccountSubscription(customerId, {
          subscriptionStatus: "past_due",
        });
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId =
        typeof sub.customer === "string"
          ? sub.customer
          : sub.customer?.id;
      if (customerId) {
        await updateAccountSubscription(customerId, {
          subscriptionStatus: "cancelled",
        });
      }
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId =
        typeof sub.customer === "string"
          ? sub.customer
          : sub.customer?.id;
      if (customerId) {
        const periodEnd = sub.items.data[0]?.current_period_end;
        const statusMap: Record<string, string> = {
          active: "active",
          trialing: "trialing",
          past_due: "past_due",
          canceled: "cancelled",
          unpaid: "past_due",
        };
        const subscriptionStatus = statusMap[sub.status] ?? "past_due";
        await updateAccountSubscription(customerId, {
          subscriptionStatus,
          ...(periodEnd ? { currentPeriodEnd: new Date(periodEnd * 1000) } : {}),
        });
      }
      break;
    }

    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId =
        typeof invoice.customer === "string"
          ? invoice.customer
          : invoice.customer?.id;
      if (customerId) {
        await updateAccountSubscription(customerId, {
          subscriptionStatus: "active",
        });
      }
      break;
    }
  }

  return c.json({ received: true });
});

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const email = session.customer_details?.email;
  const customerId = session.customer as string;
  if (!email || !customerId) {
    logger.error(
      { sessionId: session.id },
      "checkout.session.completed missing email or customer",
    );
    return;
  }

  // 1. Check if user already exists in DB by email (authenticated app flow)
  let dbUser = await getUserByEmail(email);

  if (!dbUser) {
    // New user via landing page — create in Clerk then DB
    let clerkUser;
    try {
      clerkUser = await clerk.users.createUser({
        emailAddress: [email],
        skipPasswordRequirement: true,
      });
    } catch (err: unknown) {
      const clerkErr = err as { errors?: Array<{ code: string }> };
      if (clerkErr.errors?.some((e) => e.code === "form_identifier_exists")) {
        const existing = await clerk.users.getUserList({
          emailAddress: [email],
        });
        clerkUser = existing.data[0];
      } else {
        logger.error({ err, email }, "Failed to create Clerk user");
        throw err;
      }
    }

    if (!clerkUser) {
      logger.error({ email }, "Could not create or find Clerk user");
      return;
    }

    dbUser = await upsertUser({
      clerkId: clerkUser.id,
      email,
      name:
        [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
        undefined,
      avatarUrl: clerkUser.imageUrl ?? undefined,
    });
  }

  // 3. Create account with active subscription
  await createAccount(dbUser.id, customerId);

  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : undefined;

  if (subscriptionId && stripe) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const periodEnd = subscription.items.data[0]?.current_period_end;
    const statusMap: Record<string, string> = {
      active: "active",
      trialing: "trialing",
      past_due: "past_due",
      canceled: "cancelled",
      unpaid: "past_due",
    };
    await updateAccountSubscription(customerId, {
      subscriptionId: subscription.id,
      subscriptionStatus: statusMap[subscription.status] ?? "active",
      subscriptionTier: "godinez_personal",
      ...(periodEnd ? { currentPeriodEnd: new Date(periodEnd * 1000) } : {}),
    });
  } else {
    await updateAccountSubscription(customerId, {
      subscriptionStatus: "active",
      subscriptionTier: "godinez_personal",
    });
  }

  logger.info(
    { email, customerId, userId: dbUser.id },
    "checkout completed, account created",
  );
}

export default billing;
