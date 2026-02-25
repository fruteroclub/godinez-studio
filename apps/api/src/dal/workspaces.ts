import { eq, and } from "drizzle-orm";
import { workspaces, workspaceMembers } from "@godinez/db";
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
  await db.delete(workspaces).where(eq(workspaces.id, id));
}
