import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";

const { createAgentcampCheckoutSession } = vi.hoisted(() => ({
  createAgentcampCheckoutSession: vi.fn(),
}));

vi.mock("../services/agentcamp-checkout", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../services/agentcamp-checkout")>();
  return {
    ...actual,
    createAgentcampCheckoutSession,
  };
});

import { AgentcampCheckoutError } from "../services/agentcamp-checkout";
import agentcampCheckout from "./agentcamp-checkout";

function createTestApp() {
  const app = new Hono();
  app.route("/api/agentcamp", agentcampCheckout);
  return app;
}

describe("AgentCamp checkout route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a checkout session for valid payloads", async () => {
    createAgentcampCheckoutSession.mockResolvedValueOnce({
      url: "https://checkout.stripe.com/test",
    });
    const app = createTestApp();

    const response = await app.request("/api/agentcamp/checkout", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        cancelUrl: "https://agentcamp.frutero.club/payment/cancel",
        checkoutSource: "landing.hero",
        locale: "es",
        successUrl: "https://agentcamp.frutero.club/payment/success",
      }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      url: "https://checkout.stripe.com/test",
    });
  });

  it("validates the request payload", async () => {
    const app = createTestApp();

    const response = await app.request("/api/agentcamp/checkout", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        cancelUrl: "not-a-url",
        checkoutSource: "",
        locale: "fr",
        successUrl: "still-not-a-url",
      }),
    });

    expect(response.status).toBe(400);
  });

  it("maps sold-out errors to 409", async () => {
    createAgentcampCheckoutSession.mockRejectedValueOnce(
      new AgentcampCheckoutError("sold_out", "AgentCamp is sold out.", 409),
    );
    const app = createTestApp();

    const response = await app.request("/api/agentcamp/checkout", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        cancelUrl: "https://agentcamp.frutero.club/payment/cancel",
        checkoutSource: "landing.hero",
        locale: "es",
        successUrl: "https://agentcamp.frutero.club/payment/success",
      }),
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "sold_out",
      message: "AgentCamp is sold out.",
    });
  });

  it("maps configuration errors to 503", async () => {
    createAgentcampCheckoutSession.mockRejectedValueOnce(
      new AgentcampCheckoutError("not_configured", "Stripe is not configured.", 503),
    );
    const app = createTestApp();

    const response = await app.request("/api/agentcamp/checkout", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        cancelUrl: "https://agentcamp.frutero.club/payment/cancel",
        checkoutSource: "landing.hero",
        locale: "es",
        successUrl: "https://agentcamp.frutero.club/payment/success",
      }),
    });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "not_configured",
      message: "Stripe is not configured.",
    });
  });
});
