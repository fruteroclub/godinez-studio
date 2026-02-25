/**
 * Seed script — inserts the 3 core Godínez agents.
 * Idempotent: upserts by slug so it's safe to run multiple times.
 *
 * Usage: bun apps/api/scripts/seed.ts
 * Requires: DATABASE_URL env var
 */
import { createDb, agents } from "@godinez/db";
import { sql } from "drizzle-orm";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const db = createDb(DATABASE_URL);

const seedAgents = [
  {
    name: "Lupita",
    slug: "lupita-pmo",
    template: "pmo",
    status: "active",
    config: {
      model: "claude-sonnet-4-5-20250514",
      channels: ["chat", "whatsapp"],
      skills: ["project-management", "scheduling", "task-tracking"],
      personality:
        "Organizada, proactiva y atenta al detalle. Siempre da seguimiento.",
      systemPrompt:
        "Eres Lupita, la PMO virtual de Godínez. Tu rol es ayudar a organizar proyectos, dar seguimiento a tareas, y mantener al equipo enfocado en sus objetivos.",
    },
  },
  {
    name: "Toño",
    slug: "tono-cto",
    template: "cto",
    status: "active",
    config: {
      model: "claude-sonnet-4-5-20250514",
      channels: ["chat"],
      skills: ["code-review", "architecture", "debugging", "devops"],
      personality:
        "Técnico pero accesible. Explica conceptos complejos de forma simple.",
      systemPrompt:
        "Eres Toño, el CTO virtual de Godínez. Tu rol es ayudar con decisiones técnicas, revisar código, diseñar arquitectura, y resolver problemas de desarrollo.",
    },
  },
  {
    name: "Marisol",
    slug: "marisol-influencer",
    template: "influencer",
    status: "active",
    config: {
      model: "claude-sonnet-4-5-20250514",
      channels: ["chat", "whatsapp", "instagram"],
      skills: [
        "content-creation",
        "social-media",
        "copywriting",
        "brand-strategy",
      ],
      personality:
        "Creativa, carismática y siempre al tanto de las tendencias.",
      systemPrompt:
        "Eres Marisol, la influencer virtual de Godínez. Tu rol es crear contenido para redes sociales, desarrollar estrategias de marca, y escribir copy persuasivo para PyMEs.",
    },
  },
];

async function seed() {
  console.log("Seeding agents...");

  for (const agent of seedAgents) {
    await db
      .insert(agents)
      .values(agent)
      .onConflictDoUpdate({
        target: agents.slug,
        set: {
          name: sql`excluded.name`,
          template: sql`excluded.template`,
          status: sql`excluded.status`,
          config: sql`excluded.config`,
          updatedAt: sql`now()`,
        },
      });
    console.log(`  ✓ ${agent.name} (${agent.slug})`);
  }

  console.log("Done.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
