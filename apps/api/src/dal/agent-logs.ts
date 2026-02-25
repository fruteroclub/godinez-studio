import { eq, desc } from "drizzle-orm";
import { agentLogs } from "@godinez/db";
import { db } from "../db";

export async function getLogsByWorkspaceId(workspaceId: number) {
  return db.query.agentLogs.findMany({
    where: eq(agentLogs.workspaceId, workspaceId),
    orderBy: desc(agentLogs.createdAt),
    limit: 100,
  });
}
