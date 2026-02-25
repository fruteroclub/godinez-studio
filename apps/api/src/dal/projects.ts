import { eq } from "drizzle-orm";
import { projects } from "@godinez/db";
import { db } from "../db";

export async function getProjectsByWorkspaceId(workspaceId: number) {
  return db.query.projects.findMany({
    where: eq(projects.workspaceId, workspaceId),
  });
}

export async function getProjectById(id: number) {
  return db.query.projects.findFirst({
    where: eq(projects.id, id),
  });
}

export async function createProject(data: {
  workspaceId: number;
  name: string;
  description?: string;
}) {
  const [project] = await db.insert(projects).values(data).returning();
  return project;
}

export async function updateProject(
  id: number,
  data: Partial<{ name: string; description: string; status: string }>,
) {
  const [project] = await db
    .update(projects)
    .set(data)
    .where(eq(projects.id, id))
    .returning();
  return project;
}

export async function deleteProject(id: number) {
  await db.delete(projects).where(eq(projects.id, id));
}
