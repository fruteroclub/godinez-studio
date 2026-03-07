import { eq } from "drizzle-orm";
import { tasks } from "@godinez/db";
import { db } from "../db";

export async function getTasksByWorkspaceId(workspaceId: number) {
  return db.query.tasks.findMany({
    where: eq(tasks.workspaceId, workspaceId),
  });
}

export async function getTasksByProjectId(projectId: number) {
  return db.query.tasks.findMany({
    where: eq(tasks.projectId, projectId),
  });
}

export async function getTaskById(id: number) {
  return db.query.tasks.findFirst({
    where: eq(tasks.id, id),
  });
}

export async function createTask(data: {
  workspaceId: number;
  projectId?: number;
  title: string;
  description?: string;
  priority?: string;
  createdByUserId?: number;
}) {
  const [task] = await db.insert(tasks).values(data).returning();
  return task;
}

export async function updateTask(
  id: number,
  data: Partial<{
    title: string;
    description: string;
    status: string;
    priority: string;
    dueAt: Date;
    completedAt: Date;
  }>,
) {
  const [task] = await db
    .update(tasks)
    .set(data)
    .where(eq(tasks.id, id))
    .returning();
  return task;
}

export async function deleteTask(id: number) {
  await db.delete(tasks).where(eq(tasks.id, id));
}
