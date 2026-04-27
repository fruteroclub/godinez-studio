import { createPendingAgentcampRegistration, countPaidAgentcampRegistrationsByCohort } from "../dal/agentcamp-registrations";
import { getAgentcampConfig } from "../lib/agentcamp-config";
import { stripe } from "../lib/stripe";

export type AgentcampCheckoutPayload = {
  cancelUrl: string;
  checkoutSource: string;
  locale: "en" | "es";
  successUrl: string;
};

type AgentcampTier = "early_bird" | "regular";

export class AgentcampCheckoutError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.name = "AgentcampCheckoutError";
    this.status = status;
  }
}

function resolveTier(cutoff: Date): AgentcampTier {
  return Date.now() < cutoff.getTime() ? "early_bird" : "regular";
}

function loadAgentcampConfig() {
  try {
    return getAgentcampConfig();
  } catch (error) {
    throw new AgentcampCheckoutError(
      "not_configured",
      error instanceof Error
        ? `AgentCamp checkout is not configured: ${error.message}`
        : "AgentCamp checkout is not configured.",
      503,
    );
  }
}

async function resolvePrice(priceId: string) {
  if (!stripe) {
    throw new AgentcampCheckoutError(
      "not_configured",
      "Stripe is not configured.",
      503,
    );
  }

  const price = await stripe.prices.retrieve(priceId);
  if (price.unit_amount == null || price.currency !== "mxn") {
    throw new AgentcampCheckoutError(
      "not_configured",
      "AgentCamp pricing is not configured correctly.",
      503,
    );
  }

  return {
    amount: price.unit_amount,
    currency: price.currency as "mxn",
    priceId: price.id,
  };
}

export async function createAgentcampCheckoutSession(
  payload: AgentcampCheckoutPayload,
) {
  if (!stripe) {
    throw new AgentcampCheckoutError(
      "not_configured",
      "Stripe is not configured.",
      503,
    );
  }

  const config = loadAgentcampConfig();
  if (!config.salesEnabled) {
    throw new AgentcampCheckoutError(
      "sold_out",
      "AgentCamp is sold out.",
      409,
    );
  }

  const paidCount = await countPaidAgentcampRegistrationsByCohort(config.cohort);
  if (paidCount >= config.maxCapacity) {
    throw new AgentcampCheckoutError(
      "sold_out",
      "AgentCamp is sold out.",
      409,
    );
  }

  const tier = resolveTier(config.earlyBirdCutoff);
  const selectedPriceId =
    tier === "early_bird" ? config.earlyBirdPriceId : config.regularPriceId;
  const selectedPrice = await resolvePrice(selectedPriceId);

  const trialEndUnix = Math.floor(config.conversionAt.getTime() / 1000);

  const session = await stripe.checkout.sessions.create({
    cancel_url: payload.cancelUrl,
    line_items: [
      { price: selectedPrice.priceId, quantity: 1 },
      { price: config.godinezPersonalPriceId, quantity: 1 },
    ],
    metadata: {
      checkoutSource: payload.checkoutSource,
      cohort: config.cohort,
      locale: payload.locale,
      tier,
    },
    mode: "subscription",
    payment_method_types: ["card"],
    subscription_data: {
      trial_end: trialEndUnix,
    },
    success_url: payload.successUrl,
  });

  if (!session.url) {
    throw new AgentcampCheckoutError(
      "checkout_failed",
      "Stripe Checkout did not return a URL.",
      502,
    );
  }

  await createPendingAgentcampRegistration({
    amount: selectedPrice.amount,
    checkoutSource: payload.checkoutSource,
    cohort: config.cohort,
    currency: selectedPrice.currency,
    email: null,
    locale: payload.locale,
    name: null,
    stripeCustomerId:
      typeof session.customer === "string" ? session.customer : session.customer?.id ?? null,
    stripePaymentIntentId: null,
    stripeSessionId: session.id,
    tier,
  });

  return { url: session.url };
}
