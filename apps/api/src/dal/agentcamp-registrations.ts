import { and, count, eq, ne } from "drizzle-orm";
import { agentcampRegistrations } from "@godinez/db";
import { db } from "../db";

type RegistrationTier = "early_bird" | "regular";
type RegistrationLocale = "en" | "es";

type PendingRegistrationInput = {
  amount: number;
  checkoutSource: string;
  cohort: string;
  currency: "mxn";
  email: string | null;
  locale: RegistrationLocale;
  name: string | null;
  stripeCustomerId: string | null;
  stripePaymentIntentId: string | null;
  stripeSessionId: string;
  tier: RegistrationTier;
};

function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? null;
}

export async function createPendingAgentcampRegistration(
  input: PendingRegistrationInput,
) {
  const [registration] = await db
    .insert(agentcampRegistrations)
    .values({
      amount: input.amount,
      checkoutSource: input.checkoutSource,
      cohort: input.cohort,
      currency: input.currency,
      email: normalizeEmail(input.email),
      locale: input.locale,
      name: input.name,
      status: "pending",
      stripeCustomerId: input.stripeCustomerId,
      stripePaymentIntentId: input.stripePaymentIntentId,
      stripeSessionId: input.stripeSessionId,
      tier: input.tier,
    })
    .onConflictDoUpdate({
      target: agentcampRegistrations.stripeSessionId,
      set: {
        amount: input.amount,
        checkoutSource: input.checkoutSource,
        cohort: input.cohort,
        currency: input.currency,
        email: normalizeEmail(input.email),
        locale: input.locale,
        name: input.name,
        status: "pending",
        stripeCustomerId: input.stripeCustomerId,
        stripePaymentIntentId: input.stripePaymentIntentId,
        tier: input.tier,
      },
    })
    .returning();

  return registration;
}

export async function getAgentcampRegistrationBySessionId(stripeSessionId: string) {
  return db.query.agentcampRegistrations.findFirst({
    where: eq(agentcampRegistrations.stripeSessionId, stripeSessionId),
  });
}

export async function countPaidAgentcampRegistrationsByCohort(cohort: string) {
  const [result] = await db
    .select({ count: count() })
    .from(agentcampRegistrations)
    .where(
      and(
        eq(agentcampRegistrations.cohort, cohort),
        eq(agentcampRegistrations.status, "paid"),
      ),
    );

  return result?.count ?? 0;
}

export async function markAgentcampRegistrationPaid(params: {
  email: string | null;
  name: string | null;
  paidAt: Date;
  stripeCustomerId: string | null;
  stripePaymentIntentId: string | null;
  stripeSessionId: string;
}) {
  const [registration] = await db
    .update(agentcampRegistrations)
    .set({
      email: normalizeEmail(params.email),
      name: params.name,
      paidAt: params.paidAt,
      status: "paid",
      stripeCustomerId: params.stripeCustomerId,
      stripePaymentIntentId: params.stripePaymentIntentId,
    })
    .where(eq(agentcampRegistrations.stripeSessionId, params.stripeSessionId))
    .returning();

  return registration;
}

export async function markAgentcampRegistrationExpired(stripeSessionId: string) {
  const [registration] = await db
    .update(agentcampRegistrations)
    .set({
      status: "expired",
    })
    .where(
      and(
        eq(agentcampRegistrations.stripeSessionId, stripeSessionId),
        ne(agentcampRegistrations.status, "paid"),
      ),
    )
    .returning();

  return registration;
}

export async function attachAgentcampRegistrationToStudioAccount(params: {
  stripeSessionId: string;
  studioAccountId: number | null;
  studioUserId: number | null;
}) {
  const [registration] = await db
    .update(agentcampRegistrations)
    .set({
      studioAccountId: params.studioAccountId,
      studioUserId: params.studioUserId,
    })
    .where(eq(agentcampRegistrations.stripeSessionId, params.stripeSessionId))
    .returning();

  return registration;
}
