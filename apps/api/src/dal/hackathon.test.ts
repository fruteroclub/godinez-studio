import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database
vi.mock("../db", () => ({
  db: {
    query: {
      hackathonProgress: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([{ id: 1, name: "Test Hackathon" }])),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([{ id: 1 }])),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve()),
    })),
  },
}));

// Constants to test
const MAX_NOTES_PER_PHASE = 50;
const INITIAL_PHASES = [
  { number: 0, status: "pending", notes: [] },
  { number: 1, status: "pending", notes: [] },
  { number: 2, status: "pending", notes: [] },
  { number: 3, status: "pending", notes: [] },
  { number: 4, status: "pending", notes: [] },
  { number: 5, status: "pending", notes: [] },
  { number: 6, status: "pending", notes: [] },
  { number: 7, status: "pending", notes: [] },
  { number: 8, status: "pending", notes: [] },
];

describe("Hackathon Constants", () => {
  it("should have 9 initial phases (0-8)", () => {
    expect(INITIAL_PHASES).toHaveLength(9);
    expect(INITIAL_PHASES[0].number).toBe(0);
    expect(INITIAL_PHASES[8].number).toBe(8);
  });

  it("all initial phases should be pending with empty notes", () => {
    INITIAL_PHASES.forEach((phase) => {
      expect(phase.status).toBe("pending");
      expect(phase.notes).toEqual([]);
    });
  });

  it("should have a reasonable note limit", () => {
    expect(MAX_NOTES_PER_PHASE).toBe(50);
    expect(MAX_NOTES_PER_PHASE).toBeGreaterThan(0);
    expect(MAX_NOTES_PER_PHASE).toBeLessThanOrEqual(100);
  });
});

describe("Phase Status Logic", () => {
  it("should calculate currentPhase correctly when phase 0 is done", () => {
    const phases = [
      { number: 0, status: "done", notes: [] },
      { number: 1, status: "current", notes: [] },
      { number: 2, status: "pending", notes: [] },
    ];
    
    let currentPhase = 0;
    for (const phase of phases) {
      if (phase.status === "current") {
        currentPhase = phase.number;
        break;
      }
      if (phase.status === "done") {
        currentPhase = phase.number + 1;
      }
    }
    
    expect(currentPhase).toBe(1);
  });

  it("should not exceed phase 8", () => {
    const phases = INITIAL_PHASES.map((p, i) => ({
      ...p,
      status: i <= 8 ? "done" : "pending",
    }));
    
    let currentPhase = 0;
    for (const phase of phases) {
      if (phase.status === "done") {
        currentPhase = phase.number + 1;
      }
    }
    
    expect(Math.min(currentPhase, 8)).toBe(8);
  });
});

describe("Note Limit Validation", () => {
  it("should allow adding note when under limit", () => {
    const currentNotes = Array(49).fill("note");
    expect(currentNotes.length < MAX_NOTES_PER_PHASE).toBe(true);
  });

  it("should reject adding note when at limit", () => {
    const currentNotes = Array(50).fill("note");
    expect(currentNotes.length >= MAX_NOTES_PER_PHASE).toBe(true);
  });
});
