import {
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import { projects } from "./projects";
import { users } from "./users";
import { agents } from "./agents";
import { messages } from "./messages";
import { conversations } from "./conversations";

export const files = pgTable(
  "files",
  {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: integer("project_id").references(() => projects.id, { onDelete: "set null" }),
    conversationId: integer("conversation_id").references(() => conversations.id, { onDelete: "set null" }),
    storageKey: text("storage_key").notNull(),
    url: text("url").notNull(),
    filename: varchar("filename", { length: 255 }).notNull(),
    mimeType: varchar("mime_type", { length: 255 }),
    sizeBytes: integer("size_bytes"),
    uploadedByUserId: integer("uploaded_by_user_id").references(() => users.id, { onDelete: "set null" }),
    uploadedByAgentId: integer("uploaded_by_agent_id").references(
      () => agents.id, { onDelete: "set null" },
    ),
    messageId: integer("message_id").references(() => messages.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("files_workspace_id_idx").on(t.workspaceId),
    index("files_conversation_id_idx").on(t.conversationId),
  ],
);
