import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createUser,
  getUserList,
  createAccount,
  attachAgentcampRegistrationToStudioAccount,
  markAgentcampRegistrationExpired,
  markAgentcampRegistrationPaid,
  upsertUser,
  loggerError,
  loggerInfo,
} = vi.hoisted(() => ({
  createUser: vi.fn(),
  getUserList: vi.fn(),
  createAccount: vi.fn(),
  attachAgentcampRegistrationToStudioAccount: vi.fn(),
  markAgentcampRegistrationExpired: vi.fn(),
  markAgentcampRegistrationPaid: vi.fn(),
  upsertUser: vi.fn(),
  loggerError: vi.fn(),
  loggerInfo: vi.fn(),
}));

vi.mock("@clerk/backend", () => ({
  createClerkClient: () => ({
    users: {
      createUser,
      getUserList,
    },
  }),
}));

vi.mock("../dal/accounts", () => ({
  createAccount,
}));

vi.mock("../dal/agentcamp-registrations", () => ({
  attachAgentcampRegistrationToStudioAccount,
  markAgentcampRegistrationExpired,
  markAgentcampRegistrationPaid,
}));

vi.mock("../dal/users", () => ({
  upsertUser,
}));

vi.mock("../lib/logger", () => ({
  logger: {
    error: loggerError,
    info: loggerInfo,
  },
}));

import {
  reconcileAgentcampCheckoutCompleted,
  reconcileAgentcampCheckoutExpired,
} from "./agentcamp-reconcile";

describe("reconcileAgentcampCheckoutCompleted", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a Studio user and account, then links them to the paid registration", async () => {
    createUser.mockResolvedValueOnce({
      id: "user_clerk_123",
      firstName: "Dev",
      lastName: "Frutero",
      imageUrl: "https://example.com/avatar.png",
    });
    upsertUser.mockResolvedValueOnce({
      id: 7,
    });
    createAccount.mockResolvedValueOnce({
      id: 8,
    });

    await reconcileAgentcampCheckoutCompleted({
      id: "cs_test_agentcamp_paid",
      customer: "cus_test_123",
      customer_details: {
        email: " Dev@Frutero.Club ",
        name: "Dev Frutero",
      },
      payment_intent: "pi_test_123",
    } as never);

    expect(createUser).toHaveBeenCalledWith({
      emailAddress: ["dev@frutero.club"],
      skipPasswordRequirement: true,
    });
    expect(upsertUser).toHaveBeenCalledWith({
      clerkId: "user_clerk_123",
      email: "dev@frutero.club",
      name: "Dev Frutero",
      avatarUrl: "https://example.com/avatar.png",
    });
    expect(createAccount).toHaveBeenCalledWith(7, "cus_test_123");
    expect(markAgentcampRegistrationPaid).toHaveBeenCalledWith({
      email: "dev@frutero.club",
      name: "Dev Frutero",
      paidAt: expect.any(Date),
      stripeCustomerId: "cus_test_123",
      stripePaymentIntentId: "pi_test_123",
      stripeSessionId: "cs_test_agentcamp_paid",
    });
    expect(attachAgentcampRegistrationToStudioAccount).toHaveBeenCalledWith({
      stripeSessionId: "cs_test_agentcamp_paid",
      studioAccountId: 8,
      studioUserId: 7,
    });
    expect(loggerInfo).toHaveBeenCalledWith(
      {
        email: "dev@frutero.club",
        sessionId: "cs_test_agentcamp_paid",
        studioAccountId: 8,
        studioUserId: 7,
      },
      "agentcamp checkout reconciled",
    );
  });

  it("does not create a Studio account when Stripe omits the customer email", async () => {
    await reconcileAgentcampCheckoutCompleted({
      id: "cs_test_missing_email",
      customer_details: {
        email: null,
        name: "No Email",
      },
    } as never);

    expect(createUser).not.toHaveBeenCalled();
    expect(upsertUser).not.toHaveBeenCalled();
    expect(createAccount).not.toHaveBeenCalled();
    expect(markAgentcampRegistrationPaid).not.toHaveBeenCalled();
    expect(attachAgentcampRegistrationToStudioAccount).not.toHaveBeenCalled();
    expect(loggerError).toHaveBeenCalledWith(
      { sessionId: "cs_test_missing_email" },
      "agentcamp checkout completed without customer email",
    );
  });
});

describe("reconcileAgentcampCheckoutExpired", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks the AgentCamp registration as expired", async () => {
    await reconcileAgentcampCheckoutExpired({
      id: "cs_test_expired",
    } as never);

    expect(markAgentcampRegistrationExpired).toHaveBeenCalledWith(
      "cs_test_expired",
    );
    expect(loggerInfo).toHaveBeenCalledWith(
      { sessionId: "cs_test_expired" },
      "agentcamp checkout expired",
    );
  });
});
