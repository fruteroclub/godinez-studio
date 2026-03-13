/**
 * Error Observatory Schema - Simplified v2
 * Solo las tablas esenciales, lógica en el agente
 */
import { pgTable, serial, text, timestamp, boolean, integer, jsonb } from "drizzle-orm/pg-core";

// Errores capturados
export const errors = pgTable("errors", {
  id: serial("id").primaryKey(),
  code: text("code").notNull(),
  message: text("message").notNull(),
  userMessage: text("user_message").notNull(),
  priority: text("priority").notNull().default("P3"),
  
  // Contexto
  userId: text("user_id"),
  path: text("path"),
  userAgent: text("user_agent"),
  metadata: jsonb("metadata"),
  
  // Estado
  resolved: boolean("resolved").notNull().default(false),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: text("resolved_by"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Feedback de usuarios
export const feedback = pgTable("feedback", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // bug, feature, comment
  message: text("message").notNull(),
  email: text("email"),
  status: text("status").notNull().default("new"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Types
export type ErrorInsert = typeof errors.$inferInsert;
export type ErrorSelect = typeof errors.$inferSelect;
export type FeedbackInsert = typeof feedback.$inferInsert;
export type FeedbackSelect = typeof feedback.$inferSelect;
