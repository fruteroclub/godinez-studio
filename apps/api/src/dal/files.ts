import { eq, sql } from "drizzle-orm";
import { files } from "@godinez/db";
import { db } from "../db";

const QUOTA_BYTES = 500 * 1024 * 1024; // 500 MB

export async function getWorkspaceStorageUsage(workspaceId: number) {
  const [row] = await db
    .select({
      usedBytes: sql<number>`coalesce(sum(${files.sizeBytes}), 0)`.mapWith(
        Number,
      ),
    })
    .from(files)
    .where(eq(files.workspaceId, workspaceId));

  return {
    usedBytes: row.usedBytes,
    quotaBytes: QUOTA_BYTES,
  };
}

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
