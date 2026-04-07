import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  clerkId: varchar("clerk_id", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  avatarUrl: text("avatar_url"),
  role: text("role").notNull().default("user"), // user | admin
  jobRole: varchar("job_role", { length: 50 }),
  businessDescription: varchar("business_description", { length: 255 }),
  
  // Onboarding V3: User context classification
  projectType: varchar("project_type", { length: 20 }),
  // Values: "educacion" | "profesional" | "personal"
  
  projectSubtype: varchar("project_subtype", { length: 30 }),
  // Values: "bootcamp" | "aprender" | "hackathon" | "emprendimiento" | 
  //         "proyecto" | "crear_contenido" | "automatizar" | "construir" |
  //         "investigar" | "vender" | "organizar"
  
  deadline: timestamp("deadline", { withTimezone: true }),
  // Used when user activates Hackathon/Bootcamp mode
  
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
