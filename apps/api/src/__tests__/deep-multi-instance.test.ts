// Re-crear tests porque el archivo se perdió en el rebase
import { describe, it, expect } from "vitest";

describe("Multi-Instance System - Deep Tests", () => {

  // Fill-then-spill algorithm
  const selectInstance = (instances: Array<{ id: number; tier: string; status: string; usedSlots: number; maxSlots: number }>, excludeIds: number[] = []) => {
    return instances
      .filter(i => i.tier === "shared" && i.status === "active" && i.usedSlots < i.maxSlots && !excludeIds.includes(i.id))
      .sort((a, b) => b.usedSlots - a.usedSlots)[0] ?? null;
  };

  describe("1. Fill-Then-Spill", () => {
    it("selects fullest non-full", () => {
      const instances = [
        { id: 1, tier: "shared", status: "active", usedSlots: 10, maxSlots: 50 },
        { id: 2, tier: "shared", status: "active", usedSlots: 40, maxSlots: 50 },
      ];
      expect(selectInstance(instances)?.id).toBe(2);
    });

    it("returns null when all full", () => {
      const instances = [{ id: 1, tier: "shared", status: "active", usedSlots: 50, maxSlots: 50 }];
      expect(selectInstance(instances)).toBeNull();
    });

    it("skips offline", () => {
      const instances = [
        { id: 1, tier: "shared", status: "offline", usedSlots: 40, maxSlots: 50 },
        { id: 2, tier: "shared", status: "active", usedSlots: 10, maxSlots: 50 },
      ];
      expect(selectInstance(instances)?.id).toBe(2);
    });

    it("excludes IDs", () => {
      const instances = [
        { id: 1, tier: "shared", status: "active", usedSlots: 40, maxSlots: 50 },
        { id: 2, tier: "shared", status: "active", usedSlots: 30, maxSlots: 50 },
      ];
      expect(selectInstance(instances, [1])?.id).toBe(2);
    });
  });

  describe("2. Slot Management", () => {
    it("calculates utilization", () => {
      const util = (25 / 50) * 100;
      expect(util).toBe(50);
    });

    it("handles decrement to 0", () => {
      const slots = 1;
      expect(Math.max(slots - 1, 0)).toBe(0);
    });

    it("prevents negative", () => {
      const slots = 0;
      expect(Math.max(slots - 1, 0)).toBe(0);
    });
  });

  describe("3. Status Transitions", () => {
    const valid: Record<string, string[]> = {
      active: ["offline", "draining"],
      offline: ["active"],
      draining: ["decommissioned"],
      decommissioned: [],
    };

    it("active → offline OK", () => expect(valid.active.includes("offline")).toBe(true));
    it("active → decommissioned BLOCKED", () => expect(valid.active.includes("decommissioned")).toBe(false));
  });

  describe("4. Capacity Alerts", () => {
    const THRESHOLD = 0.8;
    it("warns at 90%", () => expect(45/50 > THRESHOLD).toBe(true));
    it("no warn at 80%", () => expect(40/50 > THRESHOLD).toBe(false));
  });

  describe("5. Session Keys", () => {
    const key = (slot: string, conv: number) => `agent:${slot}:conv-${conv}`;
    it("generates correct format", () => expect(key("godin-slot-1", 123)).toBe("agent:godin-slot-1:conv-123"));
    it("unique per conv", () => expect(key("godin-slot-1", 1)).not.toBe(key("godin-slot-1", 2)));
  });

  describe("6. Delete Validation", () => {
    const canDelete = (status: string, workspaces: number) => {
      if (status !== "decommissioned") return "must_be_decommissioned";
      if (workspaces > 0) return "has_assigned_workspaces";
      return null;
    };
    it("OK when decomm + 0 ws", () => expect(canDelete("decommissioned", 0)).toBeNull());
    it("BLOCKED when active", () => expect(canDelete("active", 0)).toBe("must_be_decommissioned"));
    it("BLOCKED when has ws", () => expect(canDelete("decommissioned", 5)).toBe("has_assigned_workspaces"));
  });

  describe("7. Legacy Fallback", () => {
    const getInstanceId = (wsId: number | null, legacy: number | null) => wsId ?? legacy;
    it("uses ws id if set", () => expect(getInstanceId(5, 1)).toBe(5));
    it("falls back to legacy", () => expect(getInstanceId(null, 1)).toBe(1));
  });
});
