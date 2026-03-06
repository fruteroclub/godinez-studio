import { describe, it, expect, vi } from "vitest";
import { Hono } from "hono";

// Mock @clerk/backend before importing auth middleware
vi.mock("@clerk/backend", () => ({
  verifyToken: vi.fn(),
}));

import { verifyToken } from "@clerk/backend";
import { requireAuth } from "./auth";

const mockedVerify = vi.mocked(verifyToken) as unknown as ReturnType<typeof vi.fn>;

type TestEnv = { Variables: { clerkUserId: string } };

function createApp() {
  const app = new Hono<TestEnv>();
  app.use("*", requireAuth);
  app.get("/test", (c) => c.json({ userId: c.get("clerkUserId") }));
  return app;
}

describe("requireAuth middleware", () => {
  it("returns 401 when no token provided", async () => {
    const app = createApp();
    const res = await app.request("/test");
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 when token is invalid", async () => {
    mockedVerify.mockRejectedValue(new Error("invalid"));
    const app = createApp();
    const res = await app.request("/test", {
      headers: { Authorization: "Bearer bad-token" },
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Invalid token");
  });

  it("returns 200 and sets clerkUserId when token is valid", async () => {
    mockedVerify.mockResolvedValue({ sub: "user_123" } as never);
    const app = createApp();
    const res = await app.request("/test", {
      headers: { Authorization: "Bearer valid-token" },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.userId).toBe("user_123");
  });

  it("accepts token from query param (SSE fallback)", async () => {
    mockedVerify.mockResolvedValue({ sub: "user_sse" } as never);
    const app = createApp();
    const res = await app.request("/test?token=sse-token");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.userId).toBe("user_sse");
  });
});
