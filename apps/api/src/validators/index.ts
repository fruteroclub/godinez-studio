import { z } from "zod";

export const createProjectSchema = z.object({
  workspaceId: z.number().int().positive(),
  name: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(["active", "completed", "archived"]).optional(),
});

export const createTaskSchema = z.object({
  workspaceId: z.number().int().positive(),
  projectId: z.number().int().positive().optional(),
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  projectId: z.number().int().positive().nullable().optional(),
  dueAt: z.string().datetime().optional(),
  assignedAgentId: z.number().int().positive().nullable().optional(),
});

export const updateTaskStatusSchema = z.object({
  status: z.enum(["pending", "in_progress", "completed", "failed", "cancelled"]),
});

export const sendMessageSchema = z.object({
  conversationId: z.number().int().positive(),
  workspaceId: z.number().int().positive(),
  content: z.string().min(1).max(10000),
});

export const createConversationSchema = z.object({
  workspaceId: z.number().int().positive(),
  title: z.string().optional(),
  projectId: z.number().int().positive().optional(),
  agentId: z.number().int().positive().optional(),
});
