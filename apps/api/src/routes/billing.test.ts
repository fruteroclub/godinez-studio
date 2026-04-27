import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";

const {
  constructEventAsync,
  createAccount,
  updateAccountSubscription,
  upsertUser,
} = vi.hoisted(() => ({
  constructEventAsync: vi.fn(),
  createAccount: vi.fn(),
  updateAccountSubscription: vi.fn(),
  upsertUser: vi.fn(),
}));

vi.mock("@clerk/backend", () => ({
  createClerkClient: () => ({
    users: {
      createUser: vi.fn(),
      getUserList: vi.fn(),
    },
  }),
}));

vi.mock("../lib/stripe", () => ({
  stripe: {
    webhooks: {
      constructEventAsync,
    },
  },
}));

vi.mock("../dal/accounts", () => ({
  createAccount,
  updateAccountSubscription,
}));

vi.mock("../dal/users", () => ({
  upsertUser,
}));

vi.mock("../dal/workspaces", () => ({
  getWorkspacesByUserId: vi.fn(),
}));

import billing from "./billing";

const originalBillingWebhookSecret = process.env.STRIPE_BILLING_WEBHOOK_SECRET;
const originalLegacyWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

function createTestApp() {
  const app = new Hono();
  app.route("/api/billing", billing);
  return app;
}

describe("Billing webhook route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_BILLING_WEBHOOK_SECRET = "whsec_billing_test";
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });

  afterAll(() => {
    if (originalBillingWebhookSecret === undefined) {
      delete process.env.STRIPE_BILLING_WEBHOOK_SECRET;
    } else {
      process.env.STRIPE_BILLING_WEBHOOK_SECRET = originalBillingWebhookSecret;
    }

    if (originalLegacyWebhookSecret === undefined) {
      delete process.env.STRIPE_WEBHOOK_SECRET;
    } else {
      process.env.STRIPE_WEBHOOK_SECRET = originalLegacyWebhookSecret;
    }
  });

  it("ignores non-subscription checkout completions", async () => {
    constructEventAsync.mockResolvedValueOnce({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_payment",
          mode: "payment",
        },
      },
    });

    const app = createTestApp();
    const response = await app.request("/api/billing/webhook", {
      method: "POST",
      headers: {
        "stripe-signature": "test_signature",
      },
      body: "{}",
    });

    expect(response.status).toBe(200);
    expect(constructEventAsync).toHaveBeenCalledWith(
      "{}",
      "test_signature",
      "whsec_billing_test",
    );
    expect(createAccount).not.toHaveBeenCalled();
    expect(updateAccountSubscription).not.toHaveBeenCalled();
    expect(upsertUser).not.toHaveBeenCalled();
  });
});
