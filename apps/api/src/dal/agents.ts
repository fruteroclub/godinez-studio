import { eq } from "drizzle-orm";
import { agents } from "@godinez/db";
import { db } from "../db";

export async function getAgentById(id: number) {
  return db.query.agents.findFirst({
    where: eq(agents.id, id),
  });
}

export async function getAgentBySlug(slug: string) {
  return db.query.agents.findFirst({
    where: eq(agents.slug, slug),
  });
}

export async function getAllAgents() {
  return db.query.agents.findMany();
}

export async function createAgent(data: {
  name: string;
  slug: string;
  template: string;
  status: string;
  openclawId?: string;
  config?: Record<string, unknown>;
}) {
  const [agent] = await db.insert(agents).values(data).returning();
  return agent;
}
