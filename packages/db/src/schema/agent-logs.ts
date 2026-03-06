import {
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import { agents } from "./agents";

export const agentLogs = pgTable(
  "agent_logs",
  {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    agentId: integer("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    level: text("level").notNull().default("info"), // debug | info | warn | error
    event: varchar("event", { length: 255 }).notNull(),
    message: text("message"),
    metadata: jsonb("metadata"),
    tokensUsed: integer("tokens_used"),
    durationMs: integer("duration_ms"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("agent_logs_workspace_created_idx").on(t.workspaceId, t.createdAt),
  ],
);
