import {
  boolean,
<<<<<<< Updated upstream
  index,
=======
>>>>>>> Stashed changes
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import { projects } from "./projects";
import { agents } from "./agents";
import { hackathonProgress } from "./hackathon-progress";

<<<<<<< Updated upstream
export const conversations = pgTable(
  "conversations",
  {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: integer("project_id").references(() => projects.id, { onDelete: "set null" }),
    agentId: integer("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    hackathonId: integer("hackathon_id").references(() => hackathonProgress.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }),
    channel: varchar("channel", { length: 50 }).notNull().default("web"),
    isHackathon: boolean("is_hackathon").notNull().default(false),
    isStarred: boolean("is_starred").notNull().default(false),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("conversations_workspace_id_idx").on(t.workspaceId),
    index("conversations_agent_id_idx").on(t.agentId),
    index("conversations_hackathon_id_idx").on(t.hackathonId),
  ],
);
=======
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "set null" }),
  agentId: integer("agent_id")
    .notNull()
    .references(() => agents.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }),
  channel: varchar("channel", { length: 50 }).notNull().default("web"),
  isHackathon: boolean("is_hackathon").notNull().default(false),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
>>>>>>> Stashed changes
