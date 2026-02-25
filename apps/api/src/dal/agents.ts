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
