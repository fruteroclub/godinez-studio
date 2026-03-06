import { sql, eq } from "drizzle-orm";
import { workspaces, agentLogs, files, workspaceMembers } from "@godinez/db";
import { db } from "../db";

export async function getWorkspaceUsage(workspaceId: number) {
  const [[tokens], [storage], [members]] = await Promise.all([
    db
      .select({
        total: sql<number>`coalesce(sum(${agentLogs.tokensUsed}), 0)`.mapWith(Number),
      })
      .from(agentLogs)
      .where(
        sql`${agentLogs.workspaceId} = ${workspaceId}
        and ${agentLogs.createdAt} >= date_trunc('month', now())`,
      ),
    db
      .select({
        total: sql<number>`coalesce(sum(${files.sizeBytes}), 0)`.mapWith(Number),
      })
      .from(files)
      .where(eq(files.workspaceId, workspaceId)),
    db
      .select({
        total: sql<number>`count(*)`.mapWith(Number),
      })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.workspaceId, workspaceId)),
  ]);

  return {
    tokensUsedThisMonth: tokens.total,
    storageBytesUsed: storage.total,
    memberCount: members.total,
  };
}
