import { eq, and, isNotNull } from "drizzle-orm";
import {
  workspaces,
  workspaceMembers,
  conversations,
  messages,
  projects,
  tasks,
  files,
  agents,
  agentLogs,
} from "@godinez/db";
import { db } from "../db";

export async function getWorkspacesByUserId(userId: number) {
  const memberships = await db.query.workspaceMembers.findMany({
    where: eq(workspaceMembers.userId, userId),
    with: { workspace: true },
  });
  return memberships.map((m) => m.workspace);
}

export async function getWorkspaceBySlug(slug: string) {
  return db.query.workspaces.findFirst({
    where: eq(workspaces.slug, slug),
  });
}

export async function getWorkspaceById(id: number) {
  return db.query.workspaces.findFirst({
    where: eq(workspaces.id, id),
  });
}

export async function getMembers(workspaceId: number) {
  return db.query.workspaceMembers.findMany({
    where: eq(workspaceMembers.workspaceId, workspaceId),
    with: { user: true },
  });
}

export async function getMemberRole(workspaceId: number, userId: number) {
  const member = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, workspaceId),
      eq(workspaceMembers.userId, userId),
    ),
  });
  return member?.role ?? null;
}

export async function createWorkspace(data: {
  name: string;
  slug: string;
  ownerId: number;
}) {
  const [workspace] = await db.insert(workspaces).values(data).returning();
  await db.insert(workspaceMembers).values({
    workspaceId: workspace.id,
    userId: data.ownerId,
    role: "owner",
  });
  return workspace;
}

export async function updateWorkspace(
  id: number,
  data: Partial<{ name: string; tier: string; status: string }>,
) {
  const [workspace] = await db
    .update(workspaces)
    .set(data)
    .where(eq(workspaces.id, id))
    .returning();
  return workspace;
}

export async function deleteWorkspace(id: number) {
  await db.transaction(async (tx) => {
    // Delete in FK-dependency order: leaves first, then parents
    await tx.delete(messages).where(eq(messages.workspaceId, id));
    await tx.delete(agentLogs).where(eq(agentLogs.workspaceId, id));
    await tx.delete(conversations).where(eq(conversations.workspaceId, id));
    await tx.delete(tasks).where(eq(tasks.workspaceId, id));
    await tx.delete(files).where(eq(files.workspaceId, id));
    await tx.delete(projects).where(eq(projects.workspaceId, id));
    await tx.delete(workspaceMembers).where(eq(workspaceMembers.workspaceId, id));

    // Unlink agent before deleting workspace, then delete agent row
    const [ws] = await tx
      .select({ agentId: workspaces.agentId })
      .from(workspaces)
      .where(eq(workspaces.id, id));
    await tx.delete(workspaces).where(eq(workspaces.id, id));
    if (ws?.agentId) {
      await tx.delete(agents).where(eq(agents.id, ws.agentId));
    }
  });
}

export async function linkAgentToWorkspace(
  workspaceId: number,
  data: { agentId: number; agentSlot: string; instanceId?: number },
) {
  const [workspace] = await db
    .update(workspaces)
    .set({
      agentId: data.agentId,
      agentSlot: data.agentSlot,
      status: "provisioning",
      ...(data.instanceId != null && { instanceId: data.instanceId }),
    })
    .where(eq(workspaces.id, workspaceId))
    .returning();
  return workspace;
}

export async function getWorkspaceByAgentId(agentId: number) {
  return db.query.workspaces.findFirst({
    where: eq(workspaces.agentId, agentId),
  });
}

export async function activateWorkspace(workspaceId: number) {
  const [workspace] = await db
    .update(workspaces)
    .set({ status: "active" })
    .where(eq(workspaces.id, workspaceId))
    .returning();
  return workspace;
}

export async function getWorkspacePreview(workspaceId: number) {
  // Get the most recently updated active project with a preview URL
  const project = await db.query.projects.findFirst({
    where: and(
      eq(projects.workspaceId, workspaceId),
      eq(projects.status, "active"),
      isNotNull(projects.previewUrl),
    ),
    orderBy: (projects, { desc }) => [desc(projects.updatedAt)],
  });
  
  if (!project) return null;
  
  return {
    previewUrl: project.previewUrl,
    name: project.name,
  };
}

export async function saveWorkspacePreview(workspaceId: number, previewUrl: string) {
  // Find or create an active project to store the preview URL
  const existingProject = await db.query.projects.findFirst({
    where: and(
      eq(projects.workspaceId, workspaceId),
      eq(projects.status, "active"),
    ),
    orderBy: (projects, { desc }) => [desc(projects.updatedAt)],
  });

  if (existingProject) {
    // Update existing project
    const [updated] = await db
      .update(projects)
      .set({ previewUrl })
      .where(eq(projects.id, existingProject.id))
      .returning();
    return updated;
  } else {
    // Create new project with preview URL
    const [created] = await db
      .insert(projects)
      .values({
        workspaceId,
        name: "Live Preview",
        description: "Auto-created from tunnel URL",
        status: "active",
        previewUrl,
      })
      .returning();
    return created;
  }
}

export async function getRecentChatMessages(workspaceId: number, limit: number = 20) {
  // Get recent assistant messages that might contain tunnel URLs
  const recentMessages = await db.query.messages.findMany({
    where: and(
      eq(messages.workspaceId, workspaceId),
      eq(messages.role, "agent"),
    ),
    orderBy: (messages, { desc }) => [desc(messages.createdAt)],
    limit,
  });

  return recentMessages.map((m) => ({
    id: m.id,
    content: m.content,
    createdAt: m.createdAt,
  }));
}
