import { createMiddleware } from "hono/factory";
import { getMemberRole } from "../dal/workspaces";
import type { AuthEnv } from "../types";

/**
 * Checks that the current user is a member of the workspace that owns a resource.
 * Call after loading the resource — pass workspaceId directly.
 */
export async function verifyWorkspaceAccess(
  userId: number,
  workspaceId: number,
): Promise<boolean> {
  const role = await getMemberRole(workspaceId, userId);
  return role !== null;
}
