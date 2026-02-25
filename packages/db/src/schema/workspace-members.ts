import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { workspaces } from "./workspaces";

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    role: text("role").notNull().default("member"), // owner | admin | member | viewer
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique().on(t.workspaceId, t.userId)],
);
