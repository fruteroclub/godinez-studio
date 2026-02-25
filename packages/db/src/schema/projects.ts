import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id")
    .notNull()
    .references(() => workspaces.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  status: text("status").notNull().default("active"), // active | completed | archived
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
