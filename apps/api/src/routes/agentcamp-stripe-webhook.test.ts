import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";

const {
  constructEventAsync,
  reconcileAgentcampCheckoutCompleted,
  reconcileAgentcampCheckoutExpired,
} = vi.hoisted(() => ({
  constructEventAsync: vi.fn(),
  reconcileAgentcampCheckoutCompleted: vi.fn(),
  reconcileAgentcampCheckoutExpired: vi.fn(),
}));

vi.mock("../lib/stripe", () => ({
  stripe: {
    webhooks: {
      constructEventAsync,
    },
  },
}));

vi.mock("../services/agentcamp-reconcile", () => ({
  reconcileAgentcampCheckoutCompleted,
  reconcileAgentcampCheckoutExpired,
}));

import agentcampStripeWebhook from "./agentcamp-stripe-webhook";

function createTestApp() {
  const app = new Hono();
  app.route("/api/agentcamp", agentcampStripeWebhook);
  return app;
}

describe("AgentCamp Stripe webhook route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when the signature header is missing", async () => {
    const app = createTestApp();

    const response = await app.request("/api/agentcamp/stripe/webhook", {
      method: "POST",
      body: "{}",
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Missing signature" });
  });

  it("returns 400 when Stripe signature verification fails", async () => {
    constructEventAsync.mockRejectedValueOnce(new Error("bad signature"));
    const app = createTestApp();

    const response = await app.request("/api/agentcamp/stripe/webhook", {
      method: "POST",
      headers: {
        "stripe-signature": "test_signature",
      },
      body: "{}",
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid signature" });
  });

  it("reconciles checkout completion events", async () => {
    constructEventAsync.mockResolvedValueOnce({
      type: "checkout.session.completed",
      data: {
        object: { id: "cs_test_complete" },
      },
    });
    const app = createTestApp();

    const response = await app.request("/api/agentcamp/stripe/webhook", {
      method: "POST",
      headers: {
        "stripe-signature": "test_signature",
      },
      body: "{}",
    });

    expect(response.status).toBe(200);
    expect(reconcileAgentcampCheckoutCompleted).toHaveBeenCalledWith({
      id: "cs_test_complete",
    });
  });

  it("marks checkout expiration events", async () => {
    constructEventAsync.mockResolvedValueOnce({
      type: "checkout.session.expired",
      data: {
        object: { id: "cs_test_expired" },
      },
    });
    const app = createTestApp();

    const response = await app.request("/api/agentcamp/stripe/webhook", {
      method: "POST",
      headers: {
        "stripe-signature": "test_signature",
      },
      body: "{}",
    });

    expect(response.status).toBe(200);
    expect(reconcileAgentcampCheckoutExpired).toHaveBeenCalledWith({
      id: "cs_test_expired",
    });
  });
});
