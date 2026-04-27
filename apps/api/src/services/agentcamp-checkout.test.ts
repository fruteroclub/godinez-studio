import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createCheckoutSession,
  countPaidRegistrations,
  createPendingRegistration,
  getAgentcampConfig,
  retrievePrice,
} = vi.hoisted(() => ({
  createCheckoutSession: vi.fn(),
  countPaidRegistrations: vi.fn(),
  createPendingRegistration: vi.fn(),
  getAgentcampConfig: vi.fn(),
  retrievePrice: vi.fn(),
}));

vi.mock("../lib/stripe", () => ({
  stripe: {
    checkout: {
      sessions: {
        create: createCheckoutSession,
      },
    },
    prices: {
      retrieve: retrievePrice,
    },
  },
}));

vi.mock("../dal/agentcamp-registrations", () => ({
  countPaidAgentcampRegistrationsByCohort: countPaidRegistrations,
  createPendingAgentcampRegistration: createPendingRegistration,
}));

vi.mock("../lib/agentcamp-config", () => ({
  getAgentcampConfig,
}));

import {
  AgentcampCheckoutError,
  createAgentcampCheckoutSession,
} from "./agentcamp-checkout";

const CONVERSION_AT = new Date("2026-07-11T00:00:00-06:00");
const EARLY_BIRD_CUTOFF = new Date("2026-05-15T23:59:59.000Z");

function enabledConfig(overrides?: Partial<ReturnType<typeof getAgentcampConfig>>) {
  return {
    cohort: "agentcamp_2026_q2",
    conversionAt: CONVERSION_AT,
    earlyBirdCutoff: EARLY_BIRD_CUTOFF,
    earlyBirdPriceId: "price_early",
    godinezPersonalPriceId: "price_personal",
    maxCapacity: 50,
    regularPriceId: "price_regular",
    salesEnabled: true,
    ...overrides,
  };
}

const defaultPayload = {
  cancelUrl: "https://agentcamp.frutero.club/payment/cancel",
  checkoutSource: "landing.hero",
  locale: "es" as const,
  successUrl: "https://agentcamp.frutero.club/payment/success",
};

describe("createAgentcampCheckoutSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns sold_out when sales are disabled without requiring price envs", async () => {
    getAgentcampConfig.mockReturnValueOnce({
      cohort: "agentcamp_2026_q2",
      salesEnabled: false,
    });

    await expect(
      createAgentcampCheckoutSession(defaultPayload),
    ).rejects.toMatchObject({
      code: "sold_out",
      status: 409,
    });

    expect(countPaidRegistrations).not.toHaveBeenCalled();
    expect(retrievePrice).not.toHaveBeenCalled();
    expect(createCheckoutSession).not.toHaveBeenCalled();
  });

  it("maps invalid AgentCamp configuration to a not_configured error", async () => {
    getAgentcampConfig.mockImplementationOnce(() => {
      throw new Error("AGENTCAMP_EARLY_BIRD_PRICE_ID is required");
    });

    await expect(
      createAgentcampCheckoutSession(defaultPayload),
    ).rejects.toMatchObject({
      code: "not_configured",
      message:
        "AgentCamp checkout is not configured: AGENTCAMP_EARLY_BIRD_PRICE_ID is required",
      status: 503,
    });

    expect(countPaidRegistrations).not.toHaveBeenCalled();
    expect(retrievePrice).not.toHaveBeenCalled();
    expect(createCheckoutSession).not.toHaveBeenCalled();
  });

  it("creates a subscription-mode checkout with tuition + Godinez Personal line items and trial_end", async () => {
    getAgentcampConfig.mockReturnValueOnce(enabledConfig());
    countPaidRegistrations.mockResolvedValueOnce(0);
    retrievePrice.mockResolvedValueOnce({
      id: "price_early",
      unit_amount: 500000,
      currency: "mxn",
    });
    createCheckoutSession.mockResolvedValueOnce({
      id: "cs_test_sub",
      url: "https://checkout.stripe.com/pay/cs_test_sub",
      customer: "cus_new",
    });

    const result = await createAgentcampCheckoutSession(defaultPayload);

    expect(result.url).toBe("https://checkout.stripe.com/pay/cs_test_sub");

    const sessionArgs = createCheckoutSession.mock.calls[0][0];
    expect(sessionArgs.mode).toBe("subscription");
    expect(sessionArgs.line_items).toEqual([
      { price: "price_early", quantity: 1 },
      { price: "price_personal", quantity: 1 },
    ]);
    expect(sessionArgs.subscription_data.trial_end).toBe(
      Math.floor(CONVERSION_AT.getTime() / 1000),
    );
    expect(sessionArgs.customer_creation).toBeUndefined();
  });

  it("uses regular price when past early-bird cutoff", async () => {
    const pastCutoff = new Date("2020-01-01T00:00:00Z");
    getAgentcampConfig.mockReturnValueOnce(
      enabledConfig({ earlyBirdCutoff: pastCutoff }),
    );
    countPaidRegistrations.mockResolvedValueOnce(0);
    retrievePrice.mockResolvedValueOnce({
      id: "price_regular",
      unit_amount: 750000,
      currency: "mxn",
    });
    createCheckoutSession.mockResolvedValueOnce({
      id: "cs_test_regular",
      url: "https://checkout.stripe.com/pay/cs_test_regular",
      customer: null,
    });

    await createAgentcampCheckoutSession(defaultPayload);

    const sessionArgs = createCheckoutSession.mock.calls[0][0];
    expect(sessionArgs.line_items[0].price).toBe("price_regular");
    expect(sessionArgs.line_items[1].price).toBe("price_personal");
  });

  it("sets stripePaymentIntentId to null in the pending registration (subscription mode)", async () => {
    getAgentcampConfig.mockReturnValueOnce(enabledConfig());
    countPaidRegistrations.mockResolvedValueOnce(0);
    retrievePrice.mockResolvedValueOnce({
      id: "price_early",
      unit_amount: 500000,
      currency: "mxn",
    });
    createCheckoutSession.mockResolvedValueOnce({
      id: "cs_test_sub",
      url: "https://checkout.stripe.com/pay/cs_test_sub",
      customer: "cus_new",
    });

    await createAgentcampCheckoutSession(defaultPayload);

    expect(createPendingRegistration).toHaveBeenCalledWith(
      expect.objectContaining({
        stripePaymentIntentId: null,
      }),
    );
  });
});
