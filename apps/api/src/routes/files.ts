import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { files as filesTable, projects as projectsTable } from "@godinez/db";
import type { AuthEnv } from "../types";
import { requireAuth } from "../middleware/auth";
import { resolveUser } from "../middleware/resolve-user";
import { requireWorkspaceMember } from "../middleware/require-workspace";
import { createFile, deleteFile, getWorkspaceStorageUsage } from "../dal/files";
import { storage } from "../services/storage";
import { db } from "../db";
import { syncWorkspaceFile } from "../services/workspace-sync";
import { verifyWorkspaceAccess } from "../middleware/require-resource-access";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const app = new Hono<AuthEnv>();

app.use("*", requireAuth, resolveUser);

// POST /api/files/upload — Upload file (multipart)
app.post("/upload", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.parseBody();
  const file = body["file"];
  const workspaceId = Number(body["workspaceId"]);
  const projectId = body["projectId"] ? Number(body["projectId"]) : undefined;

  if (!file || typeof file === "string") {
    return c.json({ error: "File is required" }, 400);
  }
  if (!workspaceId) {
    return c.json({ error: "workspaceId is required" }, 400);
  }
  if (!(await verifyWorkspaceAccess(userId, workspaceId))) {
    return c.json({ error: "Not a workspace member" }, 403);
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (buffer.length > MAX_FILE_SIZE) {
    return c.json({ error: "File exceeds 10MB limit" }, 413);
  }

  // Check workspace storage quota
  const { usedBytes, quotaBytes } = await getWorkspaceStorageUsage(workspaceId);
  if (usedBytes + buffer.length > quotaBytes) {
    return c.json(
      {
        error: "Almacenamiento lleno. Elimina archivos para liberar espacio.",
        code: "QUOTA_EXCEEDED",
        usedBytes,
        quotaBytes,
      },
      413,
    );
  }

  const { url, key } = await storage.upload(buffer, file.name, file.type, workspaceId);

  const record = await createFile({
    workspaceId,
    projectId,
    storageKey: key,
    url,
    filename: file.name,
    mimeType: file.type || undefined,
    sizeBytes: buffer.length,
    uploadedByUserId: userId,
  });

  syncWorkspaceFile(workspaceId);
  return c.json(record, 201);
});

// GET /api/files/:id — Get file detail
app.get("/:id", async (c) => {
  const userId = c.get("userId");
  const id = parseInt(c.req.param("id"));
  const file = await db.query.files.findFirst({
    where: eq(filesTable.id, id),
  });
  if (!file) return c.json({ error: "File not found" }, 404);
  if (!(await verifyWorkspaceAccess(userId, file.workspaceId))) {
    return c.json({ error: "Not a workspace member" }, 403);
  }
  return c.json(file);
});

// DELETE /api/files/:id — Delete file
app.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const id = parseInt(c.req.param("id"));
  const file = await db.query.files.findFirst({
    where: eq(filesTable.id, id),
  });
  if (!file) return c.json({ error: "File not found" }, 404);
  if (!(await verifyWorkspaceAccess(userId, file.workspaceId))) {
    return c.json({ error: "Not a workspace member" }, 403);
  }

  await storage.delete(file.storageKey);
  await deleteFile(id);
  syncWorkspaceFile(file.workspaceId);
  return c.json({ deleted: true });
});

export default app;

// Workspace-scoped file list
export const workspaceFiles = new Hono<AuthEnv>();

workspaceFiles.use("*", requireAuth, resolveUser);

// GET /api/workspaces/:id/storage — Workspace storage usage
workspaceFiles.get("/:id/storage", requireWorkspaceMember, async (c) => {
  const workspaceId = parseInt(c.req.param("id"));
  const { usedBytes, quotaBytes } = await getWorkspaceStorageUsage(workspaceId);
  return c.json({
    usedBytes,
    quotaBytes,
    usedPercent: Math.round((usedBytes / quotaBytes) * 100),
  });
});

// GET /api/workspaces/:id/files — List workspace files
workspaceFiles.get("/:id/files", requireWorkspaceMember, async (c) => {
  const workspaceId = parseInt(c.req.param("id"));
  const files = await db.query.files.findMany({
    where: eq(filesTable.workspaceId, workspaceId),
    orderBy: filesTable.createdAt,
  });
  return c.json(files);
});

// Project-scoped file list
export const projectFiles = new Hono<AuthEnv>();

projectFiles.use("*", requireAuth, resolveUser);

// GET /api/projects/:id/files — List project files
projectFiles.get("/:id/files", async (c) => {
  const userId = c.get("userId");
  const projectId = parseInt(c.req.param("id"));
  const project = await db.query.projects.findFirst({
    where: eq(projectsTable.id, projectId),
  });
  if (!project) return c.json({ error: "Project not found" }, 404);
  if (!(await verifyWorkspaceAccess(userId, project.workspaceId))) {
    return c.json({ error: "Not a workspace member" }, 403);
  }
  const files = await db.query.files.findMany({
    where: eq(filesTable.projectId, projectId),
    orderBy: filesTable.createdAt,
  });
  return c.json(files);
});
