import { eq } from "drizzle-orm";
import type { AgentConfig } from "@godinez/types";
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

export async function deleteAgent(id: number) {
  await db.delete(agents).where(eq(agents.id, id));
}

export async function createAgent(data: {
  name: string;
  slug: string;
  template: string;
  status: string;
  openclawId?: string;
  config?: AgentConfig;
}) {
  const [agent] = await db.insert(agents).values(data).returning();
  return agent;
}

export async function updateAgent(
  id: number,
  data: { name?: string; config?: AgentConfig },
) {
  const [agent] = await db
    .update(agents)
    .set(data)
    .where(eq(agents.id, id))
    .returning();
  return agent;
}
