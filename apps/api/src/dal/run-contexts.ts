import { eq, lt } from "drizzle-orm";
import { runContexts } from "@godinez/db";
import { db } from "../db";

interface RunContextData {
  runId: string;
  conversationId: number;
  workspaceId: number;
  instanceId?: number | null;
}

export async function saveRunContext(data: RunContextData) {
  await db
    .insert(runContexts)
    .values(data)
    .onConflictDoUpdate({
      target: runContexts.runId,
      set: {
        conversationId: data.conversationId,
        workspaceId: data.workspaceId,
        instanceId: data.instanceId,
      },
    });
}

export async function getRunContext(runId: string) {
  return db.query.runContexts.findFirst({
    where: eq(runContexts.runId, runId),
  });
}

export async function deleteRunContext(runId: string) {
  await db.delete(runContexts).where(eq(runContexts.runId, runId));
}

export async function cleanExpiredRunContexts(maxAgeMs = 10 * 60 * 1000) {
  const cutoff = new Date(Date.now() - maxAgeMs);
  await db.delete(runContexts).where(lt(runContexts.createdAt, cutoff));
}
