import { describe, expect, it } from "vitest";
import { hasStudioAccess } from "./account-access";

describe("hasStudioAccess", () => {
  it("returns true for trialing", () => {
    expect(hasStudioAccess({ subscriptionStatus: "trialing" })).toBe(true);
  });

  it("returns true for active", () => {
    expect(hasStudioAccess({ subscriptionStatus: "active" })).toBe(true);
  });

  it("returns false for free", () => {
    expect(hasStudioAccess({ subscriptionStatus: "free" })).toBe(false);
  });

  it("returns false for past_due", () => {
    expect(hasStudioAccess({ subscriptionStatus: "past_due" })).toBe(false);
  });

  it("returns false for cancelled", () => {
    expect(hasStudioAccess({ subscriptionStatus: "cancelled" })).toBe(false);
  });
});
