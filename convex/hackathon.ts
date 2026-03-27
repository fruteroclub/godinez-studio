import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Fases iniciales
const INITIAL_PHASES = [
  { number: 0, status: "pending" as const, notes: [], completedAt: undefined },
  { number: 1, status: "pending" as const, notes: [], completedAt: undefined },
  { number: 2, status: "pending" as const, notes: [], completedAt: undefined },
  { number: 3, status: "pending" as const, notes: [], completedAt: undefined },
  { number: 4, status: "pending" as const, notes: [], completedAt: undefined },
  { number: 5, status: "pending" as const, notes: [], completedAt: undefined },
  { number: 6, status: "pending" as const, notes: [], completedAt: undefined },
  { number: 7, status: "pending" as const, notes: [], completedAt: undefined },
  { number: 8, status: "pending" as const, notes: [], completedAt: undefined },
];

// Query: Obtener hackathon por workspace
export const getByWorkspace = query({
  args: { workspaceId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("hackathon_progress")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .first();
  },
});

// Mutation: Crear hackathon
export const create = mutation({
  args: {
    workspaceId: v.string(),
    name: v.string(),
    deadline: v.string(),
    hackathonUrl: v.optional(v.string()),
    resourcesUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    
    // Verificar si ya existe
    const existing = await ctx.db
      .query("hackathon_progress")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .first();
    
    if (existing) {
      // Actualizar el existente
      return await ctx.db.patch(existing._id, {
        name: args.name,
        deadline: args.deadline,
        hackathonUrl: args.hackathonUrl,
        resourcesUrl: args.resourcesUrl,
        active: true,
        updatedAt: now,
      });
    }
    
    // Crear nuevo
    return await ctx.db.insert("hackathon_progress", {
      workspaceId: args.workspaceId,
      active: true,
      name: args.name,
      deadline: args.deadline,
      hackathonUrl: args.hackathonUrl,
      resourcesUrl: args.resourcesUrl,
      currentPhase: 0,
      phases: INITIAL_PHASES,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Mutation: Toggle activo/inactivo
export const toggleActive = mutation({
  args: { workspaceId: v.string() },
  handler: async (ctx, args) => {
    const hackathon = await ctx.db
      .query("hackathon_progress")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .first();
    
    if (!hackathon) {
      throw new Error("Hackathon not found");
    }
    
    return await ctx.db.patch(hackathon._id, {
      active: !hackathon.active,
      updatedAt: new Date().toISOString(),
    });
  },
});

// Mutation: Actualizar fase
export const updatePhase = mutation({
  args: {
    workspaceId: v.string(),
    phaseNumber: v.number(),
    status: v.union(v.literal("done"), v.literal("current"), v.literal("pending")),
    notes: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const hackathon = await ctx.db
      .query("hackathon_progress")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .first();
    
    if (!hackathon) {
      throw new Error("Hackathon not found");
    }
    
    const now = new Date().toISOString();
    const updatedPhases = hackathon.phases.map((phase) => {
      if (phase.number === args.phaseNumber) {
        return {
          ...phase,
          status: args.status,
          notes: args.notes ?? phase.notes,
          completedAt: args.status === "done" ? now : phase.completedAt,
        };
      }
      return phase;
    });
    
    // Calcular fase actual
    let currentPhase = 0;
    for (const phase of updatedPhases) {
      if (phase.status === "current") {
        currentPhase = phase.number;
        break;
      }
      if (phase.status === "done") {
        currentPhase = phase.number + 1;
      }
    }
    
    return await ctx.db.patch(hackathon._id, {
      phases: updatedPhases,
      currentPhase: Math.min(currentPhase, 8),
      updatedAt: now,
    });
  },
});

// Mutation: Agregar nota a una fase
export const addNote = mutation({
  args: {
    workspaceId: v.string(),
    phaseNumber: v.number(),
    note: v.string(),
  },
  handler: async (ctx, args) => {
    const hackathon = await ctx.db
      .query("hackathon_progress")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .first();
    
    if (!hackathon) {
      throw new Error("Hackathon not found");
    }
    
    const updatedPhases = hackathon.phases.map((phase) => {
      if (phase.number === args.phaseNumber) {
        return {
          ...phase,
          notes: [...phase.notes, args.note],
        };
      }
      return phase;
    });
    
    return await ctx.db.patch(hackathon._id, {
      phases: updatedPhases,
      updatedAt: new Date().toISOString(),
    });
  },
});

// Delete hackathon for a workspace
export const deleteByWorkspace = mutation({
  args: { workspaceId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("hackathon_progress")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
    return { success: true };
  },
});
