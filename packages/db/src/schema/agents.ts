import {
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const agents = pgTable("agents", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  template: text("template").notNull(), // pmo | cto | influencer | orchestrator | custom
  status: text("status").notNull().default("provisioning"), // active | paused | provisioning | error | archived
  config: jsonb("config").$type<{
    model?: string;
    channels?: string[];
    needs?: string[];
    personality?: string;
    userName?: string;
    customInstructions?: string;
  }>(),
  openclawId: varchar("openclaw_id", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
