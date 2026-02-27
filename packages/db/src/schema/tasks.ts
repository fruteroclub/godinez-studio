import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import { projects } from "./projects";
import { agents } from "./agents";
import { users } from "./users";

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: text("status").notNull().default("pending"), // pending | in_progress | completed | failed | cancelled
  priority: text("priority").notNull().default("medium"), // low | medium | high | urgent
  assignedAgentId: integer("assigned_agent_id").references(() => agents.id, { onDelete: "set null" }),
  createdByUserId: integer("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
  dueAt: timestamp("due_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
