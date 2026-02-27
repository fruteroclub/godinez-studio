import {
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { conversations } from "./conversations";
import { workspaces } from "./workspaces";
import { users } from "./users";
import { agents } from "./agents";

export const messages = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    conversationId: integer("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    role: text("role").notNull(), // user | agent | system
    content: text("content").notNull(),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    agentId: integer("agent_id").references(() => agents.id, { onDelete: "set null" }),
    metadata: text("metadata"), // JSON string: model, tokens, latency, toolCalls
    fileId: integer("file_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("messages_conversation_created_idx").on(
      t.conversationId,
      t.createdAt,
    ),
  ],
);
