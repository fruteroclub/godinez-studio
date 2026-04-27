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
      createAgentcampCheckoutSession({
        cancelUrl: "https://agentcamp.frutero.club/payment/cancel",
        checkoutSource: "landing.hero",
        locale: "es",
        successUrl: "https://agentcamp.frutero.club/payment/success",
      }),
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
      createAgentcampCheckoutSession({
        cancelUrl: "https://agentcamp.frutero.club/payment/cancel",
        checkoutSource: "landing.hero",
        locale: "es",
        successUrl: "https://agentcamp.frutero.club/payment/success",
      }),
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
});
