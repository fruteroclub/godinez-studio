/**
 * Error Observatory DAL - Simplified v2
 * Solo CRUD básico, lógica de diagnóstico en el agente
 */
import { eq, desc, and, count, sql } from "drizzle-orm";
import { errors, feedback } from "@godinez/db";
import { db } from "../db";

// ============================================
// ERRORS - CRUD BÁSICO
// ============================================

export async function logError(data: {
  code: string;
  message: string;
  userMessage: string;
  priority?: string;
  userId?: string;
  path?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}) {
  const [error] = await db
    .insert(errors)
    .values({
      code: data.code,
      message: data.message,
      userMessage: data.userMessage,
      priority: data.priority || "P3",
      userId: data.userId,
      path: data.path,
      userAgent: data.userAgent,
      metadata: data.metadata,
    })
    .returning();
  return error;
}

export async function getErrors(options?: {
  resolved?: boolean;
  limit?: number;
}) {
  const conditions = [];
  if (options?.resolved !== undefined) {
    conditions.push(eq(errors.resolved, options.resolved));
  }
  
  return db
    .select()
    .from(errors)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(errors.createdAt))
    .limit(options?.limit || 50);
}

export async function resolveError(id: number, resolvedBy: string) {
  const [updated] = await db
    .update(errors)
    .set({
      resolved: true,
      resolvedAt: new Date(),
      resolvedBy,
    })
    .where(eq(errors.id, id))
    .returning();
  return updated;
}

export async function deleteError(id: number) {
  await db.delete(errors).where(eq(errors.id, id));
}

// ============================================
// HEALTH - Para el agente
// ============================================

export async function getSystemHealth() {
  const [health] = await db
    .select({
      totalErrors: count(),
      unresolvedErrors: sql<number>`COUNT(*) FILTER (WHERE ${errors.resolved} = false)`,
      criticalErrors: sql<number>`COUNT(*) FILTER (WHERE ${errors.priority} IN ('P0', 'P1') AND ${errors.resolved} = false)`,
    })
    .from(errors);

  const status = health.criticalErrors > 0 ? "critical" 
    : health.unresolvedErrors > 10 ? "warning" 
    : "healthy";

  return {
    status,
    totalErrors: health.totalErrors,
    unresolvedErrors: health.unresolvedErrors,
    criticalErrors: health.criticalErrors,
    checkedAt: new Date(),
  };
}

export async function getDashboardSummary() {
  const health = await getSystemHealth();
  
  const [feedbackCounts] = await db
    .select({
      total: count(),
      new: sql<number>`COUNT(*) FILTER (WHERE ${feedback.status} = 'new')`,
    })
    .from(feedback);

  return { health, feedback: feedbackCounts };
}

// ============================================
// FEEDBACK - CRUD BÁSICO
// ============================================

export async function createFeedback(data: {
  type: string;
  message: string;
  email?: string;
}) {
  const [fb] = await db.insert(feedback).values(data).returning();
  return fb;
}

export async function getFeedback() {
  return db
    .select()
    .from(feedback)
    .orderBy(desc(feedback.createdAt))
    .limit(50);
}

export async function updateFeedbackStatus(id: number, status: string) {
  const [updated] = await db
    .update(feedback)
    .set({ status })
    .where(eq(feedback.id, id))
    .returning();
  return updated;
}

export async function deleteFeedback(id: number) {
  const [deleted] = await db
    .delete(feedback)
    .where(eq(feedback.id, id))
    .returning();
  return deleted;
}
// Agregar al final de dal/errors.ts (antes del último export si hay)

/**
 * Get unprocessed errors (code is null or 'UNPROCESSED')
 * Used by Watchdog agent to find errors that need classification
 */
export async function getUnprocessedErrors(limit = 50) {
  return db
    .select()
    .from(errors)
    .where(eq(errors.code, "UNPROCESSED"))
    .orderBy(desc(errors.createdAt))
    .limit(limit);
}

/**
 * Update error with classification from Watchdog
 */
export async function updateErrorClassification(id: number, data: {
  code?: string;
  priority?: string;
  metadata?: Record<string, unknown>;
}) {
  const [updated] = await db
    .update(errors)
    .set({
      code: data.code,
      priority: data.priority,
      metadata: data.metadata,
    })
    .where(eq(errors.id, id))
    .returning();
  return updated;
}

/**
 * Log raw error without classification (for frontend/middleware to use)
 */
export async function logRawError(data: {
  message: string;
  userMessage?: string;
  userId?: string;
  path?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}) {
  const [error] = await db
    .insert(errors)
    .values({
      code: "UNPROCESSED", // Watchdog will classify
      message: data.message,
      userMessage: data.userMessage || "Error detectado",
      priority: "P3", // Watchdog will assign
      userId: data.userId,
      path: data.path,
      userAgent: data.userAgent,
      metadata: data.metadata,
    })
    .returning();
  return error;
}
