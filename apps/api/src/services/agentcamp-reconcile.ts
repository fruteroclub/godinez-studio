import { createClerkClient } from "@clerk/backend";
import type Stripe from "stripe";
import { createAccount } from "../dal/accounts";
import {
  attachAgentcampRegistrationToStudioAccount,
  markAgentcampRegistrationExpired,
  markAgentcampRegistrationPaid,
} from "../dal/agentcamp-registrations";
import { upsertUser } from "../dal/users";
import { logger } from "../lib/logger";

const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!,
});

function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? null;
}

function getStripeCustomerId(session: Stripe.Checkout.Session) {
  if (typeof session.customer === "string") {
    return session.customer;
  }

  return session.customer?.id ?? null;
}

function getStripePaymentIntentId(session: Stripe.Checkout.Session) {
  if (typeof session.payment_intent === "string") {
    return session.payment_intent;
  }

  return session.payment_intent?.id ?? null;
}

async function findOrCreateClerkUser(email: string) {
  try {
    return await clerk.users.createUser({
      emailAddress: [email],
      skipPasswordRequirement: true,
    });
  } catch (error: unknown) {
    const clerkError = error as { errors?: Array<{ code: string }> };
    if (clerkError.errors?.some((entry) => entry.code === "form_identifier_exists")) {
      const existingUsers = await clerk.users.getUserList({
        emailAddress: [email],
      });
      return existingUsers.data[0];
    }

    logger.error({ error, email }, "failed to create Clerk user for AgentCamp");
    throw error;
  }
}

export async function reconcileAgentcampCheckoutCompleted(
  session: Stripe.Checkout.Session,
) {
  const email = normalizeEmail(session.customer_details?.email);
  if (!email) {
    logger.error(
      { sessionId: session.id },
      "agentcamp checkout completed without customer email",
    );
    return;
  }

  const clerkUser = await findOrCreateClerkUser(email);
  if (!clerkUser) {
    logger.error(
      { email, sessionId: session.id },
      "agentcamp checkout could not resolve Clerk user",
    );
    return;
  }

  const dbUser = await upsertUser({
    clerkId: clerkUser.id,
    email,
    name:
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
      session.customer_details?.name ||
      undefined,
    avatarUrl: clerkUser.imageUrl ?? undefined,
  });

  const stripeCustomerId = getStripeCustomerId(session);
  const account = await createAccount(dbUser.id, stripeCustomerId ?? undefined);

  await markAgentcampRegistrationPaid({
    email,
    name: session.customer_details?.name ?? null,
    paidAt: new Date(),
    stripeCustomerId,
    stripePaymentIntentId: getStripePaymentIntentId(session),
    stripeSessionId: session.id,
  });

  await attachAgentcampRegistrationToStudioAccount({
    stripeSessionId: session.id,
    studioAccountId: account.id,
    studioUserId: dbUser.id,
  });

  logger.info(
    {
      email,
      sessionId: session.id,
      studioAccountId: account.id,
      studioUserId: dbUser.id,
    },
    "agentcamp checkout reconciled",
  );
}

export async function reconcileAgentcampCheckoutExpired(
  session: Stripe.Checkout.Session,
) {
  await markAgentcampRegistrationExpired(session.id);

  logger.info(
    { sessionId: session.id },
    "agentcamp checkout expired",
  );
}
