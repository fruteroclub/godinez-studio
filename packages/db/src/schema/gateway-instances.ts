import {
  type AnyPgColumn,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";

export const gatewayInstances = pgTable("gateway_instances", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  url: text("url").notNull(),
  token: text("token").notNull(),
  tier: text("tier").notNull().default("shared"),
  status: text("status").notNull().default("active"),
  maxSlots: integer("max_slots").notNull().default(25),
  usedSlots: integer("used_slots").notNull().default(0),
  workspaceBase: text("workspace_base").notNull().default("/home/openclaw/.openclaw/workspaces"),
  region: varchar("region", { length: 20 }).default("us-east-1"),
  customerId: integer("customer_id").references(
    (): AnyPgColumn => workspaces.id,
    { onDelete: "set null" },
  ),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
