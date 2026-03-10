import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";

// Mock auth middleware
import { isAppError, formatErrorResponse } from "../lib/errors";
vi.mock("../middleware/auth", () => ({
  requireAuth: vi.fn((c, next) => {
    c.set("clerkUserId", "user_test123");
    return next();
  }),
}));

vi.mock("../middleware/resolve-user", () => ({
  resolveUser: vi.fn((c, next) => {
    c.set("dbUser", { id: 1, clerkId: "user_test123", email: "test@test.com" });
    return next();
  }),
}));

// Mock DAL functions
const mockHackathon = {
  id: 1,
  workspaceId: 1,
  name: "Test Hackathon",
  deadline: new Date("2026-03-15"),
  hackathonUrl: "https://hackathon.com",
  resourcesUrl: null,
  active: true,
  currentPhase: 0,
  phases: [
    { number: 0, status: "current", notes: [] },
    { number: 1, status: "pending", notes: [] },
    { number: 2, status: "pending", notes: [] },
    { number: 3, status: "pending", notes: [] },
    { number: 4, status: "pending", notes: [] },
    { number: 5, status: "pending", notes: [] },
    { number: 6, status: "pending", notes: [] },
    { number: 7, status: "pending", notes: [] },
    { number: 8, status: "pending", notes: [] },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
};

vi.mock("../dal/hackathon", () => ({
  getHackathonsByWorkspace: vi.fn(() => Promise.resolve([mockHackathon])),
  getHackathonById: vi.fn((id: number) => {
    if (id === 999) return Promise.resolve(null);
    return Promise.resolve(mockHackathon);
  }),
  createHackathon: vi.fn((data) => Promise.resolve({ ...mockHackathon, ...data, id: 2 })),
  toggleHackathonActive: vi.fn(() => Promise.resolve({ ...mockHackathon, active: false })),
  updateHackathonPhase: vi.fn((id, phaseNumber, status) => {
    const updatedPhases = mockHackathon.phases.map((p) => 
      p.number === phaseNumber ? { ...p, status } : p
    );
    return Promise.resolve({ ...mockHackathon, phases: updatedPhases, currentPhase: phaseNumber });
  }),
  addHackathonNote: vi.fn((id, phaseNumber, note) => {
    const updatedPhases = mockHackathon.phases.map((p) =>
      p.number === phaseNumber ? { ...p, notes: [...p.notes, note] } : p
    );
    return Promise.resolve({ ...mockHackathon, phases: updatedPhases });
  }),
  deleteHackathon: vi.fn(() => Promise.resolve({ success: true })),
}));

// Import the app AFTER mocks
import hackathonsApp from "./hackathons";

// Create test app
function createTestApp() {
  const app = new Hono();
  app.route("/api/hackathons", hackathonsApp);
  // Add error handler for tests
  app.onError((err, c) => {
    if (isAppError(err)) {
      return c.json(formatErrorResponse(err), err.statusCode as 400 | 401 | 403 | 404 | 500);
    }
    return c.json({ error: err.message }, 500);
  });
  return app;
}

describe("Hackathons API Integration Tests", () => {
  let app: ReturnType<typeof createTestApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createTestApp();
  });

  describe("GET /api/hackathons/list/:workspaceId", () => {
    it("returns list of hackathons for workspace", async () => {
      const res = await app.request("/api/hackathons/list/1");
      
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body[0].name).toBe("Test Hackathon");
    });
  });

  describe("GET /api/hackathons/:hackathonId", () => {
    it("returns hackathon by ID", async () => {
      const res = await app.request("/api/hackathons/1");
      
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.id).toBe(1);
      expect(body.name).toBe("Test Hackathon");
      expect(body.phases).toHaveLength(9);
    });

    it("returns 404 for non-existent hackathon", async () => {
      const res = await app.request("/api/hackathons/999");
      
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe("El hackathon que buscas no existe o fue eliminado");
    });
  });

  describe("POST /api/hackathons", () => {
    it("creates a new hackathon", async () => {
      const res = await app.request("/api/hackathons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: 1,
          name: "New Hackathon",
          deadline: "2026-04-01",
          hackathonUrl: "https://new-hackathon.com",
        }),
      });
      
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.id).toBe(2);
      expect(body.name).toBe("New Hackathon");
    });

    it("validates required fields", async () => {
      const res = await app.request("/api/hackathons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: 1,
          // missing name and deadline
        }),
      });
      
      expect(res.status).toBe(400);
    });

    it("validates name is not empty", async () => {
      const res = await app.request("/api/hackathons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: 1,
          name: "",
          deadline: "2026-04-01",
        }),
      });
      
      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/hackathons/:hackathonId/toggle", () => {
    it("toggles hackathon active state", async () => {
      const res = await app.request("/api/hackathons/1/toggle", {
        method: "POST",
      });
      
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.active).toBe(false);
    });
  });

  describe("POST /api/hackathons/:hackathonId/phase", () => {
    it("updates phase status", async () => {
      const res = await app.request("/api/hackathons/1/phase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phaseNumber: 1,
          status: "current",
        }),
      });
      
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.currentPhase).toBe(1);
    });

    it("validates status enum", async () => {
      const res = await app.request("/api/hackathons/1/phase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phaseNumber: 1,
          status: "invalid_status",
        }),
      });
      
      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/hackathons/:hackathonId/note", () => {
    it("adds note to phase", async () => {
      const res = await app.request("/api/hackathons/1/note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phaseNumber: 0,
          note: "Test note content",
        }),
      });
      
      expect(res.status).toBe(200);
      const body = await res.json();
      const phase0 = body.phases.find((p: { number: number }) => p.number === 0);
      expect(phase0.notes).toContain("Test note content");
    });

    it("validates note is not empty", async () => {
      const res = await app.request("/api/hackathons/1/note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phaseNumber: 0,
          note: "",
        }),
      });
      
      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /api/hackathons/:hackathonId", () => {
    it("deletes hackathon", async () => {
      const res = await app.request("/api/hackathons/1", {
        method: "DELETE",
      });
      
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });
  });
});
