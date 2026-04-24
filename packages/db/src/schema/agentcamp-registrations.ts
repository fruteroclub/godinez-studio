import {
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { accounts } from "./accounts";

export const agentcampRegistrations = pgTable(
  "agentcamp_registrations",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 255 }),
    name: varchar("name", { length: 255 }),
    stripeSessionId: text("stripe_session_id").notNull(),
    stripeCustomerId: text("stripe_customer_id"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    cohort: varchar("cohort", { length: 64 }).notNull(),
    tier: varchar("tier", { length: 32 }).notNull(),
    amount: integer("amount").notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    status: varchar("status", { length: 32 }).notNull().default("pending"),
    checkoutSource: varchar("checkout_source", { length: 255 }).notNull(),
    locale: varchar("locale", { length: 2 }).notNull(),
    studioUserId: integer("studio_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    studioAccountId: integer("studio_account_id").references(() => accounts.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("agentcamp_registrations_stripe_session_id_idx").on(
      t.stripeSessionId,
    ),
    index("agentcamp_registrations_email_idx").on(t.email),
    index("agentcamp_registrations_cohort_idx").on(t.cohort),
    index("agentcamp_registrations_status_idx").on(t.status),
  ],
);
