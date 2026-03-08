import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";

// Phase structure stored as JSONB
export interface HackathonPhase {
  number: number;
  status: "done" | "current" | "pending";
  notes: string[];
  completedAt?: string;
}

export const hackathonProgress = pgTable(
  "hackathon_progress",
  {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" })
      ,
    name: varchar("name", { length: 255 }).notNull(),
    deadline: timestamp("deadline", { withTimezone: true }).notNull(),
    hackathonUrl: varchar("hackathon_url", { length: 500 }),
    resourcesUrl: varchar("resources_url", { length: 500 }),
    active: boolean("active").notNull().default(true),
    currentPhase: integer("current_phase").notNull().default(0),
    phases: jsonb("phases").$type<HackathonPhase[]>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("hackathon_progress_workspace_id_idx").on(t.workspaceId),
  ],
);
