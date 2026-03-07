import {
  type AnyPgColumn,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { agents } from "./agents";
import { gatewayInstances } from "./gateway-instances";

export const workspaces = pgTable("workspaces", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  ownerId: integer("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  agentId: integer("agent_id").references(() => agents.id, { onDelete: "set null" }),
  tier: text("tier").notNull().default("beta_tester"),
  status: text("status").notNull().default("provisioning"), // active | suspended | provisioning
  agentSlot: varchar("agent_slot", { length: 255 }), // OpenClaw agent ID mapping
  instanceId: integer("instance_id").references(
    (): AnyPgColumn => gatewayInstances.id,
    { onDelete: "set null" },
  ),
  settings: text("settings"), // JSON string for workspace-level config
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
