import { eq } from "drizzle-orm";
import { files } from "@godinez/db";
import { db } from "../db";

export async function getFilesByWorkspaceId(workspaceId: number) {
  return db.query.files.findMany({
    where: eq(files.workspaceId, workspaceId),
  });
}

export async function getFilesByProjectId(projectId: number) {
  return db.query.files.findMany({
    where: eq(files.projectId, projectId),
  });
}

export async function createFile(data: {
  workspaceId: number;
  projectId?: number;
  storageKey: string;
  url: string;
  filename: string;
  mimeType?: string;
  sizeBytes?: number;
  uploadedByUserId?: number;
  uploadedByAgentId?: number;
  messageId?: number;
}) {
  const [file] = await db.insert(files).values(data).returning();
  return file;
}

export async function deleteFile(id: number) {
  await db.delete(files).where(eq(files.id, id));
}
