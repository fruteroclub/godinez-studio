import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  hackathon_progress: defineTable({
    workspaceId: v.string(),
    active: v.boolean(),
    name: v.string(),
    deadline: v.string(),
    hackathonUrl: v.optional(v.string()),
    resourcesUrl: v.optional(v.string()),
    currentPhase: v.number(),
    phases: v.array(
      v.object({
        number: v.number(),
        status: v.union(
          v.literal("done"),
          v.literal("current"),
          v.literal("pending")
        ),
        notes: v.array(v.string()),
        completedAt: v.optional(v.string()),
      })
    ),
    createdAt: v.string(),
    updatedAt: v.string(),
  }).index("by_workspace", ["workspaceId"]),
});
